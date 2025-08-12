import { supabase } from '@/lib/supabase/config/supabaseClient';
import { embeddingService } from './embedding.service';

export interface ExhibitorResult {
  id: string;
  company_name: string;
  website_url?: string;
  booth_number?: string;
  primary_contact?: string;
  contact_title?: string;
  email_address?: string;
  phone?: string;
  industry_category?: string;
  company_bio?: string;
  city?: string;
  state?: string;
  similarity?: number;
}

export class ExhibitorSearchService {
  private static instance: ExhibitorSearchService;

  // Keywords that indicate the user is asking about exhibitors
  private exhibitorKeywords = [
    'exhibitor', 'vendor', 'booth', 'company', 'companies',
    'sponsor', 'display', 'showcase', 'product', 'service',
    'who is at', 'which companies', 'what companies', 'find company',
    'tell me about', 'looking for', 'where is', 'booth number',
    'industry', 'category', 'provider', 'solution', 'technology',
    'software', 'hardware', 'consulting', 'services'
  ];

  // Keywords for specific booth searches
  private boothKeywords = ['booth', 'booth number', 'booth #', 'stand', 'location'];

  static getInstance(): ExhibitorSearchService {
    if (!ExhibitorSearchService.instance) {
      ExhibitorSearchService.instance = new ExhibitorSearchService();
    }
    return ExhibitorSearchService.instance;
  }

  // Detect if the query is asking about exhibitors
  detectExhibitorQuery(query: string): {
    isExhibitorQuery: boolean;
    queryType: 'general' | 'booth' | 'company' | 'category' | 'none';
    searchTerm?: string;
  } {
    const lowerQuery = query.toLowerCase();
    
    // EXCLUDE AI Tech Expo - it's a featured event, not an exhibitor query
    if (lowerQuery.includes('ai tech') || lowerQuery.includes('tech expo') || 
        lowerQuery.includes('ai expo') || 
        (lowerQuery.includes('ai') && lowerQuery.includes('expo'))) {
      return {
        isExhibitorQuery: false,
        queryType: 'none'
      };
    }
    
    // EXCLUDE committee/meeting queries - they should be handled by meetings service
    if (lowerQuery.includes('committee') || lowerQuery.includes('council') || 
        lowerQuery.includes('meeting') || lowerQuery.includes('meetings')) {
      return {
        isExhibitorQuery: false,
        queryType: 'none'
      };
    }
    
    // Check for booth number queries (e.g., "booth 123", "where is booth 456")
    const boothMatch = lowerQuery.match(/booth\s*#?\s*(\d+)/i);
    if (boothMatch) {
      return {
        isExhibitorQuery: true,
        queryType: 'booth',
        searchTerm: boothMatch[1]
      };
    }

    // Check for specific company name in quotes
    const quotedMatch = query.match(/"([^"]+)"/);
    if (quotedMatch && this.exhibitorKeywords.some(keyword => lowerQuery.includes(keyword))) {
      return {
        isExhibitorQuery: true,
        queryType: 'company',
        searchTerm: quotedMatch[1]
      };
    }

    // Check for category/industry queries
    const categoryKeywords = ['technology', 'tech', 'software', 'hardware', 'security', 'healthcare', 
                            'consulting', 'services', 'solutions', 'systems', 'digital', 'it'];
    const hasCategory = categoryKeywords.some(cat => lowerQuery.includes(cat));
    const hasExhibitorContext = this.exhibitorKeywords.some(keyword => lowerQuery.includes(keyword)) ||
                                lowerQuery.includes('companies') || lowerQuery.includes('vendors');
    
    if (hasCategory && hasExhibitorContext) {
      // Map variations to standard categories
      let category = categoryKeywords.find(cat => lowerQuery.includes(cat));
      if (category === 'tech') category = 'technology';
      if (category === 'it') category = 'technology';
      if (category === 'digital') category = 'technology';
      
      return {
        isExhibitorQuery: true,
        queryType: 'category',
        searchTerm: category
      };
    }

    // General exhibitor query
    if (this.exhibitorKeywords.some(keyword => lowerQuery.includes(keyword))) {
      return {
        isExhibitorQuery: true,
        queryType: 'general',
        searchTerm: query
      };
    }

    return {
      isExhibitorQuery: false,
      queryType: 'none'
    };
  }

  async searchByQuery(query: string, limit: number = 5): Promise<ExhibitorResult[]> {
    try {
      const queryEmbedding = await embeddingService.generateEmbedding(query);
      const lowerQuery = query.toLowerCase();

      const { data, error } = await supabase
        .rpc('search_exhibitors', {
          query_embedding: queryEmbedding,
          match_count: limit * 2,  // Get more results to filter
          similarity_threshold: 0.6  // Higher threshold for more relevant results
        });

      if (error) {
        console.error('Exhibitor search error:', error);
        return [];
      }

      let results = data || [];
      
      // If query explicitly asks for tech companies, filter out non-tech
      if (lowerQuery.includes('tech') || lowerQuery.includes('technology')) {
        const techKeywords = ['tech', 'software', 'hardware', 'digital', 'it', 'system', 'computing', 
                             'data', 'cyber', 'cloud', 'ai', 'automation', 'electronic'];
        
        results = results.filter((exhibitor: ExhibitorResult) => {
          const combinedText = `${exhibitor.company_name} ${exhibitor.industry_category || ''} ${exhibitor.company_bio || ''}`.toLowerCase();
          return techKeywords.some(keyword => combinedText.includes(keyword));
        });
      }

      return results.slice(0, limit);
    } catch (error) {
      console.error('Failed to search exhibitors:', error);
      return [];
    }
  }

  async searchByBoothNumber(boothNumber: string): Promise<ExhibitorResult | null> {
    try {
      const { data, error } = await supabase
        .from('exhibitors')
        .select('*')
        .eq('booth_number', boothNumber)
        .single();

      if (error || !data) {
        return null;
      }

      return data;
    } catch (error) {
      console.error('Failed to find exhibitor by booth:', error);
      return null;
    }
  }

  async searchByCompanyName(companyName: string): Promise<ExhibitorResult[]> {
    try {
      // Common letter-to-number substitutions in company names
      const variations = [companyName];
      
      // Add common substitutions
      variations.push(companyName.replace(/a/gi, '4')); // a -> 4
      variations.push(companyName.replace(/e/gi, '3')); // e -> 3
      variations.push(companyName.replace(/i/gi, '1')); // i -> 1
      variations.push(companyName.replace(/o/gi, '0')); // o -> 0
      variations.push(companyName.replace(/s/gi, '5')); // s -> 5
      
      // Try each variation
      let allResults: ExhibitorResult[] = [];
      for (const variation of variations) {
        const { data, error } = await supabase
          .from('exhibitors')
          .select('*')
          .ilike('company_name', `%${variation}%`)
          .limit(5);

        if (!error && data) {
          allResults = allResults.concat(data);
        }
      }

      // Remove duplicates based on company ID
      const uniqueResults = allResults.filter((item, index, self) =>
        index === self.findIndex((r) => r.id === item.id)
      );

      return uniqueResults.slice(0, 5); // Limit to 5 results
    } catch (error) {
      console.error('Failed to search by company name:', error);
      return [];
    }
  }

  async getAllExhibitorsByCategory(category: string): Promise<ExhibitorResult[]> {
    try {
      const { data, error } = await supabase
        .from('exhibitors')
        .select('*')
        .ilike('industry_category', `%${category}%`)
        .order('company_name')
        .limit(10);

      if (error) {
        console.error('Category search error:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Failed to search by category:', error);
      return [];
    }
  }

  // Process a query and return relevant exhibitor data
  async processExhibitorQuery(query: string): Promise<{
    found: boolean;
    data: ExhibitorResult[];
    context: string;
  }> {
    const detection = this.detectExhibitorQuery(query);
    
    if (!detection.isExhibitorQuery) {
      return { found: false, data: [], context: '' };
    }

    let exhibitors: ExhibitorResult[] = [];
    let context = '';

    switch (detection.queryType) {
      case 'booth':
        const boothExhibitor = await this.searchByBoothNumber(detection.searchTerm!);
        if (boothExhibitor) {
          exhibitors = [boothExhibitor];
          context = `Exhibitor at booth ${detection.searchTerm}:`;
        }
        break;

      case 'company':
        exhibitors = await this.searchByCompanyName(detection.searchTerm!);
        context = `Companies matching "${detection.searchTerm}":`;
        break;

      case 'category':
        // For technology queries, be more specific
        if (detection.searchTerm === 'technology' || detection.searchTerm === 'tech') {
          // Search for companies that are actually tech-related
          const techCategories = ['technology', 'software', 'hardware', 'IT', 'digital', 'systems', 'computing'];
          let techExhibitors: ExhibitorResult[] = [];
          
          for (const cat of techCategories) {
            const catResults = await this.getAllExhibitorsByCategory(cat);
            techExhibitors = techExhibitors.concat(catResults);
          }
          
          // Remove duplicates
          exhibitors = techExhibitors.filter((item, index, self) =>
            index === self.findIndex((r) => r.id === item.id)
          ).slice(0, 10);
          
          context = 'Technology companies:';
        } else {
          exhibitors = await this.getAllExhibitorsByCategory(detection.searchTerm!);
          context = `${detection.searchTerm} exhibitors:`;
        }
        break;

      case 'general':
        // First try to find by company name for better accuracy
        const companyWords = query.split(' ').filter(word => 
          word.length > 2 && !this.exhibitorKeywords.includes(word.toLowerCase())
        );
        
        // Try each significant word as a potential company name
        for (const word of companyWords) {
          const nameResults = await this.searchByCompanyName(word);
          if (nameResults.length > 0) {
            // Check if we have an exact match (case-insensitive)
            const exactMatch = nameResults.find(r => 
              r.company_name.toLowerCase() === word.toLowerCase()
            );
            
            if (exactMatch) {
              // If exact match found, return only that
              exhibitors = [exactMatch];
              context = `Exact match for "${word}":`;
            } else {
              // Otherwise return all partial matches
              exhibitors = nameResults;
              context = `Companies containing "${word}":`;
            }
            break;
          }
        }
        
        // If no exact match found, fall back to semantic search
        if (exhibitors.length === 0) {
          exhibitors = await this.searchByQuery(query);
          context = 'Relevant exhibitors:';
        }
        break;
    }

    return {
      found: exhibitors.length > 0,
      data: exhibitors,
      context
    };
  }

  formatExhibitorInfo(exhibitor: ExhibitorResult): string {
    let info = `${exhibitor.company_name}`;
    
    if (exhibitor.booth_number) {
      info += ` at booth ${exhibitor.booth_number}`;
    }
    
    if (exhibitor.company_bio && exhibitor.company_bio.length < 100) {
      info += ` - ${exhibitor.company_bio}`;
    } else if (exhibitor.industry_category) {
      info += ` (${exhibitor.industry_category})`;
    }
    
    return info;
  }

  formatMultipleExhibitors(exhibitors: ExhibitorResult[]): string {
    if (exhibitors.length === 0) {
      return '';
    }

    // Always list company names clearly so AI can see what was actually found
    const topExhibitors = exhibitors.slice(0, 5); // Show up to 5 for clarity
    
    // Build a clear list of what was found
    const exhibitorList = topExhibitors
      .map(e => `• ${e.company_name}${e.booth_number ? ` (Booth ${e.booth_number})` : ''}`)
      .join('\n');
    
    return `Found ${exhibitors.length} exhibitor${exhibitors.length > 1 ? 's' : ''}:\n${exhibitorList}`;
  }
}