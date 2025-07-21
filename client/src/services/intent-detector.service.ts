// Lightweight intent detection without database calls
export class IntentDetectorService {
  private static readonly VENUE_KEYWORDS = [
    'restaurant', 'food', 'eat', 'dining', 'lunch', 'dinner', 'breakfast',
    'coffee', 'cafe', 'bar', 'drink', 'pub', 'brewery',
    'parking', 'park', 'garage', 'lot',
    'hotel', 'stay', 'accommodation', 'lodge',
    'shop', 'shopping', 'store', 'mall', 'buy',
    'gym', 'fitness', 'exercise', 'workout',
    'attraction', 'tourist', 'visit', 'see', 'activity',
    'nearby', 'close', 'around', 'near', 'walking distance'
  ];

  private static readonly CONFERENCE_KEYWORDS = [
    'schedule', 'session', 'speaker', 'time', 'when', 'who', 'keynote', 
    'presentation', 'talk', 'workshop', 'panel', 'break', 'lunch',
    'agenda', 'program', 'event', 'next', 'current', 'happening'
  ];

  private static readonly LOCATION_KEYWORDS = [
    'location', 'where', 'address', 'venue', 'conference', 'located',
    'get', 'directions', 'how to get', 'map', 'building', 'room',
    'floor', 'hall', 'center', 'convention'
  ];

  static detectIntent(query: string): {
    isVenueQuery: boolean;
    isConferenceQuery: boolean;
    isLocationQuery: boolean;
    confidence: number;
  } {
    const lowerQuery = query.toLowerCase();
    
    // Check for venue-related keywords
    const venueMatches = this.VENUE_KEYWORDS.filter(keyword => 
      lowerQuery.includes(keyword)
    );
    
    // Check for conference-related keywords
    const conferenceMatches = this.CONFERENCE_KEYWORDS.filter(keyword => 
      lowerQuery.includes(keyword)
    );
    
    // Check for location-related keywords
    const locationMatches = this.LOCATION_KEYWORDS.filter(keyword => 
      lowerQuery.includes(keyword)
    );

    const isVenueQuery = venueMatches.length > 0;
    const isConferenceQuery = conferenceMatches.length > 0;
    const isLocationQuery = locationMatches.length > 0;
    
    // Calculate confidence based on number of matches
    const totalMatches = venueMatches.length + conferenceMatches.length + locationMatches.length;
    const confidence = Math.min(totalMatches / 3, 1); // Cap at 1.0
    
    console.log(`🎯 IntentDetector: "${query}" -> Venue: ${isVenueQuery}, Conference: ${isConferenceQuery}, Location: ${isLocationQuery} (confidence: ${confidence.toFixed(2)})`);
    
    return {
      isVenueQuery,
      isConferenceQuery,
      isLocationQuery,
      confidence
    };
  }

  static needsVenueData(query: string): boolean {
    return this.detectIntent(query).isVenueQuery;
  }

  static getFillerResponse(query: string): string | null {
    const intent = this.detectIntent(query);
    const lowerQuery = query.toLowerCase();
    
    // Venue-related filler responses
    if (intent.isVenueQuery) {
      if (lowerQuery.includes('restaurant') || lowerQuery.includes('food') || lowerQuery.includes('eat')) {
        return "Let me check our restaurant recommendations for you";
      }
      if (lowerQuery.includes('parking') || lowerQuery.includes('park')) {
        return "Let me find parking options near the venue";
      }
      if (lowerQuery.includes('coffee') || lowerQuery.includes('cafe')) {
        return "Let me find the best coffee spots nearby";
      }
      if (lowerQuery.includes('hotel') || lowerQuery.includes('stay')) {
        return "Let me check accommodation options for you";
      }
      if (lowerQuery.includes('shop') || lowerQuery.includes('shopping')) {
        return "Let me find shopping areas near the conference";
      }
      return "Let me get that information for you";
    }
    
    // Conference schedule filler responses
    if (intent.isConferenceQuery) {
      if (lowerQuery.includes('keynote')) {
        return "Let me check the keynote schedule for you";
      }
      if (lowerQuery.includes('speaker')) {
        return "Let me look up our speaker lineup";
      }
      if (lowerQuery.includes('session') || lowerQuery.includes('workshop')) {
        return "Let me check the session schedule";
      }
      if (lowerQuery.includes('next') || lowerQuery.includes('happening')) {
        return "Let me see what's coming up next";
      }
      return "Let me check our conference schedule for you";
    }
    
    // Location/directions filler responses
    if (intent.isLocationQuery) {
      if (lowerQuery.includes('direction') || lowerQuery.includes('how to get')) {
        return "Let me check our conference map for you";
      }
      if (lowerQuery.includes('room') || lowerQuery.includes('hall')) {
        return "Let me find that room location for you";
      }
      if (lowerQuery.includes('address') || lowerQuery.includes('where')) {
        return "Let me get the venue address for you";
      }
      return "Let me check our venue information for you";
    }
    
    // General processing filler
    return "Let me look that up for you";
  }
}