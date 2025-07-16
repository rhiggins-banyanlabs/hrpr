// src/services/prompt-enhancement.service.ts
import { Strategy } from "@/types/ai-router.types";
import { ConferenceDataService } from "./conference-data.service";
import { LocationService } from "./location.service";
import { VenueLookupService } from "./venue-lookup.service";

export class PromptEnhancementService {
  private venueLookup: VenueLookupService | null = null;

  constructor(
    private conferenceService: ConferenceDataService,
    private locationService: LocationService
  ) {
    this.initializeVenueLookup();
  }

  private async initializeVenueLookup() {
    this.venueLookup = await VenueLookupService.getInstance();
  }

  /**
   * Enhanced prompt creation with organized venue data
   */
  async createEnhancedPrompt(originalPrompt: string): Promise<string> {
    let enhancedPrompt = originalPrompt;

    // Ensure venue lookup is initialized
    if (!this.venueLookup) {
      console.log('⏳ PromptEnhancement: Waiting for VenueLookup initialization...');
      await this.initializeVenueLookup();
      console.log('✅ PromptEnhancement: VenueLookup initialized');
    }

    // Check for conference schedule queries
    const isConferenceQuery = /schedule|session|speaker|time|when|who|keynote|presentation/i.test(originalPrompt);
    // Check for basic location queries  
    const isLocationQuery = /location|where|address|venue|conference.*located|how.*get|directions/i.test(originalPrompt);
    // Check for venue queries (restaurants, parking, etc.)
    const venueCategory = this.venueLookup?.detectCategory(originalPrompt);
    console.log(`🔍 PromptEnhancement: Query "${originalPrompt}" -> Category: ${venueCategory || 'none'}`);
    
    if (isConferenceQuery) {
      enhancedPrompt += '\n\nCONFERENCE SCHEDULE:';
      enhancedPrompt += '\n- 9AM: Opening Keynote by Sarah Chen';
      enhancedPrompt += '\n- 10:30AM: Deep Learning Fundamentals';
      enhancedPrompt += '\n- 12PM: Lunch & Networking';
      enhancedPrompt += '\n- 2PM: AI Ethics Panel';
      enhancedPrompt += '\n- 3:30PM: Hands-on Workshop';
      enhancedPrompt += '\n- 5PM: Data Science Trends';
      enhancedPrompt += '\n- 6:30PM: Closing Reception';
    }
    
    if (isLocationQuery) {
      enhancedPrompt += '\n\nVENUE INFO:';
      enhancedPrompt += '\n- Convention Center: 700 14th St, Denver';
      enhancedPrompt += '\n- Host Hotel: Hyatt Regency (2min walk)';
      enhancedPrompt += '\n- Parking: $15/day at center, $10/day nearby';
    }

    // Add specific venue data if detected
    if (venueCategory && this.venueLookup) {
      try {
        const venueData = await this.venueLookup.formatVenuesForResponse(venueCategory, 150);
        enhancedPrompt += '\n\nNEARBY VENUES:\n' + venueData;
      } catch (error) {
        console.log('⚠️ Venue lookup failed, using fallback');
      }
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