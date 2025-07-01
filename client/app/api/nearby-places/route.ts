// app/api/nearby-places/route.ts
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// Type for the nearby places response
type NearbyPlacesResponse = {
  results: any[];
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
    
    // Make request to Google Places API
    const response = await axios.get<NearbyPlacesResponse>(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json`,
      {
        params: {
          location: `${lat},${lng}`,
          radius: radius,
          type: type,
          key: apiKey
        }
      }
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