import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const keyword = searchParams.get('keyword');
  const radius = searchParams.get('radius') || '1500';
  
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    return NextResponse.json({ error: 'Google Maps API key not configured' }, { status: 500 });
  }
  
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
        
        return NextResponse.json({ results: fastFoodPlaces });
      }
    }
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Error searching nearby places:', error);
    return NextResponse.json({ error: 'Failed to search places' }, { status: 500 });
  }
}