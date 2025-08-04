-- Add AI Tech Expo as a featured event in the conference schedule
-- This is a special sponsored event that should be highlighted

-- First, add it to the conference_schedule table if not exists
INSERT INTO conference_schedule (
  day,
  time,
  event,
  location,
  event_type,
  start_time,
  end_time,
  search_text,
  embedding
) VALUES (
  'Saturday',
  '2:00 PM - 6:00 PM',
  'AI TECH EXPO - Explore the Future of Corrections | Featured sessions: The Use of AI: Separating Fact from Fiction, The Evolving Use of AI in Corrections, Safety Security and AI, The Impact and Possibilities of AI | Sponsored by VIA, VANT4GE, LEOTECH, AWS',
  'Four Seasons Ballroom 3/4',
  'Featured Event',
  '2025-08-23 14:00:00',
  '2025-08-23 18:00:00',
  'AI Tech Expo artificial intelligence technology future corrections separating fact fiction evolving safety security impact possibilities VIA VANT4GE LEOTECH AWS Four Seasons Ballroom Saturday featured event expo showcase demonstration',
  NULL -- Will generate embedding separately
)
ON CONFLICT DO NOTHING;

-- Alternative: If you want to update existing or insert new
-- Use this instead of the above INSERT:
/*
INSERT INTO conference_schedule (
  day,
  time,
  event,
  location,
  event_type,
  start_time,
  end_time,
  search_text
) VALUES (
  'Saturday',
  '2:00 PM - 6:00 PM',
  'AI TECH EXPO - Explore the Future of Corrections | Featured sessions: The Use of AI: Separating Fact from Fiction, The Evolving Use of AI in Corrections, Safety Security and AI, The Impact and Possibilities of AI | Sponsored by VIA, VANT4GE, LEOTECH, AWS',
  'Four Seasons Ballroom 3/4',
  'Featured Event',
  '2025-08-23 14:00:00',
  '2025-08-23 18:00:00',
  'AI Tech Expo artificial intelligence technology future corrections separating fact fiction evolving safety security impact possibilities VIA VANT4GE LEOTECH AWS Four Seasons Ballroom Saturday featured event expo showcase demonstration'
)
ON CONFLICT (day, time, event) 
DO UPDATE SET
  location = EXCLUDED.location,
  event_type = EXCLUDED.event_type,
  search_text = EXCLUDED.search_text;
*/