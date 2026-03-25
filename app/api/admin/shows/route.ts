import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-server";

export const dynamic = "force-dynamic";

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
  const magicianId = typeof rec.magician_id === "string" ? rec.magician_id.trim() : "";
  const name = typeof rec.name === "string" ? rec.name.trim() : "";
  const date = typeof rec.date === "string" ? rec.date.trim() : "";
  const time = typeof rec.time === "string" ? rec.time.trim() : "";
  const venueName = typeof rec.venue_name === "string" ? rec.venue_name.trim() : "";
  const city = typeof rec.city === "string" ? rec.city.trim() : "";
  const state = typeof rec.state === "string" ? rec.state.trim() : "";
  const ticketUrl = typeof rec.ticket_url === "string" ? rec.ticket_url.trim() : "";
  const isPublic = rec.is_public === false ? false : true;
  const eventType = rec.event_type === "lecture" ? "lecture" : "show";
  const venueId = typeof rec.venue_id === "string" && rec.venue_id.trim() ? rec.venue_id.trim() : null;
  const isOnline = rec.is_online === true;
  const skillLevel = typeof rec.skill_level === "string" ? rec.skill_level.trim() : null;
  const maxAttendees = typeof rec.max_attendees === "number" ? rec.max_attendees : null;
  const includesWorkbook = rec.includes_workbook === true;
  const includesProps = rec.includes_props === true;

  if (!magicianId || !name || !date || !time) {
    return NextResponse.json({ ok: false, error: "magician_id, name, date, and time are required" }, { status: 400 });
  }

  if (eventType === "lecture" && isOnline) {
    if (!ticketUrl) {
      return NextResponse.json({ ok: false, error: "Meeting or registration link required for online lecture" }, { status: 400 });
    }
  } else {
    if (!city || !venueName) {
      return NextResponse.json({ ok: false, error: "City and venue name are required" }, { status: 400 });
    }
  }

  const normalizedDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : new Date(date).toISOString().slice(0, 10);

  const row = {
    magician_id: magicianId,
    name,
    date: normalizedDate,
    time,
    venue_name: eventType === "lecture" && isOnline ? "Online" : venueName,
    city: eventType === "lecture" && isOnline ? "" : city,
    state: eventType === "lecture" && isOnline ? null : state || null,
    venue_id: eventType === "lecture" && isOnline ? null : venueId,
    ticket_url: ticketUrl || null,
    is_public: isPublic,
    event_type: eventType,
    skill_level: eventType === "lecture" ? skillLevel || "All levels" : null,
    includes_workbook: eventType === "lecture" ? includesWorkbook : false,
    includes_props: eventType === "lecture" ? includesProps : false,
    max_attendees: eventType === "lecture" && maxAttendees != null ? maxAttendees : null,
    is_online: eventType === "lecture" ? isOnline : false,
    is_past: false,
  };

  const { error } = await ctx.db.from("shows").insert(row);
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
