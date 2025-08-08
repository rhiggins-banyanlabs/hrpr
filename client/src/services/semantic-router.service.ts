/**
 * Semantic Router for Intent Detection
 * Uses embeddings to classify user queries into intents based on semantic similarity
 */

// Import pre-generated embeddings (will be loaded dynamically to avoid build issues)
let intentEmbeddings: any = null;

export interface IntentRoute {
  intent: string;
  description: string;
  examples: string[];
  embeddings?: number[][];  // Will be populated during initialization
}

export interface SemanticMatch {
  intent: string;
  confidence: number;
  matchedExample?: string;
}

class SemanticRouterService {
  private routes: IntentRoute[] = [];
  private initialized = false;
  private embeddingsData: any = null;

  /**
   * Intent routes with example queries for each intent
   */
  private readonly intentRoutes: IntentRoute[] = [
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

  constructor() {
    // Routes will be initialized with embeddings when needed
    this.routes = this.intentRoutes;
    this.loadEmbeddings();
  }

  /**
   * Load embeddings from local JSON file
   */
  async loadEmbeddings() {
    try {
      // Dynamically import to avoid build issues
      const embeddingsModule = await import('../data/intent-embeddings.min.json');
      this.embeddingsData = embeddingsModule.default || embeddingsModule;
      
      // Map embeddings to routes
      for (const route of this.routes) {
        const intentData = this.embeddingsData.intents[route.intent];
        if (intentData && intentData.embeddings) {
          route.embeddings = intentData.embeddings;
        }
      }
      
      this.initialized = true;
      console.log('✅ Loaded intent embeddings for semantic routing');
    } catch (error) {
      console.log('⚠️ Could not load intent embeddings, falling back to keyword matching');
      this.initialized = false;
    }
  }

  /**
   * Check if embeddings are loaded
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);
    
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (normA * normB);
  }

  /**
   * Find the best matching intent for a query embedding
   */
  findBestMatch(queryEmbedding: number[]): SemanticMatch[] {
    const matches: SemanticMatch[] = [];
    
    for (const route of this.routes) {
      if (!route.embeddings || route.embeddings.length === 0) continue;
      
      let maxSimilarity = 0;
      let bestExample = '';
      
      // Find the most similar example in this route
      for (let i = 0; i < route.embeddings.length; i++) {
        const similarity = this.cosineSimilarity(queryEmbedding, route.embeddings[i]);
        if (similarity > maxSimilarity) {
          maxSimilarity = similarity;
          bestExample = route.examples[i];
        }
      }
      
      matches.push({
        intent: route.intent,
        confidence: maxSimilarity,
        matchedExample: bestExample
      });
    }
    
    // Sort by confidence
    matches.sort((a, b) => b.confidence - a.confidence);
    return matches;
  }

  /**
   * Get intent routes for embedding generation
   */
  getIntentRoutes(): IntentRoute[] {
    return this.intentRoutes;
  }

  /**
   * Fallback: keyword-based intent detection when embeddings aren't available
   */
  detectIntentByKeywords(query: string): SemanticMatch {
    const lowerQuery = query.toLowerCase();
    const scores: Record<string, number> = {};
    
    for (const route of this.routes) {
      let score = 0;
      
      // Check how many examples partially match
      for (const example of route.examples) {
        const lowerExample = example.toLowerCase();
        const words = lowerExample.split(/\s+/);
        
        // Check for word matches
        for (const word of words) {
          if (word.length > 3 && lowerQuery.includes(word)) {
            score += 1;
          }
        }
        
        // Bonus for very similar queries
        if (this.calculateStringSimilarity(lowerQuery, lowerExample) > 0.6) {
          score += 5;
        }
      }
      
      scores[route.intent] = score;
    }
    
    // Find the best scoring intent
    let bestIntent = 'general';
    let bestScore = 0;
    
    for (const [intent, score] of Object.entries(scores)) {
      if (score > bestScore) {
        bestScore = score;
        bestIntent = intent;
      }
    }
    
    // Calculate confidence based on score
    const confidence = Math.min(bestScore / 20, 1); // Normalize to 0-1
    
    return {
      intent: bestIntent,
      confidence: confidence
    };
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private calculateStringSimilarity(s1: string, s2: string): number {
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(s1: string, s2: string): number {
    const distances = Array(s2.length + 1).fill(null).map(() => Array(s1.length + 1).fill(null));
    
    for (let i = 0; i <= s1.length; i++) {
      distances[0][i] = i;
    }
    
    for (let j = 0; j <= s2.length; j++) {
      distances[j][0] = j;
    }
    
    for (let j = 1; j <= s2.length; j++) {
      for (let i = 1; i <= s1.length; i++) {
        const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
        distances[j][i] = Math.min(
          distances[j][i - 1] + 1, // deletion
          distances[j - 1][i] + 1, // insertion
          distances[j - 1][i - 1] + indicator // substitution
        );
      }
    }
    
    return distances[s2.length][s1.length];
  }
}

export const semanticRouter = new SemanticRouterService();