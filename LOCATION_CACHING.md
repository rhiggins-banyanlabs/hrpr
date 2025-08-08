# Location Caching System

## Overview

The location caching system implements a tiered lookup strategy to provide fast, efficient location queries while minimizing Google Maps API calls and associated costs. The system prioritizes local data over external API calls.

## Tiered Lookup Strategy

The system uses a 4-tier approach in order of priority:

### Tier 0: Scraped Venue Data (Fastest)
- **Source**: Pre-scraped venue data stored in Supabase `nearby_venues` table
- **Categories**: restaurants, fast_food, hotels, bars, shopping, parking, gas_stations
- **Response Time**: ~50-100ms
- **Coverage**: Common venue types near the conference center

### Tier 1: Memory Cache (Very Fast)
- **Source**: In-memory JavaScript Map
- **Duration**: 5 minutes
- **Response Time**: <1ms
- **Purpose**: Instant responses for repeated queries

### Tier 2: Database Cache (Fast)
- **Source**: Supabase `location_cache` table
- **Duration**: 7 days
- **Response Time**: ~100-200ms
- **Purpose**: Persistent cache across server restarts

### Tier 3: Google Maps API (Slowest)
- **Source**: Google Places Nearby Search API
- **Response Time**: ~500-2000ms
- **Cost**: $0.032 per request
- **Purpose**: Fresh data for queries not in cache

## Implementation Details

### Key Components

1. **LocationCacheService** (`src/services/location-cache.service.ts`)
   - Manages the tiered lookup logic
   - Handles cache reads and writes
   - Converts between different data formats

2. **VenueLookupService** (`src/services/venue-lookup.service.ts`)
   - Manages scraped venue data
   - Provides category detection
   - Formats venue responses

3. **LocationService** (`src/services/location.service.ts`)
   - Detects location intent in queries
   - Calls Google Maps API when needed
   - Calculates distances and walking times

4. **PromptEnhancementService** (`src/services/prompt-enhancement.service.ts`)
   - Integrates location data into AI responses
   - Manages the overall enhancement flow

### Database Schema

#### location_cache table
```sql
CREATE TABLE location_cache (
  id UUID PRIMARY KEY,
  query_type VARCHAR(100),
  query_keyword VARCHAR(255),
  query_radius INTEGER,
  places JSONB,
  created_at TIMESTAMP,
  expires_at TIMESTAMP
);
```

## Usage Examples

### Basic Location Query
When a user asks "Where can I find restaurants nearby?":
1. System checks scraped `restaurants` category (Tier 0)
2. If found, returns pre-scraped restaurant data
3. If not found, checks memory/database cache
4. If still not found, calls Google Maps API and caches result

### Specific Keyword Query
When a user asks "Where's the nearest Starbucks?":
1. System detects "fast_food" category with "starbucks" keyword
2. Checks if we have scraped Starbucks data
3. Falls back to cache/API for real-time data
4. Caches the result for future queries

## Performance Benefits

1. **Reduced Latency**: Most queries served from cache in <200ms
2. **Cost Savings**: Fewer Google Maps API calls = lower costs
3. **Reliability**: Works even if Google Maps API is down (for cached data)
4. **Scalability**: Memory cache handles high-frequency queries efficiently

## Cache Management

### Automatic Cleanup
- Memory cache: Entries expire after 5 minutes
- Database cache: Entries expire after 7 days
- Cleanup function available: `clearExpiredCache()`

### Manual Cache Operations
```typescript
// Preload common queries
await cacheService.preloadCommonQueries(locationService);

// Clear expired entries
await cacheService.clearExpiredCache();
```

## Configuration

### Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL`: Database connection
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Database authentication
- `GOOGLE_MAPS_API_KEY`: Google Maps API access

### Tuning Parameters
- `CACHE_DURATION_HOURS`: Database cache duration (default: 168 - 7 days)
- `MEMORY_CACHE_DURATION_MS`: Memory cache duration (default: 300000 - 5 minutes)

## Monitoring

Track cache performance with:
```sql
SELECT 
  COUNT(CASE WHEN created_at > NOW() - INTERVAL '1 hour' THEN 1 END) as recent_entries,
  COUNT(*) as total_entries,
  COUNT(DISTINCT (query_type, query_keyword, query_radius)) as unique_queries
FROM location_cache;
```

## Future Enhancements

1. **Smart Preloading**: Analyze query patterns to preload popular searches
2. **Geofencing**: Different cache strategies for different geographic areas
3. **Real-time Updates**: Webhook integration for venue hour changes
4. **Cache Warming**: Background jobs to refresh popular queries