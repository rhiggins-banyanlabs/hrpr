/**
 * Service for on-site dining options at the Hyatt Regency and Convention Center
 */

export interface OnsiteDining {
  name: string;
  location: string;
  type: string[];
  description: string;
  hours?: string;
  offerings: string[];
  priceRange?: string;
}

export class OnsiteDiningService {
  private static instance: OnsiteDiningService;
  
  private onsiteDining: OnsiteDining[] = [
    {
      name: 'Assembly Hall Bar + Market',
      location: 'Hyatt Regency Denver - Lobby, 650 15th Street',
      type: ['restaurant', 'bar', 'coffee', 'marketplace', 'breakfast', 'lunch', 'dinner'],
      description: 'Marketplace restaurant and social lounge serving Starbucks coffee, gourmet pastries, sandwiches, fresh fruit salads, wine, and more. Features floor-to-ceiling windows with natural light.',
      hours: 'Market: 5:30 AM - 12:00 AM daily. Bar: 2:00 PM - 12:30 AM daily',
      offerings: ['starbucks coffee', 'espresso', 'pastries', 'sandwiches', 'fresh fruit salads', 'wine', 'cocktails', 'small plates', 'desserts'],
      priceRange: '$$'
    },
    {
      name: 'Former Saint Craft Kitchen and Taps',
      location: 'Hyatt Regency Denver - 650 15th Street',
      type: ['restaurant', 'breakfast', 'lunch', 'dinner', 'american', 'colorado cuisine'],
      description: 'Contemporary Colorado cuisine with locally-sourced ingredients. Features daily breakfast buffet ($28), à la carte options, craft beers, and downtown Denver views. Full bar with wine menu available.',
      hours: 'Breakfast: 6:30 AM - 10:30 AM (Mon-Fri), 6:30 AM - 12:00 PM (Sat-Sun buffet). Lunch: 11:00 AM - 2:00 PM daily. Dinner: 5:00 PM - 9:30 PM daily',
      offerings: ['breakfast buffet ($28)', 'à la carte breakfast', 'lunch menu', 'dinner specialties', 'craft beers', 'wine menu', 'kids menu', 'desserts'],
      priceRange: '$$-$$$'
    },
    {
      name: 'Peaks Lounge',
      location: 'Hyatt Regency Denver - 27th Floor, 650 15th Street',
      type: ['lounge', 'bar', 'asian fusion', 'cocktails'],
      description: 'Rooftop lounge with breathtaking views of the Rocky Mountains and Downtown Denver. Features Secret Garden menu with Asian-fusion bites like ramen and sushi, curated desserts, and seasonal cocktails. No reservations, first-come first-serve.',
      hours: '4:00 PM - 11:15 PM daily',
      offerings: ['ramen', 'sushi', 'asian fusion bites', 'seasonal cocktails', 'secret garden menu items', 'desserts', 'wine', 'beer'],
      priceRange: '$$$'
    },
  ];
  
  private constructor() {}
  
  static getInstance(): OnsiteDiningService {
    if (!OnsiteDiningService.instance) {
      OnsiteDiningService.instance = new OnsiteDiningService();
    }
    return OnsiteDiningService.instance;
  }
  
  /**
   * Check if a query is asking about food or coffee
   */
  isFoodQuery(query: string): boolean {
    const lowerQuery = query.toLowerCase();
    const foodKeywords = [
      'coffee', 'starbucks', 'cafe', 'espresso', 'latte', 'cappuccino',
      'food', 'eat', 'eating', 'hungry', 'restaurant', 'dining', 'dine',
      'breakfast', 'lunch', 'dinner', 'snack', 'meal',
      'bar', 'drink', 'cocktail', 'beer', 'wine'
    ];
    
    return foodKeywords.some(keyword => lowerQuery.includes(keyword));
  }
  
  /**
   * Get on-site dining options based on query
   */
  getOnsiteDining(query: string): OnsiteDining[] {
    const lowerQuery = query.toLowerCase();
    let results: OnsiteDining[] = [];
    
    // Coffee specific
    if (lowerQuery.includes('coffee') || lowerQuery.includes('starbucks') || 
        lowerQuery.includes('espresso') || lowerQuery.includes('latte')) {
      results = this.onsiteDining.filter(option => 
        option.type.includes('coffee') || option.type.includes('cafe')
      );
    }
    // Breakfast
    else if (lowerQuery.includes('breakfast')) {
      results = this.onsiteDining.filter(option => 
        option.type.includes('breakfast')
      );
    }
    // Lunch
    else if (lowerQuery.includes('lunch')) {
      results = this.onsiteDining.filter(option => 
        option.type.includes('restaurant') || option.type.includes('food court')
      );
    }
    // Dinner
    else if (lowerQuery.includes('dinner')) {
      results = this.onsiteDining.filter(option => 
        option.type.includes('dinner') || option.type.includes('restaurant')
      );
    }
    // Bar/Drinks
    else if (lowerQuery.includes('bar') || lowerQuery.includes('drink') || 
             lowerQuery.includes('cocktail') || lowerQuery.includes('beer') || 
             lowerQuery.includes('wine')) {
      results = this.onsiteDining.filter(option => 
        option.type.includes('bar')
      );
    }
    // General food query
    else {
      results = [...this.onsiteDining];
    }
    
    // Prioritize Hyatt options first, then Convention Center
    results.sort((a, b) => {
      if (a.location.includes('Hyatt') && !b.location.includes('Hyatt')) return -1;
      if (!a.location.includes('Hyatt') && b.location.includes('Hyatt')) return 1;
      return 0;
    });
    
    return results;
  }
  
  /**
   * Format dining options for display
   */
  formatDiningOptions(options: OnsiteDining[]): string {
    if (options.length === 0) {
      return 'No on-site dining options found.';
    }
    
    let formatted = 'ON-SITE DINING OPTIONS:\n\n';
    
    // Group by location
    const hyattOptions = options.filter(o => o.location.includes('Hyatt'));
    const conventionOptions = options.filter(o => o.location.includes('Convention'));
    
    if (hyattOptions.length > 0) {
      formatted += 'AT THE HYATT REGENCY:\n';
      hyattOptions.forEach(option => {
        formatted += `• ${option.name} (${option.location})\n`;
        formatted += `  ${option.description}\n`;
        if (option.hours) {
          formatted += `  Hours: ${option.hours}\n`;
        }
        formatted += '\n';
      });
    }
    
    if (conventionOptions.length > 0) {
      formatted += 'AT THE CONVENTION CENTER:\n';
      conventionOptions.forEach(option => {
        formatted += `• ${option.name} (${option.location})\n`;
        formatted += `  ${option.description}\n`;
        if (option.hours) {
          formatted += `  Hours: ${option.hours}\n`;
        }
        formatted += '\n';
      });
    }
    
    return formatted;
  }
  
  /**
   * Process a dining query and return formatted information
   */
  async processDiningQuery(query: string): Promise<{
    found: boolean;
    isOnsiteQuery: boolean;
    data: OnsiteDining[];
    formattedInfo: string;
  }> {
    if (!this.isFoodQuery(query)) {
      return {
        found: false,
        isOnsiteQuery: false,
        data: [],
        formattedInfo: ''
      };
    }
    
    const options = this.getOnsiteDining(query);
    
    return {
      found: options.length > 0,
      isOnsiteQuery: true,
      data: options,
      formattedInfo: this.formatDiningOptions(options)
    };
  }
}

export const onsiteDiningService = OnsiteDiningService.getInstance();