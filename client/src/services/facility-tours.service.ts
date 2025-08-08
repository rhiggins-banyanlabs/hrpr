import { createClient } from '@supabase/supabase-js';

interface FacilityTour {
  id: string;
  day: string;
  pickup_time: string;
  tour_times: string;
  dropoff_time: string;
  facility: string;
  facility_information: string;
  participants_allowed: number;
}

export class FacilityToursService {
  private static instance: FacilityToursService;
  private supabase: any;

  private constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  static getInstance(): FacilityToursService {
    if (!FacilityToursService.instance) {
      FacilityToursService.instance = new FacilityToursService();
    }
    return FacilityToursService.instance;
  }

  /**
   * Search for facility tours based on query
   */
  async searchTours(query: string): Promise<FacilityTour[]> {
    const lowerQuery = query.toLowerCase();
    
    try {
      // Check for specific facilities
      const facilityKeywords = ['arapahoe', 'moore', 'elevate', 'denver reception', 'denver women', 'jefferson', 'drdc'];
      const matchedFacility = facilityKeywords.find(keyword => lowerQuery.includes(keyword));
      
      if (matchedFacility) {
        const { data, error } = await this.supabase
          .from('facility_tours')
          .select('*')
          .ilike('facility', `%${matchedFacility}%`)
          .limit(5);
          
        if (error) throw error;
        return data || [];
      }
      
      // Check for specific days
      const dayKeywords = ['friday', 'saturday', 'sunday', 'monday'];
      const matchedDay = dayKeywords.find(keyword => lowerQuery.includes(keyword));
      
      if (matchedDay) {
        const { data, error } = await this.supabase
          .from('facility_tours')
          .select('*')
          .ilike('day', `%${matchedDay}%`)
          .order('pickup_time')
          .limit(10);
          
        if (error) throw error;
        return data || [];
      }
      
      // General tour query - return all tours
      const { data, error } = await this.supabase
        .from('facility_tours')
        .select('*')
        .order('day', { ascending: true })
        .limit(10);
        
      if (error) throw error;
      return data || [];
      
    } catch (error) {
      console.error('Error searching facility tours:', error);
      return [];
    }
  }

  /**
   * Format tours for display
   */
  formatToursForDisplay(tours: FacilityTour[]): string {
    if (!tours || tours.length === 0) {
      return '';
    }

    return tours.map(tour => {
      const lines = [
        `📍 ${tour.facility}`,
        `   Day: ${tour.day}`,
        `   Pickup: ${tour.pickup_time}`,
        `   Tour: ${tour.tour_times}`,
        `   Dropoff: ${tour.dropoff_time}`,
        `   Participants: ${tour.participants_allowed} allowed`
      ];
      
      if (tour.facility_information) {
        lines.push(`   Info: ${tour.facility_information}`);
      }
      
      return lines.join('\n');
    }).join('\n\n');
  }

  /**
   * Format tours for conversational response
   */
  formatToursConversational(tours: FacilityTour[]): string {
    if (!tours || tours.length === 0) {
      return '';
    }

    if (tours.length === 1) {
      const tour = tours[0];
      return `The ${tour.facility} tour is on ${tour.day}. Pickup is at ${tour.pickup_time}, the tour runs ${tour.tour_times}, and dropoff is at ${tour.dropoff_time}. ${tour.participants_allowed} participants are allowed.${tour.facility_information ? ` Note: ${tour.facility_information}` : ''}`;
    }

    // Multiple tours
    const summary = tours.slice(0, 3).map(tour => 
      `${tour.facility} on ${tour.day} (pickup at ${tour.pickup_time})`
    ).join(', ');
    
    return `Available facility tours include: ${summary}. Each tour has specific participant limits and requirements.`;
  }

  /**
   * Check if query is about facility tours
   */
  isTourQuery(query: string): boolean {
    const lowerQuery = query.toLowerCase();
    const tourKeywords = [
      'tour', 'facility', 'correctional', 'prison', 'jail', 
      'visit', 'pickup', 'dropoff', 'participants'
    ];
    
    return tourKeywords.some(keyword => lowerQuery.includes(keyword));
  }
}

// Export singleton instance
export const facilityToursService = FacilityToursService.getInstance();