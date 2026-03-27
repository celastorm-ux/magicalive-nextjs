import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-server";

export const dynamic = "force-dynamic";
/** Allow long runs when hosting supports it (many venues × 1s rate limit). */
export const maxDuration = 300;

type NominatimHit = { lat?: string; lon?: string };

type VenueGeoRow = {
  id: string;
  name: string | null;
  city: string | null;
  state: string | null;
  address: string | null;
};

async function nominatimSearch(query: string): Promise<NominatimHit[] | null> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Magicalive/1.0 (magicalive.com)",
    },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as unknown;
  return Array.isArray(data) ? (data as NominatimHit[]) : null;
}

export async function POST() {
  const ctx = await requireAdmin();
  if (!ctx) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { data: venues, error } = await ctx.db
    .from("venues")
    .select("id, name, city, state, address, latitude, longitude")
    .or("latitude.is.null,longitude.is.null");

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const list = (venues ?? []) as VenueGeoRow[];
  let geocoded = 0;
  let failed = 0;

  for (const venue of list) {
    const strategies = [
      `${venue.name ?? ""} ${venue.city ?? ""} ${venue.state ?? ""} USA`.trim(),
      `${venue.name ?? ""} ${venue.city ?? ""}`.trim(),
      venue.address?.trim() || null,
      `${venue.city ?? ""} ${venue.state ?? ""} USA`.trim(),
    ].filter(Boolean) as string[];

    let coords: { lat: number; lon: number } | null = null;

    for (const query of strategies) {
      try {
        const data = await nominatimSearch(query);
        if (data && data.length > 0 && data[0]?.lat != null && data[0]?.lon != null) {
          const lat = parseFloat(data[0].lat!);
          const lon = parseFloat(data[0].lon!);
          if (Number.isFinite(lat) && Number.isFinite(lon)) {
            coords = { lat, lon };
            console.log(`Found ${venue.name ?? venue.id} using query: ${query}`);
            break;
          }
        }
      } catch {
        // try next strategy
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    if (coords) {
      const { error: upErr } = await ctx.db
        .from("venues")
        .update({ latitude: coords.lat, longitude: coords.lon })
        .eq("id", venue.id);
      if (upErr) {
        console.error(`Geocode update failed for ${venue.id}:`, upErr.message);
        failed++;
      } else {
        geocoded++;
      }
    } else {
      console.log(`Could not find coordinates for: ${venue.name ?? venue.id}`);
      failed++;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return NextResponse.json({
    success: true,
    geocoded,
    failed,
    total: list.length,
  });
}
