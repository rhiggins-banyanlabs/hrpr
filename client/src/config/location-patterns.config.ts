export const CUISINE_TYPES = [
  'sushi', 'pizza', 'burger', 'italian', 'mexican', 'chinese', 'thai', 
  'indian', 'bbq', 'steak', 'seafood', 'vegetarian', 'vegan', 'gluten-free'
] as const;

export const FAST_FOOD_CHAINS = [
  'mcdonalds', 'burger king', 'wendys', 'subway', 'taco bell', 
  'kfc', 'pizza hut', 'dominos'
] as const;

export const LOCATION_PATTERNS = {
  FAST_FOOD: /fast.?food|mcdonald|burger.?king|wendy|subway|taco.?bell|kfc|pizza.?hut|domino/i,
  RESTAURANT: /restaurant|food|eat|dinner|lunch|breakfast/i,
  CAFE: /coffee|cafe|espresso|tea/i,
  HOTEL: /hotel|stay|accommodation|room|sleep/i,
  BAR: /bar|drink|pub|alcohol|beer|wine/i,
  ATTRACTION: /attraction|visit|sightseeing|tour/i,
  SHOPPING: /shopping|mall|store|retail|shop/i,
  GAS: /gas|gasoline|fuel|petrol|station/i,
  PARK: /park|playground|recreation|outdoor/i,
  PHARMACY: /pharmacy|drugstore|cvs|walgreens|rite.?aid|medicine/i,
  BANK: /bank|atm|credit.?union|financial/i,
  GYM: /gym|fitness|workout|exercise/i,
  NEARBY: /nearby|close|walking distance|near/i,
  CONVENTION_CENTER: /convention center|conference venue|event location/i,
  HOST_HOTEL: /hyatt|host hotel|(hotel.*stay)/i
} as const;

export const PLACE_TYPES = {
  RESTAURANT: 'restaurant',
  CAFE: 'cafe',
  LODGING: 'lodging',
  BAR: 'bar',
  TOURIST_ATTRACTION: 'tourist_attraction',
  SHOPPING_MALL: 'shopping_mall',
  GAS_STATION: 'gas_station',
  PARK: 'park',
  PHARMACY: 'pharmacy',
  BANK: 'bank',
  GYM: 'gym'
} as const;