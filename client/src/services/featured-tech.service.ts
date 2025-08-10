/**
 * Service for featured technology demos and special exhibits at the conference
 */

export interface FeaturedTech {
  name: string;
  fullName: string;
  company: string;
  locations: string[];
  description: string;
  relatedEvents?: string[];
  keywords: string[];
}

export class FeaturedTechService {
  private static instance: FeaturedTechService;
  
  private featuredTech: FeaturedTech[] = [
    {
      name: 'AIDA',
      fullName: 'Ada Interview Agent',
      company: 'Vantage',
      locations: [
        'ACA Survey Booths at registration',
        'ACA Survey Booth in the exhibit hall',
        'Vantage Booth in the exhibit hall'
      ],
      description: 'Ada is an AI-powered interview agent developed by Vantage. The Ada technology can be experienced in the ACA Survey Booths located at registration and in the exhibit hall. The full Ada Interview Agent can be experienced during the AI Tech Expo and at the Vantage Booth in the exhibit hall.',
      relatedEvents: ['AI Tech Expo'],
      keywords: ['aida', 'ada demo', 'aided demo', 'ai demo', 'interview agent', 'vant4ge', 'vantage', 'survey booth', 'ai interview', 'ada interview', 'interview demo']
    }
  ];
  
  private constructor() {}
  
  static getInstance(): FeaturedTechService {
    if (!FeaturedTechService.instance) {
      FeaturedTechService.instance = new FeaturedTechService();
    }
    return FeaturedTechService.instance;
  }
  
  /**
   * Check if a query is asking about featured technology
   */
  detectFeaturedTechQuery(query: string): FeaturedTech | null {
    const lowerQuery = query.toLowerCase();
    
    for (const tech of this.featuredTech) {
      // Check if any keywords match
      const hasMatch = tech.keywords.some(keyword => lowerQuery.includes(keyword));
      if (hasMatch) {
        return tech;
      }
    }
    
    return null;
  }
  
  /**
   * Get formatted information about a featured technology
   */
  formatFeaturedTech(tech: FeaturedTech): string {
    let info = `${tech.fullName} by ${tech.company}\n\n`;
    info += `${tech.description}\n\n`;
    
    if (tech.locations.length > 0) {
      info += 'LOCATIONS:\n';
      tech.locations.forEach(location => {
        info += `• ${location}\n`;
      });
    }
    
    if (tech.relatedEvents && tech.relatedEvents.length > 0) {
      info += `\nRELATED EVENTS: ${tech.relatedEvents.join(', ')}`;
    }
    
    return info;
  }
  
  /**
   * Process a query for featured technology
   */
  async processFeaturedTechQuery(query: string): Promise<{
    found: boolean;
    data: FeaturedTech | null;
    formattedInfo: string;
  }> {
    const tech = this.detectFeaturedTechQuery(query);
    
    if (!tech) {
      return {
        found: false,
        data: null,
        formattedInfo: ''
      };
    }
    
    return {
      found: true,
      data: tech,
      formattedInfo: this.formatFeaturedTech(tech)
    };
  }
}

export const featuredTechService = FeaturedTechService.getInstance();