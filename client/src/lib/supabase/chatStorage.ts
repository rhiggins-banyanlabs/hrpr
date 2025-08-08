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
  sender: 'user' | 'Harper';
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
// ENHANCED CHAT STORAGE SERVICE
// =============================================

export class ChatStorageService {

  // Save or update feedback for a message
  static async saveFeedback(
    messageId: string,
    sessionId: string,
    feedbackType: 'thumbs_up' | 'thumbs_down'
  ): Promise<MessageFeedback | null> {
    try {
      console.log('👍👎 Saving feedback:', { messageId, sessionId, feedbackType });

      // First, check if feedback already exists for this message
      const { data: existingFeedback } = await supabase
        .from('message_feedback')
        .select('*')
        .eq('message_id', messageId)
        .single();

      let result;

      if (existingFeedback) {
        // Update existing feedback
        const { data, error } = await supabase
        .from('message_feedback')
        .insert({
          message_id: messageId,
          session_id: sessionId,
          feedback_type: feedbackType,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

        if (error) throw error;
        result = data;
      } else {
        // Insert new feedback
        const { data, error } = await supabase
          .from('message_feedback')
          .insert({
            message_id: messageId,
            session_id: sessionId,
            feedback_type: feedbackType
          })
          .select()
          .single();

        if (error) throw error;
        result = data;
      }

      console.log('✅ Feedback saved successfully');

      // Log analytics event
      try {
        await this.logAnalyticsEvent(sessionId, 'message_feedback', {
          message_id: messageId,
          feedback_type: feedbackType
        });
      } catch (analyticsError) {
        console.error('⚠️ Failed to log feedback analytics (non-fatal):', analyticsError);
      }

      return result;
    } catch (error: any) {
      console.error('❌ Error saving feedback:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        full: JSON.stringify(error, null, 2),
      });
      return null;
    }
  }

  // Get feedback for a specific message
  static async getMessageFeedback(messageId: string): Promise<MessageFeedback | null> {
    try {
      const { data, error } = await supabase
        .from('message_feedback')
        .select('*')
        .eq('message_id', messageId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
        throw error;
      }

      return data || null;
    } catch (error) {
      console.error('Error fetching message feedback:', error);
      return null;
    }
  }

  // Get all feedback for a session
  static async getSessionFeedback(sessionId: string): Promise<MessageFeedback[]> {
    try {
      const { data, error } = await supabase
        .from('message_feedback')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching session feedback:', error);
      return [];
    }
  }

  // Remove feedback (if user wants to undo their feedback)
  static async removeFeedback(messageId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('message_feedback')
        .delete()
        .eq('message_id', messageId);

      if (error) throw error;
      
      console.log('✅ Feedback removed successfully');
      return true;
    } catch (error) {
      console.error('Error removing feedback:', error);
      return false;
    }
  }
  // Create a new chat session - ENHANCED with detailed logging
  static async createChatSession(metadata?: Record<string, any>): Promise<ChatSession | null> {
    try {
      console.log('🔧 ChatStorageService.createChatSession called with metadata:', metadata);
      
      // Prepare the session data
      const sessionData = {
        user_agent: typeof window !== 'undefined' ? navigator.userAgent : 'server',
        metadata: metadata || {},
        is_active: true,
        session_started_at: new Date().toISOString(),
        // user_id will be null if not authenticated
      };

      console.log('🔧 Session data prepared:', sessionData);

      // Insert the session
      const { data: session, error } = await supabase
        .from('chat_sessions')
        .insert(sessionData)
        .select()
        .single();

      if (error) {
        console.error('❌ Supabase error creating session:', error);
        console.error('❌ Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      if (!session) {
        console.error('❌ No session returned from Supabase (but no error)');
        return null;
      }

      console.log('✅ Session created successfully:', session.id);

      // Log analytics event
      try {
        await this.logAnalyticsEvent(session.id, 'session_start', {
          trigger: 'chat_open',
          ...metadata
        });
        console.log('📊 Analytics event logged for session:', session.id);
      } catch (analyticsError) {
        console.error('⚠️ Failed to log analytics event (non-fatal):', analyticsError);
        // Don't fail the session creation if analytics fails
      }

      return session;
    } catch (error) {
      console.error('❌ Error in createChatSession:', error);
      
      // Provide more specific error information
      if (error instanceof Error) {
        console.error('❌ Error name:', error.name);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error stack:', error.stack);
      }
      
      return null;
    }
  }

  // Save a message to the database - ENHANCED
  static async saveMessage(
    sessionId: string,
    sender: 'user' | 'Harper',
    messageText: string,
    options?: {
      isVoiceInput?: boolean;
      voiceTranscript?: string;
      selectedVoice?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<Message | null> {
    try {
      console.log('💾 Saving message:', { sessionId, sender, messageLength: messageText.length });

      // Keep original logic - if it was working in develop, don't change it
      const messageData = {
        session_id: sessionId,
        sender: sender,
        message_text: messageText,
        message_timestamp: new Date().toISOString(),
        is_voice_input: options?.isVoiceInput || false,
        voice_transcript: options?.voiceTranscript,
        selected_voice: options?.selectedVoice,
        metadata: options?.metadata || {}
      };

      const { data: message, error } = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single();

      if (error) {
        console.error(`❌ Error saving message:`, error);
        console.error('❌ Message data that failed:', messageData);
        console.error('❌ Error code:', error.code);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error details:', error.details);
        console.error('❌ Error hint:', error.hint);
        
        // If it's a constraint error, try with 'connie' as sender (legacy compatibility)
        if (error.code === '23514' && sender === 'Harper') {
          console.log('🔄 Trying with legacy sender "connie"...');
          const legacyMessageData = { ...messageData, sender: 'connie' };
          
          const { data: legacyMessage, error: legacyError } = await supabase
            .from('messages')
            .insert(legacyMessageData)
            .select()
            .single();
            
          if (!legacyError && legacyMessage) {
            console.log('✅ Message saved with legacy sender:', legacyMessage.id);
            return legacyMessage;
          } else {
            console.error('❌ Legacy save also failed:', legacyError);
          }
        }
        
        // Don't throw error - allow the app to continue working
        return null;
      }

      if (!message) {
        console.error('❌ No message returned from Supabase');
        return null;
      }

      console.log('✅ Message saved:', message.id);
      return message;
    } catch (error) {
      console.error('❌ Error in saveMessage:', error);
      // Don't throw error - allow the app to continue working
      return null;
    }
  }

  // End a chat session - ENHANCED
  static async endChatSession(sessionId: string): Promise<boolean> {
    try {
      console.log('🔚 Ending chat session:', sessionId);

      const { error } = await supabase
        .from('chat_sessions')
        .update({
          session_ended_at: new Date().toISOString(),
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) {
        console.error('❌ Error ending session:', error);
        throw error;
      }

      // Log analytics event
      try {
        await this.logAnalyticsEvent(sessionId, 'session_end');
        console.log('📊 Session end analytics logged');
      } catch (analyticsError) {
        console.error('⚠️ Failed to log session end analytics (non-fatal):', analyticsError);
      }

      console.log('✅ Session ended successfully:', sessionId);
      return true;
    } catch (error) {
      console.error('❌ Error ending chat session:', error);
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

  // Log analytics events - ENHANCED
  static async logAnalyticsEvent(
    sessionId: string,
    eventType: string,
    eventData?: Record<string, any>
  ): Promise<void> {
    try {
      console.log('📊 Logging analytics event:', { sessionId, eventType, eventData });

      const { error } = await supabase
        .from('chat_analytics')
        .insert({
          session_id: sessionId,
          event_type: eventType,
          event_data: eventData || {},
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('❌ Error logging analytics event:', error);
        throw error;
      }

      console.log('✅ Analytics event logged successfully');
    } catch (error) {
      console.error('❌ Error in logAnalyticsEvent:', error);
      // Don't throw - analytics failures shouldn't break the app
    }
  }

  // Test database connection
  static async testConnection(): Promise<boolean> {
    try {
      console.log('🧪 Testing database connection...');
      
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('count(*)')
        .limit(1);

      if (error) {
        console.error('❌ Database connection test failed:', error);
        return false;
      }

      console.log('✅ Database connection test successful');
      return true;
    } catch (error) {
      console.error('❌ Database connection test error:', error);
      return false;
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


// Add this to your existing chatStorage.ts file after the Message interface

export interface MessageFeedback {
  id: string;
  message_id: string;
  session_id: string;
  feedback_type: 'thumbs_up' | 'thumbs_down';
  created_at: string;
  updated_at: string;
}

// Add these methods to your ChatStorageService class


// =============================================
// NEW DEBUG UTILITIES
// =============================================

export const ChatStorageDebug = {
  // Check if all required environment variables are set
  checkEnvironment: () => {
    const required = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      console.error('❌ Missing environment variables:', missing);
      return false;
    }
    
    console.log('✅ All required environment variables are set');
    return true;
  },

  // Test basic Supabase functionality
  testBasicFunctionality: async () => {
    try {
      console.log('🧪 Testing basic Supabase functionality...');
      
      // Test connection
      const connectionOk = await ChatStorageService.testConnection();
      if (!connectionOk) {
        throw new Error('Database connection failed');
      }

      console.log('✅ Basic Supabase functionality test passed');
      return true;
    } catch (error) {
      console.error('❌ Basic Supabase functionality test failed:', error);
      return false;
    }
  }
};