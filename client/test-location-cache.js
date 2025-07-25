// Simple test script for location caching
// Run with: node test-location-cache.js

async function testLocationCache() {
  console.log('🧪 Testing Location Cache System...\n');
  
  // Test the API endpoint directly
  const baseUrl = 'http://localhost:3000/api/places';
  
  console.log('Test 1: Searching for restaurants...');
  const start1 = Date.now();
  try {
    const response1 = await fetch(`${baseUrl}?type=restaurant&radius=1500`);
    const data1 = await response1.json();
    const duration1 = Date.now() - start1;
    console.log(`✅ Found ${data1.results?.length || 0} restaurants in ${duration1}ms`);
    console.log(`First 3 results:`, data1.results?.slice(0, 3).map(p => p.name));
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  console.log('\nTest 2: Searching for fast food...');
  const start2 = Date.now();
  try {
    const response2 = await fetch(`${baseUrl}?type=restaurant&keyword=fast+food&radius=2000`);
    const data2 = await response2.json();
    const duration2 = Date.now() - start2;
    console.log(`✅ Found ${data2.results?.length || 0} fast food places in ${duration2}ms`);
    console.log(`First 3 results:`, data2.results?.slice(0, 3).map(p => p.name));
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  console.log('\nTest 3: Testing chat prompt enhancement...');
  try {
    const chatResponse = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Where can I find a good restaurant nearby?',
        sessionId: 'test-session-' + Date.now()
      })
    });
    const chatData = await chatResponse.json();
    console.log('✅ Chat response received');
    console.log('Response preview:', chatData.response?.substring(0, 200) + '...');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Check if server is running
fetch('http://localhost:3000')
  .then(() => {
    console.log('✅ Server is running\n');
    testLocationCache();
  })
  .catch(() => {
    console.log('❌ Server is not running. Please start with: cd client && npm run dev\n');
  });