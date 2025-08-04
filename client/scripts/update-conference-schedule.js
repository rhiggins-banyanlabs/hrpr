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

// New conference schedule items to add
const NEW_SCHEDULE_ITEMS = [
  // THURSDAY, AUGUST 21
  {
    title: "Board of Governors Meeting",
    event_type: "Meeting",
    day: "Thursday",
    date: "August 21, 2025",
    start_time: "9:00 AM",
    end_time: "12:00 PM",
    location: "Four Seasons Ballroom 3 and 4",
    description: "Board of Governors Meeting",
    keywords: ["board", "governors", "leadership", "administration", "meeting"]
  },
  {
    title: "Delegate Assembly Meeting",
    event_type: "Meeting",
    day: "Thursday",
    date: "August 21, 2025",
    start_time: "2:00 PM",
    end_time: "4:00 PM",
    location: "Four Seasons Ballroom 3 and 4",
    description: "Delegate Assembly Meeting",
    keywords: ["delegate", "assembly", "leadership", "governance", "meeting"]
  },

  // FRIDAY, AUGUST 22
  {
    title: "Counter Terrorism Education Learning Lab (CELL)",
    event_type: "Off-Site Event",
    day: "Friday",
    date: "August 22, 2025",
    start_time: "10:00 AM",
    end_time: "5:00 PM",
    location: "99 West 12th Ave",
    description: "FREE Off-Site Event. Available: Fri, Sat, Mon or Tue. Pre-registration required",
    keywords: ["counter terrorism", "CELL", "security", "intelligence", "tactical", "free event", "off-site"]
  },
  {
    title: "Registration Opens",
    event_type: "Registration",
    day: "Friday",
    date: "August 22, 2025",
    start_time: "12:00 PM",
    end_time: "5:30 PM",
    location: "Convention Center",
    description: "Conference registration opens",
    keywords: ["registration", "check-in", "badges", "start"]
  },
  {
    title: "Transforming the Way We Deliver Health Care in Corrections",
    event_type: "Session",
    day: "Friday",
    date: "August 22, 2025",
    start_time: "1:00 PM",
    end_time: "3:00 PM",
    location: "Rooms 208, 210, and 212",
    description: "Healthcare transformation in corrections",
    keywords: ["healthcare", "medical", "transformation", "corrections healthcare", "innovation"]
  },
  {
    title: "Creative Kickoff",
    event_type: "Event",
    day: "Friday",
    date: "August 22, 2025",
    start_time: "3:30 PM",
    end_time: "5:00 PM",
    location: "Four Seasons Ballroom",
    description: "Creative kickoff event",
    keywords: ["kickoff", "opening", "creative", "networking", "start"]
  },
  {
    title: "Health Care Network Reception",
    event_type: "Reception",
    day: "Friday",
    date: "August 22, 2025",
    start_time: "5:30 PM",
    end_time: "6:30 PM",
    location: "Four Seasons Ballroom 3 and 4",
    description: "Sponsored by Correct Rx Pharmacy Services",
    keywords: ["healthcare", "reception", "networking", "Correct Rx", "pharmacy"]
  },

  // SATURDAY, AUGUST 23
  {
    title: "ACA General Session",
    event_type: "General Session",
    day: "Saturday",
    date: "August 23, 2025",
    start_time: "8:30 AM",
    end_time: "10:00 AM",
    location: "Bellco Theater",
    description: "Sponsored by Aramark Correctional Services, Inc. and Falcon Correctional and Community Services, Inc.",
    keywords: ["general session", "opening", "keynote", "Aramark", "Falcon", "main event"]
  },
  {
    title: "Exhibit Hall Open House and Wellness Lounge",
    event_type: "Exhibit",
    day: "Saturday",
    date: "August 23, 2025",
    start_time: "10:00 AM",
    end_time: "2:00 PM",
    location: "Exhibit Hall A and B1, 2nd Level",
    description: "Exhibit Hall Open House and Wellness Lounge (2 days)",
    keywords: ["exhibit", "vendors", "wellness", "expo", "exhibition", "booths"]
  },
  {
    title: "Correctional Mental Health Roundtable",
    event_type: "Featured Session",
    day: "Saturday",
    date: "August 23, 2025",
    start_time: "2:00 PM",
    end_time: "4:00 PM",
    location: "Rooms 405, 406, and 407",
    description: "Featured Session: Correctional Mental Health Roundtable",
    keywords: ["mental health", "behavioral health", "roundtable", "psychology", "psychiatric", "featured"]
  },
  {
    title: "Military Reception",
    event_type: "Reception",
    day: "Saturday",
    date: "August 23, 2025",
    start_time: "5:30 PM",
    end_time: "6:30 PM",
    location: "Four Seasons Ballroom 1",
    description: "Sponsored by CoreCivic",
    keywords: ["military", "veterans", "reception", "CoreCivic", "networking", "armed forces"]
  },

  // SUNDAY, AUGUST 24
  {
    title: "Evolving Spaces Symposium",
    event_type: "Symposium",
    day: "Sunday",
    date: "August 24, 2025",
    start_time: "9:00 AM",
    end_time: "4:00 PM",
    location: "Rooms 401, 402, 403, and 404",
    description: "Full day symposium on evolving correctional spaces",
    keywords: ["evolving spaces", "infrastructure", "facility design", "architecture", "sustainability", "symposium"]
  },
  {
    title: "Exhibit Hall - Sponsored Lunch & Grand Prize Drawing",
    event_type: "Exhibit",
    day: "Sunday",
    date: "August 24, 2025",
    start_time: "10:00 AM",
    end_time: "2:00 PM",
    location: "Exhibit Hall A and B1, 2nd Level",
    description: "Exhibit Hall Open/Sponsored Lunch/Grand Prize Drawing at 1:45 PM - MUST BE PRESENT TO WIN!",
    keywords: ["exhibit", "lunch", "grand prize", "drawing", "vendors", "must be present"]
  },
  {
    title: "Best Practices in Tactical Operations Lab",
    event_type: "Lab",
    day: "Sunday",
    date: "August 24, 2025",
    start_time: "1:00 PM",
    end_time: "5:00 PM",
    location: "Four Seasons Ballroom 3 and 4",
    description: "Hands-on tactical operations training lab",
    keywords: ["tactical", "operations", "CERT", "emergency response", "training", "lab", "hands-on"]
  },
  {
    title: "Leadership Training (Franklin Covey)",
    event_type: "Featured Session",
    day: "Sunday",
    date: "August 24, 2025",
    start_time: "1:00 PM",
    end_time: "4:00 PM",
    location: "Room 104",
    description: "Featured Session: Leadership Training by Franklin Covey",
    keywords: ["leadership", "Franklin Covey", "management", "training", "professional development", "featured"]
  },
  {
    title: "E.R. Cass President's Reception",
    event_type: "Reception",
    day: "Sunday",
    date: "August 24, 2025",
    start_time: "6:00 PM",
    end_time: "7:00 PM",
    location: "Centennial E through H (Hyatt Regency)",
    description: "Ticket required",
    keywords: ["president", "reception", "E.R. Cass", "formal", "ticket required", "VIP"]
  },
  {
    title: "E.R. Cass Award Banquet",
    event_type: "Banquet",
    day: "Sunday",
    date: "August 24, 2025",
    start_time: "7:00 PM",
    end_time: "9:00 PM",
    location: "Centennial E through H (Hyatt Regency)",
    description: "Ticket required",
    keywords: ["awards", "banquet", "E.R. Cass", "formal", "dinner", "ticket required", "ceremony"]
  },

  // MONDAY, AUGUST 25
  {
    title: "Opioid Summit: A Holistic Approach to the Treatment of Opioid Use Disorder",
    event_type: "Summit",
    day: "Monday",
    date: "August 25, 2025",
    start_time: "8:00 AM",
    end_time: "11:45 AM",
    location: "Rooms 506 and 507",
    description: "Comprehensive summit on opioid treatment approaches",
    keywords: ["opioid", "MOUD", "substance abuse", "addiction", "treatment", "summit", "medication assisted"]
  },
  {
    title: "Global Faith Conference",
    event_type: "Conference",
    day: "Monday",
    date: "August 25, 2025",
    start_time: "8:30 AM",
    end_time: "4:30 PM",
    location: "Rooms 401, 402, 403, and 404",
    description: "Full day faith-based programming conference",
    keywords: ["faith", "religion", "chaplain", "spiritual", "conference", "faith-based", "religious services"]
  },
  {
    title: "Juvenile Summit",
    event_type: "Summit",
    day: "Monday",
    date: "August 25, 2025",
    start_time: "9:00 AM",
    end_time: "4:00 PM",
    location: "Rooms 506 and 507",
    description: "Summit focused on juvenile justice and services",
    keywords: ["juvenile", "youth", "adolescent", "youth justice", "summit", "minors"]
  },
  {
    title: "Health Care Special Session & Luncheon",
    event_type: "Special Session",
    day: "Monday",
    date: "August 25, 2025",
    start_time: "12:00 PM",
    end_time: "1:30 PM",
    location: "Four Seasons Ballroom 1",
    description: "Seating is limited. Sponsored by Centurion, LLC",
    keywords: ["healthcare", "luncheon", "Centurion", "medical", "special session", "limited seating"]
  },
  {
    title: "Corrections Reimagined",
    event_type: "Featured Session",
    day: "Monday",
    date: "August 25, 2025",
    start_time: "1:00 PM",
    end_time: "3:00 PM",
    location: "Room 110",
    description: "Featured Session: Reimagining the future of corrections",
    keywords: ["innovation", "future", "reimagined", "technology", "reform", "featured", "transformation"]
  },

  // TUESDAY, AUGUST 26
  {
    title: "Performance-Based Auditor Training",
    event_type: "Training",
    day: "Tuesday",
    date: "August 26, 2025",
    start_time: "8:00 AM",
    end_time: "4:00 PM",
    location: "Rooms 201 and 203",
    description: "Full day training for performance-based auditors",
    keywords: ["auditor", "training", "performance", "standards", "compliance", "PbS"]
  },
  {
    title: "Global Faith Conference (Day 2)",
    event_type: "Conference",
    day: "Tuesday",
    date: "August 26, 2025",
    start_time: "8:30 AM",
    end_time: "12:30 PM",
    location: "Rooms 401, 402, 403, and 404",
    description: "Global Faith Conference continues",
    keywords: ["faith", "religion", "chaplain", "spiritual", "conference", "faith-based"]
  },
  {
    title: "Legal Update",
    event_type: "Featured Session",
    day: "Tuesday",
    date: "August 26, 2025",
    start_time: "9:00 AM",
    end_time: "10:30 AM",
    location: "Room 102",
    description: "Featured Session: Legal updates affecting corrections",
    keywords: ["legal", "law", "legislation", "compliance", "updates", "featured", "regulations"]
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
  const searchText = `${item.title} ${item.event_type} ${item.day} ${item.start_time} ${item.end_time} ${item.location} ${item.description} ${item.keywords.join(' ')}`;
  
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

async function updateSchedule() {
  console.log('🚀 Starting conference schedule update...');
  
  // Clear existing schedule first
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
  for (const item of NEW_SCHEDULE_ITEMS) {
    const startTimestamp = parseTime(item.day, item.date, item.start_time);
    const endTimestamp = parseTime(item.day, item.date, item.end_time);
    
    // Generate search text (without track since we're not using it)
    const searchText = `${item.title} ${item.event_type} ${item.day} ${item.start_time} ${item.end_time} ${item.location} ${item.description} ${item.keywords.join(' ')}`;
    
    // Generate embedding
    console.log(`🔄 Processing: ${item.title} - ${item.day}`);
    const embedding = await generateEmbedding(item);
    
    // Parse room and building from location
    let room = null;
    let building = 'Convention Center'; // Default
    
    if (item.location.includes('Four Seasons')) {
      building = 'Four Seasons';
      room = item.location.replace('Four Seasons', '').replace(/Ballroom/i, 'Ballroom').trim();
    } else if (item.location.includes('Hyatt')) {
      building = 'Hyatt Regency';
      room = item.location.replace(/\(Hyatt\)/i, '').trim();
    } else if (item.location.includes('Bellco')) {
      building = 'Convention Center';
      room = 'Bellco Theater';
    } else if (item.location.includes('Exhibit Hall')) {
      building = 'Convention Center';
      room = item.location;
    } else if (item.location.includes('Room')) {
      building = 'Convention Center';
      // Format rooms properly
      room = item.location.replace(/\//g, ', ').replace(/Rooms?\s+/i, 'Room ');
      if (room.includes(',')) {
        room = room.replace(/Room\s+/i, 'Rooms ');
      }
    } else if (item.location === '99 West 12th Ave') {
      building = 'Off-Site';
      room = null;
    }
    
    // Prepare schedule data (without track field)
    const scheduleData = {
      event: item.title,  // For backward compatibility
      title: item.title,
      event_type: item.event_type,
      day: item.day,
      date: item.date,
      time: `${item.start_time} - ${item.end_time}`, // For backward compatibility - stores text times
      start_time: startTimestamp,  // This column is TIMESTAMP in the database
      end_time: endTimestamp,      // This column is TIMESTAMP in the database  
      start_timestamp: startTimestamp,  // Also store in new timestamp columns
      end_timestamp: endTimestamp,      // Also store in new timestamp columns
      location: item.location,
      room: room,
      building: building,
      description: item.description,
      notes: item.notes || null,
      keywords: item.keywords,
      search_text: searchText,
      embedding: embedding
    };
    
    // Insert new
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
  
  console.log(`\n✅ Update complete!`);
  console.log(`   Successful: ${successCount}`);
  console.log(`   Errors: ${errorCount}`);
  if (!countError) {
    console.log(`   Total events in database: ${count}`);
  }
}

// Run the update
updateSchedule().catch(console.error);