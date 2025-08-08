const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
const OpenAI = require('openai');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Complete conference schedule with all events
const CONFERENCE_SCHEDULE = [
  // THURSDAY, AUGUST 21
  {
    title: "Board of Governors Meeting",
    event_type: "Meeting",
    day: "Thursday",
    date: "August 21, 2025",
    start_time_text: "9:00 AM",
    end_time_text: "12:00 PM",
    location: "Four Seasons Ballroom 3 and 4",
    room: "Ballroom 3 and 4",
    building: "Four Seasons",
    description: "Board of Governors Meeting for ACA leadership",
    notes: null,
    keywords: ["board", "governors", "leadership", "administration", "meeting"]
  },
  {
    title: "Delegate Assembly Meeting",
    event_type: "Meeting",
    day: "Thursday",
    date: "August 21, 2025",
    start_time_text: "2:00 PM",
    end_time_text: "4:00 PM",
    location: "Four Seasons Ballroom 3 and 4",
    room: "Ballroom 3 and 4",
    building: "Four Seasons",
    description: "Delegate Assembly Meeting for organizational governance",
    notes: null,
    keywords: ["delegate", "assembly", "leadership", "governance", "meeting"]
  },

  // FRIDAY, AUGUST 22
  {
    title: "Correctional Facility Tours",
    event_type: "Tour",
    day: "Friday",
    date: "August 22, 2025",
    start_time_text: "8:00 AM",
    end_time_text: "5:00 PM",
    location: "Various Facilities",
    room: null,
    building: "Off-Site",
    description: "Tours of local correctional facilities",
    notes: "Multiple tour options available throughout the day",
    keywords: ["tour", "facility", "prison", "jail", "visit", "correctional"]
  },
  {
    title: "Counter Terrorism Education Learning Lab (CELL)",
    event_type: "Off-Site Event",
    day: "Friday",
    date: "August 22, 2025",
    start_time_text: "10:00 AM",
    end_time_text: "5:00 PM",
    location: "99 West 12th Ave",
    room: null,
    building: "Off-Site",
    description: "FREE Off-Site Event at the CELL facility for counter terrorism education",
    notes: "Available: Fri, Sat, Mon or Tue | Pre-registration required",
    keywords: ["counter terrorism", "CELL", "security", "intelligence", "tactical", "free event", "off-site", "pre-registration"]
  },
  {
    title: "Registration Opens",
    event_type: "Registration",
    day: "Friday",
    date: "August 22, 2025",
    start_time_text: "12:00 PM",
    end_time_text: "5:30 PM",
    location: "Convention Center",
    room: "Main Lobby",
    building: "Convention Center",
    description: "Conference registration and badge pickup opens",
    notes: null,
    keywords: ["registration", "check-in", "badges", "start", "pickup"]
  },
  {
    title: "Transforming the Way We Deliver Health Care in Corrections",
    event_type: "Session",
    day: "Friday",
    date: "August 22, 2025",
    start_time_text: "1:00 PM",
    end_time_text: "3:00 PM",
    location: "Rooms 208, 210, and 212",
    room: "208, 210, and 212",
    building: "Convention Center",
    description: "Healthcare transformation strategies and innovations in correctional settings",
    notes: null,
    keywords: ["healthcare", "medical", "transformation", "corrections healthcare", "innovation", "delivery"]
  },
  {
    title: "Committee on Performance-Based Standards",
    event_type: "Committee Meeting",
    day: "Friday",
    date: "August 22, 2025",
    start_time_text: "1:00 PM",
    end_time_text: "6:00 PM",
    location: "Rooms 108, 110, and 112",
    room: "108, 110, and 112",
    building: "Convention Center",
    description: "Performance-Based Standards Committee meeting",
    notes: null,
    keywords: ["committee", "performance", "standards", "PbS", "metrics", "quality"]
  },
  {
    title: "Creative Kickoff",
    event_type: "Event",
    day: "Friday",
    date: "August 22, 2025",
    start_time_text: "3:30 PM",
    end_time_text: "5:00 PM",
    location: "Four Seasons Ballroom",
    room: "Main Ballroom",
    building: "Four Seasons",
    description: "Creative kickoff event to start the conference",
    notes: null,
    keywords: ["kickoff", "opening", "creative", "networking", "start", "welcome"]
  },
  {
    title: "Health Care Network Reception",
    event_type: "Reception",
    day: "Friday",
    date: "August 22, 2025",
    start_time_text: "5:30 PM",
    end_time_text: "6:30 PM",
    location: "Four Seasons Ballroom 3 and 4",
    room: "Ballroom 3 and 4",
    building: "Four Seasons",
    description: "Healthcare professionals networking reception",
    notes: "Sponsored by Correct Rx Pharmacy Services",
    keywords: ["healthcare", "reception", "networking", "Correct Rx", "pharmacy", "medical professionals"]
  }
];

// Parse time to create timestamps
function parseTime(day, date, timeStr) {
  // Parse AM/PM time
  const [time, ampm] = timeStr.split(' ');
  let [hour, minute] = time.split(':').map(Number);
  
  if (ampm === 'PM' && hour !== 12) hour += 12;
  if (ampm === 'AM' && hour === 12) hour = 0;
  
  // Create ISO timestamps (using August 2025 dates)
  const dateMap = {
    'Thursday': '2025-08-21',
    'Friday': '2025-08-22',
    'Saturday': '2025-08-23',
    'Sunday': '2025-08-24',
    'Monday': '2025-08-25',
    'Tuesday': '2025-08-26'
  };
  
  const baseDate = dateMap[day];
  return `${baseDate}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
}

// Generate embedding for a schedule item
async function generateEmbedding(item) {
  const searchText = `${item.title} ${item.event_type} ${item.day} ${item.start_time_text} ${item.end_time_text} ${item.location} ${item.description} ${item.notes || ''} ${item.keywords.join(' ')}`;
  
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: searchText,
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    return null;
  }
}

async function importSchedule() {
  console.log('🚀 Starting conference schedule import (fixed version)...');
  
  // Clear existing schedule
  const { error: deleteError } = await supabase
    .from('conference_schedule')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
  
  if (deleteError) {
    console.error('Error clearing existing schedule:', deleteError);
    return;
  }
  
  console.log('✅ Cleared existing schedule');
  
  let successCount = 0;
  let errorCount = 0;
  
  // Process and insert each schedule item
  for (const item of CONFERENCE_SCHEDULE) {
    const startTimestamp = parseTime(item.day, item.date, item.start_time_text);
    const endTimestamp = parseTime(item.day, item.date, item.end_time_text);
    
    // Generate search text
    const searchText = `${item.title} ${item.event_type} ${item.day} ${item.start_time_text} ${item.end_time_text} ${item.location} ${item.description} ${item.notes || ''} ${item.keywords.join(' ')}`;
    
    // Generate embedding
    console.log(`🔄 Processing: ${item.title} - ${item.day}`);
    const embedding = await generateEmbedding(item);
    
    // Prepare schedule data - matching existing schema where start_time/end_time are timestamps
    const scheduleData = {
      event: item.title,  // For backward compatibility
      event_type: item.event_type,
      day: item.day,
      time: `${item.start_time_text} - ${item.end_time_text}`, // For backward compatibility
      start_time: startTimestamp,  // This is a timestamp in the existing schema
      end_time: endTimestamp,      // This is a timestamp in the existing schema
      location: item.location,
      description: item.description,
      keywords: item.keywords,
      search_text: searchText,
      embedding: embedding
    };
    
    // Insert into database
    const { error } = await supabase
      .from('conference_schedule')
      .insert(scheduleData);
    
    if (error) {
      console.error(`❌ Error inserting ${item.title}:`, error);
      errorCount++;
    } else {
      console.log(`✅ Inserted: ${item.title}`);
      successCount++;
    }
    
    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Verify final count
  const { data: count, error: countError } = await supabase
    .from('conference_schedule')
    .select('*', { count: 'exact', head: true });
  
  console.log(`\n✅ Import complete!`);
  console.log(`   Successful: ${successCount}`);
  console.log(`   Errors: ${errorCount}`);
  if (!countError) {
    console.log(`   Total events in database: ${count}`);
  }
}

// Run the import
importSchedule().catch(console.error);