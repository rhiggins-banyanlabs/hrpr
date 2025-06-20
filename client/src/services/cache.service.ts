// src/services/cache.service.ts - INTEGRATED WITH YOUR TYPES
import { Strategy, CacheEntry, CacheStats } from "@/types/ai-router.types";

export class CacheService {
  private static responseCache = new Map<string, CacheEntry>();
  private static instantResponses = new Map<string, string>([
    // Conference-specific instant responses
    ['schedule', 'Main sessions run 9 AM-5 PM daily with breaks at 11 AM and 3 PM. Keynote is at 2 PM in the main auditorium.'],
    ['lunch', 'Lunch is served 12 PM-1 PM in the main dining hall with vegetarian, vegan, and gluten-free options available.'],
    ['location', "We're at Grand Convention Center, 123 Conference Ave. Multiple floors have different session tracks."],
    ['food', 'Food options include vegetarian, vegan, and gluten-free choices. Coffee and snacks are available throughout the day.'],
    ['wifi', 'Free WiFi is available throughout the venue. Network: ConferenceGuest, Password: Welcome2024'],
    ['parking', 'Free parking is available in the main lot. Premium parking spots are $10/day in the covered garage.'],
    ['registration', 'Registration desk is open 8 AM-6 PM daily on the main floor. Bring your confirmation email or ID.'],
    ['networking', 'Networking breaks are at 11 AM and 3 PM. Evening networking events are 6-8 PM in the lobby.'],
    ['keynote', 'The keynote presentation is at 2 PM in the main auditorium. Doors open 15 minutes before.'],
    ['sessions', 'Main sessions run from 9 AM to 5 PM with various tracks across multiple floors.'],
    ['bathroom', 'Restrooms are located on every floor near the elevators and at both ends of each hallway.'],
    ['coffee', 'Coffee stations are available throughout the venue with complimentary coffee, tea, and snacks all day.']
  ]);

  // Performance tracking
  private static hitCount = 0;
  private static missCount = 0;
  private static totalCostSaved = 0;

  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private static readonly MAX_CACHE_SIZE = 100;

  /**
   * Check for instant response based on keywords
   * Returns response in 5-50ms for common conference questions
   */
  static getInstantResponse(prompt: string): string | null {
    const text = prompt.toLowerCase().trim();
    
    // Check for exact keyword matches first
    for (const [keyword, response] of this.instantResponses) {
      if (text.includes(keyword)) {
        console.log(`⚡ INSTANT RESPONSE for keyword: ${keyword} (${text.substring(0, 30)}...)`);
        return response;
      }
    }
    
    // Check for common question patterns
    const patterns = [
      { regex: /what time.*lunch|when.*lunch|lunch.*time/, response: this.instantResponses.get('lunch')! },
      { regex: /where.*conference|conference.*location|address/, response: this.instantResponses.get('location')! },
      { regex: /what.*schedule|daily.*schedule|session.*times/, response: this.instantResponses.get('schedule')! },
      { regex: /wifi|internet|password/, response: this.instantResponses.get('wifi')! },
      { regex: /parking|park.*car|where.*park/, response: this.instantResponses.get('parking')! },
      { regex: /keynote.*time|when.*keynote/, response: this.instantResponses.get('keynote')! },
      { regex: /bathroom|restroom|toilet/, response: this.instantResponses.get('bathroom')! },
      { regex: /coffee|snack|drink/, response: this.instantResponses.get('coffee')! }
    ];

    for (const pattern of patterns) {
      if (pattern.regex.test(text)) {
        console.log(`⚡ INSTANT RESPONSE via pattern match: ${pattern.regex} (${text.substring(0, 30)}...)`);
        return pattern.response;
      }
    }
    
    return null;
  }

  /**
   * Generate cache key from prompt and strategy
   */
  private static getCacheKey(prompt: string, strategy: Strategy): string {
    // Normalize the prompt to improve cache hit rate
    const normalizedPrompt = prompt.toLowerCase()
      .trim()
      .replace(/[?.!,]/g, '') // Remove punctuation
      .replace(/\s+/g, ' '); // Normalize whitespace
    
    return `${normalizedPrompt}-${strategy}`;
  }

  /**
   * Get cached response if available and not expired
   */
  static getCachedResponse(prompt: string, strategy: Strategy): CacheEntry | null {
    const key = this.getCacheKey(prompt, strategy);
    const cached = this.responseCache.get(key);
    
    if (!cached) {
      this.missCount++;
      return null;
    }

    const now = Date.now();
    if ((now - cached.timestamp) > this.CACHE_DURATION) {
      this.responseCache.delete(key);
      this.missCount++;
      console.log(`🗑️ Expired cache entry removed for: ${key.substring(0, 30)}...`);
      return null;
    }

    this.hitCount++;
    if (cached.cost) {
      this.totalCostSaved += cached.cost;
    }
    
    console.log(`🚀 CACHE HIT for: ${key.substring(0, 30)}... (age: ${Math.round((now - cached.timestamp) / 1000)}s)`);
    return cached;
  }

  /**
   * Store response in cache with full metadata
   */
  static setCachedResponse(
    prompt: string, 
    strategy: Strategy, 
    response: string, 
    provider: string,
    cost?: number,
    tokensUsed?: { input: number; output: number; total: number },
    originalDuration?: number
  ): void {
    const key = this.getCacheKey(prompt, strategy);
    
    const cacheEntry: CacheEntry = {
      response,
      timestamp: Date.now(),
      provider,
      strategy,
      cost,
      tokensUsed,
      originalDuration
    };
    
    this.responseCache.set(key, cacheEntry);

    console.log(`💾 Cached response for: ${key.substring(0, 30)}... (Provider: ${provider}, Cost: $${cost?.toFixed(4) || '0'}, Cache size: ${this.responseCache.size})`);

    // Clean cache if it gets too large
    this.cleanCacheIfNeeded();
  }

  /**
   * Clean old cache entries to prevent memory leaks
   */
  private static cleanCacheIfNeeded(): void {
    if (this.responseCache.size <= this.MAX_CACHE_SIZE) {
      return;
    }

    console.log(`🧹 Cleaning cache - size limit reached (${this.responseCache.size}/${this.MAX_CACHE_SIZE})`);
    
    // Sort by timestamp (newest first) and keep only the most recent entries
    const entries = Array.from(this.responseCache.entries());
    entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
    
    this.responseCache.clear();
    const keepCount = Math.floor(this.MAX_CACHE_SIZE * 0.8);
    entries.slice(0, keepCount).forEach(([key, value]) => {
      this.responseCache.set(key, value);
    });

    console.log(`🧹 Cache cleaned. New size: ${this.responseCache.size}/${this.MAX_CACHE_SIZE}`);
  }

  /**
   * Get comprehensive cache statistics using your CacheStats interface
   */
  static getCacheStats(): CacheStats {
    const entries = Array.from(this.responseCache.values());
    const now = Date.now();
    
    let oldestAge = 0;
    let newestAge = Infinity;

    entries.forEach(entry => {
      const age = now - entry.timestamp;
      if (age > oldestAge) oldestAge = age;
      if (age < newestAge) newestAge = age;
    });

    const totalRequests = this.hitCount + this.missCount;
    const hitRate = totalRequests > 0 ? (this.hitCount / totalRequests) * 100 : 0;

    return {
      size: this.responseCache.size,
      maxSize: this.MAX_CACHE_SIZE,
      instantResponsesCount: this.instantResponses.size,
      oldestEntry: oldestAge > 0 ? `${Math.round(oldestAge / 1000)}s ago` : undefined,
      newestEntry: newestAge < Infinity ? `${Math.round(newestAge / 1000)}s ago` : undefined,
      totalCostSaved: Math.round(this.totalCostSaved * 10000) / 10000,
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate: Math.round(hitRate * 100) / 100
    };
  }

  /**
   * Clear all cache and reset counters
   */
  static clearCache(): void {
    const sizeBefore = this.responseCache.size;
    this.responseCache.clear();
    this.hitCount = 0;
    this.missCount = 0;
    this.totalCostSaved = 0;
    console.log(`🗑️ All cache cleared (removed ${sizeBefore} entries, reset counters)`);
  }

  /**
   * Add or update instant response
   */
  static addInstantResponse(keyword: string, response: string): void {
    this.instantResponses.set(keyword.toLowerCase(), response);
    console.log(`⚡ Added instant response for keyword: ${keyword} -> ${response.substring(0, 50)}...`);
  }

  /**
   * Remove instant response
   */
  static removeInstantResponse(keyword: string): boolean {
    const removed = this.instantResponses.delete(keyword.toLowerCase());
    if (removed) {
      console.log(`⚡ Removed instant response for keyword: ${keyword}`);
    }
    return removed;
  }

  /**
   * Get all instant responses
   */
  static getInstantResponses(): Map<string, string> {
    return new Map(this.instantResponses);
  }

  /**
   * Get cache entry age in seconds
   */
  static getCacheAge(prompt: string, strategy: Strategy): number | null {
    const key = this.getCacheKey(prompt, strategy);
    const cached = this.responseCache.get(key);
    
    if (!cached) {
      return null;
    }

    return Math.round((Date.now() - cached.timestamp) / 1000);
  }

  /**
   * Check if prompt would get instant response (without returning the response)
   */
  static hasInstantResponse(prompt: string): boolean {
    return this.getInstantResponse(prompt) !== null;
  }

  /**
   * Check if prompt has cached response (without returning it)
   */
  static hasCachedResponse(prompt: string, strategy: Strategy): boolean {
    return this.getCachedResponse(prompt, strategy) !== null;
  }

  /**
   * Get performance metrics
   */
  static getPerformanceMetrics() {
    const totalRequests = this.hitCount + this.missCount;
    const hitRate = totalRequests > 0 ? (this.hitCount / totalRequests) * 100 : 0;
    
    return {
      totalRequests,
      cacheHits: this.hitCount,
      cacheMisses: this.missCount,
      hitRate: Math.round(hitRate * 100) / 100,
      totalCostSaved: Math.round(this.totalCostSaved * 10000) / 10000,
      cacheSize: this.responseCache.size,
      instantResponsesAvailable: this.instantResponses.size
    };
  }
}