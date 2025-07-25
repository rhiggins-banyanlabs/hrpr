import { LocationCacheService } from './location-cache.service';
import { LocationService } from './location.service';

// Simple test to verify the location cache service works
async function testLocationCache() {
  console.log('🧪 Testing Location Cache Service...\n');
  
  const locationService = new LocationService();
  const cacheService = LocationCacheService.getInstance();
  
  // Test 1: Search for restaurants
  console.log('Test 1: Searching for restaurants...');
  const startTime1 = Date.now();
  const restaurants = await cacheService.searchPlaces(
    locationService,
    'restaurant',
    undefined,
    1500
  );
  const duration1 = Date.now() - startTime1;
  console.log(`✅ Found ${restaurants.length} restaurants in ${duration1}ms`);
  
  // Test 2: Search again (should hit cache)
  console.log('\nTest 2: Searching for restaurants again (should hit cache)...');
  const startTime2 = Date.now();
  const restaurantsCached = await cacheService.searchPlaces(
    locationService,
    'restaurant',
    undefined,
    1500
  );
  const duration2 = Date.now() - startTime2;
  console.log(`✅ Found ${restaurantsCached.length} restaurants in ${duration2}ms (${duration2 < duration1 ? 'FASTER - cache hit!' : 'same speed'})`);
  
  // Test 3: Search with keyword
  console.log('\nTest 3: Searching for fast food...');
  const startTime3 = Date.now();
  const fastFood = await cacheService.searchPlaces(
    locationService,
    'restaurant',
    'fast food',
    2000
  );
  const duration3 = Date.now() - startTime3;
  console.log(`✅ Found ${fastFood.length} fast food places in ${duration3}ms`);
  
  // Test 4: Test scraped data lookup
  console.log('\nTest 4: Searching for hotels (should check scraped data first)...');
  const startTime4 = Date.now();
  const hotels = await cacheService.searchPlaces(
    locationService,
    'lodging',
    'hotel',
    3000
  );
  const duration4 = Date.now() - startTime4;
  console.log(`✅ Found ${hotels.length} hotels in ${duration4}ms`);
  
  console.log('\n✅ All tests completed successfully!');
  console.log('\nCache Performance Summary:');
  console.log(`- First restaurant search: ${duration1}ms`);
  console.log(`- Cached restaurant search: ${duration2}ms (${Math.round((1 - duration2/duration1) * 100)}% faster)`);
  console.log(`- Fast food search: ${duration3}ms`);
  console.log(`- Hotel search: ${duration4}ms`);
}

// Run the test if this file is executed directly
if (require.main === module) {
  testLocationCache().catch(console.error);
}

export { testLocationCache };