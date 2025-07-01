// app/api/geocode/route.ts
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// Type for the geocode response
type GeocodeResponse = {
  results: any[];
  status: string;
  error_message?: string;
}

export async function GET(request: NextRequest) {
  try {
    // Get the URL parameters
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json(
        { message: 'Missing required parameter: address' },
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
    
    // Make request to Google Geocoding API
    const response = await axios.get<GeocodeResponse>(
      `https://maps.googleapis.com/maps/api/geocode/json`,
      {
        params: {
          address: address,
          key: apiKey
        }
      }
    );

    // Return the results
    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error geocoding address:', error);
    return NextResponse.json(
      { 
        message: 'Error geocoding address', 
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}