// services/cache.service.ts
export interface CacheEntry {
    response: string;
    timestamp: number;
    provider: string;
    strategy: string;
  }
  
  export class CacheService {
    private static responseCache = new Map<string, CacheEntry>();
    private static instantResponses = new Map<string, string>([
      ['schedule', 'Main sessions run 9 AM-5 PM daily with breaks at 11 AM and 3 PM. Keynote is at 2 PM in the main auditorium.'],
      ['lunch', 'Lunch is served 12 PM-1 PM in the main dining hall with vegetarian, vegan, and gluten-free options available.'],
      ['location', "We're at Grand Convention Center, 123 Conference Ave. Multiple floors have different session tracks."],
      ['food', 'Food options include vegetarian, vegan, and gluten-free choices. Coffee and snacks are available throughout the day.'],
      ['wifi', 'Free WiFi is available throughout the venue. Network: ConferenceGuest, Password: Welcome2024'],
      ['parking', 'Free parking is available in the main lot. Premium parking spots are $10/day in the covered garage.'],
      ['registration', 'Registration desk is open 8 AM-6 PM daily on the main floor. Bring your confirmation email or ID.'],
      ['networking', 'Networking breaks are at 11 AM and 3 PM. Evening networking events are 6-8 PM in the lobby.']
    ]);
  
    private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    private static readonly MAX_CACHE_SIZE = 100;
  
    /**
     * Check for instant response based on keywords
     */
    static getInstantResponse(prompt: string): string | null {
      const text = prompt.toLowerCase();
      
      for (const [keyword, response] of this.instantResponses) {
        if (text.includes(keyword)) {
          console.log(`⚡ INSTANT RESPONSE for keyword: ${keyword}`);
          return response;
        }
      }
      
      return null;
    }
  
    /**
     * Generate cache key from prompt and strategy
     */
    private static getCacheKey(prompt: string, strategy: string): string {
      return `${prompt.toLowerCase().trim()}-${strategy}`;
    }
  
    /**
     * Get cached response if available and not expired
     */
    static getCachedResponse(prompt: string, strategy: string): CacheEntry | null {
      const key = this.getCacheKey(prompt, strategy);
      const cached = this.responseCache.get(key);
      
      if (!cached) {
        return null;
      }
  
      const now = Date.now();
      if ((now - cached.timestamp) > this.CACHE_DURATION) {
        this.responseCache.delete(key);
        console.log(`🗑️ Expired cache entry removed for: ${key.substring(0, 30)}...`);
        return null;
      }
  
      console.log(`🚀 CACHE HIT for: ${key.substring(0, 30)}...`);
      return cached;
    }
  
    /**
     * Store response in cache
     */
    static setCachedResponse(
      prompt: string, 
      strategy: string, 
      response: string, 
      provider: string
    ): void {
      const key = this.getCacheKey(prompt, strategy);
      
      this.responseCache.set(key, {
        response,
        timestamp: Date.now(),
        provider,
        strategy
      });
  
      console.log(`💾 Cached response for: ${key.substring(0, 30)}... (Cache size: ${this.responseCache.size})`);
  
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
  
      console.log('🧹 Cleaning cache - size limit reached');
      
      // Sort by timestamp (newest first) and keep only the most recent entries
      const entries = Array.from(this.responseCache.entries());
      entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
      
      this.responseCache.clear();
      entries.slice(0, Math.floor(this.MAX_CACHE_SIZE * 0.8)).forEach(([key, value]) => {
        this.responseCache.set(key, value);
      });
  
      console.log(`🧹 Cache cleaned. New size: ${this.responseCache.size}`);
    }
  
    /**
     * Get cache statistics
     */
    static getCacheStats(): { size: number; maxSize: number; hitRate?: number } {
      return {
        size: this.responseCache.size,
        maxSize: this.MAX_CACHE_SIZE
      };
    }
  
    /**
     * Clear all cache (useful for testing or manual refresh)
     */
    static clearCache(): void {
      this.responseCache.clear();
      console.log('🗑️ All cache cleared');
    }
  
    /**
     * Add or update instant response
     */
    static addInstantResponse(keyword: string, response: string): void {
      this.instantResponses.set(keyword, response);
      console.log(`⚡ Added instant response for keyword: ${keyword}`);
    }
  }