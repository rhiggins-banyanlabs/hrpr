// app/api/nearby-places/route.ts
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// Type for the nearby places response
type PlaceResult = {
  business_status?: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  icon: string;
  name: string;
  opening_hours?: {
    open_now: boolean;
  };
  photos?: Array<{
    height: number;
    html_attributions: string[];
    photo_reference: string;
    width: number;
  }>;
  place_id: string;
  price_level?: number;
  rating?: number;
  reference: string;
  types: string[];
  user_ratings_total?: number;
  vicinity: string;
}

type NearbyPlacesResponse = {
  results: PlaceResult[];
  status: string;
  error_message?: string;
  html_attributions: string[];
  next_page_token?: string;
}

export async function GET(request: NextRequest) {
  try {
    // Get the URL parameters
    const searchParams = request.nextUrl.searchParams;
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const radius = searchParams.get('radius') || '1500';
    const type = searchParams.get('type') || 'restaurant';
    const keyword = searchParams.get('keyword') || ''; // Added keyword parameter

    if (!lat || !lng) {
      return NextResponse.json(
        { message: 'Missing required parameters: lat, lng' },
        { status: 400 }
      );
    }

    // API key should be stored in environment variables
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { message: 'Google Maps API key is not configured' },
        { status: 500 }
      );
    }
    
    // Prepare parameters object
    const params: Record<string, string> = {
      location: `${lat},${lng}`,
      radius: radius,
      key: apiKey
    };
    
    // Only add type if it's not empty
    if (type) {
      params.type = type;
    }
    
    // Add keyword parameter if provided
    if (keyword) {
      params.keyword = keyword;
      console.log(`Adding keyword search: "${keyword}"`);
    }
    
    // Log the request being made
    console.log(`Making Places API request with params:`, params);
    
    // Make request to Google Places API
    const response = await axios.get<NearbyPlacesResponse>(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json`,
      { params }
    );
    
    console.log(`Received ${response.data.results?.length || 0} results from Places API`);

    // Return the results
    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error fetching nearby places:', error);
    return NextResponse.json(
      { 
        message: 'Error fetching nearby places', 
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lat, lng, radius = 1500, type = 'restaurant', keyword = '' } = body;

    if (!lat || !lng) {
      return NextResponse.json(
        { message: 'Missing required parameters: lat, lng' },
        { status: 400 }
      );
    }

    // API key should be stored in environment variables
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { message: 'Google Maps API key is not configured' },
        { status: 500 }
      );
    }
    
    // Prepare parameters object
    const params: Record<string, string> = {
      location: `${lat},${lng}`,
      radius: radius.toString(),
      key: apiKey
    };
    
    // Only add type if it's not empty
    if (type) {
      params.type = type;
    }
    
    // Add keyword parameter if provided
    if (keyword) {
      params.keyword = keyword;
      console.log(`Adding keyword search: "${keyword}"`);
    }
    
    // Make request to Google Places API
    const response = await axios.get<NearbyPlacesResponse>(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json`,
      { params }
    );

    // Return the results
    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error fetching nearby places:', error);
    return NextResponse.json(
      { 
        message: 'Error fetching nearby places', 
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}