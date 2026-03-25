import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { claimUnclaimedProfile } from "@/lib/claim-unclaimed-profile";
import { getRouteSupabase } from "@/lib/supabase-route";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id")?.trim() ?? "";
  if (!id) {
    return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
  }
  const db = await getRouteSupabase();
  const { data, error } = await db
    .from("profiles")
    .select("id, display_name, location, specialty_tags, is_unclaimed, account_type")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  if (!data || (data as { account_type?: string }).account_type !== "magician") {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  if (!(data as { is_unclaimed?: boolean }).is_unclaimed) {
    return NextResponse.json({ ok: false, error: "Profile is not claimable" }, { status: 400 });
  }
  return NextResponse.json({ ok: true, profile: data });
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
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
  const rawProfileId = rec.profileId;
  const profileId = typeof rawProfileId === "string" ? rawProfileId.trim() : "";
  if (!profileId) {
    return NextResponse.json({ ok: false, error: "profileId required" }, { status: 400 });
  }

  const user = await currentUser();
  const email =
    user?.primaryEmailAddress?.emailAddress?.trim() ||
    user?.emailAddresses?.[0]?.emailAddress?.trim() ||
    null;

  const db = await getRouteSupabase();
  const result = await claimUnclaimedProfile(db, profileId, userId, email);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
