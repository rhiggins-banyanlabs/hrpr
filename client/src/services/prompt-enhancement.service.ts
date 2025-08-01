// src/services/prompt-enhancement.service.ts
import { Strategy } from "@/types/ai-router.types";
import { LocationService } from "./location.service";
import { VenueLookupService } from "./venue-lookup.service";
import { IntentDetectorService } from "./intent-detector.service";
import { LocationCacheService } from "./location-cache.service";
import { ExhibitorSearchService } from "./exhibitor-search.service";
import { scheduleService } from "./schedule.service";

export class PromptEnhancementService {
  private venueLookup: VenueLookupService | null = null;
  private venueLookupInitialized = false;
  private locationCache: LocationCacheService;
  private exhibitorService: ExhibitorSearchService;

  constructor(
    private locationService: LocationService
  ) {
    // Don't initialize venue lookup until needed
    this.locationCache = LocationCacheService.getInstance();
    this.exhibitorService = ExhibitorSearchService.getInstance();
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
    
    // Step 2: Add schedule data if it's a schedule/conference query
    if (intent.isConferenceQuery) {
      try {
        const lowerPrompt = originalPrompt.toLowerCase();
        let scheduleData = null;
        
        // Check for specific days
        if (lowerPrompt.includes('thursday') || lowerPrompt.includes('friday') || 
            lowerPrompt.includes('saturday') || lowerPrompt.includes('sunday')) {
          const day = lowerPrompt.includes('thursday') ? 'Thursday' :
                      lowerPrompt.includes('friday') ? 'Friday' :
                      lowerPrompt.includes('saturday') ? 'Saturday' : 'Sunday';
          const daySchedule = await scheduleService.getScheduleForDay(day);
          if (daySchedule.length > 0) {
            console.log(`📅 PromptEnhancement: Found ${daySchedule.length} events for ${day}`);
            scheduleData = scheduleService.formatScheduleForDisplay(daySchedule);
          }
        }
        // Check for event types
        else if (lowerPrompt.includes('tour') || lowerPrompt.includes('reception') || 
                 lowerPrompt.includes('workshop') || lowerPrompt.includes('session')) {
          const scheduleResults = await scheduleService.searchBySemantic(originalPrompt);
          if (scheduleResults.length > 0) {
            console.log(`📅 PromptEnhancement: Found ${scheduleResults.length} matching events`);
            scheduleData = scheduleService.formatScheduleForDisplay(scheduleResults);
          }
        }
        // General schedule query
        else {
          const scheduleResults = await scheduleService.searchBySemantic(originalPrompt);
          if (scheduleResults.length > 0) {
            console.log(`📅 PromptEnhancement: Found ${scheduleResults.length} schedule matches`);
            scheduleData = scheduleService.formatScheduleForDisplay(scheduleResults);
          }
        }
        
        if (scheduleData) {
          enhancedPrompt += `\n\nCONFERENCE SCHEDULE:\n${scheduleData}`;
        }
      } catch (error) {
        console.log('⚠️ Schedule lookup failed, continuing without schedule data:', error);
      }
    }
    
    // Step 3: Add exhibitor data from exhibitor search service (database only)
    try {
      const exhibitorQuery = await this.exhibitorService.processExhibitorQuery(originalPrompt);
      
      if (exhibitorQuery.found && exhibitorQuery.data.length > 0) {
        console.log(`🏢 PromptEnhancement: Found ${exhibitorQuery.data.length} exhibitors from database`);
        const exhibitorData = this.exhibitorService.formatMultipleExhibitors(exhibitorQuery.data);
        enhancedPrompt += `\n\n${exhibitorQuery.context.toUpperCase()}\n${exhibitorData}`;
      }
      // No fallback - only use actual database data
    } catch (error) {
      console.log('⚠️ Exhibitor lookup failed, no data added:', error);
      // No fallback - only use actual database data
    }
    
    // Step 3: Location data will be handled by venue lookup service below

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
                const address = place.formatted_address || place.vicinity;
                enhancedPrompt += `• ${place.name} - ${address} (${distance.walkingTime}${priceLevel ? ', ' + priceLevel : ''}${rating ? ', ' + rating : ''})\n`;
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