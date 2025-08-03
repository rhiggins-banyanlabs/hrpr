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
 * Create content string for embedding from exhibitor data
 */
function createExhibitorContent(exhibitor) {
  const parts = [];
  
  // Add company name (most important)
  if (exhibitor.company_name) {
    parts.push(exhibitor.company_name);
  }
  
  // Add company bio if available
  if (exhibitor.company_bio) {
    parts.push(exhibitor.company_bio);
  }
  
  // Add industry category
  if (exhibitor.industry_category) {
    parts.push('Industry: ' + exhibitor.industry_category);
  }
  
  // Add booth number for searchability
  if (exhibitor.booth_number) {
    parts.push('Booth ' + exhibitor.booth_number);
  }
  
  // Add contact info for context (names are searchable)
  if (exhibitor.primary_contact) {
    parts.push('Contact: ' + exhibitor.primary_contact);
    if (exhibitor.contact_title) {
      parts.push(exhibitor.contact_title);
    }
  }
  
  // Add location for regional searches
  if (exhibitor.city && exhibitor.state) {
    parts.push(`Location: ${exhibitor.city}, ${exhibitor.state}`);
  }
  
  return parts.join(' | ');
}

async function generateExhibitorEmbeddings() {
  console.log('🏢 Starting exhibitor embedding generation...\n');
  
  // Fetch all exhibitors without embeddings
  const { data: exhibitors, error: fetchError } = await supabase
    .from('exhibitors')
    .select('*')
    .is('embedding', null);
  
  if (fetchError) {
    console.error('Error fetching exhibitors:', fetchError);
    return;
  }
  
  if (!exhibitors || exhibitors.length === 0) {
    console.log('✅ All exhibitors already have embeddings!');
    
    // Check total count
    const { count } = await supabase
      .from('exhibitors')
      .select('*', { count: 'exact', head: true });
    
    console.log(`📊 Total exhibitors in database: ${count}`);
    return;
  }
  
  console.log(`📚 Found ${exhibitors.length} exhibitors without embeddings\n`);
  
  let successCount = 0;
  let errorCount = 0;
  const estimatedCost = exhibitors.length * 0.0001; // Rough estimate for ada-002
  
  console.log(`💰 Estimated cost: $${estimatedCost.toFixed(4)}\n`);
  console.log('Generating embeddings...\n');
  
  for (const exhibitor of exhibitors) {
    try {
      // Create content string for embedding
      const content = createExhibitorContent(exhibitor);
      
      console.log(`Processing: ${exhibitor.company_name} (Booth ${exhibitor.booth_number || 'TBD'})`);
      
      // Generate embedding
      const embedding = await generateEmbedding(content);
      
      // Update exhibitor with embedding
      const { error: updateError } = await supabase
        .from('exhibitors')
        .update({ embedding })
        .eq('id', exhibitor.id);
      
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
    console.log('\n🎉 Exhibitor embeddings ready for semantic search!');
    console.log('Harper can now answer questions like:');
    console.log('  - "companies with security solutions"');
    console.log('  - "healthcare technology vendors"');
    console.log('  - "who is at booth 123"');
    console.log('  - "exhibitors from California"');
  }
}

// Option to regenerate all embeddings
async function regenerateAllEmbeddings() {
  console.log('⚠️  Regenerating ALL exhibitor embeddings...\n');
  
  // Clear existing embeddings
  const { error: clearError } = await supabase
    .from('exhibitors')
    .update({ embedding: null })
    .not('id', 'is', null);
  
  if (clearError) {
    console.error('Error clearing embeddings:', clearError);
    return;
  }
  
  console.log('Cleared existing embeddings\n');
  
  // Now generate new ones
  await generateExhibitorEmbeddings();
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--regenerate')) {
    await regenerateAllEmbeddings();
  } else {
    await generateExhibitorEmbeddings();
  }
}

if (require.main === module) {
  main().catch(console.error);
}