import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createNotification } from "@/lib/notifications";
import { getClerkPrimaryEmail } from "@/lib/clerk-email";
import { getRouteSupabase } from "@/lib/supabase-route";
import { escapeHtml, sendWithResend, siteBaseUrl } from "@/lib/magicalive-resend";

export const dynamic = "force-dynamic";

const SUBJECT_LABELS: Record<string, string> = {
  general: "General enquiry",
  booking: "Booking question",
  collaboration: "Collaboration",
  press: "Press or media",
  other: "Other",
};

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

  const magicianId = typeof body.magician_id === "string" ? body.magician_id.trim() : "";
  const senderName = typeof body.sender_name === "string" ? body.sender_name.trim() : "";
  const senderEmail = typeof body.sender_email === "string" ? body.sender_email.trim() : "";
  const subjectKey = typeof body.subject_type === "string" ? body.subject_type.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (!magicianId) {
    return NextResponse.json({ ok: false, error: "Invalid magician" }, { status: 400 });
  }
  if (!senderName || !senderEmail || !senderEmail.includes("@")) {
    return NextResponse.json({ ok: false, error: "Valid name and email are required" }, { status: 400 });
  }
  if (!SUBJECT_LABELS[subjectKey]) {
    return NextResponse.json({ ok: false, error: "Invalid subject" }, { status: 400 });
  }
  if (message.length < 20) {
    return NextResponse.json({ ok: false, error: "Message must be at least 20 characters" }, { status: 400 });
  }

  const { userId: senderUserId } = await auth();

  const db = await getRouteSupabase();

  const { data: magician, error: magErr } = await db
    .from("profiles")
    .select("id, account_type, display_name, contact_email, email")
    .eq("id", magicianId)
    .maybeSingle();

  if (magErr || !magician) {
    return NextResponse.json({ ok: false, error: "Magician not found" }, { status: 404 });
  }
  if ((magician as { account_type?: string }).account_type !== "magician") {
    return NextResponse.json({ ok: false, error: "Invalid profile" }, { status: 400 });
  }

  const row = magician as {
    contact_email?: string | null;
    email?: string | null;
    display_name?: string | null;
  };
  const toEmail =
    row.contact_email?.trim() ||
    row.email?.trim() ||
    (await getClerkPrimaryEmail(magicianId));

  if (!toEmail || !toEmail.includes("@")) {
    return NextResponse.json(
      { ok: false, error: "This magician does not have a contact email on file yet." },
      { status: 400 },
    );
  }

  let profilePath: string | null = null;
  if (senderUserId) {
    const { data: senderProf } = await db
      .from("profiles")
      .select("account_type")
      .eq("id", senderUserId)
      .maybeSingle();
    const at = (senderProf as { account_type?: string } | null)?.account_type;
    if (at === "magician") profilePath = `/profile/magician?id=${encodeURIComponent(senderUserId)}`;
    else if (at === "fan") profilePath = `/profile/fan?id=${encodeURIComponent(senderUserId)}`;
    else profilePath = `/profile`;
  }

  const base = siteBaseUrl();
  const subjectLabel = SUBJECT_LABELS[subjectKey]!;
  const emailSubject = `${subjectLabel} from ${senderName} — reply to this email to respond`;

  const profileBlock = profilePath
    ? `<p style="margin:16px 0 0;font-family:system-ui,sans-serif;font-size:14px;color:#a1a1aa;">Sender profile: <a href="${escapeHtml(base + profilePath)}" style="color:#c9a84c;">${escapeHtml(base + profilePath)}</a></p>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8" /></head>
<body style="margin:0;padding:24px;background:#0d0b0e;font-family:system-ui,sans-serif;color:#e4e4e7;">
  <p style="margin:0 0 20px;font-size:14px;line-height:1.65;color:#e4e4e7;">Someone contacted you through Magicalive.<br />Reply directly to this email to respond to them.</p>
  <p style="margin:0 0 12px;font-size:15px;line-height:1.6;"><strong>From:</strong> ${escapeHtml(senderName)} &lt;${escapeHtml(senderEmail)}&gt;</p>
  <p style="margin:0 0 8px;font-size:13px;color:#a1a1aa;"><strong>Topic:</strong> ${escapeHtml(subjectLabel)}</p>
  <div style="margin:20px 0;padding:16px;border-radius:12px;background:rgba(255,255,255,0.04);border:1px solid rgba(201,168,76,0.15);">
    <p style="margin:0;font-size:15px;line-height:1.65;white-space:pre-wrap;">${escapeHtml(message).replace(/\n/g, "<br/>")}</p>
  </div>
  ${profileBlock}
  <p style="margin:24px 0 0;font-size:13px;color:#71717a;">Reply directly to this email to respond.</p>
</body></html>`;

  const sendResult = await sendWithResend({
    to: toEmail,
    subject: emailSubject,
    html,
    from: "Magicalive <hello@magicalive.com>",
    replyTo: senderEmail,
  });

  if (!sendResult.ok) {
    return NextResponse.json({ ok: false, error: sendResult.error }, { status: 502 });
  }

  let senderAvatar: string | undefined;
  if (senderUserId) {
    const { data: av } = await db.from("profiles").select("avatar_url").eq("id", senderUserId).maybeSingle();
    senderAvatar = (av as { avatar_url?: string | null } | null)?.avatar_url?.trim() || undefined;
  }

  await createNotification(
    {
      recipientId: magicianId,
      senderId: senderUserId ?? undefined,
      senderName,
      senderAvatar,
      type: "new_message",
      message: `${senderName} sent you a message via email — check your inbox to reply`,
      link: "/notifications",
    },
    db,
  );

  return NextResponse.json({ ok: true });
}
