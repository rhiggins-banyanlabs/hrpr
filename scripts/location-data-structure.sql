-- Organized location data structure for fast category-based queries

-- Main venues table with predefined categories
CREATE TABLE venue_categories (
  id SERIAL PRIMARY KEY,
  category_name VARCHAR(50) NOT NULL UNIQUE,
  search_keywords TEXT[], -- Keywords Harper should listen for
  description TEXT
);

-- Insert category definitions
INSERT INTO venue_categories (category_name, search_keywords, description) VALUES
('restaurants', ARRAY['restaurant', 'food', 'eat', 'dining', 'lunch', 'dinner', 'meal'], 'Full-service dining establishments'),
('fast_food', ARRAY['fast food', 'quick', 'grab', 'coffee', 'sandwich', 'burger', 'pizza'], 'Quick service restaurants and cafes'),
('gas_stations', ARRAY['gas', 'fuel', 'station', 'convenience'], 'Gas stations and convenience stores'),
('shopping', ARRAY['shop', 'store', 'mall', 'buy', 'purchase', 'retail'], 'Shopping centers and retail stores'),
('hotels', ARRAY['hotel', 'stay', 'accommodation', 'lodging', 'room'], 'Hotels and lodging'),
('parking', ARRAY['parking', 'park', 'garage', 'lot'], 'Parking facilities'),
('bars', ARRAY['bar', 'drink', 'cocktail', 'beer', 'nightlife', 'happy hour'], 'Bars and nightlife venues');

-- Enhanced venues table
CREATE TABLE nearby_venues (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL REFERENCES venue_categories(category_name),
  address TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  rating DECIMAL(2, 1),
  price_level INTEGER, -- 1-4 ($, $$, $$$, $$$$)
  phone VARCHAR(50),
  hours_summary VARCHAR(100), -- e.g., "Open 24/7", "Mon-Fri 9AM-9PM"
  distance_miles DECIMAL(3, 1), -- Distance from convention center
  walk_time_minutes INTEGER,
  special_notes TEXT, -- "Free WiFi", "Conference discount", etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast category lookups
CREATE INDEX idx_venues_category ON nearby_venues(category);
CREATE INDEX idx_venues_distance ON nearby_venues(distance_miles);
CREATE INDEX idx_venues_rating ON nearby_venues(rating DESC);

-- Sample data structure (we'll populate this with real scraped data)
INSERT INTO nearby_venues (name, category, address, rating, price_level, distance_miles, walk_time_minutes, hours_summary, special_notes) VALUES

-- Restaurants
('The Cherry Cricket', 'restaurants', '2641 E 2nd Ave, Denver, CO', 4.2, 2, 1.2, 15, 'Daily 11AM-2AM', 'Famous burgers, local favorite'),
('Union Station Food Hall', 'restaurants', '1701 Wynkoop St, Denver, CO', 4.0, 2, 0.8, 10, 'Daily 7AM-9PM', 'Multiple food vendors in historic station'),

-- Fast Food
('Starbucks', 'fast_food', '1401 17th St, Denver, CO', 4.1, 1, 0.3, 4, 'Daily 5AM-9PM', 'Coffee and light breakfast'),
('Chipotle', 'fast_food', '1512 Larimer St, Denver, CO', 3.8, 1, 0.5, 6, 'Daily 10:45AM-10PM', 'Mexican fast-casual'),

-- Gas Stations
('Shell', 'gas_stations', '1490 17th St, Denver, CO', 3.5, 1, 0.4, 5, '24/7', 'Convenience store included'),

-- Shopping
('16th Street Mall', 'shopping', '16th St, Denver, CO', 4.0, 2, 0.6, 8, 'Varies by store', 'Outdoor pedestrian mall with shops'),

-- Hotels
('Hyatt Regency Denver', 'hotels', '650 15th St, Denver, CO', 4.2, 3, 0.1, 2, '24/7 Front Desk', 'Official conference hotel'),
('The Crawford Hotel', 'hotels', '1701 Wynkoop St, Denver, CO', 4.4, 4, 0.8, 10, '24/7 Front Desk', 'Boutique hotel in Union Station'),

-- Parking
('Denver Convention Center Parking', 'parking', '700 14th St, Denver, CO', 3.8, 2, 0.0, 0, '24/7', 'Attached to convention center, $15/day'),
('ParkWhiz Lot', 'parking', '1555 California St, Denver, CO', 4.0, 1, 0.3, 4, '24/7', 'Pre-book online, $10/day'),

-- Bars
('Terminal Bar', 'bars', '1701 Wynkoop St, Denver, CO', 4.3, 2, 0.8, 10, 'Daily 11AM-12AM', 'Craft cocktails in Union Station'),
('ViewHouse Ballpark', 'bars', '2015 Market St, Denver, CO', 4.1, 2, 1.0, 12, 'Daily 11AM-2AM', 'Sports bar with rooftop');

-- Create view for Harper's quick category queries
CREATE VIEW venue_lookup AS
SELECT 
  v.name,
  v.category,
  v.address,
  v.rating,
  v.price_level,
  v.distance_miles,
  v.walk_time_minutes,
  v.hours_summary,
  v.special_notes,
  c.search_keywords
FROM nearby_venues v
JOIN venue_categories c ON v.category = c.category_name
ORDER BY v.category, v.distance_miles;