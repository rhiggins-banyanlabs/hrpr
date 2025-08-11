#!/usr/bin/env node

/**
 * Script to migrate file-based intent embeddings to Supabase
 * Usage: node scripts/migrate-embeddings-to-supabase.js
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client
// Use service role key if available (bypasses RLS), otherwise use anon key
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in environment variables');
  console.log('Required: NEXT_PUBLIC_SUPABASE_URL and either SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey
);

console.log('🔑 Using', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'service role key (RLS bypassed)' : 'anon key (RLS active)');

async function migrateEmbeddings() {
  try {
    console.log('🚀 Starting migration of embeddings to Supabase...\n');
    
    // Load file-based embeddings
    const embeddingsPath = path.join(__dirname, '../src/data/intent-embeddings.json');
    
    if (!fs.existsSync(embeddingsPath)) {
      console.error('❌ Embeddings file not found at:', embeddingsPath);
      process.exit(1);
    }
    
    const data = JSON.parse(fs.readFileSync(embeddingsPath, 'utf8'));
    
    console.log(`📊 Found ${Object.keys(data.intents).length} intent categories`);
    console.log(`📊 Total examples: ${data.total_examples}\n`);
    
    let totalMigrated = 0;
    let totalFailed = 0;
    
    // Process each intent category
    for (const [intent, intentData] of Object.entries(data.intents)) {
      console.log(`\n📁 Processing intent: ${intent}`);
      console.log(`   Examples: ${intentData.examples.length}`);
      
      const examples = intentData.examples;
      const embeddings = intentData.embeddings;
      
      // Batch insert for better performance
      const records = [];
      
      for (let i = 0; i < examples.length; i++) {
        records.push({
          intent: intent,
          example_text: examples[i],
          embedding: embeddings[i],
          metadata: {
            source: 'file_migration',
            migrated_at: new Date().toISOString(),
            original_index: i
          }
        });
      }
      
      // Insert in batches of 50
      const batchSize = 50;
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        
        const { data: insertedData, error } = await supabase
          .from('intent_embeddings')
          .insert(batch)
          .select('id');
          
        if (error) {
          console.error(`   ❌ Failed batch ${Math.floor(i/batchSize) + 1}:`, error.message);
          totalFailed += batch.length;
        } else {
          totalMigrated += batch.length;
          console.log(`   ✅ Migrated batch ${Math.floor(i/batchSize) + 1} (${batch.length} examples)`);
        }
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 Migration Summary:');
    console.log('='.repeat(50));
    console.log(`✅ Successfully migrated: ${totalMigrated} examples`);
    if (totalFailed > 0) {
      console.log(`❌ Failed to migrate: ${totalFailed} examples`);
    }
    console.log(`📁 Intent categories: ${Object.keys(data.intents).length}`);
    console.log('\n✨ Migration complete!');
    
    // Verify by counting records in database
    const { count, error: countError } = await supabase
      .from('intent_embeddings')
      .select('*', { count: 'exact', head: true });
      
    if (!countError) {
      console.log(`\n🔍 Verification: ${count} total records in database`);
    }
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
migrateEmbeddings();