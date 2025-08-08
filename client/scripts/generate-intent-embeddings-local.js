const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const OpenAI = require('openai');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Intent routes with examples (same as in semantic-router.service.ts)
const intentRoutes = [
  {
    intent: 'info',
    description: 'General conference information, policies, and services',
    examples: [
      // Badge & Registration
      'Where do I get my badge?',
      'I lost my badge',
      'How much does a replacement badge cost?',
      'Do I need to wear my badge at all times?',
      'Where is registration?',
      'What are the registration hours?',
      
      // Parking & Transportation
      'Where can I park?',
      'How much does parking cost?',
      'Is there parking at the convention center?',
      'Where is the parking garage?',
      'How do I pay for parking?',
      'Are there parking spots available?',
      
      // ADA & Accessibility
      'I need ADA assistance',
      'Is the venue wheelchair accessible?',
      'Where are the accessible entrances?',
      'I have a disability and need help',
      'Are there services for people with disabilities?',
      'Can I get assistance for special needs?',
      
      // Food & Dining (at venue)
      'Where can I get food at the conference?',
      'Is there a cafeteria?',
      'Where is the food court?',
      'Are there snacks available?',
      'Where can I get coffee at the venue?',
      
      // Lost & Found
      'I lost my phone',
      'Where is lost and found?',
      'I found someone\'s wallet',
      'How do I report a lost item?',
      'Has anyone turned in a laptop?',
      
      // Business Services
      'Where is the FedEx?',
      'Where can I print documents?',
      'Is there a business center?',
      'Where can I make copies?',
      'Can I ship packages from here?',
      'Where is the exhibitor service counter?',
      
      // Policies
      'Can I take photos?',
      'What is the photography policy?',
      'Can I record sessions?',
      'Where can I smoke?',
      'What is the cell phone policy?',
      'Can I distribute flyers?',
      
      // Social & Events
      'What are the social media handles?',
      'Is there a prize drawing?',
      'How do I enter the raffle?',
      'When are worship services?',
      'Where is the show management office?',
      
      // CE Credits
      'How do I get continuing education credits?',
      'Where do I get my CE certificate?',
      'Which sessions offer CEUs?',
      'How many credits can I earn?'
    ]
  },
  {
    intent: 'meeting',
    description: 'Committee meetings and councils',
    examples: [
      // General meeting queries
      'What committee meetings are today?',
      'When are the committee meetings?',
      'Where are committee meetings held?',
      'Show me all committee meetings',
      'What meetings are on Friday?',
      'Are there any council meetings?',
      
      // Specific committees
      'When is the health care committee meeting?',
      'Where does the adult corrections committee meet?',
      'What time is the legal issues committee?',
      'Is there a detention committee meeting?',
      'When does the faith based committee meet?',
      'Staff wellness committee meeting time?',
      'Behavioral health committee schedule',
      'Where is the nurses committee meeting?',
      'Membership committee meeting location',
      'Restorative justice committee',
      'Ethics committee meeting',
      'Education directors meeting',
      'Correctional industries committee',
      'Juvenile detention meeting',
      'Military corrections committee',
      'Sheriff council meeting',
      'Awards committee schedule',
      'Substance use committee',
      'MOUD committee meeting',
      'Standards committee',
      'Accreditation auditor meeting'
    ]
  },
  {
    intent: 'workshop',
    description: 'Workshops, training sessions, and speakers',
    examples: [
      // General workshop queries
      'What workshops are available?',
      'Show me today\'s workshops',
      'Which workshops offer CE credits?',
      'What training sessions are there?',
      'Find workshops about mental health',
      'Substance abuse workshops',
      'Correctional officer training',
      
      // Speaker queries
      'Who is speaking today?',
      'Which workshops does Dr. Smith present?',
      'Who are the keynote speakers?',
      'Find sessions by John Doe',
      'What is Sarah Johnson presenting?',
      'Who is the moderator for the panel?',
      'List all presenters',
      'Which instructors are teaching?',
      
      // Topic-specific workshops
      'Mental health workshops',
      'Trauma-informed care training',
      'Substance use disorder sessions',
      'Medical workshops for nurses',
      'Leadership training sessions',
      'Crisis intervention workshops',
      'De-escalation training',
      'Reentry program workshops',
      'Technology in corrections sessions',
      
      // Time-based queries
      'What workshops are in the morning?',
      'Afternoon training sessions',
      'Which workshops are on Monday?',
      'Tuesday workshop schedule',
      'What sessions start at 9 AM?',
      
      // Credit-specific
      'Which workshops have CME credits?',
      'Sessions with CERP credits',
      'How many CE hours is this workshop?',
      'Nursing credit workshops',
      'Psychology CE sessions'
    ]
  },
  {
    intent: 'exhibitor',
    description: 'Exhibitors, vendors, and sponsors',
    examples: [
      // General exhibitor queries
      'Who are the exhibitors?',
      'List all vendors',
      'Which companies are exhibiting?',
      'Show me the exhibitor list',
      'What businesses are at the expo?',
      
      // Booth queries
      'Where is booth 123?',
      'What booth is Company X at?',
      'Find Microsoft\'s booth',
      'Which booth has medical supplies?',
      'Where are the technology vendors?',
      
      // Product/service queries
      'Who sells security equipment?',
      'Which vendors have medical products?',
      'Find technology solutions',
      'Who provides training services?',
      'Which companies offer software?',
      
      // Sponsor queries
      'Who are the conference sponsors?',
      'Which companies are gold sponsors?',
      'List the platinum sponsors',
      'Who is sponsoring the lunch?',
      
      // Specific company queries
      'Tell me about Securus Technologies',
      'What does GTL offer?',
      'Is Corizon Health here?',
      'Find VitalCore Health Strategies',
      'Where is Trinity Services Group?'
    ]
  },
  {
    intent: 'conference',
    description: 'Conference schedule, events, and sessions',
    examples: [
      // Schedule queries
      'What\'s the conference schedule?',
      'Show me today\'s agenda',
      'What\'s happening now?',
      'What\'s next on the schedule?',
      'When does the conference start?',
      'What time does it end today?',
      
      // Event queries
      'When is the opening ceremony?',
      'What time is the keynote?',
      'When is the closing reception?',
      'Are there networking events?',
      'When is the awards ceremony?',
      'What social events are there?',
      
      // Tour queries
      'Are there facility tours?',
      'When are the prison tours?',
      'How do I sign up for tours?',
      'What facilities can we visit?',
      'Where do tours depart from?',
      
      // AI Tech Expo (special event)
      'Tell me about the AI Tech Expo',
      'When is the AI Tech Expo?',
      'What\'s at the Tech Expo on Saturday?',
      'AI and technology showcase',
      
      // Session queries
      'What sessions are this afternoon?',
      'Morning session schedule',
      'How many tracks are there?',
      'What\'s the theme this year?',
      'Conference highlights'
    ]
  },
  {
    intent: 'location',
    description: 'Venue navigation and room locations',
    examples: [
      // Venue location
      'Where is the conference?',
      'What\'s the venue address?',
      'How do I get to the convention center?',
      'Directions to the conference',
      'Where is the Colorado Convention Center?',
      
      // Room finding
      'Where is room 201?',
      'How do I get to ballroom A?',
      'Where is the exhibit hall?',
      'Find meeting room 3',
      'Where is the main auditorium?',
      'Which floor is room 405 on?',
      
      // Navigation
      'Where are the restrooms?',
      'Where is the registration desk?',
      'How do I get to the second floor?',
      'Where are the elevators?',
      'Where is the information desk?',
      'Find the nearest exit',
      
      // Specific areas
      'Where is the poster session?',
      'Where is the networking area?',
      'Where do I check my coat?',
      'Where is the quiet room?',
      'Is there a prayer room?'
    ]
  },
  {
    intent: 'venue',
    description: 'External venues like restaurants, hotels, and local attractions',
    examples: [
      // Restaurants & Dining (outside venue)
      'Where can I eat nearby?',
      'Good restaurants near the convention center',
      'Best pizza downtown',
      'Where\'s the nearest Starbucks?',
      'Restaurants within walking distance',
      'Good bars nearby',
      'Where can I get breakfast?',
      
      // Hotels & Accommodation
      'Hotels near the venue',
      'Where is the Hyatt Regency?',
      'Closest hotel to convention center',
      'Where can I stay downtown?',
      'Hotel recommendations',
      'How far is the Marriott?',
      
      // Transportation
      'How do I get an Uber?',
      'Where can I catch a taxi?',
      'Nearest bus stop',
      'Is there a metro station nearby?',
      'How do I get to the airport?',
      
      // Shopping & Services
      'Where\'s the nearest pharmacy?',
      'Is there an ATM nearby?',
      'Where can I shop?',
      'Nearest grocery store',
      'Where can I buy souvenirs?',
      
      // Attractions
      'What can I do in Denver?',
      'Tourist attractions nearby',
      'Things to do downtown',
      'Is there a gym nearby?',
      'Museums in the area',
      'Parks within walking distance'
    ]
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

async function generateIntentEmbeddings() {
  console.log('🚀 Starting intent embeddings generation...');
  
  const outputPath = path.join(__dirname, '../src/data/intent-embeddings.json');
  const dataDir = path.dirname(outputPath);
  
  // Create data directory if it doesn't exist
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('✅ Created data directory');
  }

  let totalCount = 0;
  let successCount = 0;
  let errorCount = 0;
  
  // Structure to store embeddings
  const embeddingsData = {
    generated_at: new Date().toISOString(),
    model: "text-embedding-ada-002",
    intents: {}
  };

  for (const route of intentRoutes) {
    console.log(`\n📝 Processing intent: ${route.intent} (${route.examples.length} examples)`);
    
    embeddingsData.intents[route.intent] = {
      description: route.description,
      examples: [],
      embeddings: []
    };
    
    for (const example of route.examples) {
      totalCount++;
      process.stdout.write(`  [${totalCount}/${route.examples.length}] Embedding: "${example.substring(0, 50)}..."`);
      
      // Generate embedding
      const embedding = await generateEmbedding(example.toLowerCase());
      
      if (!embedding) {
        console.log(' ❌');
        errorCount++;
        continue;
      }

      // Store example and its embedding
      embeddingsData.intents[route.intent].examples.push(example);
      embeddingsData.intents[route.intent].embeddings.push(embedding);
      
      console.log(' ✅');
      successCount++;
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Write to file
  console.log('\n💾 Saving embeddings to file...');
  fs.writeFileSync(outputPath, JSON.stringify(embeddingsData, null, 2));
  
  // Also create a minified version for production
  const minifiedPath = path.join(__dirname, '../src/data/intent-embeddings.min.json');
  fs.writeFileSync(minifiedPath, JSON.stringify(embeddingsData));
  
  console.log(`✅ Saved embeddings to ${outputPath}`);
  console.log(`✅ Saved minified version to ${minifiedPath}`);

  console.log('\n' + '='.repeat(50));
  console.log(`Embedding generation complete!`);
  console.log(`✅ Successfully created: ${successCount} embeddings`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📊 Total examples processed: ${totalCount}`);
  console.log(`📁 Output file: ${outputPath}`);
  console.log(`📦 File size: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`);
  console.log(`📦 Minified size: ${(fs.statSync(minifiedPath).size / 1024).toFixed(2)} KB`);
  console.log('='.repeat(50));
}

// Run the generation
generateIntentEmbeddings()
  .then(() => {
    console.log('\n✨ Intent embeddings generation completed!');
    console.log('📌 Next steps:');
    console.log('  1. The embeddings are saved in src/data/intent-embeddings.json');
    console.log('  2. Import this file in your semantic-router.service.ts');
    console.log('  3. Use the embeddings for local intent detection');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Generation failed:', error);
    process.exit(1);
  });