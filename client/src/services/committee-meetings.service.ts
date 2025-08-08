import { supabase } from '@/lib/supabase/config/supabaseClient';
import { embeddingService } from './embedding.service';

export interface CommitteeMeeting {
  id: string;
  committee_name: string;
  meeting_type: string; // 'Committee Meeting', 'Council Meeting', 'Training', 'Standards Meeting'
  day: string;
  date: string;
  time: string;
  start_time?: Date;
  end_time?: Date;
  location: string;
  room_number?: string;
  building?: string;
  description?: string;
  is_open_to_all?: boolean;
  keywords?: string[];
  similarity?: number;
  queryEmbedding?: number[]; // New field for embedding reuse
}

export class CommitteeMeetingsService {
  private static instance: CommitteeMeetingsService;

  // Keywords that indicate user is asking about meetings
  private meetingKeywords = [
    'meeting', 'meetings', 'committee', 'committees', 'council', 'councils',
    'board', 'panel', 'hearing', 'hearings', 'session', 'gathering',
    'assembly', 'conference', 'convene', 'assemble', 'gather'
  ];

  // Specific committee keywords
  private committeeNames = [
    'health care', 'healthcare', 'adult corrections', 'legal issues', 
    'community corrections', 'detention', 'faith based', 'religion',
    'staff wellness', 'wellness', 'international', 'behavioral health',
    'nurses', 'nursing', 'membership', 'restorative justice',
    'legislative', 'government affairs', 'probation', 'parole',
    'dental', 'women working', 'ethics', 'education directors',
    'correctional industries', 'juvenile', 'military', 'sheriff',
    'awards', 'substance use', 'moud', 'performance', 'standards',
    'accreditation', 'auditor', 'resolutions', 'policies',
    'facility planning', 'design'
  ];

  static getInstance(): CommitteeMeetingsService {
    if (!CommitteeMeetingsService.instance) {
      CommitteeMeetingsService.instance = new CommitteeMeetingsService();
    }
    return CommitteeMeetingsService.instance;
  }

  // Detect if query is about committee meetings
  detectMeetingQuery(query: string): {
    isMeetingQuery: boolean;
    queryType: 'general' | 'specific_committee' | 'day' | 'type' | 'none';
    searchTerm?: string;
  } {
    const lowerQuery = query.toLowerCase();
    
    // Check for specific committee names
    const committeeMatch = this.committeeNames.find(name => 
      lowerQuery.includes(name)
    );
    
    if (committeeMatch) {
      return {
        isMeetingQuery: true,
        queryType: 'specific_committee',
        searchTerm: committeeMatch
      };
    }
    
    // Check for day-specific queries
    const days = ['friday', 'saturday', 'sunday', 'monday', 'tuesday'];
    const dayMatch = days.find(day => lowerQuery.includes(day));
    
    if (dayMatch && this.meetingKeywords.some(keyword => lowerQuery.includes(keyword))) {
      return {
        isMeetingQuery: true,
        queryType: 'day',
        searchTerm: dayMatch
      };
    }
    
    // Check for meeting type queries
    if (lowerQuery.includes('council') || lowerQuery.includes('training') || 
        lowerQuery.includes('standards') || lowerQuery.includes('accreditation')) {
      return {
        isMeetingQuery: true,
        queryType: 'type',
        searchTerm: query
      };
    }
    
    // General meeting query
    if (this.meetingKeywords.some(keyword => lowerQuery.includes(keyword))) {
      return {
        isMeetingQuery: true,
        queryType: 'general',
        searchTerm: query
      };
    }
    
    return {
      isMeetingQuery: false,
      queryType: 'none'
    };
  }

  // Search meetings using semantic similarity
  async searchByQuery(query: string, limit: number = 5): Promise<CommitteeMeeting[]> {
    try {
      const queryEmbedding = await embeddingService.generateEmbedding(query);
      return this.searchByQueryWithEmbedding(queryEmbedding, limit);
    } catch (error) {
      console.error('Failed to search committee meetings:', error);
      return [];
    }
  }

  // Search meetings using pre-computed embedding
  async searchByQueryWithEmbedding(queryEmbedding: number[], limit: number = 5): Promise<CommitteeMeeting[]> {
    try {
      const { data, error } = await supabase
        .rpc('search_committee_meetings_semantic', {
          query_embedding: queryEmbedding,
          match_count: limit,
          similarity_threshold: 0.7
        });

      if (error) {
        console.error('Committee meeting search error:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Failed to search meetings with embedding:', error);
      return [];
    }
  }

  // Search meetings by text (faster, no embeddings)
  async searchByText(query: string, limit: number = 5): Promise<CommitteeMeeting[]> {
    try {
      const { data, error } = await supabase
        .rpc('search_committee_meetings', {
          query_text: query,
          match_count: limit
        });

      if (error) {
        console.error('Text search error:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Failed to search by text:', error);
      return [];
    }
  }

  // Get all meetings for a specific day
  async getMeetingsByDay(day: string): Promise<CommitteeMeeting[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_meetings_by_day', {
          target_day: day
        });

      if (error) {
        console.error('Day search error:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Failed to get meetings by day:', error);
      return [];
    }
  }

  // Get meetings by type
  async getMeetingsByType(type: string): Promise<CommitteeMeeting[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_meetings_by_type', {
          target_type: type
        });

      if (error) {
        console.error('Type search error:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Failed to get meetings by type:', error);
      return [];
    }
  }

  // Process meeting query and return appropriate data
  async processMeetingQuery(query: string): Promise<{
    found: boolean;
    data: CommitteeMeeting[];
    context: string;
  }> {
    const detection = this.detectMeetingQuery(query);
    
    if (!detection.isMeetingQuery) {
      return { found: false, data: [], context: '' };
    }

    let meetings: CommitteeMeeting[] = [];
    let context = '';

    switch (detection.queryType) {
      case 'specific_committee':
        meetings = await this.searchByText(detection.searchTerm!, 5);
        context = `${detection.searchTerm} committee meetings:`;
        break;

      case 'day':
        meetings = await this.getMeetingsByDay(detection.searchTerm!);
        context = `Committee meetings on ${detection.searchTerm}:`;
        break;

      case 'type':
        meetings = await this.getMeetingsByType(detection.searchTerm!);
        context = `${detection.searchTerm} meetings:`;
        break;

      case 'general':
        // For general queries, use text search for speed
        meetings = await this.searchByText(query, 10);
        context = 'Committee meetings:';
        break;
    }

    return {
      found: meetings.length > 0,
      data: meetings,
      context
    };
  }

  // Process meeting query using pre-computed embedding
  async processMeetingQueryWithEmbedding(query: string, embedding: number[]): Promise<{
    found: boolean;
    data: CommitteeMeeting[];
    context: string;
  }> {
    const detection = this.detectMeetingQuery(query);
    
    if (!detection.isMeetingQuery) {
      return { found: false, data: [], context: '' };
    }

    let meetings: CommitteeMeeting[] = [];
    let context = '';

    switch (detection.queryType) {
      case 'specific_committee':
        meetings = await this.searchByText(detection.searchTerm!, 5);
        context = `${detection.searchTerm} committee meetings:`;
        break;

      case 'day':
        meetings = await this.getMeetingsByDay(detection.searchTerm!);
        context = `Committee meetings on ${detection.searchTerm}:`;
        break;

      case 'type':
        meetings = await this.getMeetingsByType(detection.searchTerm!);
        context = `${detection.searchTerm} meetings:`;
        break;

      case 'general':
        // Use pre-computed embedding for semantic search
        console.log('♻️ Reusing embedding for committee meeting search');
        meetings = await this.searchByQueryWithEmbedding(embedding, 10);
        context = 'Committee meetings:';
        break;
    }

    return {
      found: meetings.length > 0,
      data: meetings,
      context
    };
  }

  // Format meeting information for display
  formatMeetingInfo(meeting: CommitteeMeeting): string {
    let info = `${meeting.committee_name}`;
    
    if (meeting.time) {
      info += ` - ${meeting.day} ${meeting.time}`;
    }
    
    if (meeting.location) {
      info += ` at ${meeting.location}`;
    }
    
    if (meeting.description) {
      info += ` | ${meeting.description}`;
    }
    
    return info;
  }

  formatMultipleMeetings(meetings: CommitteeMeeting[]): string {
    if (meetings.length === 0) {
      return 'No committee meetings found.';
    }

    // Group by day for better organization
    const byDay: { [key: string]: CommitteeMeeting[] } = {};
    
    meetings.forEach(meeting => {
      if (!byDay[meeting.day]) {
        byDay[meeting.day] = [];
      }
      byDay[meeting.day].push(meeting);
    });

    let formatted = '';
    const dayOrder = ['Friday', 'Saturday', 'Sunday', 'Monday', 'Tuesday'];
    
    dayOrder.forEach(day => {
      if (byDay[day]) {
        formatted += `\n${day.toUpperCase()}:\n`;
        byDay[day].forEach(meeting => {
          formatted += `• ${meeting.committee_name} - ${meeting.time} at ${meeting.location}\n`;
        });
      }
    });

    return formatted.trim();
  }
}

export const committeeMeetingsService = CommitteeMeetingsService.getInstance();