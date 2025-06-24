import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types matching your database schema
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

// Chat storage service
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
