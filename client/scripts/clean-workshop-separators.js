const { createClient } = require('@supabase/supabase-js');
const { config } = require('dotenv');
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

async function cleanWorkshopSeparators() {
  console.log('🧹 Cleaning up workshop separator entries...\n');
  
  // Find entries that are just separators or have very short/invalid titles
  const { data: invalidEntries, error: fetchError } = await supabase
    .from('workshops')
    .select('id, title')
    .or('title.like.%____%,title.eq.________________,title.is.null');
  
  if (fetchError) {
    console.error('Error fetching workshops:', fetchError);
    return;
  }
  
  // Also check for entries with title that's just underscores or very short
  const toDelete = [];
  
  if (invalidEntries) {
    for (const entry of invalidEntries) {
      // Check if title is just underscores, empty, or suspiciously short
      if (!entry.title || 
          entry.title.match(/^_+$/) || 
          entry.title.trim().length < 5 ||
          entry.title.includes('________________')) {
        toDelete.push(entry);
      }
    }
  }
  
  if (toDelete.length === 0) {
    console.log('✅ No invalid separator entries found!');
    return;
  }
  
  console.log(`Found ${toDelete.length} invalid entries to remove:\n`);
  
  for (const entry of toDelete) {
    console.log(`  - ID: ${entry.id} | Title: "${entry.title || '(empty)'}"`);
  }
  
  console.log('\nDeleting invalid entries...');
  
  // Delete the invalid entries
  const idsToDelete = toDelete.map(e => e.id);
  const { error: deleteError } = await supabase
    .from('workshops')
    .delete()
    .in('id', idsToDelete);
  
  if (deleteError) {
    console.error('Error deleting entries:', deleteError);
    return;
  }
  
  console.log(`\n✅ Successfully removed ${toDelete.length} invalid separator entries!`);
  
  // Get remaining count
  const { count } = await supabase
    .from('workshops')
    .select('*', { count: 'exact', head: true });
  
  console.log(`📊 Remaining valid workshops: ${count}`);
}

async function main() {
  await cleanWorkshopSeparators();
}

if (require.main === module) {
  main().catch(console.error);
}