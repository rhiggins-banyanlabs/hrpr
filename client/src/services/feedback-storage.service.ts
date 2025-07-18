// Feedback storage service for managing session feedback

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { FeedbackSession } from '@/types/feedback.types';

export class FeedbackStorageService {
  private static instance: FeedbackStorageService;
  private supabase: SupabaseClient;

  private constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase configuration');
    }

    this.supabase = createClient(supabaseUrl, supabaseAnonKey);
  }

  static getInstance(): FeedbackStorageService {
    if (!FeedbackStorageService.instance) {
      FeedbackStorageService.instance = new FeedbackStorageService();
    }
    return FeedbackStorageService.instance;
  }

  // Save feedback for a session
  async saveFeedback(feedback: Omit<FeedbackSession, 'timestamp'>): Promise<boolean> {
    try {
      console.log('💾 Saving session feedback:', feedback);

      const { error } = await this.supabase
        .from('session_feedback')
        .insert({
          session_id: feedback.sessionId,
          satisfied: feedback.satisfied,
          feedback_text: feedback.feedbackText || null,
          conversation_count: feedback.conversationCount,
          user_id: feedback.userId || null,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('❌ Error saving feedback:', error);
        return false;
      }

      console.log('✅ Feedback saved successfully');
      return true;
    } catch (error) {
      console.error('❌ Exception saving feedback:', error);
      return false;
    }
  }

  // Get all feedback (for admin)
  async getAllFeedback(limit: number = 100): Promise<FeedbackSession[]> {
    try {
      const { data, error } = await this.supabase
        .from('session_feedback')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Error fetching feedback:', error);
        return [];
      }

      return data.map(row => ({
        sessionId: row.session_id,
        timestamp: new Date(row.created_at),
        satisfied: row.satisfied,
        feedbackText: row.feedback_text,
        conversationCount: row.conversation_count,
        userId: row.user_id
      }));
    } catch (error) {
      console.error('❌ Exception fetching feedback:', error);
      return [];
    }
  }

  // Get feedback analytics
  async getFeedbackAnalytics() {
    try {
      // Get satisfaction stats
      const { data: satisfactionData, error: satisfactionError } = await this.supabase
        .from('session_feedback')
        .select('satisfied');

      if (satisfactionError) {
        console.error('❌ Error fetching satisfaction data:', satisfactionError);
        return null;
      }

      const totalFeedback = satisfactionData.length;
      const satisfiedCount = satisfactionData.filter(f => f.satisfied).length;
      const unsatisfiedCount = totalFeedback - satisfiedCount;
      const satisfactionRate = totalFeedback > 0 ? (satisfiedCount / totalFeedback) * 100 : 0;

      // Get feedback with text
      const { data: textFeedback, error: textError } = await this.supabase
        .from('session_feedback')
        .select('feedback_text, created_at')
        .not('feedback_text', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10);

      if (textError) {
        console.error('❌ Error fetching text feedback:', textError);
      }

      // Get average conversation count
      const { data: convData, error: convError } = await this.supabase
        .from('session_feedback')
        .select('conversation_count');

      if (convError) {
        console.error('❌ Error fetching conversation data:', convError);
      }

      const avgConversations = convData && convData.length > 0
        ? convData.reduce((sum, f) => sum + f.conversation_count, 0) / convData.length
        : 0;

      return {
        totalFeedback,
        satisfiedCount,
        unsatisfiedCount,
        satisfactionRate: Math.round(satisfactionRate * 10) / 10,
        averageConversations: Math.round(avgConversations * 10) / 10,
        recentTextFeedback: textFeedback || []
      };
    } catch (error) {
      console.error('❌ Exception getting feedback analytics:', error);
      return null;
    }
  }

  // Create feedback table if it doesn't exist (for initial setup)
  async createFeedbackTable(): Promise<boolean> {
    try {
      // This would typically be done via migrations, but including for completeness
      const { error } = await this.supabase.rpc('create_feedback_table', {
        sql: `
          CREATE TABLE IF NOT EXISTS session_feedback (
            id SERIAL PRIMARY KEY,
            session_id VARCHAR(255) NOT NULL,
            satisfied BOOLEAN NOT NULL,
            feedback_text TEXT,
            conversation_count INTEGER DEFAULT 0,
            user_id VARCHAR(255),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_session_id (session_id),
            INDEX idx_created_at (created_at)
          );
        `
      });

      if (error) {
        console.error('❌ Error creating feedback table:', error);
        return false;
      }

      console.log('✅ Feedback table ready');
      return true;
    } catch (error) {
      console.error('❌ Exception creating feedback table:', error);
      return false;
    }
  }
}

// Export singleton instance
export const feedbackStorage = FeedbackStorageService.getInstance();