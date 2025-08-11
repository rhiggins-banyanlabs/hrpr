require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function uploadIntentEmbeddings() {
  try {
    // Load existing embeddings from JSON file
    const embeddingsPath = path.join(__dirname, '../src/data/intent-embeddings.json');
    
    if (!fs.existsSync(embeddingsPath)) {
      console.error('❌ Embeddings file not found:', embeddingsPath);
      process.exit(1);
    }

    console.log('📂 Loading embeddings from:', embeddingsPath);
    const embeddingsData = JSON.parse(fs.readFileSync(embeddingsPath, 'utf8'));
    
    console.log('📊 Found intents:', Object.keys(embeddingsData.intents));

    let totalUploaded = 0;
    let totalErrors = 0;

    // Process each intent
    for (const [intent, intentData] of Object.entries(embeddingsData.intents)) {
      console.log(`\n🎯 Processing intent: ${intent}`);
      console.log(`   Examples: ${intentData.examples.length}`);
      console.log(`   Embeddings: ${intentData.embeddings ? intentData.embeddings.length : 0}`);

      if (!intentData.embeddings || intentData.embeddings.length === 0) {
        console.log(`   ⚠️ No embeddings found for ${intent}, skipping...`);
        continue;
      }

      // Upload each example with its embedding
      for (let i = 0; i < intentData.examples.length; i++) {
        const example = intentData.examples[i];
        const embedding = intentData.embeddings[i];

        if (!embedding) {
          console.log(`   ⚠️ Missing embedding for example ${i}: "${example}"`);
          totalErrors++;
          continue;
        }

        try {
          // Check if this example already exists
          const { data: existing } = await supabase
            .from('intent_embeddings')
            .select('id')
            .eq('intent', intent)
            .eq('example_text', example)
            .single();

          if (existing) {
            console.log(`   ⏭️ Skipping duplicate: "${example.substring(0, 50)}..."`);
            continue;
          }

          // Insert new embedding
          const { data, error } = await supabase
            .from('intent_embeddings')
            .insert({
              intent: intent,
              example_text: example,
              embedding: embedding,
              metadata: {
                source: 'json_import',
                original_index: i
              }
            })
            .select('id')
            .single();

          if (error) {
            console.error(`   ❌ Error uploading: ${error.message}`);
            totalErrors++;
          } else {
            console.log(`   ✅ Uploaded: "${example.substring(0, 50)}..."`);
            totalUploaded++;
          }

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 50));

        } catch (error) {
          console.error(`   ❌ Error processing example ${i}:`, error.message);
          totalErrors++;
        }
      }
    }

    console.log('\n📊 Upload Summary:');
    console.log(`   ✅ Successfully uploaded: ${totalUploaded}`);
    console.log(`   ❌ Errors: ${totalErrors}`);

    // Verify upload
    const { count } = await supabase
      .from('intent_embeddings')
      .select('*', { count: 'exact', head: true });

    console.log(`   📈 Total embeddings in database: ${count}`);

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the upload
uploadIntentEmbeddings().then(() => {
  console.log('\n✅ Upload complete!');
  process.exit(0);
});