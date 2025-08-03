-- Create table for correctional facility tours
CREATE TABLE IF NOT EXISTS facility_tours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Tour schedule information
  day TEXT NOT NULL,
  pickup_time TEXT,
  tour_times TEXT,
  dropoff_time TEXT,
  
  -- Facility information
  facility TEXT NOT NULL,
  facility_information TEXT,
  participants_allowed INTEGER,
  
  -- Search and embedding fields
  search_text TEXT,
  embedding vector(1536),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better search performance
CREATE INDEX IF NOT EXISTS facility_tours_day_idx ON facility_tours(day);
CREATE INDEX IF NOT EXISTS facility_tours_facility_idx ON facility_tours(facility);
CREATE INDEX IF NOT EXISTS facility_tours_search_idx ON facility_tours USING gin(to_tsvector('english', search_text));

-- Create embedding index for vector search
CREATE INDEX IF NOT EXISTS facility_tours_embedding_idx 
ON facility_tours 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Function to update search text
CREATE OR REPLACE FUNCTION update_facility_tours_search_text()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_text := LOWER(
    COALESCE(NEW.day, '') || ' ' ||
    COALESCE(NEW.facility, '') || ' ' ||
    COALESCE(NEW.facility_information, '') || ' ' ||
    COALESCE(NEW.pickup_time, '') || ' ' ||
    COALESCE(NEW.tour_times, '') || ' ' ||
    'tour facility correctional prison jail visit'
  );
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update search_text
CREATE TRIGGER update_facility_tours_search_text_trigger
BEFORE INSERT OR UPDATE ON facility_tours
FOR EACH ROW
EXECUTE FUNCTION update_facility_tours_search_text();

-- Function to search tours
CREATE OR REPLACE FUNCTION search_facility_tours(
  query_text TEXT,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  day TEXT,
  pickup_time TEXT,
  tour_times TEXT,
  dropoff_time TEXT,
  facility TEXT,
  facility_information TEXT,
  participants_allowed INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ft.id,
    ft.day,
    ft.pickup_time,
    ft.tour_times,
    ft.dropoff_time,
    ft.facility,
    ft.facility_information,
    ft.participants_allowed
  FROM facility_tours ft
  WHERE to_tsvector('english', ft.search_text) @@ plainto_tsquery('english', query_text)
  ORDER BY ts_rank(to_tsvector('english', ft.search_text), plainto_tsquery('english', query_text)) DESC
  LIMIT match_count;
END;
$$;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Facility tours table created successfully!';
  RAISE NOTICE 'Ready to import tour data';
END $$;