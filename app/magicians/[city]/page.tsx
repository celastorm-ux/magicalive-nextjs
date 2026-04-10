import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  CITY_LANDING_PAGES,
  getCityLandingDefinition,
  locationOrFilter,
  venueCityOrFilter,
} from "@/lib/city-landing";
import { buildMetadata } from "@/lib/seo";
import { siteBaseUrl } from "@/lib/pinnaclemagic-resend";
import { getRouteSupabase } from "@/lib/supabase-route";
import { formatLastSeen } from "@/lib/utils";
import JsonLd from "@/components/JsonLd";
import CityMagiciansClient, { type CityMagicianCard } from "../CityMagiciansClient";

const CARD_GRADIENTS = [
  "from-violet-950 via-purple-900/90 to-indigo-950",
  "from-indigo-950 via-slate-900 to-zinc-950",
  "from-blue-950 via-cyan-950/80 to-slate-950",
  "from-teal-950 via-emerald-950/70 to-black",
  "from-rose-950 via-red-950/80 to-zinc-950",
  "from-amber-950 via-yellow-950/50 to-stone-950",
] as const;

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

type PageParams = Promise<{ city: string }>;

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { city: rawSlug } = await params;
  const def = getCityLandingDefinition(decodeURIComponent(rawSlug));
  if (!def) {
    return buildMetadata({
      title: "Magicians by city — PinnacleMagic",
      description: "Discover professional magicians by city on PinnacleMagic.",
    });
  }
  const db = await getRouteSupabase();
  const { count } = await db
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("account_type", "magician")
    .or(locationOrFilter(def.locationMatch));
  const n = count ?? 0;
  return buildMetadata({
    title: `Magicians in ${def.displayName} — PinnacleMagic`,
    description: `Discover ${n} professional magicians in ${def.displayName}. Browse profiles, upcoming shows, and book performers for your next event.`,
  });
}

export async function generateStaticParams() {
  return CITY_LANDING_PAGES.map((c) => ({ city: c.slug }));
}

export default async function CityMagiciansPage({ params }: { params: PageParams }) {
  const { city: rawSlug } = await params;
  const citySlug = decodeURIComponent(rawSlug);

  const def = getCityLandingDefinition(citySlug);
  if (!def) notFound();

  const db = await getRouteSupabase();

  const { data: rows, error } = await db
    .from("profiles")
    .select(
      "id, display_name, location, specialty_tags, available_for, rating, review_count, avatar_url, is_online, last_seen, is_founding_member",
    )
    .eq("account_type", "magician")
    .or(locationOrFilter(def.locationMatch))
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-zinc-500">
        Could not load magicians.
      </div>
    );
  }

  const magicians: CityMagicianCard[] = (rows ?? []).map((row) => {
    const id = String(row.id);
    const h = hashId(id);
    const tags = (row.specialty_tags as string[]) ?? [];
    const avail = (row.available_for as string | null) ?? null;
    const isOnline = Boolean(row.is_online);
    const lastSeenRaw = (row.last_seen as string | null) ?? null;
    const lastSeenLabel = isOnline ? "Online now" : lastSeenRaw ? formatLastSeen(lastSeenRaw) : "Never active";
    return {
      id,
      name: (row.display_name as string)?.trim() || "Magician",
      location: (row.location as string)?.trim() || "—",
      avatarUrl: (row.avatar_url as string | null) ?? null,
      tags: tags.length ? tags.slice(0, 6) : ["Performer"],
      styleKeys: tags,
      bookings: avail ? [avail] : [],
      rating: Number(row.rating ?? 0),
      reviews: Number(row.review_count ?? 0),
      onlineNow: isOnline,
      lastSeenLabel,
      gradient: CARD_GRADIENTS[h % CARD_GRADIENTS.length]!,
      isFoundingMember: Boolean(row.is_founding_member),
    };
  });

  const { data: venueRows } = await db
    .from("venues")
    .select("id, name, city, state")
    .or("is_verified.is.null,is_verified.eq.true")
    .or(venueCityOrFilter(def.venueCityMatch))
    .limit(12);

  const venues = (venueRows ?? []) as Array<{ id: string; name: string; city: string | null; state: string | null }>;

  const base = siteBaseUrl();

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Magicians in ${def.displayName}`,
    url: `${base}/magicians/${def.slug}`,
    itemListElement: magicians.slice(0, 20).map((m, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Person",
        name: m.name,
        jobTitle: "Magician",
        url: `${base}/profile/magician?id=${encodeURIComponent(m.id)}`,
        image: m.avatarUrl ?? undefined,
        address: {
          "@type": "PostalAddress",
          addressLocality: m.location !== "—" ? m.location : def.displayName,
        },
      },
    })),
  };

  return (
    <>
      <JsonLd data={itemListSchema} />
      <CityMagiciansClient definition={def} magicians={magicians} venues={venues} />
    </>
  );
}
