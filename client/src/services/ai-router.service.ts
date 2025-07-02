// src/services/ai-router.service.ts - PROPERLY INTEGRATED with useGoogleMaps hook
import { AIRouterResponse, Strategy, LogEntry } from "@/types/ai-router.types";
import { LoggerService } from "./logger.service";
import { ProviderFactory } from "./providers/provider-factory.service";
import { CacheService } from "./cache.service";
import { ConferenceStorageService } from '@/lib/supabase/chatStorage';
import {
  getStrategyOrder,
  calculateProviderCost,
  PROVIDER_COSTS_DETAILED,
} from "@/config/ai-providers.config";

interface Speaker {
  id: string;
  name: string;
  title: string;
  company: string;
  bio?: string;
  image?: string;
}

interface Session {
  id: string;
  title: string;
  description?: string;
  time: string;
  speaker: string;
  location?: string;
  type?: string;
}

// Import types from your Google Maps types
interface Place {
  name: string;
  vicinity: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  opening_hours?: {
    open_now?: boolean;
  };
}

export class AIRouterService {
  private logger: LoggerService;
  private speakers: Speaker[] = [];
  private sessions: Session[] = [];
  private lastDataFetch: number = 0;
  private dataFreshDuration: number = 5 * 60 * 1000; // 5 minutes
  
  // Conference locations matching your useGoogleMaps hook
  private readonly DENVER_COORDINATES = { lat: 39.7392, lng: -104.9903 };
  private readonly CONFERENCE_VENUE = { 
    lat: 39.7432,
    lng: -104.9959, 
    name: 'Denver Convention Center',
    address: '700 14th St, Denver, CO 80202',
    placeId: 'ChIJhx9-ra97bIcRqFJmfNLB4ps'
  };
  private readonly HOST_HOTEL = {
    lat: 39.7435,
    lng: -104.9954,
    name: 'Hyatt Regency Denver (Host Hotel)',
    address: '650 15th St, Denver, CO 80202',
    placeId: 'ChIJ2f_jrK97bIcR8Cw1hFwbESo'
  };

  constructor() {
    this.logger = new LoggerService();
  }

  /**
   * Detect location intent matching your useGoogleMaps hook patterns
   */
  private detectLocationIntent(text: string): { 
    hasLocationIntent: boolean; 
    type?: string; 
    keyword?: string;
    radius?: number;
  } | null {
    const lowerText = text.toLowerCase();
    
    console.log(`🔍 Location intent detection for: "${text}" - FUNCTION CALLED - VERSION 2`);
    
    // Conference-specific locations
    if (lowerText.includes('convention center') || lowerText.includes('conference venue') || 
        lowerText.includes('event location')) {
      console.log(`📍 Detected: convention center`);
      return { hasLocationIntent: true, keyword: 'convention center' };
    }
    
    if (lowerText.includes('hyatt') || lowerText.includes('host hotel') || 
        (lowerText.includes('hotel') && lowerText.includes('stay'))) {
      console.log(`📍 Detected: host hotel`);
      return { hasLocationIntent: true, keyword: 'hyatt regency denver' };
    }
    
    // Food & restaurant queries with cuisine detection
    const cuisineTypes = [
      'sushi', 'pizza', 'burger', 'italian', 'mexican', 'chinese', 'thai', 
      'indian', 'bbq', 'steak', 'seafood', 'vegetarian', 'vegan', 'gluten-free'
    ];
    
    for (const cuisine of cuisineTypes) {
      if (lowerText.includes(cuisine)) {
        return {
          hasLocationIntent: true,
          type: 'restaurant',
          keyword: cuisine,
          radius: 2000
        };
      }
    }
    
    // Location patterns from your hook - ORDER MATTERS! More specific patterns first
    const fastFoodPattern = /fast.?food|mcdonald|burger.?king|wendy|subway|taco.?bell|kfc|pizza.?hut|domino/i;
    const restaurantPattern = /restaurant|food|eat|dinner|lunch|breakfast/i;
    const cafePattern = /coffee|cafe|espresso|tea/i;
    const hotelPattern = /hotel|stay|accommodation|room|sleep/i;
    const barPattern = /bar|drink|pub|alcohol|beer|wine/i;
    const attractionPattern = /attraction|visit|sightseeing|tour/i;
    const shoppingPattern = /shopping|mall|store|retail|shop/i;
    const gasPattern = /gas|gasoline|fuel|petrol|station/i;
    const parkPattern = /park|playground|recreation|outdoor/i;
    const pharmacyPattern = /pharmacy|drugstore|cvs|walgreens|rite.?aid|medicine/i;
    const bankPattern = /bank|atm|credit.?union|financial/i;
    const gymPattern = /gym|fitness|workout|exercise/i;
    const nearbyPattern = /nearby|close|walking distance|near/i;
    
    // Debug pattern matching
    console.log(`🔍 Testing fast food pattern: "${lowerText}" matches ${fastFoodPattern.test(lowerText)}`);
    console.log(`🔍 Pattern: ${fastFoodPattern}`);
    console.log(`🔍 About to test fast food if statement...`);
    console.log(`🔍 Reached the point before fast food if statement`);
    
    // TEST FAST FOOD FIRST (before restaurant pattern catches it)
    console.log(`🔍 Testing if statement now...`);
    if (fastFoodPattern.test(lowerText)) {
      console.log(`🍔 Detected: fast food pattern - ENTERING FAST FOOD BLOCK - VERSION 2`);
      // Extract specific fast food chains or use general fast food search
      let keyword = 'fast food';
      
      // Check for specific chains first
      const specificChains = ['mcdonalds', 'burger king', 'wendys', 'subway', 'taco bell', 'kfc', 'pizza hut', 'dominos'];
      for (const chain of specificChains) {
        if (lowerText.includes(chain)) {
          keyword = chain;
          console.log(`🍔 Found specific chain: ${chain}`);
          break;
        }
      }
      
      console.log(`🍔 Fast food search: type=restaurant, keyword=${keyword}`);
      return { 
        hasLocationIntent: true,
        type: 'restaurant', 
        keyword: keyword,
        radius: nearbyPattern.test(lowerText) ? 1500 : 3000 
      };
    }
    
    if (restaurantPattern.test(lowerText)) {
      return { 
        hasLocationIntent: true,
        type: 'restaurant', 
        radius: nearbyPattern.test(lowerText) ? 800 : 2000 
      };
    }
    
    if (cafePattern.test(lowerText)) {
      return { 
        hasLocationIntent: true,
        type: 'cafe', 
        radius: nearbyPattern.test(lowerText) ? 600 : 1500 
      };
    }
    
    if (hotelPattern.test(lowerText) && !lowerText.includes('host hotel')) {
      return { 
        hasLocationIntent: true,
        type: 'lodging', 
        radius: 3000 
      };
    }
    
    if (barPattern.test(lowerText)) {
      return { 
        hasLocationIntent: true,
        type: 'bar', 
        radius: nearbyPattern.test(lowerText) ? 800 : 2000 
      };
    }
    
    if (attractionPattern.test(lowerText)) {
      return { 
        hasLocationIntent: true,
        type: 'tourist_attraction', 
        radius: 5000 
      };
    }
    
    if (shoppingPattern.test(lowerText)) {
      return { 
        hasLocationIntent: true,
        type: 'shopping_mall', 
        radius: nearbyPattern.test(lowerText) ? 2000 : 5000 
      };
    }
    
    if (gasPattern.test(lowerText)) {
      return { 
        hasLocationIntent: true,
        type: 'gas_station', 
        radius: nearbyPattern.test(lowerText) ? 3000 : 8000 
      };
    }
    
    if (parkPattern.test(lowerText)) {
      return { 
        hasLocationIntent: true,
        type: 'park', 
        radius: nearbyPattern.test(lowerText) ? 2000 : 5000 
      };
    }
    
    if (pharmacyPattern.test(lowerText)) {
      return { 
        hasLocationIntent: true,
        type: 'pharmacy', 
        radius: nearbyPattern.test(lowerText) ? 1500 : 3000 
      };
    }
    
    if (bankPattern.test(lowerText)) {
      return { 
        hasLocationIntent: true,
        type: 'bank', 
        radius: nearbyPattern.test(lowerText) ? 1500 : 3000 
      };
    }
    
    if (gymPattern.test(lowerText)) {
      return { 
        hasLocationIntent: true,
        type: 'gym', 
        radius: nearbyPattern.test(lowerText) ? 2000 : 5000 
      };
    }
    
    // General location queries
    if (lowerText.includes('where is') || lowerText.includes('how do i get to') || 
        lowerText.includes('directions to') || lowerText.includes('find on map')) {
      return { hasLocationIntent: true };
    }
    
    // Catch-all for any location-related queries with "nearby" or "close"
    // Only trigger if it contains "nearby" AND one of these generic location words
    if (nearbyPattern.test(lowerText) && (
        lowerText.includes('place') || lowerText.includes('thing') || 
        lowerText.includes('spot') || lowerText.includes('area') ||
        lowerText.includes('around') || lowerText.includes('here')
    )) {
      return { 
        hasLocationIntent: true,
        type: 'establishment', // General search for any nearby places
        radius: 2000 
      };
    }
    
    // Final catch-all for any query with "nearby" that didn't match specific patterns
    if (nearbyPattern.test(lowerText)) {
      console.log(`📍 Detected: general nearby catch-all`);
      return { 
        hasLocationIntent: true,
        type: 'establishment', // General search for any nearby places
        radius: 2000 
      };
    }
    
    console.log(`❌ No location intent detected`);
    return null;
  }

  /**
   * Search for nearby places using Google Maps API (server-side)
   */
  private async searchNearbyPlaces(
    type?: string, 
    keyword?: string, 
    radius: number = 1500
  ): Promise<Place[]> {
    try {
      // Direct Google Maps API call from server
      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        console.warn('⚠️ Google Maps API key not configured');
        return [];
      }

      const params = new URLSearchParams({
        location: `${this.CONFERENCE_VENUE.lat},${this.CONFERENCE_VENUE.lng}`,
        radius: radius.toString(),
        key: apiKey
      });
      
      if (type) {
        params.append('type', type);
      }
      
      if (keyword) {
        params.append('keyword', keyword);
      }

      console.log(`🗺️ Searching for places: type=${type}, keyword=${keyword}, radius=${radius}`);

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params.toString()}`
      );
      
      if (response.ok) {
        const data = await response.json();
        console.log(`📍 Found ${data.results?.length || 0} places`);
        
        // For fast food searches, if we don't get good results, try a broader search
        if (keyword === 'fast food' && (data.results?.length || 0) < 3) {
          console.log(`🔄 Fast food search returned few results, trying broader restaurant search...`);
          
          // Try a broader search without the fast food keyword
          const broaderParams = new URLSearchParams({
            location: `${this.CONFERENCE_VENUE.lat},${this.CONFERENCE_VENUE.lng}`,
            radius: radius.toString(),
            type: 'restaurant',
            key: apiKey
          });
          
          const broaderResponse = await fetch(
            `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${broaderParams.toString()}`
          );
          
          if (broaderResponse.ok) {
            const broaderData = await broaderResponse.json();
            console.log(`📍 Broader search found ${broaderData.results?.length || 0} restaurants`);
            
                         // Filter for fast food-like places (lower price levels, common fast food names)
             const fastFoodKeywords = ['mcdonalds', 'burger king', 'wendys', 'subway', 'taco bell', 'kfc', 'pizza hut', 'dominos', 'chipotle', 'panera', 'starbucks'];
             const fastFoodPlaces = broaderData.results?.filter((place: any) => {
               const name = place.name?.toLowerCase() || '';
               const isFastFood = fastFoodKeywords.some(keyword => name.includes(keyword));
               const isLowPrice = place.price_level !== undefined && place.price_level <= 2;
               return isFastFood || isLowPrice;
             }) || [];
            
            console.log(`🍔 Filtered to ${fastFoodPlaces.length} fast food places`);
            return fastFoodPlaces;
          }
        }
        
        return data.results || [];
      }
      
      console.error('❌ Failed to fetch places:', response.status, response.statusText);
      return [];
    } catch (error) {
      console.error('❌ Error searching nearby places:', error);
      return [];
    }
  }

  /**
   * Calculate walking distance and time between two points
   */
  private calculateWalkingDistance(lat1: number, lng1: number, lat2: number, lng2: number): {
    distance: string;
    walkingTime: string;
  } {
    const R = 3959; // Radius of Earth in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distanceMiles = R * c;
    
    // Convert to appropriate unit
    let distance: string;
    if (distanceMiles < 0.2) {
      distance = `${Math.round(distanceMiles * 5280)} feet`;
    } else {
      distance = `${distanceMiles.toFixed(1)} miles`;
    }
    
    // Estimate walking time (avg 3 mph walking speed)
    const walkingMinutes = Math.round(distanceMiles * 20);
    const walkingTime = walkingMinutes < 1 ? "less than a minute" : `${walkingMinutes} min walk`;
    
    return { distance, walkingTime };
  }

  /**
   * Fetch fresh conference data from Supabase
   */
  private async ensureConferenceData(): Promise<void> {
    const now = Date.now();
    
    if (now - this.lastDataFetch < this.dataFreshDuration && this.speakers.length > 0) {
      return;
    }

    try {
      console.log('🔄 Fetching fresh conference data for AI routing...');
      
      const [speakersResult, sessionsResult] = await Promise.all([
        ConferenceStorageService.getAllSpeakers(),
        ConferenceStorageService.getAllSessions()
      ]);

      this.speakers = speakersResult || [];
      this.sessions = sessionsResult || [];
      this.lastDataFetch = now;

      console.log(`✅ AI Router loaded ${this.speakers.length} speakers and ${this.sessions.length} sessions`);
      
      // Debug: Show first session data
      if (this.sessions.length > 0) {
        console.log('🔍 First session data:', JSON.stringify(this.sessions[0], null, 2));
      }
      
    } catch (error) {
      console.error('❌ Error fetching conference data for AI router:', error);
      this.speakers = [];
      this.sessions = [];
    }
  }

  /**
   * Enhanced prompt creation with Google Maps data
   */
  private async createEnhancedPrompt(originalPrompt: string): Promise<string> {
    await this.ensureConferenceData();

    let enhancedPrompt = originalPrompt;

    // Add conference data
    if (this.speakers.length > 0 || this.sessions.length > 0) {
      enhancedPrompt += '\n\nCONFERENCE INFORMATION:';
      
      if (this.speakers.length > 0) {
        enhancedPrompt += '\nSPEAKERS:';
        this.speakers.forEach(s => {
          enhancedPrompt += `\n- ${s.name} (${s.title}${s.company ? ` at ${s.company}` : ''})`;
        });
      }
      
      if (this.sessions.length > 0) {
        enhancedPrompt += '\n\nSCHEDULE:';
        this.sessions.forEach(session => {
          // Debug the time format
          console.log(`🔍 Session time debug: "${session.time}" (type: ${typeof session.time})`);
          
          let startTime = 'Unknown Time';
          try {
            // Try different date parsing approaches
            const date = new Date(session.time);
            if (!isNaN(date.getTime())) {
              startTime = date.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              });
            } else {
              // If it's not a valid date, try parsing as time string
              startTime = session.time || 'Unknown Time';
            }
          } catch (error) {
            console.error('❌ Error parsing session time:', error);
            startTime = session.time || 'Unknown Time';
          }
          
          enhancedPrompt += `\n- ${startTime}: ${session.title} by ${session.speaker}${session.location ? ` in ${session.location}` : ''}`;
        });
      }
    }

    // Add location data if query is location-related
    const locationIntent = this.detectLocationIntent(originalPrompt);
    if (locationIntent?.hasLocationIntent) {
      enhancedPrompt += `\n\nLOCATION INFORMATION:`;
      enhancedPrompt += `\n- Conference Venue: ${this.CONFERENCE_VENUE.name} at ${this.CONFERENCE_VENUE.address}`;
      enhancedPrompt += `\n- Host Hotel: ${this.HOST_HOTEL.name} at ${this.HOST_HOTEL.address}`;
      enhancedPrompt += `\n- Distance between venue and hotel: 2-minute walk (0.1 miles)`;

      // Search for specific places if requested
      if (locationIntent.type || locationIntent.keyword) {
        const places = await this.searchNearbyPlaces(
          locationIntent.type,
          locationIntent.keyword,
          locationIntent.radius
        );

        if (places.length > 0) {
          enhancedPrompt += `\n\nNEARBY ${locationIntent.type?.toUpperCase() || 'PLACES'}:`;
          
          // Limit to top 5 places
          places.slice(0, 5).forEach(place => {
            const { distance, walkingTime } = this.calculateWalkingDistance(
              this.CONFERENCE_VENUE.lat,
              this.CONFERENCE_VENUE.lng,
              place.geometry.location.lat,
              place.geometry.location.lng
            );

            enhancedPrompt += `\n- ${place.name}`;
            if (place.vicinity) enhancedPrompt += ` (${place.vicinity})`;
            enhancedPrompt += ` - ${walkingTime}`;
            if (place.rating) enhancedPrompt += ` - Rating: ${place.rating}/5`;
            if (place.price_level !== undefined) {
              const priceSymbol = '$'.repeat(place.price_level + 1);
              enhancedPrompt += ` - Price: ${priceSymbol}`;
            }
            if (place.opening_hours?.open_now !== undefined) {
              enhancedPrompt += place.opening_hours.open_now ? ' - Open now' : ' - Currently closed';
            }
          });
        } else {
          // Fallback when no Google Maps data available
          enhancedPrompt += `\n\nNOTE: Real-time location data is currently unavailable. The Denver downtown area has many restaurants and cafes within walking distance of the convention center. Popular nearby areas include the 16th Street Mall (3 blocks away) with numerous dining options.`;
        }
      }
    }

    enhancedPrompt += '\n\nCRITICAL INSTRUCTIONS:';
    enhancedPrompt += '\n- You MUST use the conference information provided above';
    enhancedPrompt += '\n- You have real speaker and session data - use it!';
    enhancedPrompt += '\n- Do NOT say "schedule unavailable" or "contact organizers" if you have real data';
    enhancedPrompt += '\n- List the actual sessions and speakers from the data provided';
    enhancedPrompt += '\n- If you have session data, tell the user about the real sessions';
    enhancedPrompt += '\n- If you have speaker data, mention the real speakers';
    enhancedPrompt += '\n- Only suggest contacting organizers if you truly have no data';
    
    // Force AI to use Google Maps data for location queries
    if (locationIntent?.hasLocationIntent && locationIntent.type) {
      enhancedPrompt += '\n\nLOCATION QUERY INSTRUCTIONS:';
      enhancedPrompt += '\n- You MUST use the Google Maps data provided above';
      enhancedPrompt += '\n- You have real nearby places data - use the specific places listed!';
      enhancedPrompt += '\n- Do NOT say "no places found" or "contact organizers" if you have Google Maps data';
      enhancedPrompt += '\n- List the actual places from the Google Maps data provided';
      enhancedPrompt += '\n- Include walking distances, ratings, and prices from the data';
      enhancedPrompt += '\n- If you have Google Maps data, tell the user about the real nearby places';
      enhancedPrompt += '\n- Only suggest contacting organizers if you truly have no location data';
    }

    return enhancedPrompt;
  }

  async routeRequest(
    prompt: string,
    strategy: Strategy,
  ): Promise<AIRouterResponse> {
    console.log(`[AI Router] Strategy: ${strategy}, Prompt: ${prompt.substring(0, 50)}...`);
    const startTime = Date.now();

    // Check for instant responses first
    const instantResponse = CacheService.getInstantResponse(prompt);
    if (instantResponse) {
      const duration = Date.now() - startTime;
      console.log(`⚡ INSTANT RESPONSE TIME: ${duration}ms`);
      
      this.logger.addSuccessLog(
        'instant-cache',
        duration,
        0,
        strategy
      );

      return {
        provider: 'instant-cache',
        response: instantResponse,
        logs: this.logger.getLogs(),
        strategy,
        cost: 0,
        tokensUsed: {
          input: 0,
          output: 0,
          total: 0,
        },
        cached: true,
        instantResponse: true,
        responseTime: duration,
        optimizations: ['instant-response']
      };
    }

    // Check response cache (but skip for location queries to ensure fresh data)
    const locationIntent = this.detectLocationIntent(prompt);
    const isLocationQuery = locationIntent?.hasLocationIntent;
    
    const cachedResult = CacheService.getCachedResponse(prompt, strategy);
    if (cachedResult && !isLocationQuery) {
      const duration = Date.now() - startTime;
      const cacheAge = Math.round((Date.now() - cachedResult.timestamp) / 1000);
      console.log(`🚀 CACHE HIT! Response time: ${duration}ms, Age: ${cacheAge}s`);
      
      this.logger.addSuccessLog(
        `${cachedResult.provider}-cached`,
        duration,
        cachedResult.cost ? (cachedResult.cost * 1000) : 0,
        strategy
      );

      return {
        provider: `${cachedResult.provider}-cached`,
        response: cachedResult.response,
        logs: this.logger.getLogs(),
        strategy,
        cost: cachedResult.cost || 0,
        tokensUsed: cachedResult.tokensUsed || {
          input: 0,
          output: 0,
          total: 0,
        },
        cached: true,
        cacheHit: true,
        cacheAge,
        responseTime: duration,
        optimizations: ['response-cache']
      };
    }
    
    if (isLocationQuery && cachedResult) {
      console.log(`🗺️ Skipping cache for location query to ensure fresh Google Maps data`);
    }

    // Get optimized provider order
    const providerOrder = this.getOptimizedProviderOrder(strategy);
    console.log(`[AI Router] Provider order for ${strategy}:`, providerOrder);

    // Create enhanced prompt with conference and location data
    const enhancedPrompt = await this.createEnhancedPrompt(prompt);
    const hasEnhancements = enhancedPrompt !== prompt;
    const hasLocationData = this.detectLocationIntent(prompt)?.hasLocationIntent;

    // Debug: Log the enhanced prompt for conference questions
    if (prompt.toLowerCase().includes('schedule') || prompt.toLowerCase().includes('session')) {
      console.log('🔍 ENHANCED PROMPT FOR SCHEDULE QUESTION:');
      console.log('Original:', prompt);
      console.log('Enhanced:', enhancedPrompt.substring(0, 500) + '...');
      console.log('Has enhancements:', hasEnhancements);
      console.log('Speakers loaded:', this.speakers.length);
      console.log('Sessions loaded:', this.sessions.length);
    }
    
    // Debug: Log the enhanced prompt for location questions
    if (hasLocationData) {
      console.log('🗺️ ENHANCED PROMPT FOR LOCATION QUESTION:');
      console.log('Original:', prompt);
      console.log('Enhanced (FULL):', enhancedPrompt);
      console.log('Has location data:', hasLocationData);
      console.log('Location intent:', locationIntent);
    }

    // Estimate tokens
    const estimatedInputTokens = Math.ceil(enhancedPrompt.length / 4);
    const estimatedOutputTokens = this.getOptimizedOutputTokens(strategy, estimatedInputTokens);

    const failedProviders: string[] = [];
    const optimizations: string[] = [];

    // Track optimizations
    if (hasEnhancements) {
      optimizations.push('data-enhanced');
    }
    if (hasLocationData) {
      optimizations.push('google-maps-data');
    }

    // Try providers in order
    for (const providerName of providerOrder) {
      try {
        console.log(`[AI Router] Trying provider: ${providerName}`);
        
        const provider = ProviderFactory.getProvider(providerName);
        
        // Optimize prompt for strategy
        const optimizedPrompt = this.optimizePromptForStrategy(enhancedPrompt, strategy);
        if (optimizedPrompt !== enhancedPrompt) {
          optimizations.push('prompt-optimized');
        }

        const result = await provider.execute(optimizedPrompt);

        if (result.success && result.data) {
          const duration = Date.now() - startTime;

          const actualInputTokens = result.inputTokens || estimatedInputTokens;
          const actualOutputTokens = result.outputTokens || estimatedOutputTokens;
          const actualCost = calculateProviderCost(
            providerName as keyof typeof PROVIDER_COSTS_DETAILED,
            actualInputTokens,
            actualOutputTokens,
          );

          this.logger.addSuccessLog(
            provider.getName(),
            duration,
            actualCost,
            strategy
          );

          const response: AIRouterResponse = {
            provider: provider.getName(),
            response: result.data,
            logs: this.logger.getLogs(),
            strategy,
            cost: actualCost,
            tokensUsed: {
              input: actualInputTokens,
              output: actualOutputTokens,
              total: actualInputTokens + actualOutputTokens,
            },
            responseTime: duration,
            optimizations: optimizations.length > 0 ? optimizations : undefined
          };

          // Cache successful responses
          if (result.data && actualCost > 0) {
            CacheService.setCachedResponse(
              prompt,
              strategy,
              result.data,
              provider.getName(),
              actualCost,
              {
                input: actualInputTokens,
                output: actualOutputTokens,
                total: actualInputTokens + actualOutputTokens,
              },
              duration
            );
          }

          console.log(`✅ Success with ${provider.getName()} in ${duration}ms`);
          return response;
        } else {
          failedProviders.push(providerName);
          this.logger.addErrorLog(
            provider.getName(),
            result.error || "Unknown error",
            strategy,
          );
        }
      } catch (error) {
        failedProviders.push(providerName);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        this.logger.addErrorLog(providerName, errorMessage, strategy);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`❌ All providers failed after ${duration}ms`);

    return {
      logs: this.logger.getLogs(),
      strategy,
      error: `All providers failed. Tried: ${failedProviders.join(', ')}`,
      responseTime: duration
    };
  }

  /**
   * Get optimized provider order based on strategy
   */
  private getOptimizedProviderOrder(strategy: Strategy): string[] {
    const baseOrder = getStrategyOrder(strategy);
    
    if (strategy === 'cheap') {
      return baseOrder.sort((a, b) => {
        const costOrder = ['groq', 'openai', 'anthropic', 'google'];
        return costOrder.indexOf(a) - costOrder.indexOf(b);
      });
    }
    
    if (strategy === 'balanced') {
      return baseOrder.sort((a, b) => {
        const balancedOrder = ['openai', 'groq', 'anthropic', 'google'];
        return balancedOrder.indexOf(a) - balancedOrder.indexOf(b);
      });
    }
    
    return baseOrder;
  }

  /**
   * Get optimized output token limits
   */
  private getOptimizedOutputTokens(strategy: Strategy, inputTokens: number): number {
    switch (strategy) {
      case 'cheap':
        return Math.min(inputTokens * 1.5, 150);
      case 'balanced':
        return Math.min(inputTokens * 2, 250);
      case 'quality':
        return inputTokens * 3;
      default:
        return inputTokens * 2;
    }
  }

  /**
   * Optimize prompt for strategy
   */
  private optimizePromptForStrategy(prompt: string, strategy: Strategy): string {
    if (strategy === 'cheap') {
      return `${prompt}\n\nProvide a brief, direct response (under 200 characters).`;
    }
    
    if (strategy === 'balanced') {
      return `${prompt}\n\nProvide a helpful, concise response (under 300 characters).`;
    }
    
    return prompt;
  }

  /**
   * Preload common responses with real location data
   */
  async preloadCommonResponses(): Promise<void> {
    console.log('🔥 Preloading common conference responses...');
    
    await this.ensureConferenceData();
    
    // Basic venue/hotel responses
    CacheService.addInstantResponse('where is the venue', 
      `The Denver Convention Center is at ${this.CONFERENCE_VENUE.address}`);
    CacheService.addInstantResponse('where is the hotel', 
      `The Hyatt Regency Denver is at ${this.HOST_HOTEL.address}`);
    CacheService.addInstantResponse('how far is the hotel', 
      'The Hyatt Regency is just a 2-minute walk (0.1 miles) from the convention center.');
    
    // Conference data responses
    if (this.speakers.length > 0) {
      const speakerCount = this.speakers.length;
      const speakerNames = this.speakers.slice(0, 5).map(s => s.name).join(', ');
      const moreText = speakerCount > 5 ? ` and ${speakerCount - 5} more` : '';
      CacheService.addInstantResponse('who are the speakers', 
        `We have ${speakerCount} speakers including: ${speakerNames}${moreText}`);
    }
    
    if (this.sessions.length > 0) {
      CacheService.addInstantResponse('how many sessions', 
        `We have ${this.sessions.length} sessions scheduled.`);
      
      const firstSession = this.sessions.sort((a, b) => 
        new Date(a.time).getTime() - new Date(b.time).getTime()
      )[0];
      
      if (firstSession) {
        const startTime = new Date(firstSession.time).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        CacheService.addInstantResponse('when does it start', 
          `The first session "${firstSession.title}" starts at ${startTime}.`);
      }
    }

    // Preload some common nearby places for faster responses
    try {
      const restaurants = await this.searchNearbyPlaces('restaurant', '', 1000);
      if (restaurants.length > 0) {
        const nearbyCount = restaurants.length;
        const names = restaurants.slice(0, 3).map(r => r.name).join(', ');
        CacheService.addInstantResponse('restaurants nearby', 
          `There are ${nearbyCount} restaurants within walking distance including ${names}.`);
      }

      const coffeeShops = await this.searchNearbyPlaces('cafe', 'coffee', 800);
      if (coffeeShops.length > 0) {
        const names = coffeeShops.slice(0, 2).map(c => c.name).join(' and ');
        CacheService.addInstantResponse('coffee nearby', 
          `Nearby coffee shops include ${names}, both within a 5-minute walk.`);
      }
    } catch (error) {
      console.warn('⚠️ Could not preload nearby places:', error);
    }

    console.log(`🔥 Preloaded responses with ${this.speakers.length} speakers and ${this.sessions.length} sessions`);
  }

  // Other utility methods remain the same...
  async estimateCost(
    prompt: string,
    strategy: Strategy,
    expectedOutputRatio: number = 2,
  ): Promise<{ provider: string; estimatedCost: number; model: string; cached?: boolean; instantResponse?: boolean }[]> {
    const instantResponse = CacheService.getInstantResponse(prompt);
    const cachedResponse = CacheService.getCachedResponse(prompt, strategy);
    
    if (instantResponse) {
      return [{
        provider: 'instant-cache',
        estimatedCost: 0,
        model: 'keyword-matching',
        instantResponse: true
      }];
    }
    
    if (cachedResponse) {
      return [{
        provider: 'response-cache',
        estimatedCost: 0,
        model: 'cached-response',
        cached: true
      }];
    }

    const enhancedPrompt = await this.createEnhancedPrompt(prompt);
    const providerOrder = getStrategyOrder(strategy);
    const estimatedInputTokens = Math.ceil(enhancedPrompt.length / 4);
    const estimatedOutputTokens = this.getOptimizedOutputTokens(strategy, estimatedInputTokens);

    return providerOrder
      .map((providerName) => {
        const cost = calculateProviderCost(
          providerName as keyof typeof PROVIDER_COSTS_DETAILED,
          estimatedInputTokens,
          estimatedOutputTokens,
        );

        return {
          provider: providerName,
          estimatedCost: cost,
          model: PROVIDER_COSTS_DETAILED[
            providerName as keyof typeof PROVIDER_COSTS_DETAILED
          ].model,
          cached: false,
          instantResponse: false
        };
      })
      .sort((a, b) => a.estimatedCost - b.estimatedCost);
  }

  getProviderStatus(): Array<{
    provider: string;
    available: boolean;
    model: string;
    inputCostPer1M: number;
    outputCostPer1M: number;
    cacheStats?: any;
  }> {
    const availableProviders = getStrategyOrder("balanced");
    const cacheStats = CacheService.getCacheStats();

    const providers = Object.entries(PROVIDER_COSTS_DETAILED).map(
      ([provider, config]) => ({
        provider,
        available: availableProviders.includes(provider),
        model: (config as any).model,
        inputCostPer1M: (config as any).input,
        outputCostPer1M: (config as any).output,
      }),
    );

    const cacheSystemEntry = {
      provider: 'cache-system',
      available: true,
      model: 'instant + 5min cache',
      inputCostPer1M: 0,
      outputCostPer1M: 0,
      cacheStats
    } as any;

    providers.unshift(cacheSystemEntry);

    return providers;
  }

  clearCache(): void {
    CacheService.clearCache();
    console.log('🗑️ AI Router cache cleared');
  }

  getCacheStats() {
    return CacheService.getCacheStats();
  }

  getPerformanceMetrics() {
    return CacheService.getPerformanceMetrics();
  }

  getConferenceDataStatus() {
    return {
      speakers: this.speakers.length,
      sessions: this.sessions.length,
      lastFetch: new Date(this.lastDataFetch).toISOString(),
      dataAge: Date.now() - this.lastDataFetch,
      isStale: (Date.now() - this.lastDataFetch) > this.dataFreshDuration,
      googleMapsEnabled: !!process.env.GOOGLE_MAPS_API_KEY,
      venueLocation: this.CONFERENCE_VENUE,
      hotelLocation: this.HOST_HOTEL
    };
  }

  async refreshConferenceData(): Promise<void> {
    this.lastDataFetch = 0;
    await this.ensureConferenceData();
    console.log('🔄 Conference data refreshed in AI Router');
  }
}