const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
const OpenAI = require('openai');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function updateHotelMeeting() {
  console.log('🔄 Updating Education Directors meeting location...');
  
  // First, find the meeting
  const { data: meetings, error: fetchError } = await supabase
    .from('committee_meetings')
    .select('*')
    .eq('committee_name', 'Education Directors in Corrections Council')
    .single();
  
  if (fetchError) {
    console.error('Error fetching meeting:', fetchError);
    return;
  }
  
  if (!meetings) {
    console.error('Meeting not found');
    return;
  }
  
  console.log('✅ Found meeting:', meetings.committee_name);
  console.log('📍 Current location:', meetings.location);
  
  // Update the meeting data
  const updatedMeeting = {
    ...meetings,
    location: 'Mineral A (Hyatt Regency)',
    room_number: 'Mineral A',
    building: 'Hyatt Regency'
  };
  
  // Generate new search text
  const searchText = `${updatedMeeting.committee_name} ${updatedMeeting.meeting_type} ${updatedMeeting.day} ${updatedMeeting.time} ${updatedMeeting.location} ${updatedMeeting.description} ${updatedMeeting.keywords.join(' ')}`;
  
  // Generate new embedding
  console.log('🤖 Generating new embedding...');
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: searchText,
    });
    
    const embedding = response.data[0].embedding;
    
    // Update the database
    const { data, error: updateError } = await supabase
      .from('committee_meetings')
      .update({
        location: 'Mineral A (Hyatt Regency)',
        room_number: 'Mineral A',
        building: 'Hyatt Regency',
        search_text: searchText,
        embedding: embedding
      })
      .eq('id', meetings.id);
    
    if (updateError) {
      console.error('❌ Error updating meeting:', updateError);
    } else {
      console.log('✅ Successfully updated meeting location to: Mineral A (Hyatt Regency)');
      console.log('✅ Building updated to: Hyatt Regency');
      console.log('✅ Embedding regenerated');
    }
    
  } catch (error) {
    console.error('Error generating embedding:', error);
  }
}

// Run the update
updateHotelMeeting().catch(console.error);