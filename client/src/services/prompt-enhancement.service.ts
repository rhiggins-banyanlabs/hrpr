// src/services/prompt-enhancement.service.ts
import { Strategy } from "@/types/ai-router.types";
import { LocationService } from "./location.service";
import { VenueLookupService } from "./venue-lookup.service";
import { IntentDetectorService } from "./intent-detector.service";
import { LocationCacheService } from "./location-cache.service";
import { ExhibitorSearchService } from "./exhibitor-search.service";
import { scheduleService } from "./schedule.service";
import { facilityToursService } from "./facility-tours.service";
import { workshopSearchService } from "./workshop-search.service";
import { committeeMeetingsService } from "./committee-meetings.service";
import { AI_TECH_EXPO, isAITechExpoQuery } from "@/data/ai-tech-expo";

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
    
    // Check if user is specifically asking for addresses
    const isAddressRequest = /\b(address|location|where is|how do i get to)\b/i.test(originalPrompt);

    // Step 0: Check for AI Tech Expo (featured event)
    if (isAITechExpoQuery(originalPrompt)) {
      console.log('🤖 AI Tech Expo query detected - adding featured event info');
      
      // Determine which aspect they're asking about
      const lowerPrompt = originalPrompt.toLowerCase();
      let expoInfo = AI_TECH_EXPO.responses.general;
      
      if (lowerPrompt.includes('when') || lowerPrompt.includes('time')) {
        expoInfo = AI_TECH_EXPO.responses.timing;
      } else if (lowerPrompt.includes('where') || lowerPrompt.includes('location')) {
        expoInfo = AI_TECH_EXPO.responses.location;
      } else if (lowerPrompt.includes('session') || lowerPrompt.includes('talk') || lowerPrompt.includes('presentation')) {
        expoInfo = AI_TECH_EXPO.responses.sessions;
      } else if (lowerPrompt.includes('sponsor') || lowerPrompt.includes('via') || lowerPrompt.includes('aws')) {
        expoInfo = AI_TECH_EXPO.responses.sponsors;
      }
      
      enhancedPrompt += `\n\nAI TECH EXPO (FEATURED EVENT):\n${expoInfo}\n${AI_TECH_EXPO.responses.importance}`;
    }
    
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
    // Skip if this is an AI Tech Expo query
    if (!isAITechExpoQuery(originalPrompt)) {
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
    }
    
    // Step 3.5: Add facility tour data if query is about tours
    if (facilityToursService.isTourQuery(originalPrompt)) {
      try {
        const tours = await facilityToursService.searchTours(originalPrompt);
        if (tours && tours.length > 0) {
          console.log(`🚐 PromptEnhancement: Found ${tours.length} facility tours`);
          const tourData = facilityToursService.formatToursForDisplay(tours);
          enhancedPrompt += `\n\nFACILITY TOURS:\n${tourData}`;
        }
      } catch (error) {
        console.log('⚠️ Facility tour lookup failed:', error);
      }
    }
    
    // Step 3.6: Add workshop data if query is about workshops
    if (intent.isWorkshopQuery) {
      try {
        const workshopQuery = await workshopSearchService.processWorkshopQuery(originalPrompt);
        
        if (workshopQuery.found && workshopQuery.data.length > 0) {
          console.log(`📚 PromptEnhancement: Found ${workshopQuery.data.length} workshops`);
          const workshopData = workshopSearchService.formatMultipleWorkshops(workshopQuery.data);
          enhancedPrompt += `\n\n${workshopQuery.context.toUpperCase()}\n${workshopData}`;
        }
      } catch (error) {
        console.log('⚠️ Workshop lookup failed:', error);
      }
    }
    
    // Step 3.7: Add committee meeting data if query is about meetings
    if (intent.isMeetingQuery) {
      try {
        const meetingQuery = await committeeMeetingsService.processMeetingQuery(originalPrompt);
        
        if (meetingQuery.found && meetingQuery.data.length > 0) {
          console.log(`📋 PromptEnhancement: Found ${meetingQuery.data.length} committee meetings`);
          const meetingData = committeeMeetingsService.formatMultipleMeetings(meetingQuery.data);
          enhancedPrompt += `\n\n${meetingQuery.context.toUpperCase()}\n${meetingData}`;
        }
      } catch (error) {
        console.log('⚠️ Committee meeting lookup failed:', error);
      }
    }
    
    // Step 4: Location data will be handled by venue lookup service below

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
              // Check if user asked for a specific brand/chain that wasn't found in scraped data
              const specificBrands = ['starbucks', 'mcdonalds', 'burger king', 'subway', 'kfc', 'taco bell', 'pizza hut', 'dominos'];
              const lowerPrompt = originalPrompt.toLowerCase();
              const askedForSpecificBrand = specificBrands.some(brand => lowerPrompt.includes(brand));
              
              if (askedForSpecificBrand) {
                const brandFound = specificBrands.some(brand => 
                  lowerPrompt.includes(brand) && venueData!.toLowerCase().includes(brand)
                );
                
                if (!brandFound) {
                  console.log('🔍 User asked for specific brand not found in scraped data, falling through to Google Maps...');
                  venueData = null; // Force fallthrough to Google Maps
                } else {
                  enhancedPrompt += '\n\nNEARBY VENUES:\n' + venueData;
                }
              } else {
                enhancedPrompt += '\n\nNEARBY VENUES:\n' + venueData;
              }
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
              if (isAddressRequest) {
                enhancedPrompt += '(User specifically requested address information)\n';
              }
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
                // Include both address and vicinity for AI to choose from based on user's request
                enhancedPrompt += `• ${place.name} (${distance.walkingTime}${priceLevel ? ', ' + priceLevel : ''}${rating ? ', ' + rating : ''})`;
                if (place.formatted_address) {
                  enhancedPrompt += ` [Address available: ${place.formatted_address}]`;
                }
                enhancedPrompt += '\n';
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