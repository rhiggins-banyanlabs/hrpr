-- Create table for storing intent embeddings
CREATE TABLE IF NOT EXISTS intent_embeddings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  intent TEXT NOT NULL,
  example TEXT NOT NULL,
  embedding vector(1536),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_intent_embeddings_intent ON intent_embeddings(intent);

-- Function to search intents by embedding similarity
CREATE OR REPLACE FUNCTION search_intents_by_embedding(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  intent TEXT,
  example TEXT,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ie.intent,
    ie.example,
    1 - (ie.embedding <=> query_embedding) as similarity
  FROM intent_embeddings ie
  WHERE ie.embedding IS NOT NULL
    AND 1 - (ie.embedding <=> query_embedding) > match_threshold
  ORDER BY ie.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;