export const DENVER_COORDINATES = { lat: 39.7392, lng: -104.9903 };

export const CONFERENCE_VENUE = { 
  lat: 39.7432,
  lng: -104.9959, 
  name: 'Denver Convention Center',
  address: '700 14th St, Denver, CO 80202',
  placeId: 'ChIJhx9-ra97bIcRqFJmfNLB4ps'
};

export const HOST_HOTEL = {
  lat: 39.7435,
  lng: -104.9954,
  name: 'Hyatt Regency Denver (Host Hotel)',
  address: '650 15th St, Denver, CO 80202',
  placeId: 'ChIJ2f_jrK97bIcR8Cw1hFwbESo'
};

export const DEFAULT_SEARCH_RADIUS = {
  NEARBY_RADIUS: 800,
  NORMAL_RADIUS: 2000,
  EXTENDED_RADIUS: 3000,
  FASTFOOD_NEARBY: 1500,
  FASTFOOD_NORMAL: 3000,
  CAFE_NEARBY: 600,
  CAFE_NORMAL: 1500,
} as const;