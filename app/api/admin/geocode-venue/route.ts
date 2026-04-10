import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-server";

export const dynamic = "force-dynamic";

type NominatimHit = { lat?: string; lon?: string };

async function nominatimSearch(query: string): Promise<NominatimHit[] | null> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "PinnacleMagic/1.0 (pinnaclemagic.com)",
    },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as unknown;
  return Array.isArray(data) ? (data as NominatimHit[]) : null;
}

/** Server-side Nominatim lookup (browser cannot call Nominatim directly due to CORS). */
export async function POST(request: Request) {
  const ctx = await requireAdmin();
  if (!ctx) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }
  const rec = body as Record<string, unknown>;
  const name = typeof rec.name === "string" ? rec.name.trim() : "";
  const city = typeof rec.city === "string" ? rec.city.trim() : "";
  const state = typeof rec.state === "string" ? rec.state.trim() : "";
  const country = typeof rec.country === "string" ? rec.country.trim() : "";
  const full_address = typeof rec.full_address === "string" ? rec.full_address.trim() : "";

  const strategies = [
    `${name} ${city} ${state} ${country}`.trim(),
    full_address || null,
    `${name} ${city} ${state}`.trim(),
    `${city} ${state} ${country}`.trim(),
  ].filter((s): s is string => Boolean(s && s.length > 0));

  for (const q of strategies) {
    try {
      const data = await nominatimSearch(q);
      if (data && data.length > 0 && data[0]?.lat != null && data[0]?.lon != null) {
        const lat = parseFloat(String(data[0].lat));
        const lon = parseFloat(String(data[0].lon));
        if (Number.isFinite(lat) && Number.isFinite(lon)) {
          return NextResponse.json({ ok: true, lat, lon });
        }
      }
    } catch {
      // try next strategy
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  return NextResponse.json({ ok: false, error: "No coordinates found" });
}
