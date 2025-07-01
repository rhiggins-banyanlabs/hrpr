// types/google-maps.ts

export interface LatLngLiteral {
    lat: number;
    lng: number;
  }
  
  export interface PlaceGeometry {
    location: LatLngLiteral;
    viewport?: {
      northeast: LatLngLiteral;
      southwest: LatLngLiteral;
    };
  }
  
  export interface PlaceOpeningHours {
    open_now: boolean;
    periods?: Array<{
      close: {
        day: number;
        time: string;
      };
      open: {
        day: number;
        time: string;
      };
    }>;
    weekday_text?: string[];
  }
  
  export interface PlacePhoto {
    height: number;
    width: number;
    html_attributions: string[];
    photo_reference: string;
  }
  
  export interface Place {
    business_status?: string;
    formatted_address?: string;
    geometry: PlaceGeometry;
    icon?: string;
    icon_background_color?: string;
    icon_mask_base_uri?: string;
    name: string;
    opening_hours?: PlaceOpeningHours;
    photos?: PlacePhoto[];
    place_id: string;
    plus_code?: {
      compound_code: string;
      global_code: string;
    };
    price_level?: number; // 0 to 4
    rating?: number; // 1.0 to 5.0
    reference?: string;
    scope?: string;
    types?: string[];
    user_ratings_total?: number;
    vicinity: string; // Simplified address
  }
  
  export interface NearbySearchResponse {
    html_attributions: string[];
    next_page_token?: string;
    results: Place[];
    status: string;
    error_message?: string;
  }
  
  export interface GeocodeResult {
    address_components: Array<{
      long_name: string;
      short_name: string;
      types: string[];
    }>;
    formatted_address: string;
    geometry: PlaceGeometry;
    place_id: string;
    plus_code?: {
      compound_code: string;
      global_code: string;
    };
    types: string[];
  }
  
  export interface GeocodeResponse {
    results: GeocodeResult[];
    status: string;
    error_message?: string;
  }
  
  export type PlaceType = 
    | 'restaurant' 
    | 'cafe' 
    | 'hotel' 
    | 'bar' 
    | 'tourist_attraction' 
    | 'shopping_mall' 
    | 'museum' 
    | 'parking' 
    | 'subway_station' 
    | 'transit_station'
    | 'lodging';