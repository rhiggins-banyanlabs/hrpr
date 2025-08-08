import { semanticRouter, SemanticMatch } from './semantic-router.service';
import OpenAI from 'openai';

export interface IntentResult {
  isVenueQuery: boolean;
  isConferenceQuery: boolean;
  isLocationQuery: boolean;
  isExhibitorQuery: boolean;
  isWorkshopQuery: boolean;
  isMeetingQuery: boolean;
  isInfoQuery: boolean;
  primaryIntent: 'venue' | 'conference' | 'location' | 'exhibitor' | 'workshop' | 'meeting' | 'info' | 'general';
  confidence: number;
  semanticMatch?: SemanticMatch;
  queryEmbedding?: number[];  // Include the embedding to reuse in other services
}

export class SemanticIntentDetectorService {
  private static instance: SemanticIntentDetectorService;
  private openai: OpenAI | null = null;
  
  private constructor() {
    // Initialize OpenAI client only on server side
    if (typeof window === 'undefined' && process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    }
  }
  
  static getInstance(): SemanticIntentDetectorService {
    if (!this.instance) {
      this.instance = new SemanticIntentDetectorService();
    }
    return this.instance;
  }

  /**
   * Detect intent using semantic similarity with pre-computed embeddings
   */
  async detectIntentWithEmbedding(queryEmbedding: number[]): Promise<IntentResult> {
    // Get semantic matches
    const matches = semanticRouter.findBestMatch(queryEmbedding);
    
    if (matches.length === 0 || matches[0].confidence < 0.5) {
      // Fallback to general if no good match
      return this.createResult('general', 0.3, undefined, queryEmbedding);
    }
    
    const bestMatch = matches[0];
    
    // Convert semantic match to intent result
    return this.createResult(
      bestMatch.intent as any,
      bestMatch.confidence,
      bestMatch,
      queryEmbedding
    );
  }

  /**
   * Detect intent using the fallback keyword method
   */
  detectIntentByKeywords(query: string): IntentResult {
    const match = semanticRouter.detectIntentByKeywords(query);
    return this.createResult(
      match.intent as any,
      match.confidence,
      match
    );
  }

  /**
   * Main intent detection method - tries semantic first, falls back to keywords
   */
  async detectIntent(query: string): Promise<IntentResult> {
    // Check if embeddings are loaded
    if (!semanticRouter.isInitialized()) {
      console.log('⚠️ Semantic router not initialized, using keyword detection');
      return this.detectIntentByKeywords(query);
    }

    try {
      // Generate embedding for the query via API
      const embedding = await this.generateEmbedding(query);
      
      if (embedding) {
        const result = await this.detectIntentWithEmbedding(embedding);
        // Include the embedding in the result so it can be reused
        result.queryEmbedding = embedding;
        console.log(`🎯 Semantic Intent: "${query}" -> ${result.primaryIntent} (confidence: ${result.confidence.toFixed(2)})`);
        return result;
      }
    } catch (error) {
      console.error('Error in semantic intent detection:', error);
    }

    // Fallback to keyword detection
    console.log('⚠️ Falling back to keyword detection');
    return this.detectIntentByKeywords(query);
  }

  /**
   * Generate embedding for a query via API endpoint
   */
  private async generateEmbedding(text: string): Promise<number[] | null> {
    try {
      // Server-side: use OpenAI directly
      if (typeof window === 'undefined' && this.openai) {
        try {
          const response = await this.openai.embeddings.create({
            model: "text-embedding-ada-002",
            input: text.toLowerCase(),
          });
          console.log('✅ Generated embedding server-side');
          return response.data[0].embedding;
        } catch (error) {
          console.error('Error generating embedding server-side:', error);
          return null;
        }
      }

      // Client-side: use API endpoint
      const response = await fetch('/api/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: text.toLowerCase() }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate embedding');
      }

      const data = await response.json();
      console.log('✅ Generated embedding client-side');
      return data.embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      return null;
    }
  }

  /**
   * Create an IntentResult object
   */
  private createResult(
    intent: 'venue' | 'conference' | 'location' | 'exhibitor' | 'workshop' | 'meeting' | 'info' | 'general',
    confidence: number,
    semanticMatch?: SemanticMatch,
    queryEmbedding?: number[]
  ): IntentResult {
    return {
      isVenueQuery: intent === 'venue',
      isConferenceQuery: intent === 'conference',
      isLocationQuery: intent === 'location',
      isExhibitorQuery: intent === 'exhibitor',
      isWorkshopQuery: intent === 'workshop',
      isMeetingQuery: intent === 'meeting',
      isInfoQuery: intent === 'info',
      primaryIntent: intent,
      confidence: confidence,
      semanticMatch: semanticMatch,
      queryEmbedding: queryEmbedding
    };
  }

  /**
   * Get filler response for a given intent
   */
  getFillerResponse(intent: string): string {
    const fillerResponses: Record<string, string[]> = {
      info: [
        "Let me find that conference information",
        "I'll get those details for you",
        "Let me look up that information",
        "I'll search for that conference detail"
      ],
      meeting: [
        "Let me check the committee meeting schedule",
        "I'll find those meeting details",
        "Let me look up committee sessions",
        "I'll search for committee meetings"
      ],
      workshop: [
        "Let me search our workshop offerings",
        "I'll find relevant workshops for you",
        "Let me look through the workshop schedule",
        "I'll check what workshops are available"
      ],
      exhibitor: [
        "Let me check our exhibitor list",
        "I'll look that up in our vendor directory",
        "Let me find that information for you",
        "I'll search our exhibitor database"
      ],
      conference: [
        "Let me check the conference schedule",
        "I'll look up the agenda for you",
        "Let me find those session times",
        "I'll check the conference program"
      ],
      location: [
        "Let me get that location information",
        "I'll help you find that",
        "Let me look up those details",
        "I'll find that location for you"
      ],
      venue: [
        "Let me find that for you",
        "I'll check what's available nearby",
        "Let me look up local options",
        "I'll find that information"
      ],
      general: [
        "Let me look that up for you",
        "I'll find that information",
        "Let me check on that",
        "I'll help you with that"
      ]
    };

    const responses = fillerResponses[intent] || fillerResponses.general;
    const selected = responses[Math.floor(Math.random() * responses.length)];
    
    // Add pause prefix to prevent audio cutoff
    return "..." + selected;
  }
}

export const semanticIntentDetector = SemanticIntentDetectorService.getInstance();