import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { generateFanHandle } from "@/lib/generate-fan-handle";
import { formatShowDateLongEnUS } from "@/lib/show-dates";
import { sendPinnacleMagicEmail, siteBaseUrl } from "@/lib/pinnaclemagic-resend";
import { parseTaggedPerformers, type TaggedPerformerStored } from "@/lib/tagged-performers";
import { getRouteSupabase } from "@/lib/supabase-route";

export const dynamic = "force-dynamic";

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
  const showId =
    body &&
    typeof body === "object" &&
    typeof (body as { showId?: string }).showId === "string"
      ? (body as { showId: string }).showId.trim()
      : "";
  if (!showId) {
    return NextResponse.json({ ok: false, error: "showId required" }, { status: 400 });
  }

  const db = await getRouteSupabase();
  const { data: show, error: showErr } = await db
    .from("shows")
    .select("id, magician_id, name, venue_name, city, state, date, tagged_performers")
    .eq("id", showId)
    .maybeSingle();

  if (showErr || !show) {
    return NextResponse.json({ ok: false, error: "Show not found" }, { status: 404 });
  }
  if (show.magician_id !== userId) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { data: posterRow } = await db
    .from("profiles")
    .select("display_name")
    .eq("id", userId)
    .maybeSingle();
  const posterName =
    (posterRow as { display_name?: string } | null)?.display_name?.trim() || "A magician";

  const tp = parseTaggedPerformers(show.tagged_performers);
  const next: TaggedPerformerStored[] = tp.map((x) => ({ ...x }));
  const venue =
    [show.venue_name, show.city, show.state].filter(Boolean).join(", ").trim() || "Venue TBA";
  const dateStr = formatShowDateLongEnUS(
    typeof show.date === "string" ? show.date : null,
  );
  const showName = String(show.name ?? "Show").trim();

  let changed = false;
  for (let i = 0; i < next.length; i++) {
    const e = next[i]!;
    if (e.status !== "invited" || !e.email?.trim()) continue;
    if (e.unclaimed_profile_id) continue;

    const unclaimedId = `unclaimed_${Date.now()}_${i}_${Math.floor(Math.random() * 1_000_000)}`;
    let handle = generateFanHandle(e.name);
    let inserted = false;
    for (let attempt = 0; attempt < 10; attempt++) {
      const { error: insErr } = await db.from("profiles").insert({
        id: unclaimedId,
        account_type: "magician",
        display_name: e.name.trim(),
        email: e.email.trim().toLowerCase(),
        is_unclaimed: true,
        handle,
      });
      if (!insErr) {
        inserted = true;
        break;
      }
      handle = generateFanHandle(`${e.name}${attempt}`);
    }
    if (!inserted) continue;

    const claimUrl = `${siteBaseUrl()}/claim-profile?id=${encodeURIComponent(unclaimedId)}`;
    const signInUrl = `${siteBaseUrl()}/sign-in`;

    await sendPinnacleMagicEmail("tagged_in_show_invite", e.email.trim().toLowerCase(), {
      invitee_name: e.name.trim(),
      poster_name: posterName,
      show_name: showName,
      venue,
      show_date: dateStr,
      claim_url: claimUrl,
      sign_in_url: signInUrl,
    });

    next[i] = { ...e, unclaimed_profile_id: unclaimedId };
    changed = true;
  }

  if (changed) {
    const { error: upErr } = await db
      .from("shows")
      .update({ tagged_performers: next })
      .eq("id", showId);
    if (upErr) {
      return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
