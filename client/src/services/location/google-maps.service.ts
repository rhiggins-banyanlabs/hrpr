import { Place, LocationCoordinates } from '@/types/location.types';
import { CONFERENCE_VENUE } from '@/config/location.config';
import { FAST_FOOD_CHAINS } from '@/config/location-patterns.config';

export class GoogleMapsService {
  private readonly fastFoodKeywords = [
    ...FAST_FOOD_CHAINS, 
    'chipotle', 'panera', 'starbucks', 'five guys', 'in-n-out'
  ];

  /**
   * Search for nearby places using Google Maps API
   */
  async searchNearbyPlaces(
    type?: string, 
    keyword?: string, 
    radius: number = 1500,
    location: LocationCoordinates = CONFERENCE_VENUE
  ): Promise<Place[]> {
    try {
      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        console.warn('⚠️ Google Maps API key not configured');
        return [];
      }

      const params = new URLSearchParams({
        location: `${location.lat},${location.lng}`,
        radius: radius.toString(),
        key: apiKey
      });
      
      if (type) {
        params.append('type', type);
      }
      
      if (keyword) {
        params.append('keyword', keyword);
      }

      console.log(`🗺️ Searching for places: type=${type}, keyword=${keyword}, radius=${radius}`);

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params.toString()}`
      );
      
      if (!response.ok) {
        console.error('❌ Failed to fetch places:', response.status, response.statusText);
        return [];
      }

      const data = await response.json();
      console.log(`📍 Found ${data.results?.length || 0} places`);
      
      // For fast food searches, try a broader search if we don't get good results
      if (keyword === 'fast food' && (data.results?.length || 0) < 3) {
        return await this.searchFastFoodFallback(location, radius, apiKey);
      }
      
      return data.results || [];
    } catch (error) {
      console.error('❌ Error searching nearby places:', error);
      return [];
    }
  }

  /**
   * Fallback search for fast food places with broader criteria
   */
  private async searchFastFoodFallback(
    location: LocationCoordinates, 
    radius: number, 
    apiKey: string
  ): Promise<Place[]> {
    console.log(`🔄 Fast food search returned few results, trying broader restaurant search...`);
    
    const broaderParams = new URLSearchParams({
      location: `${location.lat},${location.lng}`,
      radius: radius.toString(),
      type: 'restaurant',
      key: apiKey
    });
    
    try {
      const broaderResponse = await fetch(
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${broaderParams.toString()}`
      );
      
      if (!broaderResponse.ok) {
        return [];
      }

      const broaderData = await broaderResponse.json();
      console.log(`📍 Broader search found ${broaderData.results?.length || 0} restaurants`);
      
      // Filter for fast food-like places
      const fastFoodPlaces = this.filterFastFoodPlaces(broaderData.results || []);
      
      console.log(`🍔 Filtered to ${fastFoodPlaces.length} fast food places`);
      return fastFoodPlaces;
    } catch (error) {
      console.error('❌ Error in fast food fallback search:', error);
      return [];
    }
  }

  /**
   * Filter places to find fast food establishments
   */
  private filterFastFoodPlaces(places: any[]): Place[] {
    return places.filter((place: any) => {
      const name = place.name?.toLowerCase() || '';
      const isFastFood = this.fastFoodKeywords.some(keyword => name.includes(keyword));
      const isLowPrice = place.price_level !== undefined && place.price_level <= 2;
      return isFastFood || isLowPrice;
    });
  }

  /**
   * Search for a specific place by name
   */
  async searchPlaceByName(placeName: string, location: LocationCoordinates = CONFERENCE_VENUE): Promise<Place[]> {
    try {
      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        console.warn('⚠️ Google Maps API key not configured');
        return [];
      }

      const params = new URLSearchParams({
        query: placeName,
        location: `${location.lat},${location.lng}`,
        radius: '5000', // 5km radius for specific searches
        key: apiKey
      });

      console.log(`🔍 Searching for specific place: "${placeName}"`);

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/textsearch/json?${params.toString()}`
      );
      
      if (!response.ok) {
        console.error('❌ Failed to search for place:', response.status, response.statusText);
        return [];
      }

      const data = await response.json();
      console.log(`📍 Found ${data.results?.length || 0} places matching "${placeName}"`);
      
      return data.results || [];
    } catch (error) {
      console.error('❌ Error searching for place by name:', error);
      return [];
    }
  }

  /**
   * Get place details by place ID
   */
  async getPlaceDetails(placeId: string): Promise<any> {
    try {
      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        console.warn('⚠️ Google Maps API key not configured');
        return null;
      }

      const params = new URLSearchParams({
        place_id: placeId,
        fields: 'name,formatted_address,geometry,rating,user_ratings_total,price_level,opening_hours,formatted_phone_number,website',
        key: apiKey
      });

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`
      );
      
      if (!response.ok) {
        console.error('❌ Failed to get place details:', response.status, response.statusText);
        return null;
      }

      const data = await response.json();
      return data.result || null;
    } catch (error) {
      console.error('❌ Error getting place details:', error);
      return null;
    }
  }

  /**
   * Format places data for AI prompt inclusion
   */
  formatPlacesForPrompt(places: Place[], maxPlaces: number = 5): string {
    if (places.length === 0) {
      return '';
    }

    let placesInfo = '\n\nNEARBY PLACES:';
    
    places.slice(0, maxPlaces).forEach((place, index) => {
      const rating = place.rating ? ` (${place.rating}⭐)` : '';
      const price = place.price_level ? ' '.repeat(place.price_level) + '$' : '';
      placesInfo += `\n${index + 1}. ${place.name} - ${place.vicinity}${rating}${price}`;
    });

    if (places.length > maxPlaces) {
      placesInfo += `\n... and ${places.length - maxPlaces} more places`;
    }

    return placesInfo;
  }
}

export const googleMapsService = new GoogleMapsService();
export default googleMapsService;