-- Add vector search function for workshops
CREATE OR REPLACE FUNCTION search_workshops_semantic(
  query_embedding vector(1536),
  match_count int DEFAULT 10,
  similarity_threshold float DEFAULT 0.7
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
  speakers JSONB,
  moderators JSONB,
  learning_objectives JSONB,
  similarity float
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
    w.speakers,
    w.moderators,
    w.learning_objectives,
    1 - (w.embedding <=> query_embedding) AS similarity
  FROM workshops w
  WHERE w.embedding IS NOT NULL
    AND 1 - (w.embedding <=> query_embedding) > similarity_threshold
  ORDER BY w.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Workshop semantic search function created!';
END $$;