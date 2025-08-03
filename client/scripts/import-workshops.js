const { createClient } = require('@supabase/supabase-js');
const { config } = require('dotenv');
const fs = require('fs').promises;
const path = require('path');
const WorkshopParser = require('./parse-workshops-text');

// Load environment variables
config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function importWorkshops(inputPath) {
  console.log('📚 Starting workshop import...\n');

  let workshops = [];
  
  // Check if input is JSON or text file
  if (inputPath.endsWith('.json')) {
    // Load pre-parsed JSON
    const content = await fs.readFile(inputPath, 'utf-8');
    workshops = JSON.parse(content);
    console.log(`📊 Loaded ${workshops.length} workshops from JSON\n`);
  } else {
    // Parse text file
    console.log('📄 Parsing text file...');
    const parser = new WorkshopParser();
    workshops = await parser.parseFile(inputPath);
    console.log(`📊 Parsed ${workshops.length} workshops from text\n`);
  }

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
  let skipCount = 0;

  for (const workshop of workshops) {
    // Skip if no title
    if (!workshop.title) {
      skipCount++;
      continue;
    }

    try {
      // Prepare data for insertion
      const workshopData = {
        title: workshop.title,
        overview: workshop.overview,
        day: workshop.day,
        date: workshop.date,
        start_time: workshop.start_time,
        end_time: workshop.end_time,
        time_block: workshop.time_block,
        room: workshop.room,
        primary_community: workshop.primary_community,
        credits: workshop.credits,
        learning_objectives: workshop.learning_objectives.length > 0 ? workshop.learning_objectives : null,
        moderators: workshop.moderators.length > 0 ? workshop.moderators : null,
        speakers: workshop.speakers.length > 0 ? workshop.speakers : null
      };

      const { error } = await supabase
        .from('workshops')
        .insert(workshopData);

      if (error) throw error;
      
      successCount++;
      console.log(`✅ Imported: ${workshop.title.substring(0, 60)}...`);
      if (workshop.day && workshop.time_block) {
        console.log(`   📅 ${workshop.day} ${workshop.time_block} in ${workshop.room || 'TBD'}`);
      }
      
    } catch (error) {
      errorCount++;
      console.error(`❌ Error with "${workshop.title.substring(0, 50)}...":`, error.message);
    }
  }

  // Summary
  console.log('\n📊 Import Summary:');
  console.log(`✅ Workshops imported: ${successCount}`);
  console.log(`⏭️  Skipped (no title): ${skipCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📋 Total processed: ${workshops.length}`);
  
  console.log('\n💡 Workshop data is now available for Harper to answer questions about:');
  console.log('   - Workshop schedules and times');
  console.log('   - Workshop topics and overviews');
  console.log('   - Speakers and moderators');
  console.log('   - Learning objectives');
  console.log('   - CE/CME credits');
  
  console.log('\n🧠 To enable semantic search for workshops, run:');
  console.log('   npm run generate-workshop-embeddings');
}

// Process command line arguments
async function main() {
  const args = process.argv.slice(2).filter(arg => !arg.startsWith('--'));
  
  if (args.length < 1) {
    console.log('Usage: npm run import-workshops -- <input-file> [--replace]');
    console.log('\nExamples:');
    console.log('  npm run import-workshops -- workshops.txt');
    console.log('  npm run import-workshops -- workshops.json');
    console.log('  npm run import-workshops -- "Conference Workshops.txt" --replace');
    console.log('\nSupported formats:');
    console.log('  .txt - Parse workshop data from text file');
    console.log('  .json - Import pre-parsed workshop data');
    process.exit(1);
  }

  const inputPath = args[0];

  try {
    await fs.access(inputPath);
    await importWorkshops(inputPath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error(`❌ File not found: ${inputPath}`);
    } else {
      console.error(`❌ Error: ${error.message}`);
    }
    process.exit(1);
  }
}

main();