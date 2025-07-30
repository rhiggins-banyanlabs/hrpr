import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { LocationService, Place } from './location.service';
import { VenueLookupService } from './venue-lookup.service';

interface CachedLocation {
  id: string;
  query_type: string;
  query_keyword: string;
  query_radius: number;
  places: Place[];
  created_at: string;
  expires_at: string;
}

interface LocationQuery {
  type?: string;
  keyword?: string;
  radius: number;
}

interface VenueData {
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
  price_level?: number;
  hours_summary?: string;
}

interface VenueToPlaceConverter {
  convertVenuesToPlaces(venues: VenueData[]): Place[];
}

export class LocationCacheService {
  private static instance: LocationCacheService;
  private supabase: SupabaseClient;
  private memoryCache: Map<string, { data: Place[], expires: number }> = new Map();
  private readonly CACHE_DURATION_HOURS = 24 * 7; // Cache for 7 days
  private readonly MEMORY_CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes in memory

  private constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  static getInstance(): LocationCacheService {
    if (!LocationCacheService.instance) {
      LocationCacheService.instance = new LocationCacheService();
    }
    return LocationCacheService.instance;
  }

  /**
   * Generate a cache key for the query
   */
  private generateCacheKey(query: LocationQuery): string {
    return `${query.type || 'any'}_${query.keyword || 'any'}_${query.radius}`;
  }

  /**
   * Check memory cache first (fastest)
   */
  private checkMemoryCache(cacheKey: string): Place[] | null {
    const cached = this.memoryCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      console.log(`⚡ Memory cache hit for: ${cacheKey}`);
      return cached.data;
    }
    return null;
  }

  /**
   * Check database cache
   */
  private async checkDatabaseCache(query: LocationQuery): Promise<Place[] | null> {
    try {
      const { data, error } = await this.supabase
        .from('location_cache')
        .select('*')
        .eq('query_type', query.type || 'any')
        .eq('query_keyword', query.keyword || 'any')
        .eq('query_radius', query.radius)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !data) {
        return null;
      }

      console.log(`💾 Database cache hit for: ${this.generateCacheKey(query)}`);
      
      // Update memory cache
      const cacheKey = this.generateCacheKey(query);
      this.memoryCache.set(cacheKey, {
        data: data.places,
        expires: Date.now() + this.MEMORY_CACHE_DURATION_MS
      });

      return data.places;
    } catch (error) {
      console.error('Error checking database cache:', error);
      return null;
    }
  }

  /**
   * Save to location_cache database
   */
  private async saveToCache(query: LocationQuery, places: Place[]): Promise<void> {
    const cacheKey = this.generateCacheKey(query);
    
    console.log(`💾 Attempting to save to location_cache database: ${cacheKey} with ${places.length} places`);

    // Save to location_cache database
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + this.CACHE_DURATION_HOURS * 60 * 60 * 1000);

      const dataToSave = {
        query_type: query.type || 'any',
        query_keyword: query.keyword || 'any',
        query_radius: query.radius,
        places: places,
        created_at: now.toISOString(),
        expires_at: expiresAt.toISOString()
      };
      
      console.log(`💾 Saving to database with data:`, {
        query_type: dataToSave.query_type,
        query_keyword: dataToSave.query_keyword,
        query_radius: dataToSave.query_radius,
        places_count: places.length,
        expires_at: dataToSave.expires_at
      });

      const { error } = await this.supabase
        .from('location_cache')
        .upsert(dataToSave, {
          onConflict: 'query_type,query_keyword,query_radius'
        });

      if (error) {
        console.error('❌ Error saving to cache:', error);
      } else {
        console.log(`✅ Successfully saved to database cache: ${cacheKey}`);
      }
    } catch (error) {
      console.error('❌ Exception saving to cache:', error);
    }
  }

  /**
   * Convert scraped venue data to Place format
   */
  private convertVenueToPlace(venue: VenueData): Place {
    return {
      name: venue.name,
      vicinity: venue.address || 'Denver, CO',
      geometry: {
        location: {
          lat: venue.latitude || 39.7432,
          lng: venue.longitude || -104.9959
        }
      },
      rating: venue.rating,
      price_level: venue.price_level,
      opening_hours: venue.hours_summary ? {
        open_now: true // We don't have real-time data, so assume open
      } : undefined
    };
  }

  /**
   * Check scraped venue data first
   */
  private async checkScrapedData(keyword?: string): Promise<Place[] | null> {
    try {
      // Try to get VenueLookupService instance
      const venueLookup = await VenueLookupService.getInstance();
      
      if (keyword && venueLookup) {
        const category = venueLookup.detectCategory(keyword);
        
        if (category) {
          console.log(`📊 Checking scraped data for category: ${category}`);
          const venues = await venueLookup.getVenuesByCategory(category);
          
          if (venues && venues.length > 0) {
            console.log(`✅ Found ${venues.length} venues in scraped data`);
            return venues.map(v => this.convertVenueToPlace(v));
          }
        }
      }
    } catch (error) {
      console.log('⚠️ Could not check scraped data:', error);
    }
    
    return null;
  }

  /**
   * Search with tiered lookup: scraped data → cache → Google Maps API
   */
  async searchPlaces(
    locationService: LocationService,
    type?: string,
    keyword?: string,
    radius: number = 1500
  ): Promise<Place[]> {
    const query: LocationQuery = { type, keyword, radius };
    const cacheKey = this.generateCacheKey(query);

    console.log(`🔍 Location search: type=${type}, keyword=${keyword}, radius=${radius}`);

    // Step 1: Check scraped venue database first (nearby_venues table)
    if (keyword) {
      const scrapedData = await this.checkScrapedData(keyword);
      if (scrapedData && scrapedData.length > 0) {
        console.log(`✅ Found ${scrapedData.length} places in scraped venue database`);
        return scrapedData;
      }
    }
    console.log(`⚠️ No scraped venue data found, checking location_cache...`);

    // Step 2: Check location_cache database
    const dbResult = await this.checkDatabaseCache(query);
    if (dbResult) {
      console.log(`✅ Found ${dbResult.length} places in location_cache database`);
      return dbResult;
    }
    console.log(`⚠️ No cached data found, calling Google Maps API...`);

    // Step 3: Call Google Maps API → Save to location_cache
    const places = await this.callGoogleMapsAPI(type, keyword, radius);
    
    // Save the results to location_cache database
    if (places.length > 0) {
      console.log(`💾 Saving ${places.length} places to location_cache database...`);
      await this.saveToCache(query, places);
    } else {
      console.log(`⚠️ No places returned from Google Maps API`);
    }

    return places;
  }

  /**
   * Call Google Maps API directly (bypassing LocationService to avoid circular dependency)
   */
  private async callGoogleMapsAPI(type?: string, keyword?: string, radius: number = 1500): Promise<Place[]> {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error('❌ Google Maps API key not found');
      return [];
    }

    const CONFERENCE_VENUE = {
      lat: 39.7432,
      lng: -104.9959
    };

    try {
      const params = new URLSearchParams({
        location: `${CONFERENCE_VENUE.lat},${CONFERENCE_VENUE.lng}`,
        radius: radius.toString(),
        key: apiKey
      });

      if (type) {
        params.append('type', type);
      }

      if (keyword) {
        params.append('keyword', keyword);
      }

      console.log(`🗺️ Direct Google Maps API call: ${params.toString()}`);

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params.toString()}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(5000)
        }
      );

      if (!response.ok) {
        throw new Error(`Google Maps API error: ${response.status}`);
      }

      const data = await response.json();
      console.log(`📍 Google Maps returned ${data.results?.length || 0} places`);
      
      return data.results || [];

    } catch (error) {
      console.error('❌ Error calling Google Maps API:', error);
      return [];
    }
  }

  /**
   * Clear expired cache entries (maintenance task)
   */
  async clearExpiredCache(): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('location_cache')
        .delete()
        .lt('expires_at', new Date().toISOString());

      if (!error) {
        console.log('🧹 Cleared expired cache entries');
      }
    } catch (error) {
      console.error('Error clearing expired cache:', error);
    }
  }

  /**
   * Preload common queries into cache
   */
  async preloadCommonQueries(locationService: LocationService): Promise<void> {
    const commonQueries = [
      { type: 'restaurant', radius: 1500 },
      { type: 'cafe', radius: 1000 },
      { type: 'hotel', radius: 3000 },
      { type: 'pharmacy', radius: 2000 },
      { type: 'bank', radius: 1500 },
      { keyword: 'fast food', type: 'restaurant', radius: 2000 }
    ];

    console.log('📦 Preloading common location queries...');
    
    for (const query of commonQueries) {
      try {
        await this.searchPlaces(locationService, query.type, query.keyword, query.radius);
      } catch (error) {
        console.error(`Failed to preload query ${JSON.stringify(query)}:`, error);
      }
    }
    
    console.log('✅ Common queries preloaded');
  }
}