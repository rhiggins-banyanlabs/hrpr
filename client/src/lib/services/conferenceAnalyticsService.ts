import { createClient } from '@supabase/supabase-js';

export interface ConferenceAnalytics {
  // Basic metrics
  totalUsers: number;
  totalMessages: number;
  avgSessionLength: number;
  dbStatus: 'Connected' | 'Disconnected';
  
  // Top questions and topics
  topQuestions: QuestionFrequency[];
  recentQuestions: string[];
  
  // Conference-specific metrics
  peakUsageHours: HourlyUsage[];
  dailyUsageTrends: DailyUsage[];
  popularTopics: TopicFrequency[];
  mostSearchedSpeakers: SpeakerSearch[];
  mostSearchedSessions: SessionSearch[];
  
  // User behavior
  intentDistribution: IntentMetric[];
  voiceVsTextUsage: UsageType;
  avgConversationsPerUser: number;
  
  // Real-time metrics
  activeUsersNow: number;
  todayStats: TodayStats;
}

export interface QuestionFrequency {
  question: string;
  count: number;
  lastAsked: string;
}

export interface HourlyUsage {
  hour: string;
  messageCount: number;
  userCount: number;
}

export interface DailyUsage {
  date: string;
  messageCount: number;
  userCount: number;
  avgSessionLength: number;
}

export interface TopicFrequency {
  topic: string;
  count: number;
  category: 'schedule' | 'location' | 'speaker' | 'general';
}

export interface SpeakerSearch {
  speakerName: string;
  searchCount: number;
  lastSearched: string;
}

export interface SessionSearch {
  sessionName: string;
  searchCount: number;
  lastSearched: string;
}

export interface IntentMetric {
  intent: string;
  count: number;
  percentage: number;
}

export interface UsageType {
  voice: number;
  text: number;
  voicePercentage: number;
}

export interface TodayStats {
  messages: number;
  users: number;
  sessions: number;
  avgLength: number;
}

class ConferenceAnalyticsService {
  private supabase: any;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  async getConferenceAnalytics(): Promise<ConferenceAnalytics> {
    try {
      const [
        basicMetrics,
        topQuestions,
        recentQuestions,
        peakHours,
        dailyTrends,
        popularTopics,
        speakerSearches,
        sessionSearches,
        intents,
        usageTypes,
        todayStats
      ] = await Promise.all([
        this.getBasicMetrics(),
        this.getTopQuestions(),
        this.getRecentQuestions(),
        this.getPeakUsageHours(),
        this.getDailyUsageTrends(),
        this.getPopularTopics(),
        this.getMostSearchedSpeakers(),
        this.getMostSearchedSessions(),
        this.getIntentDistribution(),
        this.getVoiceVsTextUsage(),
        this.getTodayStats()
      ]);

      return {
        ...basicMetrics,
        topQuestions,
        recentQuestions,
        peakUsageHours: peakHours,
        dailyUsageTrends: dailyTrends,
        popularTopics,
        mostSearchedSpeakers: speakerSearches,
        mostSearchedSessions: sessionSearches,
        intentDistribution: intents,
        voiceVsTextUsage: usageTypes,
        avgConversationsPerUser: basicMetrics.totalMessages > 0 ? 
          basicMetrics.totalMessages / Math.max(basicMetrics.totalUsers, 1) : 0,
        activeUsersNow: await this.getActiveUsersNow(),
        todayStats,
        dbStatus: 'Connected'
      };
    } catch (error) {
      console.error('Error getting conference analytics:', error);
      return this.getDefaultAnalytics();
    }
  }

  private async getBasicMetrics() {
    console.log('🔍 Getting basic metrics...');
    
    try {
      const [sessionResult, messageResult] = await Promise.all([
        this.supabase.from('chat_sessions').select('*', { count: 'exact', head: true }),
        this.supabase.from('messages').select('*', { count: 'exact', head: true })
      ]);

      console.log('📊 Session result:', sessionResult);
      console.log('💬 Message result:', messageResult);

      const totalUsers = sessionResult.count || 0;
      const totalMessages = messageResult.count || 0;
      const avgSessionLength = totalUsers > 0 ? Math.round(totalMessages / totalUsers) : 0;

      console.log('📈 Calculated metrics:', { totalUsers, totalMessages, avgSessionLength });

      return { totalUsers, totalMessages, avgSessionLength };
    } catch (error) {
      console.error('❌ Error in getBasicMetrics:', error);
      return { totalUsers: 0, totalMessages: 0, avgSessionLength: 0 };
    }
  }

  private async getTopQuestions(): Promise<QuestionFrequency[]> {
    try {
      console.log('🔍 Getting top questions...');
      
      const { data, error } = await this.supabase
        .from('messages')
        .select('message_text, created_at')
        .eq('sender', 'user')
        .not('message_text', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1000);

      console.log('💬 Messages query result:', { data: data?.length || 0, error });

      if (error) {
        console.error('❌ Error fetching messages:', error);
        return [];
      }

      if (!data) return [];

      console.log('🔢 Sample messages:', data.slice(0, 3));

      // Group similar questions and count frequency
      const questionCounts: { [key: string]: { count: number; lastAsked: string } } = {};
      
      data.forEach((message: any) => {
        if (!message.message_text) return;
        
        // Normalize question text (remove punctuation, lowercase, trim)
        let normalizedQuestion = message.message_text
          .toLowerCase()
          .replace(/[?!.,]/g, '')
          .trim();

        // Group similar questions (basic similarity)
        const existingKey = Object.keys(questionCounts).find(key => 
          this.areSimilarQuestions(key, normalizedQuestion)
        );

        const questionKey = existingKey || normalizedQuestion;
        
        if (!questionCounts[questionKey]) {
          questionCounts[questionKey] = { count: 0, lastAsked: message.created_at };
        }
        
        questionCounts[questionKey].count++;
        if (new Date(message.created_at) > new Date(questionCounts[questionKey].lastAsked)) {
          questionCounts[questionKey].lastAsked = message.created_at;
        }
      });

      // Get top 5 most frequent questions
      return Object.entries(questionCounts)
        .sort(([,a], [,b]) => b.count - a.count)
        .slice(0, 5)
        .map(([question, data]) => ({
          question: this.capitalizeFirst(question),
          count: data.count,
          lastAsked: data.lastAsked
        }));
    } catch (error) {
      console.error('Error getting top questions:', error);
      return [];
    }
  }

  private async getRecentQuestions(): Promise<string[]> {
    try {
      const { data } = await this.supabase
        .from('messages')
        .select('message_text')
        .eq('sender', 'user')
        .not('message_text', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10);

      return data?.map((msg: any) => msg.message_text) || [];
    } catch (error) {
      console.error('Error getting recent questions:', error);
      return [];
    }
  }

  private async getPeakUsageHours(): Promise<HourlyUsage[]> {
    try {
      const { data } = await this.supabase
        .from('messages')
        .select('created_at, session_id')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (!data) return [];

      const hourlyStats: { [hour: string]: { messages: number; users: Set<string> } } = {};

      data.forEach((message: any) => {
        const hour = new Date(message.created_at).getHours();
        const hourKey = `${hour}:00`;
        
        if (!hourlyStats[hourKey]) {
          hourlyStats[hourKey] = { messages: 0, users: new Set() };
        }
        
        hourlyStats[hourKey].messages++;
        if (message.session_id) {
          hourlyStats[hourKey].users.add(message.session_id);
        }
      });

      return Object.entries(hourlyStats)
        .map(([hour, stats]) => ({
          hour,
          messageCount: stats.messages,
          userCount: stats.users.size
        }))
        .sort((a, b) => parseInt(a.hour) - parseInt(b.hour));
    } catch (error) {
      console.error('Error getting peak usage hours:', error);
      return [];
    }
  }

  private async getDailyUsageTrends(): Promise<DailyUsage[]> {
    try {
      const { data } = await this.supabase
        .from('messages')
        .select('created_at, session_id')
        .gte('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString());

      if (!data) return [];

      const dailyStats: { [date: string]: { messages: number; users: Set<string> } } = {};

      data.forEach((message: any) => {
        const date = new Date(message.created_at).toISOString().split('T')[0];
        
        if (!dailyStats[date]) {
          dailyStats[date] = { messages: 0, users: new Set() };
        }
        
        dailyStats[date].messages++;
        if (message.session_id) {
          dailyStats[date].users.add(message.session_id);
        }
      });

      return Object.entries(dailyStats)
        .map(([date, stats]) => ({
          date,
          messageCount: stats.messages,
          userCount: stats.users.size,
          avgSessionLength: stats.users.size > 0 ? Math.round(stats.messages / stats.users.size) : 0
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
      console.error('Error getting daily usage trends:', error);
      return [];
    }
  }

  private async getPopularTopics(): Promise<TopicFrequency[]> {
    try {
      const { data } = await this.supabase
        .from('messages')
        .select('message_text')
        .eq('sender', 'user')
        .not('message_text', 'is', null)
        .limit(500);

      if (!data) return [];

      const topicKeywords = {
        schedule: ['schedule', 'agenda', 'time', 'when', 'session', 'event', 'meeting'],
        location: ['where', 'location', 'room', 'building', 'address', 'directions', 'map'],
        speaker: ['speaker', 'presenter', 'who', 'keynote', 'talk', 'presentation'],
        general: ['help', 'info', 'about', 'what', 'how', 'can', 'registration']
      };

      const topicCounts: { [key: string]: number } = {
        schedule: 0,
        location: 0,
        speaker: 0,
        general: 0
      };

      data.forEach((message: any) => {
        const content = message.message_text.toLowerCase();
        Object.entries(topicKeywords).forEach(([topic, keywords]) => {
          if (keywords.some(keyword => content.includes(keyword))) {
            topicCounts[topic]++;
          }
        });
      });

      return Object.entries(topicCounts)
        .map(([topic, count]) => ({
          topic: this.capitalizeFirst(topic),
          count,
          category: topic as any
        }))
        .sort((a, b) => b.count - a.count);
    } catch (error) {
      console.error('Error getting popular topics:', error);
      return [];
    }
  }

  private async getMostSearchedSpeakers(): Promise<SpeakerSearch[]> {
    // This would require parsing message content for speaker names
    // For now, return placeholder data
    return [];
  }

  private async getMostSearchedSessions(): Promise<SessionSearch[]> {
    // This would require parsing message content for session names
    // For now, return placeholder data
    return [];
  }

  private async getIntentDistribution(): Promise<IntentMetric[]> {
    const topics = await this.getPopularTopics();
    const total = topics.reduce((sum, topic) => sum + topic.count, 0);
    
    return topics.map(topic => ({
      intent: topic.topic,
      count: topic.count,
      percentage: total > 0 ? Math.round((topic.count / total) * 100) : 0
    }));
  }

  private async getVoiceVsTextUsage(): Promise<UsageType> {
    // This would require tracking voice vs text usage
    // For now, return placeholder data based on message metadata
    return {
      voice: 0,
      text: 100,
      voicePercentage: 0
    };
  }

  private async getActiveUsersNow(): Promise<number> {
    try {
      const { data } = await this.supabase
        .from('messages')
        .select('session_id')
        .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString());

      if (!data) return 0;
      return new Set(data.map((msg: any) => msg.session_id)).size;
    } catch (error) {
      return 0;
    }
  }

  private async getTodayStats(): Promise<TodayStats> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await this.supabase
        .from('messages')
        .select('session_id')
        .gte('created_at', `${today}T00:00:00Z`)
        .lt('created_at', `${today}T23:59:59Z`);

      const messages = data?.length || 0;
      const uniqueSessions = new Set(data?.map((msg: any) => msg.session_id) || []);
      const users = uniqueSessions.size;
      const sessions = users; // Assuming 1 session per user for now
      const avgLength = users > 0 ? Math.round(messages / users) : 0;

      return { messages, users, sessions, avgLength };
    } catch (error) {
      return { messages: 0, users: 0, sessions: 0, avgLength: 0 };
    }
  }

  private areSimilarQuestions(q1: string, q2: string): boolean {
    // Basic similarity check - could be enhanced with more sophisticated algorithms
    const words1 = new Set(q1.split(' ').filter(w => w.length > 3));
    const words2 = new Set(q2.split(' ').filter(w => w.length > 3));
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size > 0.5; // 50% similarity threshold
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private getDefaultAnalytics(): ConferenceAnalytics {
    return {
      totalUsers: 0,
      totalMessages: 0,
      avgSessionLength: 0,
      dbStatus: 'Disconnected',
      topQuestions: [],
      recentQuestions: [],
      peakUsageHours: [],
      dailyUsageTrends: [],
      popularTopics: [],
      mostSearchedSpeakers: [],
      mostSearchedSessions: [],
      intentDistribution: [],
      voiceVsTextUsage: { voice: 0, text: 0, voicePercentage: 0 },
      avgConversationsPerUser: 0,
      activeUsersNow: 0,
      todayStats: { messages: 0, users: 0, sessions: 0, avgLength: 0 }
    };
  }
}

export const conferenceAnalyticsService = new ConferenceAnalyticsService();