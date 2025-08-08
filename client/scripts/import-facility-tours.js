const { createClient } = require('@supabase/supabase-js');
const { config } = require('dotenv');
const fs = require('fs').promises; // Changed this line
const csv = require('csv-parser');
const { createReadStream } = require('fs');
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

async function importFacilityTours(csvFilePath) {
  console.log('🚐 Starting facility tours import...\n');

  const tours = [];
  
  // Read and parse CSV
  await new Promise((resolve, reject) => {
    createReadStream(csvFilePath)
      .pipe(csv({
        mapHeaders: ({ header }) => {
          // Normalize headers to match database columns
          const headerMap = {
            'Day': 'day',
            'Pick-up Time': 'pickup_time',
            'Tour Times': 'tour_times',
            'Drop-off Time': 'dropoff_time',
            'Facility': 'facility',
            'Facility Information': 'facility_information',
            'Number of Participants Allowed': 'participants_allowed',
            'Number of Participants Allowed ': 'participants_allowed' // Handle trailing space
          };
          // Map the header
          let mapped = headerMap[header] || header.toLowerCase().replace(/[ -]/g, '_');
          
          // Fix common issues
          if (mapped === 'number_of_participants_allowed_') {
            mapped = 'participants_allowed';
          }
          
          return mapped;
        }
      }))
      .on('data', (row) => {
        // Clean up the data
        const cleanRow = {};
        for (const [key, value] of Object.entries(row)) {
          // Fix column names with trailing underscores
          let cleanKey = key;
          if (key === 'number_of_participants_allowed_' || key === 'participants_allowed_') {
            cleanKey = 'participants_allowed';
          }
          
          if (cleanKey === 'participants_allowed') {
            // Convert to integer
            cleanRow[cleanKey] = value ? parseInt(value, 10) || null : null;
          } else {
            // Convert empty strings to null
            cleanRow[cleanKey] = value && value.trim() !== '' ? value.trim() : null;
          }
        }
        tours.push(cleanRow);
      })
      .on('end', resolve)
      .on('error', reject);
  });

  console.log(`📊 Found ${tours.length} facility tours in CSV\n`);

  // Clear existing data if --replace flag is used
  const forceReplace = process.argv.includes('--replace');
  
  if (forceReplace) {
    console.log('⚠️  Deleting existing facility tours...');
    const { error: deleteError } = await supabase
      .from('facility_tours')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (deleteError) {
      console.error('Error deleting tours:', deleteError);
      return;
    }
  }

  // Import tours
  console.log('📥 Importing facility tours...\n');
  let successCount = 0;
  let errorCount = 0;

  for (const tour of tours) {
    try {
      const { error } = await supabase
        .from('facility_tours')
        .insert(tour);

      if (error) throw error;
      successCount++;
      console.log(`✅ Imported: ${tour.facility} - ${tour.day} (${tour.participants_allowed} participants)`);
    } catch (error) {
      errorCount++;
      console.error(`❌ Error with ${tour.facility} on ${tour.day}:`, error.message);
    }
  }

  // Summary
  console.log('\n📊 Import Summary:');
  console.log(`✅ Tours imported: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📋 Total processed: ${tours.length}`);
  
  console.log('\n💡 Tour data is now available for Harper to answer questions about:');
  console.log('   - Tour schedules and times');
  console.log('   - Facility information');
  console.log('   - Pickup/dropoff times');
  console.log('   - Participant limits');
}

// Get CSV file path from command line or use default
let csvPath = path.join(__dirname, '../facility-tours.csv'); // default

for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i];
  if (arg.endsWith('.csv') && !arg.startsWith('--')) {
    csvPath = arg;
    break;
  }
}

console.log(`Looking for CSV at: ${csvPath}`);

// Check if file exists
fs.access(csvPath)
  .then(() => importFacilityTours(csvPath))
  .catch(() => {
    console.error(`❌ CSV file not found: ${csvPath}`);
    console.log('\nUsage: npm run import-tours -- [path-to-csv] [--replace]');
    console.log('Examples:');
    console.log('  npm run import-tours -- facility-tours.csv');
    console.log('  npm run import-tours -- tours.csv --replace');
  });