#!/usr/bin/env node

/**
 * Script to test public access to intent_embeddings via Supabase API
 * This uses the anon key to simulate public access
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Use ONLY the anon key to test public access
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testPublicAccess() {
  console.log('🔍 Testing public access to intent_embeddings...\n');
  
  try {
    // Test 1: Read access
    console.log('📖 Test 1: Reading data...');
    const { data: readData, error: readError, count } = await supabase
      .from('intent_embeddings')
      .select('*', { count: 'exact', head: false })
      .limit(5);
    
    if (readError) {
      console.error('❌ Read failed:', readError.message);
    } else {
      console.log(`✅ Read successful! Found ${count || readData?.length || 0} total records`);
      if (readData && readData.length > 0) {
        console.log(`   Sample: "${readData[0].example_text?.substring(0, 50)}..."`);
      }
    }
    
    // Test 2: Search function
    console.log('\n🔎 Test 2: Testing search function...');
    // Create a dummy embedding (all zeros)
    const dummyEmbedding = new Array(1536).fill(0.1);
    
    const { data: searchData, error: searchError } = await supabase.rpc('search_intent_by_embedding', {
      query_embedding: dummyEmbedding,
      match_count: 3,
      similarity_threshold: 0.0
    });
    
    if (searchError) {
      console.error('❌ Search function failed:', searchError.message);
    } else {
      console.log(`✅ Search function works! Returned ${searchData?.length || 0} results`);
    }
    
    // Test 3: Get distinct intents
    console.log('\n📊 Test 3: Getting available intents...');
    const { data: intents, error: intentsError } = await supabase
      .from('intent_embeddings')
      .select('intent')
      .eq('is_active', true);
    
    if (intentsError) {
      console.error('❌ Failed to get intents:', intentsError.message);
    } else {
      const uniqueIntents = [...new Set(intents?.map(i => i.intent) || [])];
      console.log(`✅ Found ${uniqueIntents.length} intent types:`, uniqueIntents.join(', '));
    }
    
    // Test 4: Insert access (optional - will create test data)
    console.log('\n✏️  Test 4: Testing write access...');
    const testExample = {
      intent: 'test',
      example_text: 'TEST: This is a test example - can be deleted',
      embedding: new Array(1536).fill(0.1),
      metadata: { test: true, created_by: 'test-script' }
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('intent_embeddings')
      .insert(testExample)
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ Insert failed:', insertError.message);
      console.log('   (This might be expected if RLS policies restrict writes)');
    } else {
      console.log('✅ Insert successful! Created test record with ID:', insertData.id);
      
      // Clean up test record
      const { error: deleteError } = await supabase
        .from('intent_embeddings')
        .delete()
        .eq('id', insertData.id);
      
      if (deleteError) {
        console.log('⚠️  Could not delete test record:', deleteError.message);
      } else {
        console.log('🧹 Test record cleaned up');
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('📋 Summary:');
    console.log('='.repeat(50));
    
    if (!readError && !searchError) {
      console.log('✅ Public READ access is working correctly!');
      console.log('✅ RPC functions are accessible!');
    } else {
      console.log('❌ There are issues with public access.');
      console.log('   Run the setup-public-access.sql script in Supabase.');
    }
    
    if (!insertError) {
      console.log('✅ Public WRITE access is enabled (consider if this is desired)');
    } else {
      console.log('ℹ️  Public WRITE access is restricted (this might be intentional)');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the test
testPublicAccess();