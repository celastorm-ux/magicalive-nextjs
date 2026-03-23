import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await requireAdmin();
  if (!ctx) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }
  const { data, error } = await ctx.db
    .from("profiles")
    .select("id, display_name, location, is_verified, account_type, updated_at, created_at, review_count")
    .eq("account_type", "magician")
    .order("display_name", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const rows = data ?? [];
  const ids = rows.map((r: { id: string }) => r.id);
  let showCounts: Record<string, number> = {};
  if (ids.length) {
    const { data: shows } = await ctx.db.from("shows").select("magician_id");
    for (const s of shows ?? []) {
      const mid = (s as { magician_id?: string }).magician_id;
      if (!mid) continue;
      showCounts[mid] = (showCounts[mid] ?? 0) + 1;
    }
  }

  const enriched = rows.map((r: Record<string, unknown>) => ({
    ...r,
    show_count: showCounts[String(r.id)] ?? 0,
  }));

  return NextResponse.json({ ok: true, magicians: enriched });
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
  const profileId = typeof rec.profileId === "string" ? rec.profileId.trim() : "";
  const isVerified = rec.is_verified === true || rec.is_verified === false ? rec.is_verified : null;
  if (!profileId || isVerified === null) {
    return NextResponse.json({ ok: false, error: "profileId and is_verified required" }, { status: 400 });
  }

  const { error } = await ctx.db.from("profiles").update({ is_verified: isVerified }).eq("id", profileId);
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
