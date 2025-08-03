const { createClient } = require('@supabase/supabase-js');
const { config } = require('dotenv');
const path = require('path');

// Load environment variables
config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const openaiKey = process.env.OPENAI_API_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

if (!openaiKey) {
  console.error('Missing OPENAI_API_KEY environment variable');
  console.error('Please add OPENAI_API_KEY to your .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Generate embedding using OpenAI API
 */
async function generateEmbedding(text) {
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-ada-002',
        input: text
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error.message);
    throw error;
  }
}

/**
 * Create content string for embedding from workshop data
 */
function createWorkshopContent(workshop) {
  const parts = [];
  
  // Add title (most important)
  if (workshop.title) {
    parts.push(workshop.title);
  }
  
  // Add overview
  if (workshop.overview) {
    parts.push(workshop.overview);
  }
  
  // Add learning objectives
  if (workshop.learning_objectives && workshop.learning_objectives.length > 0) {
    parts.push('Learning objectives: ' + workshop.learning_objectives.join('. '));
  }
  
  // Add primary community/category
  if (workshop.primary_community) {
    parts.push('Focus: ' + workshop.primary_community);
  }
  
  // Add speaker names (searchable)
  if (workshop.speakers && workshop.speakers.length > 0) {
    const speakerNames = workshop.speakers.map(s => s.name).join(', ');
    parts.push('Speakers: ' + speakerNames);
  }
  
  // Add moderator names
  if (workshop.moderators && workshop.moderators.length > 0) {
    const moderatorNames = workshop.moderators.map(m => m.name).join(', ');
    parts.push('Moderators: ' + moderatorNames);
  }
  
  // Add credits info
  if (workshop.credits) {
    parts.push('Credits: ' + workshop.credits);
  }
  
  // Add schedule info for context
  if (workshop.day) {
    parts.push('Day: ' + workshop.day);
  }
  
  return parts.join(' | ');
}

async function generateWorkshopEmbeddings() {
  console.log('🧠 Starting workshop embedding generation...\n');
  
  // Fetch all workshops without embeddings
  const { data: workshops, error: fetchError } = await supabase
    .from('workshops')
    .select('*')
    .is('embedding', null);
  
  if (fetchError) {
    console.error('Error fetching workshops:', fetchError);
    return;
  }
  
  if (!workshops || workshops.length === 0) {
    console.log('✅ All workshops already have embeddings!');
    return;
  }
  
  console.log(`📚 Found ${workshops.length} workshops without embeddings\n`);
  
  let successCount = 0;
  let errorCount = 0;
  const estimatedCost = workshops.length * 0.0001; // Rough estimate for ada-002
  
  console.log(`💰 Estimated cost: $${estimatedCost.toFixed(4)}\n`);
  console.log('Generating embeddings...\n');
  
  for (const workshop of workshops) {
    try {
      // Create content string for embedding
      const content = createWorkshopContent(workshop);
      
      console.log(`Processing: ${workshop.title.substring(0, 60)}...`);
      
      // Generate embedding
      const embedding = await generateEmbedding(content);
      
      // Update workshop with embedding
      const { error: updateError } = await supabase
        .from('workshops')
        .update({ embedding })
        .eq('id', workshop.id);
      
      if (updateError) {
        throw updateError;
      }
      
      successCount++;
      console.log(`  ✅ Embedding generated (${content.length} chars)`);
      
      // Rate limiting - OpenAI allows 3000 RPM for ada-002
      // But let's be conservative
      await new Promise(resolve => setTimeout(resolve, 100)); // 10 per second
      
    } catch (error) {
      errorCount++;
      console.error(`  ❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n📊 Summary:');
  console.log(`✅ Successfully generated: ${successCount} embeddings`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`💰 Actual cost: ~$${(successCount * 0.0001).toFixed(4)}`);
  
  if (successCount > 0) {
    console.log('\n🎉 Workshop embeddings ready for semantic search!');
    console.log('Harper can now answer complex questions like:');
    console.log('  - "workshops about rehabilitation programs"');
    console.log('  - "sessions on mental health in corrections"');
    console.log('  - "training for correctional officers"');
  }
}

// Option to regenerate all embeddings
async function regenerateAllEmbeddings() {
  console.log('⚠️  Regenerating ALL workshop embeddings...\n');
  
  // Clear existing embeddings
  const { error: clearError } = await supabase
    .from('workshops')
    .update({ embedding: null })
    .not('id', 'is', null);
  
  if (clearError) {
    console.error('Error clearing embeddings:', clearError);
    return;
  }
  
  console.log('Cleared existing embeddings\n');
  
  // Now generate new ones
  await generateWorkshopEmbeddings();
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--regenerate')) {
    await regenerateAllEmbeddings();
  } else {
    await generateWorkshopEmbeddings();
  }
}

if (require.main === module) {
  main().catch(console.error);
}