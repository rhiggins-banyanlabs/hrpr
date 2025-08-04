-- Add new columns to conference_schedule table for better location and notes tracking

-- Add room column if it doesn't exist
ALTER TABLE conference_schedule 
ADD COLUMN IF NOT EXISTS room TEXT;

-- Add building column if it doesn't exist
ALTER TABLE conference_schedule 
ADD COLUMN IF NOT EXISTS building TEXT;

-- Add notes column if it doesn't exist
ALTER TABLE conference_schedule 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add description column if it doesn't exist (for better event descriptions)
ALTER TABLE conference_schedule 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add keywords column if it doesn't exist (for better search)
ALTER TABLE conference_schedule 
ADD COLUMN IF NOT EXISTS keywords TEXT[];

-- Add search_text column if it doesn't exist (for full text search)
ALTER TABLE conference_schedule 
ADD COLUMN IF NOT EXISTS search_text TEXT;

-- Add date column if it doesn't exist (for the actual date string)
ALTER TABLE conference_schedule 
ADD COLUMN IF NOT EXISTS date TEXT;

-- Add start_time and end_time as text if they don't exist
ALTER TABLE conference_schedule 
ADD COLUMN IF NOT EXISTS start_time TEXT;

ALTER TABLE conference_schedule 
ADD COLUMN IF NOT EXISTS end_time TEXT;

-- Add timestamps if they don't exist
ALTER TABLE conference_schedule 
ADD COLUMN IF NOT EXISTS start_timestamp TIMESTAMP;

ALTER TABLE conference_schedule 
ADD COLUMN IF NOT EXISTS end_timestamp TIMESTAMP;

-- Add event_type if it doesn't exist
ALTER TABLE conference_schedule 
ADD COLUMN IF NOT EXISTS event_type TEXT;

-- Add title column if it doesn't exist (some tables use 'event' some use 'title')
ALTER TABLE conference_schedule 
ADD COLUMN IF NOT EXISTS title TEXT;

-- If the table uses 'event' column, we'll keep both for compatibility
-- The import script will populate both fields with the same value

-- Create indexes for better search performance
CREATE INDEX IF NOT EXISTS idx_conference_schedule_day ON conference_schedule(day);
CREATE INDEX IF NOT EXISTS idx_conference_schedule_building ON conference_schedule(building);
CREATE INDEX IF NOT EXISTS idx_conference_schedule_event_type ON conference_schedule(event_type);
CREATE INDEX IF NOT EXISTS idx_conference_schedule_start_timestamp ON conference_schedule(start_timestamp);

-- Create full text search index if search_text exists
CREATE INDEX IF NOT EXISTS idx_conference_schedule_search ON conference_schedule 
USING gin(to_tsvector('english', COALESCE(search_text, '')));