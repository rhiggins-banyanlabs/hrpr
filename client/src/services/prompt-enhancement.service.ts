// src/services/prompt-enhancement.service.ts
import { Strategy } from "@/types/ai-router.types";
import { LocationService } from "./location.service";
import { VenueLookupService } from "./venue-lookup.service";
import { semanticIntentDetector } from "./semantic-intent-detector.service";
import { conversationContext } from "./conversation-context.service";
import { LocationCacheService } from "./location-cache.service";
import { ExhibitorSearchService } from "./exhibitor-search.service";
import { scheduleService } from "./schedule.service";
import { facilityToursService } from "./facility-tours.service";
import { workshopSearchService } from "./workshop-search.service";
import { committeeMeetingsService } from "./committee-meetings.service"; // with embedding reuse
import { conferenceInfoDatabaseService } from "./conference-info-db.service";
import { AI_TECH_EXPO, isAITechExpoQuery } from "@/data/ai-tech-expo";
import { featuredTechService } from "./featured-tech.service";
import { onsiteDiningService } from "./onsite-dining.service";

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
    const startTime = performance.now();
    
    // STEP 1: Check if this is a follow-up question and enhance with context
    const isFollowUp = conversationContext.isFollowUp(originalPrompt);
    let queryToProcess = conversationContext.enhanceQueryWithContext(originalPrompt);
    
    if (isFollowUp) {
      console.log('🔄 Follow-up detected:', {
        original: originalPrompt,
        enhanced: queryToProcess,
        context: conversationContext.getContext()
      });
    }
    
    let enhancedPrompt = queryToProcess;
    
    // Add a note if this is a follow-up question
    if (isFollowUp) {
      const context = conversationContext.getContext();
      if (context?.lastTopic) {
        enhancedPrompt = `${queryToProcess}\n\n[CONTEXT: This is a follow-up question about ${context.lastTopic}]`;
      }
    }
    
    // Check if user is specifically asking for addresses
    const isAddressRequest = /\b(address|location|where is|how do i get to)\b/i.test(queryToProcess);

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
    
    // STEP 2: Use semantic intent detection for accurate data routing
    // Try semantic first, fall back to keyword if needed
    let intent;
    try {
      intent = await semanticIntentDetector.detectIntent(queryToProcess);
      console.log(`🎯 Semantic intent: ${intent.primaryIntent} (${intent.confidence.toFixed(2)} confidence)`);
    } catch (error) {
      console.log('⚠️ Semantic detection failed, using keyword fallback');
      // Fall back to fast keyword detection
      const keywordIntent = semanticIntentDetector.detectIntentByKeywords(queryToProcess);
      intent = keywordIntent;
    }
    
    // STEP 3: Update context for next query
    const entities = conversationContext.extractEntities(queryToProcess);
    conversationContext.updateContext(originalPrompt, intent.primaryIntent, entities[0], entities);
    
    const enhancementTime = performance.now() - startTime;
    console.log(`⏱️ Intent detection took ${enhancementTime.toFixed(1)}ms`);
    
    // STEP 4: Add data based on intent (only fetch what's needed)
    // Schedule data for conference queries
    if (intent.isConferenceQuery && intent.primaryIntent !== 'exhibitor') {
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
    
    // Conference info for info queries
    if (intent.primaryIntent === 'info' && !intent.isExhibitorQuery) {
      try {
        const infoResult = await conferenceInfoDatabaseService.searchInfo(originalPrompt);
        if (infoResult) {
          console.log('ℹ️ PromptEnhancement: Found conference information');
          enhancedPrompt += `\n\nCONFERENCE INFORMATION:\n${infoResult}`;
        }
      } catch (error) {
        console.error('Error getting conference info:', error);
      }
    }
    
    // Check for featured technology (like AIDA) first
    const featuredTechQuery = await featuredTechService.processFeaturedTechQuery(originalPrompt);
    if (featuredTechQuery.found) {
      console.log(`🌟 PromptEnhancement: Found featured technology - ${featuredTechQuery.data?.name}`);
      enhancedPrompt += `\n\nFEATURED TECHNOLOGY:\n${featuredTechQuery.formattedInfo}`;
    }
    
    // Exhibitor data for exhibitor queries
    if (intent.primaryIntent === 'exhibitor' && !isAITechExpoQuery(originalPrompt)) {
      try {
        const exhibitorQuery = await this.exhibitorService.processExhibitorQuery(originalPrompt);
        
        if (exhibitorQuery.found && exhibitorQuery.data.length > 0) {
          console.log(`🏢 PromptEnhancement: Found ${exhibitorQuery.data.length} exhibitors from database`);
          const exhibitorData = this.exhibitorService.formatMultipleExhibitors(exhibitorQuery.data);
          enhancedPrompt += `\n\n${exhibitorQuery.context.toUpperCase()}\n${exhibitorData}`;
        } else if (!featuredTechQuery.found) {
          // Only show "not found" message if it's not a featured technology
          const lowerPrompt = originalPrompt.toLowerCase();
          if (lowerPrompt.includes('ada demo') || lowerPrompt.includes('aida')) {
            console.log('🏢 PromptEnhancement: Query might be about AIDA but not detected as featured tech');
          }
        }
      } catch (error) {
        console.log('⚠️ Exhibitor lookup failed, no data added:', error);
        // No fallback - only use actual database data
      }
    }
    
    // Facility tours (only if explicitly about tours)
    if (intent.isConferenceQuery && facilityToursService.isTourQuery(originalPrompt)) {
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
    
    // Workshop data
    if (intent.primaryIntent === 'workshop') {
      try {
        // Pass the embedding if available to avoid regenerating it
        const workshopQuery = intent.queryEmbedding 
          ? await workshopSearchService.processWorkshopQueryWithEmbedding(originalPrompt, intent.queryEmbedding)
          : await workshopSearchService.processWorkshopQuery(originalPrompt);
        
        if (workshopQuery.found && workshopQuery.data.length > 0) {
          console.log(`📚 PromptEnhancement: Found ${workshopQuery.data.length} workshops (embedding reused: ${!!intent.queryEmbedding})`);
          const workshopData = workshopSearchService.formatMultipleWorkshops(workshopQuery.data);
          enhancedPrompt += `\n\n${workshopQuery.context.toUpperCase()}\n${workshopData}`;
        }
      } catch (error) {
        console.log('⚠️ Workshop lookup failed:', error);
      }
    }
    
    // Committee meetings
    if (intent.primaryIntent === 'meeting') {
      try {
        // Pass the embedding if available to avoid regenerating it
        const meetingQuery = intent.queryEmbedding
          ? await committeeMeetingsService.processMeetingQueryWithEmbedding(originalPrompt, intent.queryEmbedding)
          : await committeeMeetingsService.processMeetingQuery(originalPrompt);
        
        if (meetingQuery.found && meetingQuery.data.length > 0) {
          console.log(`📋 PromptEnhancement: Found ${meetingQuery.data.length} committee meetings (embedding reused: ${!!intent.queryEmbedding})`);
          const meetingData = committeeMeetingsService.formatMultipleMeetings(meetingQuery.data);
          enhancedPrompt += `\n\n${meetingQuery.context.toUpperCase()}\n${meetingData}`;
        }
      } catch (error) {
        console.log('⚠️ Committee meeting lookup failed:', error);
      }
    }
    
    // STEP 5: Location/venue data (most expensive, do last)
    if (intent.primaryIntent === 'venue' || intent.primaryIntent === 'location') {
      try {
        // Check if this is a follow-up request for "more" options
        const lowerOriginal = originalPrompt.toLowerCase();
        const lowerProcessed = queryToProcess.toLowerCase();
        const isAskingForMore = /\b(more|other|another|else|additional|besides|different)\b/.test(lowerOriginal) ||
                               /\b(more|other|another|else|additional|besides|different)\b/.test(lowerProcessed);
        
        // Check if this is a follow-up based on context
        const context = conversationContext.getContext();
        const isFollowUpContext = isFollowUp && context?.lastIntent === 'venue';
        
        console.log(`🔍 Venue query analysis:`, {
          isAskingForMore,
          isFollowUp,
          isFollowUpContext,
          lastTopic: context?.lastTopic,
          lastIntent: context?.lastIntent
        });
        
        // ONLY show on-site dining if this is NOT a follow-up request for more
        if (!isAskingForMore && !isFollowUpContext) {
          const diningQuery = await onsiteDiningService.processDiningQuery(originalPrompt);
          
          if (diningQuery.found && diningQuery.isOnsiteQuery) {
            console.log(`🍽️ PromptEnhancement: Showing ON-SITE dining (${diningQuery.data.length} options)`);
            enhancedPrompt += `\n\n${diningQuery.formattedInfo}`;
            
            // Don't add external venues - just stop here for first query
            return enhancedPrompt;
          }
        } else if (isAskingForMore || isFollowUpContext) {
          console.log(`🍽️ PromptEnhancement: User asking for MORE options - skipping on-site, showing external venues`);
          // User is asking for more - skip on-site entirely and show external
        }
        
        // Show external venues if:
        // 1. User is asking for more/other options (ALWAYS show external for these)
        // 2. OR this is a general venue query (not dining specific)
        // For "more" requests, we ALWAYS want to show external venues
        if (isAskingForMore || isFollowUpContext) {
          console.log(`🏪 Showing external venues for follow-up request`);
          let venueData: string | null = null;
          
          // Tier 1: Try scraped database data first
          await this.initializeVenueLookupIfNeeded();
          
          if (this.venueLookup) {
            // Use the enhanced query for better category detection on follow-ups
            const queryForCategory = isFollowUpContext ? queryToProcess : originalPrompt;
            const venueCategory = this.venueLookup.detectCategory(queryForCategory);
            console.log(`🔍 PromptEnhancement: Venue category detected: ${venueCategory || 'none'} from query: "${queryForCategory}"`);
            
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
        
        // Also show external venues for non-dining venue queries
        } else if (!onsiteDiningService.isFoodQuery(originalPrompt)) {
          console.log(`🏪 Showing external venues for general venue query`);
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
              }
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

    const totalTime = performance.now() - startTime;
    console.log(`⏱️ Total prompt enhancement: ${totalTime.toFixed(1)}ms`);
    
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