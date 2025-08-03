-- Create table for conference workshops
CREATE TABLE IF NOT EXISTS workshops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core workshop information
  title TEXT NOT NULL,
  overview TEXT,
  
  -- Schedule information
  day TEXT,
  date TEXT,
  start_time TIME,
  end_time TIME,
  time_block TEXT, -- Store original time format like "8:00 am – 9:30 am"
  room TEXT,
  
  -- Classification
  primary_community TEXT, -- e.g., "Adult Corrections/Prisons & Jails"
  credits TEXT, -- e.g., "[ΨCE|CE|CME|CEU]"
  
  -- Learning objectives (stored as JSONB array)
  learning_objectives JSONB,
  
  -- Speakers/Moderators (stored as JSONB for flexibility)
  moderators JSONB,
  speakers JSONB,
  
  -- Search and embedding fields
  search_text TEXT,
  embedding vector(1536),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better search performance
CREATE INDEX IF NOT EXISTS workshops_title_idx ON workshops(title);
CREATE INDEX IF NOT EXISTS workshops_day_idx ON workshops(day);
CREATE INDEX IF NOT EXISTS workshops_date_idx ON workshops(date);
CREATE INDEX IF NOT EXISTS workshops_room_idx ON workshops(room);
CREATE INDEX IF NOT EXISTS workshops_primary_community_idx ON workshops(primary_community);
CREATE INDEX IF NOT EXISTS workshops_search_idx ON workshops USING gin(to_tsvector('english', search_text));

-- Create embedding index for vector search
CREATE INDEX IF NOT EXISTS workshops_embedding_idx 
ON workshops 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Function to update search text
CREATE OR REPLACE FUNCTION update_workshops_search_text()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_text := LOWER(
    COALESCE(NEW.title, '') || ' ' ||
    COALESCE(NEW.overview, '') || ' ' ||
    COALESCE(NEW.day, '') || ' ' ||
    COALESCE(NEW.room, '') || ' ' ||
    COALESCE(NEW.primary_community, '') || ' ' ||
    COALESCE(NEW.credits, '') || ' ' ||
    COALESCE(NEW.learning_objectives::text, '') || ' ' ||
    COALESCE(NEW.speakers::text, '') || ' ' ||
    'workshop training session'
  );
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update search_text
CREATE TRIGGER update_workshops_search_text_trigger
BEFORE INSERT OR UPDATE ON workshops
FOR EACH ROW
EXECUTE FUNCTION update_workshops_search_text();

-- Function to search workshops
CREATE OR REPLACE FUNCTION search_workshops(
  query_text TEXT,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  overview TEXT,
  day TEXT,
  date TEXT,
  time_block TEXT,
  room TEXT,
  primary_community TEXT,
  credits TEXT,
  speakers JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    w.id,
    w.title,
    w.overview,
    w.day,
    w.date,
    w.time_block,
    w.room,
    w.primary_community,
    w.credits,
    w.speakers
  FROM workshops w
  WHERE to_tsvector('english', w.search_text) @@ plainto_tsquery('english', query_text)
  ORDER BY ts_rank(to_tsvector('english', w.search_text), plainto_tsquery('english', query_text)) DESC
  LIMIT match_count;
END;
$$;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Workshops table created successfully!';
  RAISE NOTICE 'Ready to import workshop data from various formats';
END $$;