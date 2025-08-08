-- Create table for conference schedule embeddings
CREATE TABLE IF NOT EXISTS conference_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day TEXT NOT NULL,
  "time" TEXT NOT NULL,
  event TEXT NOT NULL,
  -- Additional metadata fields
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  location TEXT,
  event_type TEXT,
  -- Embedding and search fields
  embedding vector(1536),
  search_text TEXT,
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for vector similarity search
CREATE INDEX IF NOT EXISTS conference_schedule_embedding_idx 
ON conference_schedule 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create index for text search
CREATE INDEX IF NOT EXISTS conference_schedule_search_idx
ON conference_schedule
USING gin(to_tsvector('english', search_text));

-- Create index for time-based queries
CREATE INDEX IF NOT EXISTS conference_schedule_time_idx
ON conference_schedule(start_time, end_time);

-- Create function to update search_text
CREATE OR REPLACE FUNCTION update_schedule_search_text()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_text := LOWER(
    COALESCE(NEW.day, '') || ' ' ||
    COALESCE(NEW."time", '') || ' ' ||
    COALESCE(NEW.event, '') || ' ' ||
    COALESCE(NEW.location, '') || ' ' ||
    COALESCE(NEW.event_type, '')
  );
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update search_text
CREATE TRIGGER update_schedule_search_text_trigger
BEFORE INSERT OR UPDATE ON conference_schedule
FOR EACH ROW
EXECUTE FUNCTION update_schedule_search_text();

-- Function to search schedule by similarity
CREATE OR REPLACE FUNCTION search_schedule(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  day TEXT,
  "time" TEXT,
  event TEXT,
  location TEXT,
  event_type TEXT,
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cs.id,
    cs.day,
    cs."time",
    cs.event,
    cs.location,
    cs.event_type,
    cs.start_time,
    cs.end_time,
    1 - (cs.embedding <=> query_embedding) as similarity
  FROM conference_schedule cs
  WHERE 1 - (cs.embedding <=> query_embedding) > match_threshold
  ORDER BY cs.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function to search schedule by text
CREATE OR REPLACE FUNCTION search_schedule_by_text(
  query_text TEXT,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  day TEXT,
  "time" TEXT,
  event TEXT,
  location TEXT,
  event_type TEXT,
  start_time TIMESTAMP,
  end_time TIMESTAMP
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cs.id,
    cs.day,
    cs."time",
    cs.event,
    cs.location,
    cs.event_type,
    cs.start_time,
    cs.end_time
  FROM conference_schedule cs
  WHERE to_tsvector('english', cs.search_text) @@ plainto_tsquery('english', query_text)
  ORDER BY ts_rank(to_tsvector('english', cs.search_text), plainto_tsquery('english', query_text)) DESC
  LIMIT match_count;
END;
$$;