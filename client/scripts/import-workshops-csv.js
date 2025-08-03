const { createClient } = require('@supabase/supabase-js');
const { config } = require('dotenv');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

// Load environment variables
config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Parse speaker/moderator string into array of person objects
 */
function parsePeople(peopleString) {
  if (!peopleString || peopleString.trim() === '') {
    return [];
  }
  
  // Split by semicolon for multiple people
  const people = peopleString.split(';').map(personStr => {
    const parts = personStr.trim().split(',').map(p => p.trim());
    
    if (parts.length >= 1 && parts[0]) {
      return {
        name: parts[0],
        title: parts[1] || null,
        organization: parts[2] || null,
        location: parts[3] || null
      };
    }
    return null;
  }).filter(p => p !== null);
  
  return people;
}

/**
 * Parse date and extract day of week
 */
function parseDate(dateStr) {
  if (!dateStr) return { day: null, date: null };
  
  // Extract day if present (e.g., "Saturday, August 23, 2025")
  const dayMatch = dateStr.match(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s*/);
  
  if (dayMatch) {
    return {
      day: dayMatch[1],
      date: dateStr.replace(dayMatch[0], '').trim()
    };
  }
  
  return {
    day: null,
    date: dateStr.trim()
  };
}

/**
 * Parse time range
 */
function parseTime(timeStr) {
  if (!timeStr) return { start_time: null, end_time: null, time_block: null };
  
  const match = timeStr.match(/(\d{1,2}:\d{2})\s*(am|pm)\s*[–\-]\s*(\d{1,2}:\d{2})\s*(am|pm)/i);
  
  if (match) {
    const convertTo24Hour = (time, ampm) => {
      let [hours, minutes] = time.split(':').map(Number);
      
      if (ampm.toLowerCase() === 'pm' && hours !== 12) {
        hours += 12;
      } else if (ampm.toLowerCase() === 'am' && hours === 12) {
        hours = 0;
      }
      
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
    };
    
    return {
      start_time: convertTo24Hour(match[1], match[2]),
      end_time: convertTo24Hour(match[3], match[4]),
      time_block: timeStr.trim()
    };
  }
  
  return {
    start_time: null,
    end_time: null,
    time_block: timeStr.trim()
  };
}

async function importWorkshopsFromCSV(csvPath) {
  console.log('📚 Starting workshop CSV import...\n');
  
  const workshops = [];
  
  // Read and parse CSV
  await new Promise((resolve, reject) => {
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (row) => {
        // Map CSV columns to database fields
        const dateInfo = parseDate(row.Date);
        const timeInfo = parseTime(row.Time);
        
        const workshop = {
          title: row.Title || null,
          overview: row.Overview || null,
          day: dateInfo.day,
          date: dateInfo.date,
          start_time: timeInfo.start_time,
          end_time: timeInfo.end_time,
          time_block: timeInfo.time_block,
          room: row.Room ? row.Room.replace(/^Room\s+/i, '').trim() : null,
          primary_community: row.Primary_Community || null,
          credits: row.CE_Credits || null,
          speakers: parsePeople(row.Speakers),
          moderators: parsePeople(row.Moderator),
          // Additional fields if in CSV
          category: row.Category || null,
          learning_objectives: row.Learning_Objectives ? 
            row.Learning_Objectives.split(';').map(obj => obj.trim()).filter(obj => obj) : []
        };
        
        // Only add if has title
        if (workshop.title) {
          workshops.push(workshop);
        }
      })
      .on('end', resolve)
      .on('error', reject);
  });
  
  console.log(`📊 Found ${workshops.length} workshops in CSV\n`);
  
  // Clear existing data if --replace flag is used
  const forceReplace = process.argv.includes('--replace');
  
  if (forceReplace) {
    console.log('⚠️  Deleting existing workshops...');
    const { error: deleteError } = await supabase
      .from('workshops')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (deleteError) {
      console.error('Error deleting workshops:', deleteError);
      return;
    }
  }
  
  // Import workshops
  console.log('📥 Importing workshops...\n');
  let successCount = 0;
  let errorCount = 0;
  
  for (const workshop of workshops) {
    try {
      // If category field exists but not in database, store it in primary_community
      if (workshop.category && !workshop.primary_community) {
        workshop.primary_community = workshop.category;
      }
      
      // Remove category field as it's not in database
      delete workshop.category;
      
      const { error } = await supabase
        .from('workshops')
        .insert(workshop);
      
      if (error) throw error;
      
      successCount++;
      console.log(`✅ ${workshop.title.substring(0, 60)}...`);
      
      if (workshop.day && workshop.time_block) {
        console.log(`   📅 ${workshop.day} ${workshop.time_block} in ${workshop.room || 'TBD'}`);
      }
      
      if (workshop.speakers && workshop.speakers.length > 0) {
        const speakerNames = workshop.speakers.map(s => s.name).join(', ');
        console.log(`   👥 Speakers: ${speakerNames.substring(0, 60)}...`);
      }
      
    } catch (error) {
      errorCount++;
      console.error(`❌ Error with "${workshop.title.substring(0, 50)}...":`, error.message);
    }
  }
  
  // Summary
  console.log('\n📊 Import Summary:');
  console.log(`✅ Workshops imported: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📋 Total processed: ${workshops.length}`);
  
  // Statistics
  const stats = {
    withDate: workshops.filter(w => w.date).length,
    withTime: workshops.filter(w => w.time_block).length,
    withRoom: workshops.filter(w => w.room).length,
    withSpeakers: workshops.filter(w => w.speakers && w.speakers.length > 0).length,
    withCredits: workshops.filter(w => w.credits).length
  };
  
  console.log('\n📈 Data Quality:');
  console.log(`  With date: ${stats.withDate}/${workshops.length}`);
  console.log(`  With time: ${stats.withTime}/${workshops.length}`);
  console.log(`  With room: ${stats.withRoom}/${workshops.length}`);
  console.log(`  With speakers: ${stats.withSpeakers}/${workshops.length}`);
  console.log(`  With CE credits: ${stats.withCredits}/${workshops.length}`);
  
  console.log('\n💡 Workshop data is now available for Harper to answer questions!');
}

// Main function
async function main() {
  const args = process.argv.slice(2).filter(arg => !arg.startsWith('--'));
  
  if (args.length < 1) {
    console.log('Usage: npm run import-workshops-csv -- <csv-file> [--replace]');
    console.log('\nExample CSV format:');
    console.log('Title,Date,Time,Room,Overview,Speakers,Moderator,Category,CE_Credits,Primary_Community');
    console.log('"Workshop Title","Saturday, August 23, 2025","3:00 pm – 4:30 pm","Room 110","Overview text","Speaker Name, Title, Org","","Education",,"Adult Corrections"');
    console.log('\nMultiple speakers/moderators: Separate with semicolons');
    console.log('Example: "John Doe, PhD, University; Jane Smith, MD, Hospital"');
    process.exit(1);
  }
  
  const csvPath = args[0];
  
  try {
    await importWorkshopsFromCSV(csvPath);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}