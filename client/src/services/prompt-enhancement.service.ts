// src/services/prompt-enhancement.service.ts
import { Strategy } from "@/types/ai-router.types";
import { ConferenceDataService } from "./conference-data.service";
import { LocationService } from "./location.service";
import { VenueLookupService } from "./venue-lookup.service";
import { IntentDetectorService } from "./intent-detector.service";

export class PromptEnhancementService {
  private venueLookup: VenueLookupService | null = null;
  private venueLookupInitialized = false;

  constructor(
    private conferenceService: ConferenceDataService,
    private locationService: LocationService
  ) {
    // Don't initialize venue lookup until needed
  }

  private async initializeVenueLookupIfNeeded() {
    if (!this.venueLookupInitialized) {
      console.log('⚡ Initializing venue lookup (lazy loading)...');
      this.venueLookup = await VenueLookupService.getInstance();
      this.venueLookupInitialized = true;
      console.log('✅ Venue lookup initialized');
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

    // Step 4: Only initialize venue lookup if needed (database call only when necessary)
    if (intent.isVenueQuery) {
      try {
        await this.initializeVenueLookupIfNeeded();
        
        if (this.venueLookup) {
          const venueCategory = this.venueLookup.detectCategory(originalPrompt);
          console.log(`🔍 PromptEnhancement: Venue category detected: ${venueCategory || 'none'}`);
          
          if (venueCategory) {
            const venueData = await this.venueLookup.formatVenuesForResponse(venueCategory, 150);
            enhancedPrompt += '\n\nNEARBY VENUES:\n' + venueData;
          }
        }
      } catch (error) {
        console.log('⚠️ Venue lookup failed, continuing without venue data');
      }
    } else {
      console.log('⚡ Skipping venue lookup - not a venue query');
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