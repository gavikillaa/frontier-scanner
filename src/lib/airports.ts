// Frontier Airlines hub airports and common destinations
// This is a subset - Frontier serves many more airports

export interface Airport {
  code: string;
  name: string;
  city: string;
  state?: string;
}

export const FRONTIER_AIRPORTS: Airport[] = [
  // Major Hubs
  { code: "DEN", name: "Denver International", city: "Denver", state: "CO" },
  { code: "LAS", name: "Harry Reid International", city: "Las Vegas", state: "NV" },
  { code: "PHX", name: "Phoenix Sky Harbor", city: "Phoenix", state: "AZ" },
  { code: "MCO", name: "Orlando International", city: "Orlando", state: "FL" },
  { code: "ATL", name: "Hartsfield-Jackson", city: "Atlanta", state: "GA" },

  // Focus Cities
  { code: "MIA", name: "Miami International", city: "Miami", state: "FL" },
  { code: "FLL", name: "Fort Lauderdale-Hollywood", city: "Fort Lauderdale", state: "FL" },
  { code: "TPA", name: "Tampa International", city: "Tampa", state: "FL" },
  { code: "ORD", name: "O'Hare International", city: "Chicago", state: "IL" },
  { code: "MDW", name: "Chicago Midway", city: "Chicago", state: "IL" },
  { code: "DFW", name: "Dallas/Fort Worth International", city: "Dallas", state: "TX" },
  { code: "IAH", name: "George Bush Intercontinental", city: "Houston", state: "TX" },
  { code: "AUS", name: "Austin-Bergstrom", city: "Austin", state: "TX" },
  { code: "SAN", name: "San Diego International", city: "San Diego", state: "CA" },
  { code: "LAX", name: "Los Angeles International", city: "Los Angeles", state: "CA" },
  { code: "SFO", name: "San Francisco International", city: "San Francisco", state: "CA" },
  { code: "OAK", name: "Oakland International", city: "Oakland", state: "CA" },
  { code: "SJC", name: "San Jose International", city: "San Jose", state: "CA" },
  { code: "SEA", name: "Seattle-Tacoma", city: "Seattle", state: "WA" },
  { code: "PDX", name: "Portland International", city: "Portland", state: "OR" },
  { code: "SLC", name: "Salt Lake City International", city: "Salt Lake City", state: "UT" },
  { code: "MSP", name: "Minneapolis-Saint Paul", city: "Minneapolis", state: "MN" },
  { code: "DTW", name: "Detroit Metro Wayne County", city: "Detroit", state: "MI" },
  { code: "CLE", name: "Cleveland Hopkins", city: "Cleveland", state: "OH" },
  { code: "PHL", name: "Philadelphia International", city: "Philadelphia", state: "PA" },
  { code: "BOS", name: "Logan International", city: "Boston", state: "MA" },
  { code: "JFK", name: "John F. Kennedy", city: "New York", state: "NY" },
  { code: "LGA", name: "LaGuardia", city: "New York", state: "NY" },
  { code: "EWR", name: "Newark Liberty", city: "Newark", state: "NJ" },
  { code: "BWI", name: "Baltimore/Washington", city: "Baltimore", state: "MD" },
  { code: "IAD", name: "Washington Dulles", city: "Washington", state: "DC" },
  { code: "DCA", name: "Reagan National", city: "Washington", state: "DC" },
  { code: "RDU", name: "Raleigh-Durham", city: "Raleigh", state: "NC" },
  { code: "CLT", name: "Charlotte Douglas", city: "Charlotte", state: "NC" },
  { code: "BNA", name: "Nashville International", city: "Nashville", state: "TN" },
  { code: "MSY", name: "Louis Armstrong New Orleans", city: "New Orleans", state: "LA" },

  // Popular Destinations
  { code: "CUN", name: "Cancun International", city: "Cancun", state: "Mexico" },
  { code: "SJU", name: "Luis Muñoz Marín", city: "San Juan", state: "PR" },
  { code: "PUJ", name: "Punta Cana International", city: "Punta Cana", state: "DR" },
];

export function getAirportByCode(code: string): Airport | undefined {
  return FRONTIER_AIRPORTS.find((a) => a.code === code.toUpperCase());
}

export function searchAirports(query: string): Airport[] {
  const q = query.toLowerCase();
  return FRONTIER_AIRPORTS.filter(
    (a) =>
      a.code.toLowerCase().includes(q) ||
      a.city.toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q)
  );
}

export default FRONTIER_AIRPORTS;
