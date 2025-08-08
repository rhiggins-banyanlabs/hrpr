// Enhanced intent detection with comprehensive keyword coverage and natural responses
export class IntentDetectorService {
  // Places/venues outside the conference (restaurants, hotels, etc)
  private static readonly VENUE_KEYWORDS = [
    // Food & Dining (removed generic 'food', 'parking' since they're in conference info)
    'restaurant', 'restaurants', 'eating', 'dining', 'dine',
    'breakfast', 'brunch', 'meal', 'meals',
    'coffee shop', 'cafe', 'cafes', 'espresso', 'latte', 'cappuccino', 'starbucks',
    'bar', 'bars', 'drink', 'drinks', 'pub', 'pubs', 'brewery', 'breweries',
    'alcohol', 'beer', 'wine', 'cocktail', 'cocktails', 'happy hour',
    'pizza', 'burger', 'burgers', 'sandwich', 'sushi', 'chinese', 'italian',
    'mexican', 'thai', 'indian', 'fast food', 'takeout', 'delivery',
    
    // Transportation (removed 'parking', 'park', 'garage' since they're in conference info)
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

  // General conference information keywords
  private static readonly CONFERENCE_INFO_KEYWORDS = [
    'badge', 'lost badge', 'replacement badge', 'credential', 'name tag',
    'parking', 'park', 'garage', 'car', 'vehicle',
    'disability', 'wheelchair', 'accessible', 'assistance', 'special needs',
    'lost and found', 'lost', 'found', 'missing', 'left behind',
    'smoking', 'smoke', 'cigarette', 'vaping',
    'photo', 'photography', 'pictures', 'video', 'recording', 'camera',
    'social media', 'facebook', 'twitter', 'instagram', 'linkedin',
    'worship', 'prayer', 'church', 'religious service', 'faith service',
    'prize', 'raffle', 'drawing', 'gift card', 'win', 'contest',
    'business center', 'fedex', 'printing', 'copies', 'shipping', 'mail', 'print',
    'cell phone', 'phone policy', 'silence phone', 'mobile', 'ringer',
    'continuing education', 'ce', 'ceu', 'credits', 'certification',
    'solicitation', 'flyers', 'brochures', 'materials', 'handouts',
    'exhibitor service', 'service counter', 'exhibitor counter', 'exhibitor desk',
    'show management', 'management office', 'aca office'
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
    primaryIntent: 'venue' | 'conference' | 'location' | 'exhibitor' | 'workshop' | 'meeting' | 'info' | 'general';
    confidence: number;
  } {
    const lowerQuery = query.toLowerCase();
    
    // Special case: AIDA demo vs ADA assistance
    // In voice, "AIDA" will be transcribed as "ada"
    // If someone says "ada demo" they likely mean AIDA demo
    const isAIDADemo = (lowerQuery.includes('ada') && lowerQuery.includes('demo')) ||
                       lowerQuery.includes('aida') || 
                       lowerQuery.includes('aided demo') ||
                       lowerQuery.includes('a.i.d.a') ||
                       lowerQuery.includes('a i d a');
    
    // ADA assistance - only if it's clearly about accessibility
    // Exclude if it mentions "demo" (likely AIDA)
    const isADAAssistance = !lowerQuery.includes('demo') && (
      (lowerQuery.includes('ada') && (
        lowerQuery.includes('assist') || 
        lowerQuery.includes('help') ||
        lowerQuery.includes('access') ||
        lowerQuery.includes('disab') ||
        lowerQuery.includes('wheelchair') ||
        lowerQuery.includes('need')  // "I need ada"
      )) ||
      // Just "ada" alone is likely accessibility
      (lowerQuery === 'ada') ||
      (lowerQuery === 'i need ada')
    );
    
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
    const conferenceInfoMatches = findMatches(this.CONFERENCE_INFO_KEYWORDS);

    // Special case: Don't treat "room [number]" as venue query when it's about conference rooms
    const isConferenceRoomContext = /\broom\s+\d+\b/i.test(query) || // "room 106"
                                   (lowerQuery.includes('room') && (workshopMatches.length > 0 || 
                                    lowerQuery.includes('session') || lowerQuery.includes('workshop') ||
                                    lowerQuery.includes('conference') || lowerQuery.includes('meeting')));

    // Special case: Speaker queries should be treated as workshop queries since speaker info is in workshop data
    const isSpeakerQuery = lowerQuery.includes('speaker') || lowerQuery.includes('speakers') || 
                           lowerQuery.includes('presenter') || lowerQuery.includes('presenters') ||
                           lowerQuery.includes('moderator') || lowerQuery.includes('moderators') ||
                           lowerQuery.includes('instructor') || lowerQuery.includes('instructors');

    const isVenueQuery = venueMatches.length > 0 && !isConferenceRoomContext; // Don't treat conference rooms as venue queries
    const isConferenceQuery = conferenceMatches.length > 0 || isAITechExpo;
    const isLocationQuery = locationMatches.length > 0;
    const isMeetingQuery = meetingMatches.length > 0;
    const isExhibitorQuery = (exhibitorMatches.length > 0 || isAIDADemo) && !isAITechExpo && !isMeetingQuery; // Include AIDA demo as exhibitor query
    const isWorkshopQuery = workshopMatches.length > 0 || isSpeakerQuery; // Include speaker queries as workshop queries
    const isConferenceInfoQuery = (conferenceInfoMatches.length > 0 || isADAAssistance) && !isAIDADemo; // Include ADA assistance but exclude AIDA demo
    
    // Determine primary intent with weighted scoring
    let primaryIntent: 'venue' | 'conference' | 'location' | 'exhibitor' | 'workshop' | 'meeting' | 'info' | 'general' = 'general';
    
    // Special priority for specific cases
    if (isAIDADemo) {
      // AIDA demo should be treated as an exhibitor query
      primaryIntent = 'exhibitor';
    } else if (isADAAssistance) {
      // ADA assistance should be treated as info query
      primaryIntent = 'info';
    } else if (isAITechExpo) {
      primaryIntent = 'conference';
    } else if (isSpeakerQuery) {
      // Speaker queries should always be treated as workshop queries since speaker info is in workshop data
      primaryIntent = 'workshop';
    } else if (workshopMatches.length > 0) {
      // If workshop is explicitly mentioned, prioritize it over info queries
      primaryIntent = 'workshop';
    } else {
      // Weight more specific queries higher
      const weightedScores = [
        { type: 'info' as const, score: conferenceInfoMatches.length * 2.5 }, // Conference info is highest priority
        { type: 'meeting' as const, score: meetingMatches.length * 2.0 }, // Meetings are very specific
        { type: 'workshop' as const, score: (workshopMatches.length + (isSpeakerQuery ? 1 : 0)) * 1.8 }, // Workshops are very specific, boost for speaker queries
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
    const totalMatches = venueMatches.length + conferenceMatches.length + locationMatches.length + exhibitorMatches.length + workshopMatches.length + meetingMatches.length + conferenceInfoMatches.length + (isSpeakerQuery ? 1 : 0);
    const queryWords = query.split(' ').length;
    const confidence = totalMatches > 0 ? Math.min((totalMatches * 0.3) + (queryWords * 0.1), 1) : 0;
    
    console.log(`🎯 IntentDetector: "${query}" -> Primary: ${primaryIntent}, Venue: ${isVenueQuery}, Conference: ${isConferenceQuery}, Location: ${isLocationQuery}, Exhibitor: ${isExhibitorQuery}, Workshop: ${isWorkshopQuery}, Meeting: ${isMeetingQuery}, Speaker: ${isSpeakerQuery} (confidence: ${confidence.toFixed(2)})`);
    
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
    
    // Helper function to add variety and prevent audio cutoff
    const addPausePrefix = (responses: string[]): string => {
      const selected = responses[Math.floor(Math.random() * responses.length)];
      // Add variety with occasional prefix variations
      const prefixes = [
        "...",  // Small pause
        "... ",  // Slightly longer pause
        "... Absolutely! ",  // Enthusiastic
        "... Sure thing! ",  // Friendly
        "... Of course! ",  // Helpful
        "... "
      ];
      const prefix = Math.random() > 0.7 ? prefixes[Math.floor(Math.random() * prefixes.length)] : "...";
      return prefix + selected;
    };
    
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
          return addPausePrefix(responses);
        }
        if (lowerQuery.includes('companies') || lowerQuery.includes('vendor') || lowerQuery.includes('business')) {
          const responses = [
            "Let me check our exhibitor directory",
            "I'll look up those companies for you",
            "Let me see what vendors we have"
          ];
          return addPausePrefix(responses);
        }
        if (lowerQuery.includes('sponsor')) {
          const responses = [
            "Let me check our sponsor list",
            "I'll look up our conference sponsors",
            "Let me find that sponsor information"
          ];
          return addPausePrefix(responses);
        }
        // General exhibitor responses
        const exhibitorResponses = [
          "Let me check our exhibitor list",
          "I'll look that up in our vendor directory",
          "Let me find that information for you",
          "I'll search our exhibitor database",
          "Let me see who's exhibiting",
          "I'll check our vendor listings",
          "Let me pull up that exhibitor info"
        ];
        return addPausePrefix(exhibitorResponses);
        
      case 'venue':
        // Food & dining
        if (lowerQuery.includes('restaurant') || lowerQuery.includes('food') || lowerQuery.includes('eat')) {
          const responses = [
            "Let me check what restaurants are nearby",
            "I'll find some good dining options for you",
            "Let me see what food places are close by"
          ];
          return addPausePrefix(responses);
        }
        // Coffee
        if (lowerQuery.includes('coffee') || lowerQuery.includes('cafe') || lowerQuery.includes('starbucks')) {
          const responses = [
            "Let me find the nearest coffee shops",
            "I'll check what cafes are around here",
            "Let me look up coffee options nearby",
            "I'll find you some caffeine options",
            "Let me locate coffee shops for you",
            "I'll search for nearby coffee places"
          ];
          return addPausePrefix(responses);
        }
        // Parking
        if (lowerQuery.includes('parking') || lowerQuery.includes('park')) {
          const responses = [
            "Let me find parking options for you",
            "I'll check available parking nearby",
            "Let me look up parking information"
          ];
          return addPausePrefix(responses);
        }
        // Hotels
        if (lowerQuery.includes('hotel') || lowerQuery.includes('accommodation')) {
          const responses = [
            "Let me check accommodation options",
            "I'll find hotel information for you",
            "Let me look up nearby hotels"
          ];
          return addPausePrefix(responses);
        }
        // General venue responses
        const venueResponses = [
          "Let me find that for you",
          "I'll check what's available nearby",
          "Let me look up local options",
          "I'll find that information",
          "Let me search the area for you",
          "I'll see what's close by",
          "Let me check nearby options"
        ];
        return addPausePrefix(venueResponses);
        
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
          return addPausePrefix(responses);
        }
        // Schedule & timing
        if (lowerQuery.includes('schedule') || lowerQuery.includes('agenda') || lowerQuery.includes('time')) {
          const responses = [
            "Let me check the conference schedule",
            "I'll look up the agenda for you",
            "Let me find those session times"
          ];
          return addPausePrefix(responses);
        }
        // Speakers
        if (lowerQuery.includes('speaker') || lowerQuery.includes('keynote')) {
          const responses = [
            "Let me look up our speakers",
            "I'll check the speaker lineup",
            "Let me find that speaker information"
          ];
          return addPausePrefix(responses);
        }
        // Sessions & events
        if (lowerQuery.includes('session') || lowerQuery.includes('workshop') || lowerQuery.includes('event')) {
          const responses = [
            "Let me check the session details",
            "I'll look up that event information",
            "Let me find those workshop details"
          ];
          return addPausePrefix(responses);
        }
        // What's happening now/next
        if (lowerQuery.includes('next') || lowerQuery.includes('now') || lowerQuery.includes('happening')) {
          const responses = [
            "Let me see what's coming up",
            "I'll check what's happening now",
            "Let me find the current schedule"
          ];
          return addPausePrefix(responses);
        }
        // General conference responses
        const conferenceResponses = [
          "Let me check the conference program",
          "I'll look that up for you",
          "Let me find that session information",
          "I'll check the conference details",
          "Let me pull up that information",
          "I'll search the conference schedule"
        ];
        return addPausePrefix(conferenceResponses);
        
      case 'location':
        // Directions
        if (lowerQuery.includes('direction') || lowerQuery.includes('how to get') || lowerQuery.includes('navigate')) {
          const responses = [
            "Let me get directions for you",
            "I'll help you find your way there",
            "Let me look up the best route"
          ];
          return addPausePrefix(responses);
        }
        // Room/venue finding
        if (lowerQuery.includes('room') || lowerQuery.includes('hall') || lowerQuery.includes('where is')) {
          const responses = [
            "Let me find that location for you",
            "I'll help you locate that room",
            "Let me check where that is"
          ];
          return addPausePrefix(responses);
        }
        // General location responses
        const locationResponses = [
          "Let me get that location information",
          "I'll help you find that",
          "Let me look up those details"
        ];
        return addPausePrefix(locationResponses);
        
      case 'info':
        // Conference information filler responses with variety
        
        // Badge-related queries
        if (lowerQuery.includes('badge') || lowerQuery.includes('credential') || lowerQuery.includes('name tag')) {
          const badgeResponses = [
            "Let me get badge information for you",
            "I'll find the badge policy details",
            "Let me look up badge requirements",
            "I'll check the badge information"
          ];
          return addPausePrefix(badgeResponses);
        }
        
        // Parking queries
        if (lowerQuery.includes('parking') || lowerQuery.includes('park') || lowerQuery.includes('garage')) {
          const parkingResponses = [
            "I'll find parking information",
            "Let me check parking options for you",
            "I'll look up parking details",
            "Let me get the parking information"
          ];
          return addPausePrefix(parkingResponses);
        }
        
        // Food/dining queries
        if (lowerQuery.includes('food') || lowerQuery.includes('eat') || lowerQuery.includes('dining') || 
            lowerQuery.includes('lunch') || lowerQuery.includes('breakfast')) {
          const foodResponses = [
            "Let me check dining options",
            "I'll find food service information",
            "Let me look up dining locations",
            "I'll get the food service details"
          ];
          return addPausePrefix(foodResponses);
        }
        
        // Lost and found queries
        if (lowerQuery.includes('lost') || lowerQuery.includes('found') || lowerQuery.includes('missing')) {
          const lostFoundResponses = [
            "I'll help you with lost and found information",
            "Let me find the lost and found procedure",
            "I'll get lost and found details for you",
            "Let me check the lost and found policy"
          ];
          return addPausePrefix(lostFoundResponses);
        }
        
        // AIDA demo queries - "ada demo" in voice means AIDA
        if ((lowerQuery.includes('ada') && lowerQuery.includes('demo')) ||
            lowerQuery.includes('aida') || lowerQuery.includes('aided demo')) {
          const aidaResponses = [
            "Let me find information about the AIDA demo",
            "I'll look up the AIDA demonstration for you",
            "Let me check the exhibitor information for AIDA",
            "I'll find details about the AIDA demo"
          ];
          return addPausePrefix(aidaResponses);
        }
        
        // ADA/Accessibility queries (only if NOT a demo)
        if (!lowerQuery.includes('demo') &&
            (lowerQuery.includes('ada') || lowerQuery.includes('wheelchair') || 
             lowerQuery.includes('accessible') || lowerQuery.includes('disability'))) {
          const adaResponses = [
            "Let me find accessibility information",
            "I'll get ADA assistance details",
            "Let me look up accessibility services",
            "I'll find assistance information for you"
          ];
          return addPausePrefix(adaResponses);
        }
        
        // Business center/FedEx queries
        if (lowerQuery.includes('fedex') || lowerQuery.includes('business center') || lowerQuery.includes('print') || 
            lowerQuery.includes('ship') || lowerQuery.includes('copy')) {
          const businessResponses = [
            "Let me find business center information",
            "I'll locate FedEx services for you",
            "Let me check printing and shipping options",
            "I'll find the business services details"
          ];
          return addPausePrefix(businessResponses);
        }
        
        // Photography/recording queries
        if (lowerQuery.includes('photo') || lowerQuery.includes('picture') || lowerQuery.includes('video') || 
            lowerQuery.includes('recording') || lowerQuery.includes('camera')) {
          const photoResponses = [
            "Let me check the photography policy",
            "I'll find photo and video guidelines",
            "Let me look up recording policies",
            "I'll get the photography rules for you"
          ];
          return addPausePrefix(photoResponses);
        }
        
        // Smoking/vaping queries
        if (lowerQuery.includes('smok') || lowerQuery.includes('cigarette') || lowerQuery.includes('vap')) {
          const smokingResponses = [
            "Let me find the smoking policy",
            "I'll check smoking area information",
            "Let me look up smoking guidelines",
            "I'll get the smoking rules for you"
          ];
          return addPausePrefix(smokingResponses);
        }
        
        // Social media queries
        if (lowerQuery.includes('social media') || lowerQuery.includes('facebook') || lowerQuery.includes('twitter') || 
            lowerQuery.includes('instagram') || lowerQuery.includes('linkedin')) {
          const socialResponses = [
            "Let me find our social media information",
            "I'll get the social media handles",
            "Let me look up our social channels",
            "I'll find the social media details"
          ];
          return addPausePrefix(socialResponses);
        }
        
        // Prize/raffle queries
        if (lowerQuery.includes('prize') || lowerQuery.includes('raffle') || lowerQuery.includes('drawing') || 
            lowerQuery.includes('win') || lowerQuery.includes('contest')) {
          const prizeResponses = [
            "Let me find prize drawing information",
            "I'll get the raffle details for you",
            "Let me check the contest information",
            "I'll look up prize drawing rules"
          ];
          return addPausePrefix(prizeResponses);
        }
        
        // Worship/religious service queries
        if (lowerQuery.includes('worship') || lowerQuery.includes('prayer') || lowerQuery.includes('church') || 
            lowerQuery.includes('religious') || lowerQuery.includes('faith')) {
          const worshipResponses = [
            "Let me find worship service information",
            "I'll check the religious service schedule",
            "Let me look up worship times",
            "I'll get faith service details"
          ];
          return addPausePrefix(worshipResponses);
        }
        
        // Continuing education queries
        if (lowerQuery.includes('ce ') || lowerQuery.includes('ceu') || lowerQuery.includes('continuing education') || 
            lowerQuery.includes('credit')) {
          const ceResponses = [
            "Let me find continuing education information",
            "I'll check CE credit details",
            "Let me look up professional development options",
            "I'll get continuing education requirements"
          ];
          return addPausePrefix(ceResponses);
        }
        
        // Cell phone policy queries
        if (lowerQuery.includes('cell phone') || lowerQuery.includes('phone policy') || lowerQuery.includes('silence')) {
          const phoneResponses = [
            "Let me check the cell phone policy",
            "I'll find phone usage guidelines",
            "Let me look up mobile device rules",
            "I'll get the phone policy for you"
          ];
          return addPausePrefix(phoneResponses);
        }
        
        // Exhibitor service counter queries
        if (lowerQuery.includes('exhibitor service') || lowerQuery.includes('service counter') || 
            lowerQuery.includes('exhibitor counter') || lowerQuery.includes('exhibitor desk')) {
          const exhibitorServiceResponses = [
            "Let me find the exhibitor service counter location",
            "I'll locate exhibitor support services",
            "Let me check the service counter information",
            "I'll find exhibitor assistance details"
          ];
          return addPausePrefix(exhibitorServiceResponses);
        }
        
        // Show management queries
        if (lowerQuery.includes('show management') || lowerQuery.includes('management office') || 
            lowerQuery.includes('aca office')) {
          const managementResponses = [
            "Let me find the show management office",
            "I'll locate the ACA office for you",
            "Let me check management office details",
            "I'll find show administration information"
          ];
          return addPausePrefix(managementResponses);
        }
        
        // General fallback responses for info queries
        const infoResponses = [
          "Let me find that conference information",
          "I'll get those details for you",
          "Let me look up that information",
          "I'll search for that conference detail",
          "Let me check our conference resources",
          "I'll find that information for you",
          "Let me look into that",
          "I'll retrieve those details"
        ];
        return addPausePrefix(infoResponses);
        
      case 'meeting':
        // Meeting-specific filler responses based on query type
        
        // Committee-specific queries
        if (lowerQuery.includes('health') || lowerQuery.includes('healthcare')) {
          const responses = [
            "Let me find the Health Care Committee meeting details",
            "I'll check the healthcare committee schedule",
            "Let me look up health committee meetings"
          ];
          return addPausePrefix(responses);
        }
        
        // Council meetings
        if (lowerQuery.includes('council')) {
          const responses = [
            "Let me find council meeting information",
            "I'll check the council meeting schedule",
            "Let me look up council sessions"
          ];
          return addPausePrefix(responses);
        }
        
        // Day-specific meetings
        if (lowerQuery.includes('friday') || lowerQuery.includes('saturday') || 
            lowerQuery.includes('sunday') || lowerQuery.includes('monday')) {
          const responses = [
            "Let me check the committee meeting schedule for that day",
            "I'll find meetings scheduled then",
            "Let me look up committee sessions for that day"
          ];
          return addPausePrefix(responses);
        }
        
        // Specific committees
        if (lowerQuery.includes('adult corrections') || lowerQuery.includes('detention') || 
            lowerQuery.includes('legal') || lowerQuery.includes('ethics')) {
          const responses = [
            "Let me find that committee meeting",
            "I'll check that committee's schedule",
            "Let me look up that committee session"
          ];
          return addPausePrefix(responses);
        }
        
        // General meeting responses
        const meetingResponses = [
          "Let me check the committee meeting schedule",
          "I'll find those meeting details",
          "Let me look up committee sessions",
          "I'll search for committee meetings",
          "Let me find meeting information for you"
        ];
        return addPausePrefix(meetingResponses);
        
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
          return addPausePrefix(responses);
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
          return addPausePrefix(responses);
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
          return addPausePrefix(responses);
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
          return addPausePrefix(responses);
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
          return addPausePrefix(responses);
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
          return addPausePrefix(responses);
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
          return addPausePrefix(responses);
        }
        
        // Speaker/presenter queries
        if (lowerQuery.includes('speaker') || lowerQuery.includes('presenter') || 
            lowerQuery.includes('moderator') || lowerQuery.includes('instructor')) {
          // Check if they're asking about a specific person or general speakers
          const hasSpecificPerson = /\b[A-Z][a-z]+ [A-Z][a-z]+\b/.test(query) || // Name pattern like "John Smith"
                                   lowerQuery.includes(' by ') || lowerQuery.includes(' with ') ||
                                   lowerQuery.includes(' from ');
          
          const responses = hasSpecificPerson ? [
            "Let me find workshops by that speaker",
            "I'll search for sessions with that presenter",
            "I'll find workshops led by that person"
          ] : [
            "Let me look up our workshop speakers",
            "I'll find the speaker lineup for you",
            "Let me check who's presenting",
            "I'll search for workshop presenters"
          ];
          return addPausePrefix(responses);
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
          return addPausePrefix(responses);
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
        return addPausePrefix(workshopResponses);
        
      case 'general':
        // For longer queries without clear intent, provide generic helpful response
        if (query.split(' ').length >= 3) {
          const generalResponses = [
            "Let me look that up for you",
            "I'll find that information",
            "Let me check on that",
            "I'll help you with that"
          ];
          return addPausePrefix(generalResponses);
        }
        return null;
        
      default:
        return null;
    }
  }
}