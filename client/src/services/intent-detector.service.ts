// Enhanced intent detection with comprehensive keyword coverage and natural responses
export class IntentDetectorService {
  // Places/venues outside the conference (restaurants, hotels, etc)
  private static readonly VENUE_KEYWORDS = [
    // Food & Dining
    'restaurant', 'restaurants', 'food', 'eat', 'eating', 'dining', 'dine',
    'lunch', 'dinner', 'breakfast', 'brunch', 'meal', 'meals', 'hungry',
    'coffee', 'cafe', 'cafes', 'espresso', 'latte', 'cappuccino', 'starbucks',
    'bar', 'bars', 'drink', 'drinks', 'pub', 'pubs', 'brewery', 'breweries',
    'alcohol', 'beer', 'wine', 'cocktail', 'cocktails', 'happy hour',
    'pizza', 'burger', 'burgers', 'sandwich', 'sushi', 'chinese', 'italian',
    'mexican', 'thai', 'indian', 'fast food', 'takeout', 'delivery',
    
    // Parking & Transportation
    'parking', 'park', 'garage', 'garages', 'lot', 'lots', 'spot', 'spots',
    'valet', 'meter', 'meters', 'free parking', 'paid parking',
    'uber', 'lyft', 'taxi', 'cab', 'ride', 'transport', 'bus', 'metro',
    
    // Accommodation
    'hotel', 'hotels', 'stay', 'staying', 'accommodation', 'accommodations',
    'lodge', 'inn', 'motel', 'airbnb', 'booking', 'room', 'rooms',
    'check in', 'check out', 'reservation', 'reservations',
    
    // Shopping & Services
    'shop', 'shopping', 'store', 'stores', 'mall', 'malls', 'buy', 'buying',
    'pharmacy', 'bank', 'atm', 'gas station', 'grocery', 'groceries',
    'souvenir', 'souvenirs', 'gift', 'gifts',
    
    // Entertainment & Activities
    'gym', 'fitness', 'exercise', 'workout', 'spa', 'massage',
    'attraction', 'attractions', 'tourist', 'tourism', 'visit', 'visiting',
    'see', 'activity', 'activities', 'entertainment', 'fun', 'things to do',
    'museum', 'museums', 'park', 'parks', 'beach', 'zoo', 'aquarium',
    
    // Location modifiers
    'nearby', 'near', 'close', 'closest', 'around', 'area', 'local',
    'walking distance', 'walkable', 'within', 'minutes', 'blocks',
    'downtown', 'uptown', 'district', 'neighborhood'
  ];

  // Conference schedule/sessions/speakers
  private static readonly CONFERENCE_KEYWORDS = [
    // Schedule & Time
    'schedule', 'agenda', 'program', 'timeline', 'itinerary',
    'time', 'times', 'when', 'what time', 'start', 'starts', 'starting',
    'end', 'ends', 'ending', 'finish', 'finishes', 'duration',
    'today', 'tomorrow', 'morning', 'afternoon', 'evening', 'tonight',
    'now', 'current', 'currently', 'next', 'upcoming', 'later',
    
    // Events & Sessions
    'session', 'sessions', 'keynote', 'keynotes', 'presentation', 'presentations',
    'talk', 'talks', 'speaking', 'workshop', 'workshops', 'panel', 'panels',
    'seminar', 'seminars', 'lecture', 'lectures', 'demo', 'demonstration',
    'break', 'breaks', 'lunch break', 'coffee break', 'networking',
    'reception', 'opening', 'closing', 'ceremony',
    
    // Content & Learning
    'topic', 'topics', 'subject', 'learn', 'learning', 'education',
    'training', 'course', 'class', 'attend', 'attending', 'participation',
    
    // Event Status
    'happening', 'going on', 'event', 'events', 'live', 'broadcast',
    'streaming', 'recorded', 'available', 'cancelled', 'postponed'
  ];

  // Conference venue location/directions
  private static readonly LOCATION_KEYWORDS = [
    // Venue Location
    'where is the conference', 'conference location', 'venue', 'venues',
    'location', 'address', 'place', 'building', 'facility',
    'convention center', 'conference center', 'hotel conference',
    
    // Navigation & Directions
    'directions', 'direction', 'how to get', 'how do i get', 'getting to',
    'navigate', 'navigation', 'map', 'maps', 'gps', 'route',
    'drive', 'driving', 'walk', 'walking', 'public transport',
    
    // Interior Layout
    'room', 'rooms', 'hall', 'halls', 'ballroom', 'auditorium',
    'floor', 'floors', 'level', 'levels', 'elevator', 'escalator',
    'stairs', 'entrance', 'exit', 'lobby', 'foyer', 'restroom',
    'bathroom', 'registration', 'check in', 'information desk'
  ];

  // Exhibitor/company queries  
  private static readonly EXHIBITOR_KEYWORDS = [
    // Exhibitors & Vendors
    'exhibitor', 'exhibitors', 'vendor', 'vendors', 'supplier', 'suppliers',
    'company', 'companies', 'business', 'businesses', 'organization',
    'organizations', 'firm', 'firms', 'corporation', 'corp',
    
    // Booth & Display
    'booth', 'booths', 'stand', 'stands', 'table', 'tables',
    'display', 'displays', 'showcase', 'showcases', 'demonstration',
    'booth number', 'booth #', 'booth num', 'stand number',
    
    // Sponsorship & Partnership
    'sponsor', 'sponsors', 'sponsoring', 'sponsorship', 'partner', 'partners',
    'partnership', 'supporter', 'supporters', 'backer', 'backers',
    
    // Information Seeking
    'who is at', 'which companies', 'what companies', 'list of',
    'tell me about', 'show me', 'find', 'search', 'look for',
    'information about', 'details about', 'more about',
    
    // Industry & Products
    'product', 'products', 'service', 'services', 'solution', 'solutions',
    'technology', 'software', 'hardware', 'provider', 'offering'
  ];

  static detectIntent(query: string): {
    isVenueQuery: boolean;
    isConferenceQuery: boolean;
    isLocationQuery: boolean;
    isExhibitorQuery: boolean;
    primaryIntent: 'venue' | 'conference' | 'location' | 'exhibitor' | 'general';
    confidence: number;
  } {
    const lowerQuery = query.toLowerCase();
    
    // More flexible keyword matching
    const findMatches = (keywords: string[]) => {
      return keywords.filter(keyword => {
        // Handle multi-word phrases with exact matching
        if (keyword.includes(' ')) {
          return lowerQuery.includes(keyword);
        }
        // For single words, use includes but also check for partial matches
        return lowerQuery.includes(keyword);
      });
    };
    
    // Check for matches in each category
    const venueMatches = findMatches(this.VENUE_KEYWORDS);
    const conferenceMatches = findMatches(this.CONFERENCE_KEYWORDS);
    const locationMatches = findMatches(this.LOCATION_KEYWORDS);
    const exhibitorMatches = findMatches(this.EXHIBITOR_KEYWORDS);

    const isVenueQuery = venueMatches.length > 0;
    const isConferenceQuery = conferenceMatches.length > 0;
    const isLocationQuery = locationMatches.length > 0;
    const isExhibitorQuery = exhibitorMatches.length > 0;
    
    // Determine primary intent with weighted scoring
    let primaryIntent: 'venue' | 'conference' | 'location' | 'exhibitor' | 'general' = 'general';
    
    // Weight exhibitor queries higher since they're most specific
    const weightedScores = [
      { type: 'exhibitor' as const, score: exhibitorMatches.length * 1.5 },
      { type: 'location' as const, score: locationMatches.length * 1.2 },
      { type: 'conference' as const, score: conferenceMatches.length },
      { type: 'venue' as const, score: venueMatches.length }
    ];
    
    // Sort by weighted score and get the highest
    weightedScores.sort((a, b) => b.score - a.score);
    if (weightedScores[0].score > 0) {
      primaryIntent = weightedScores[0].type;
    }
    
    // Calculate confidence based on match strength and query length
    const totalMatches = venueMatches.length + conferenceMatches.length + locationMatches.length + exhibitorMatches.length;
    const queryWords = query.split(' ').length;
    const confidence = totalMatches > 0 ? Math.min((totalMatches * 0.3) + (queryWords * 0.1), 1) : 0;
    
    console.log(`🎯 IntentDetector: "${query}" -> Primary: ${primaryIntent}, Venue: ${isVenueQuery}, Conference: ${isConferenceQuery}, Location: ${isLocationQuery}, Exhibitor: ${isExhibitorQuery} (confidence: ${confidence.toFixed(2)})`);
    
    return {
      isVenueQuery,
      isConferenceQuery,
      isLocationQuery,
      isExhibitorQuery,
      primaryIntent,
      confidence
    };
  }

  static needsVenueData(query: string): boolean {
    return this.detectIntent(query).isVenueQuery;
  }

  static getFillerResponse(query: string): string | null {
    const lowerQuery = query.toLowerCase();
    const intent = this.detectIntent(query);
    
    // Natural, conversational filler responses
    switch (intent.primaryIntent) {
      case 'exhibitor':
        // Specific exhibitor responses
        if (lowerQuery.includes('booth')) {
          const responses = [
            "Let me find that booth for you",
            "I'll look up that booth information",
            "Let me check where that booth is located"
          ];
          return responses[Math.floor(Math.random() * responses.length)];
        }
        if (lowerQuery.includes('companies') || lowerQuery.includes('vendor') || lowerQuery.includes('business')) {
          const responses = [
            "Let me check our exhibitor directory",
            "I'll look up those companies for you",
            "Let me see what vendors we have"
          ];
          return responses[Math.floor(Math.random() * responses.length)];
        }
        if (lowerQuery.includes('sponsor')) {
          const responses = [
            "Let me check our sponsor list",
            "I'll look up our conference sponsors",
            "Let me find that sponsor information"
          ];
          return responses[Math.floor(Math.random() * responses.length)];
        }
        // General exhibitor responses
        const exhibitorResponses = [
          "Let me check our exhibitor list",
          "I'll look that up in our vendor directory",
          "Let me find that information for you",
          "I'll search our exhibitor database"
        ];
        return exhibitorResponses[Math.floor(Math.random() * exhibitorResponses.length)];
        
      case 'venue':
        // Food & dining
        if (lowerQuery.includes('restaurant') || lowerQuery.includes('food') || lowerQuery.includes('eat')) {
          const responses = [
            "Let me check what restaurants are nearby",
            "I'll find some good dining options for you",
            "Let me see what food places are close by"
          ];
          return responses[Math.floor(Math.random() * responses.length)];
        }
        // Coffee
        if (lowerQuery.includes('coffee') || lowerQuery.includes('cafe')) {
          const responses = [
            "Let me find the nearest coffee shops",
            "I'll check what cafes are around here",
            "Let me look up coffee options nearby"
          ];
          return responses[Math.floor(Math.random() * responses.length)];
        }
        // Parking
        if (lowerQuery.includes('parking') || lowerQuery.includes('park')) {
          const responses = [
            "Let me find parking options for you",
            "I'll check available parking nearby",
            "Let me look up parking information"
          ];
          return responses[Math.floor(Math.random() * responses.length)];
        }
        // Hotels
        if (lowerQuery.includes('hotel') || lowerQuery.includes('accommodation')) {
          const responses = [
            "Let me check accommodation options",
            "I'll find hotel information for you",
            "Let me look up nearby hotels"
          ];
          return responses[Math.floor(Math.random() * responses.length)];
        }
        // General venue responses
        const venueResponses = [
          "Let me find that for you",
          "I'll check what's available nearby",
          "Let me look up local options",
          "I'll find that information"
        ];
        return venueResponses[Math.floor(Math.random() * venueResponses.length)];
        
      case 'conference':
        // Schedule & timing
        if (lowerQuery.includes('schedule') || lowerQuery.includes('agenda') || lowerQuery.includes('time')) {
          const responses = [
            "Let me check the conference schedule",
            "I'll look up the agenda for you",
            "Let me find those session times"
          ];
          return responses[Math.floor(Math.random() * responses.length)];
        }
        // Speakers
        if (lowerQuery.includes('speaker') || lowerQuery.includes('keynote')) {
          const responses = [
            "Let me look up our speakers",
            "I'll check the speaker lineup",
            "Let me find that speaker information"
          ];
          return responses[Math.floor(Math.random() * responses.length)];
        }
        // Sessions & events
        if (lowerQuery.includes('session') || lowerQuery.includes('workshop') || lowerQuery.includes('event')) {
          const responses = [
            "Let me check the session details",
            "I'll look up that event information",
            "Let me find those workshop details"
          ];
          return responses[Math.floor(Math.random() * responses.length)];
        }
        // What's happening now/next
        if (lowerQuery.includes('next') || lowerQuery.includes('now') || lowerQuery.includes('happening')) {
          const responses = [
            "Let me see what's coming up",
            "I'll check what's happening now",
            "Let me find the current schedule"
          ];
          return responses[Math.floor(Math.random() * responses.length)];
        }
        // General conference responses
        const conferenceResponses = [
          "Let me check the conference program",
          "I'll look that up for you",
          "Let me find that session information"
        ];
        return conferenceResponses[Math.floor(Math.random() * conferenceResponses.length)];
        
      case 'location':
        // Directions
        if (lowerQuery.includes('direction') || lowerQuery.includes('how to get') || lowerQuery.includes('navigate')) {
          const responses = [
            "Let me get directions for you",
            "I'll help you find your way there",
            "Let me look up the best route"
          ];
          return responses[Math.floor(Math.random() * responses.length)];
        }
        // Room/venue finding
        if (lowerQuery.includes('room') || lowerQuery.includes('hall') || lowerQuery.includes('where is')) {
          const responses = [
            "Let me find that location for you",
            "I'll help you locate that room",
            "Let me check where that is"
          ];
          return responses[Math.floor(Math.random() * responses.length)];
        }
        // General location responses
        const locationResponses = [
          "Let me get that location information",
          "I'll help you find that",
          "Let me look up those details"
        ];
        return locationResponses[Math.floor(Math.random() * locationResponses.length)];
        
      case 'general':
        // For longer queries without clear intent, provide generic helpful response
        if (query.split(' ').length >= 3) {
          const generalResponses = [
            "Let me look that up for you",
            "I'll find that information",
            "Let me check on that",
            "I'll help you with that"
          ];
          return generalResponses[Math.floor(Math.random() * generalResponses.length)];
        }
        return null;
        
      default:
        return null;
    }
  }
}