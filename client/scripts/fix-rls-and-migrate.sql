-- Temporarily disable RLS for migration
ALTER TABLE intent_embeddings DISABLE ROW LEVEL SECURITY;

-- After migration is complete, re-enable with updated policies
-- Run this AFTER the migration script succeeds
ALTER TABLE intent_embeddings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow public read access" ON intent_embeddings;
DROP POLICY IF EXISTS "Allow authenticated insert" ON intent_embeddings;
DROP POLICY IF EXISTS "Allow authenticated update" ON intent_embeddings;
DROP POLICY IF EXISTS "Allow authenticated delete" ON intent_embeddings;

-- Create new policies that allow public operations (for migration and admin)
CREATE POLICY "Allow public read access" ON intent_embeddings
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert" ON intent_embeddings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update" ON intent_embeddings
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete" ON intent_embeddings
  FOR DELETE USING (true);
