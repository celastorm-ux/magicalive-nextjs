export type CityLandingDefinition = {
  slug: string;
  displayName: string;
  /** Case-insensitive substring matches for `profiles.location` */
  locationMatch: string[];
  /** Matches for `venues.city` */
  venueCityMatch: string[];
  heroSubtext: string;
  seoParagraphs: [string, string, string];
  /** Two paragraphs for bookers — "Hire a Magician in [city]" (venue names appended from DB) */
  hireBookerParagraphs: [string, string];
  /** Venue names mentioned in copy for local color */
  venueSpotlight: string[];
  relatedSlugs: string[];
};

export const CITY_LANDING_PAGES: CityLandingDefinition[] = [
  {
    slug: "los-angeles",
    displayName: "Los Angeles",
    locationMatch: ["Los Angeles", "LA"],
    venueCityMatch: ["Los Angeles"],
    heroSubtext:
      "From Hollywood stages to Beverly Hills galas, LA is one of the busiest magic markets in the world.",
    seoParagraphs: [
      "Los Angeles blends television, corporate hospitality, and private homes into a thriving scene for close-up artists, illusionists, and comedy conjurors. Event planners often book magicians for wrap parties, awards-season gatherings, and high-end brand activations where walk-around sets the tone.",
      "The city’s mix of studios, hotels, and casinos means performers frequently work intimate salons, rooftop soirées, and full-scale theaters in the same month. Magicalive helps you compare reels, reviews, and upcoming appearances before you reach out for a hold date.",
      "Pair your search with venues known for live variety and magic-friendly programming — from historic theaters downtown to modern event spaces on the west side — to plan everything from strolling sets to headline illusion shows.",
    ],
    hireBookerParagraphs: [
      "Los Angeles is home to some of the world’s finest magic talent. From the legendary Magic Castle in Hollywood — the most famous magic club in the world — to intimate close-up and cabaret rooms across the city, LA offers experiences from strolling cocktail sets to full-scale illusion shows.",
      "Whether you need a corporate magician for a product launch in Downtown LA, walk-around for a Westside gala, or a specialist for a Malibu wedding, Magicalive lists verified professionals you can reach with a booking request.",
    ],
    venueSpotlight: ["The Magic Castle", "Orpheum Theatre", "Hollywood Bowl"],
    relatedSlugs: ["hollywood", "las-vegas", "seattle"],
  },
  {
    slug: "new-york",
    displayName: "New York",
    locationMatch: ["New York", "NYC", "Manhattan", "Brooklyn"],
    venueCityMatch: ["New York", "Brooklyn"],
    heroSubtext:
      "Five boroughs, countless rooms — NYC demands polish, pace, and presence from every performer.",
    seoParagraphs: [
      "New York audiences are sharp: corporate clients in Midtown, theater crowds off Broadway, and private clients in loft spaces all expect tight routining and impeccable timing. Magicalive lists professionals who regularly work the city’s high expectations.",
      "From luxury fundraisers to Times Square-adjacent showcases, magicians here balance cabaret spots, touring one-offs, and bespoke close-up for finance and media guests. Browse profiles to see specialties that fit your borough and venue size.",
      "Connect with entertainers who already know load-in quirks at legacy ballrooms, boutique hotels, and rooftop venues across Manhattan and Brooklyn — and lock dates before the calendar fills.",
    ],
    hireBookerParagraphs: [
      "New York’s magic scene spans corporate summits in Midtown, private salons downtown, and theater-adjacent showcases across Manhattan and Brooklyn. The city attracts headline illusionists and close-up specialists who are used to demanding, savvy audiences.",
      "When you hire a magician in New York, venue logistics and tight schedules matter as much as the tricks. Magicalive helps you shortlist talent with real reviews, clear specialties, and a direct path to request a quote for your date.",
    ],
    venueSpotlight: ["Civic venues & historic halls", "Hotel ballrooms", "Off-Broadway rooms"],
    relatedSlugs: ["chicago", "nashville", "los-angeles"],
  },
  {
    slug: "chicago",
    displayName: "Chicago",
    locationMatch: ["Chicago"],
    venueCityMatch: ["Chicago"],
    heroSubtext:
      "Windy City audiences love strong character work, comedy beats, and material that shines in close quarters or on big stages.",
    seoParagraphs: [
      "Chicago’s magic footprint spans corporate Lake Shore events, neighborhood theaters, and festival stages across the metro. Magicalive highlights performers who travel the region and anchor residencies downtown.",
      "Whether you are booking a trade show at McCormick Place or an intimate dinner in River North, matching style to room size matters. Filter profiles to find strolling specialists, parlor performers, and illusionists with proven room experience.",
      "Use Magicalive to preview upcoming public dates, compare social proof, and message talent directly — without losing weeks to back-and-forth logistics.",
    ],
    hireBookerParagraphs: [
      "Chicago blends Midwest warmth with world-class corporate and theater traditions — from the Loop and River North to neighborhood stages and lakefront events. Professional magicians here excel at comedy magic, mentalism, and close-up that fits tight urban rooms.",
      "Planning a gala, conference after-party, or private celebration? Hire a magician in Chicago through Magicalive to compare profiles, check who works your side of the metro, and send a single booking request with your event details.",
    ],
    venueSpotlight: ["Chicago Theatre district", "Convention corridor", "River North venues"],
    relatedSlugs: ["nashville", "new-york", "los-angeles"],
  },
  {
    slug: "las-vegas",
    displayName: "Las Vegas",
    locationMatch: ["Las Vegas", "Vegas", "Henderson"],
    venueCityMatch: ["Las Vegas", "Henderson"],
    heroSubtext:
      "The world’s capital of stage magic — residencies, corporate suites, and after-hours close-up all live here.",
    seoParagraphs: [
      "Las Vegas remains the benchmark for large-room illusions, variety bills, and polished host work. Beyond the Strip, corporate groups host hospitality suites and awards nights that need reliable walk-around and emcee skills.",
      "Magicalive profiles show who is actively performing in Southern Nevada, what formats they offer, and how buyers rate past bookings — critical when you need a shortlist fast.",
      "Pair talent with the Strip’s theaters, resort ballrooms, and off-Strip event spaces for launches, incentives, and private celebrations that still deserve showroom-level impact.",
    ],
    hireBookerParagraphs: [
      "Las Vegas is synonymous with stage magic — residencies, variety bills, and corporate hospitality on and off the Strip. At the same time, local and visiting magicians routinely book close-up and mentalism for private suites, incentives, and high-end celebrations.",
      "To hire a magician in Las Vegas for a corporate event, wedding weekend, or private party, use Magicalive to see who is active in Southern Nevada, read verified feedback, and request availability without guessing who takes outside bookings.",
    ],
    venueSpotlight: ["Strip showrooms", "Resort ballrooms", "Henderson event centers"],
    relatedSlugs: ["los-angeles", "seattle", "nashville"],
  },
  {
    slug: "seattle",
    displayName: "Seattle",
    locationMatch: ["Seattle", "Bellevue", "Tacoma"],
    venueCityMatch: ["Seattle", "Bellevue"],
    heroSubtext:
      "Pacific Northwest clients favor thoughtful, modern acts — tech events, winery weekends, and sleek urban lofts.",
    seoParagraphs: [
      "Seattle’s mix of technology campuses, waterfront venues, and alpine-adjacent retreats rewards magicians who can scale intimacy for forty guests or energy for four hundred.",
      "Magicalive connects event teams with artists experienced in Microsoft-campus adjacent meetings, Capitol Hill celebrations, and Eastside corporate retreats alike.",
      "Discover talent who can shift from strolling during cocktail hour to a focused parlor set after dinner — ideal for the region’s preference for curated, low-fluff entertainment.",
    ],
    hireBookerParagraphs: [
      "Seattle and the Eastside host a growing corporate and private market for sophisticated close-up, mentalism, and polished host work — from tech-campus events to waterfront weddings and winery weekends.",
      "Hire a magician in Seattle through Magicalive to find performers accustomed to Pacific Northwest venues, timelines, and the mix of intimate gatherings and larger corporate programs that define the region.",
    ],
    venueSpotlight: ["Waterfront venues", "Eastside corporate campuses", "Historic theaters"],
    relatedSlugs: ["los-angeles", "chicago", "las-vegas"],
  },
  {
    slug: "nashville",
    displayName: "Nashville",
    locationMatch: ["Nashville", "Franklin", "Music City"],
    venueCityMatch: ["Nashville"],
    heroSubtext:
      "Music City celebrations blend southern hospitality with label launches, tour parties, and brand experiences.",
    seoParagraphs: [
      "Nashville meetings and music-adjacent events call for performers who read a room quickly — from trade-show floors to private writer rounds upgraded with amazement moments.",
      "Magicalive helps talent buyers shortlist magicians who already route through Tennessee and understand load-ins on Broadway-adjacent venues as well as Franklin estates.",
      "Book acts who complement live bands without stepping on the headliner energy, and who can tailor material for industry guests and hometown families alike.",
    ],
    hireBookerParagraphs: [
      "Nashville pairs Music City energy with a fast-growing destination market for labels, brands, and private celebrations — magicians who work here know how to complement live music and keep a room engaged.",
      "Whether you are planning a corporate night, album-release party, or private estate event, hire a magician in Nashville on Magicalive to browse profiles, compare styles, and reach out with a structured booking request.",
    ],
    venueSpotlight: ["Broadway-adjacent rooms", "Franklin estates", "Label event spaces"],
    relatedSlugs: ["chicago", "new-york", "las-vegas"],
  },
  {
    slug: "hollywood",
    displayName: "Hollywood",
    locationMatch: ["Hollywood"],
    venueCityMatch: ["Los Angeles"],
    heroSubtext:
      "The heart of LA’s entertainment district — premieres, industry parties, and legacy magic rooms.",
    seoParagraphs: [
      "Hollywood remains shorthand for showbiz energy: wrap parties, influencer events, and tightly scheduled screenings where a magician must be camera-aware and guest-ready.",
      "On Magicalive you’ll find performers who routinely work hillside homes, boutique hotels, and private clubs from Beachwood to the Boulevard.",
      "Link your booking to venues synonymous with variety performance and after-hours hospitality — ideal when you want polish without losing the neighborhood’s cinematic edge.",
    ],
    hireBookerParagraphs: [
      "Hollywood sits at the center of LA’s entertainment district — premieres, launch parties, and private industry events that demand tight timing, discreet close-up, and stage-ready polish.",
      "Booking a magician in Hollywood means matching the energy of legacy magic rooms and modern hospitality spaces alike. Magicalive connects planners with verified talent for intimate lounges or full-scale private events.",
    ],
    venueSpotlight: ["Sunset hospitality venues", "Beachwood Canyon estates", "Historic screening rooms"],
    relatedSlugs: ["los-angeles", "las-vegas", "seattle"],
  },
];

export function getCityLandingDefinition(slug: string): CityLandingDefinition | undefined {
  return CITY_LANDING_PAGES.find((c) => c.slug === slug);
}

export function locationOrFilter(patterns: string[]): string {
  return patterns.map((p) => `location.ilike.%${p}%`).join(",");
}

export function venueCityOrFilter(patterns: string[]): string {
  return patterns.map((p) => `city.ilike.%${p}%`).join(",");
}
