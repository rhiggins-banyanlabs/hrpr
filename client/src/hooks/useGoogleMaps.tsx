// hooks/useGoogleMaps.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import { LatLngLiteral, Place, PlaceType } from '@/types/google-maps';

// Default coordinates for Denver, CO
const DENVER_COORDINATES = { lat: 39.7392, lng: -104.9903 };

// Conference venue - Denver Convention Center
const CONFERENCE_VENUE = { 
  lat: 39.7432,  // Actual coordinates for Denver Convention Center
  lng: -104.9959, 
  name: 'Denver Convention Center',
  address: '700 14th St, Denver, CO 80202',
  placeId: 'ChIJhx9-ra97bIcRqFJmfNLB4ps' // Actual place ID for Denver Convention Center
};

// Host hotel - Hyatt Regency Denver
const HOST_HOTEL = {
  lat: 39.7435, // Actual coordinates for Hyatt Regency Denver
  lng: -104.9954,
  name: 'Hyatt Regency Denver (Host Hotel)',
  address: '650 15th St, Denver, CO 80202',
  placeId: 'ChIJ2f_jrK97bIcR8Cw1hFwbESo' // Actual place ID for Hyatt Regency Denver
};

// Define conference locations - add all relevant places here
const CONFERENCE_LOCATIONS = {
  venue: CONFERENCE_VENUE,
  hostHotel: HOST_HOTEL,
  // Default proximity relationship for easy reference
  walking: {
    venueToHotel: '2 minutes (0.1 miles)'
  },
  // Add more locations as needed
};

// Type for location queries
type LocationQuery = {
  text: string;
  type?: PlaceType;
  radius?: number;
  keyword?: string;
};

// Google Maps hook props
interface UseGoogleMapsProps {
  apiKey: string;
}

// Google Maps hook return type
interface UseGoogleMapsReturn {
  isLoaded: boolean;
  error: string | null;
  conferenceLocations: typeof CONFERENCE_LOCATIONS;
  geocodeAddress: (address: string) => Promise<LatLngLiteral | null>;
  findNearbyPlaces: (params: { 
    location?: LatLngLiteral, 
    type?: PlaceType, 
    radius?: number, 
    keyword?: string 
  }) => Promise<Place[]>;
  getDirections: (origin: string | LatLngLiteral, destination: string | LatLngLiteral, mode?: string) => Promise<string>;
  createStaticMapUrl: (markers: Array<{location: LatLngLiteral, label?: string}>, zoom?: number) => string;
  detectLocationIntent: (text: string) => LocationQuery | null;
  getLocationByName: (name: string) => (typeof CONFERENCE_LOCATIONS)[keyof typeof CONFERENCE_LOCATIONS] | null;
  searchNearbyWithKeyword: (keyword: string, location?: LatLngLiteral, radius?: number) => Promise<Place[]>;
  enhanceResponseWithLocationData: (text: string) => Promise<string>;
}

// Declare window to access google maps
declare global {
  interface Window {
    google: any;
    googleMapsCallback: () => void;
  }
}

export const useGoogleMaps = ({ apiKey }: UseGoogleMapsProps): UseGoogleMapsReturn => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mapsApiRef = useRef<any>(null);

  // Load the Google Maps API
  useEffect(() => {
    if (!apiKey) {
      setError('Google Maps API key is missing');
      return;
    }

    // Skip if already loaded
    if (window.google?.maps) {
      setIsLoaded(true);
      mapsApiRef.current = window.google.maps;
      return;
    }

    const callbackName = 'googleMapsCallback';
    
    // Create the callback function
    window[callbackName] = () => {
      setIsLoaded(true);
      mapsApiRef.current = window.google.maps;
    };

    // Create and append the script
    try {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=${callbackName}`;
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        setError('Failed to load Google Maps API');
      };
      document.head.appendChild(script);

      return () => {
        // Cleanup
        (window as any)[callbackName] = undefined;
        const scriptToRemove = document.querySelector(`script[src*="maps.googleapis.com/maps/api/js"]`);
        if (scriptToRemove) document.head.removeChild(scriptToRemove);
      };
    } catch (err) {
      setError('Error loading Google Maps: ' + (err instanceof Error ? err.message : String(err)));
    }
  }, [apiKey]);

  // Geocode an address to coordinates
  const geocodeAddress = useCallback(async (address: string): Promise<LatLngLiteral | null> => {
    if (!isLoaded) {
      console.error('Google Maps not loaded yet');
      return null;
    }

    try {
      // Try server-side geocoding first
      const response = await fetch('/api/geocode?address=' + encodeURIComponent(address), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          return data.results[0].geometry.location;
        }
      }

      // Fallback to client-side geocoding
      return new Promise((resolve, reject) => {
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ address }, (results: any, status: any) => {
          if (status === 'OK' && results && results.length > 0) {
            const location = results[0].geometry.location;
            resolve({
              lat: location.lat(),
              lng: location.lng()
            });
          } else {
            reject(new Error(`Geocoding failed: ${status}`));
          }
        });
      });
    } catch (err) {
      console.error('Geocoding error:', err);
      return null;
    }
  }, [isLoaded]);

  // Find nearby places with optional keyword
  const findNearbyPlaces = useCallback(async ({ 
    location = CONFERENCE_VENUE,
    type, 
    radius = 1500, 
    keyword 
  }: {
    location?: LatLngLiteral,
    type?: PlaceType, 
    radius?: number, 
    keyword?: string
  }): Promise<Place[]> => {
    if (!isLoaded) {
      console.error('Google Maps not loaded yet');
      return [];
    }

    try {
      // Build query parameters
      const params = new URLSearchParams({
        lat: location.lat.toString(),
        lng: location.lng.toString(),
        radius: radius.toString(),
      });
      
      // Add type if provided
      if (type) {
        params.append('type', type);
      }
      
      // Add keyword if provided
      if (keyword) {
        params.append('keyword', keyword);
      }

      // Try server-side nearby search
      const response = await fetch(`/api/nearby-places?${params.toString()}`);

      if (response.ok) {
        const data = await response.json();
        return data.results || [];
      }

      // Fallback to client-side places search
      return new Promise((resolve, reject) => {
        const service = new window.google.maps.places.PlacesService(document.createElement('div'));
        
        const request: any = {
          location,
          radius
        };
        
        if (type) {
          request.type = type;
        }
        
        if (keyword) {
          request.keyword = keyword;
        }
        
        service.nearbySearch(request, (results: any, status: any) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
            resolve(results as unknown as Place[]);
          } else {
            reject(new Error(`Places search failed: ${status}`));
          }
        });
      });
    } catch (err) {
      console.error('Places search error:', err);
      return [];
    }
  }, [isLoaded]);

  // Search nearby with just a keyword (convenience method)
  const searchNearbyWithKeyword = useCallback(async (
    keyword: string, 
    location: LatLngLiteral = CONFERENCE_VENUE,
    radius: number = 1500
  ): Promise<Place[]> => {
    return findNearbyPlaces({ location, keyword, radius });
  }, [findNearbyPlaces]);

  // Get directions between two points
  const getDirections = useCallback(async (
    origin: string | LatLngLiteral, 
    destination: string | LatLngLiteral,
    mode: string = 'walking'
  ): Promise<string> => {
    // For simplicity, we'll just return a directions URL
    const originStr = typeof origin === 'string' 
      ? encodeURIComponent(origin) 
      : `${origin.lat},${origin.lng}`;
      
    const destStr = typeof destination === 'string' 
      ? encodeURIComponent(destination) 
      : `${destination.lat},${destination.lng}`;
    
    return `https://www.google.com/maps/dir/?api=1&origin=${originStr}&destination=${destStr}&travelmode=${mode.toLowerCase()}`;
  }, []);

  // Create a static map URL
  const createStaticMapUrl = useCallback((
    markers: Array<{location: LatLngLiteral, label?: string}>, 
    zoom: number = 15
  ): string => {
    if (!apiKey) return '';
    
    const markerParams = markers.map((marker, i) => {
      const label = marker.label ? `label:${marker.label[0]}|` : '';
      return `markers=${label}${marker.location.lat},${marker.location.lng}`;
    }).join('&');
    
    return `https://maps.googleapis.com/maps/api/staticmap?center=${markers[0].location.lat},${markers[0].location.lng}&zoom=${zoom}&size=600x400&maptype=roadmap&${markerParams}&key=${apiKey}`;
  }, [apiKey]);

  // Detect location intent in user message
  const detectLocationIntent = useCallback((text: string): LocationQuery | null => {
    const lowerText = text.toLowerCase();
    
    // Special case for common conference-specific locations
    if (
      lowerText.includes('convention center') || 
      lowerText.includes('conference venue') || 
      lowerText.includes('event location')
    ) {
      return { 
        text: lowerText,
        keyword: 'convention center' 
      };
    }
    
    if (
      lowerText.includes('hyatt') || 
      lowerText.includes('host hotel') || 
      lowerText.includes('hotel') && lowerText.includes('stay')
    ) {
      return { 
        text: lowerText,
        keyword: 'hyatt regency denver' 
      };
    }
    
    // Food & restaurant-related queries with cuisine type extraction
    const foodQuery = /(?:where can I|looking for|find|want) (?:some|a|to eat|to find) ([a-z]+) (?:food|restaurant|place to eat)/i.exec(lowerText);
    if (foodQuery && foodQuery[1]) {
      const cuisineType = foodQuery[1]; // e.g., "sushi", "italian", "mexican"
      return { 
        text: lowerText,
        type: 'restaurant',
        keyword: cuisineType,
        radius: 2000
      };
    }
    
    // Explicit cuisine searches
    const cuisineTypes = [
      'sushi', 'pizza', 'burger', 'italian', 'mexican', 'chinese', 'thai', 
      'indian', 'bbq', 'steak', 'seafood', 'vegetarian', 'vegan', 'gluten-free'
    ];
    
    for (const cuisine of cuisineTypes) {
      if (lowerText.includes(cuisine)) {
        return {
          text: lowerText,
          type: 'restaurant',
          keyword: cuisine,
          radius: 2000
        };
      }
    }
    
    // Location detection patterns
    const restaurantPattern = /restaurant|food|eat|dinner|lunch|breakfast/i;
    const cafePattern = /coffee|cafe|espresso|tea/i;
    const hotelPattern = /hotel|stay|accommodation|room|sleep/i;
    const barPattern = /bar|drink|pub|alcohol|beer|wine/i;
    const attractionPattern = /attraction|visit|sightseeing|tour/i;
    const nearbyPattern = /nearby|close|walking distance|near/i;
    
    // Check for location-related keywords
    if (restaurantPattern.test(lowerText)) {
      return { 
        text: lowerText,
        type: 'restaurant', 
        radius: nearbyPattern.test(lowerText) ? 800 : 2000 
      };
    }
    
    if (cafePattern.test(lowerText)) {
      return { 
        text: lowerText,
        type: 'cafe', 
        radius: nearbyPattern.test(lowerText) ? 600 : 1500 
      };
    }
    
    if (hotelPattern.test(lowerText)) {
      return { 
        text: lowerText,
        type: 'lodging', 
        radius: 3000 
      };
    }
    
    if (barPattern.test(lowerText)) {
      return { 
        text: lowerText,
        type: 'bar', 
        radius: nearbyPattern.test(lowerText) ? 800 : 2000 
      };
    }
    
    if (attractionPattern.test(lowerText)) {
      return { 
        text: lowerText,
        type: 'tourist_attraction', 
        radius: 5000 
      };
    }
    
    // Check for location phrases
    if (lowerText.includes('where is') || 
        lowerText.includes('how do i get to') || 
        lowerText.includes('directions to') ||
        lowerText.includes('find on map') ||
        lowerText.includes('show me') && (lowerText.includes('map') || lowerText.includes('location'))) {
      return { text: lowerText };
    }
    
    return null;
  }, []);

  // Get a conference location by name
  const getLocationByName = useCallback((name: string) => {
    const lowerName = name.toLowerCase();
    
    // Check for convention center references
    if (
      lowerName.includes('convention') || 
      lowerName.includes('conference') || 
      lowerName.includes('venue')
    ) {
      return CONFERENCE_VENUE;
    }
    
    // Check for hotel references
    if (
      lowerName.includes('hyatt') || 
      lowerName.includes('hotel') || 
      lowerName.includes('host hotel') ||
      lowerName.includes('where to stay')
    ) {
      return HOST_HOTEL;
    }
    
    // Check if it's a direct match with one of our locations
    for (const [key, location] of Object.entries(CONFERENCE_LOCATIONS)) {
      if (key.toLowerCase() === lowerName) {
        return location;
      }
    }
    
    // Check for partial matches in our defined locations
    for (const location of [CONFERENCE_VENUE, HOST_HOTEL]) {
      if (
        location.name.toLowerCase().includes(lowerName) || 
        location.address.toLowerCase().includes(lowerName)
      ) {
        return location;
      }
    }
    
    return null;
  }, []);

  // Enhanced response with location data
  const enhanceResponseWithLocationData = useCallback(async (text: string): Promise<string> => {
    // Check if this is a location/direction related query
    const locationIntent = detectLocationIntent(text);
    if (!locationIntent) {
      return text;
    }

    let enhancedResponse = text;
    
    // If asking about the venue or hotel specifically
    if (text.toLowerCase().includes('convention center') || text.toLowerCase().includes('venue')) {
      enhancedResponse += `\n\nThe Denver Convention Center is located at ${CONFERENCE_VENUE.address}. It's about a 2-minute walk from the Hyatt Regency (Host Hotel).`;
    }
    
    if (text.toLowerCase().includes('hyatt') || text.toLowerCase().includes('host hotel')) {
      enhancedResponse += `\n\nThe Hyatt Regency (Host Hotel) is located at ${HOST_HOTEL.address}. It's about a 2-minute walk from the Denver Convention Center.`;
    }
    
    // If asking about directions between venue and hotel
    if (
      (text.toLowerCase().includes('hotel') && text.toLowerCase().includes('convention')) ||
      (text.toLowerCase().includes('venue') && text.toLowerCase().includes('hotel')) ||
      (text.toLowerCase().includes('how far') || text.toLowerCase().includes('how do i get'))
    ) {
      enhancedResponse += `\n\nThe Denver Convention Center and the Hyatt Regency (Host Hotel) are only about a 2-minute walk (0.1 miles) from each other.`;
    }
    
    // For food queries with specific cuisines
    const cuisineTypes = [
      'sushi', 'pizza', 'burger', 'italian', 'mexican', 'chinese', 'thai', 
      'indian', 'bbq', 'steak', 'seafood', 'vegetarian', 'vegan'
    ];
    
    for (const cuisine of cuisineTypes) {
      if (text.toLowerCase().includes(cuisine)) {
        enhancedResponse += `\n\nI can help you find ${cuisine} restaurants near the conference. Would you like me to show some options within walking distance?`;
        break;
      }
    }
    
    return enhancedResponse;
  }, [detectLocationIntent]);

  return {
    isLoaded,
    error,
    conferenceLocations: CONFERENCE_LOCATIONS,
    geocodeAddress,
    findNearbyPlaces,
    getDirections,
    createStaticMapUrl,
    detectLocationIntent,
    getLocationByName,
    searchNearbyWithKeyword,
    enhanceResponseWithLocationData
  };
};