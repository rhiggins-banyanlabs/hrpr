'use client';

import { useState } from 'react';

interface PlaceResult {
  name: string;
  vicinity?: string;
  rating?: number;
  place_id?: string;
  [key: string]: unknown;
}

interface TestResult {
  route: string;
  results: PlaceResult[];
  responseTime: number;
  cached?: boolean;
  error?: string;
}

export default function CacheTestPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [query, setQuery] = useState({
    type: 'restaurant',
    keyword: '',
    radius: '1500'
  });

  const testBothRoutes = async () => {
    setIsLoading(true);
    setTestResults([]);
    
    const params = new URLSearchParams();
    if (query.type) params.append('type', query.type);
    if (query.keyword) params.append('keyword', query.keyword);
    params.append('radius', query.radius);
    
    const results: TestResult[] = [];
    
    // Test original route
    try {
      const start1 = Date.now();
      const response1 = await fetch(`/api/places?${params.toString()}`);
      const data1 = await response1.json();
      const duration1 = Date.now() - start1;
      
      results.push({
        route: 'Original (/api/places)',
        results: data1.results || [],
        responseTime: duration1,
        error: data1.error
      });
    } catch {
      results.push({
        route: 'Original (/api/places)',
        results: [],
        responseTime: 0,
        error: 'Network error'
      });
    }
    
    // Test cached route (first call)
    try {
      const start2 = Date.now();
      const response2 = await fetch(`/api/places-cached?${params.toString()}`);
      const data2 = await response2.json();
      const duration2 = Date.now() - start2;
      
      results.push({
        route: 'Cached (/api/places-cached) - First Call',
        results: data2.results || [],
        responseTime: duration2,
        cached: data2.metadata?.cached,
        error: data2.error
      });
    } catch {
      results.push({
        route: 'Cached (/api/places-cached) - First Call',
        results: [],
        responseTime: 0,
        error: 'Network error'
      });
    }
    
    // Wait a moment then test cached route again
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
      const start3 = Date.now();
      const response3 = await fetch(`/api/places-cached?${params.toString()}`);
      const data3 = await response3.json();
      const duration3 = Date.now() - start3;
      
      results.push({
        route: 'Cached (/api/places-cached) - Second Call',
        results: data3.results || [],
        responseTime: duration3,
        cached: data3.metadata?.cached,
        error: data3.error
      });
    } catch {
      results.push({
        route: 'Cached (/api/places-cached) - Second Call',
        results: [],
        responseTime: 0,
        error: 'Network error'
      });
    }
    
    setTestResults(results);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Location Cache Testing
        </h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Test Configuration</h2>
          
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type
              </label>
              <select
                value={query.type}
                onChange={(e) => setQuery({...query, type: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Any</option>
                <option value="restaurant">Restaurant</option>
                <option value="lodging">Hotel</option>
                <option value="gas_station">Gas Station</option>
                <option value="bank">Bank</option>
                <option value="pharmacy">Pharmacy</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Keyword
              </label>
              <input
                type="text"
                value={query.keyword}
                onChange={(e) => setQuery({...query, keyword: e.target.value})}
                placeholder="e.g., fast food, car rental, airport"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Radius (meters)
              </label>
              <input
                type="number"
                value={query.radius}
                onChange={(e) => setQuery({...query, radius: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <button
            onClick={testBothRoutes}
            disabled={isLoading}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Testing...' : 'Test Both Routes'}
          </button>
        </div>
        
        {testResults.length > 0 && (
          <div className="space-y-6">
            {testResults.map((result, index) => (
              <div key={index} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">{result.route}</h3>
                  <div className="flex items-center space-x-4 text-sm">
                    <span className={`px-3 py-1 rounded-full ${
                      result.responseTime < 100 ? 'bg-green-100 text-green-800' :
                      result.responseTime < 500 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {result.responseTime}ms
                    </span>
                    {result.cached !== undefined && (
                      <span className={`px-3 py-1 rounded-full ${
                        result.cached ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {result.cached ? 'CACHED' : 'API CALL'}
                      </span>
                    )}
                  </div>
                </div>
                
                {result.error ? (
                  <div className="text-red-600 mb-4">
                    Error: {result.error}
                  </div>
                ) : (
                  <div>
                    <p className="text-gray-600 mb-3">
                      Found {result.results.length} places
                    </p>
                    
                    {result.results.slice(0, 5).map((place, i) => (
                      <div key={i} className="border-l-4 border-blue-200 pl-4 mb-2">
                        <h4 className="font-medium">{place.name}</h4>
                        <p className="text-sm text-gray-600">{place.vicinity}</p>
                        {place.rating && (
                          <p className="text-sm text-yellow-600">
                            ⭐ {place.rating}
                            {typeof place.price_level === 'number' && place.price_level > 0 && ` • ${'$'.repeat(place.price_level)}`}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}