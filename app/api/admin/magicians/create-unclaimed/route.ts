import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-server";

export const dynamic = "force-dynamic";

function slugHandle(name: string, suffix: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
  return `${base || "magician"}-${suffix.slice(0, 6)}`;
}

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
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }
  const rec = body as Record<string, unknown>;
  const displayName = typeof rec.display_name === "string" ? rec.display_name.trim() : "";
  const location = typeof rec.location === "string" ? rec.location.trim() : "";
  const tags = Array.isArray(rec.specialty_tags)
    ? (rec.specialty_tags as unknown[]).map((t) => String(t).trim()).filter(Boolean)
    : [];
  const shortBio = typeof rec.short_bio === "string" ? rec.short_bio.trim() : "";
  const instagram = typeof rec.instagram === "string" ? rec.instagram.trim() : "";
  const youtube = typeof rec.youtube === "string" ? rec.youtube.trim() : "";
  const tiktok = typeof rec.tiktok === "string" ? rec.tiktok.trim() : "";
  const website = typeof rec.website === "string" ? rec.website.trim() : "";

  if (!displayName) {
    return NextResponse.json({ ok: false, error: "Display name is required" }, { status: 400 });
  }

  const rand = Math.random().toString(36).slice(2, 11);
  const id = `unclaimed_${Date.now()}_${rand}`;
  const handle = slugHandle(displayName, rand);

  const row = {
    id,
    display_name: displayName,
    unclaimed_name: displayName,
    handle,
    location: location || null,
    specialty_tags: tags,
    short_bio: shortBio || null,
    full_bio: null,
    account_type: "magician",
    is_unclaimed: true,
    is_founding_member: false,
    instagram: instagram || null,
    youtube: youtube || null,
    tiktok: tiktok || null,
    website: website || null,
    email: null,
    credentials: [],
    available_for: null,
  };

  const { error } = await ctx.db.from("profiles").insert(row);
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id });
}
