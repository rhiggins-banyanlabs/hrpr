// src/services/venue-lookup.service.ts
import { createClient } from '@supabase/supabase-js';

interface Venue {
  id: string;
  name: string;
  category: string;
  address: string;
  rating: number;
  price_level: number;
  distance_miles: number;
  walk_time_minutes: number;
  hours_summary: string;
  special_notes?: string;
}

interface VenueCategory {
  category_name: string;
  search_keywords: string[];
  description: string;
}

export class VenueLookupService {
  private static instance: VenueLookupService;
  private supabase;
  private venueCache: Map<string, Venue[]> = new Map();
  private categoryCache: VenueCategory[] = [];
  private lastCacheUpdate = 0;
  private readonly CACHE_DURATION = 60 * 60 * 1000; // 1 hour

  private constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    // Load categories immediately and await in getInstance
    this.categoriesPromise = this.loadCategories();
  }

  private categoriesPromise: Promise<void>;

  static async getInstance(): Promise<VenueLookupService> {
    if (!VenueLookupService.instance) {
      VenueLookupService.instance = new VenueLookupService();
    }
    // Always wait for categories to be loaded before returning instance
    await VenueLookupService.instance.categoriesPromise;
    return VenueLookupService.instance;
  }

  async waitForInitialization(): Promise<void> {
    await this.categoriesPromise;
  }

  private async loadCategories() {
    try {
      const { data, error } = await this.supabase
        .from('venue_categories')
        .select('*');
      
      if (!error && data) {
        this.categoryCache = data;
        console.log('✅ Venue categories loaded:', data.length);
      }
    } catch (error) {
      console.error('❌ Failed to load venue categories:', error);
    }
  }

  /**
   * Detect what category the user is asking about
   * Prioritizes multi-word phrases and specific terms over general ones
   */
  detectCategory(query: string): string | null {
    const lowerQuery = query.toLowerCase();
    console.log(`🔍 VenueLookup: Checking query "${lowerQuery}" against ${this.categoryCache.length} categories`);
    
    // If categories aren't loaded yet, return null
    if (this.categoryCache.length === 0) {
      console.log(`⚠️ VenueLookup: Categories not loaded yet, skipping detection`);
      return null;
    }
    
    // Collect all matches with intelligent scoring
    const matches: Array<{ category: string; keyword: string; score: number }> = [];
    
    for (const category of this.categoryCache) {
      for (const keyword of category.search_keywords) {
        if (lowerQuery.includes(keyword)) {
          // Calculate score based on specificity:
          // 1. Multi-word phrases get bonus points
          // 2. Length matters, but multi-word is prioritized
          // 3. Exact word boundaries get bonus points
          let score = keyword.length;
          
          // Bonus for multi-word phrases (like "fast food")
          if (keyword.includes(' ')) {
            score += 20; // Significant bonus for phrases
          }
          
          // Bonus for exact word boundaries (whole word match)
          const wordBoundaryRegex = new RegExp(`\\b${keyword.replace(/\s+/g, '\\s+')}\\b`, 'i');
          if (wordBoundaryRegex.test(lowerQuery)) {
            score += 10;
          }
          
          matches.push({
            category: category.category_name,
            keyword: keyword,
            score: score
          });
          console.log(`🔍 VenueLookup: Found match "${category.category_name}" for keyword "${keyword}" (score: ${score})`);
        }
      }
    }
    
    if (matches.length === 0) {
      console.log(`❌ VenueLookup: No category detected for query "${lowerQuery}"`);
      return null;
    }
    
    // Sort by score (highest first) and return the best match
    matches.sort((a, b) => b.score - a.score);
    const bestMatch = matches[0];
    
    console.log(`✅ VenueLookup: Best category "${bestMatch.category}" for keyword "${bestMatch.keyword}" (score: ${bestMatch.score})`);
    if (matches.length > 1) {
      console.log(`🔍 VenueLookup: Other matches:`, matches.slice(1).map(m => `${m.category}(${m.keyword}:${m.score})`).join(', '));
    }
    
    return bestMatch.category;
  }

  /**
   * Get venues by category with caching
   */
  async getVenuesByCategory(category: string): Promise<Venue[]> {
    console.log(`🔍 VenueLookup: Getting venues for category "${category}"`);
    
    // Check cache first
    if (this.venueCache.has(category) && 
        (Date.now() - this.lastCacheUpdate) < this.CACHE_DURATION) {
      const cachedVenues = this.venueCache.get(category)!;
      console.log(`🚀 Cache hit for category: ${category} - ${cachedVenues.length} venues cached`);
      if (cachedVenues.length > 0) {
        console.log(`📋 Cached venues: ${cachedVenues.map(v => v.name).join(', ')}`);
      }
      return cachedVenues;
    }

    try {
      console.log(`📡 VenueLookup: Querying database for category "${category}"`);
      const { data, error } = await this.supabase
        .from('nearby_venues')
        .select('*')
        .eq('category', category)
        .order('distance_miles')
        .limit(5); // Top 5 closest venues

      if (error) {
        console.error(`❌ Database error for category ${category}:`, error);
        throw error;
      }

      const venues = data || [];
      this.venueCache.set(category, venues);
      this.lastCacheUpdate = Date.now();
      
      console.log(`✅ Loaded ${venues.length} venues for category: ${category}`, venues.map(v => v.name));
      return venues;
    } catch (error) {
      console.error(`❌ Failed to load venues for category ${category}:`, error);
      return [];
    }
  }

  /**
   * Get formatted venue list for Harper's response
   */
  async formatVenuesForResponse(category: string, maxLength = 250): Promise<string> {
    const venues = await this.getVenuesByCategory(category);
    
    if (venues.length === 0) {
      return `No ${category} found nearby. Check with organizers for recommendations.`;
    }

    let response = `${category.charAt(0).toUpperCase() + category.slice(1)} near convention center:\n`;
    let currentLength = response.length;

    for (const venue of venues.slice(0, 3)) { // Max 3 venues to stay under character limit
      const priceIndicator = '$'.repeat(venue.price_level || 1);
      const venueText = `• ${venue.name} (${venue.walk_time_minutes}min, ${priceIndicator})\n`;
      
      if (currentLength + venueText.length > maxLength) break;
      
      response += venueText;
      currentLength += venueText.length;
    }

    return response.trim();
  }

  /**
   * Smart venue lookup based on query
   */
  async handleVenueQuery(query: string): Promise<string | null> {
    const category = this.detectCategory(query);
    
    if (!category) {
      return null; // No venue category detected
    }

    console.log(`🔍 Detected venue category: ${category} from query: "${query}"`);
    return await this.formatVenuesForResponse(category);
  }

  /**
   * Get all available categories
   */
  getAvailableCategories(): string[] {
    return this.categoryCache.map(c => c.category_name);
  }

  /**
   * Refresh cache manually
   */
  async refreshCache() {
    this.venueCache.clear();
    this.lastCacheUpdate = 0;
    await this.loadCategories();
    console.log('🔄 Venue cache refreshed');
  }

  /**
   * Clear cache for testing
   */
  clearCache() {
    this.venueCache.clear();
    this.lastCacheUpdate = 0;
    console.log('🗑️ Venue cache cleared');
  }
}