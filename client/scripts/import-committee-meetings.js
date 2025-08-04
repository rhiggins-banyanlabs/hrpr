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

// Committee meetings data for ACA 155th Congress of Correction
const COMMITTEE_MEETINGS = [
  // FRIDAY, AUGUST 22
  {
    committee_name: "Committee on Performance-Based Standards",
    meeting_type: "Standards Meeting",
    day: "Friday",
    date: "August 22, 2025",
    time: "1:00 PM - 6:00 PM",
    location: "Rooms 108/110/112 (CC)",
    room_number: "108/110/112",
    building: "Convention Center",
    description: "Performance-based standards meeting and review",
    is_open_to_all: true,
    keywords: ["performance", "standards", "PbS", "metrics", "quality", "benchmarks"]
  },

  // SATURDAY, AUGUST 23
  {
    committee_name: "Correctional Health Care Committee",
    meeting_type: "Committee Meeting",
    day: "Saturday",
    date: "August 23, 2025",
    time: "7:00 AM - 8:00 AM",
    location: "Room 301 (CC)",
    room_number: "301",
    building: "Convention Center",
    description: "Discussion of healthcare initiatives and policies for correctional facilities",
    is_open_to_all: true,
    keywords: ["healthcare", "medical", "health care", "medical services", "correctional healthcare"]
  },
  {
    committee_name: "Adult Corrections Committee",
    meeting_type: "Committee Meeting",
    day: "Saturday",
    date: "August 23, 2025",
    time: "12:00 PM - 1:30 PM",
    location: "Room 302 (CC)",
    room_number: "302",
    building: "Convention Center",
    description: "Meeting focused on adult correctional facility operations and best practices",
    is_open_to_all: true,
    keywords: ["adult corrections", "prison", "correctional facilities", "inmates", "custody"]
  },
  {
    committee_name: "Legal Issues Committee",
    meeting_type: "Committee Meeting",
    day: "Saturday",
    date: "August 23, 2025",
    time: "1:00 PM - 2:00 PM",
    location: "Room 301 (CC)",
    room_number: "301",
    building: "Convention Center",
    description: "Review of legal matters affecting correctional operations",
    is_open_to_all: true,
    keywords: ["legal", "law", "legal issues", "litigation", "compliance", "regulations"]
  },
  {
    committee_name: "Community Corrections Committee",
    meeting_type: "Committee Meeting",
    day: "Saturday",
    date: "August 23, 2025",
    time: "1:00 PM - 2:00 PM",
    location: "Room 304 (CC)",
    room_number: "304",
    building: "Convention Center",
    description: "Focus on community-based corrections programs and initiatives",
    is_open_to_all: true,
    keywords: ["community corrections", "probation", "parole", "reentry", "community programs"]
  },
  {
    committee_name: "Adult Local Detention Committee",
    meeting_type: "Committee Meeting",
    day: "Saturday",
    date: "August 23, 2025",
    time: "2:00 PM - 3:30 PM",
    location: "Room 303 (CC)",
    room_number: "303",
    building: "Convention Center",
    description: "Discussion of local detention facility operations and standards",
    is_open_to_all: true,
    keywords: ["detention", "jail", "local detention", "county jail", "custody operations"]
  },
  {
    committee_name: "Religion and Faith Based Initiatives Committee",
    meeting_type: "Committee Meeting",
    day: "Saturday",
    date: "August 23, 2025",
    time: "2:00 PM - 4:00 PM",
    location: "Room 304 (CC)",
    room_number: "304",
    building: "Convention Center",
    description: "Faith-based programming and religious services in correctional settings",
    is_open_to_all: true,
    keywords: ["faith", "religion", "chaplain", "religious services", "spiritual", "faith-based"]
  },
  {
    committee_name: "Staff Wellness Committee",
    meeting_type: "Committee Meeting",
    day: "Saturday",
    date: "August 23, 2025",
    time: "3:00 PM - 4:00 PM",
    location: "Room 301 (CC)",
    room_number: "301",
    building: "Convention Center",
    description: "Focus on correctional staff health, wellness, and support programs",
    is_open_to_all: true,
    keywords: ["staff wellness", "employee health", "wellness", "staff support", "mental health", "burnout"]
  },
  {
    committee_name: "International Corrections Committee",
    meeting_type: "Committee Meeting",
    day: "Saturday",
    date: "August 23, 2025",
    time: "4:00 PM - 5:30 PM",
    location: "Room 303 (CC)",
    room_number: "303",
    building: "Convention Center",
    description: "International correctional practices and global collaboration",
    is_open_to_all: true,
    keywords: ["international", "global", "world", "foreign", "international corrections"]
  },
  {
    committee_name: "Behavioral Health Committee",
    meeting_type: "Committee Meeting",
    day: "Saturday",
    date: "August 23, 2025",
    time: "4:15 PM - 5:15 PM",
    location: "Room 304 (CC)",
    room_number: "304",
    building: "Convention Center",
    description: "Mental health and behavioral health services in corrections",
    is_open_to_all: true,
    keywords: ["behavioral health", "mental health", "psychiatric", "psychology", "counseling", "therapy"]
  },

  // SUNDAY, AUGUST 24
  {
    committee_name: "Correctional Nurses Committee",
    meeting_type: "Committee Meeting",
    day: "Sunday",
    date: "August 24, 2025",
    time: "7:00 AM - 8:00 AM",
    location: "Room 301 (CC)",
    room_number: "301",
    building: "Convention Center",
    description: "Correctional nursing practices and healthcare delivery",
    is_open_to_all: true,
    keywords: ["nursing", "nurses", "medical", "healthcare", "clinical", "patient care"]
  },
  {
    committee_name: "Membership Committee",
    meeting_type: "Committee Meeting",
    day: "Sunday",
    date: "August 24, 2025",
    time: "7:30 AM - 8:30 AM",
    location: "Room 302 (CC)",
    room_number: "302",
    building: "Convention Center",
    description: "Membership growth, retention, and engagement strategies",
    is_open_to_all: true,
    keywords: ["membership", "members", "recruitment", "retention", "engagement"]
  },
  {
    committee_name: "Restorative Justice Committee",
    meeting_type: "Committee Meeting",
    day: "Sunday",
    date: "August 24, 2025",
    time: "8:00 AM - 9:00 AM",
    location: "Room 301 (CC)",
    room_number: "301",
    building: "Convention Center",
    description: "Restorative justice programs and victim-offender reconciliation",
    is_open_to_all: true,
    keywords: ["restorative justice", "victims", "reconciliation", "healing", "community justice"]
  },
  {
    committee_name: "Dual Chapter and Affiliate Committee",
    meeting_type: "Committee Meeting",
    day: "Sunday",
    date: "August 24, 2025",
    time: "8:30 AM - 9:30 AM",
    location: "Room 302 (CC)",
    room_number: "302",
    building: "Convention Center",
    description: "Chapter and affiliate organization coordination",
    is_open_to_all: true,
    keywords: ["chapter", "affiliate", "organization", "coordination", "partnership"]
  },
  {
    committee_name: "Legislative and Government Affairs Committee",
    meeting_type: "Committee Meeting",
    day: "Sunday",
    date: "August 24, 2025",
    time: "8:30 AM - 10:00 AM",
    location: "Room 407 (CC)",
    room_number: "407",
    building: "Convention Center",
    description: "Legislative priorities and government relations",
    is_open_to_all: true,
    keywords: ["legislative", "government", "policy", "advocacy", "legislation", "politics"]
  },
  {
    committee_name: "Probation and Parole Committee",
    meeting_type: "Committee Meeting",
    day: "Sunday",
    date: "August 24, 2025",
    time: "10:00 AM - 11:00 AM",
    location: "Room 301 (CC)",
    room_number: "301",
    building: "Convention Center",
    description: "Community supervision best practices and reentry support",
    is_open_to_all: true,
    keywords: ["probation", "parole", "supervision", "reentry", "community supervision"]
  },
  {
    committee_name: "Correctional Dental Committee",
    meeting_type: "Committee Meeting",
    day: "Sunday",
    date: "August 24, 2025",
    time: "11:45 AM - 12:45 PM",
    location: "Room 301 (CC)",
    room_number: "301",
    building: "Convention Center",
    description: "Dental health services in correctional facilities",
    is_open_to_all: true,
    keywords: ["dental", "dentist", "oral health", "dental care", "teeth"]
  },
  {
    committee_name: "Women Working in Corrections",
    meeting_type: "Committee Meeting",
    day: "Sunday",
    date: "August 24, 2025",
    time: "1:00 PM - 2:00 PM",
    location: "Room 302 (CC)",
    room_number: "302",
    building: "Convention Center",
    description: "Supporting and advancing women in correctional careers",
    is_open_to_all: true,
    keywords: ["women", "female", "gender", "women in corrections", "professional development"]
  },
  {
    committee_name: "Ethics Committee",
    meeting_type: "Committee Meeting",
    day: "Sunday",
    date: "August 24, 2025",
    time: "1:00 PM - 2:00 PM",
    location: "Room 407 (CC)",
    room_number: "407",
    building: "Convention Center",
    description: "Ethical standards and professional conduct in corrections",
    is_open_to_all: true,
    keywords: ["ethics", "professional conduct", "standards", "integrity", "accountability"]
  },
  {
    committee_name: "Education Directors in Corrections Council",
    meeting_type: "Council Meeting",
    day: "Sunday",
    date: "August 24, 2025",
    time: "1:00 PM - 4:30 PM",
    location: "Mineral A (HR)",
    room_number: "Mineral A",
    building: "Hotel",
    description: "Educational programming and vocational training in corrections",
    is_open_to_all: true,
    keywords: ["education", "training", "vocational", "learning", "GED", "college programs"]
  },
  {
    committee_name: "Correctional Industries Committee",
    meeting_type: "Committee Meeting",
    day: "Sunday",
    date: "August 24, 2025",
    time: "2:00 PM - 3:00 PM",
    location: "Room 301 (CC)",
    room_number: "301",
    building: "Convention Center",
    description: "Work programs and industry partnerships in corrections",
    is_open_to_all: true,
    keywords: ["industries", "work programs", "employment", "job training", "vocational"]
  },
  {
    committee_name: "Juvenile Detention Committee",
    meeting_type: "Committee Meeting",
    day: "Sunday",
    date: "August 24, 2025",
    time: "2:00 PM - 3:00 PM",
    location: "Room 205 (CC)",
    room_number: "205",
    building: "Convention Center",
    description: "Juvenile justice and youth detention best practices",
    is_open_to_all: true,
    keywords: ["juvenile", "youth", "juvenile detention", "youth justice", "adolescent"]
  },
  {
    committee_name: "Military Corrections Committee",
    meeting_type: "Committee Meeting",
    day: "Sunday",
    date: "August 24, 2025",
    time: "2:30 PM - 4:30 PM",
    location: "Room 405 (CC)",
    room_number: "405",
    building: "Convention Center",
    description: "Military correctional facilities and veteran services",
    is_open_to_all: true,
    keywords: ["military", "veterans", "armed forces", "military corrections", "brig"]
  },

  // MONDAY, AUGUST 25
  {
    committee_name: "State Adult Directors Council",
    meeting_type: "Council Meeting",
    day: "Monday",
    date: "August 25, 2025",
    time: "8:00 AM - 9:00 AM",
    location: "Room 205 (CC)",
    room_number: "205",
    building: "Convention Center",
    description: "State correctional directors coordination and policy",
    is_open_to_all: true,
    keywords: ["state directors", "directors", "state", "leadership", "administration"]
  },
  {
    committee_name: "Resolutions and Policies Committee",
    meeting_type: "Committee Meeting",
    day: "Monday",
    date: "August 25, 2025",
    time: "8:00 AM - 11:00 AM",
    location: "Room 301 (CC)",
    room_number: "301",
    building: "Convention Center",
    description: "Policy development and organizational resolutions",
    is_open_to_all: true,
    keywords: ["resolutions", "policies", "policy", "governance", "procedures"]
  },
  {
    committee_name: "Facility Planning and Design Committee",
    meeting_type: "Committee Meeting",
    day: "Monday",
    date: "August 25, 2025",
    time: "9:00 AM - 10:00 AM",
    location: "Room 302 (CC)",
    room_number: "302",
    building: "Convention Center",
    description: "Correctional facility design and construction planning",
    is_open_to_all: true,
    keywords: ["facility", "design", "construction", "architecture", "planning", "infrastructure"]
  },
  {
    committee_name: "Sheriff's Council",
    meeting_type: "Council Meeting",
    day: "Monday",
    date: "August 25, 2025",
    time: "10:00 AM - 11:00 AM",
    location: "Room 205 (CC)",
    room_number: "205",
    building: "Convention Center",
    description: "Sheriff's office operations and county jail management",
    is_open_to_all: true,
    keywords: ["sheriff", "county", "sheriff's office", "county jail", "law enforcement"]
  },
  {
    committee_name: "Correctional Awards Committee",
    meeting_type: "Committee Meeting",
    day: "Monday",
    date: "August 25, 2025",
    time: "4:00 PM - 5:30 PM",
    location: "Room 301 (CC)",
    room_number: "301",
    building: "Convention Center",
    description: "Recognition programs and award nominations",
    is_open_to_all: true,
    keywords: ["awards", "recognition", "nominations", "achievement", "excellence"]
  },
  {
    committee_name: "Accreditation Manager Training",
    meeting_type: "Training Meeting",
    day: "Monday",
    date: "August 25, 2025",
    time: "8:00 AM - 5:00 PM",
    location: "Rooms 201/203 (CC)",
    room_number: "201/203",
    building: "Convention Center",
    description: "Training for facility accreditation managers",
    is_open_to_all: false,
    keywords: ["accreditation", "certification", "standards", "compliance", "manager training"]
  },

  // TUESDAY, AUGUST 26
  {
    committee_name: "Substance Use Disorders/MOUD Committee",
    meeting_type: "Committee Meeting",
    day: "Tuesday",
    date: "August 26, 2025",
    time: "8:00 AM - 9:00 AM",
    location: "Room 302 (CC)",
    room_number: "302",
    building: "Convention Center",
    description: "Medication for Opioid Use Disorder and substance abuse treatment",
    is_open_to_all: true,
    keywords: ["substance use", "MOUD", "addiction", "opioid", "treatment", "recovery", "medication assisted treatment"]
  },
  {
    committee_name: "Auditor Training",
    meeting_type: "Training Meeting",
    day: "Tuesday",
    date: "August 26, 2025",
    time: "8:00 AM - 4:00 PM",
    location: "Rooms 201/203 (CC)",
    room_number: "201/203",
    building: "Convention Center",
    description: "Training for facility auditors and compliance officers",
    is_open_to_all: false,
    keywords: ["auditor", "audit", "compliance", "inspection", "review", "assessment"]
  },
  {
    committee_name: "New Auditor Training",
    meeting_type: "Training Meeting",
    day: "Tuesday",
    date: "August 26, 2025",
    time: "8:00 AM - 4:00 PM",
    location: "Room 205 (CC)",
    room_number: "205",
    building: "Convention Center",
    description: "Training for new facility auditors",
    is_open_to_all: false,
    keywords: ["new auditor", "audit", "compliance", "training", "beginner", "orientation"]
  },

  // STANDARDS PANEL HEARINGS
  {
    committee_name: "Standards Panel Hearings",
    meeting_type: "Standards Meeting",
    day: "Saturday",
    date: "August 23, 2025",
    time: "12:30 PM - 6:00 PM",
    location: "Room 201 (CC) - Waiting Room",
    room_number: "201",
    building: "Convention Center",
    description: "Standards panel review and hearings",
    is_open_to_all: false,
    keywords: ["standards", "panel", "hearing", "review", "compliance", "accreditation"]
  },
  {
    committee_name: "Standards Panel Hearings",
    meeting_type: "Standards Meeting",
    day: "Sunday",
    date: "August 24, 2025",
    time: "7:00 AM - 5:00 PM",
    location: "Room 201 (CC) - Waiting Room",
    room_number: "201",
    building: "Convention Center",
    description: "Standards panel review and hearings",
    is_open_to_all: false,
    keywords: ["standards", "panel", "hearing", "review", "compliance", "accreditation"]
  }
];

// Parse time to create start/end timestamps
function parseTime(day, date, timeStr) {
  // Parse the time string (e.g., "12:30 PM - 2:00 PM")
  const [startTime, endTime] = timeStr.split(' - ');
  
  // Convert to 24-hour format for database
  const parseTimeComponent = (time) => {
    const [hourMin, ampm] = time.split(' ');
    let [hour, minute] = hourMin.split(':').map(Number);
    
    if (ampm === 'PM' && hour !== 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;
    
    return { hour, minute };
  };
  
  const start = parseTimeComponent(startTime);
  const end = parseTimeComponent(endTime);
  
  // Create ISO timestamps (using August 2025 dates)
  const dateMap = {
    'Friday': '2025-08-22',
    'Saturday': '2025-08-23', 
    'Sunday': '2025-08-24',
    'Monday': '2025-08-25',
    'Tuesday': '2025-08-26'
  };
  
  const baseDate = dateMap[day];
  const startTimestamp = `${baseDate}T${String(start.hour).padStart(2, '0')}:${String(start.minute).padStart(2, '0')}:00`;
  const endTimestamp = `${baseDate}T${String(end.hour).padStart(2, '0')}:${String(end.minute).padStart(2, '0')}:00`;
  
  return { startTimestamp, endTimestamp };
}

// Generate embedding for a meeting
async function generateEmbedding(meeting) {
  const searchText = `${meeting.committee_name} ${meeting.meeting_type} ${meeting.day} ${meeting.time} ${meeting.location} ${meeting.description} ${meeting.keywords.join(' ')}`;
  
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

async function importMeetings() {
  console.log('🚀 Starting committee meetings import...');
  
  // Clear existing meetings
  const { error: deleteError } = await supabase
    .from('committee_meetings')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
  
  if (deleteError) {
    console.error('Error clearing existing meetings:', deleteError);
    return;
  }
  
  console.log('✅ Cleared existing meetings');
  
  // Process and insert each meeting
  for (const meeting of COMMITTEE_MEETINGS) {
    const { startTimestamp, endTimestamp } = parseTime(meeting.day, meeting.date, meeting.time);
    
    // Generate search text
    const searchText = `${meeting.committee_name} ${meeting.meeting_type} ${meeting.day} ${meeting.time} ${meeting.location} ${meeting.description} ${meeting.keywords.join(' ')}`;
    
    // Generate embedding
    console.log(`🔄 Processing: ${meeting.committee_name} - ${meeting.day}`);
    const embedding = await generateEmbedding(meeting);
    
    // Prepare meeting data
    const meetingData = {
      committee_name: meeting.committee_name,
      meeting_type: meeting.meeting_type,
      day: meeting.day,
      date: meeting.date,
      time: meeting.time,
      start_time: startTimestamp,
      end_time: endTimestamp,
      location: meeting.location,
      room_number: meeting.room_number || null,
      building: meeting.building,
      description: meeting.description,
      is_open_to_all: meeting.is_open_to_all,
      keywords: meeting.keywords,
      search_text: searchText,
      embedding: embedding
    };
    
    // Insert into database
    const { data, error } = await supabase
      .from('committee_meetings')
      .insert(meetingData);
    
    if (error) {
      console.error(`❌ Error inserting ${meeting.committee_name}:`, error);
    } else {
      console.log(`✅ Inserted: ${meeting.committee_name}`);
    }
    
    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Verify import
  const { data: count, error: countError } = await supabase
    .from('committee_meetings')
    .select('*', { count: 'exact', head: true });
  
  if (!countError) {
    console.log(`\n✅ Import complete! Total meetings in database: ${count}`);
  }
}

// Run the import
importMeetings().catch(console.error);