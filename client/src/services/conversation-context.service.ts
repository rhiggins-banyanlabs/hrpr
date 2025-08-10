/**
 * Service to track conversation context for better intent detection
 * Helps identify when users are asking follow-up questions
 */

export interface ConversationContext {
  lastQuery?: string;
  lastIntent?: string;
  lastTopic?: string;
  lastEntities?: string[];
  lastTimestamp?: Date;
}

class ConversationContextService {
  private static instance: ConversationContextService;
  private context: ConversationContext = {};
  private contextTimeout = 5 * 60 * 1000; // 5 minutes
  
  private constructor() {}
  
  static getInstance(): ConversationContextService {
    if (!this.instance) {
      this.instance = new ConversationContextService();
    }
    return this.instance;
  }

  /**
   * Update context with new query and intent
   */
  updateContext(query: string, intent: string, topic?: string, entities?: string[]) {
    this.context = {
      lastQuery: query,
      lastIntent: intent,
      lastTopic: topic,
      lastEntities: entities,
      lastTimestamp: new Date()
    };
  }

  /**
   * Get the current context if it's still valid
   */
  getContext(): ConversationContext | null {
    if (!this.context.lastTimestamp) return null;
    
    const now = new Date();
    const timeDiff = now.getTime() - this.context.lastTimestamp.getTime();
    
    // Context expires after timeout
    if (timeDiff > this.contextTimeout) {
      this.clearContext();
      return null;
    }
    
    return this.context;
  }

  /**
   * Check if current query is a follow-up
   */
  isFollowUp(query: string): boolean {
    const context = this.getContext();
    if (!context) return false;
    
    const lowerQuery = query.toLowerCase();
    
    // Common follow-up patterns
    const followUpPatterns = [
      /^(and |also |what about |how about |tell me more|more info|more details)/i,
      /^(yes|no|okay|ok|sure|great|thanks|thank you)/i,
      /\b(that|this|it|they|them|those|these)\b/i,
      /\b(same|similar|like that|another one)\b/i,
      /^(when|where|who|what|why|how) (is|are|does|do) (that|it|they)/i,
      // New patterns for "more" and "other" requests
      /^(any other|other|more|what else|anything else|show me more|give me more)/i,
      /\b(other options|more options|other choices|additional|besides that)\b/i,
      /^(are there|is there|do you have) (any )?(other|more)/i
    ];
    
    return followUpPatterns.some(pattern => pattern.test(lowerQuery));
  }

  /**
   * Enhance query with context if it's a follow-up
   */
  enhanceQueryWithContext(query: string): string {
    if (!this.isFollowUp(query)) return query;
    
    const context = this.getContext();
    if (!context) return query;
    
    const lowerQuery = query.toLowerCase();
    
    // Handle specific follow-up patterns
    if (/^(yes|okay|ok|sure)\s*[,.]?\s*$/.test(lowerQuery)) {
      // User is just confirming without additional text, use last query
      return context.lastQuery || query;
    }
    
    // If user says "yes" followed by a new question, use the new question
    if (/^(yes|okay|ok|sure)\s+.+/.test(lowerQuery)) {
      // Remove the confirmation word and use the rest of the query
      return lowerQuery.replace(/^(yes|okay|ok|sure)\s+/, '');
    }
    
    // Handle "more" or "other" requests
    if (/^(any other|other|more|what else|anything else|show me more)/i.test(lowerQuery)) {
      if (context.lastTopic) {
        // Transform "any other" to "other [topic]"
        if (context.lastIntent === 'venue' || context.lastIntent === 'location') {
          return `other ${context.lastTopic} options besides what was mentioned`;
        } else if (context.lastIntent === 'exhibitor') {
          return `other exhibitors or companies besides ${context.lastTopic}`;
        } else if (context.lastIntent === 'workshop' || context.lastIntent === 'conference') {
          return `other sessions or workshops besides ${context.lastTopic}`;
        }
        return `${query} ${context.lastTopic}`;
      }
    }
    
    if (/\b(that|this|it)\b/.test(lowerQuery) && context.lastTopic) {
      // Replace pronouns with the actual topic
      return query.replace(/\b(that|this|it)\b/gi, context.lastTopic);
    }
    
    if (/^(when|where) is (that|it)/i.test(lowerQuery) && context.lastTopic) {
      // Transform "when is that" to "when is [topic]"
      return query.replace(/(that|it)/i, context.lastTopic);
    }
    
    // For other follow-ups, append context
    if (context.lastTopic) {
      return `${query} (regarding ${context.lastTopic})`;
    }
    
    return query;
  }

  /**
   * Clear the context
   */
  clearContext() {
    this.context = {};
  }

  /**
   * Extract entities from a query (simple implementation)
   */
  extractEntities(query: string): string[] {
    const entities: string[] = [];
    
    // Extract company names (capitalized words)
    const companyPattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g;
    const companies = query.match(companyPattern);
    if (companies) entities.push(...companies);
    
    // Extract booth numbers
    const boothPattern = /\bbooth\s*#?\s*(\d+)\b/gi;
    const booths = query.match(boothPattern);
    if (booths) entities.push(...booths);
    
    // Extract room numbers
    const roomPattern = /\broom\s*#?\s*(\d+[a-z]?)\b/gi;
    const rooms = query.match(roomPattern);
    if (rooms) entities.push(...rooms);
    
    // Extract committee names
    const committeePattern = /\b(\w+\s+)?committee\b/gi;
    const committees = query.match(committeePattern);
    if (committees) entities.push(...committees);
    
    return entities;
  }
}

export const conversationContext = ConversationContextService.getInstance();