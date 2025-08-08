import { createClient } from '@supabase/supabase-js';
import { OpenAI } from 'openai';

export interface ScheduleEntry {
  id: string;
  day: string;
  time: string;
  event: string;
  location?: string;
  event_type?: string;
  start_time?: Date;
  end_time?: Date;
  similarity?: number;
}

export interface ScheduleSearchOptions {
  searchType: 'semantic' | 'text' | 'time';
  query?: string;
  startTime?: Date;
  endTime?: Date;
  eventType?: string;
  limit?: number;
}

class ScheduleService {
  private supabase: any;
  private openai: any;

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const openaiApiKey = process.env.OPENAI_API_KEY!;

    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.openai = new OpenAI({ apiKey: openaiApiKey });
  }

  /**
   * Search schedule using semantic similarity
   */
  async searchBySemantic(query: string, limit: number = 5): Promise<ScheduleEntry[]> {
    try {
      // Generate embedding for the query
      const embeddingResponse = await this.openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: query,
      });
      const queryEmbedding = embeddingResponse.data[0].embedding;

      // Search using the embedding
      const { data, error } = await this.supabase.rpc('search_schedule', {
        query_embedding: queryEmbedding,
        match_threshold: 0.7,
        match_count: limit
      });

      if (error) {
        console.error('Error searching schedule:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in semantic search:', error);
      return [];
    }
  }

  /**
   * Search schedule using text search
   */
  async searchByText(query: string, limit: number = 5): Promise<ScheduleEntry[]> {
    try {
      const { data, error } = await this.supabase.rpc('search_schedule_by_text', {
        query_text: query,
        match_count: limit
      });

      if (error) {
        console.error('Error searching schedule by text:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in text search:', error);
      return [];
    }
  }

  /**
   * Get schedule for a specific day
   */
  async getScheduleForDay(day: string): Promise<ScheduleEntry[]> {
    try {
      const { data, error } = await this.supabase
        .from('conference_schedule')
        .select('*')
        .ilike('day', `%${day}%`)
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error fetching schedule for day:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting schedule for day:', error);
      return [];
    }
  }

  /**
   * Get events happening at a specific time
   */
  async getEventsAtTime(time: Date): Promise<ScheduleEntry[]> {
    try {
      const { data, error } = await this.supabase
        .from('conference_schedule')
        .select('*')
        .lte('start_time', time.toISOString())
        .gte('end_time', time.toISOString());

      if (error) {
        console.error('Error fetching events at time:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting events at time:', error);
      return [];
    }
  }

  /**
   * Get events by type
   */
  async getEventsByType(eventType: string): Promise<ScheduleEntry[]> {
    try {
      const { data, error } = await this.supabase
        .from('conference_schedule')
        .select('*')
        .eq('event_type', eventType)
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error fetching events by type:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting events by type:', error);
      return [];
    }
  }

  /**
   * Get upcoming events
   */
  async getUpcomingEvents(limit: number = 5): Promise<ScheduleEntry[]> {
    try {
      const now = new Date();
      const { data, error } = await this.supabase
        .from('conference_schedule')
        .select('*')
        .gte('start_time', now.toISOString())
        .order('start_time', { ascending: true })
        .limit(limit);

      if (error) {
        console.error('Error fetching upcoming events:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting upcoming events:', error);
      return [];
    }
  }

  /**
   * Search schedule with multiple options
   */
  async searchSchedule(options: ScheduleSearchOptions): Promise<ScheduleEntry[]> {
    const { searchType, query, startTime, endTime, eventType, limit = 5 } = options;

    switch (searchType) {
      case 'semantic':
        if (!query) return [];
        return this.searchBySemantic(query, limit);
      
      case 'text':
        if (!query) return [];
        return this.searchByText(query, limit);
      
      case 'time':
        if (!startTime) return [];
        return this.getEventsAtTime(startTime);
      
      default:
        return [];
    }
  }

  /**
   * Format schedule entries for display
   */
  formatScheduleForDisplay(entries: ScheduleEntry[]): string {
    if (entries.length === 0) {
      return "I couldn't find any matching events in the schedule.";
    }

    const formatted = entries.map(entry => {
      let result = `**${entry.event}**\n`;
      result += `📅 ${entry.day}\n`;
      result += `⏰ ${entry.time}`;
      
      if (entry.location) {
        result += `\n📍 ${entry.location}`;
      }

      return result;
    }).join('\n\n');

    return formatted;
  }

  /**
   * Get a natural language summary of schedule
   */
  getScheduleSummary(entries: ScheduleEntry[]): string {
    if (entries.length === 0) {
      return "No events found for your query.";
    }

    if (entries.length === 1) {
      const entry = entries[0];
      return `${entry.event} is scheduled for ${entry.day} at ${entry.time}${entry.location ? ` at ${entry.location}` : ''}.`;
    }

    const summary = `I found ${entries.length} events:\n\n`;
    return summary + entries.map((entry, index) => 
      `${index + 1}. ${entry.event} - ${entry.day} at ${entry.time}`
    ).join('\n');
  }
}

export const scheduleService = new ScheduleService();
export default scheduleService;