import { supabase } from '../config/supabaseClient';
import { ChatSession, Message, MessageFeedback } from '@/types/database/chat.types';

export class ChatStorageService {
  /**
   * Create a new chat session
   */
  static async createChatSession(metadata?: Record<string, any>): Promise<ChatSession | null> {
    try {
      console.log('🔧 ChatStorageService.createChatSession called with metadata:', metadata);
      
      // Prepare the session data
      const sessionData = {
        user_agent: typeof window !== 'undefined' ? navigator.userAgent : 'server',
        metadata: metadata || {},
        is_active: true,
        session_started_at: new Date().toISOString(),
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
      return session;
    } catch (error) {
      console.error('❌ Error in createChatSession:', error);
      
      if (error instanceof Error) {
        console.error('❌ Error name:', error.name);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error stack:', error.stack);
      }
      
      return null;
    }
  }

  /**
   * Save a message to the database
   */
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

      const messageData = {
        session_id: sessionId,
        sender,
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
        console.error('❌ Error saving message:', error);
        throw error;
      }

      if (!message) {
        console.error('❌ No message returned from Supabase');
        return null;
      }

      console.log('✅ Message saved:', message.id);
      return message;
    } catch (error) {
      console.error('❌ Error in saveMessage:', error);
      return null;
    }
  }

  /**
   * End a chat session
   */
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

      console.log('✅ Session ended successfully:', sessionId);
      return true;
    } catch (error) {
      console.error('❌ Error in endChatSession:', error);
      return false;
    }
  }

  /**
   * Get all active sessions
   */
  static async getActiveSessions(): Promise<ChatSession[]> {
    try {
      const { data: sessions, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return sessions || [];
    } catch (error) {
      console.error('Error fetching active sessions:', error);
      return [];
    }
  }

  /**
   * Get all sessions
   */
  static async getAllSessions(): Promise<ChatSession[]> {
    try {
      const { data: sessions, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return sessions || [];
    } catch (error) {
      console.error('Error fetching all sessions:', error);
      return [];
    }
  }

  /**
   * Get messages for a session
   */
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
      console.error('Error fetching session messages:', error);
      return [];
    }
  }

  /**
   * Get all messages
   */
  static async getMessages(): Promise<Message[]> {
    try {
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .order('message_timestamp', { ascending: false });

      if (error) throw error;
      return messages || [];
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  }

  /**
   * Save or update feedback for a message
   */
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
          .update({
            feedback_type: feedbackType,
            updated_at: new Date().toISOString()
          })
          .eq('message_id', messageId)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        // Create new feedback
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
      return result;
    } catch (error) {
      console.error('Error saving feedback:', error);
      return null;
    }
  }

  /**
   * Get feedback for a message
   */
  static async getMessageFeedback(messageId: string): Promise<MessageFeedback | null> {
    try {
      const { data: feedback, error } = await supabase
        .from('message_feedback')
        .select('*')
        .eq('message_id', messageId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        throw error;
      }

      return feedback || null;
    } catch (error) {
      console.error('Error fetching message feedback:', error);
      return null;
    }
  }

  /**
   * Get all feedback for a session
   */
  static async getSessionFeedback(sessionId: string): Promise<MessageFeedback[]> {
    try {
      const { data: feedback, error } = await supabase
        .from('message_feedback')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return feedback || [];
    } catch (error) {
      console.error('Error fetching session feedback:', error);
      return [];
    }
  }

  /**
   * Remove feedback for a message
   */
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

  /**
   * Test database connection
   */
  static async testConnection(): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('chat_sessions')
        .select('count', { count: 'exact' })
        .limit(1);

      if (error) {
        console.error('❌ Database connection test failed:', error);
        return false;
      }

      console.log('✅ Database connection test passed');
      return true;
    } catch (error) {
      console.error('❌ Database connection test failed:', error);
      return false;
    }
  }
}

export default ChatStorageService;