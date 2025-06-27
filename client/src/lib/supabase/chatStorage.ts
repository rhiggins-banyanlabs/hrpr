import { createClient } from '@supabase/supabase-js';


// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// =============================================
// EXISTING CHAT TYPES
// =============================================

export interface ChatSession {
  id: string;
  user_id?: string;
  session_started_at: string;
  session_ended_at?: string;
  is_active: boolean;
  user_agent?: string;
  ip_address?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  session_id: string;
  sender: 'user' | 'connie';
  message_text: string;
  message_timestamp: string;
  is_voice_input?: boolean;
  voice_transcript?: string;
  selected_voice?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface ChatAnalytics {
  id: string;
  session_id: string;
  event_type: string;
  event_data?: Record<string, any>;
  created_at: string;
}

// =============================================
// NEW CONFERENCE TYPES
// =============================================

export interface Speaker {
  id: string;
  name: string;
  title: string;
  company: string;
  bio?: string;
  created_at: string;
  updated_at: string;
}

export interface EventSession {
  id: string;
  time: string;
  title: string;
  speaker: string;
  description?: string;
  location?: string;
  created_at: string;
  updated_at: string;
}

// =============================================
// EXISTING CHAT STORAGE SERVICE
// =============================================

export class ChatStorageService {
  // Create a new chat session when "Hey Connie" is detected
  static async createChatSession(metadata?: Record<string, any>): Promise<ChatSession | null> {
    try {
      const { data: session, error } = await supabase
        .from('chat_sessions')
        .insert({
          user_agent: navigator.userAgent,
          metadata: metadata || {},
          // user_id will be null if not authenticated
        })
        .select()
        .single();

      if (error) throw error;

      // Log analytics event
      if (session) {
        await this.logAnalyticsEvent(session.id, 'session_start', {
          trigger: 'voice_activation',
          ...metadata
        });
      }

      return session;
    } catch (error) {
      console.error('Error creating chat session:', error);
      return null;
    }
  }

  // Save a message to the database
  static async saveMessage(
    sessionId: string,
    sender: 'user' | 'connie',
    messageText: string,
    options?: {
      isVoiceInput?: boolean;
      voiceTranscript?: string;
      selectedVoice?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<Message | null> {
    try {
      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          session_id: sessionId,
          sender,
          message_text: messageText,
          is_voice_input: options?.isVoiceInput || false,
          voice_transcript: options?.voiceTranscript,
          selected_voice: options?.selectedVoice,
          metadata: options?.metadata || {}
        })
        .select()
        .single();

      if (error) throw error;
      return message;
    } catch (error) {
      console.error('Error saving message:', error);
      return null;
    }
  }

  // End a chat session
  static async endChatSession(sessionId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('chat_sessions')
        .update({
          session_ended_at: new Date().toISOString(),
          is_active: false
        })
        .eq('id', sessionId);

      if (error) throw error;

      // Log analytics event
      await this.logAnalyticsEvent(sessionId, 'session_end');

      return true;
    } catch (error) {
      console.error('Error ending chat session:', error);
      return false;
    }
  }

  // Get all messages for a session
  static async getSessionMessages(sessionId: string): Promise<Message[]> {
    try {
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('message_timestamp', { ascending: true });

      if (error) throw error;
      return messages || [];
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  }

  // Get active sessions (optional - for admin dashboard)
  static async getActiveSessions(): Promise<ChatSession[]> {
    try {
      const { data: sessions, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('is_active', true)
        .order('session_started_at', { ascending: false });

      if (error) throw error;
      return sessions || [];
    } catch (error) {
      console.error('Error fetching active sessions:', error);
      return [];
    }
  }

  // ADD THESE METHODS TO YOUR EXISTING ChatStorageService CLASS
// (Don't replace anything, just add these methods at the end of the ChatStorageService class)

  // Add these methods to your existing ChatStorageService class:
  
  // Get all chat sessions (for admin panel)
  static async getAllSessions(): Promise<ChatSession[]> {
    try {
      const { data: sessions, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .order('session_started_at', { ascending: false });

      if (error) throw error;
      return sessions || [];
    } catch (error) {
      console.error('Error fetching all sessions:', error);
      return [];
    }
  }

  // Get all analytics (for admin panel)
  static async getAllAnalytics(): Promise<ChatAnalytics[]> {
    try {
      const { data: analytics, error } = await supabase
        .from('chat_analytics')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return analytics || [];
    } catch (error) {
      console.error('Error fetching analytics:', error);
      return [];
    }
  }

  // Alias method for admin panel compatibility
  static async getMessages(sessionId: string): Promise<Message[]> {
    return this.getSessionMessages(sessionId);
  }

  // Log analytics events
  static async logAnalyticsEvent(
    sessionId: string,
    eventType: string,
    eventData?: Record<string, any>
  ): Promise<void> {
    try {
      await supabase
        .from('chat_analytics')
        .insert({
          session_id: sessionId,
          event_type: eventType,
          event_data: eventData || {}
        });
    } catch (error) {
      console.error('Error logging analytics event:', error);
    }
  }
}

// =============================================
// NEW CONFERENCE STORAGE SERVICE
// =============================================

export class ConferenceStorageService {
  // ===== SPEAKER METHODS =====
  
  static async getAllSpeakers(): Promise<Speaker[]> {
    try {
      const { data: speakers, error } = await supabase
        .from('speakers')
        .select('*')
        .order('name');

      if (error) throw error;
      return speakers || [];
    } catch (error) {
      console.error('Error fetching speakers:', error);
      return [];
    }
  }

  static async createSpeaker(speaker: Omit<Speaker, 'id' | 'created_at' | 'updated_at'>): Promise<Speaker | null> {
    try {
      const { data, error } = await supabase
        .from('speakers')
        .insert([speaker])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating speaker:', error);
      return null;
    }
  }

  static async updateSpeaker(id: string, updates: Partial<Omit<Speaker, 'id' | 'created_at' | 'updated_at'>>): Promise<Speaker | null> {
    try {
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('speakers')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating speaker:', error);
      return null;
    }
  }

  static async deleteSpeaker(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('speakers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting speaker:', error);
      return false;
    }
  }

  // ===== SESSION METHODS =====

  static async getAllSessions(): Promise<EventSession[]> {
    try {
      const { data: sessions, error } = await supabase
        .from('event_sessions')
        .select('*')
        .order('time');

      if (error) throw error;
      return sessions || [];
    } catch (error) {
      console.error('Error fetching sessions:', error);
      return [];
    }
  }

  static async createSession(session: Omit<EventSession, 'id' | 'created_at' | 'updated_at'>): Promise<EventSession | null> {
    try {
      const { data, error } = await supabase
        .from('event_sessions')
        .insert([session])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating session:', error);
      return null;
    }
  }

  static async updateSession(id: string, updates: Partial<Omit<EventSession, 'id' | 'created_at' | 'updated_at'>>): Promise<EventSession | null> {
    try {
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('event_sessions')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating session:', error);
      return null;
    }
  }

  static async deleteSession(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('event_sessions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting session:', error);
      return false;
    }
  }

  // ===== UTILITY METHODS =====

  static async getSpeakerByName(name: string): Promise<Speaker | null> {
    try {
      const { data, error } = await supabase
        .from('speakers')
        .select('*')
        .eq('name', name)
        .single();

      if (error) return null;
      return data;
    } catch (error) {
      console.error('Error fetching speaker by name:', error);
      return null;
    }
  }

  static async getSessionsBySpeaker(speakerName: string): Promise<EventSession[]> {
    try {
      const { data: sessions, error } = await supabase
        .from('event_sessions')
        .select('*')
        .eq('speaker', speakerName)
        .order('time');

      if (error) throw error;
      return sessions || [];
    } catch (error) {
      console.error('Error fetching sessions by speaker:', error);
      return [];
    }
  }
}