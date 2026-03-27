/** Shared country → state/region → cities for Magicalive pickers and filters. */

export type CountryData = { states: Record<string, string[]> };

export const LOCATIONS: Record<string, CountryData> = {
  "United States": {
    states: {
      California: [
        "Los Angeles",
        "Hollywood",
        "San Francisco",
        "San Diego",
        "Santa Monica",
        "North Hollywood",
        "La Jolla",
        "Bakersfield",
        "Simi Valley",
        "La Quinta",
        "Temecula",
        "Folsom",
        "Riverside",
        "Martinez",
      ],
      "New York": ["New York City", "Brooklyn"],
      Illinois: ["Chicago"],
      Nevada: ["Las Vegas"],
      Washington: ["Seattle"],
      Tennessee: ["Nashville"],
      Florida: ["Miami", "Kissimmee", "St Augustine", "St. Petersburg"],
      Texas: ["Dallas", "Houston", "Austin", "San Antonio"],
      Massachusetts: ["Boston"],
      Colorado: ["Denver", "Colorado Springs", "Estes Park"],
      Georgia: ["Atlanta"],
      Pennsylvania: ["Philadelphia", "Pittsburgh", "Erie"],
      Arizona: ["Phoenix"],
      Oregon: ["Portland"],
      Minnesota: ["Minneapolis"],
      Louisiana: ["New Orleans"],
      DC: ["Washington DC"],
      Michigan: ["Detroit"],
      "North Carolina": ["Charlotte"],
      "South Carolina": ["Charleston"],
      Utah: ["West Jordan"],
      Delaware: ["Ocean View"],
      "New Jersey": ["Sparta"],
      Hawaii: ["Honolulu", "Maui"],
    },
  },
  "United Kingdom": {
    states: {
      England: ["London", "Manchester", "Birmingham"],
      Scotland: ["Edinburgh"],
    },
  },
  Australia: {
    states: {
      "New South Wales": ["Sydney"],
      Victoria: ["Melbourne"],
      Queensland: ["Brisbane"],
      "Western Australia": ["Perth"],
    },
  },
  Canada: {
    states: {
      Ontario: ["Toronto"],
      "British Columbia": ["Vancouver"],
      Quebec: ["Montreal"],
      Alberta: ["Calgary"],
    },
  },
  France: { states: { "": ["Paris"] } },
  Germany: { states: { "": ["Berlin"] } },
  Japan: { states: { "": ["Tokyo", "Osaka"] } },
  UAE: { states: { "": ["Dubai", "Abu Dhabi"] } },
  Singapore: { states: { "": ["Singapore"] } },
  Netherlands: { states: { "": ["Amsterdam"] } },
  Spain: { states: { "": ["Barcelona", "Madrid"] } },
  Italy: { states: { "": ["Rome", "Milan"] } },
  Switzerland: { states: { "": ["Zurich"] } },
  Austria: { states: { "": ["Vienna"] } },
  Sweden: { states: { "": ["Stockholm"] } },
  Norway: { states: { "": ["Oslo"] } },
  Denmark: { states: { "": ["Copenhagen"] } },
  Ireland: { states: { "": ["Dublin"] } },
  Portugal: { states: { "": ["Lisbon"] } },
  Belgium: { states: { "": ["Brussels"] } },
  "Czech Republic": { states: { "": ["Prague"] } },
  Poland: { states: { "": ["Warsaw"] } },
  Hungary: { states: { "": ["Budapest"] } },
  Greece: { states: { "": ["Athens"] } },
  "Saudi Arabia": { states: { "": ["Riyadh"] } },
  Qatar: { states: { "": ["Doha"] } },
  Israel: { states: { "": ["Tel Aviv"] } },
  "Hong Kong": { states: { "": ["Hong Kong"] } },
  "South Korea": { states: { "": ["Seoul"] } },
  China: { states: { "": ["Shanghai", "Beijing"] } },
  Thailand: { states: { "": ["Bangkok"] } },
  India: { states: { "": ["Mumbai", "Delhi"] } },
  Malaysia: { states: { "": ["Kuala Lumpur"] } },
  Indonesia: { states: { "": ["Jakarta"] } },
  Philippines: { states: { "": ["Manila"] } },
  Taiwan: { states: { "": ["Taipei"] } },
  Brazil: { states: { "": ["São Paulo", "Rio de Janeiro"] } },
  Argentina: { states: { "": ["Buenos Aires"] } },
  Mexico: { states: { "": ["Mexico City"] } },
  Colombia: { states: { "": ["Bogotá"] } },
  Peru: { states: { "": ["Lima"] } },
  Chile: { states: { "": ["Santiago"] } },
  "South Africa": { states: { "": ["Cape Town", "Johannesburg"] } },
  Kenya: { states: { "": ["Nairobi"] } },
  Nigeria: { states: { "": ["Lagos"] } },
  Egypt: { states: { "": ["Cairo"] } },
  Morocco: { states: { "": ["Casablanca"] } },
  "New Zealand": { states: { "": ["Auckland", "Wellington"] } },
};

/** USPS-style codes for US states in LOCATIONS (includes DC). */
export const US_STATE_NAME_TO_CODE: Record<string, string> = {
  California: "CA",
  "New York": "NY",
  Illinois: "IL",
  Nevada: "NV",
  Washington: "WA",
  Tennessee: "TN",
  Florida: "FL",
  Texas: "TX",
  Massachusetts: "MA",
  Colorado: "CO",
  Georgia: "GA",
  Pennsylvania: "PA",
  Arizona: "AZ",
  Oregon: "OR",
  Minnesota: "MN",
  Louisiana: "LA",
  DC: "DC",
  Michigan: "MI",
  "North Carolina": "NC",
  "South Carolina": "SC",
  Utah: "UT",
  Delaware: "DE",
  "New Jersey": "NJ",
  Hawaii: "HI",
};

export const COUNTRIES = Object.keys(LOCATIONS).sort((a, b) => a.localeCompare(b));

/** United States first, then alphabetical — for pickers. */
export function countriesForPicker(): string[] {
  const rest = Object.keys(LOCATIONS)
    .filter((c) => c !== "United States")
    .sort((a, b) => a.localeCompare(b));
  return ["United States", ...rest];
}

export function countryUsesStatePicker(country: string): boolean {
  const entry = LOCATIONS[country];
  if (!entry) return false;
  const keys = Object.keys(entry.states);
  return !(keys.length === 1 && keys[0] === "");
}

export function getStatesForCountry(country: string): string[] {
  const entry = LOCATIONS[country];
  if (!entry) return [];
  const keys = Object.keys(entry.states);
  if (keys.length === 1 && keys[0] === "") return [];
  return keys.sort((a, b) => a.localeCompare(b));
}

export function getCitiesForState(country: string, state: string): string[] {
  const entry = LOCATIONS[country];
  if (!entry) return [];
  const onlyEmpty = Object.keys(entry.states).length === 1 && entry.states[""];
  if (onlyEmpty) {
    const list = entry.states[""]!;
    return [...list].sort((a, b) => a.localeCompare(b));
  }
  const list = entry.states[state];
  return list ? [...list].sort((a, b) => a.localeCompare(b)) : [];
}

export function getCitiesForCountry(country: string): string[] {
  const entry = LOCATIONS[country];
  if (!entry) return [];
  const set = new Set<string>();
  for (const cities of Object.values(entry.states)) {
    for (const c of cities) set.add(c);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

/** Profile / stored event venue: human-readable location string. */
export function formatLocation(city: string, state: string, country: string): string {
  const c = city.trim();
  const s = state.trim();
  const co = country.trim();
  if (!c && !co) return "";
  if (!co) return c || s;
  if (!c) return co;
  if (!s) return `${c}, ${co}`;
  return `${c}, ${s}, ${co}`;
}

function normalizeUsStateToken(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  if (t.length <= 2) return t.toUpperCase();
  return US_STATE_NAME_TO_CODE[t] || t;
}

/** True if a row `state` value (DB) matches the location picker's state for `country`. */
export function pickerStateMatchesRowState(
  rowState: string | null | undefined,
  pickerState: string,
  country: string,
): boolean {
  const a = (rowState || "").trim();
  const b = pickerState.trim();
  if (!a || !b) return false;
  if (country === "United States") {
    return normalizeUsStateToken(a) === normalizeUsStateToken(b);
  }
  return a.toLowerCase() === b.toLowerCase();
}

/** Map picker's state label to typical DB value (US → 2-letter code). */
export function stateValueForDatabase(country: string, pickerState: string): string {
  const s = pickerState.trim();
  if (!s) return "";
  if (country === "United States") return US_STATE_NAME_TO_CODE[s] || s;
  return s;
}

/** Map DB state to picker value when editing. */
export function pickerStateFromDatabase(country: string, dbState: string | null | undefined): string {
  const s = (dbState || "").trim();
  if (!s) return "";
  if (country === "United States" && s.length <= 2) {
    const name = Object.entries(US_STATE_NAME_TO_CODE).find(
      ([, code]) => code.toUpperCase() === s.toUpperCase(),
    )?.[0];
    return name || s;
  }
  return s;
}

export function findCountryForCity(cityName: string): string {
  const q = cityName.trim().toLowerCase();
  if (!q) return "";
  for (const country of Object.keys(LOCATIONS)) {
    for (const cities of Object.values(LOCATIONS[country]!.states)) {
      if (cities.some((c) => c.toLowerCase() === q)) return country;
    }
  }
  return "";
}

/** First state/region key in `country` that lists this city (empty string if none). */
export function findStateForCity(cityName: string, country: string): string {
  const q = cityName.trim().toLowerCase();
  if (!q || !country) return "";
  const entry = LOCATIONS[country];
  if (!entry) return "";
  for (const [stateKey, cities] of Object.entries(entry.states)) {
    if (cities.some((c) => c.toLowerCase() === q)) return stateKey;
  }
  return "";
}

/**
 * Parse stored profile `location` into picker values.
 * Handles "City, State, Country", "City, Country", legacy "City, US", and "City, ST".
 */
export function parseStoredLocation(location: string | null | undefined): {
  country: string;
  state: string;
  city: string;
} {
  if (!location?.trim()) return { country: "", state: "", city: "" };
  const s = location.trim();

  const countriesSorted = [...Object.keys(LOCATIONS)].sort((a, b) => b.length - a.length);
  for (const country of countriesSorted) {
    const suffix = `, ${country}`;
    if (!s.toLowerCase().endsWith(suffix.toLowerCase())) continue;
    const remainder = s.slice(0, s.length - suffix.length).trim();
    if (!remainder) return { country, state: "", city: "" };

    if (!countryUsesStatePicker(country)) {
      return { country, state: "", city: remainder };
    }

    const states = getStatesForCountry(country).sort((a, b) => b.length - a.length);
    for (const st of states) {
      const stSuffix = `, ${st}`;
      if (remainder.toLowerCase().endsWith(stSuffix.toLowerCase())) {
        const city = remainder.slice(0, remainder.length - stSuffix.length).trim();
        return { country, state: st, city };
      }
    }

    return { country, state: "", city: remainder };
  }

  if (s.endsWith(", US")) {
    const remainder = s.slice(0, -4).trim();
    const comma = remainder.lastIndexOf(",");
    if (comma > 0) {
      const city = remainder.slice(0, comma).trim();
      const maybeState = remainder.slice(comma + 1).trim();
      if (/^[A-Za-z]{2}$/.test(maybeState)) {
        const stName = pickerStateFromDatabase("United States", maybeState.toUpperCase());
        return { country: "United States", state: stName, city };
      }
    }
    return { country: "United States", state: "", city: remainder };
  }

  const comma = s.lastIndexOf(",");
  if (comma > 0) {
    const left = s.slice(0, comma).trim();
    const right = s.slice(comma + 1).trim();
    if (right.length === 2 && right === right.toUpperCase() && /^[A-Z]{2}$/.test(right)) {
      const stName = pickerStateFromDatabase("United States", right);
      return { country: "United States", state: stName, city: left };
    }
  }

  return { country: "", state: "", city: s };
}

/** Magician profile `location` filter (directory). */
export function profileLocationMatchesFilter(
  location: string,
  filterCountry: string,
  filterState: string,
  filterCity: string,
  allCountriesLabel: string,
  allStatesLabel: string,
  allCitiesLabel: string,
): boolean {
  const loc = location.trim().toLowerCase();
  if (filterCity !== allCitiesLabel) {
    return loc.includes(filterCity.trim().toLowerCase());
  }
  if (filterState !== allStatesLabel) {
    if (!loc.includes(filterState.trim().toLowerCase())) return false;
    if (filterCountry !== allCountriesLabel) {
      const c = filterCountry.trim().toLowerCase();
      if (c === "united states") {
        return loc.includes("united states") || loc.endsWith(", us");
      }
      return loc.includes(c);
    }
    return true;
  }
  if (filterCountry !== allCountriesLabel) {
    const c = filterCountry.trim().toLowerCase();
    if (c === "united states") {
      return loc.includes("united states") || loc.endsWith(", us");
    }
    return loc.includes(c);
  }
  return true;
}

/**
 * Venue / show row vs country + state + city filters.
 * Pass `rowState` null when only `rowCity` is known (e.g. events).
 */
export function rowLocationMatchesFilter(
  rowCity: string | null | undefined,
  rowState: string | null | undefined,
  filterCountry: string,
  filterState: string,
  filterCity: string,
  allCountriesLabel: string,
  allStatesLabel: string,
  allCitiesLabel: string,
): boolean {
  const city = (rowCity || "").trim();
  const st = (rowState || "").trim();

  if (filterCity !== allCitiesLabel) {
    const fc = filterCity.trim().toLowerCase();
    const cityOk =
      city.toLowerCase() === fc ||
      city.toLowerCase().includes(fc);
    if (!cityOk) return false;
    if (filterState !== allStatesLabel) {
      if (st) {
        if (!pickerStateMatchesRowState(st, filterState, filterCountry)) return false;
      } else {
        const allowed = getCitiesForState(filterCountry, filterState);
        if (!allowed.some((x) => x.toLowerCase() === city.toLowerCase())) return false;
      }
    }
    if (
      filterCountry !== allCountriesLabel &&
      !getCitiesForCountry(filterCountry).some((x) => x.toLowerCase() === city.toLowerCase())
    ) {
      return false;
    }
    return true;
  }

  if (filterState !== allStatesLabel) {
    const allowed = getCitiesForState(filterCountry, filterState);
    if (st) {
      if (!pickerStateMatchesRowState(st, filterState, filterCountry)) return false;
      return true;
    }
    return allowed.some((x) => x.toLowerCase() === city.toLowerCase());
  }

  if (filterCountry !== allCountriesLabel) {
    const cities = getCitiesForCountry(filterCountry);
    return cities.some((x) => x.toLowerCase() === city.toLowerCase());
  }

  return true;
}

/** @deprecated Use rowLocationMatchesFilter — wrapper for two-level filters without state. */
export function rowCityMatchesFilter(
  rowCity: string | null | undefined,
  filterCountry: string,
  filterCity: string,
  allCountriesLabel: string,
  allCitiesLabel: string,
  allStatesLabel = "All states",
): boolean {
  return rowLocationMatchesFilter(
    rowCity,
    null,
    filterCountry,
    allStatesLabel,
    filterCity,
    allCountriesLabel,
    allStatesLabel,
    allCitiesLabel,
  );
}
