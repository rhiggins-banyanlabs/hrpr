import { LocationIntent } from '@/types/location.types';
import { 
  CUISINE_TYPES, 
  FAST_FOOD_CHAINS, 
  LOCATION_PATTERNS, 
  PLACE_TYPES 
} from '@/config/location-patterns.config';
import { DEFAULT_SEARCH_RADIUS } from '@/config/location.config';

export class LocationIntentService {
  /**
   * Detect location intent from user input text
   */
  detectLocationIntent(text: string): LocationIntent | null {
    const lowerText = text.toLowerCase();
    
    console.log(`🔍 Location intent detection for: "${text}"`);
    
    // Conference-specific locations
    if (LOCATION_PATTERNS.CONVENTION_CENTER.test(lowerText)) {
      console.log(`📍 Detected: convention center`);
      return { hasLocationIntent: true, keyword: 'convention center' };
    }
    
    if (LOCATION_PATTERNS.HOST_HOTEL.test(lowerText)) {
      console.log(`📍 Detected: host hotel`);
      return { hasLocationIntent: true, keyword: 'hyatt regency denver' };
    }
    
    // Cuisine-specific searches
    const cuisineIntent = this.detectCuisineIntent(lowerText);
    if (cuisineIntent) {
      return cuisineIntent;
    }

    // Fast food detection (must come before general restaurant pattern)
    if (LOCATION_PATTERNS.FAST_FOOD.test(lowerText)) {
      console.log(`🍔 Detected: fast food pattern`);
      
      const keyword = this.detectFastFoodChain(lowerText) || 'fast food';
      const radius = LOCATION_PATTERNS.NEARBY.test(lowerText) 
        ? DEFAULT_SEARCH_RADIUS.FASTFOOD_NEARBY 
        : DEFAULT_SEARCH_RADIUS.FASTFOOD_NORMAL;
      
      return { 
        hasLocationIntent: true,
        type: PLACE_TYPES.RESTAURANT, 
        keyword: keyword,
        radius 
      };
    }
    
    // General location patterns
    const generalIntent = this.detectGeneralLocationIntent(lowerText);
    if (generalIntent) {
      return generalIntent;
    }

    return null;
  }

  /**
   * Detect cuisine-specific intent
   */
  private detectCuisineIntent(lowerText: string): LocationIntent | null {
    for (const cuisine of CUISINE_TYPES) {
      if (lowerText.includes(cuisine)) {
        return {
          hasLocationIntent: true,
          type: PLACE_TYPES.RESTAURANT,
          keyword: cuisine,
          radius: DEFAULT_SEARCH_RADIUS.NORMAL_RADIUS
        };
      }
    }
    return null;
  }

  /**
   * Detect specific fast food chain
   */
  private detectFastFoodChain(lowerText: string): string | null {
    for (const chain of FAST_FOOD_CHAINS) {
      if (lowerText.includes(chain)) {
        console.log(`🍔 Found specific chain: ${chain}`);
        return chain;
      }
    }
    return null;
  }

  /**
   * Detect general location patterns
   */
  private detectGeneralLocationIntent(lowerText: string): LocationIntent | null {
    const isNearby = LOCATION_PATTERNS.NEARBY.test(lowerText);

    if (LOCATION_PATTERNS.RESTAURANT.test(lowerText)) {
      return { 
        hasLocationIntent: true,
        type: PLACE_TYPES.RESTAURANT, 
        radius: isNearby ? DEFAULT_SEARCH_RADIUS.NEARBY_RADIUS : DEFAULT_SEARCH_RADIUS.NORMAL_RADIUS
      };
    }
    
    if (LOCATION_PATTERNS.CAFE.test(lowerText)) {
      return { 
        hasLocationIntent: true,
        type: PLACE_TYPES.CAFE, 
        radius: isNearby ? DEFAULT_SEARCH_RADIUS.CAFE_NEARBY : DEFAULT_SEARCH_RADIUS.CAFE_NORMAL
      };
    }
    
    if (LOCATION_PATTERNS.HOTEL.test(lowerText) && !lowerText.includes('host hotel')) {
      return { 
        hasLocationIntent: true,
        type: PLACE_TYPES.LODGING, 
        radius: DEFAULT_SEARCH_RADIUS.EXTENDED_RADIUS
      };
    }
    
    if (LOCATION_PATTERNS.BAR.test(lowerText)) {
      return { 
        hasLocationIntent: true,
        type: PLACE_TYPES.BAR, 
        radius: isNearby ? DEFAULT_SEARCH_RADIUS.NEARBY_RADIUS : DEFAULT_SEARCH_RADIUS.NORMAL_RADIUS
      };
    }
    
    if (LOCATION_PATTERNS.ATTRACTION.test(lowerText)) {
      return { 
        hasLocationIntent: true,
        type: PLACE_TYPES.TOURIST_ATTRACTION, 
        radius: DEFAULT_SEARCH_RADIUS.EXTENDED_RADIUS
      };
    }
    
    if (LOCATION_PATTERNS.SHOPPING.test(lowerText)) {
      return { 
        hasLocationIntent: true,
        type: PLACE_TYPES.SHOPPING_MALL, 
        radius: DEFAULT_SEARCH_RADIUS.EXTENDED_RADIUS
      };
    }
    
    if (LOCATION_PATTERNS.GAS.test(lowerText)) {
      return { 
        hasLocationIntent: true,
        type: PLACE_TYPES.GAS_STATION, 
        radius: DEFAULT_SEARCH_RADIUS.EXTENDED_RADIUS
      };
    }
    
    if (LOCATION_PATTERNS.PARK.test(lowerText)) {
      return { 
        hasLocationIntent: true,
        type: PLACE_TYPES.PARK, 
        radius: DEFAULT_SEARCH_RADIUS.EXTENDED_RADIUS
      };
    }
    
    if (LOCATION_PATTERNS.PHARMACY.test(lowerText)) {
      return { 
        hasLocationIntent: true,
        type: PLACE_TYPES.PHARMACY, 
        radius: DEFAULT_SEARCH_RADIUS.NORMAL_RADIUS
      };
    }
    
    if (LOCATION_PATTERNS.BANK.test(lowerText)) {
      return { 
        hasLocationIntent: true,
        type: PLACE_TYPES.BANK, 
        radius: DEFAULT_SEARCH_RADIUS.NORMAL_RADIUS
      };
    }
    
    if (LOCATION_PATTERNS.GYM.test(lowerText)) {
      return { 
        hasLocationIntent: true,
        type: PLACE_TYPES.GYM, 
        radius: DEFAULT_SEARCH_RADIUS.EXTENDED_RADIUS
      };
    }

    return null;
  }

  /**
   * Calculate walking distance and time between two coordinates
   */
  calculateWalkingDistance(lat1: number, lon1: number, lat2: number, lon2: number): { 
    distance: string; 
    walkingTime: string; 
  } {
    const R = 3959; // Earth radius in miles
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distanceMiles = R * c;
    
    const distance = distanceMiles < 0.1 
      ? `${Math.round(distanceMiles * 5280)} ft` 
      : `${distanceMiles.toFixed(1)} mi`;
    
    const walkingMinutes = Math.round(distanceMiles * 20);
    const walkingTime = walkingMinutes < 1 ? "less than a minute" : `${walkingMinutes} min walk`;
    
    return { distance, walkingTime };
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }
}

export const locationIntentService = new LocationIntentService();
export default locationIntentService;