-- Create table for intent embeddings
CREATE TABLE IF NOT EXISTS intent_embeddings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  intent VARCHAR(50) NOT NULL,
  example_text TEXT NOT NULL,
  embedding vector(1536), -- OpenAI ada-002 embeddings are 1536 dimensions
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for fast lookup
CREATE INDEX idx_intent_embeddings_intent ON intent_embeddings(intent);
CREATE INDEX idx_intent_embeddings_active ON intent_embeddings(is_active);
CREATE INDEX idx_intent_embeddings_embedding ON intent_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Create function to search by similarity
CREATE OR REPLACE FUNCTION search_intent_by_embedding(
  query_embedding vector(1536),
  match_count INT DEFAULT 5,
  similarity_threshold FLOAT DEFAULT 0.5
)
RETURNS TABLE (
  id UUID,
  intent VARCHAR,
  example_text TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ie.id,
    ie.intent,
    ie.example_text,
    1 - (ie.embedding <=> query_embedding) as similarity
  FROM intent_embeddings ie
  WHERE ie.is_active = true
    AND 1 - (ie.embedding <=> query_embedding) > similarity_threshold
  ORDER BY ie.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Create function to get all examples for an intent
CREATE OR REPLACE FUNCTION get_intent_examples(target_intent VARCHAR)
RETURNS TABLE (
  id UUID,
  example_text TEXT,
  embedding vector(1536)
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ie.id,
    ie.example_text,
    ie.embedding
  FROM intent_embeddings ie
  WHERE ie.intent = target_intent
    AND ie.is_active = true
  ORDER BY ie.created_at DESC;
END;
$$;

-- Create function to add new intent example
CREATE OR REPLACE FUNCTION add_intent_example(
  p_intent VARCHAR,
  p_example_text TEXT,
  p_embedding vector(1536)
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO intent_embeddings (intent, example_text, embedding)
  VALUES (p_intent, p_example_text, p_embedding)
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$;