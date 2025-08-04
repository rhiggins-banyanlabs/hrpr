import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

interface ConferenceInfoResult {
  id: string;
  topic: string;
  category: string;
  information: string;
  keywords: string[];
  url?: string;
  similarity?: number;
  match_score?: number;
}

class ConferenceInfoDatabaseService {
  /**
   * Search for conference information using semantic search with embeddings
   */
  async searchInfoSemantic(query: string): Promise<string | null> {
    try {
      // Generate embedding for the query
      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: query.toLowerCase(),
      });
      const queryEmbedding = embeddingResponse.data[0].embedding;

      // Search using the database function
      const { data, error } = await supabase.rpc('search_conference_info', {
        query_embedding: queryEmbedding,
        match_threshold: 0.7,
        match_count: 3
      });

      if (error) {
        console.error('Error searching conference info:', error);
        return null;
      }

      if (data && data.length > 0) {
        // Return the best match
        const bestMatch = data[0] as ConferenceInfoResult;
        console.log(`📋 Conference info match: ${bestMatch.topic} (similarity: ${bestMatch.similarity?.toFixed(3)})`);
        return bestMatch.information;
      }

      return null;
    } catch (error) {
      console.error('Error in semantic search:', error);
      return null;
    }
  }

  /**
   * Search for conference information using keyword matching
   */
  async searchInfoByKeywords(query: string): Promise<string | null> {
    try {
      const lowerQuery = query.toLowerCase();
      const queryWords = lowerQuery.split(/\s+/).filter(word => word.length > 2);

      if (queryWords.length === 0) {
        return null;
      }

      // Search using the database function
      const { data, error } = await supabase.rpc('search_conference_info_by_keywords', {
        search_keywords: queryWords,
        match_count: 3
      });

      if (error) {
        console.error('Error searching conference info by keywords:', error);
        return null;
      }

      if (data && data.length > 0) {
        // Return the best match
        const bestMatch = data[0] as ConferenceInfoResult;
        console.log(`📋 Conference info keyword match: ${bestMatch.topic} (score: ${bestMatch.match_score})`);
        return bestMatch.information;
      }

      return null;
    } catch (error) {
      console.error('Error in keyword search:', error);
      return null;
    }
  }

  /**
   * Search conference info using both semantic and keyword search
   */
  async searchInfo(query: string): Promise<string | null> {
    // Try semantic search first
    const semanticResult = await this.searchInfoSemantic(query);
    if (semanticResult) {
      return semanticResult;
    }

    // Fall back to keyword search
    const keywordResult = await this.searchInfoByKeywords(query);
    return keywordResult;
  }

  /**
   * Get all topics for display or reference
   */
  async getAllTopics(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('conference_info')
        .select('topic')
        .order('priority', { ascending: false });

      if (error) {
        console.error('Error fetching topics:', error);
        return [];
      }

      return data?.map(item => item.topic) || [];
    } catch (error) {
      console.error('Error getting topics:', error);
      return [];
    }
  }

  /**
   * Get info by specific topic
   */
  async getInfoByTopic(topic: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('conference_info')
        .select('information')
        .ilike('topic', topic)
        .single();

      if (error) {
        console.error('Error fetching info by topic:', error);
        return null;
      }

      return data?.information || null;
    } catch (error) {
      console.error('Error getting info by topic:', error);
      return null;
    }
  }

  /**
   * Get info by category
   */
  async getInfoByCategory(category: string): Promise<ConferenceInfoResult[]> {
    try {
      const { data, error } = await supabase
        .from('conference_info')
        .select('*')
        .ilike('category', category)
        .order('priority', { ascending: false });

      if (error) {
        console.error('Error fetching info by category:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting info by category:', error);
      return [];
    }
  }
}

export const conferenceInfoDatabaseService = new ConferenceInfoDatabaseService();