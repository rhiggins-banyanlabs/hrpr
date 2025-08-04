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

async function generateAIExpoEmbedding() {
  console.log('🤖 Generating embedding for AI Tech Expo...\n');
  
  // Create comprehensive search text for the AI Tech Expo
  const aiExpoSearchText = `
    AI TECH EXPO Explore the Future of Corrections
    Saturday August 23 2025 2:00 PM to 6:00 PM
    Four Seasons Ballroom 3/4
    Featured Event Special Event Technology Showcase
    
    Sessions:
    The Use of AI: Separating Fact from Fiction - artificial intelligence myths reality corrections
    The Evolving Use of AI in Corrections - transformation innovation automation
    Safety Security and AI - enhanced protocols risk management
    The Impact and Possibilities of AI - future vision potential opportunities
    
    Sponsored by VIA VANT4GE LEOTECH AWS Amazon Web Services
    
    Keywords: AI artificial intelligence machine learning technology expo exhibition
    tech technology future corrections innovation digital transformation automation
    safety security Saturday afternoon featured event must-attend showcase demonstration
    VIA VANT4GE LEOTECH AWS sponsors Four Seasons Ballroom
  `.trim();
  
  try {
    // Use the known ID for AI Tech Expo
    const aiExpoId = 'e8c07ae0-7507-4fa6-8ff7-f61b1d807d30';
    
    // Find the AI Tech Expo entry by ID
    const { data: expoEntry, error: fetchError } = await supabase
      .from('conference_schedule')
      .select('*')
      .eq('id', aiExpoId)
      .single();
    
    if (fetchError || !expoEntry) {
      // Try finding by event name as fallback
      const { data: fallbackEntry, error: fallbackError } = await supabase
        .from('conference_schedule')
        .select('*')
        .ilike('event', '%AI%TECH%EXPO%')
        .single();
      
      if (fallbackError || !fallbackEntry) {
        console.log('❌ AI Tech Expo not found in database.');
        console.log(`Tried ID: ${aiExpoId}`);
        console.log('Also tried searching by name.');
        return;
      }
      
      // Use the fallback entry
      expoEntry = fallbackEntry;
    }
    
    console.log('Found AI Tech Expo entry:', expoEntry.event.substring(0, 50) + '...');
    
    // Generate embedding
    console.log('Generating embedding...');
    const embedding = await generateEmbedding(aiExpoSearchText);
    
    // Update the entry with embedding
    const { error: updateError } = await supabase
      .from('conference_schedule')
      .update({ 
        embedding,
        search_text: aiExpoSearchText
      })
      .eq('id', expoEntry.id);
    
    if (updateError) {
      throw updateError;
    }
    
    console.log('✅ Successfully generated embedding for AI Tech Expo!');
    console.log('\n🎯 Harper can now answer questions about:');
    console.log('  - "Tell me about the AI Tech Expo"');
    console.log('  - "What\'s happening with AI on Saturday?"');
    console.log('  - "Who\'s sponsoring the tech events?"');
    console.log('  - "Where is the AI showcase?"');
    console.log('  - "What AI sessions are available?"');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the script
generateAIExpoEmbedding();