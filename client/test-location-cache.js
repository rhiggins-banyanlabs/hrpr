// Test script for comparing original vs cached location routes
// Run with: node test-location-cache.js

async function testLocationCacheComparison() {
  console.log('🧪 Testing Original vs Cached Location Routes...\n');
  
  const originalUrl = 'http://localhost:3000/api/places';
  const cachedUrl = 'http://localhost:3000/api/places-cached';
  
  // Test queries
  const testQueries = [
    { type: 'restaurant', radius: 1500, name: 'Restaurants' },
    { type: 'restaurant', keyword: 'fast food', radius: 2000, name: 'Fast Food' },
    { keyword: 'car rental', radius: 5000, name: 'Car Rentals' },
    { keyword: 'airport', radius: 10000, name: 'Airport' },
    { type: 'lodging', radius: 3000, name: 'Hotels' }
  ];
  
  for (let i = 0; i < testQueries.length; i++) {
    const query = testQueries[i];
    const params = new URLSearchParams();
    if (query.type) params.append('type', query.type);
    if (query.keyword) params.append('keyword', query.keyword);
    params.append('radius', query.radius.toString());
    
    console.log(`\n=== Test ${i + 1}: ${query.name} ===`);
    
    // Test original route
    console.log('📍 Original route (no caching):');
    try {
      const start1 = Date.now();
      const response1 = await fetch(`${originalUrl}?${params.toString()}`);
      const data1 = await response1.json();
      const duration1 = Date.now() - start1;
      console.log(`✅ Found ${data1.results?.length || 0} results in ${duration1}ms`);
      console.log(`First 3: ${data1.results?.slice(0, 3).map(p => p.name).join(', ') || 'None'}`);
    } catch (error) {
      console.error('❌ Error:', error.message);
    }
    
    // Test cached route (first call)
    console.log('💾 Cached route (first call - should cache):');
    try {
      const start2 = Date.now();
      const response2 = await fetch(`${cachedUrl}?${params.toString()}`);
      const data2 = await response2.json();
      const duration2 = Date.now() - start2;
      console.log(`✅ Found ${data2.results?.length || 0} results in ${duration2}ms`);
      console.log(`Cached: ${data2.metadata?.cached ? 'YES' : 'NO'} | Response time: ${data2.metadata?.responseTime}ms`);
      console.log(`First 3: ${data2.results?.slice(0, 3).map(p => p.name).join(', ') || 'None'}`);
    } catch (error) {
      console.error('❌ Error:', error.message);
    }
    
    // Test cached route (second call - should be faster)
    console.log('⚡ Cached route (second call - should be from cache):');
    try {
      const start3 = Date.now();
      const response3 = await fetch(`${cachedUrl}?${params.toString()}`);
      const data3 = await response3.json();
      const duration3 = Date.now() - start3;
      console.log(`✅ Found ${data3.results?.length || 0} results in ${duration3}ms`);
      console.log(`Cached: ${data3.metadata?.cached ? 'YES' : 'NO'} | Response time: ${data3.metadata?.responseTime}ms`);
      console.log(`First 3: ${data3.results?.slice(0, 3).map(p => p.name).join(', ') || 'None'}`);
    } catch (error) {
      console.error('❌ Error:', error.message);
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n🏁 Test completed! Check if cached requests are faster on second calls.');
}

// Check if server is running
console.log('🔍 Checking if server is running...');
fetch('http://localhost:3000')
  .then(() => {
    console.log('✅ Server is running');
    console.log('📝 Make sure you have:');
    console.log('   1. Created the location_cache table in Supabase');
    console.log('   2. Set GOOGLE_MAPS_API_KEY environment variable');
    console.log('   3. Started the server with: npm run dev\n');
    testLocationCacheComparison();
  })
  .catch(() => {
    console.log('❌ Server is not running. Please start with: cd client && npm run dev\n');
  });