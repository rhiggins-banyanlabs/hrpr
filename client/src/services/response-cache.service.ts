// src/services/response-cache.service.ts
import { CacheService } from "./cache.service";
import { ConferenceDataService } from "./conference-data.service";
import { LocationService } from "./location.service";

export class ResponseCacheService {
  constructor(
    private conferenceService: ConferenceDataService,
    private locationService: LocationService
  ) {}

  /**
   * Preload common responses with real location data
   */
  async preloadCommonResponses(): Promise<void> {
    console.log('🔥 Preloading common conference responses...');
    
    await this.conferenceService.ensureConferenceData();
    
    const venue = this.locationService.getConferenceVenue();
    const hotel = this.locationService.getHostHotel();
    
    // Basic venue/hotel responses
    CacheService.addInstantResponse('where is the venue', 
      `The Denver Convention Center is at ${venue.address}`);
    CacheService.addInstantResponse('where is the hotel', 
      `The Hyatt Regency Denver is at ${hotel.address}`);
    CacheService.addInstantResponse('how far is the hotel', 
      'The Hyatt Regency is just a 2-minute walk (0.1 miles) from the convention center.');
    
    // Conference data responses
    const speakers = this.conferenceService.getSpeakers();
    const sessions = this.conferenceService.getSessions();
    
    if (speakers.length > 0) {
      const speakerCount = speakers.length;
      const speakerNames = speakers.slice(0, 5).map(s => s.name).join(', ');
      const moreText = speakerCount > 5 ? ` and ${speakerCount - 5} more` : '';
      CacheService.addInstantResponse('who are the speakers', 
        `We have ${speakerCount} speakers including: ${speakerNames}${moreText}`);
    }
    
    if (sessions.length > 0) {
      CacheService.addInstantResponse('how many sessions', 
        `We have ${sessions.length} sessions scheduled.`);
      
      const firstSession = this.conferenceService.getFirstSession();
      
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
      const restaurants = await this.locationService.searchNearbyPlaces('restaurant', '', 1000);
      if (restaurants.length > 0) {
        const nearbyCount = restaurants.length;
        const names = restaurants.slice(0, 3).map(r => r.name).join(', ');
        CacheService.addInstantResponse('restaurants nearby', 
          `There are ${nearbyCount} restaurants within walking distance including ${names}.`);
      }

      const coffeeShops = await this.locationService.searchNearbyPlaces('cafe', 'coffee', 800);
      if (coffeeShops.length > 0) {
        const names = coffeeShops.slice(0, 2).map(c => c.name).join(' and ');
        CacheService.addInstantResponse('coffee nearby', 
          `Nearby coffee shops include ${names}, both within a 5-minute walk.`);
      }
    } catch (error) {
      console.warn('⚠️ Could not preload nearby places:', error);
    }

    console.log(`🔥 Preloaded responses with ${speakers.length} speakers and ${sessions.length} sessions`);
  }

  /**
   * Clear all cached responses
   */
  clearCache(): void {
    CacheService.clearCache();
    console.log('🗑️ Response cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return CacheService.getCacheStats();
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return CacheService.getPerformanceMetrics();
  }
}