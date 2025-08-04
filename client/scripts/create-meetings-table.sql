-- Create a dedicated table for committee and council meetings
-- This keeps them separate from general conference schedule for better organization

CREATE TABLE IF NOT EXISTS committee_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_name TEXT NOT NULL,
  meeting_type TEXT NOT NULL, -- 'Committee Meeting', 'Council Meeting', 'Training', 'Standards Meeting'
  day TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  location TEXT NOT NULL,
  room_number TEXT,
  building TEXT, -- 'Convention Center' or 'Hotel'
  description TEXT,
  is_open_to_all BOOLEAN DEFAULT true,
  keywords TEXT[], -- Array of searchable keywords
  search_text TEXT,
  embedding vector(1536),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes for better search performance
CREATE INDEX IF NOT EXISTS idx_committee_meetings_day ON committee_meetings(day);
CREATE INDEX IF NOT EXISTS idx_committee_meetings_committee ON committee_meetings(committee_name);
CREATE INDEX IF NOT EXISTS idx_committee_meetings_type ON committee_meetings(meeting_type);
CREATE INDEX IF NOT EXISTS idx_committee_meetings_start ON committee_meetings(start_time);

-- Create full text search index
CREATE INDEX IF NOT EXISTS idx_committee_meetings_search ON committee_meetings USING gin(to_tsvector('english', search_text));

-- Function to search committee meetings by text
CREATE OR REPLACE FUNCTION search_committee_meetings(
  query_text TEXT,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  committee_name TEXT,
  meeting_type TEXT,
  day TEXT,
  "time" TEXT,
  location TEXT,
  description TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cm.id,
    cm.committee_name,
    cm.meeting_type,
    cm.day,
    cm."time",
    cm.location,
    cm.description
  FROM committee_meetings cm
  WHERE 
    cm.search_text ILIKE '%' || query_text || '%'
    OR cm.committee_name ILIKE '%' || query_text || '%'
    OR query_text = ANY(cm.keywords)
  ORDER BY 
    CASE 
      WHEN cm.committee_name ILIKE query_text THEN 1
      WHEN cm.committee_name ILIKE query_text || '%' THEN 2
      WHEN cm.committee_name ILIKE '%' || query_text || '%' THEN 3
      ELSE 4
    END,
    cm.start_time
  LIMIT match_count;
END;
$$;

-- Function to search committee meetings by embedding (semantic search)
CREATE OR REPLACE FUNCTION search_committee_meetings_semantic(
  query_embedding vector(1536),
  match_count INT DEFAULT 5,
  similarity_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  committee_name TEXT,
  meeting_type TEXT,
  day TEXT,
  "time" TEXT,
  location TEXT,
  description TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cm.id,
    cm.committee_name,
    cm.meeting_type,
    cm.day,
    cm."time",
    cm.location,
    cm.description,
    1 - (cm.embedding <=> query_embedding) AS similarity
  FROM committee_meetings cm
  WHERE 
    cm.embedding IS NOT NULL
    AND 1 - (cm.embedding <=> query_embedding) > similarity_threshold
  ORDER BY cm.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function to get all meetings for a specific day
CREATE OR REPLACE FUNCTION get_meetings_by_day(
  target_day TEXT
)
RETURNS TABLE (
  committee_name TEXT,
  meeting_type TEXT,
  "time" TEXT,
  location TEXT,
  start_time TIMESTAMP
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cm.committee_name,
    cm.meeting_type,
    cm."time",
    cm.location,
    cm.start_time
  FROM committee_meetings cm
  WHERE cm.day ILIKE target_day
  ORDER BY cm.start_time;
END;
$$;

-- Function to get meetings by type
CREATE OR REPLACE FUNCTION get_meetings_by_type(
  target_type TEXT
)
RETURNS TABLE (
  committee_name TEXT,
  day TEXT,
  "time" TEXT,
  location TEXT,
  start_time TIMESTAMP
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cm.committee_name,
    cm.day,
    cm."time",
    cm.location,
    cm.start_time
  FROM committee_meetings cm
  WHERE cm.meeting_type ILIKE '%' || target_type || '%'
  ORDER BY cm.start_time;
END;
$$;