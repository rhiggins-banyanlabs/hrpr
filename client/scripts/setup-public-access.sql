-- Ensure intent_embeddings table is publicly accessible via Supabase API

-- First, disable RLS (if it's enabled)
ALTER TABLE intent_embeddings DISABLE ROW LEVEL SECURITY;

-- Or if you prefer to keep RLS enabled with public policies:
-- (Uncomment the section below and comment out the DISABLE line above)

/*
-- Enable RLS
ALTER TABLE intent_embeddings ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Allow public read access" ON intent_embeddings;
DROP POLICY IF EXISTS "Allow authenticated insert" ON intent_embeddings;
DROP POLICY IF EXISTS "Allow authenticated update" ON intent_embeddings;
DROP POLICY IF EXISTS "Allow authenticated delete" ON intent_embeddings;
DROP POLICY IF EXISTS "Allow public insert" ON intent_embeddings;
DROP POLICY IF EXISTS "Allow public update" ON intent_embeddings;
DROP POLICY IF EXISTS "Allow public delete" ON intent_embeddings;
DROP POLICY IF EXISTS "Allow all operations" ON intent_embeddings;

-- Create permissive policies for public access
-- These allow anyone to read/write via the API without authentication

-- Allow anyone to read (SELECT)
CREATE POLICY "Enable read access for all users" ON intent_embeddings
  FOR SELECT USING (true);

-- Allow anyone to insert (INSERT)
CREATE POLICY "Enable insert for all users" ON intent_embeddings
  FOR INSERT WITH CHECK (true);

-- Allow anyone to update (UPDATE)
CREATE POLICY "Enable update for all users" ON intent_embeddings
  FOR UPDATE USING (true);

-- Allow anyone to delete (DELETE)  
CREATE POLICY "Enable delete for all users" ON intent_embeddings
  FOR DELETE USING (true);
*/

-- Verify the table is accessible
-- This query should return results when run via the API
SELECT COUNT(*) as total_embeddings FROM intent_embeddings;

-- Test the search function
-- This should also work via the API
SELECT * FROM search_intent_by_embedding(
  ARRAY_FILL(0.1, ARRAY[1536])::vector(1536),  -- dummy embedding for testing
  5,
  0.0
) LIMIT 1;