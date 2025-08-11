// Script to clean up old active sessions that were never properly closed
// Run with: node scripts/cleanup-active-sessions.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupActiveSessions() {
  try {
    console.log('🔍 Fetching active sessions...');
    
    // Get all active sessions
    const { data: activeSessions, error: fetchError } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('is_active', true)
      .is('session_ended_at', null);

    if (fetchError) {
      console.error('❌ Error fetching sessions:', fetchError);
      return;
    }

    console.log(`📊 Found ${activeSessions?.length || 0} active sessions`);

    if (!activeSessions || activeSessions.length === 0) {
      console.log('✅ No active sessions to clean up');
      return;
    }

    // Filter sessions older than 1 hour (or any threshold you prefer)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const oldSessions = activeSessions.filter(
      session => session.session_started_at < oneHourAgo
    );

    console.log(`🕐 Found ${oldSessions.length} sessions older than 1 hour`);

    if (oldSessions.length === 0) {
      console.log('✅ No old sessions to clean up');
      return;
    }

    // Ask for confirmation
    console.log('\n⚠️  This will mark the following sessions as ended:');
    oldSessions.forEach(session => {
      const startTime = new Date(session.session_started_at).toLocaleString();
      console.log(`   - Session ${session.id.substring(0, 8)}... started at ${startTime}`);
    });

    console.log('\n📝 Updating sessions...');

    // Update all old active sessions
    for (const session of oldSessions) {
      const { error: updateError } = await supabase
        .from('chat_sessions')
        .update({
          session_ended_at: new Date().toISOString(),
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', session.id);

      if (updateError) {
        console.error(`❌ Error updating session ${session.id}:`, updateError);
      } else {
        console.log(`✅ Closed session ${session.id.substring(0, 8)}...`);
      }
    }

    console.log('\n✨ Cleanup complete!');
    console.log(`📊 Closed ${oldSessions.length} old active sessions`);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the cleanup
cleanupActiveSessions();