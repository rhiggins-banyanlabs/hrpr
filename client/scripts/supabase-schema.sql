-- Enable pgvector extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS vector;

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

-- Add RLS policies
ALTER TABLE intent_embeddings ENABLE ROW LEVEL SECURITY;

-- Allow read access to all
CREATE POLICY "Allow public read access" ON intent_embeddings
  FOR SELECT USING (true);

-- Allow authenticated users to insert/update/delete
CREATE POLICY "Allow authenticated insert" ON intent_embeddings
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated update" ON intent_embeddings
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated delete" ON intent_embeddings
  FOR DELETE USING (auth.role() = 'authenticated');