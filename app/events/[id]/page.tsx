import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import { siteBaseUrl } from "@/lib/magicalive-resend";
import { buildMetadata } from "@/lib/seo";
import { getEventDetailBundle } from "@/lib/server/detail-pages";
import { formatShowDateLongEnUS } from "@/lib/show-dates";
import { supabase } from "@/lib/supabase";
import EventDetailClient, { type ReviewItem, type ShowWithMagician } from "./EventDetailClient";

type PageParams = Promise<{ id: string }>;

function normalizeProfilesProf(data: unknown): { display_name?: string | null } | null {
  if (data == null) return null;
  if (Array.isArray(data)) return (data[0] as { display_name?: string | null }) ?? null;
  return data as { display_name?: string | null };
}

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { id } = await params;
  const bundle = await getEventDetailBundle(id);
  const ev = bundle?.event as ShowWithMagician | null | undefined;
  if (!ev) {
    return buildMetadata({
      title: "Event — Magicalive",
      description: "Discover live magic shows on Magicalive.",
    });
  }
  const showName = ev.name?.trim() || "Event";
  const venue = ev.venue_name?.trim() || "Venue";
  const city = ev.city?.trim() || "City";
  const date = ev.date ? formatShowDateLongEnUS(ev.date) : "TBA";
  const prof = normalizeProfilesProf(ev.profiles as unknown);
  const magicianName = prof?.display_name || "a magician";
  const cancelled = Boolean((ev as { is_cancelled?: boolean | null }).is_cancelled);
  const base = buildMetadata({
    title: `${showName} — Magicalive Events${cancelled ? " (Cancelled)" : ""}`,
    description: `${showName} at ${venue} in ${city} on ${date}${cancelled ? " — This event has been cancelled." : ""}`,
  });
  return {
    ...base,
    openGraph: {
      title: showName,
      description: `See ${magicianName} perform at ${venue} on ${date}`,
      type: "website",
      images: ["/og-default.png"],
    },
  };
}

function eventStartIso(date: string | null, time: string | null | undefined): string | undefined {
  if (!date) return undefined;
  const t = (time || "20:00").slice(0, 5);
  const d = new Date(`${date}T${t}:00`);
  if (Number.isNaN(d.getTime())) return date;
  return d.toISOString();
}

export default async function EventDetailPage({ params }: { params: PageParams }) {
  const { id } = await params;
  const bundle = await getEventDetailBundle(id);

  if (!bundle?.event) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-zinc-400">
        Event not found
      </div>
    );
  }

  const ev = bundle.event as ShowWithMagician;
  const base = siteBaseUrl();
  const ticketUrl = ev.ticket_url?.trim() || undefined;
  const performerName = ev.profiles?.display_name?.trim() || "Magician";

  let venuePageId: string | null = ev.venue_id?.trim() || null;
  const venueLabel = ev.venue_name?.trim() || "";
  if (!venuePageId && venueLabel && venueLabel.toLowerCase() !== "online") {
    const tn = venueLabel;
    const { data: exact } = await supabase
      .from("venues")
      .select("id")
      .eq("is_verified", true)
      .ilike("name", tn)
      .limit(1)
      .maybeSingle();
    if (exact && typeof (exact as { id: unknown }).id === "string") {
      venuePageId = (exact as { id: string }).id;
    } else {
      const { data: fuzzy } = await supabase
        .from("venues")
        .select("id")
        .eq("is_verified", true)
        .ilike("name", `%${tn}%`)
        .limit(1)
        .maybeSingle();
      if (fuzzy && typeof (fuzzy as { id: unknown }).id === "string") {
        venuePageId = (fuzzy as { id: string }).id;
      }
    }
  }

  const eventSchema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: ev.name,
    startDate: eventStartIso(ev.date, ev.time),
    location: {
      "@type": "Place",
      name: ev.venue_name || "Venue",
      address: [ev.city, ev.state].filter(Boolean).join(", ") || undefined,
    },
    performer: {
      "@type": "Person",
      name: performerName,
    },
    url: ticketUrl || `${base}/events/${ev.id}`,
  };
  if (ticketUrl) {
    eventSchema.offers = {
      "@type": "Offer",
      url: ticketUrl,
      availability: "https://schema.org/InStock",
    };
  }

  return (
    <>
      <JsonLd data={eventSchema} />
      <EventDetailClient
        event={ev}
        venuePageId={venuePageId}
        moreByMagician={bundle.moreByMagician as ShowWithMagician[]}
        youMightLike={bundle.youMightLike as ShowWithMagician[]}
        reviews={bundle.reviews as ReviewItem[]}
      />
    </>
  );
}
