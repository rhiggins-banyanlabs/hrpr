const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
const OpenAI = require('openai');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Conference information data
const conferenceInfoData = [
  {
    topic: "ADA Assistance",
    category: "Accessibility",
    keywords: ["ada", "disability", "disabilities", "assistance", "wheelchair", "accessible", "accessibility", "help", "special needs"],
    information: "If you need assistance or have accessibility needs, please contact American Correctional Association show management at 703-981-4738. We're here to help ensure everyone can fully participate in the conference.",
    priority: 10
  },
  {
    topic: "Badge Information",
    category: "Registration",
    keywords: ["badge", "identification", "id", "name tag", "credential", "lost badge", "replacement badge"],
    information: "Please wear your ACA badge at all times during the conference. It's your passport to all sessions, the Exhibit Hall, workshops and social events. Badge checkers will be at each event. If you lose your badge, you can replace it at the ACA registration area for a $25 fee.",
    priority: 10
  },
  {
    topic: "Business Center / FedEx",
    category: "Services",
    keywords: ["business center", "fedex", "fed ex", "federal express", "printing", "print", "copies", "copy", "shipping", "ship", "mail", "package", "fax", "scan", "office services"],
    information: "The closest FedEx Store to the Colorado Convention Center is at 650 15th Street. It's open from 8 AM to 6 PM daily for all your business needs including printing, copying, shipping, and other office services.",
    priority: 8
  },
  {
    topic: "Cell Phone Policy",
    category: "Policies",
    keywords: ["cell phone", "phone", "mobile", "silence", "quiet", "ringer"],
    information: "Please remember to turn your cell phones off or to silent mode during sessions, workshops and meetings. Phone use is not permitted during these events.",
    priority: 5
  },
  {
    topic: "Continuing Education Credits",
    category: "Education",
    keywords: ["continuing education", "ce", "ceu", "credits", "professional development", "certification"],
    information: "Visit the ACA professional development staff in the ACA Connect Hub and Information & Technology Booth for continuing education opportunities. Details are on pages 76-77 of your program guide.",
    priority: 9
  },
  {
    topic: "Exhibitor Service Counter",
    category: "Exhibitors",
    keywords: ["exhibitor service", "exhibitor help", "booth help", "vendor service", "exhibitor counter", "service counter", "exhibitor desk", "exhibitor support"],
    information: "The Exhibitor Service Counter is located in Exhibit Hall A/B for any exhibitor needs.",
    priority: 7
  },
  {
    topic: "Facility Tours",
    category: "Tours",
    keywords: ["facility tour", "tours", "prison tour", "jail tour", "correctional facility", "visit facility"],
    information: "Facility tours are offered by the Host Committee. Sign up during registration hours at the registration area. Space is limited, so sign up early! See page 52 for details.",
    priority: 8
  },
  {
    topic: "Food Service",
    category: "Dining",
    keywords: ["food", "restaurant", "lunch", "dinner", "breakfast", "coffee", "snacks", "dining", "eat", "hungry", "food court", "cafeteria"],
    information: "A variety of food and beverage outlets are located outside the Colorado Convention Center and in the surrounding area.",
    priority: 8
  },
  {
    topic: "Lost and Found",
    category: "Services",
    keywords: ["lost and found", "lost", "found", "missing", "left behind", "forgot", "lost item"],
    information: "If you've lost an item, check with the ACA Registration Desk. Found items should be given to ACA show management. Items not retrieved by end of day go to building security.",
    priority: 7
  },
  {
    topic: "Materials Distribution",
    category: "Policies",
    keywords: ["flyers", "brochures", "handouts", "materials", "distribution", "promotional", "marketing materials"],
    information: "Distribution of promotional materials is prohibited in registration, workshop, and exhibit areas except within an exhibitor's assigned booth. Prohibited materials will be removed.",
    priority: 5
  },
  {
    topic: "Non-Exhibitor Registration",
    category: "Registration",
    keywords: ["non-exhibitor", "consultant", "visitor", "non-vendor", "guest registration"],
    information: "Companies or consultants without exhibit space must register and pay the non-exhibitor rate. Failure to register properly may result in penalties and jeopardize future participation.",
    priority: 6
  },
  {
    topic: "Parking",
    category: "Transportation",
    keywords: ["parking", "park", "garage", "car", "vehicle", "lot", "parking garage", "parking lot"],
    information: "The Colorado Convention Center has an onsite covered parking garage with limited spaces, open 24/7. Use the automated pay stations - scan the QR code or use text prompt to purchase parking. Details at: https://denverconvention.com/parking",
    url: "https://denverconvention.com/parking",
    priority: 9
  },
  {
    topic: "Photography Policy",
    category: "Policies",
    keywords: ["photo", "photography", "pictures", "video", "recording", "camera", "filming"],
    information: "Photography and video recording are prohibited in the exhibit hall, meeting rooms and lobbies during show hours. Exhibitors may photograph only their own booth before/after hours. Any recording during show hours needs ACA management approval.",
    priority: 5
  },
  {
    topic: "Show Management Office",
    category: "Services",
    keywords: ["show management", "management office", "aca office", "help desk", "administration"],
    information: "The Show Management Office is located in West Office Suite E1.",
    priority: 6
  },
  {
    topic: "Smoking Policy",
    category: "Policies",
    keywords: ["smoking", "smoke", "cigarette", "vaping", "tobacco", "e-cigarette"],
    information: "Smoking is not permitted inside the convention center or within 25 feet of entrances. Smoking is only allowed in designated outdoor areas.",
    priority: 5
  },
  {
    topic: "Social Media",
    category: "Communication",
    keywords: ["social media", "facebook", "twitter", "instagram", "linkedin", "social", "hashtag"],
    information: "Follow ACA on social media! Facebook: americancorrectionalassociation, Twitter: @acainfo, LinkedIn: linkedin.com/company/american-correctional-association, Instagram: @amercorrectionalassoc",
    priority: 6
  },
  {
    topic: "Solicitation Policy",
    category: "Policies",
    keywords: ["solicitation", "soliciting", "selling", "sales", "unauthorized sales"],
    information: "Solicitation by non-exhibitors is strictly prohibited. Violators will have credentials revoked and be asked to leave.",
    priority: 5
  },
  {
    topic: "Workshop Information",
    category: "Education",
    keywords: ["workshop", "session", "speaker", "schedule", "seating", "workshop seating"],
    information: "Workshop content and speakers are subject to change. Seating is first come, first served. See pages 80-138 for workshop details.",
    priority: 8
  },
  {
    topic: "Worship Services",
    category: "Services",
    keywords: ["worship", "church", "prayer", "religious", "service", "faith", "chapel"],
    information: "Worship services are scheduled during the conference. See page 49 for specific times and locations.",
    priority: 6
  },
  {
    topic: "Prize Drawing",
    category: "Events",
    keywords: ["prize", "raffle", "drawing", "united airlines", "marriott", "gift card", "win", "contest", "giveaway"],
    information: "Don't forget to visit the sponsoring booths in the Exhibit Hall to get your ticket stamped for a chance to win a United Airlines gift card and Marriott Bonvoy points!",
    priority: 7
  }
];

async function generateEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: text,
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    return null;
  }
}

async function importConferenceInfo() {
  console.log('🚀 Starting conference info import...');

  // Clear existing data
  const { error: deleteError } = await supabase
    .from('conference_info')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (using impossible UUID)
  
  if (deleteError && deleteError.code !== 'PGRST116') {
    console.error('Error clearing existing data:', deleteError);
  } else {
    console.log('✅ Cleared existing conference info data');
  }

  let successCount = 0;
  let errorCount = 0;

  for (const info of conferenceInfoData) {
    console.log(`\n📝 Processing: ${info.topic}`);
    
    // Create search text for full-text search
    const searchText = `${info.topic} ${info.category || ''} ${info.information} ${info.keywords.join(' ')}`.toLowerCase();
    
    // Generate embedding for semantic search
    const embedding = await generateEmbedding(searchText);
    
    if (!embedding) {
      console.error(`❌ Failed to generate embedding for ${info.topic}`);
      errorCount++;
      continue;
    }

    // Insert into database
    const { data, error } = await supabase
      .from('conference_info')
      .insert({
        topic: info.topic,
        category: info.category,
        information: info.information,
        keywords: info.keywords,
        priority: info.priority || 5,
        url: info.url || null,
        search_text: searchText,
        embedding: embedding
      })
      .select();

    if (error) {
      console.error(`❌ Error inserting ${info.topic}:`, error);
      errorCount++;
    } else {
      console.log(`✅ Successfully imported: ${info.topic}`);
      successCount++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`Import complete!`);
  console.log(`✅ Successfully imported: ${successCount} items`);
  console.log(`❌ Errors: ${errorCount} items`);
  console.log('='.repeat(50));
}

// Run the import
importConferenceInfo()
  .then(() => {
    console.log('\n✨ Conference info import completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Import failed:', error);
    process.exit(1);
  });