import { supabase } from '@/lib/supabase/config/supabaseClient';

export interface IntentEmbedding {
  id: string;
  intent: string;
  example_text: string;
  embedding: number[];
  similarity?: number;
}

export interface SemanticMatch {
  intent: string;
  confidence: number;
  example: string;
}

class SemanticRouterSupabaseService {
  private static instance: SemanticRouterSupabaseService;
  private initialized = false;
  private intentCache = new Map<string, IntentEmbedding[]>();

  private constructor() {}

  static getInstance(): SemanticRouterSupabaseService {
    if (!this.instance) {
      this.instance = new SemanticRouterSupabaseService();
    }
    return this.instance;
  }

  /**
   * Initialize by loading intent examples from Supabase
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      console.log('🔄 Loading intent embeddings from Supabase...');
      
      // Get all active intent embeddings
      const { data, error } = await supabase
        .from('intent_embeddings')
        .select('id, intent, example_text, embedding')
        .eq('is_active', true);

      if (error) {
        throw new Error(`Failed to load embeddings: ${error.message}`);
      }

      if (!data || data.length === 0) {
        console.warn('⚠️ No intent embeddings found in database');
        return;
      }

      // Group by intent
      this.intentCache.clear();
      for (const item of data) {
        if (!this.intentCache.has(item.intent)) {
          this.intentCache.set(item.intent, []);
        }
        this.intentCache.get(item.intent)!.push(item);
      }

      console.log(`✅ Loaded ${data.length} embeddings for ${this.intentCache.size} intents`);
      this.initialized = true;

    } catch (error) {
      console.error('❌ Failed to initialize semantic router:', error);
      throw error;
    }
  }

  /**
   * Find best matching intent using database search
   */
  async findBestMatch(queryEmbedding: number[]): Promise<SemanticMatch[]> {
    try {
      // Search for similar embeddings in database
      const { data, error } = await supabase.rpc('search_intent_by_embedding', {
        query_embedding: queryEmbedding,
        match_count: 5,
        similarity_threshold: 0.5
      });

      if (error) {
        console.error('Error searching intents:', error);
        return [];
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Group by intent and get the highest confidence for each
      const intentMap = new Map<string, SemanticMatch>();
      
      for (const match of data) {
        if (!intentMap.has(match.intent) || match.similarity > intentMap.get(match.intent)!.confidence) {
          intentMap.set(match.intent, {
            intent: match.intent,
            confidence: match.similarity,
            example: match.example_text
          });
        }
      }

      // Sort by confidence
      return Array.from(intentMap.values()).sort((a, b) => b.confidence - a.confidence);

    } catch (error) {
      console.error('Error in findBestMatch:', error);
      return [];
    }
  }

  /**
   * Add a new intent example to the database
   */
  async addIntentExample(intent: string, exampleText: string, embedding: number[]): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('intent_embeddings')
        .insert({
          intent,
          example_text: exampleText,
          embedding,
          metadata: {
            source: 'admin_ui',
            added_at: new Date().toISOString()
          }
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error adding intent example:', error);
        return false;
      }

      console.log(`✅ Added new example for intent "${intent}": "${exampleText.substring(0, 50)}..."`);
      
      // Clear cache to force reload
      this.initialized = false;
      this.intentCache.clear();
      
      return true;

    } catch (error) {
      console.error('Error adding intent example:', error);
      return false;
    }
  }

  /**
   * Get all examples for a specific intent
   */
  async getIntentExamples(intent: string): Promise<IntentEmbedding[]> {
    try {
      const { data, error } = await supabase
        .from('intent_embeddings')
        .select('*')
        .eq('intent', intent)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching intent examples:', error);
        return [];
      }

      return data || [];

    } catch (error) {
      console.error('Error fetching intent examples:', error);
      return [];
    }
  }

  /**
   * Get all available intents
   */
  async getAvailableIntents(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('intent_embeddings')
        .select('intent')
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching intents:', error);
        return [];
      }

      // Get unique intents
      const intents = new Set(data?.map(item => item.intent) || []);
      return Array.from(intents).sort();

    } catch (error) {
      console.error('Error fetching intents:', error);
      return [];
    }
  }

  /**
   * Delete an intent example
   */
  async deleteIntentExample(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('intent_embeddings')
        .update({ is_active: false })
        .eq('id', id);

      if (error) {
        console.error('Error deleting intent example:', error);
        return false;
      }

      // Clear cache to force reload
      this.initialized = false;
      this.intentCache.clear();
      
      return true;

    } catch (error) {
      console.error('Error deleting intent example:', error);
      return false;
    }
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

export const semanticRouterSupabase = SemanticRouterSupabaseService.getInstance();