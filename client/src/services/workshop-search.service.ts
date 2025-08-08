import { supabase } from '@/lib/supabase/config/supabaseClient';
import { embeddingService } from './embedding.service';

export interface WorkshopResult {
  id: string;
  title: string;
  overview?: string;
  day?: string;
  date?: string;
  time_block?: string;
  room?: string;
  primary_community?: string;
  credits?: string;
  speakers?: any[];
  moderators?: any[];
  learning_objectives?: string[];
  similarity?: number;
}

export class WorkshopSearchService {
  private static instance: WorkshopSearchService;

  // Keywords that indicate the user is asking about workshops
  private workshopKeywords = [
    'workshop', 'workshops', 'session', 'sessions', 'training', 'trainings',
    'presentation', 'presentations', 'seminar', 'seminars', 'class', 'classes',
    'course', 'courses', 'learning', 'education', 'educational',
    'ce credit', 'ce credits', 'ceu', 'cme', 'continuing education',
    'learning objective', 'objectives', 'speaker', 'speakers', 'presenter',
    'moderator', 'moderators', 'panelist', 'instructor'
  ];

  // Keywords for specific credit types
  private creditKeywords = ['ce', 'ceu', 'cme', 'cerp', 'credits', 'certification'];

  static getInstance(): WorkshopSearchService {
    if (!WorkshopSearchService.instance) {
      WorkshopSearchService.instance = new WorkshopSearchService();
    }
    return WorkshopSearchService.instance;
  }

  // Detect if the query is asking about workshops
  detectWorkshopQuery(query: string): {
    isWorkshopQuery: boolean;
    queryType: 'general' | 'credits' | 'speaker' | 'day' | 'topic' | 'none';
    searchTerm?: string;
  } {
    const lowerQuery = query.toLowerCase();
    
    // Check for credit-specific queries
    if (this.creditKeywords.some(credit => lowerQuery.includes(credit))) {
      return {
        isWorkshopQuery: true,
        queryType: 'credits',
        searchTerm: query
      };
    }

    // Check for speaker/presenter queries
    if (lowerQuery.includes('speaker') || lowerQuery.includes('presenter') || 
        lowerQuery.includes('moderator') || lowerQuery.includes('panelist')) {
      return {
        isWorkshopQuery: true,
        queryType: 'speaker',
        searchTerm: query
      };
    }

    // Check for day-specific queries
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayFound = days.find(day => lowerQuery.includes(day));
    if (dayFound && this.workshopKeywords.some(keyword => lowerQuery.includes(keyword))) {
      return {
        isWorkshopQuery: true,
        queryType: 'day',
        searchTerm: dayFound
      };
    }

    // Check for topic  0
    // 00000000000000001.q0ueries (mental health, substance abuse, etc.)
    const topicKeywords = ['mental health', 'substance', 'addiction', 'trauma', 'rehabilitation',
                           'medical', 'psychiatric', 'nursing', 'correctional', 'safety'];
    const hasTopic = topicKeywords.some(topic => lowerQuery.includes(topic));
    if (hasTopic && this.workshopKeywords.some(keyword => lowerQuery.includes(keyword))) {
      return {
        isWorkshopQuery: true,
        queryType: 'topic',
        searchTerm: query
      };
    }

    // General workshop query
    if (this.workshopKeywords.some(keyword => lowerQuery.includes(keyword))) {
      return {
        isWorkshopQuery: true,
        queryType: 'general',
        searchTerm: query
      };
    }

    return {
      isWorkshopQuery: false,
      queryType: 'none'
    };
  }

  // Search workshops using semantic similarity
  async searchByQuery(query: string, limit: number = 5): Promise<WorkshopResult[]> {
    try {
      const queryEmbedding = await embeddingService.generateEmbedding(query);

      const { data, error } = await supabase
        .rpc('search_workshops_semantic', {
          query_embedding: queryEmbedding,
          match_count: limit,
          similarity_threshold: 0.7
        });

      if (error) {
        console.error('Workshop search error:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Failed to search workshops:', error);
      return [];
    }
  }

  // Search workshops by day
  async searchByDay(day: string): Promise<WorkshopResult[]> {
    try {
      const { data, error } = await supabase
        .from('workshops')
        .select('*')
        .ilike('day', `%${day}%`)
        .order('start_time', { ascending: true })
        .limit(10);

      if (error) {
        console.error('Day search error:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Failed to search by day:', error);
      return [];
    }
  }

  // Search workshops by credits
  async searchByCredits(creditType?: string): Promise<WorkshopResult[]> {
    try {
      let query = supabase
        .from('workshops')
        .select('*')
        .not('credits', 'is', null);

      if (creditType) {
        query = query.ilike('credits', `%${creditType}%`);
      }

      const { data, error } = await query
        .order('day', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(10);

      if (error) {
        console.error('Credits search error:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Failed to search by credits:', error);
      return [];
    }
  }

  // Process a query and return relevant workshop data
  async processWorkshopQuery(query: string): Promise<{
    found: boolean;
    data: WorkshopResult[];
    context: string;
  }> {
    const detection = this.detectWorkshopQuery(query);
    
    if (!detection.isWorkshopQuery) {
      return { found: false, data: [], context: '' };
    }

    let workshops: WorkshopResult[] = [];
    let context = '';

    switch (detection.queryType) {
      case 'day':
        workshops = await this.searchByDay(detection.searchTerm!);
        context = `Workshops on ${detection.searchTerm}:`;
        break;

      case 'credits':
        const creditType = this.creditKeywords.find(c => 
          detection.searchTerm!.toLowerCase().includes(c)
        );
        workshops = await this.searchByCredits(creditType);
        context = creditType ? `Workshops with ${creditType.toUpperCase()} credits:` : 'Workshops with credits:';
        break;

      case 'speaker':
      case 'topic':
      case 'general':
        workshops = await this.searchByQuery(query);
        context = 'Relevant workshops:';
        break;
    }

    return {
      found: workshops.length > 0,
      data: workshops,
      context
    };
  }

  // Format workshop information for display
  formatWorkshopInfo(workshop: WorkshopResult): string {
    let info = `${workshop.title}`;
    
    if (workshop.credits) {
      info += ` [${workshop.credits}]`;
    }
    
    if (workshop.day && workshop.time_block) {
      info += ` - ${workshop.day} ${workshop.time_block}`;
    }
    
    if (workshop.room) {
      info += ` in Room ${workshop.room}`;
    }
    
    return info;
  }

  formatMultipleWorkshops(workshops: WorkshopResult[]): string {
    if (workshops.length === 0) {
      return '';
    }

    return workshops
      .slice(0, 5) // Limit to 5 workshops
      .map(w => {
        let info = `• ${w.title}`;
        
        if (w.credits) {
          info += ` [${w.credits}]`;
        }
        
        if (w.day && w.time_block) {
          info += `\n  ${w.day}, ${w.time_block}`;
        }
        
        if (w.room) {
          info += ` - Room ${w.room}`;
        }
        
        if (w.speakers && w.speakers.length > 0) {
          const speakerNames = w.speakers
            .slice(0, 2)
            .map((s: any) => s.name)
            .join(', ');
          info += `\n  Speakers: ${speakerNames}`;
          if (w.speakers.length > 2) {
            info += ` and ${w.speakers.length - 2} more`;
          }
        }
        
        if (w.overview && w.overview.length < 150) {
          info += `\n  ${w.overview}`;
        }
        
        return info;
      })
      .join('\n\n');
  }
}

export const workshopSearchService = WorkshopSearchService.getInstance();