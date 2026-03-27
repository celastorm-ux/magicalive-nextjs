import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await requireAdmin();
  if (!ctx) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }
  const { data, error } = await ctx.db
    .from("venues")
    .select(
      "id, name, city, state, country, venue_type, full_address, capacity, website, description, submitter_name, submitter_email, contact_email, created_at, is_verified, latitude, longitude",
    )
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, venues: data ?? [] });
}

export async function PATCH(request: Request) {
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
  const venueId = typeof rec.venueId === "string" ? rec.venueId.trim() : "";

  if (venueId && rec.latitude !== undefined && rec.longitude !== undefined) {
    const lat =
      typeof rec.latitude === "number" ? rec.latitude : parseFloat(String(rec.latitude));
    const lng =
      typeof rec.longitude === "number" ? rec.longitude : parseFloat(String(rec.longitude));
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ ok: false, error: "Invalid latitude or longitude" }, { status: 400 });
    }
    const { error } = await ctx.db
      .from("venues")
      .update({ latitude: lat, longitude: lng })
      .eq("id", venueId);
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  const decision = rec.decision === "approve" || rec.decision === "reject" ? rec.decision : null;
  if (!venueId || !decision) {
    return NextResponse.json({ ok: false, error: "venueId and decision required" }, { status: 400 });
  }

  if (decision === "approve") {
    const { error } = await ctx.db.from("venues").update({ is_verified: true }).eq("id", venueId);
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  const { data: vrow } = await ctx.db.from("venues").select("is_verified").eq("id", venueId).maybeSingle();
  if (vrow?.is_verified !== false) {
    return NextResponse.json(
      { ok: false, error: "Only pending submissions (is_verified = false) can be rejected" },
      { status: 400 },
    );
  }

  const { error: delErr } = await ctx.db.from("venues").delete().eq("id", venueId);
  if (delErr) {
    return NextResponse.json({ ok: false, error: delErr.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
