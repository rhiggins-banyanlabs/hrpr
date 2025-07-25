-- Location cache table for storing Google Maps API responses
-- This cache helps reduce API calls and improves response time

CREATE TABLE IF NOT EXISTS location_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Query parameters to match against
  query_type VARCHAR(100) NOT NULL DEFAULT 'any',
  query_keyword VARCHAR(255) NOT NULL DEFAULT 'any',
  query_radius INTEGER NOT NULL,
  -- Cached place data (stored as JSONB for flexibility)
  places JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Cache metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  -- Composite unique constraint for query matching
  CONSTRAINT unique_location_query UNIQUE (query_type, query_keyword, query_radius)
);

-- Indexes for fast lookups
CREATE INDEX idx_location_cache_expires ON location_cache(expires_at);
CREATE INDEX idx_location_cache_query ON location_cache(query_type, query_keyword, query_radius);

-- Function to clean up expired cache entries (can be run periodically)
CREATE OR REPLACE FUNCTION clean_expired_location_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM location_cache
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Optional: Create a scheduled job to clean cache daily (requires pg_cron extension)
-- SELECT cron.schedule('clean-location-cache', '0 3 * * *', 'SELECT clean_expired_location_cache();');

-- Grant permissions for Supabase anon role
GRANT ALL ON location_cache TO anon;
GRANT ALL ON location_cache TO authenticated;

-- Enable RLS (Row Level Security)
ALTER TABLE location_cache ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (can be restricted later)
CREATE POLICY "Allow all operations on location_cache" ON location_cache
  FOR ALL USING (true);

-- Sample query to verify cache hit rate (for monitoring)
-- SELECT 
--   COUNT(CASE WHEN created_at > NOW() - INTERVAL '1 hour' THEN 1 END) as recent_entries,
--   COUNT(*) as total_entries,
--   COUNT(DISTINCT (query_type, query_keyword, query_radius)) as unique_queries
-- FROM location_cache;