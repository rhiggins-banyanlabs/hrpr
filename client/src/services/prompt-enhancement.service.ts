// src/services/prompt-enhancement.service.ts
import { Strategy } from "@/types/ai-router.types";
import { ConferenceDataService } from "./conference-data.service";
import { LocationService } from "./location.service";

export class PromptEnhancementService {
  constructor(
    private conferenceService: ConferenceDataService,
    private locationService: LocationService
  ) {}

  /**
   * Enhanced prompt creation with Google Maps data
   */
  async createEnhancedPrompt(originalPrompt: string): Promise<string> {
    await this.conferenceService.ensureConferenceData();

    let enhancedPrompt = originalPrompt;

    // Add conference data
    const speakers = this.conferenceService.getSpeakers();
    const sessions = this.conferenceService.getSessions();
    
    if (speakers.length > 0 || sessions.length > 0) {
      enhancedPrompt += '\n\nCONFERENCE INFORMATION:';
      
      if (speakers.length > 0) {
        enhancedPrompt += '\nSPEAKERS:';
        speakers.forEach(s => {
          enhancedPrompt += `\n- ${s.name} (${s.title}${s.company ? ` at ${s.company}` : ''})`;
        });
      }
      
      if (sessions.length > 0) {
        enhancedPrompt += '\n\nSCHEDULE:';
        sessions.forEach(session => {
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
    const locationIntent = this.locationService.detectLocationIntent(originalPrompt);
    if (locationIntent?.hasLocationIntent) {
      const venue = this.locationService.getConferenceVenue();
      const hotel = this.locationService.getHostHotel();
      
      enhancedPrompt += `\n\nLOCATION INFORMATION:`;
      enhancedPrompt += `\n- Conference Venue: ${venue.name} at ${venue.address}`;
      enhancedPrompt += `\n- Host Hotel: ${hotel.name} at ${hotel.address}`;
      enhancedPrompt += `\n- Distance between venue and hotel: 2-minute walk (0.1 miles)`;

      // Search for specific places if requested
      if (locationIntent.type || locationIntent.keyword) {
        const places = await this.locationService.searchNearbyPlaces(
          locationIntent.type,
          locationIntent.keyword,
          locationIntent.radius
        );

        if (places.length > 0) {
          enhancedPrompt += `\n\nNEARBY ${locationIntent.type?.toUpperCase() || 'PLACES'}:`;
          
          // Limit to top 5 places
          places.slice(0, 5).forEach(place => {
            const { walkingTime } = this.locationService.calculateWalkingDistance(
              venue.lat,
              venue.lng,
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