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

  // Committee meetings keywords
  private static readonly MEETING_KEYWORDS = [
    'meeting', 'meetings', 'committee', 'committees', 'council', 'councils',
    'board', 'panel', 'hearing', 'hearings', 'assembly', 'gather',
    'health care committee', 'adult corrections', 'legal issues committee',
    'community corrections', 'detention committee', 'faith based', 
    'staff wellness', 'behavioral health committee', 'nurses committee',
    'membership committee', 'restorative justice', 'ethics committee',
    'education directors', 'correctional industries', 'juvenile detention',
    'military corrections', 'sheriff council', 'awards committee',
    'substance use', 'moud', 'standards', 'accreditation', 'auditor'
  ];

  // Conference schedule/sessions/speakers
  private static readonly CONFERENCE_KEYWORDS = [
    // Schedule & Time
    'schedule', 'agenda', 'program', 'timeline', 'itinerary',
    'time', 'times', 'when', 'what time', 'start', 'starts', 'starting',
    'end', 'ends', 'ending', 'finish', 'finishes', 'duration',
    'today', 'tomorrow', 'morning', 'afternoon', 'evening', 'tonight',
    'now', 'current', 'currently', 'next', 'upcoming', 'later',
    
    // Tours
    'tour', 'tours', 'facility', 'facilities', 'correctional', 'prison', 'jail',
    'visit', 'visits', 'visiting', 'pickup', 'dropoff', 'bus', 'transportation',
    
    // Events & Sessions (removed workshop keywords - they'll have their own category)
    'session', 'sessions', 'keynote', 'keynotes', 'presentation', 'presentations',
    'talk', 'talks', 'speaking', 'panel', 'panels',
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

  // Workshop-specific keywords
  private static readonly WORKSHOP_KEYWORDS = [
    'workshop', 'workshops', 'training', 'trainings', 'seminar', 'seminars',
    'ce credit', 'ce credits', 'ceu', 'cme', 'cerp', 'continuing education',
    'learning objective', 'objectives', 'certificate', 'certification',
    'mental health workshop', 'substance abuse training', 'correctional training'
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
    isWorkshopQuery: boolean;
    isMeetingQuery: boolean;
    primaryIntent: 'venue' | 'conference' | 'location' | 'exhibitor' | 'workshop' | 'meeting' | 'general';
    confidence: number;
  } {
    const lowerQuery = query.toLowerCase();
    
    // Special case: AI Tech Expo should be treated as conference event, not exhibitor query
    const isAITechExpo = lowerQuery.includes('ai tech') || lowerQuery.includes('tech expo') || 
                         lowerQuery.includes('ai expo') || 
                         (lowerQuery.includes('ai') && lowerQuery.includes('expo'));
    
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
    const workshopMatches = findMatches(this.WORKSHOP_KEYWORDS);
    const meetingMatches = findMatches(this.MEETING_KEYWORDS);

    const isVenueQuery = venueMatches.length > 0;
    const isConferenceQuery = conferenceMatches.length > 0 || isAITechExpo;
    const isLocationQuery = locationMatches.length > 0;
    const isMeetingQuery = meetingMatches.length > 0;
    const isExhibitorQuery = exhibitorMatches.length > 0 && !isAITechExpo && !isMeetingQuery; // Exclude AI Tech Expo AND meeting queries from exhibitor queries
    const isWorkshopQuery = workshopMatches.length > 0;
    
    // Determine primary intent with weighted scoring
    let primaryIntent: 'venue' | 'conference' | 'location' | 'exhibitor' | 'workshop' | 'meeting' | 'general' = 'general';
    
    // Special priority for AI Tech Expo
    if (isAITechExpo) {
      primaryIntent = 'conference';
    } else {
      // Weight more specific queries higher
      const weightedScores = [
        { type: 'meeting' as const, score: meetingMatches.length * 2.0 }, // Meetings are very specific
        { type: 'workshop' as const, score: workshopMatches.length * 1.8 }, // Workshops are very specific
        { type: 'exhibitor' as const, score: isExhibitorQuery ? exhibitorMatches.length * 1.5 : 0 },
        { type: 'location' as const, score: locationMatches.length * 1.2 },
        { type: 'conference' as const, score: conferenceMatches.length },
        { type: 'venue' as const, score: venueMatches.length }
      ];
    
      // Sort by weighted score and get the highest
      weightedScores.sort((a, b) => b.score - a.score);
      if (weightedScores[0].score > 0) {
        primaryIntent = weightedScores[0].type;
      }
    }
    
    // Calculate confidence based on match strength and query length
    const totalMatches = venueMatches.length + conferenceMatches.length + locationMatches.length + exhibitorMatches.length + workshopMatches.length + meetingMatches.length;
    const queryWords = query.split(' ').length;
    const confidence = totalMatches > 0 ? Math.min((totalMatches * 0.3) + (queryWords * 0.1), 1) : 0;
    
    console.log(`🎯 IntentDetector: "${query}" -> Primary: ${primaryIntent}, Venue: ${isVenueQuery}, Conference: ${isConferenceQuery}, Location: ${isLocationQuery}, Exhibitor: ${isExhibitorQuery}, Workshop: ${isWorkshopQuery}, Meeting: ${isMeetingQuery} (confidence: ${confidence.toFixed(2)})`);
    
    return {
      isVenueQuery,
      isConferenceQuery,
      isLocationQuery,
      isExhibitorQuery,
      isWorkshopQuery,
      isMeetingQuery,
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
        // AI Tech Expo (Featured Event)
        if (lowerQuery.includes('ai tech') || lowerQuery.includes('tech expo') || 
            lowerQuery.includes('ai expo') || (lowerQuery.includes('saturday') && lowerQuery.includes('ai'))) {
          const responses = [
            "Let me get you information about the AI Tech Expo",
            "I'll find details about our featured AI Tech Expo",
            "Let me look up the AI Tech Expo information",
            "I'll get you the AI Tech Expo details"
          ];
          return responses[Math.floor(Math.random() * responses.length)];
        }
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
        
      case 'meeting':
        // Meeting-specific filler responses based on query type
        
        // Committee-specific queries
        if (lowerQuery.includes('health') || lowerQuery.includes('healthcare')) {
          const responses = [
            "Let me find the Health Care Committee meeting details",
            "I'll check the healthcare committee schedule",
            "Let me look up health committee meetings"
          ];
          return responses[Math.floor(Math.random() * responses.length)];
        }
        
        // Council meetings
        if (lowerQuery.includes('council')) {
          const responses = [
            "Let me find council meeting information",
            "I'll check the council meeting schedule",
            "Let me look up council sessions"
          ];
          return responses[Math.floor(Math.random() * responses.length)];
        }
        
        // Day-specific meetings
        if (lowerQuery.includes('friday') || lowerQuery.includes('saturday') || 
            lowerQuery.includes('sunday') || lowerQuery.includes('monday')) {
          const responses = [
            "Let me check the committee meeting schedule for that day",
            "I'll find meetings scheduled then",
            "Let me look up committee sessions for that day"
          ];
          return responses[Math.floor(Math.random() * responses.length)];
        }
        
        // Specific committees
        if (lowerQuery.includes('adult corrections') || lowerQuery.includes('detention') || 
            lowerQuery.includes('legal') || lowerQuery.includes('ethics')) {
          const responses = [
            "Let me find that committee meeting",
            "I'll check that committee's schedule",
            "Let me look up that committee session"
          ];
          return responses[Math.floor(Math.random() * responses.length)];
        }
        
        // General meeting responses
        const meetingResponses = [
          "Let me check the committee meeting schedule",
          "I'll find those meeting details",
          "Let me look up committee sessions",
          "I'll search for committee meetings",
          "Let me find meeting information for you"
        ];
        return meetingResponses[Math.floor(Math.random() * meetingResponses.length)];
        
      case 'workshop':
        // Workshop-specific filler responses based on query type
        
        // CE/CME/Credit queries
        if (lowerQuery.includes('credit') || lowerQuery.includes('ce ') || lowerQuery.includes('cme') || 
            lowerQuery.includes('ceu') || lowerQuery.includes('cerp')) {
          const responses = [
            "Let me find workshops with continuing education credits",
            "I'll search for sessions offering credits",
            "Let me look up CE credit workshops",
            "I'll check which workshops have credits available"
          ];
          return responses[Math.floor(Math.random() * responses.length)];
        }
        
        // Mental health workshops
        if (lowerQuery.includes('mental health') || lowerQuery.includes('psychiatric') || 
            lowerQuery.includes('psychological') || lowerQuery.includes('trauma')) {
          const responses = [
            "Let me find mental health workshops for you",
            "I'll search for behavioral health sessions",
            "Let me look up mental health training opportunities",
            "I'll find psychological wellness workshops"
          ];
          return responses[Math.floor(Math.random() * responses.length)];
        }
        
        // Substance abuse/addiction workshops
        if (lowerQuery.includes('substance') || lowerQuery.includes('addiction') || 
            lowerQuery.includes('drug') || lowerQuery.includes('alcohol')) {
          const responses = [
            "Let me search for substance abuse workshops",
            "I'll find addiction treatment sessions",
            "Let me look up substance use disorder training",
            "I'll check for addiction-related workshops"
          ];
          return responses[Math.floor(Math.random() * responses.length)];
        }
        
        // Day-specific workshops
        if (lowerQuery.includes('monday') || lowerQuery.includes('tuesday') || 
            lowerQuery.includes('wednesday') || lowerQuery.includes('thursday') || 
            lowerQuery.includes('friday') || lowerQuery.includes('saturday') || 
            lowerQuery.includes('sunday')) {
          const responses = [
            "Let me check the workshop schedule for that day",
            "I'll find workshops scheduled then",
            "Let me look up sessions for that day",
            "I'll see what workshops are available then"
          ];
          return responses[Math.floor(Math.random() * responses.length)];
        }
        
        // Medical/healthcare workshops
        if (lowerQuery.includes('medical') || lowerQuery.includes('healthcare') || 
            lowerQuery.includes('nursing') || lowerQuery.includes('clinical')) {
          const responses = [
            "Let me find medical workshops for you",
            "I'll search for healthcare training sessions",
            "Let me look up clinical workshops",
            "I'll find medical education sessions"
          ];
          return responses[Math.floor(Math.random() * responses.length)];
        }
        
        // Correctional/justice workshops
        if (lowerQuery.includes('correctional') || lowerQuery.includes('prison') || 
            lowerQuery.includes('jail') || lowerQuery.includes('justice')) {
          const responses = [
            "Let me find correctional training workshops",
            "I'll search for justice system sessions",
            "Let me look up correctional healthcare workshops",
            "I'll find corrections-focused training"
          ];
          return responses[Math.floor(Math.random() * responses.length)];
        }
        
        // Morning/afternoon/time-based queries
        if (lowerQuery.includes('morning') || lowerQuery.includes('afternoon') || 
            lowerQuery.includes('evening')) {
          const responses = [
            "Let me check workshop times for you",
            "I'll find sessions during that time",
            "Let me look up the workshop schedule",
            "I'll see what's available then"
          ];
          return responses[Math.floor(Math.random() * responses.length)];
        }
        
        // Speaker/presenter queries
        if (lowerQuery.includes('speaker') || lowerQuery.includes('presenter') || 
            lowerQuery.includes('moderator') || lowerQuery.includes('instructor')) {
          const responses = [
            "Let me find workshops by that speaker",
            "I'll search for sessions with that presenter",
            "Let me look up who's presenting",
            "I'll find workshops led by that person"
          ];
          return responses[Math.floor(Math.random() * responses.length)];
        }
        
        // Training/education queries
        if (lowerQuery.includes('training') || lowerQuery.includes('education') || 
            lowerQuery.includes('learning')) {
          const responses = [
            "Let me find training workshops for you",
            "I'll search for educational sessions",
            "Let me look up professional development workshops",
            "I'll find learning opportunities"
          ];
          return responses[Math.floor(Math.random() * responses.length)];
        }
        
        // General workshop responses (fallback)
        const workshopResponses = [
          "Let me search our workshop offerings",
          "I'll find relevant workshops for you",
          "Let me look through the workshop schedule",
          "I'll check what workshops are available",
          "Let me find those sessions for you",
          "I'll search for workshops that match",
          "Let me look up workshop details",
          "I'll find the best workshops for your interests"
        ];
        return workshopResponses[Math.floor(Math.random() * workshopResponses.length)];
        
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