-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Drop existing table if you need to recreate it
-- DROP TABLE IF EXISTS exhibitors CASCADE;

-- Create exhibitors table with vector embeddings
CREATE TABLE IF NOT EXISTS exhibitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Core fields from your CSV
  company_name TEXT NOT NULL,
  website_url TEXT,
  booth_number TEXT,
  primary_contact TEXT,
  contact_title TEXT,
  email_address TEXT,
  address_1 TEXT,
  address_2 TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  phone TEXT,
  industry_category TEXT,
  company_bio TEXT,
  -- Combined text field for embedding generation
  content_for_embedding TEXT GENERATED ALWAYS AS (
    COALESCE(company_name, '') || ' ' ||
    COALESCE(industry_category, '') || ' ' ||
    COALESCE(company_bio, '') || ' ' ||
    COALESCE(booth_number, '') || ' ' ||
    COALESCE(contact_title, '') || ' ' ||
    COALESCE(city, '') || ' ' ||
    COALESCE(state, '')
  ) STORED,
  -- Vector embedding field (1536 dimensions for OpenAI ada-002)
  embedding vector(1536),
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for vector similarity search
CREATE INDEX IF NOT EXISTS exhibitors_embedding_idx ON exhibitors 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create indexes for text search
CREATE INDEX IF NOT EXISTS exhibitors_company_name_idx ON exhibitors(company_name);
CREATE INDEX IF NOT EXISTS exhibitors_booth_number_idx ON exhibitors(booth_number);
CREATE INDEX IF NOT EXISTS exhibitors_industry_category_idx ON exhibitors(industry_category);

-- Create function to search exhibitors by similarity
CREATE OR REPLACE FUNCTION search_exhibitors(
  query_embedding vector(1536),
  match_count int DEFAULT 10,
  similarity_threshold float DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  company_name TEXT,
  website_url TEXT,
  booth_number TEXT,
  primary_contact TEXT,
  contact_title TEXT,
  email_address TEXT,
  phone TEXT,
  industry_category TEXT,
  company_bio TEXT,
  city TEXT,
  state TEXT,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.company_name,
    e.website_url,
    e.booth_number,
    e.primary_contact,
    e.contact_title,
    e.email_address,
    e.phone,
    e.industry_category,
    e.company_bio,
    e.city,
    e.state,
    1 - (e.embedding <=> query_embedding) AS similarity
  FROM exhibitors e
  WHERE e.embedding IS NOT NULL
    AND 1 - (e.embedding <=> query_embedding) > similarity_threshold
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;