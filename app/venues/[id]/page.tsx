import Link from "next/link";
import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import { CLASSES } from "@/lib/constants";
import { siteBaseUrl } from "@/lib/pinnaclemagic-resend";
import { buildMetadata } from "@/lib/seo";
import { getVenueDetailBundle } from "@/lib/server/detail-pages";
import VenueDetailClient, { type MagicianCard, type ShowUpcoming, type VenueRow } from "./VenueDetailClient";

type PageParams = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { id } = await params;
  const bundle = await getVenueDetailBundle(id);
  const v = bundle?.venue as VenueRow | null | undefined;
  if (!v) {
    return buildMetadata({
      title: "Venue — PinnacleMagic",
      description: "Discover magic venues on PinnacleMagic.",
    });
  }
  const name = v.name?.trim() || "Venue";
  const city = v.city?.trim() || "City";
  const capacity = v.capacity != null ? `${v.capacity}` : "Unknown";
  const excerpt = (v.description || "").slice(0, 120) || "Magic venue";
  return buildMetadata({
    title: `${name} — PinnacleMagic Venues`,
    description: `${excerpt} | ${city} | ${capacity} capacity`,
  });
}

export default async function VenueDetailPage({ params }: { params: PageParams }) {
  const { id } = await params;
  const bundle = await getVenueDetailBundle(id);

  if (!bundle?.venue) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black px-6 text-center text-zinc-400">
        <p>Venue not found.</p>
        <Link href="/venues" className={CLASSES.btnPrimarySm}>
          Back to venues
        </Link>
      </div>
    );
  }

  const venue = bundle.venue as VenueRow;
  const base = siteBaseUrl();

  /* Venue + upcoming shows: getVenueDetailBundle (lib/server/detail-pages.ts) using
     @/lib/supabase — upcoming merges shows by venue_id and by ilike(venue_name, venue.name). */

  const street = venue.address?.trim() || venue.full_address?.trim() || undefined;

  const localBusiness = {
    "@context": "https://schema.org",
    "@type": "EntertainmentBusiness",
    name: venue.name,
    description: venue.description?.trim() || undefined,
    address: {
      "@type": "PostalAddress",
      addressLocality: venue.city || undefined,
      addressRegion: venue.state || undefined,
      streetAddress: street,
    },
    url: `${base}/venues/${venue.id}`,
  };

  return (
    <>
      <JsonLd data={localBusiness} />
      <VenueDetailClient
        venue={venue}
        upcomingShows={bundle.upcomingShows as ShowUpcoming[]}
        pastCount={bundle.pastCount}
        totalShows={bundle.totalShows}
        magicians={bundle.magicians as MagicianCard[]}
      />
    </>
  );
}
