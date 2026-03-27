import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-server";

export const dynamic = "force-dynamic";
/** Allow long runs when hosting supports it (many venues × 1s rate limit). */
export const maxDuration = 300;

type NominatimHit = { lat?: string; lon?: string };

export async function POST() {
  const ctx = await requireAdmin();
  if (!ctx) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { data: venues, error } = await ctx.db
    .from("venues")
    .select("id, name, city, state, latitude, longitude")
    .or("latitude.is.null,longitude.is.null");

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const list = venues ?? [];
  let geocoded = 0;
  let failed = 0;

  for (let i = 0; i < list.length; i++) {
    const venue = list[i]!;
    const query = encodeURIComponent(`${venue.name ?? ""} ${venue.city ?? ""} ${venue.state ?? ""}`.trim());
    const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`;

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Magicalive/1.0 (magicalive.com)",
        },
      });

      if (!response.ok) {
        failed++;
      } else {
        const data = (await response.json()) as NominatimHit[];
        if (Array.isArray(data) && data.length > 0 && data[0]?.lat != null && data[0]?.lon != null) {
          const lat = parseFloat(data[0].lat!);
          const lon = parseFloat(data[0].lon!);
          if (Number.isFinite(lat) && Number.isFinite(lon)) {
            const { error: upErr } = await ctx.db
              .from("venues")
              .update({ latitude: lat, longitude: lon })
              .eq("id", venue.id);
            if (upErr) failed++;
            else geocoded++;
          } else {
            failed++;
          }
        } else {
          failed++;
        }
      }
    } catch {
      failed++;
    }

    if (i < list.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return NextResponse.json({
    success: true,
    geocoded,
    failed,
    total: list.length,
  });
}
