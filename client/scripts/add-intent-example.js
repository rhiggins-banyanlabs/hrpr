#!/usr/bin/env node

/**
 * Script to add new intent training examples to the embeddings file
 * Usage: node scripts/add-intent-example.js <intent> <example>
 * Example: node scripts/add-intent-example.js "venue" "where can I find coffee?"
 */

const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
require('dotenv').config({ path: '.env.local' });

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generateEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text.toLowerCase(),
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

async function addIntentExample(intent, example) {
  try {
    // Validate inputs
    if (!intent || !example) {
      console.error('❌ Usage: node scripts/add-intent-example.js <intent> <example>');
      console.error('   Example: node scripts/add-intent-example.js "venue" "where can I find coffee?"');
      process.exit(1);
    }

    console.log('📝 Adding new example...');
    console.log('   Intent:', intent);
    console.log('   Example:', example);

    // Load existing embeddings
    const embeddingsPath = path.join(__dirname, '../src/data/intent-embeddings.json');
    const minPath = path.join(__dirname, '../src/data/intent-embeddings.min.json');
    
    if (!fs.existsSync(embeddingsPath)) {
      console.error('❌ Embeddings file not found:', embeddingsPath);
      process.exit(1);
    }

    const data = JSON.parse(fs.readFileSync(embeddingsPath, 'utf8'));

    // Check if intent exists, if not create it
    if (!data.intents[intent]) {
      console.log(`🆕 Creating new intent category: ${intent}`);
      data.intents[intent] = {
        description: `${intent} related queries`,
        examples: [],
        embeddings: []
      };
    }

    // Check if example already exists
    if (data.intents[intent].examples.includes(example)) {
      console.log('⚠️  This example already exists for this intent');
      process.exit(0);
    }

    // Generate embedding
    console.log('🤖 Generating embedding...');
    const embedding = await generateEmbedding(example);

    // Add to data
    data.intents[intent].examples.push(example);
    data.intents[intent].embeddings.push(embedding);

    // Update metadata
    data.generated_at = new Date().toISOString();
    data.total_examples = Object.values(data.intents).reduce(
      (sum, intent) => sum + intent.examples.length, 
      0
    );

    // Save full version
    console.log('💾 Saving to intent-embeddings.json...');
    fs.writeFileSync(
      embeddingsPath,
      JSON.stringify(data, null, 2),
      'utf8'
    );

    // Create minified version
    console.log('📦 Creating minified version...');
    const minified = {
      ...data,
      intents: {}
    };

    // Copy structure but without embeddings for minified version
    for (const [key, value] of Object.entries(data.intents)) {
      minified.intents[key] = {
        description: value.description,
        examples: value.examples,
        // Optionally include embeddings in min version too
        embeddings: value.embeddings
      };
    }

    fs.writeFileSync(
      minPath,
      JSON.stringify(minified),
      'utf8'
    );

    console.log('✅ Successfully added example!');
    console.log(`   Intent "${intent}" now has ${data.intents[intent].examples.length} examples`);
    console.log('\n📋 Next steps:');
    console.log('   1. Test the changes locally');
    console.log('   2. Commit: git add src/data/intent-embeddings*.json');
    console.log('   3. Push: git commit -m "Add intent example" && git push');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Get command line arguments
const [,, intent, ...exampleParts] = process.argv;
const example = exampleParts.join(' ');

// Run the script
addIntentExample(intent, example);