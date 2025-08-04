// AI Tech Expo Featured Event Data
// This can be imported into the conference data service for priority responses

export const AI_TECH_EXPO = {
  title: "AI TECH EXPO",
  tagline: "Explore the Future of Corrections",
  date: "Saturday, August 23, 2025",
  time: "2:00 PM - 6:00 PM",
  location: "Four Seasons Ballroom 3/4",
  duration: "4 hours",
  
  // Featured Sessions
  sessions: [
    {
      title: "The Use of AI: Separating Fact from Fiction",
      description: "Learn what AI can really do versus common misconceptions in correctional settings"
    },
    {
      title: "The Evolving Use of AI in Corrections",
      description: "Discover how artificial intelligence is transforming correctional facilities and operations"
    },
    {
      title: "Safety, Security, and AI",
      description: "Explore how AI enhances safety protocols and security measures in corrections"
    },
    {
      title: "The Impact and Possibilities of AI",
      description: "Vision for the future of AI in correctional systems and its potential impact"
    }
  ],
  
  // Sponsors
  sponsors: [
    { name: "VIA", type: "Presenting Sponsor" },
    { name: "VANT4GE", type: "Presenting Sponsor" },
    { name: "LEOTECH", type: "Presenting Sponsor" },
    { name: "AWS", type: "Presenting Sponsor" }
  ],
  
  // Keywords for enhanced search
  keywords: [
    "AI", "artificial intelligence", "tech expo", "technology",
    "future of corrections", "innovation", "safety", "security",
    "VIA", "VANT4GE", "LEOTECH", "AWS", "Amazon Web Services",
    "machine learning", "automation", "digital transformation",
    "Saturday afternoon", "Four Seasons Ballroom", "featured event"
  ],
  
  // Response snippets for Harper
  responses: {
    general: "The AI Tech Expo is a featured event on Saturday, August 23rd from 2 to 6 PM in the Four Seasons Ballroom. It's exploring the future of corrections with AI, including sessions on separating fact from fiction, safety and security, and the evolving use of AI in corrections. It's sponsored by VIA, VANT4GE, LEOTECH, and AWS.",
    
    timing: "The AI Tech Expo runs for 4 hours on Saturday afternoon, from 2 PM to 6 PM. Perfect timing to explore after the morning workshops!",
    
    location: "You'll find the AI Tech Expo in the Four Seasons Ballroom 3/4. It's one of our larger venues to accommodate all the exciting demonstrations and presentations.",
    
    sessions: "The AI Tech Expo features four key sessions: Separating AI fact from fiction, the evolving use of AI in corrections, safety and security with AI, and exploring the impact and possibilities of AI technology.",
    
    sponsors: "The AI Tech Expo is brought to you by VIA, VANT4GE, LEOTECH, and AWS. These leading technology companies are showcasing the latest innovations in correctional AI.",
    
    importance: "This is one of our featured events! With AI transforming corrections, this expo is a must-attend for anyone interested in the future of correctional technology and operations."
  }
};

// Helper function to check if a query is about the AI Tech Expo
export function isAITechExpoQuery(query: string): boolean {
  const lowerQuery = query.toLowerCase();
  
  // Direct mentions
  if (lowerQuery.includes('ai tech') || lowerQuery.includes('tech expo') || 
      lowerQuery.includes('ai expo')) {
    return true;
  }
  
  // Saturday afternoon tech events
  if (lowerQuery.includes('saturday') && 
      (lowerQuery.includes('ai') || lowerQuery.includes('technology'))) {
    return true;
  }
  
  // Sponsor mentions
  if (lowerQuery.includes('via') || lowerQuery.includes('vant4ge') || 
      lowerQuery.includes('leotech') || lowerQuery.includes('aws')) {
    return true;
  }
  
  // Four Seasons Ballroom on Saturday
  if (lowerQuery.includes('four seasons') && lowerQuery.includes('saturday')) {
    return true;
  }
  
  return false;
}