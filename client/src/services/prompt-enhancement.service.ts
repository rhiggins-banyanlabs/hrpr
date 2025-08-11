// src/services/prompt-enhancement.service.ts
import { Strategy } from "@/types/ai-router.types";
import { LocationService } from "./location.service";
import { VenueLookupService } from "./venue-lookup.service";
import { semanticIntentDetector, type IntentResult } from "./semantic-intent-detector.service";
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
    const queryToProcess = conversationContext.enhanceQueryWithContext(originalPrompt);
    
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
    
    // STEP 2: Use semantic intent detection with timeout for speed
    // Try semantic first with timeout, fall back to keyword if needed
    let intent;
    try {
      // Add timeout to semantic detection to prevent long delays
      const semanticPromise = semanticIntentDetector.detectIntent(queryToProcess);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Semantic detection timeout')), 1000)
      );
      
      intent = await Promise.race([semanticPromise, timeoutPromise]) as IntentResult;
      console.log(`🎯 Semantic intent: ${intent.primaryIntent} (${intent.confidence.toFixed(2)} confidence)`);
    } catch {
      console.log('⚠️ Semantic detection failed/timed out, using keyword fallback');
      // Fall back to fast keyword detection
      const keywordIntent = semanticIntentDetector.detectIntentByKeywords(queryToProcess);
      intent = keywordIntent;
    }
    
    // STEP 3: Update context for next query
    const entities = conversationContext.extractEntities(queryToProcess);
    conversationContext.updateContext(originalPrompt, intent.primaryIntent, entities[0], entities);
    
    const enhancementTime = performance.now() - startTime;
    console.log(`⏱️ Intent detection took ${enhancementTime.toFixed(1)}ms`);
    
    // STEP 4: Run all data fetching operations in parallel for maximum speed
    const dataPromises = [];
    
    // Schedule data for conference queries
    let schedulePromise = null;
    if (intent.isConferenceQuery && intent.primaryIntent !== 'exhibitor') {
      schedulePromise = (async () => {
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
          
          return scheduleData;
        } catch (error) {
          console.log('⚠️ Schedule lookup failed:', error);
          return null;
        }
      })();
      dataPromises.push(schedulePromise);
    }
    
    // Conference info for info queries
    let conferenceInfoPromise = null;
    if (intent.primaryIntent === 'info' && !intent.isExhibitorQuery) {
      conferenceInfoPromise = conferenceInfoDatabaseService.searchInfo(originalPrompt).then(infoResult => {
        if (infoResult) {
          console.log('ℹ️ PromptEnhancement: Found conference information');
          return infoResult;
        }
        return null;
      }).catch(error => {
        console.error('Error getting conference info:', error);
        return null;
      });
      dataPromises.push(conferenceInfoPromise);
    }
    
    // Check for featured technology (like AIDA)
    const featuredTechPromise = featuredTechService.processFeaturedTechQuery(originalPrompt).catch(error => {
      console.log('⚠️ Featured tech lookup failed:', error);
      return { found: false };
    });
    dataPromises.push(featuredTechPromise);
    
    // Exhibitor data for exhibitor queries
    let exhibitorPromise = null;
    if (intent.primaryIntent === 'exhibitor' && !isAITechExpoQuery(originalPrompt)) {
      exhibitorPromise = this.exhibitorService.processExhibitorQuery(originalPrompt).then(exhibitorQuery => {
        if (exhibitorQuery.found && exhibitorQuery.data.length > 0) {
          console.log(`🏢 PromptEnhancement: Found ${exhibitorQuery.data.length} exhibitors from database`);
          return {
            context: exhibitorQuery.context.toUpperCase(),
            data: this.exhibitorService.formatMultipleExhibitors(exhibitorQuery.data)
          };
        }
        return null;
      }).catch(error => {
        console.log('⚠️ Exhibitor lookup failed, no data added:', error);
        return null;
      });
      dataPromises.push(exhibitorPromise);
    }
    
    // Facility tours and workshops
    let tourPromise = null;
    let workshopPromise = null;
    
    // Facility tours (only if explicitly about tours)
    if (intent.isConferenceQuery && facilityToursService.isTourQuery(originalPrompt)) {
      tourPromise = facilityToursService.searchTours(originalPrompt).then(tours => {
        if (tours && tours.length > 0) {
          console.log(`🚐 PromptEnhancement: Found ${tours.length} facility tours`);
          return facilityToursService.formatToursForDisplay(tours);
        }
        return null;
      }).catch(error => {
        console.log('⚠️ Facility tour lookup failed:', error);
        return null;
      });
      dataPromises.push(tourPromise);
    }
    
    // Workshop data
    if (intent.primaryIntent === 'workshop') {
      workshopPromise = (intent.queryEmbedding 
        ? workshopSearchService.processWorkshopQueryWithEmbedding(originalPrompt, intent.queryEmbedding)
        : workshopSearchService.processWorkshopQuery(originalPrompt)
      ).then(workshopQuery => {
        if (workshopQuery.found && workshopQuery.data.length > 0) {
          console.log(`📚 PromptEnhancement: Found ${workshopQuery.data.length} workshops (embedding reused: ${!!intent.queryEmbedding})`);
          return {
            context: workshopQuery.context.toUpperCase(),
            data: workshopSearchService.formatMultipleWorkshops(workshopQuery.data)
          };
        }
        return null;
      }).catch(error => {
        console.log('⚠️ Workshop lookup failed:', error);
        return null;
      });
      dataPromises.push(workshopPromise);
    }
    
    // Committee meetings
    let meetingPromise = null;
    if (intent.primaryIntent === 'meeting') {
      meetingPromise = (intent.queryEmbedding
        ? committeeMeetingsService.processMeetingQueryWithEmbedding(originalPrompt, intent.queryEmbedding)
        : committeeMeetingsService.processMeetingQuery(originalPrompt)
      ).then(meetingQuery => {
        if (meetingQuery.found && meetingQuery.data.length > 0) {
          console.log(`📋 PromptEnhancement: Found ${meetingQuery.data.length} committee meetings (embedding reused: ${!!intent.queryEmbedding})`);
          return {
            context: meetingQuery.context.toUpperCase(),
            data: committeeMeetingsService.formatMultipleMeetings(meetingQuery.data)
          };
        }
        return null;
      }).catch(error => {
        console.log('⚠️ Committee meeting lookup failed:', error);
        return null;
      });
      dataPromises.push(meetingPromise);
    }
    
    // Wait for ALL parallel operations to complete
    if (dataPromises.length > 0) {
      try {
        const results = await Promise.all(dataPromises);
        let resultIndex = 0;
        
        // Process schedule data
        if (schedulePromise) {
          const scheduleData = results[resultIndex++];
          if (scheduleData) {
            enhancedPrompt += `\n\nCONFERENCE SCHEDULE:\n${scheduleData}`;
          }
        }
        
        // Process conference info
        if (conferenceInfoPromise) {
          const infoData = results[resultIndex++];
          if (infoData) {
            enhancedPrompt += `\n\nCONFERENCE INFORMATION:\n${infoData}`;
          }
        }
        
        // Process featured tech (always included)
        const featuredTechQuery = results[resultIndex++];
        if (featuredTechQuery && featuredTechQuery.found) {
          console.log(`🌟 PromptEnhancement: Found featured technology - ${featuredTechQuery.data?.name}`);
          enhancedPrompt += `\n\nFEATURED TECHNOLOGY:\n${featuredTechQuery.formattedInfo}`;
        }
        
        // Process exhibitor data
        if (exhibitorPromise) {
          const exhibitorData = results[resultIndex++];
          if (exhibitorData && exhibitorData.context && exhibitorData.data) {
            enhancedPrompt += `\n\n${exhibitorData.context}\n${exhibitorData.data}`;
          }
        }
        
        // Process tour data
        if (tourPromise) {
          const tourData = results[resultIndex++];
          if (tourData) {
            enhancedPrompt += `\n\nFACILITY TOURS:\n${tourData}`;
          }
        }
        
        // Process workshop data
        if (workshopPromise) {
          const workshopResult = results[resultIndex++];
          if (workshopResult && typeof workshopResult === 'object' && workshopResult.context && workshopResult.data) {
            enhancedPrompt += `\n\n${workshopResult.context}\n${workshopResult.data}`;
          }
        }
        
        // Process meeting data
        if (meetingPromise) {
          const meetingResult = results[resultIndex++];
          if (meetingResult && typeof meetingResult === 'object' && 'context' in meetingResult && 'data' in meetingResult) {
            enhancedPrompt += `\n\n${meetingResult.context}\n${meetingResult.data}`;
          }
        }
      } catch (error) {
        console.log('⚠️ Parallel lookup operations failed:', error);
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
        
        // Declare venueData at higher scope
        let venueData: string | null = null;
        
        // Show external venues if:
        // 1. User is asking for more/other options (ALWAYS show external for these)
        // 2. OR this is a general venue query (not dining specific)
        // For "more" requests, we ALWAYS want to show external venues
        if (isAskingForMore || isFollowUpContext) {
          console.log(`🏪 Showing external venues for follow-up request`);
          
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