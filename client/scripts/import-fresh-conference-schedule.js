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
    start_time: "9:00 AM",
    end_time: "12:00 PM",
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
    start_time: "2:00 PM",
    end_time: "4:00 PM",
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
    start_time: "All Day",
    end_time: "All Day",
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
    start_time: "10:00 AM",
    end_time: "5:00 PM",
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
    start_time: "12:00 PM",
    end_time: "5:30 PM",
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
    start_time: "1:00 PM",
    end_time: "3:00 PM",
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
    start_time: "1:00 PM",
    end_time: "6:00 PM",
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
    start_time: "3:30 PM",
    end_time: "5:00 PM",
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
    start_time: "5:30 PM",
    end_time: "6:30 PM",
    location: "Four Seasons Ballroom 3 and 4",
    room: "Ballroom 3 and 4",
    building: "Four Seasons",
    description: "Healthcare professionals networking reception",
    notes: "Sponsored by Correct Rx Pharmacy Services",
    keywords: ["healthcare", "reception", "networking", "Correct Rx", "pharmacy", "medical professionals"]
  },

  // SATURDAY, AUGUST 23
  {
    title: "Correctional Facility Tours",
    event_type: "Tour",
    day: "Saturday",
    date: "August 23, 2025",
    start_time: "All Day",
    end_time: "All Day",
    location: "Various Facilities",
    room: null,
    building: "Off-Site",
    description: "Tours of local correctional facilities",
    notes: "Multiple tour options available throughout the day",
    keywords: ["tour", "facility", "prison", "jail", "visit", "correctional"]
  },
  {
    title: "Registration Continued",
    event_type: "Registration",
    day: "Saturday",
    date: "August 23, 2025",
    start_time: "7:00 AM",
    end_time: "4:00 PM",
    location: "Convention Center",
    room: "Main Lobby",
    building: "Convention Center",
    description: "Conference registration and badge pickup",
    notes: null,
    keywords: ["registration", "check-in", "badges", "pickup"]
  },
  {
    title: "ACA General Session",
    event_type: "General Session",
    day: "Saturday",
    date: "August 23, 2025",
    start_time: "8:30 AM",
    end_time: "10:00 AM",
    location: "Bellco Theater",
    room: "Main Theater",
    building: "Convention Center",
    description: "Opening general session with keynote speakers",
    notes: "Sponsored by Aramark Correctional Services, Inc. and Falcon Correctional and Community Services, Inc.",
    keywords: ["general session", "opening", "keynote", "Aramark", "Falcon", "main event", "plenary"]
  },
  {
    title: "Exhibit Hall Open House and Wellness Lounge",
    event_type: "Exhibit",
    day: "Saturday",
    date: "August 23, 2025",
    start_time: "10:00 AM",
    end_time: "2:00 PM",
    location: "Exhibit Hall A and B1, 2nd Level",
    room: "Exhibit Hall A and B1",
    building: "Convention Center",
    description: "Exhibit hall with vendors and wellness lounge",
    notes: "2-day event",
    keywords: ["exhibit", "vendors", "wellness", "expo", "exhibition", "booths", "trade show"]
  },
  {
    title: "Accreditation Panel Hearings Waiting Room",
    event_type: "Meeting",
    day: "Saturday",
    date: "August 23, 2025",
    start_time: "12:30 PM",
    end_time: "6:00 PM",
    location: "Room 201",
    room: "201",
    building: "Convention Center",
    description: "Waiting room for accreditation panel hearings",
    notes: null,
    keywords: ["accreditation", "panel", "hearings", "standards", "review"]
  },
  {
    title: "Workshops",
    event_type: "Workshop",
    day: "Saturday",
    date: "August 23, 2025",
    start_time: "1:00 PM",
    end_time: "2:30 PM",
    location: "Various Rooms",
    room: "Various",
    building: "Convention Center",
    description: "Multiple concurrent workshop sessions on various corrections topics",
    notes: "Multiple workshops available",
    keywords: ["workshop", "training", "education", "professional development", "session"]
  },
  {
    title: "Correctional Mental Health Roundtable",
    event_type: "Featured Session",
    day: "Saturday",
    date: "August 23, 2025",
    start_time: "2:00 PM",
    end_time: "4:00 PM",
    location: "Rooms 405, 406, and 407",
    room: "405, 406, and 407",
    building: "Convention Center",
    description: "Featured roundtable discussion on correctional mental health",
    notes: null,
    keywords: ["mental health", "behavioral health", "roundtable", "psychology", "psychiatric", "featured", "discussion"]
  },
  {
    title: "AI Tech Expo with Reception",
    event_type: "Special Event",
    day: "Saturday",
    date: "August 23, 2025",
    start_time: "2:00 PM",
    end_time: "6:00 PM",
    location: "Four Seasons Ballroom 3 and 4",
    room: "Ballroom 3 and 4",
    building: "Four Seasons",
    description: "AI Technology Expo showcasing cutting-edge corrections technology with networking reception",
    notes: "Includes reception",
    keywords: ["AI", "technology", "expo", "artificial intelligence", "tech", "innovation", "reception", "networking", "future", "VIA", "AWS"]
  },
  {
    title: "Workshops",
    event_type: "Workshop",
    day: "Saturday",
    date: "August 23, 2025",
    start_time: "3:00 PM",
    end_time: "4:30 PM",
    location: "Various Rooms",
    room: "Various",
    building: "Convention Center",
    description: "Multiple concurrent workshop sessions on various corrections topics",
    notes: "Multiple workshops available",
    keywords: ["workshop", "training", "education", "professional development", "session", "afternoon"]
  },
  {
    title: "Military Reception",
    event_type: "Reception",
    day: "Saturday",
    date: "August 23, 2025",
    start_time: "5:30 PM",
    end_time: "6:30 PM",
    location: "Four Seasons Ballroom 1",
    room: "Ballroom 1",
    building: "Four Seasons",
    description: "Reception for military corrections professionals",
    notes: "Sponsored by CoreCivic",
    keywords: ["military", "veterans", "reception", "CoreCivic", "networking", "armed forces"]
  },

  // SUNDAY, AUGUST 24
  {
    title: "Correctional Facility Tours",
    event_type: "Tour",
    day: "Sunday",
    date: "August 24, 2025",
    start_time: "All Day",
    end_time: "All Day",
    location: "Various Facilities",
    room: null,
    building: "Off-Site",
    description: "Tours of local correctional facilities",
    notes: "Multiple tour options available throughout the day",
    keywords: ["tour", "facility", "prison", "jail", "visit", "correctional"]
  },
  {
    title: "Accreditation Panel Hearings Waiting Room",
    event_type: "Meeting",
    day: "Sunday",
    date: "August 24, 2025",
    start_time: "7:00 AM",
    end_time: "5:00 PM",
    location: "Room 201",
    room: "201",
    building: "Convention Center",
    description: "Waiting room for accreditation panel hearings",
    notes: null,
    keywords: ["accreditation", "panel", "hearings", "standards", "review"]
  },
  {
    title: "Registration Continued",
    event_type: "Registration",
    day: "Sunday",
    date: "August 24, 2025",
    start_time: "7:30 AM",
    end_time: "4:00 PM",
    location: "Convention Center",
    room: "Main Lobby",
    building: "Convention Center",
    description: "Conference registration and badge pickup",
    notes: null,
    keywords: ["registration", "check-in", "badges", "pickup"]
  },
  {
    title: "Workshops",
    event_type: "Workshop",
    day: "Sunday",
    date: "August 24, 2025",
    start_time: "8:00 AM",
    end_time: "9:30 AM",
    location: "Various Rooms",
    room: "Various",
    building: "Convention Center",
    description: "Morning workshop sessions on various corrections topics",
    notes: "Multiple workshops available",
    keywords: ["workshop", "training", "education", "professional development", "morning"]
  },
  {
    title: "Evolving Spaces Symposium",
    event_type: "Symposium",
    day: "Sunday",
    date: "August 24, 2025",
    start_time: "9:00 AM",
    end_time: "4:00 PM",
    location: "Rooms 401, 402, 403, and 404",
    room: "401, 402, 403, and 404",
    building: "Convention Center",
    description: "Full day symposium on evolving correctional facility design and spaces",
    notes: null,
    keywords: ["evolving spaces", "infrastructure", "facility design", "architecture", "sustainability", "symposium", "future"]
  },
  {
    title: "Workshops",
    event_type: "Workshop",
    day: "Sunday",
    date: "August 24, 2025",
    start_time: "10:00 AM",
    end_time: "11:30 AM",
    location: "Various Rooms",
    room: "Various",
    building: "Convention Center",
    description: "Mid-morning workshop sessions on various corrections topics",
    notes: "Multiple workshops available",
    keywords: ["workshop", "training", "education", "professional development"]
  },
  {
    title: "Exhibit Hall Open with Sponsored Lunch & Grand Prize Drawing",
    event_type: "Exhibit",
    day: "Sunday",
    date: "August 24, 2025",
    start_time: "10:00 AM",
    end_time: "2:00 PM",
    location: "Exhibit Hall A and B1, 2nd Level",
    room: "Exhibit Hall A and B1",
    building: "Convention Center",
    description: "Exhibit hall with sponsored lunch and grand prize drawing",
    notes: "Grand Prize Drawing at 1:45 PM - MUST BE PRESENT TO WIN!",
    keywords: ["exhibit", "lunch", "grand prize", "drawing", "vendors", "must be present", "prize", "raffle"]
  },
  {
    title: "Workshops",
    event_type: "Workshop",
    day: "Sunday",
    date: "August 24, 2025",
    start_time: "1:00 PM",
    end_time: "2:30 PM",
    location: "Various Rooms",
    room: "Various",
    building: "Convention Center",
    description: "Afternoon workshop sessions on various corrections topics",
    notes: "Multiple workshops available",
    keywords: ["workshop", "training", "education", "professional development", "afternoon"]
  },
  {
    title: "Best Practices in Tactical Operations Lab",
    event_type: "Lab",
    day: "Sunday",
    date: "August 24, 2025",
    start_time: "1:00 PM",
    end_time: "5:00 PM",
    location: "Four Seasons Ballroom 3 and 4",
    room: "Ballroom 3 and 4",
    building: "Four Seasons",
    description: "Hands-on tactical operations training lab with demonstrations",
    notes: null,
    keywords: ["tactical", "operations", "CERT", "emergency response", "training", "lab", "hands-on", "demonstration", "best practices"]
  },
  {
    title: "Leadership Training (Franklin Covey)",
    event_type: "Featured Session",
    day: "Sunday",
    date: "August 24, 2025",
    start_time: "1:00 PM",
    end_time: "4:00 PM",
    location: "Room 104",
    room: "104",
    building: "Convention Center",
    description: "Featured leadership training session by Franklin Covey",
    notes: null,
    keywords: ["leadership", "Franklin Covey", "management", "training", "professional development", "featured", "7 habits"]
  },
  {
    title: "Workshops",
    event_type: "Workshop",
    day: "Sunday",
    date: "August 24, 2025",
    start_time: "3:00 PM",
    end_time: "4:30 PM",
    location: "Various Rooms",
    room: "Various",
    building: "Convention Center",
    description: "Late afternoon workshop sessions on various corrections topics",
    notes: "Multiple workshops available",
    keywords: ["workshop", "training", "education", "professional development"]
  },
  {
    title: "E.R. Cass President's Reception",
    event_type: "Reception",
    day: "Sunday",
    date: "August 24, 2025",
    start_time: "6:00 PM",
    end_time: "7:00 PM",
    location: "Centennial E through H (Hyatt)",
    room: "Centennial E-H",
    building: "Hyatt Regency",
    description: "President's reception for invited guests",
    notes: "Ticket required",
    keywords: ["president", "reception", "E.R. Cass", "formal", "ticket required", "VIP", "invitation"]
  },
  {
    title: "E.R. Cass Award Banquet",
    event_type: "Banquet",
    day: "Sunday",
    date: "August 24, 2025",
    start_time: "7:00 PM",
    end_time: "9:00 PM",
    location: "Centennial E through H (Hyatt)",
    room: "Centennial E-H",
    building: "Hyatt Regency",
    description: "Annual awards banquet and ceremony",
    notes: "Ticket required",
    keywords: ["awards", "banquet", "E.R. Cass", "formal", "dinner", "ticket required", "ceremony", "recognition"]
  },

  // MONDAY, AUGUST 25
  {
    title: "Correctional Facility Tours",
    event_type: "Tour",
    day: "Monday",
    date: "August 25, 2025",
    start_time: "All Day",
    end_time: "All Day",
    location: "Various Facilities",
    room: null,
    building: "Off-Site",
    description: "Tours of local correctional facilities",
    notes: "Multiple tour options available throughout the day",
    keywords: ["tour", "facility", "prison", "jail", "visit", "correctional"]
  },
  {
    title: "Registration Continued",
    event_type: "Registration",
    day: "Monday",
    date: "August 25, 2025",
    start_time: "7:30 AM",
    end_time: "4:00 PM",
    location: "Convention Center",
    room: "Main Lobby",
    building: "Convention Center",
    description: "Conference registration and badge pickup",
    notes: null,
    keywords: ["registration", "check-in", "badges", "pickup"]
  },
  {
    title: "Accreditation Manager Training",
    event_type: "Training",
    day: "Monday",
    date: "August 25, 2025",
    start_time: "8:00 AM",
    end_time: "5:00 PM",
    location: "Rooms 201 and 203",
    room: "201 and 203",
    building: "Convention Center",
    description: "Full day training for accreditation managers",
    notes: null,
    keywords: ["accreditation", "manager", "training", "standards", "compliance", "certification"]
  },
  {
    title: "Workshops",
    event_type: "Workshop",
    day: "Monday",
    date: "August 25, 2025",
    start_time: "8:00 AM",
    end_time: "9:30 AM",
    location: "Various Rooms",
    room: "Various",
    building: "Convention Center",
    description: "Monday morning workshop sessions on various corrections topics",
    notes: "Multiple workshops available",
    keywords: ["workshop", "training", "education", "professional development", "morning"]
  },
  {
    title: "Opioid Summit: A Holistic Approach to the Treatment of Opioid Use Disorder",
    event_type: "Summit",
    day: "Monday",
    date: "August 25, 2025",
    start_time: "8:00 AM",
    end_time: "11:45 AM",
    location: "Rooms 506 and 507",
    room: "506 and 507",
    building: "Convention Center",
    description: "Comprehensive summit on holistic approaches to opioid treatment and MOUD",
    notes: null,
    keywords: ["opioid", "MOUD", "substance abuse", "addiction", "treatment", "summit", "medication assisted", "holistic", "recovery"]
  },
  {
    title: "Global Faith Conference",
    event_type: "Conference",
    day: "Monday",
    date: "August 25, 2025",
    start_time: "8:30 AM",
    end_time: "4:30 PM",
    location: "Rooms 401, 402, 403, and 404",
    room: "401, 402, 403, and 404",
    building: "Convention Center",
    description: "Full day conference on faith-based programming in corrections",
    notes: null,
    keywords: ["faith", "religion", "chaplain", "spiritual", "conference", "faith-based", "religious services", "ministry"]
  },
  {
    title: "Juvenile Summit",
    event_type: "Summit",
    day: "Monday",
    date: "August 25, 2025",
    start_time: "9:00 AM",
    end_time: "4:00 PM",
    location: "Rooms 506 and 507",
    room: "506 and 507",
    building: "Convention Center",
    description: "Summit focused on juvenile justice, services, and best practices",
    notes: null,
    keywords: ["juvenile", "youth", "adolescent", "youth justice", "summit", "minors", "detention", "rehabilitation"]
  },
  {
    title: "Workshops",
    event_type: "Workshop",
    day: "Monday",
    date: "August 25, 2025",
    start_time: "10:00 AM",
    end_time: "11:30 AM",
    location: "Various Rooms",
    room: "Various",
    building: "Convention Center",
    description: "Monday mid-morning workshop sessions on various corrections topics",
    notes: "Multiple workshops available",
    keywords: ["workshop", "training", "education", "professional development"]
  },
  {
    title: "Health Care Special Session & Luncheon",
    event_type: "Special Session",
    day: "Monday",
    date: "August 25, 2025",
    start_time: "12:00 PM",
    end_time: "1:30 PM",
    location: "Four Seasons Ballroom 1",
    room: "Ballroom 1",
    building: "Four Seasons",
    description: "Special healthcare session with luncheon",
    notes: "Seating is limited. Sponsored by Centurion, LLC",
    keywords: ["healthcare", "luncheon", "Centurion", "medical", "special session", "limited seating", "lunch"]
  },
  {
    title: "Corrections Reimagined",
    event_type: "Featured Session",
    day: "Monday",
    date: "August 25, 2025",
    start_time: "1:00 PM",
    end_time: "3:00 PM",
    location: "Room 110",
    room: "110",
    building: "Convention Center",
    description: "Featured session on reimagining the future of corrections with technology and innovation",
    notes: null,
    keywords: ["innovation", "future", "reimagined", "technology", "reform", "featured", "transformation", "vision"]
  },
  {
    title: "Workshops",
    event_type: "Workshop",
    day: "Monday",
    date: "August 25, 2025",
    start_time: "2:00 PM",
    end_time: "3:30 PM",
    location: "Various Rooms",
    room: "Various",
    building: "Convention Center",
    description: "Monday afternoon workshop sessions on various corrections topics",
    notes: "Multiple workshops available",
    keywords: ["workshop", "training", "education", "professional development", "afternoon"]
  },
  {
    title: "Workshops",
    event_type: "Workshop",
    day: "Monday",
    date: "August 25, 2025",
    start_time: "4:00 PM",
    end_time: "5:30 PM",
    location: "Various Rooms",
    room: "Various",
    building: "Convention Center",
    description: "Monday late afternoon workshop sessions on various corrections topics",
    notes: "Multiple workshops available",
    keywords: ["workshop", "training", "education", "professional development", "late afternoon"]
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
    room: "201 and 203",
    building: "Convention Center",
    description: "Full day training for performance-based auditors",
    notes: null,
    keywords: ["auditor", "training", "performance", "standards", "compliance", "PbS", "audit"]
  },
  {
    title: "New Auditor Training",
    event_type: "Training",
    day: "Tuesday",
    date: "August 26, 2025",
    start_time: "8:00 AM",
    end_time: "4:00 PM",
    location: "Room 205",
    room: "205",
    building: "Convention Center",
    description: "Full day training for new auditors",
    notes: null,
    keywords: ["new auditor", "training", "audit", "compliance", "beginner", "orientation", "standards"]
  },
  {
    title: "Global Faith Conference (Day 2)",
    event_type: "Conference",
    day: "Tuesday",
    date: "August 26, 2025",
    start_time: "8:30 AM",
    end_time: "12:30 PM",
    location: "Rooms 401, 402, 403, and 404",
    room: "401, 402, 403, and 404",
    building: "Convention Center",
    description: "Global Faith Conference continues - second day",
    notes: null,
    keywords: ["faith", "religion", "chaplain", "spiritual", "conference", "faith-based", "ministry", "day 2"]
  },
  {
    title: "Legal Update",
    event_type: "Featured Session",
    day: "Tuesday",
    date: "August 26, 2025",
    start_time: "9:00 AM",
    end_time: "10:30 AM",
    location: "Room 102",
    room: "102",
    building: "Convention Center",
    description: "Featured session on legal updates and changes affecting corrections",
    notes: null,
    keywords: ["legal", "law", "legislation", "compliance", "updates", "featured", "regulations", "policy"]
  }
];

// Parse time to create timestamps
function parseTime(day, date, timeStr) {
  // Handle "All Day" events
  if (timeStr === 'All Day') {
    const dateMap = {
      'Thursday': '2025-08-21',
      'Friday': '2025-08-22',
      'Saturday': '2025-08-23',
      'Sunday': '2025-08-24',
      'Monday': '2025-08-25',
      'Tuesday': '2025-08-26'
    };
    const baseDate = dateMap[day];
    return `${baseDate}T08:00:00`; // Default to 8 AM for all day events
  }
  
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
  const searchText = `${item.title} ${item.event_type} ${item.day} ${item.start_time} ${item.end_time} ${item.location} ${item.description} ${item.notes || ''} ${item.keywords.join(' ')}`;
  
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

async function importFreshSchedule() {
  console.log('🚀 Starting fresh conference schedule import...');
  
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
    const startTimestamp = parseTime(item.day, item.date, item.start_time);
    const endTimestamp = item.end_time === 'All Day' ? 
      parseTime(item.day, item.date, '5:00 PM') : 
      parseTime(item.day, item.date, item.end_time);
    
    // Generate search text
    const searchText = `${item.title} ${item.event_type} ${item.day} ${item.start_time} ${item.end_time} ${item.location} ${item.description} ${item.notes || ''} ${item.keywords.join(' ')}`;
    
    // Generate embedding
    console.log(`🔄 Processing: ${item.title} - ${item.day}`);
    const embedding = await generateEmbedding(item);
    
    // Prepare schedule data - using both 'event' and 'title' for compatibility
    const scheduleData = {
      event: item.title,  // For backward compatibility
      title: item.title,  // New field
      event_type: item.event_type,
      day: item.day,
      date: item.date,
      time: `${item.start_time} - ${item.end_time}`, // For backward compatibility - stores text times
      start_time: startTimestamp,  // This column is TIMESTAMP in the database
      end_time: endTimestamp,      // This column is TIMESTAMP in the database
      start_timestamp: startTimestamp,  // Also store in new timestamp columns
      end_timestamp: endTimestamp,      // Also store in new timestamp columns
      location: item.location,
      description: item.description,
      keywords: item.keywords,
      search_text: searchText,
      embedding: embedding,
      // New fields
      room: item.room,
      building: item.building,
      notes: item.notes
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
importFreshSchedule().catch(console.error);