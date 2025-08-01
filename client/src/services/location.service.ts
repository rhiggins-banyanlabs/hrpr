// src/services/location.service.ts
export interface Place {
  name: string;
  vicinity: string;
  formatted_address?: string; // Added for specific addresses
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  opening_hours?: {
    open_now?: boolean;
  };
}

export interface LocationIntent {
  hasLocationIntent: boolean;
  type?: string;
  keyword?: string;
  radius?: number;
}

export class LocationService {
  private readonly DENVER_COORDINATES = { lat: 39.7392, lng: -104.9903 };
  private readonly CONFERENCE_VENUE = {
    lat: 39.7432,
    lng: -104.9959,
    name: 'Denver Convention Center',
    address: '700 14th St, Denver, CO 80202',
    placeId: 'ChIJhx9-ra97bIcRqFJmfNLB4ps'
  };
  private readonly HOST_HOTEL = {
    lat: 39.7435,
    lng: -104.9954,
    name: 'Hyatt Regency Denver (Host Hotel)',
    address: '650 15th St, Denver, CO 80202',
    placeId: 'ChIJ2f_jrK97bIcR8Cw1hFwbESo'
  };

  getConferenceVenue() {
    return this.CONFERENCE_VENUE;
  }

  getHostHotel() {
    return this.HOST_HOTEL;
  }

  /**
   * Detect location intent matching your useGoogleMaps hook patterns
   */
  detectLocationIntent(text: string): LocationIntent | null {
    const lowerText = text.toLowerCase();
    
    console.log(`🔍 Location intent detection for: "${text}" - FUNCTION CALLED - VERSION 2`);
    
    // Conference-specific locations
    if (lowerText.includes('convention center') || lowerText.includes('conference venue') || 
        lowerText.includes('event location')) {
      console.log(`📍 Detected: convention center`);
      return { hasLocationIntent: true, keyword: 'convention center' };
    }
    
    if (lowerText.includes('hyatt') || lowerText.includes('host hotel') || 
        (lowerText.includes('hotel') && lowerText.includes('stay'))) {
      console.log(`📍 Detected: host hotel`);
      return { hasLocationIntent: true, keyword: 'hyatt regency denver' };
    }
    
    // Food & restaurant queries with cuisine detection
    const cuisineTypes = [
      'sushi', 'pizza', 'burger', 'italian', 'mexican', 'chinese', 'thai', 
      'indian', 'bbq', 'steak', 'seafood', 'vegetarian', 'vegan', 'gluten-free'
    ];
    
    for (const cuisine of cuisineTypes) {
      if (lowerText.includes(cuisine)) {
        return {
          hasLocationIntent: true,
          type: 'restaurant',
          keyword: cuisine,
          radius: 2000
        };
      }
    }
    
    // Location patterns from your hook - ORDER MATTERS! More specific patterns first
    const fastFoodPattern = /fast.?food|mcdonald|burger.?king|wendy|subway|taco.?bell|kfc|pizza.?hut|domino/i;
    const restaurantPattern = /restaurant|food|eat|dinner|lunch|breakfast/i;
    const cafePattern = /coffee|cafe|espresso|tea/i;
    const hotelPattern = /hotel|stay|accommodation|room|sleep/i;
    const barPattern = /bar|drink|pub|alcohol|beer|wine/i;
    const attractionPattern = /attraction|visit|sightseeing|tour/i;
    const shoppingPattern = /shopping|mall|store|retail|shop/i;
    const gasPattern = /gas|gasoline|fuel|petrol|station/i;
    const parkPattern = /park|playground|recreation|outdoor/i;
    const pharmacyPattern = /pharmacy|drugstore|cvs|walgreens|rite.?aid|medicine/i;
    const bankPattern = /bank|atm|credit.?union|financial/i;
    const gymPattern = /gym|fitness|workout|exercise/i;
    const nearbyPattern = /nearby|close|walking distance|near/i;
    
    // Debug pattern matching
    console.log(`🔍 Testing fast food pattern: "${lowerText}" matches ${fastFoodPattern.test(lowerText)}`);
    console.log(`🔍 Pattern: ${fastFoodPattern}`);
    console.log(`🔍 About to test fast food if statement...`);
    console.log(`🔍 Reached the point before fast food if statement`);
    
    // TEST FAST FOOD FIRST (before restaurant pattern catches it)
    console.log(`🔍 Testing if statement now...`);
    if (fastFoodPattern.test(lowerText)) {
      console.log(`🍔 Detected: fast food pattern - ENTERING FAST FOOD BLOCK - VERSION 2`);
      // Extract specific fast food chains or use general fast food search
      let keyword = 'fast food';
      
      // Check for specific chains first
      const specificChains = ['mcdonalds', 'burger king', 'wendys', 'subway', 'taco bell', 'kfc', 'pizza hut', 'dominos'];
      for (const chain of specificChains) {
        if (lowerText.includes(chain)) {
          keyword = chain;
          console.log(`🍔 Found specific chain: ${chain}`);
          break;
        }
      }
      
      console.log(`🍔 Fast food search: type=restaurant, keyword=${keyword}`);
      return { 
        hasLocationIntent: true,
        type: 'restaurant', 
        keyword: keyword,
        radius: nearbyPattern.test(lowerText) ? 1500 : 3000 
      };
    }
    
    if (restaurantPattern.test(lowerText)) {
      return { 
        hasLocationIntent: true,
        type: 'restaurant', 
        radius: nearbyPattern.test(lowerText) ? 800 : 2000 
      };
    }
    
    if (cafePattern.test(lowerText)) {
      return { 
        hasLocationIntent: true,
        type: 'cafe', 
        radius: nearbyPattern.test(lowerText) ? 600 : 1500 
      };
    }
    
    if (hotelPattern.test(lowerText) && !lowerText.includes('host hotel')) {
      return { 
        hasLocationIntent: true,
        type: 'lodging', 
        radius: 3000 
      };
    }
    
    if (barPattern.test(lowerText)) {
      return { 
        hasLocationIntent: true,
        type: 'bar', 
        radius: nearbyPattern.test(lowerText) ? 800 : 2000 
      };
    }
    
    if (attractionPattern.test(lowerText)) {
      return { 
        hasLocationIntent: true,
        type: 'tourist_attraction', 
        radius: 5000 
      };
    }
    
    if (shoppingPattern.test(lowerText)) {
      return { 
        hasLocationIntent: true,
        type: 'shopping_mall', 
        radius: nearbyPattern.test(lowerText) ? 2000 : 5000 
      };
    }
    
    if (gasPattern.test(lowerText)) {
      return { 
        hasLocationIntent: true,
        type: 'gas_station', 
        radius: nearbyPattern.test(lowerText) ? 3000 : 8000 
      };
    }
    
    if (parkPattern.test(lowerText)) {
      return { 
        hasLocationIntent: true,
        type: 'park', 
        radius: nearbyPattern.test(lowerText) ? 2000 : 5000 
      };
    }
    
    if (pharmacyPattern.test(lowerText)) {
      return { 
        hasLocationIntent: true,
        type: 'pharmacy', 
        radius: nearbyPattern.test(lowerText) ? 1500 : 3000 
      };
    }
    
    if (bankPattern.test(lowerText)) {
      return { 
        hasLocationIntent: true,
        type: 'bank', 
        radius: nearbyPattern.test(lowerText) ? 1500 : 3000 
      };
    }
    
    if (gymPattern.test(lowerText)) {
      return { 
        hasLocationIntent: true,
        type: 'gym', 
        radius: nearbyPattern.test(lowerText) ? 2000 : 5000 
      };
    }
    
    // General location queries
    if (lowerText.includes('where is') || lowerText.includes('how do i get to') || 
        lowerText.includes('directions to') || lowerText.includes('find on map')) {
      return { hasLocationIntent: true };
    }
    
    // Catch-all for any location-related queries with "nearby" or "close"
    // Only trigger if it contains "nearby" AND one of these generic location words
    if (nearbyPattern.test(lowerText) && (
        lowerText.includes('place') || lowerText.includes('thing') || 
        lowerText.includes('spot') || lowerText.includes('area') ||
        lowerText.includes('around') || lowerText.includes('here')
    )) {
      return { 
        hasLocationIntent: true,
        type: 'establishment', // General search for any nearby places
        radius: 2000 
      };
    }
    
    // Final catch-all for any query with "nearby" that didn't match specific patterns
    if (nearbyPattern.test(lowerText)) {
      console.log(`📍 Detected: general nearby catch-all`);
      return { 
        hasLocationIntent: true,
        type: 'establishment', // General search for any nearby places
        radius: 2000 
      };
    }
    
    console.log(`❌ No location intent detected`);
    return null;
  }

  /**
   * Search for nearby places using server-side API route
   */
  async searchNearbyPlaces(
    type?: string, 
    keyword?: string, 
    radius: number = 1500
  ): Promise<Place[]> {
    try {
      const params = new URLSearchParams({
        radius: radius.toString()
      });
      
      if (type) {
        params.append('type', type);
      }
      
      if (keyword) {
        params.append('keyword', keyword);
      }

      console.log(`🗺️ Searching for places: type=${type}, keyword=${keyword}, radius=${radius}`);

      const response = await fetch(`/api/places?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(5000)
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`📍 Found ${data.results?.length || 0} places`);
        return data.results || [];
      }
      
      console.error('❌ Failed to fetch places:', response.status, response.statusText);
      return [];
    } catch (error) {
      console.error('❌ Error searching nearby places:', error);
      return [];
    }
  }

  /**
   * Calculate walking distance and time between two points
   */
  calculateWalkingDistance(lat1: number, lng1: number, lat2: number, lng2: number): {
    distance: string;
    walkingTime: string;
  } {
    const R = 3959; // Radius of Earth in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distanceMiles = R * c;
    
    // Convert to appropriate unit
    let distance: string;
    if (distanceMiles < 0.2) {
      distance = `${Math.round(distanceMiles * 5280)} feet`;
    } else {
      distance = `${distanceMiles.toFixed(1)} miles`;
    }
    
    // Estimate walking time (avg 3 mph walking speed)
    const walkingMinutes = Math.round(distanceMiles * 20);
    const walkingTime = walkingMinutes < 1 ? "less than a minute" : `${walkingMinutes} min walk`;
    
    return { distance, walkingTime };
  }
}