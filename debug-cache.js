// Debug script to test location cache and see detailed logs
// Run with: node debug-cache.js

async function debugLocationCache() {
  console.log('🔍 Debug: Testing location cache...\n');
  
  const baseUrl = 'http://localhost:3001/api/places-cached';
  
  // Test a simple query
  const testQuery = {
    keyword: 'restaurant',
    radius: 1500
  };
  
  console.log('Testing query:', testQuery);
  
  try {
    const params = new URLSearchParams();
    params.append('keyword', testQuery.keyword);
    params.append('radius', testQuery.radius.toString());
    
    console.log(`Making request to: ${baseUrl}?${params.toString()}`);
    
    const response = await fetch(`${baseUrl}?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    console.log('\n✅ Response received:');
    console.log('- Results count:', data.results?.length || 0);
    console.log('- Response time:', data.metadata?.responseTime + 'ms');
    console.log('- Cached:', data.metadata?.cached);
    console.log('- Fallback used:', data.metadata?.fallback);
    
    if (data.results && data.results.length > 0) {
      console.log('\nFirst result:');
      console.log('- Name:', data.results[0].name);
      console.log('- Vicinity:', data.results[0].vicinity);
    }
    
    if (data.error) {
      console.log('\n❌ API Error:', data.error);
    }
    
  } catch (error) {
    console.error('\n❌ Request failed:', error.message);
  }
}

// Check server first
fetch('http://localhost:3001')
  .then(() => {
    console.log('✅ Server is running\n');
    debugLocationCache();
  })
  .catch(() => {
    console.log('❌ Server not running. Start with: npm run dev\n');
  });