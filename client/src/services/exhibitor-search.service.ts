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

  private readonly leetMap: Record<string, string> = {
    a: '4',
    e: '3',
    i: '1',
    o: '0',
    s: '5'
  };

  private readonly reverseLeetMap: Record<string, string> = {
    '4': 'a',
    '3': 'e',
    '1': 'i',
    '0': 'o',
    '5': 's'
  };

  /**
   * Generate limited, useful l33t variations including single-position replacements.
   */
  private generateLeetVariations(text: string): string[] {
    const variations = new Set<string>();
    const original = text;
    variations.add(original);

    const lower = original.toLowerCase();

    // Global single-char replacements (letters -> numbers, one letter at a time)
    Object.entries(this.leetMap).forEach(([letter, digit]) => {
      if (lower.includes(letter)) {
        variations.add(original.replace(new RegExp(letter, 'ig'), digit));
      }
    });

    // Global single-char replacements (numbers -> letters, one digit at a time)
    Object.entries(this.reverseLeetMap).forEach(([digit, letter]) => {
      if (original.includes(digit)) {
        variations.add(original.replace(new RegExp(`\\${digit}`, 'g'), letter));
      }
    });

    // Single-position replacements for better partial matching
    for (let i = 0; i < original.length; i++) {
      const char = lower[i];
      // letter -> number at position i
      if (this.leetMap[char]) {
        const digit = this.leetMap[char];
        const arr = original.split('');
        arr[i] = /[A-Z]/.test(original[i]) ? digit.toUpperCase() : digit;
        variations.add(arr.join(''));
      }
      // number -> letter at position i
      const rev = this.reverseLeetMap[original[i]];
      if (rev) {
        const arr = original.split('');
        arr[i] = rev;
        variations.add(arr.join(''));
      }
    }

    // Special-case common brand spellings
    if (lower.includes('vantage') || lower.includes('vant4ge')) {
      variations.add(original.replace(/vant4ge/gi, 'vantage'));
      variations.add(original.replace(/vantage/gi, 'vant4ge'));
    }

    return Array.from(variations).slice(0, 25);
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
      // Expand query to include leet/brand variations to improve embedding recall
      const variationSet = new Set<string>([query]);
      this.generateLeetVariations(query).forEach(v => variationSet.add(v));
      // Special-case known brand aliasing
      if (/vant4ge/i.test(query) || /vantage/i.test(query)) {
        variationSet.add(query.replace(/vant4ge/gi, 'vantage'));
        variationSet.add(query.replace(/vantage/gi, 'vant4ge'));
        variationSet.add('Vant4ge');
        variationSet.add('Vantage');
      }
      const expandedQuery = Array.from(variationSet).join(' | ');

      const queryEmbedding = await embeddingService.generateEmbedding(expandedQuery);
      const lowerQuery = query.toLowerCase();

      const { data, error } = await supabase
        .rpc('search_exhibitors', {
          query_embedding: queryEmbedding,
          match_count: limit * 3,  // Get more results to filter down strictly
          similarity_threshold: 0.75  // Strict threshold to avoid loose matches
        });

      if (error) {
        console.error('Exhibitor search error:', error);
        return [];
      }

      let results = (data || []).filter((exhibitor: ExhibitorResult) => {
        // Enforce strict similarity if value present
        const sim = typeof exhibitor.similarity === 'number' ? exhibitor.similarity : undefined;
        return sim === undefined || sim >= 0.75;
      });
      
      // If query explicitly asks for tech companies, filter out non-tech
      if (lowerQuery.includes('tech') || lowerQuery.includes('technology')) {
        const techKeywords = ['tech', 'software', 'hardware', 'digital', 'it', 'system', 'computing', 
                             'data', 'cyber', 'cloud', 'ai', 'automation', 'electronic'];
        
        results = results.filter((exhibitor: ExhibitorResult) => {
          const combinedText = `${exhibitor.company_name} ${exhibitor.industry_category || ''} ${exhibitor.company_bio || ''}`.toLowerCase();
          return techKeywords.some(keyword => combinedText.includes(keyword));
        });
      }

      // Additionally require that at least one significant word from the query
      // appears in company_name, bio, or industry when similarity isn't provided
      const words = query
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(w => w.length >= 3);

      if (words.length > 0) {
        results = results.filter((exhibitor: ExhibitorResult) => {
          const haystack = `${exhibitor.company_name} ${exhibitor.industry_category || ''} ${exhibitor.company_bio || ''}`.toLowerCase();
          return words.some(w => haystack.includes(w));
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
      const normalized = boothNumber.trim();
      // First, try exact match
      let { data, error } = await supabase
        .from('exhibitors')
        .select('*')
        .eq('booth_number', normalized)
        .maybeSingle();

      if (!error && data) {
        return data as ExhibitorResult;
      }

      // Fallback: handle composite booth fields like "532 | 1033" by doing a contains match
      const { data: list, error: likeError } = await supabase
        .from('exhibitors')
        .select('*')
        .ilike('booth_number', `%${normalized}%`)
        .limit(10);

      if (likeError || !list || list.length === 0) {
        return null;
      }

      // Filter results to only those where the booth number appears as a full token between non-digits
      const tokenRegex = new RegExp(`(?:^|[^0-9])${normalized}(?:[^0-9]|$)`);
      const exactToken = list.find((e: any) => typeof e.booth_number === 'string' && tokenRegex.test(e.booth_number));
      if (exactToken) return exactToken as ExhibitorResult;

      // Otherwise return the first candidate
      return list[0] as ExhibitorResult;
    } catch (error) {
      console.error('Failed to find exhibitor by booth:', error);
      return null;
    }
  }

  async searchByCompanyName(companyName: string): Promise<ExhibitorResult[]> {
    try {
      // Generate robust l33t variations (limited)
      const variations = this.generateLeetVariations(companyName);
      
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

  private formatBoothNumbers(booth: string | undefined): string {
    if (!booth) return '';
    const tokens = booth
      .split(/[^0-9]+/)
      .map(t => t.trim())
      .filter(Boolean);
    if (tokens.length === 0) return '';
    if (tokens.length === 1) return `booth ${tokens[0]}`;
    if (tokens.length === 2) return `booths ${tokens[0]} and ${tokens[1]}`;
    return `booths ${tokens.slice(0, -1).join(', ')}, and ${tokens[tokens.length - 1]}`;
  }

  formatExhibitorInfo(exhibitor: ExhibitorResult): string {
    let info = `${exhibitor.company_name}`;
    
    if (exhibitor.booth_number) {
      const boothText = this.formatBoothNumbers(exhibitor.booth_number);
      if (boothText) {
        info += ` at ${boothText}`;
      }
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
      .map(e => {
        const boothText = this.formatBoothNumbers(e.booth_number);
        return `• ${e.company_name}${boothText ? ` (${boothText})` : ''}`;
      })
      .join('\n');
    
    return `Found ${exhibitors.length} exhibitor${exhibitors.length > 1 ? 's' : ''}:\n${exhibitorList}`;
  }
}