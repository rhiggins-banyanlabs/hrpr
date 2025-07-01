'use client';

import { useState } from 'react';
import axios from 'axios';
import { LatLngLiteral, PlaceType, GeocodeResponse, NearbySearchResponse } from '@/types/google-maps';

export default function ApiTest() {
  // Geocoding test state
  const [address, setAddress] = useState<string>('');
  const [geocodeResults, setGeocodeResults] = useState<GeocodeResponse | null>(null);
  const [geocodeLoading, setGeocodeLoading] = useState<boolean>(false);
  const [geocodeError, setGeocodeError] = useState<string>('');

  // Nearby places test state
  const [latitude, setLatitude] = useState<string>('39.7432'); // Default to Denver Convention Center
  const [longitude, setLongitude] = useState<string>('-104.9959'); // Default to Denver Convention Center
  const [radius, setRadius] = useState<string>('1500');
  const [placeType, setPlaceType] = useState<PlaceType>('restaurant');
  const [keyword, setKeyword] = useState<string>(''); // Added keyword state
  const [nearbyResults, setNearbyResults] = useState<NearbySearchResponse | null>(null);
  const [nearbyLoading, setNearbyLoading] = useState<boolean>(false);
  const [nearbyError, setNearbyError] = useState<string>('');

  // Test geocoding API
  const testGeocodeApi = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!address.trim()) {
      setGeocodeError('Please enter an address');
      return;
    }
    
    setGeocodeLoading(true);
    setGeocodeError('');
    setGeocodeResults(null);
    
    try {
      // Make a GET request to the geocode API
      console.log('Testing geocode API with address:', address);
      const response = await axios.get<GeocodeResponse>('/api/geocode', {
        params: { address }
      });
      
      console.log('Geocode API response:', response.data);
      setGeocodeResults(response.data);
    } catch (error) {
      console.error('Error testing geocode API:', error);
      setGeocodeError(axios.isAxiosError(error) && error.response?.data?.message 
        ? error.response.data.message 
        : 'Error testing geocode API');
    } finally {
      setGeocodeLoading(false);
    }
  };

  // Test nearby places API
  const testNearbyPlacesApi = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!latitude.trim() || !longitude.trim()) {
      setNearbyError('Please enter latitude and longitude');
      return;
    }
    
    setNearbyLoading(true);
    setNearbyError('');
    setNearbyResults(null);
    
    try {
      // Prepare params object
      const params: Record<string, string> = {
        lat: latitude,
        lng: longitude,
        radius
      };
      
      // Only add type if it's not empty
      if (placeType) {
        params.type = placeType;
      }
      
      // Add keyword if provided
      if (keyword.trim()) {
        params.keyword = keyword.trim();
      }
      
      // Make a GET request to the nearby places API
      console.log('Testing nearby places API with params:', params);
      const response = await axios.get<NearbySearchResponse>('/api/nearby-places', { params });
      
      console.log('Nearby places API response:', response.data);
      setNearbyResults(response.data);
    } catch (error) {
      console.error('Error testing nearby places API:', error);
      setNearbyError(axios.isAxiosError(error) && error.response?.data?.message 
        ? error.response.data.message 
        : 'Error testing nearby places API');
    } finally {
      setNearbyLoading(false);
    }
  };

  // Set default to Denver landmarks
  const setDenverConventionCenter = () => {
    setLatitude('39.7432');
    setLongitude('-104.9959');
  };

  const setHyattRegency = () => {
    setLatitude('39.7435');
    setLongitude('-104.9954');
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>Google Maps API Testing</h1>
      <p style={{ marginBottom: '24px' }}>Use this page to test your Google Maps API endpoints</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '30px' }}>
        {/* Geocoding API Test */}
        <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '20px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>Test Geocoding API</h2>
          <form onSubmit={testGeocodeApi}>
            <div style={{ marginBottom: '15px' }}>
              <label htmlFor="address" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Address:
              </label>
              <input
                id="address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter an address"
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  borderRadius: '4px', 
                  border: '1px solid #ccc',
                  fontSize: '16px'
                }}
              />
            </div>
            <button
              type="submit"
              disabled={geocodeLoading}
              style={{
                padding: '8px 16px',
                backgroundColor: '#3367d6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: geocodeLoading ? 'not-allowed' : 'pointer',
                fontSize: '16px'
              }}
            >
              {geocodeLoading ? 'Testing...' : 'Test Geocode API'}
            </button>
          </form>

          {geocodeError && (
            <div style={{ color: 'red', marginTop: '16px', fontWeight: 'bold' }}>{geocodeError}</div>
          )}

          {geocodeResults && (
            <div style={{ marginTop: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>Results:</h3>
              
              {geocodeResults.results && geocodeResults.results.length > 0 ? (
                <div>
                  <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f0f8ff', borderRadius: '4px', color: 'black' }}>
                    <h4 style={{ fontWeight: 'bold', marginBottom: '8px' }}>Location Information:</h4>
                    <p style={{ margin: '4px 0' }}><strong>Formatted Address:</strong> {geocodeResults.results[0].formatted_address}</p>
                    <p style={{ margin: '4px 0' }}><strong>Latitude:</strong> {geocodeResults.results[0].geometry.location.lat}</p>
                    <p style={{ margin: '4px 0' }}><strong>Longitude:</strong> {geocodeResults.results[0].geometry.location.lng}</p>
                    <p style={{ margin: '4px 0' }}><strong>Place ID:</strong> {geocodeResults.results[0].place_id}</p>
                    
                    <button
                      onClick={() => {
                        const location = geocodeResults.results[0].geometry.location;
                        setLatitude(String(location.lat));
                        setLongitude(String(location.lng));
                      }}
                      style={{
                        marginTop: '12px',
                        padding: '6px 12px',
                        backgroundColor: '#4caf50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Use these coordinates for Nearby Places
                    </button>
                  </div>
                  
                  <details style={{ marginTop: '16px' }}>
                    <summary style={{ cursor: 'pointer', fontWeight: 'bold', padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px' , color: 'black'}}>
                      View Full JSON Response
                    </summary>
                    <div style={{ 
                      marginTop: '8px',
                      padding: '12px', 
                      backgroundColor: '#f8f8f8', 
                      borderRadius: '4px',
                      overflowX: 'auto',
                      maxHeight: '300px',
                      overflowY: 'auto',
                      color: 'black'
                    }}>
                      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {JSON.stringify(geocodeResults, null, 2)}
                      </pre>
                    </div>
                  </details>
                </div>
              ) : (
                <div style={{ color: 'orange', fontWeight: 'bold' }}>
                  No results found for this address. Status: {geocodeResults.status}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Nearby Places API Test */}
        <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '20px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>Test Nearby Places API</h2>
          
          {/* Quick set buttons for conference locations */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <button
              onClick={setDenverConventionCenter}
              style={{
                padding: '6px 12px',
                backgroundColor: '#9c27b0',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Set Denver Convention Center
            </button>
            
            <button
              onClick={setHyattRegency}
              style={{
                padding: '6px 12px',
                backgroundColor: '#2196f3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Set Hyatt Regency Hotel
            </button>
          </div>
          
          <form onSubmit={testNearbyPlacesApi}>
            <div style={{ marginBottom: '15px' }}>
              <label htmlFor="latitude" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Latitude:
              </label>
              <input
                id="latitude"
                type="text"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="Enter latitude"
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  borderRadius: '4px', 
                  border: '1px solid #ccc',
                  fontSize: '16px'
                }}
              />
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <label htmlFor="longitude" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Longitude:
              </label>
              <input
                id="longitude"
                type="text"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="Enter longitude"
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  borderRadius: '4px', 
                  border: '1px solid #ccc',
                  fontSize: '16px'
                }}
              />
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <label htmlFor="radius" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Radius (meters):
              </label>
              <input
                id="radius"
                type="text"
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
                placeholder="Enter radius in meters"
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  borderRadius: '4px', 
                  border: '1px solid #ccc',
                  fontSize: '16px'
                }}
              />
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <label htmlFor="placeType" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Place Type:
              </label>
              <select
                id="placeType"
                value={placeType}
                onChange={(e) => setPlaceType(e.target.value as PlaceType)}
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  borderRadius: '4px', 
                  border: '1px solid #ccc',
                  fontSize: '16px'
                }}
              >
                <option value="restaurant">Restaurant</option>
                <option value="cafe">Cafe</option>
                <option value="hotel">Hotel</option>
                <option value="bar">Bar</option>
                <option value="tourist_attraction">Tourist Attraction</option>
                <option value="shopping_mall">Shopping Mall</option>
                <option value="museum">Museum</option>
                <option value="parking">Parking</option>
                <option value="subway_station">Subway Station</option>
              </select>
            </div>
            
            {/* Added keyword search field */}
            <div style={{ marginBottom: '15px' }}>
              <label htmlFor="keyword" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Keyword Search: <span style={{ fontWeight: 'normal', fontSize: '14px', color: '#666' }}>(e.g., "sushi", "coffee", "italian")</span>
              </label>
              <input
                id="keyword"
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Enter search term (optional)"
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  borderRadius: '4px', 
                  border: '1px solid #ccc',
                  fontSize: '16px'
                }}
              />
            </div>
            
            <button
              type="submit"
              disabled={nearbyLoading}
              style={{
                padding: '8px 16px',
                backgroundColor: '#3367d6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: nearbyLoading ? 'not-allowed' : 'pointer',
                fontSize: '16px'
              }}
            >
              {nearbyLoading ? 'Testing...' : 'Test Nearby Places API'}
            </button>
          </form>

          {nearbyError && (
            <div style={{ color: 'red', marginTop: '16px', fontWeight: 'bold' }}>{nearbyError}</div>
          )}

          {nearbyResults && (
            <div style={{ marginTop: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>Results:</h3>
              
              <div style={{ marginBottom: '12px' }}>
                <p style={{ margin: '4px 0' }}><strong>Status:</strong> {nearbyResults.status}</p>
                <p style={{ margin: '4px 0' }}><strong>Places found:</strong> {nearbyResults.results?.length || 0}</p>
                {keyword && <p style={{ margin: '4px 0' }}><strong>Search keyword:</strong> "{keyword}"</p>}
              </div>
              
              {nearbyResults.results && nearbyResults.results.length > 0 ? (
                <div className='!text-black'>
                  <h4 style={{ fontWeight: 'bold', marginBottom: '8px' }}>Places Found:</h4>
                  <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '16px' }}>
                    {nearbyResults.results.map((place, index) => (
                      <div 
                        key={place.place_id} 
                        style={{
                          padding: '12px',
                          marginBottom: '8px',
                          backgroundColor: '#f9f9f9',
                          borderRadius: '4px',
                          border: '1px solid #eee',
                          color: 'black'
                        }}
                      >
                        <h5 style={{ fontWeight: 'bold', margin: '0 0 8px 0' }}>{index + 1}. {place.name}</h5>
                        <p style={{ margin: '4px 0' }}><strong>Address:</strong> {place.vicinity}</p>
                        <p style={{ margin: '4px 0' }}><strong>Rating:</strong> {place.rating ? `${place.rating} ⭐ (${place.user_ratings_total} reviews)` : 'No ratings'}</p>
                        {place.opening_hours && (
                          <p style={{ margin: '4px 0' }}>
                            <strong>Open now:</strong> {place.opening_hours.open_now ? '✅ Yes' : '❌ No'}
                          </p>
                        )}
                        <p style={{ margin: '4px 0' }}>
                          <a 
                            href={`https://www.google.com/maps/search/?api=1&query=${place.geometry.location.lat},${place.geometry.location.lng}&query_place_id=${place.place_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#3367d6', textDecoration: 'none' }}
                          >
                            View on Google Maps
                          </a>
                        </p>
                      </div>
                    ))}
                  </div>
                  
                  <details style={{ marginTop: '16px' }}>
                    <summary style={{ cursor: 'pointer', fontWeight: 'bold', padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px', color: 'black' }}>
                      View Full JSON Response
                    </summary>
                    <div style={{ 
                      marginTop: '8px',
                      padding: '12px', 
                      backgroundColor: '#f8f8f8', 
                      borderRadius: '4px',
                      overflowX: 'auto',
                      maxHeight: '300px',
                      overflowY: 'auto',
                      color: 'black'
                    }}>
                      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {JSON.stringify(nearbyResults, null, 2)}
                      </pre>
                    </div>
                  </details>
                </div>
              ) : (
                <div style={{ color: 'orange', fontWeight: 'bold' }}>
                  No places found for these parameters. Status: {nearbyResults.status}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}