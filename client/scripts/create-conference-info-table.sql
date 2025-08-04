-- Create table for general conference information
CREATE TABLE IF NOT EXISTS conference_info (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  topic TEXT NOT NULL,
  category TEXT,
  information TEXT NOT NULL,
  keywords TEXT[],
  priority INTEGER DEFAULT 0,
  url TEXT,
  search_text TEXT,
  embedding vector(1536),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes for better search performance
CREATE INDEX IF NOT EXISTS idx_conference_info_topic ON conference_info(topic);
CREATE INDEX IF NOT EXISTS idx_conference_info_category ON conference_info(category);
CREATE INDEX IF NOT EXISTS idx_conference_info_keywords ON conference_info USING gin(keywords);

-- Create full text search index
CREATE INDEX IF NOT EXISTS idx_conference_info_search ON conference_info 
USING gin(to_tsvector('english', COALESCE(search_text, '')));

-- Create function for semantic search
CREATE OR REPLACE FUNCTION search_conference_info(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  topic TEXT,
  category TEXT,
  information TEXT,
  keywords TEXT[],
  url TEXT,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ci.id,
    ci.topic,
    ci.category,
    ci.information,
    ci.keywords,
    ci.url,
    1 - (ci.embedding <=> query_embedding) as similarity
  FROM conference_info ci
  WHERE ci.embedding IS NOT NULL
    AND 1 - (ci.embedding <=> query_embedding) > match_threshold
  ORDER BY ci.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Create function for keyword search
CREATE OR REPLACE FUNCTION search_conference_info_by_keywords(
  search_keywords TEXT[],
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  topic TEXT,
  category TEXT,
  information TEXT,
  keywords TEXT[],
  url TEXT,
  match_score INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ci.id,
    ci.topic,
    ci.category,
    ci.information,
    ci.keywords,
    ci.url,
    cardinality(ci.keywords & search_keywords) as match_score
  FROM conference_info ci
  WHERE ci.keywords && search_keywords
  ORDER BY cardinality(ci.keywords & search_keywords) DESC, ci.priority DESC
  LIMIT match_count;
END;
$$;