/** Shared country → cities for Magicalive pickers and filters. */

export const LOCATIONS: Record<string, { cities: string[] }> = {
  "United States": {
    cities: [
      "Los Angeles",
      "New York",
      "Chicago",
      "Las Vegas",
      "Seattle",
      "Nashville",
      "Miami",
      "Dallas",
      "Houston",
      "Austin",
      "Boston",
      "San Francisco",
      "Denver",
      "Atlanta",
      "Philadelphia",
      "Phoenix",
      "San Diego",
      "Portland",
      "Minneapolis",
      "New Orleans",
      "Washington DC",
      "San Antonio",
      "Detroit",
      "Charlotte",
      "Hollywood",
    ],
  },
  "United Kingdom": { cities: ["London", "Manchester", "Edinburgh", "Birmingham"] },
  Australia: { cities: ["Sydney", "Melbourne", "Brisbane", "Perth"] },
  Canada: { cities: ["Toronto", "Vancouver", "Montreal", "Calgary"] },
  France: { cities: ["Paris"] },
  Netherlands: { cities: ["Amsterdam"] },
  Germany: { cities: ["Berlin"] },
  Spain: { cities: ["Barcelona", "Madrid"] },
  Italy: { cities: ["Rome", "Milan"] },
  Switzerland: { cities: ["Zurich"] },
  Austria: { cities: ["Vienna"] },
  Sweden: { cities: ["Stockholm"] },
  Norway: { cities: ["Oslo"] },
  Denmark: { cities: ["Copenhagen"] },
  Ireland: { cities: ["Dublin"] },
  Portugal: { cities: ["Lisbon"] },
  Belgium: { cities: ["Brussels"] },
  "Czech Republic": { cities: ["Prague"] },
  Poland: { cities: ["Warsaw"] },
  Hungary: { cities: ["Budapest"] },
  Greece: { cities: ["Athens"] },
  UAE: { cities: ["Dubai", "Abu Dhabi"] },
  "Saudi Arabia": { cities: ["Riyadh"] },
  Qatar: { cities: ["Doha"] },
  Israel: { cities: ["Tel Aviv"] },
  Japan: { cities: ["Tokyo", "Osaka"] },
  Singapore: { cities: ["Singapore"] },
  "Hong Kong": { cities: ["Hong Kong"] },
  "South Korea": { cities: ["Seoul"] },
  China: { cities: ["Shanghai", "Beijing"] },
  Thailand: { cities: ["Bangkok"] },
  India: { cities: ["Mumbai", "Delhi"] },
  Malaysia: { cities: ["Kuala Lumpur"] },
  Indonesia: { cities: ["Jakarta"] },
  Philippines: { cities: ["Manila"] },
  Taiwan: { cities: ["Taipei"] },
  Brazil: { cities: ["São Paulo", "Rio de Janeiro"] },
  Argentina: { cities: ["Buenos Aires"] },
  Mexico: { cities: ["Mexico City"] },
  Colombia: { cities: ["Bogotá"] },
  Peru: { cities: ["Lima"] },
  Chile: { cities: ["Santiago"] },
  "South Africa": { cities: ["Cape Town", "Johannesburg"] },
  Kenya: { cities: ["Nairobi"] },
  Nigeria: { cities: ["Lagos"] },
  Egypt: { cities: ["Cairo"] },
  Morocco: { cities: ["Casablanca"] },
  "New Zealand": { cities: ["Auckland", "Wellington"] },
};

export const COUNTRIES = Object.keys(LOCATIONS).sort((a, b) => a.localeCompare(b));

/** United States first, then alphabetical — for pickers. */
export function countriesForPicker(): string[] {
  const rest = Object.keys(LOCATIONS)
    .filter((c) => c !== "United States")
    .sort((a, b) => a.localeCompare(b));
  return ["United States", ...rest];
}

export function getCitiesForCountry(country: string): string[] {
  const entry = LOCATIONS[country];
  return entry ? [...entry.cities].sort((a, b) => a.localeCompare(b)) : [];
}

/** Profile / magician location string: "City, Country" */
export function formatLocation(city: string, country: string): string {
  const c = city.trim();
  const co = country.trim();
  if (!c && !co) return "";
  if (!co) return c;
  if (!c) return co;
  return `${c}, ${co}`;
}

/** Which country lists this city (first match). */
export function findCountryForCity(cityName: string): string {
  const q = cityName.trim();
  if (!q) return "";
  for (const country of Object.keys(LOCATIONS)) {
    if (LOCATIONS[country]!.cities.some((c) => c.toLowerCase() === q.toLowerCase())) {
      return country;
    }
  }
  return "";
}

/**
 * Parse stored profile `location` into picker values.
 * Handles "City, Country", legacy "City, US", and "City, ST".
 */
export function parseStoredLocation(location: string | null | undefined): {
  country: string;
  city: string;
} {
  if (!location?.trim()) return { country: "", city: "" };
  const s = location.trim();

  const bySuffix = [...Object.keys(LOCATIONS)].sort((a, b) => b.length - a.length);
  for (const country of bySuffix) {
    const suffix = `, ${country}`;
    if (s.toLowerCase().endsWith(suffix.toLowerCase())) {
      return { country, city: s.slice(0, -suffix.length).trim() };
    }
  }

  if (s.endsWith(", US")) {
    return { country: "United States", city: s.slice(0, -4).trim() };
  }

  const comma = s.lastIndexOf(",");
  if (comma > 0) {
    const left = s.slice(0, comma).trim();
    const right = s.slice(comma + 1).trim();
    if (right.length === 2 && right === right.toUpperCase() && /^[A-Z]{2}$/.test(right)) {
      return { country: "United States", city: left };
    }
  }

  return { country: "", city: s };
}

/** Magician profile `location` filter (directory). */
export function profileLocationMatchesFilter(
  location: string,
  country: string,
  city: string,
  allCountriesLabel: string,
  allCitiesLabel: string,
): boolean {
  const loc = location.trim().toLowerCase();
  if (city !== allCitiesLabel) {
    return loc.includes(city.trim().toLowerCase());
  }
  if (country !== allCountriesLabel) {
    const c = country.trim().toLowerCase();
    if (c === "united states") {
      return loc.includes("united states") || loc.endsWith(", us");
    }
    return loc.includes(c);
  }
  return true;
}

/** Show / venue row `city` string vs country + city filters. */
export function rowCityMatchesFilter(
  rowCity: string | null | undefined,
  country: string,
  city: string,
  allCountriesLabel: string,
  allCitiesLabel: string,
): boolean {
  const raw = (rowCity || "").trim();
  if (city !== allCitiesLabel) {
    return raw.toLowerCase() === city.trim().toLowerCase() || raw.toLowerCase().includes(city.trim().toLowerCase());
  }
  if (country !== allCountriesLabel) {
    const cities = getCitiesForCountry(country);
    return cities.some((x) => x.toLowerCase() === raw.toLowerCase());
  }
  return true;
}
