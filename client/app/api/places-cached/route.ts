import { NextRequest, NextResponse } from 'next/server';
import { LocationCacheService } from '@/services/location-cache.service';
import { LocationService } from '@/services/location.service';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const keyword = searchParams.get('keyword');
  const radius = parseInt(searchParams.get('radius') || '1500');
  
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    return NextResponse.json({ error: 'Google Maps API key not configured' }, { status: 500 });
  }
  
  try {
    // Use the location cache service for tiered lookup
    const locationService = new LocationService();
    const cacheService = LocationCacheService.getInstance();
    
    console.log(`🔍 API Places CACHED request: type=${type}, keyword=${keyword}, radius=${radius}`);
    
    const startTime = Date.now();
    const places = await cacheService.searchPlaces(
      locationService,
      type || undefined,
      keyword || undefined,
      radius
    );
    const duration = Date.now() - startTime;
    
    return NextResponse.json({ 
      results: places,
      metadata: {
        query: { type, keyword, radius },
        responseTime: duration,
        resultCount: places.length,
        cached: duration < 100 // Assume cached if very fast response
      }
    });
    
  } catch (error) {
    console.error('Error searching places with cache:', error);
    
    // Fallback to direct API call if cache service fails
    return fallbackToDirectAPI(type, keyword, radius.toString(), apiKey);
  }
}

// Fallback function for direct Google Maps API call (same as original /api/places)
async function fallbackToDirectAPI(type: string | null, keyword: string | null, radius: string, apiKey: string) {
  const CONFERENCE_VENUE = {
    lat: 39.7432,
    lng: -104.9959
  };
  
  try {
    const params = new URLSearchParams({
      location: `${CONFERENCE_VENUE.lat},${CONFERENCE_VENUE.lng}`,
      radius: radius,
      key: apiKey
    });
    
    if (type) {
      params.append('type', type);
    }
    
    if (keyword) {
      params.append('keyword', keyword);
    }
    
    console.log('🚨 Fallback: Using direct Google Maps API call');
    
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(5000)
      }
    );
    
    if (!response.ok) {
      throw new Error(`Google Maps API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // For fast food searches, if we don't get good results, try a broader search
    if (keyword === 'fast food' && (data.results?.length || 0) < 3) {
      const broaderParams = new URLSearchParams({
        location: `${CONFERENCE_VENUE.lat},${CONFERENCE_VENUE.lng}`,
        radius: radius,
        type: 'restaurant',
        key: apiKey
      });
      
      const broaderResponse = await fetch(
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${broaderParams.toString()}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(5000)
        }
      );
      
      if (broaderResponse.ok) {
        const broaderData = await broaderResponse.json();
        
        // Filter for fast food-like places
        const fastFoodKeywords = ['mcdonalds', 'burger king', 'wendys', 'subway', 'taco bell', 'kfc', 'pizza hut', 'dominos', 'chipotle', 'panera', 'starbucks'];
        const fastFoodPlaces = broaderData.results?.filter((place: any) => {
          const name = place.name?.toLowerCase() || '';
          const isFastFood = fastFoodKeywords.some(keyword => name.includes(keyword));
          const isLowPrice = place.price_level !== undefined && place.price_level <= 2;
          return isFastFood || isLowPrice;
        }) || [];
        
        return NextResponse.json({ 
          results: fastFoodPlaces,
          metadata: {
            query: { type, keyword, radius },
            fallback: true,
            broadSearch: true
          }
        });
      }
    }
    
    return NextResponse.json({ 
      results: data.results || [],
      metadata: {
        query: { type, keyword, radius },
        fallback: true
      }
    });
    
  } catch (error) {
    console.error('Error in fallback API call:', error);
    return NextResponse.json({ error: 'Failed to search places' }, { status: 500 });
  }
}