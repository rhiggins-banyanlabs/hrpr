// Script to scrape real venue data around Denver Convention Center
// Run this script to populate the database with real Google Places data

require('dotenv').config({ path: '../client/.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Denver Convention Center coordinates
const CONVENTION_CENTER = {
  lat: 39.7392,
  lng: -104.9903,
  address: '700 14th St, Denver, CO 80202'
};

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

class DenverVenueScraper {
  constructor() {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    this.venueTypes = {
      restaurants: 'restaurant',
      fast_food: 'meal_takeaway|cafe|bakery',
      gas_stations: 'gas_station',
      shopping: 'shopping_mall|store',
      hotels: 'lodging',
      parking: 'parking',
      bars: 'bar|night_club'
    };
  }

  async searchNearbyPlaces(type, keyword, radius = 8000) {
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?` +
      `location=${CONVENTION_CENTER.lat},${CONVENTION_CENTER.lng}&` +
      `radius=${radius}&` +
      `type=${type}&` +
      `keyword=${keyword}&` +
      `key=${GOOGLE_API_KEY}`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === 'OK') {
        return data.results;
      } else {
        console.error(`Places API error: ${data.status}`);
        return [];
      }
    } catch (error) {
      console.error('Error fetching places:', error);
      return [];
    }
  }

  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  calculateWalkingTime(distanceMiles) {
    // Average walking speed: 3 mph
    return Math.round(distanceMiles * 20); // 20 minutes per mile
  }

  async getPlaceDetails(placeId) {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?` +
      `place_id=${placeId}&` +
      `fields=formatted_phone_number,website,opening_hours,price_level&` +
      `key=${GOOGLE_API_KEY}`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      return data.result || {};
    } catch (error) {
      console.error('Error fetching place details:', error);
      return {};
    }
  }

  formatOpeningHours(openingHours) {
    if (!openingHours || !openingHours.weekday_text) {
      return 'Hours vary';
    }
    
    // Check if open 24/7
    const is24_7 = openingHours.weekday_text.every(day => 
      day.includes('Open 24 hours')
    );
    
    if (is24_7) return 'Open 24/7';
    
    // Get today's hours
    const today = new Date().getDay();
    const todayIndex = today === 0 ? 6 : today - 1; // Convert to Google's format
    return openingHours.weekday_text[todayIndex] || 'Hours vary';
  }

  async scrapeCategory(category, searchTypes) {
    console.log(`\n🔍 Scraping ${category}...`);
    const places = [];
    
    const types = searchTypes.split('|');
    for (const type of types) {
      const results = await this.searchNearbyPlaces(type, category);
      places.push(...results);
      
      // Rate limit to avoid hitting API limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Remove duplicates by place_id
    const uniquePlaces = places.filter((place, index, self) =>
      index === self.findIndex(p => p.place_id === place.place_id)
    );

    console.log(`Found ${uniquePlaces.length} unique ${category}`);

    const processedVenues = [];
    for (const place of uniquePlaces.slice(0, 20)) { // Limit to top 20 for 5-mile radius
      const distance = this.calculateDistance(
        CONVENTION_CENTER.lat, CONVENTION_CENTER.lng,
        place.geometry.location.lat, place.geometry.location.lng
      );

      // Only include venues within 5 miles
      if (distance > 5) continue;

      const details = await this.getPlaceDetails(place.place_id);
      
      const venue = {
        name: place.name,
        category: category,
        address: place.vicinity,
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
        rating: place.rating || null,
        price_level: details.price_level || place.price_level || null,
        phone: details.formatted_phone_number || null,
        hours_summary: this.formatOpeningHours(details.opening_hours),
        distance_miles: Math.round(distance * 10) / 10,
        walk_time_minutes: this.calculateWalkingTime(distance),
        special_notes: null
        // google_place_id: place.place_id  // Removed until schema includes this column
      };

      processedVenues.push(venue);
      
      // Rate limit
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return processedVenues;
  }

  async saveVenuesToDatabase(venues) {
    try {
      // First, clear existing data for this category
      if (venues.length > 0) {
        await this.supabase
          .from('nearby_venues')
          .delete()
          .eq('category', venues[0].category);
      }

      // Insert new venues
      const { data, error } = await this.supabase
        .from('nearby_venues')
        .insert(venues)
        .select();

      if (error) {
        console.error('Database error:', error);
        return false;
      }

      console.log(`✅ Saved ${data.length} venues to database`);
      return true;
    } catch (error) {
      console.error('Error saving to database:', error);
      return false;
    }
  }

  async scrapeAllVenues() {
    console.log('🏗️  Starting Denver Convention Center venue scraping...');
    console.log(`📍 Center point: ${CONVENTION_CENTER.address}`);

    for (const [category, searchTypes] of Object.entries(this.venueTypes)) {
      try {
        const venues = await this.scrapeCategory(category, searchTypes);
        
        if (venues.length > 0) {
          await this.saveVenuesToDatabase(venues);
          console.log(`✅ ${category}: ${venues.length} venues saved`);
        } else {
          console.log(`⚠️  ${category}: No venues found`);
        }

        // Longer delay between categories
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`❌ Error scraping ${category}:`, error);
      }
    }

    console.log('\n🎉 Scraping complete!');
  }
}

// Run the scraper
async function main() {
  if (!GOOGLE_API_KEY) {
    console.error('❌ GOOGLE_MAPS_API_KEY environment variable not set');
    process.exit(1);
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Supabase environment variables not set');
    process.exit(1);
  }

  const scraper = new DenverVenueScraper();
  await scraper.scrapeAllVenues();
}

// Export for use in other scripts
module.exports = { DenverVenueScraper };

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}