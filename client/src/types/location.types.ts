export interface Place {
  name: string;
  vicinity: string;
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

export interface LocationCoordinates {
  lat: number;
  lng: number;
}

export interface LocationVenue extends LocationCoordinates {
  name: string;
  address: string;
  placeId: string;
}