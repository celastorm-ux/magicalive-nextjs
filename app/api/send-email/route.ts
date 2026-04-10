import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getClerkDisplayName, getClerkPrimaryEmail } from "@/lib/clerk-email";
import {
  sendPinnacleMagicEmail,
  siteBaseUrl,
  type PinnacleMagicEmailType,
} from "@/lib/pinnaclemagic-resend";
import { getRouteSupabase } from "@/lib/supabase-route";

export const dynamic = "force-dynamic";

const EMAIL_TYPES: PinnacleMagicEmailType[] = [
  "booking_request",
  "booking_accepted",
  "booking_declined",
  "new_follower",
  "new_review",
  "article_submitted",
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (!isRecord(body)) {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  const type = body.type as string;
  const data = isRecord(body.data) ? body.data : {};
  const clientTo = typeof body.to === "string" ? body.to.trim() : "";

  if (!EMAIL_TYPES.includes(type as PinnacleMagicEmailType)) {
    return NextResponse.json({ ok: false, error: "Invalid type" }, { status: 400 });
  }

  const internalHeader = request.headers.get("x-pinnaclemagic-internal-email-secret");
  const internalOk =
    Boolean(process.env.PINNACLEMAGIC_INTERNAL_EMAIL_SECRET) &&
    internalHeader === process.env.PINNACLEMAGIC_INTERNAL_EMAIL_SECRET;

  /** booking_request: only trusted internal callers (or misconfigured open — require secret). */
  if (type === "booking_request") {
    if (!internalOk) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
    if (!clientTo || !clientTo.includes("@")) {
      return NextResponse.json({ ok: false, error: "Invalid recipient" }, { status: 400 });
    }
    const result = await sendPinnacleMagicEmail("booking_request", clientTo, data);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const db = await getRouteSupabase();

  if (type === "booking_accepted" || type === "booking_declined") {
    const bookingId = typeof data.booking_id === "string" ? data.booking_id : "";
    if (!bookingId) {
      return NextResponse.json({ ok: false, error: "booking_id required" }, { status: 400 });
    }

    const { data: row, error } = await db
      .from("booking_requests")
      .select("*")
      .eq("id", bookingId)
      .eq("magician_id", userId)
      .maybeSingle();

    if (error || !row) {
      return NextResponse.json({ ok: false, error: "Booking not found" }, { status: 404 });
    }

    const requesterEmail =
      (typeof row.requester_email === "string" && row.requester_email.includes("@")
        ? row.requester_email
        : null) || (await getClerkPrimaryEmail(String(row.requester_id)));

    if (!requesterEmail) {
      return NextResponse.json({ ok: false, error: "No requester email" }, { status: 400 });
    }

    const magicianName = await getClerkDisplayName(userId);

    if (type === "booking_accepted") {
      const sendResult = await sendPinnacleMagicEmail("booking_accepted", requesterEmail, {
        magician_name: magicianName,
        magician_email: (await getClerkPrimaryEmail(userId)) || "",
        event_date: String(row.event_date ?? ""),
        event_type: row.event_type,
        event_location: row.event_location,
        guest_count: row.guest_count,
        budget_range: row.budget_range,
      });
      if (!sendResult.ok) {
        return NextResponse.json({ ok: false, error: sendResult.error }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    let reply_message: string | null =
      typeof row.reply_message === "string" && row.reply_message.trim()
        ? row.reply_message.trim()
        : null;
    if (typeof data.reply_message === "string" && data.reply_message.trim()) {
      reply_message = data.reply_message.trim();
    }
    const sendResult = await sendPinnacleMagicEmail("booking_declined", requesterEmail, {
      magician_name: magicianName,
      reply_message: reply_message ?? null,
    });
    if (!sendResult.ok) {
      return NextResponse.json({ ok: false, error: sendResult.error }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  if (type === "new_follower") {
    const followerId = typeof data.follower_id === "string" ? data.follower_id : "";
    const followingId = typeof data.following_id === "string" ? data.following_id : "";
    if (followerId !== userId || !followingId) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const { data: prefs } = await db
      .from("profiles")
      .select("email_new_followers")
      .eq("id", followingId)
      .maybeSingle();

    if (prefs && prefs.email_new_followers === false) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const magicianEmail =
      (await getClerkPrimaryEmail(followingId)) ||
      ((
        await db.from("profiles").select("email").eq("id", followingId).maybeSingle()
      ).data?.email as string | null)?.trim() ||
      null;

    if (!magicianEmail) {
      return NextResponse.json({ ok: false, error: "Could not resolve magician email" }, { status: 400 });
    }

    const fanName =
      typeof data.fan_name === "string" && data.fan_name.trim()
        ? data.fan_name.trim()
        : (await getClerkDisplayName(followerId));

    const followerCount =
      typeof data.follower_count === "number" && Number.isFinite(data.follower_count)
        ? Math.max(0, Math.floor(data.follower_count))
        : 0;

    const fanProfileUrl =
      typeof data.fan_profile_url === "string" && data.fan_profile_url.startsWith("http")
        ? data.fan_profile_url
        : `${siteBaseUrl()}/profile/fan?id=${encodeURIComponent(followerId)}`;

    const sendResult = await sendPinnacleMagicEmail("new_follower", magicianEmail, {
      fan_name: fanName,
      fan_profile_url: fanProfileUrl,
      follower_count: followerCount,
    });
    if (!sendResult.ok) {
      return NextResponse.json({ ok: false, error: sendResult.error }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  if (type === "new_review") {
    const reviewerId = typeof data.reviewer_id === "string" ? data.reviewer_id : "";
    const magicianId = typeof data.magician_id === "string" ? data.magician_id : "";
    if (reviewerId !== userId || !magicianId) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const { data: prefs } = await db
      .from("profiles")
      .select("email_new_reviews")
      .eq("id", magicianId)
      .maybeSingle();

    if (prefs && prefs.email_new_reviews === false) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const magicianEmail =
      (await getClerkPrimaryEmail(magicianId)) ||
      ((
        await db.from("profiles").select("email").eq("id", magicianId).maybeSingle()
      ).data?.email as string | null)?.trim() ||
      null;

    if (!magicianEmail) {
      return NextResponse.json({ ok: false, error: "Could not resolve magician email" }, { status: 400 });
    }

    const rating = typeof data.rating === "number" ? data.rating : Number(data.rating);
    const reviewerName =
      typeof data.reviewer_name === "string" && data.reviewer_name.trim()
        ? data.reviewer_name.trim()
        : (await getClerkDisplayName(reviewerId));
    const reviewBody = typeof data.body === "string" ? data.body : "";
    const showAttended =
      typeof data.show_attended === "string" ? data.show_attended : null;

    const profileUrl = `${siteBaseUrl()}/profile/magician?id=${encodeURIComponent(magicianId)}`;

    const sendResult = await sendPinnacleMagicEmail("new_review", magicianEmail, {
      reviewer_name: reviewerName,
      rating,
      body: reviewBody,
      show_attended: showAttended,
      profile_url: profileUrl,
    });
    if (!sendResult.ok) {
      return NextResponse.json({ ok: false, error: sendResult.error }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  if (type === "article_submitted") {
    const authorId = typeof data.author_id === "string" ? data.author_id : "";
    if (!authorId || authorId !== userId) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
    const articleTitle =
      typeof data.article_title === "string" ? data.article_title.trim() : "";
    const authorName =
      typeof data.author_name === "string" && data.author_name.trim()
        ? data.author_name.trim()
        : "PinnacleMagic writer";
    if (!articleTitle) {
      return NextResponse.json({ ok: false, error: "article_title required" }, { status: 400 });
    }
    const category =
      typeof data.category === "string" && data.category.trim() ? data.category.trim() : "";
    const excerpt =
      typeof data.excerpt === "string" && data.excerpt.trim() ? data.excerpt.trim() : "";
    const sendResult = await sendPinnacleMagicEmail("article_submitted", "hello@pinnaclemagic.com", {
      article_title: articleTitle,
      author_name: authorName,
      author_id: authorId,
      category,
      excerpt,
    });
    if (!sendResult.ok) {
      return NextResponse.json({ ok: false, error: sendResult.error }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: "Unsupported" }, { status: 400 });
}
