const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function updateFacilityTours() {
  console.log('🚀 Updating Correctional Facility Tours entries...');
  
  // Find all facility tour entries
  const { data: tours, error: fetchError } = await supabase
    .from('conference_schedule')
    .select('*')
    .eq('event', 'Correctional Facility Tours');
  
  if (fetchError) {
    console.error('Error fetching tours:', fetchError);
    return;
  }
  
  console.log(`Found ${tours.length} facility tour entries to update`);
  
  // Update each tour entry
  for (const tour of tours) {
    const updateData = {
      time: '9:30 AM | 12:30 PM',  // Show the two tour times
      description: 'Tours of local correctional facilities - Choose from multiple departure times',
      notes: 'Tour times: 9:30 AM | 12:30 PM - We are flexible on times to accommodate your schedule. See page 52 for details.',
      // Update timestamps to reflect the tour window
      start_time: `${tour.date ? tour.date.split(',')[0] : '2025-08-22'}T09:30:00`,
      end_time: `${tour.date ? tour.date.split(',')[0] : '2025-08-22'}T14:30:00`,
    };
    
    // Map day to date if needed
    const dateMap = {
      'Friday': '2025-08-22',
      'Saturday': '2025-08-23',
      'Sunday': '2025-08-24',
      'Monday': '2025-08-25'
    };
    
    if (tour.day && dateMap[tour.day]) {
      updateData.start_time = `${dateMap[tour.day]}T09:30:00`;
      updateData.end_time = `${dateMap[tour.day]}T14:30:00`;
      updateData.start_timestamp = `${dateMap[tour.day]}T09:30:00`;
      updateData.end_timestamp = `${dateMap[tour.day]}T14:30:00`;
    }
    
    const { error: updateError } = await supabase
      .from('conference_schedule')
      .update(updateData)
      .eq('id', tour.id);
    
    if (updateError) {
      console.error(`❌ Error updating tour for ${tour.day}:`, updateError);
    } else {
      console.log(`✅ Updated ${tour.day} facility tours`);
    }
  }
  
  console.log('\n✅ Facility tours update complete!');
  
  // Verify the updates
  console.log('\nVerifying updated tours:');
  const { data: updatedTours, error: verifyError } = await supabase
    .from('conference_schedule')
    .select('day, time, notes')
    .eq('event', 'Correctional Facility Tours')
    .order('day');
  
  if (!verifyError && updatedTours) {
    updatedTours.forEach(tour => {
      console.log(`  ${tour.day}: ${tour.time}`);
      console.log(`    Notes: ${tour.notes}`);
    });
  }
}

updateFacilityTours().catch(console.error);