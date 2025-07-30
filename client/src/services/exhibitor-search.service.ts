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
    const categoryKeywords = ['technology', 'software', 'hardware', 'security', 'healthcare', 
                            'consulting', 'services', 'solutions', 'systems'];
    const hasCategory = categoryKeywords.some(cat => lowerQuery.includes(cat));
    const hasExhibitorContext = this.exhibitorKeywords.some(keyword => lowerQuery.includes(keyword));
    
    if (hasCategory && hasExhibitorContext) {
      const category = categoryKeywords.find(cat => lowerQuery.includes(cat));
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

      const { data, error } = await supabase
        .rpc('search_exhibitors', {
          query_embedding: queryEmbedding,
          match_count: limit,
          similarity_threshold: 0.7
        });

      if (error) {
        console.error('Exhibitor search error:', error);
        return [];
      }

      return data || [];
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
      const { data, error } = await supabase
        .from('exhibitors')
        .select('*')
        .ilike('company_name', `%${companyName}%`)
        .limit(5);

      if (error) {
        console.error('Company search error:', error);
        return [];
      }

      return data || [];
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
        exhibitors = await this.getAllExhibitorsByCategory(detection.searchTerm!);
        context = `${detection.searchTerm} exhibitors:`;
        break;

      case 'general':
        exhibitors = await this.searchByQuery(query);
        context = 'Relevant exhibitors:';
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

    // Format conversationally, limit to 3 exhibitors
    const topExhibitors = exhibitors.slice(0, 3);
    
    if (topExhibitors.length === 1) {
      return this.formatExhibitorInfo(topExhibitors[0]);
    }
    
    if (topExhibitors.length === 2) {
      return `${this.formatExhibitorInfo(topExhibitors[0])}. Also check out ${this.formatExhibitorInfo(topExhibitors[1])}.`;
    }
    
    // 3 or more
    return `${this.formatExhibitorInfo(topExhibitors[0])}. You might also be interested in ${this.formatExhibitorInfo(topExhibitors[1])} and ${this.formatExhibitorInfo(topExhibitors[2])}.`;
  }
}