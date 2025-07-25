// src/services/prompt-enhancement.service.ts
import { Strategy } from "@/types/ai-router.types";
import { ConferenceDataService } from "./conference-data.service";
import { LocationService } from "./location.service";
import { VenueLookupService } from "./venue-lookup.service";
import { IntentDetectorService } from "./intent-detector.service";
import { LocationCacheService } from "./location-cache.service";

export class PromptEnhancementService {
  private venueLookup: VenueLookupService | null = null;
  private venueLookupInitialized = false;
  private locationCache: LocationCacheService;

  constructor(
    private conferenceService: ConferenceDataService,
    private locationService: LocationService
  ) {
    // Don't initialize venue lookup until needed
    this.locationCache = LocationCacheService.getInstance();
  }

  private async initializeVenueLookupIfNeeded() {
    if (!this.venueLookupInitialized) {
      console.log('⚡ Initializing venue lookup (lazy loading)...');
      try {
        this.venueLookup = await VenueLookupService.getInstance();
        this.venueLookupInitialized = true;
        console.log('✅ Venue lookup initialized');
      } catch (error) {
        console.log('⚠️ Failed to initialize venue lookup:', error);
        this.venueLookupInitialized = true; // Mark as attempted to avoid retry
        this.venueLookup = null;
      }
    }
  }

  /**
   * Enhanced prompt creation with intent-first optimization
   */
  async createEnhancedPrompt(originalPrompt: string): Promise<string> {
    let enhancedPrompt = originalPrompt;

    // Step 1: Fast intent detection (no database)
    const intent = IntentDetectorService.detectIntent(originalPrompt);
    
    // Step 2: Add conference data if needed (no database)
    if (intent.isConferenceQuery) {
      enhancedPrompt += '\n\nCONFERENCE SCHEDULE:';
      enhancedPrompt += '\n- 9AM: Opening Keynote by Sarah Chen';
      enhancedPrompt += '\n- 10:30AM: Deep Learning Fundamentals';
      enhancedPrompt += '\n- 12PM: Lunch & Networking';
      enhancedPrompt += '\n- 2PM: AI Ethics Panel';
      enhancedPrompt += '\n- 3:30PM: Hands-on Workshop';
      enhancedPrompt += '\n- 5PM: Data Science Trends';
      enhancedPrompt += '\n- 6:30PM: Closing Reception';
    }
    
    // Step 3: Add location data if needed (no database)
    if (intent.isLocationQuery) {
      enhancedPrompt += '\n\nVENUE INFO:';
      enhancedPrompt += '\n- Convention Center: 700 14th St, Denver';
      enhancedPrompt += '\n- Host Hotel: Hyatt Regency (2min walk)';
      enhancedPrompt += '\n- Parking: $15/day at center, $10/day nearby';
    }

    // Step 4: Tiered location lookup - scraped data → cache → Google Maps API
    if (intent.isVenueQuery || intent.isLocationQuery) {
      try {
        let venueData: string | null = null;
        
        // Tier 1: Try scraped database data first
        await this.initializeVenueLookupIfNeeded();
        
        if (this.venueLookup) {
          const venueCategory = this.venueLookup.detectCategory(originalPrompt);
          console.log(`🔍 PromptEnhancement: Venue category detected: ${venueCategory || 'none'}`);
          
          if (venueCategory) {
            venueData = await this.venueLookup.formatVenuesForResponse(venueCategory, 150);
            if (venueData && !venueData.includes('No ')) { // Check if we got actual results
              enhancedPrompt += '\n\nNEARBY VENUES:\n' + venueData;
            } else {
              venueData = null; // Reset if no results found
            }
          }
        }
        
        // Tier 2 & 3: If no scraped data found, use location cache service (which handles cache + Google Maps)
        if (!venueData) {
          const locationIntent = this.locationService.detectLocationIntent(originalPrompt);
          
          if (locationIntent?.hasLocationIntent) {
            console.log('🌐 No scraped data found, checking cache/Google Maps...');
            
            const places = await this.locationCache.searchPlaces(
              this.locationService,
              locationIntent.type,
              locationIntent.keyword,
              locationIntent.radius || 1500
            );
            
            if (places.length > 0) {
              enhancedPrompt += '\n\nNEARBY PLACES:\n';
              // Format top 3 places
              for (let i = 0; i < Math.min(3, places.length); i++) {
                const place = places[i];
                const distance = this.locationService.calculateWalkingDistance(
                  39.7432, -104.9959, // Convention center coords
                  place.geometry.location.lat,
                  place.geometry.location.lng
                );
                const priceLevel = place.price_level ? '$'.repeat(place.price_level) : '';
                const rating = place.rating ? `⭐${place.rating}` : '';
                enhancedPrompt += `• ${place.name} (${distance.walkingTime}${priceLevel ? ', ' + priceLevel : ''}${rating ? ', ' + rating : ''})\n`;
              }
            }
          }
        }
      } catch (error) {
        console.log('⚠️ Location lookup failed, continuing without location data:', error);
        // Don't rethrow the error - continue with basic prompt
      }
    } else {
      console.log('⚡ Skipping location lookup - not a location/venue query');
    }

    return enhancedPrompt;
  }

  /**
   * Optimize prompt for strategy
   */
  optimizePromptForStrategy(prompt: string, strategy: Strategy): string {
    if (strategy === 'cheap') {
      return `${prompt}\n\nProvide a brief, direct response (under 200 characters).`;
    }
    
    if (strategy === 'balanced') {
      return `${prompt}\n\nProvide a helpful, concise response (under 300 characters).`;
    }
    
    return prompt;
  }

  /**
   * Check if prompt should be enhanced with conference data
   */
  shouldEnhanceWithConferenceData(prompt: string): boolean {
    const lowerPrompt = prompt.toLowerCase();
    return lowerPrompt.includes('schedule') || 
           lowerPrompt.includes('session') || 
           lowerPrompt.includes('speaker') ||
           lowerPrompt.includes('conference');
  }

  /**
   * Check if prompt should be enhanced with location data
   */
  shouldEnhanceWithLocationData(prompt: string): boolean {
    const locationIntent = this.locationService.detectLocationIntent(prompt);
    return locationIntent?.hasLocationIntent ?? false;
  }
}