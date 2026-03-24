/**
 * One-off: inserts three Magicalive Editorial articles as published.
 * Run from repo root: node scripts/seed-editorial-articles.mjs
 *
 * Requires in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY  (recommended — RLS often blocks anon inserts)
 * If service role is missing, falls back to NEXT_PUBLIC_SUPABASE_ANON_KEY (may fail under RLS).
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

function loadEnvLocal() {
  const p = resolve(process.cwd(), ".env.local");
  if (!existsSync(p)) return;
  const raw = readFileSync(p, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const key = serviceKey || anonKey;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or Supabase key in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const publishedAt = new Date().toISOString();

const article1Body = `## Why this list matters

Live magic does not happen in a vacuum. It happens in rooms — velvet seats, low light, the smell of old wood or a new PA. In 2026, the United States has never had a richer map of places built (or lovingly repurposed) for astonishment. Some venues are century-old landmarks; others opened their doors this year with budgets that would make a casino blush. Together they show where audiences are willing to travel, pay, and pay attention.

Below are ten stops that define the American magic map right now — not a ranking of “best tricks,” but of destinations where the whole experience — hospitality, design, scale, intimacy — is serious about the art.

## 1. The Magic Castle — Hollywood, California

Founded in 1963, The Magic Castle remains the most famous magic venue on earth. Tucked above Hollywood’s bustle like a secret handshake, this private club is the spiritual home of the Academy of Magical Arts. Members and their guests move through Victorian corridors decorated with posters and portraits of legends, then slip into small theaters where the close-up can be inches from your glass and the stage shows still feel homemade in the best way. You do not “stumble in” off the street — the Castle’s etiquette and dress code are part of the ritual — but once you are inside, you understand why generations of magicians treated a weeknight invitation like a pilgrimage.

## 2. The Hand and The Eye — Chicago, Illinois

Chicago’s newest landmark for illusion opened in 2026 inside the restored McCormick Mansion — and the numbers tell part of the story: roughly fifty million dollars aimed at making magic impossible to ignore. Billed as the world’s largest dedicated magic venue, it spreads across seven performance spaces, from rooms sized for parlor and close-up to theaters built for spectacle. Designer David Rockwell’s touch shows in the way light, texture, and sightlines flatter both performer and audience. For a city with a stubborn love of live entertainment, The Hand and The Eye is not a side room in a hotel — it is infrastructure.

## 3. Chicago Magic Lounge — Chicago, Illinois

Before the mansion megaproject, Andersonville already had a cult favorite. Since 2018 the Chicago Magic Lounge has operated as a cocktail bar where magic is the reason you came — not an afterthought between DJ sets. The line between dining room and showroom is deliberately soft; you order a drink, settle into a booth, and discover that the person beside you is quietly breaking every assumption you had about cards and coins. It is intimate, repeatable, and rooted in the neighborhood — the kind of place that trains an audience to expect excellence on a Wednesday.

## 4. 69 Atlantic — Brooklyn, New York

Inside Art of Play’s curiosity shop on Atlantic Avenue, an eighteen-seat theater has become one of the hardest tickets in the five boroughs. World-class close-up artists work inches from the front row; listings vanish in seconds. The room’s scale is almost absurdly small compared to the reputation it punches — which is exactly the point. This is magic as scarce object: few seats, high craft, zero tolerance for phone-light ambience. If you ever wondered whether Brooklyn still rewards bold programming, watch who flies in for a weekend just to sit in that eighteenth chair.

## 5. Black Rabbit Rose — Hollywood, California

Hollywood’s appetite for speakeasy glamour finds a sharp outlet at Black Rabbit Rose, where Thursday-through-Saturday bills mix magic with variety, cocktails, and Thai-Chinese bar bites. A dress code keeps the room photographic and intentional; the lineup keeps it unpredictable. It is not a museum of classics — it is a working club where contemporary acts meet audiences who still want a reason to leave the house at ten.

## 6. House of Cards — Nashville, Tennessee

Nashville hides more than music. House of Cards sits underground across roughly ten thousand square feet — a restaurant and magic venue that behaves like a single organism. Fine dining and roving magicians share the same air; national press has placed it among America’s most compelling dinner-theater hybrids. The lesson for travelers: high-end hospitality and close-up are no longer strangers — they can share a check, a wine list, and a sense of occasion.

## 7. Beacon Theatre — New York, New York

Not every magic story fits in twenty seats. The 1929 Beacon Theatre on Manhattan’s Upper West Side seats about 2,800 people under ornate plaster and gold — a palace built for scale. When a touring illusion show or theatrical magic production lands here, the architecture does half the persuasion: chandeliers, balconies, the sheer vertical drama of a room that remembers vaudeville’s peak. It is a reminder that “intimate” is not the only honest word in magic — sometimes wonder needs distance, height, and a thunderclap.

## 8. Neptune Theatre — Seattle, Washington

Since 1921 the Neptune has anchored Seattle’s University District as a neighborhood jewel — brick, modest marquee, and a room that still feels like you could know everyone in it. National acts pass through, but the vibe stays local: students, regulars, people who treat a Friday show as part of the rhythm of the city. Magic that plays the Neptune carries a little extra responsibility — the crowd has seen indie bands, comedians, and burlesque; they know the difference between polish and posturing.

## 9. Tannen’s Magic Studio — New York, New York

Tannen’s has been a New York institution since 1925 — long before “magic retail” meant glossy websites. The shop floor is crammed with props, books, and history, but the calendar matters too: lectures, workshops, and small gatherings that keep the community literate. For visitors, it is equal parts supply house and classroom; for locals, it is where you hear a named lecturer explain theory on a Tuesday night and walk out seeing card work differently on Wednesday.

## 10. NY Magic Center — New York, New York

Rounding out the map, NY Magic Center focuses mentalism workshops and close-up shows — a hub for audiences who want psychology-forward performance without losing theatrical craft. In a city overstuffed with entertainment options, a dedicated room for mind-reading and parlor mentalism helps maintain a pipeline of curious newcomers and serious students alike.

## The scene is thriving — and it is mappable

Dedicated rooms — tiny and colossal, historic and brand-new — are no longer anecdotes; they are a network. Whether you are planning a trip or researching your next night out, start with the directory of places that actually program magic on purpose. On Magicalive, you can browse venues by city and keep an eye on shows as they are announced: start at https://magicalive.com/venues and treat the map as living — because in 2026, it very much is.`;

const article2Body = `## Introduction

The magic industry did not “move online” in the sense of replacing theaters with feeds — but the first place a booker looks is still a glowing rectangle. In 2026, someone planning a corporate holiday party, a fundraising gala, or an intimate wedding is going to search names, scroll photos, read reviews, and only then send an email. Your digital presence is not a brochure; it is the audition that happens before you know you are auditioning. The performers filling calendars are not always the most technically gifted — they are the easiest to trust from a distance. This guide is about closing that gap.

## Your online presence

Start with the basics that still separate pros from hobbyists who “might be available.” You need clear, current photography — not a cropped stage shot from 2016 where the spotlight eats half your face. Video is non-negotiable: thirty seconds of you performing under real light convinces more than a paragraph of superlatives ever will. Reviews matter even when they feel unfair — one thoughtful testimonial with a full name and context beats a dozen adjectives you wrote yourself. Finally, plant your flag where bookers already look: maintain a professional profile on dedicated performer platforms. On Magicalive, a complete magician profile — specialties, location, clips, and availability signals — helps event organisers discover you in the same pass they use to compare venues and dates.

## Niche down

Generalists bill themselves into a corner. “Available for any event” reads as “I have not decided who I am for an audience yet.” Corporate clients want someone who understands NDAs, run-of-show discipline, and conservative material choices; wedding couples want warmth and pacing that flatters speeches and photos; family entertainers need chops with chaotic energy — each lane has different demos, different contract patterns, and different price floors. Pick the lane where your real-world experience is deepest, then speak only to that buyer in your headline reel and FAQs. Specialists get found by search intent; generalists compete on price.

## Corporate events are the highest value bookings

Galas, product launches, and executive offsites pay for reliability. Learn the language of event planners and PA networks — load-in windows, insurance riders, AV handoffs — before you quote. LinkedIn remains laughably underused by magicians: a calm, non-spammy presence with a crisp showreel link is a bat signal for corporate buyers trawling vendors on a Thursday afternoon. The silent killer, though, is follow-up. Most performers ghost after sending a PDF. A two-line note twelve hours later — confirming date flexibility or offering a five-minute call — closes deals that died in everyone else’s inbox.

## Get reviews from every show

Ask when the adrenaline is still working in your favor: before coats go on, before the green room clears. Make it frictionless — a direct link, a prefilled prompt (“What surprised you most?”), gratitude without desperation. One genuine review is worth more than paid placement because it mirrors how your next client already decides.

## Referrals are your best source of new business

Wedding photographers, florists, AV techs, and venue coordinators all sit closer to the budget than you do until the night of the show. Cultivate mutual respect, trade business cards without choreography, and when someone sends you a gig, thank them like it mattered — small gifts and prompt kickbacks (where ethically disclosed) keep the loop spinning.

## Your availability calendar

Invisible performers do not get rebooked — clients book fast when they can see open dates or at least a response SLA. Aim to answer serious inquiries within two hours during business days; the speed signals professionalism as loudly as your promo reel. If you cannot take a date, decline cleanly — ghosting burns bridges in small industries.

## Conclusion

None of this replaces stage time — but stage time without a discoverable, trustworthy footprint is a hobby with travel costs. Build the presence, tighten the niche, respect the follow-up, harvest reviews, feed referrals, and answer the inbox like it pays rent — because it does. When you are ready to be found by people who are already looking, create a free Magician profile on Magicalive so organizers and fans can connect the dots between your work and their date on the calendar.`;

const article3Body = `## Introduction

Something is shifting in magic — not only the cyclops-scale illusions that Vegas still loves, but a quieter, closer species of wonder. Audiences are leaning toward what happens at the table, in the round, with eye contact they cannot scroll past. Intimate magic is not a nostalgia act; in 2026 it feels strangely contemporary — tactile, conversational, a little dangerous.

## The 69 Atlantic effect

Brooklyn’s Art of Play is a shop built on beautiful objects; 69 Atlantic, the micro-theater tucked inside, is built on scarcity and nerve. Roughly eighteen seats. Shows that evaporate online in under a minute. Stories of ticket lotteries and flight itineraries from out of state no longer sound like hype — they sound like market proof. Much of the cultural lift traces to a stubborn idea championed by creators such as Dan and Dave Buck: magic deserves the same curatorial seriousness as wine, jazz, or design — and a venue can be a gallery where the art breathes.

## Why close-up magic works in 2026

Screens dominate attention, yet screen fatigue is the soft rebellion of the decade — people crave hand-to-hand reality they cannot algorithm away. Social media has made everyone a junior skeptic; video editing made miracles feel cheap. Close-up is different because it loans you the performer’s time, not a clip. The pandemic also recalibrated value: if you are going to leave home, the night had better feel irreplaceable. A ticket to a small room with a world-class technician meets that bar.

## The venue boom

Capital is noticing. Chicago’s Hand and The Eye — with Rockwell-led interiors and seven rooms — reads like the largest bet on permanent magic infrastructure in a generation. Los Angeles still stacks Black Rabbit Rose’s speakeasy energy against the old-guard gravity of the Magic Castle. Nashville’s House of Cards threads fine dining through roving mystery. The pattern: dedicated architecture, not borrowed ballrooms — proof that owners expect repeat audiences, not one-off novelty nights.

## The performers leading the charge

Today’s headline close-up artists behave like auteurs. Dani DaOrtiz turns probability into theatre — chaotic, funny, and uncompromisingly rigorous. Jason Ladanye’s card work lands with the precision of a forensic accountant who happens to be hilarious. Hektor Cardoso blends European salon traditions with contemporary rhythm; new fans discover him the same way they discover niche musicians — clip by clip, then a scramble for a live ticket. None of this is accidental; personalities are as legible as technique now.

## What this means for the magic community

More purpose-built rooms imply more working weeks for artists who used to patch income between corporate gigs and coffee-shop showcases. A growing audience means first-time fans who will eventually buy lectures, books, and the next ticket tier — a healthier ladder for everyone. Communities that share calendars, ethics, and critique (instead of hoarding gigs) will capture the upside first.

## Conclusion

If you perform, this is one of the best talent markets in years: venues that believe in magic and audiences willing to pay for proximity. If you love watching, you have permission to be greedy about live nights — the map is widening. Explore performers, cities, and show listings on Magicalive and treat what you find as a living index rather than a static list — intimate magic is not having “a moment” so much as finally taking the room it always deserved.`;

const rows = [
  {
    author_id: null,
    author_name: "Magicalive Editorial",
    title: "The 10 Best Magic Venues in the United States in 2026",
    excerpt:
      "From the legendary Magic Castle in Hollywood to the brand new Hand and the Eye in Chicago — these are the venues defining live magic in America right now.",
    body: article1Body.trim(),
    category: "News",
    read_time: 7,
    tags: ["venues", "live magic", "magic shows", "united states"],
    status: "published",
    published_at: publishedAt,
  },
  {
    author_id: null,
    author_name: "Magicalive Editorial",
    title: "How to Get More Bookings as a Magician in 2026: The Complete Guide",
    excerpt:
      "Whether you are just starting out or looking to fill your calendar with corporate events and private parties — here is exactly what works for working magicians in 2026.",
    body: article2Body.trim(),
    category: "Technique",
    read_time: 8,
    tags: ["bookings", "magician tips", "marketing", "career"],
    status: "published",
    published_at: publishedAt,
  },
  {
    author_id: null,
    author_name: "Magicalive Editorial",
    title: "The Rise of Close-Up Magic: Why Intimate Magic is Having a Moment",
    excerpt:
      "From sold-out shows at 69 Atlantic in Brooklyn to $50 million venue investments in Chicago — close-up magic is experiencing a golden age. Here is why.",
    body: article3Body.trim(),
    category: "Community",
    read_time: 6,
    tags: ["close-up magic", "magic culture", "trends", "community"],
    status: "published",
    published_at: publishedAt,
  },
];

const { data, error } = await supabase.from("articles").insert(rows).select("id, title");

if (error) {
  console.error("Insert failed:", error.message, error);
  process.exit(1);
}

console.log("Inserted", data?.length ?? 0, "articles:");
for (const r of data ?? []) {
  console.log(" -", r.id, r.title);
}
