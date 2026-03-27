import { NextResponse } from "next/server";
import { emailVenueSubmitted, sendWithResend, siteBaseUrl } from "@/lib/magicalive-resend";
import { countryUsesStatePicker, stateValueForDatabase } from "@/lib/locations";
import { getRouteSupabase } from "@/lib/supabase-route";

export const dynamic = "force-dynamic";

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
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

  const name = str(body.name);
  const venueType = str(body.venueType);
  const country = str(body.country);
  const stateRaw = str(body.state);
  const city = str(body.city);
  const fullAddress = str(body.fullAddress);
  const capacityRaw = str(body.capacity);
  const yearRaw = str(body.establishedYear);
  const website = str(body.website);
  const phone = str(body.phone);
  const description = str(body.description);
  const submitterName = str(body.submitterName);
  const submitterEmail = str(body.submitterEmail);
  const submissionNotes = str(body.submissionNotes);

  if (!name || !venueType || !country || !city || !submitterName || !submitterEmail) {
    return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 });
  }
  if (!submitterEmail.includes("@")) {
    return NextResponse.json({ ok: false, error: "Invalid email" }, { status: 400 });
  }
  if (countryUsesStatePicker(country) && !stateRaw) {
    return NextResponse.json({ ok: false, error: "State is required for this country" }, { status: 400 });
  }

  const db = await getRouteSupabase();
  const capacity =
    capacityRaw === "" ? null : Number.parseInt(capacityRaw, 10);
  const establishedYear =
    yearRaw === "" ? null : Number.parseInt(yearRaw, 10);
  const capOk = capacity === null || (Number.isFinite(capacity) && capacity >= 0);
  const yearOk =
    establishedYear === null ||
    (Number.isFinite(establishedYear) &&
      establishedYear! >= 1600 &&
      establishedYear! <= new Date().getFullYear() + 1);
  if (!capOk || !yearOk) {
    return NextResponse.json({ ok: false, error: "Invalid capacity or year" }, { status: 400 });
  }

  const stateForDb = stateRaw ? stateValueForDatabase(country, stateRaw) : null;

  let websiteNorm = website;
  if (websiteNorm && !websiteNorm.startsWith("http")) {
    websiteNorm = `https://${websiteNorm}`;
  }

  const baseRow: Record<string, unknown> = {
    name,
    city,
    state: stateForDb || null,
    venue_type: venueType,
    full_address: fullAddress || null,
    capacity,
    established_year: establishedYear,
    website: websiteNorm || null,
    phone: phone || null,
    description: description || null,
    contact_email: submitterEmail,
    tags: ["public-submission"],
    is_verified: false,
  };

  const withSubmissionMeta = {
    ...baseRow,
    submitter_name: submitterName,
    submission_notes: submissionNotes || null,
  };

  let inserted = await db.from("venues").insert(withSubmissionMeta).select("id").single();

  if (inserted.error && /submitter_name|submission_notes|column/i.test(inserted.error.message)) {
    inserted = await db.from("venues").insert(baseRow).select("id").single();
  }

  if (inserted.error || !inserted.data?.id) {
    console.error("[submit-venue] insert:", inserted.error);
    return NextResponse.json(
      { ok: false, error: inserted.error?.message || "Could not save submission" },
      { status: 500 },
    );
  }

  const venueId = String(inserted.data.id);
  const adminUrl = `${siteBaseUrl()}/admin?tab=venues`;
  const built = emailVenueSubmitted({
    venue_name: name,
    venue_type: venueType,
    country,
    state: stateRaw || "—",
    city,
    full_address: fullAddress,
    capacity: capacityRaw,
    established_year: yearRaw,
    website: websiteNorm,
    phone,
    description,
    submitter_name: submitterName,
    submitter_email: submitterEmail,
    submission_notes: submissionNotes,
    venue_id: venueId,
    admin_url: adminUrl,
  });

  const sendResult = await sendWithResend({
    to: "hello@magicalive.com",
    replyTo: submitterEmail,
    subject: built.subject,
    html: built.html,
    from: built.from,
  });

  if (!sendResult.ok) {
    console.warn("[submit-venue] email:", sendResult.error);
  }

  return NextResponse.json({ ok: true, venueId });
}
