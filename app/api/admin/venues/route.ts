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
    .select("id, name, city, venue_type, created_at, is_verified")
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
  const decision = rec.decision === "approve" || rec.decision === "reject" ? rec.decision : null;
  if (!venueId || !decision) {
    return NextResponse.json({ ok: false, error: "venueId and decision required" }, { status: 400 });
  }

  const is_verified = decision === "approve";
  const { error } = await ctx.db.from("venues").update({ is_verified }).eq("id", venueId);
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
