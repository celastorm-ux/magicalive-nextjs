import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getClerkPrimaryEmail } from "@/lib/clerk-email";
import { sendMagicaliveEmail } from "@/lib/magicalive-resend";
import { createNotification } from "@/lib/notifications";
import { getRouteSupabase } from "@/lib/supabase-route";

export const dynamic = "force-dynamic";

const EVENT_TYPES = ["Corporate", "Private party", "Wedding", "Birthday", "Festival", "Other"] as const;
const BUDGET_RANGES = ["Under $500", "$500-$1000", "$1000-$2500", "$2500-$5000", "$5000+"] as const;

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
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

  if (!isRecord(body)) {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  const magicianId = typeof body.magician_id === "string" ? body.magician_id.trim() : "";
  const requesterName = typeof body.requester_name === "string" ? body.requester_name.trim() : "";
  const requesterEmail = typeof body.requester_email === "string" ? body.requester_email.trim() : "";
  const eventDate = typeof body.event_date === "string" ? body.event_date.trim() : "";
  const eventTypeRaw = typeof body.event_type === "string" ? body.event_type : "Corporate";
  const eventType = EVENT_TYPES.includes(eventTypeRaw as (typeof EVENT_TYPES)[number])
    ? eventTypeRaw
    : "Corporate";
  const eventTime = typeof body.event_time === "string" ? body.event_time.trim() || null : null;
  const eventLocation =
    typeof body.event_location === "string" ? body.event_location.trim() || null : null;
  const guestRaw = body.guest_count;
  const guestCount =
    guestRaw === null || guestRaw === undefined || guestRaw === ""
      ? null
      : Number(guestRaw);
  const budgetRaw = typeof body.budget_range === "string" ? body.budget_range : "$500-$1000";
  const budgetRange = BUDGET_RANGES.includes(budgetRaw as (typeof BUDGET_RANGES)[number])
    ? budgetRaw
    : "$500-$1000";
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (!magicianId || magicianId === userId) {
    return NextResponse.json({ ok: false, error: "Invalid magician" }, { status: 400 });
  }
  if (!requesterName || !requesterEmail || !message || !eventDate) {
    return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 });
  }
  if (!requesterEmail.includes("@")) {
    return NextResponse.json({ ok: false, error: "Invalid email" }, { status: 400 });
  }

  const db = await getRouteSupabase();

  const { error: insertError } = await db.from("booking_requests").insert({
    magician_id: magicianId,
    requester_id: userId,
    requester_name: requesterName,
    requester_email: requesterEmail,
    event_type: eventType,
    event_date: eventDate,
    event_time: eventTime,
    event_location: eventLocation,
    guest_count: guestCount !== null && Number.isFinite(guestCount) ? Math.max(0, Math.floor(guestCount)) : null,
    budget_range: budgetRange,
    message,
    status: "pending",
  });

  if (insertError) {
    return NextResponse.json(
      { ok: false, error: insertError.message || "Could not save request" },
      { status: 500 },
    );
  }

  const { data: requesterProfile } = await db
    .from("profiles")
    .select("avatar_url, display_name")
    .eq("id", userId)
    .maybeSingle();
  const reqAvatar = (requesterProfile as { avatar_url?: string | null } | null)?.avatar_url?.trim() || undefined;
  const reqDisplay =
    (requesterProfile as { display_name?: string | null } | null)?.display_name?.trim() || requesterName;
  const dateLabel = (() => {
    const d = new Date(eventDate);
    return Number.isNaN(d.getTime()) ? eventDate : d.toLocaleDateString(undefined, { dateStyle: "medium" });
  })();
  await createNotification(
    {
      recipientId: magicianId,
      senderId: userId,
      senderName: reqDisplay,
      senderAvatar: reqAvatar,
      type: "new_booking_request",
      message: `${reqDisplay} sent you a booking request for ${dateLabel}`,
      link: "/dashboard?tab=availability",
    },
    db,
  );

  const { data: countRow } = await db
    .from("profiles")
    .select("booking_requests_count")
    .eq("id", magicianId)
    .maybeSingle();
  const nextCount =
    Number((countRow as { booking_requests_count?: number } | null)?.booking_requests_count ?? 0) + 1;
  await db.from("profiles").update({ booking_requests_count: nextCount }).eq("id", magicianId);

  let magicianEmail = await getClerkPrimaryEmail(magicianId);
  if (!magicianEmail) {
    const { data: prof } = await db.from("profiles").select("email").eq("id", magicianId).maybeSingle();
    magicianEmail = (prof?.email as string | undefined)?.trim() || null;
  }

  if (magicianEmail) {
    await sendMagicaliveEmail("booking_request", magicianEmail, {
      requester_name: requesterName,
      requester_email: requesterEmail,
      event_date: eventDate,
      event_type: eventType,
      event_location: eventLocation,
      guest_count: guestCount !== null && Number.isFinite(guestCount) ? guestCount : null,
      budget_range: budgetRange,
      message,
    });
  }

  return NextResponse.json({ ok: true });
}
