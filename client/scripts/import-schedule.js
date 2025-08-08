import { createClient } from '@supabase/supabase-js';
import { OpenAI } from 'openai';
import fs from 'fs';
import csv from 'csv-parser';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;

if (!supabaseUrl || !supabaseKey || !openaiApiKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const openai = new OpenAI({ apiKey: openaiApiKey });

// Helper function to parse time strings and dates
function parseScheduleTime(day, timeStr) {
  const year = 2025;
  const monthMap = {
    'January': 0, 'February': 1, 'March': 2, 'April': 3,
    'May': 4, 'June': 5, 'July': 6, 'August': 7,
    'September': 8, 'October': 9, 'November': 10, 'December': 11
  };

  // Parse day
  const dayMatch = day.match(/(\w+)\s+(\w+)\s+(\d+)\w+\s+(\d{4})/);
  if (!dayMatch) return { startTime: null, endTime: null };

  const month = monthMap[dayMatch[2]];
  const date = parseInt(dayMatch[3]);

  // Parse time
  let startTime = null;
  let endTime = null;

  if (timeStr.toLowerCase() === 'all day') {
    startTime = new Date(year, month, date, 0, 0, 0);
    endTime = new Date(year, month, date, 23, 59, 59);
  } else {
    // Parse time range (e.g., "9:00 AM to 12:00 PM")
    const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)\s*(?:to|tp)\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (timeMatch) {
      let startHour = parseInt(timeMatch[1]);
      const startMin = parseInt(timeMatch[2]);
      const startPeriod = timeMatch[3].toUpperCase();
      
      let endHour = parseInt(timeMatch[4]);
      const endMin = parseInt(timeMatch[5]);
      const endPeriod = timeMatch[6].toUpperCase();

      // Convert to 24-hour format
      if (startPeriod === 'PM' && startHour !== 12) startHour += 12;
      if (startPeriod === 'AM' && startHour === 12) startHour = 0;
      if (endPeriod === 'PM' && endHour !== 12) endHour += 12;
      if (endPeriod === 'AM' && endHour === 12) endHour = 0;

      startTime = new Date(year, month, date, startHour, startMin);
      endTime = new Date(year, month, date, endHour, endMin);
    }
  }

  return { startTime, endTime };
}

// Extract location and event type from event description
function parseEventDetails(event) {
  let location = null;
  let eventType = 'general';

  // Extract location if mentioned
  if (event.includes('Tour')) {
    eventType = 'tour';
    // Extract facility name for tours
    const facilityMatch = event.match(/(.+?)\s*Tour/);
    if (facilityMatch) {
      location = facilityMatch[1].trim();
    }
  } else if (event.includes('Reception')) {
    eventType = 'reception';
  } else if (event.includes('Meeting')) {
    eventType = 'meeting';
  } else if (event.includes('Workshop')) {
    eventType = 'workshop';
  } else if (event.includes('Registration')) {
    eventType = 'registration';
  } else if (event.includes('Session')) {
    eventType = 'session';
  } else if (event.includes('Expo')) {
    eventType = 'expo';
  }

  return { location, eventType };
}

// Generate embedding for a schedule entry
async function generateEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text,
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    return null;
  }
}

// Main import function
async function importSchedule() {
  // Optional: Clear existing data first
  const clearExisting = process.argv.includes('--clear');
  if (clearExisting) {
    console.log('Clearing existing schedule data...');
    const { error: deleteError } = await supabase
      .from('conference_schedule')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (neq with impossible id)
    
    if (deleteError) {
      console.error('Error clearing existing data:', deleteError);
      return;
    }
    console.log('Existing data cleared.');
  }

  const scheduleData = [];
  const csvPath = path.join(__dirname, '../../Conference Schedule - Sheet1.csv');

  // Read CSV file
  await new Promise((resolve, reject) => {
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (row) => {
        scheduleData.push({
          day: row['Day ']?.trim() || row['Day']?.trim(),
          time: row['Time ']?.trim() || row['Time']?.trim(),
          event: row['Event']?.trim() || row['Event']?.trim()
        });
      })
      .on('end', resolve)
      .on('error', reject);
  });

  console.log(`Found ${scheduleData.length} schedule entries`);

  // Process each entry
  for (const entry of scheduleData) {
    console.log(`Processing: ${entry.event}`);

    // Parse time and extract details
    const { startTime, endTime } = parseScheduleTime(entry.day, entry.time);
    const { location, eventType } = parseEventDetails(entry.event);

    // Create text for embedding
    const embeddingText = `${entry.day} ${entry.time} ${entry.event}`;
    const embedding = await generateEmbedding(embeddingText);

    if (!embedding) {
      console.error(`Failed to generate embedding for: ${entry.event}`);
      continue;
    }

    // Prepare data for insertion
    const scheduleEntry = {
      day: entry.day,
      time: entry.time,
      event: entry.event,
      start_time: startTime,
      end_time: endTime,
      location: location,
      event_type: eventType,
      embedding: embedding
    };

    // Insert into database
    const { error } = await supabase
      .from('conference_schedule')
      .insert(scheduleEntry);

    if (error) {
      console.error(`Error inserting schedule entry: ${entry.event}`, error);
    } else {
      console.log(`Successfully inserted: ${entry.event}`);
    }

    // Add a small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('Schedule import completed!');
}

// Run the import
importSchedule().catch(console.error);