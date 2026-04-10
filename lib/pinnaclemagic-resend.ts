import { Resend } from "resend";

const BG = "#0d0b0e";
const GOLD = "#c9a84c";
const TEXT = "#e4e4e7";
const MUTED = "#a1a1aa";

export type PinnacleMagicEmailType =
  | "booking_request"
  | "booking_accepted"
  | "booking_declined"
  | "new_follower"
  | "new_review"
  | "article_submitted"
  | "venue_submitted"
  | "founding_member_welcome"
  | "magician_invite"
  | "tagged_in_show_invite"
  | "new_article_published";

export function siteBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    "https://pinnaclemagic.com"
  );
}

export function escapeHtml(s: string | null | undefined): string {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatEventDate(iso: string | null | undefined): string {
  if (!iso?.trim()) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return escapeHtml(iso);
  return escapeHtml(
    d.toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
  );
}

function logoBlock(): string {
  return `
  <tr>
    <td align="center" style="padding:28px 20px 8px;">
      <span style="font-family:Georgia,'Cormorant Garamond','Times New Roman',serif;font-size:28px;font-weight:600;letter-spacing:0.12em;color:${GOLD};">PINNACLEMAGIC</span>
    </td>
  </tr>`;
}

function footerNote(): string {
  const settingsUrl = `${siteBaseUrl()}/dashboard`;
  return `
  <tr>
    <td style="padding:32px 24px 28px;">
      <p style="margin:0;font-family:system-ui,-apple-system,sans-serif;font-size:12px;line-height:1.6;color:${MUTED};text-align:center;">
        You're receiving this email because of activity on PinnacleMagic.
        <a href="${escapeHtml(settingsUrl)}" style="color:${GOLD};text-decoration:underline;">Manage notification preferences</a> in your dashboard.
        <br /><br />
        <span style="color:#71717a;">To stop these emails, adjust your settings — we don't offer a one-click unsubscribe for transactional notices.</span>
      </p>
    </td>
  </tr>`;
}

function button(href: string, label: string): string {
  return `
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:28px auto;">
    <tr>
      <td style="border-radius:10px;background:${GOLD};">
        <a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer"
          style="display:inline-block;padding:14px 32px;font-family:system-ui,-apple-system,sans-serif;font-size:15px;font-weight:600;color:${BG};text-decoration:none;border-radius:10px;">
          ${escapeHtml(label)}
        </a>
      </td>
    </tr>
  </table>`;
}

function wrapBody(innerRows: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>PinnacleMagic</title>
</head>
<body style="margin:0;padding:0;background:${BG};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${BG};">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:#151216;border:1px solid rgba(201,168,76,0.2);border-radius:16px;overflow:hidden;">
          ${logoBlock()}
          ${innerRows}
          ${footerNote()}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function rowTable(rows: [string, string][]): string {
  const trs = rows
    .map(
      ([k, v]) => `
    <tr>
      <td style="padding:10px 16px;border-bottom:1px solid rgba(255,255,255,0.06);font-family:system-ui,-apple-system,sans-serif;font-size:13px;color:${MUTED};width:38%;vertical-align:top;">${escapeHtml(k)}</td>
      <td style="padding:10px 16px;border-bottom:1px solid rgba(255,255,255,0.06);font-family:system-ui,-apple-system,sans-serif;font-size:14px;color:${TEXT};vertical-align:top;">${v}</td>
    </tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:16px 0;border:1px solid rgba(255,255,255,0.08);border-radius:12px;overflow:hidden;">${trs}</table>`;
}

/** Booking request — to magician */
export function emailBookingRequest(data: {
  requester_name: string;
  requester_email: string;
  event_date: string;
  event_type?: string | null;
  event_location?: string | null;
  guest_count?: number | null;
  budget_range?: string | null;
  message: string;
}): { subject: string; html: string; from: string } {
  const subject = `New booking request from ${data.requester_name}`;
  const inner = `
  <tr>
    <td style="padding:8px 28px 0;">
      <h1 style="margin:0 0 8px;font-family:Georgia,'Cormorant Garamond','Times New Roman',serif;font-size:26px;font-weight:600;color:${GOLD};line-height:1.2;">
        You have a new booking request
      </h1>
      <p style="margin:0;font-family:system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.6;color:${TEXT};">
        Someone wants to book you through PinnacleMagic. Details below.
      </p>
    </td>
  </tr>
  <tr>
    <td style="padding:16px 24px 8px;">
      ${rowTable([
        ["From", `${escapeHtml(data.requester_name)}<br/><span style="color:${MUTED};font-size:13px;">${escapeHtml(data.requester_email)}</span>`],
        ["Event date", formatEventDate(data.event_date)],
        ["Event type", escapeHtml(data.event_type || "—")],
        ["Location", escapeHtml(data.event_location || "—")],
        ["Guest count", data.guest_count != null ? escapeHtml(String(data.guest_count)) : "—"],
        ["Budget range", escapeHtml(data.budget_range || "—")],
        ["Their message", escapeHtml(data.message)],
      ])}
      ${button(`${siteBaseUrl()}/dashboard`, "View request")}
    </td>
  </tr>`;
  return {
    subject,
    html: wrapBody(inner),
    from: "PinnacleMagic Bookings <bookings@pinnaclemagic.com>",
  };
}

/** Booking accepted — to requester */
export function emailBookingAccepted(data: {
  magician_name: string;
  magician_email: string;
  event_date: string;
  event_type?: string | null;
  event_location?: string | null;
  guest_count?: number | null;
  budget_range?: string | null;
}): { subject: string; html: string; from: string } {
  const subject = `${data.magician_name} accepted your booking request`;
  const inner = `
  <tr>
    <td style="padding:8px 28px 0;">
      <h1 style="margin:0 0 12px;font-family:Georgia,'Cormorant Garamond','Times New Roman',serif;font-size:26px;font-weight:600;color:${GOLD};line-height:1.2;">
        Congratulations!
      </h1>
      <p style="margin:0;font-family:system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.65;color:${TEXT};">
        <strong style="color:${TEXT};">${escapeHtml(data.magician_name)}</strong> accepted your booking request on PinnacleMagic.
      </p>
      ${
        data.magician_email?.trim()
          ? `<p style="margin:16px 0 0;font-family:system-ui,-apple-system,sans-serif;font-size:14px;color:${MUTED};">
        Contact: <a href="mailto:${escapeHtml(data.magician_email)}" style="color:${GOLD};">${escapeHtml(data.magician_email)}</a>
      </p>`
          : `<p style="margin:16px 0 0;font-family:system-ui,-apple-system,sans-serif;font-size:14px;color:${MUTED};">
        They'll reach out through PinnacleMagic to coordinate details.
      </p>`
      }
    </td>
  </tr>
  <tr>
    <td style="padding:16px 24px 8px;">
      ${rowTable([
        ["Event date", formatEventDate(data.event_date)],
        ["Event type", escapeHtml(data.event_type || "—")],
        ["Location", escapeHtml(data.event_location || "—")],
        ["Guests", data.guest_count != null ? escapeHtml(String(data.guest_count)) : "—"],
        ["Budget", escapeHtml(data.budget_range || "—")],
      ])}
      ${button(siteBaseUrl(), "View on PinnacleMagic")}
      <p style="margin:8px 24px 24px;font-family:system-ui,-apple-system,sans-serif;font-size:13px;color:${MUTED};text-align:center;">
        The magician will be in touch to confirm details.
      </p>
    </td>
  </tr>`;
  return {
    subject,
    html: wrapBody(inner),
    from: "PinnacleMagic Bookings <bookings@pinnaclemagic.com>",
  };
}

/** Booking declined — to requester */
export function emailBookingDeclined(data: {
  magician_name: string;
  reply_message?: string | null;
}): { subject: string; html: string; from: string } {
  const subject = "Update on your booking request";
  const reply = data.reply_message?.trim();
  const inner = `
  <tr>
    <td style="padding:8px 28px 0;">
      <h1 style="margin:0 0 12px;font-family:Georgia,'Cormorant Garamond','Times New Roman',serif;font-size:24px;font-weight:600;color:${TEXT};line-height:1.2;">
        Booking update
      </h1>
      <p style="margin:0;font-family:system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.65;color:${TEXT};">
        Unfortunately, <strong>${escapeHtml(data.magician_name)}</strong> isn't available for this request right now.
      </p>
      ${
        reply
          ? `<div style="margin:20px 0;padding:16px;border-radius:12px;background:rgba(255,255,255,0.04);border-left:3px solid ${GOLD};">
        <p style="margin:0 0 6px;font-family:system-ui,-apple-system,sans-serif;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:${MUTED};">Message from the magician</p>
        <p style="margin:0;font-family:system-ui,-apple-system,sans-serif;font-size:14px;color:${TEXT};line-height:1.6;">${escapeHtml(reply)}</p>
      </div>`
          : ""
      }
      ${button(`${siteBaseUrl()}/magicians`, "Browse other magicians")}
    </td>
  </tr>`;
  return {
    subject,
    html: wrapBody(inner),
    from: "PinnacleMagic Bookings <bookings@pinnaclemagic.com>",
  };
}

/** New follower — to magician */
export function emailNewFollower(data: {
  fan_name: string;
  fan_profile_url: string;
  follower_count: number;
}): { subject: string; html: string; from: string } {
  const subject = `${data.fan_name} started following you`;
  const inner = `
  <tr>
    <td style="padding:8px 28px 0;">
      <h1 style="margin:0 0 12px;font-family:Georgia,'Cormorant Garamond','Times New Roman',serif;font-size:24px;font-weight:600;color:${GOLD};line-height:1.2;">
        New follower
      </h1>
      <p style="margin:0;font-family:system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.65;color:${TEXT};">
        <strong>${escapeHtml(data.fan_name)}</strong> is now following you on PinnacleMagic.
      </p>
      ${button(data.fan_profile_url, "View their profile")}
      <p style="margin:0 24px 24px;font-family:system-ui,-apple-system,sans-serif;font-size:14px;color:${MUTED};text-align:center;">
        You now have <strong style="color:${GOLD};">${data.follower_count}</strong> follower${data.follower_count === 1 ? "" : "s"}.
      </p>
    </td>
  </tr>`;
  return {
    subject,
    html: wrapBody(inner),
    from: "PinnacleMagic <hello@pinnaclemagic.com>",
  };
}

function starsHtml(rating: number): string {
  const r = Math.min(5, Math.max(1, Math.round(rating)));
  const filled = "★";
  const empty = "☆";
  let s = "";
  for (let i = 1; i <= 5; i++) s += i <= r ? filled : empty;
  return `<span style="font-size:22px;letter-spacing:4px;color:${GOLD};">${s}</span>`;
}

export function emailArticleSubmitted(data: {
  article_title: string;
  author_name: string;
  author_id: string;
  category?: string | null;
  excerpt?: string | null;
}): { subject: string; html: string; from: string } {
  const subject = `New article submitted for review: ${data.article_title}`;
  const adminUrl = `${siteBaseUrl()}/admin/articles`;
  const inner = `
  <tr>
    <td style="padding:8px 28px 0;">
      <h1 style="margin:0 0 12px;font-family:Georgia,'Cormorant Garamond','Times New Roman',serif;font-size:24px;font-weight:600;color:${GOLD};line-height:1.2;">
        New article pending review
      </h1>
      <p style="margin:0;font-family:system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.65;color:${TEXT};">
        <strong>${escapeHtml(data.author_name)}</strong> submitted an article for editorial review.
      </p>
      ${rowTable([
        ["Title", escapeHtml(data.article_title)],
        ["Author", escapeHtml(data.author_name)],
        ["Category", escapeHtml(data.category?.trim() || "—")],
        ["Excerpt", escapeHtml(data.excerpt?.trim() || "—").replace(/\n/g, "<br/>")],
      ])}
      ${button(adminUrl, "Open admin — Articles")}
      <p style="margin:16px 24px 0;font-family:system-ui,-apple-system,sans-serif;font-size:12px;color:${MUTED};text-align:center;">
        Admin panel: <a href="${escapeHtml(adminUrl)}" style="color:${GOLD};">${escapeHtml(adminUrl)}</a>
      </p>
    </td>
  </tr>`;
  return {
    subject,
    html: wrapBody(inner),
    from: "PinnacleMagic <hello@pinnaclemagic.com>",
  };
}

/** Author notified when article is published */
export function emailArticlePublishedAuthor(data: {
  article_title: string;
  article_url: string;
}): { subject: string; html: string; from: string } {
  const subject = "Your article has been published on PinnacleMagic";
  const inner = `
  <tr>
    <td style="padding:8px 28px 0;">
      <h1 style="margin:0 0 12px;font-family:Georgia,'Cormorant Garamond','Times New Roman',serif;font-size:24px;font-weight:600;color:${GOLD};line-height:1.2;">
        Congratulations!
      </h1>
      <p style="margin:0;font-family:system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.65;color:${TEXT};">
        Your article <strong style="color:${TEXT};">${escapeHtml(data.article_title)}</strong> is now live on PinnacleMagic. Thank you for contributing to the community.
      </p>
      ${button(data.article_url, "Read your article")}
    </td>
  </tr>`;
  return {
    subject,
    html: wrapBody(inner),
    from: "PinnacleMagic <hello@pinnaclemagic.com>",
  };
}

/** Author notified when article is rejected */
export function emailArticleRejectedAuthor(data: {
  article_title: string;
  reason: string;
}): { subject: string; html: string; from: string } {
  const subject = "Update on your PinnacleMagic article submission";
  const inner = `
  <tr>
    <td style="padding:8px 28px 0;">
      <h1 style="margin:0 0 12px;font-family:Georgia,'Cormorant Garamond','Times New Roman',serif;font-size:22px;font-weight:600;color:${TEXT};line-height:1.2;">
        Article submission update
      </h1>
      <p style="margin:0;font-family:system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.65;color:${TEXT};">
        Thank you for submitting <strong>${escapeHtml(data.article_title)}</strong>. After review, we’re not able to publish this version on PinnacleMagic at this time.
      </p>
      <div style="margin:20px 0;padding:16px;border-radius:12px;background:rgba(255,255,255,0.04);border-left:3px solid ${GOLD};">
        <p style="margin:0 0 6px;font-family:system-ui,-apple-system,sans-serif;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:${MUTED};">Note from the editorial team</p>
        <p style="margin:0;font-family:system-ui,-apple-system,sans-serif;font-size:14px;color:${TEXT};line-height:1.6;">${escapeHtml(data.reason).replace(/\n/g, "<br/>")}</p>
      </div>
      <p style="margin:16px 0 0;font-family:system-ui,-apple-system,sans-serif;font-size:14px;line-height:1.65;color:${MUTED};">
        You’re welcome to revise your piece and submit again — we’d love to see an updated draft that addresses the feedback above.
      </p>
      ${button(`${siteBaseUrl()}/submit-article`, "Submit a revised article")}
    </td>
  </tr>`;
  return {
    subject,
    html: wrapBody(inner),
    from: "PinnacleMagic <hello@pinnaclemagic.com>",
  };
}

export function emailFoundingMemberWelcome(data: {
  magician_name: string;
  profile_url: string;
}): { subject: string; html: string; from: string } {
  const subject = "Welcome to PinnacleMagic — You are a Founding Member";
  const inner = `
  <tr>
    <td style="padding:8px 28px 0;">
      <h1 style="margin:0 0 10px;font-family:Georgia,'Cormorant Garamond','Times New Roman',serif;font-size:28px;font-weight:600;color:${GOLD};line-height:1.2;">
        Founding Member ♣
      </h1>
      <p style="margin:0;font-family:system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.7;color:${TEXT};">
        Hi ${escapeHtml(data.magician_name)}, you are one of PinnacleMagic's first 100 magicians.
      </p>
      <p style="margin:14px 0 0;font-family:system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.7;color:${TEXT};">
        Your Founding Member badge will appear permanently on your profile — even after we launch premium tiers your profile will always be free.
      </p>
      <p style="margin:14px 0 0;font-family:system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.7;color:${TEXT};">
        Help us grow by sharing your profile.
      </p>
      ${button(data.profile_url, "View your profile")}
    </td>
  </tr>`;
  return {
    subject,
    html: wrapBody(inner),
    from: "PinnacleMagic <hello@pinnaclemagic.com>",
  };
}

/** Invited co-performer — claim unclaimed profile after being tagged on a show */
export function emailTaggedInShowInvite(data: {
  invitee_name: string;
  poster_name: string;
  show_name: string;
  venue: string;
  show_date: string;
  claim_url: string;
  sign_in_url: string;
}): { subject: string; html: string; from: string } {
  const subject = `${data.poster_name} tagged you in an upcoming magic show`;
  const inner = `
  <tr>
    <td style="padding:8px 28px 0;">
      <h1 style="margin:0 0 12px;font-family:Georgia,'Cormorant Garamond','Times New Roman',serif;font-size:26px;font-weight:600;color:${GOLD};line-height:1.2;">
        You're tagged on a show
      </h1>
      <p style="margin:0;font-family:system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.7;color:${TEXT};">
        Hi ${escapeHtml(data.invitee_name)},
      </p>
      <p style="margin:14px 0 0;font-family:system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.7;color:${TEXT};">
        <strong style="color:${TEXT};">${escapeHtml(data.poster_name)}</strong> is performing at
        <strong style="color:${TEXT};">${escapeHtml(data.show_name)}</strong> at
        <strong style="color:${TEXT};">${escapeHtml(data.venue)}</strong>
        on <strong style="color:${TEXT};">${escapeHtml(data.show_date)}</strong> and tagged you as a fellow performer.
      </p>
      <p style="margin:14px 0 0;font-family:system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.7;color:${TEXT};">
        Join PinnacleMagic free to claim your profile, connect with the magic community, and be listed alongside
        ${escapeHtml(data.poster_name)} on this show.
      </p>
      ${button(data.claim_url, "Claim your free profile")}
      <p style="margin:0 24px 16px;font-family:system-ui,-apple-system,sans-serif;font-size:14px;line-height:1.65;color:${MUTED};text-align:center;">
        Already on PinnacleMagic? <a href="${escapeHtml(data.sign_in_url)}" style="color:${GOLD};text-decoration:underline;">Sign in</a>
        and your profile will be linked automatically when you claim this placeholder.
      </p>
    </td>
  </tr>`;
  return {
    subject,
    html: wrapBody(inner),
    from: "PinnacleMagic <hello@pinnaclemagic.com>",
  };
}

export function emailMagicianInvite(data: {
  name: string;
  personal_message: string;
  invite_url: string;
}): { subject: string; html: string; from: string } {
  const subject = "You're invited to join PinnacleMagic";
  const inner = `
  <tr>
    <td style="padding:8px 28px 0;">
      <h1 style="margin:0 0 12px;font-family:Georgia,'Cormorant Garamond','Times New Roman',serif;font-size:26px;font-weight:600;color:${GOLD};line-height:1.2;">
        You've been invited to PinnacleMagic ♣
      </h1>
      <p style="margin:0;font-family:system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.7;color:${TEXT};">
        Hi ${escapeHtml(data.name)},
      </p>
      <p style="margin:12px 0 0;font-family:system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.7;color:${TEXT};">
        ${escapeHtml(data.personal_message).replace(/\n/g, "<br/>")}
      </p>
      <p style="margin:14px 0 0;font-family:system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.7;color:${TEXT};">
        PinnacleMagic is a platform built exclusively for professional magicians. Create your profile, list your shows, and get discovered by fans and venues.
      </p>
      <p style="margin:14px 0 0;font-family:system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.7;color:${TEXT};">
        Founding Member badge: the first 100 magicians receive a permanent Founding Member badge.
      </p>
      ${button(data.invite_url, "Accept your invitation")}
      <p style="margin:0 24px 24px;font-family:system-ui,-apple-system,sans-serif;font-size:13px;color:${MUTED};text-align:center;">
        This invitation expires in 30 days.<br/>
        <a href="${escapeHtml(data.invite_url)}" style="color:${GOLD};">${escapeHtml(data.invite_url)}</a>
      </p>
    </td>
  </tr>`;
  return {
    subject,
    html: wrapBody(inner),
    from: "PinnacleMagic <hello@pinnaclemagic.com>",
  };
}

function venueSubmittedDetailRow(label: string, value: string): string {
  const v = value.trim();
  if (!v) return "";
  return `<tr><td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);font-family:system-ui,sans-serif;font-size:13px;color:${MUTED};width:38%;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:8px 0 8px 16px;border-bottom:1px solid rgba(255,255,255,0.06);font-family:system-ui,sans-serif;font-size:14px;color:${TEXT};vertical-align:top;">${escapeHtml(v).replace(/\n/g, "<br/>")}</td></tr>`;
}

/** Public venue submission — to team inbox */
export function emailVenueSubmitted(data: {
  venue_name: string;
  venue_type: string;
  country: string;
  state: string;
  city: string;
  full_address: string;
  capacity: string;
  established_year: string;
  website: string;
  phone: string;
  description: string;
  submitter_name: string;
  submitter_email: string;
  submission_notes: string;
  venue_id: string;
  admin_url: string;
}): { subject: string; html: string; from: string } {
  const subject = `New venue submission: ${data.venue_name}`;
  const rows = [
    venueSubmittedDetailRow("Venue name", data.venue_name),
    venueSubmittedDetailRow("Type", data.venue_type),
    venueSubmittedDetailRow("Country", data.country),
    venueSubmittedDetailRow("State / region", data.state),
    venueSubmittedDetailRow("City", data.city),
    venueSubmittedDetailRow("Address", data.full_address),
    venueSubmittedDetailRow("Capacity", data.capacity),
    venueSubmittedDetailRow("Established", data.established_year),
    venueSubmittedDetailRow("Website", data.website),
    venueSubmittedDetailRow("Phone", data.phone),
    venueSubmittedDetailRow("Description", data.description),
    venueSubmittedDetailRow("Submitted by", data.submitter_name),
    venueSubmittedDetailRow("Contact email", data.submitter_email),
    venueSubmittedDetailRow("Additional notes", data.submission_notes),
    venueSubmittedDetailRow("Venue ID", data.venue_id),
  ].join("");
  const inner = `
  <tr>
    <td style="padding:8px 28px 0;">
      <h1 style="margin:0 0 12px;font-family:Georgia,'Cormorant Garamond','Times New Roman',serif;font-size:24px;font-weight:600;color:${GOLD};line-height:1.2;">
        New venue submission
      </h1>
      <p style="margin:0 0 16px;font-family:system-ui,-apple-system,sans-serif;font-size:14px;line-height:1.6;color:${TEXT};">
        A visitor submitted a venue for the directory. Review it in the admin panel.
      </p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">${rows}</table>
      ${button(data.admin_url, "Open admin — Venues")}
    </td>
  </tr>`;
  return {
    subject,
    html: wrapBody(inner),
    from: "PinnacleMagic <hello@pinnaclemagic.com>",
  };
}

/** New review — to magician */
export function emailNewReview(data: {
  reviewer_name: string;
  rating: number;
  body: string;
  show_attended?: string | null;
  profile_url: string;
}): { subject: string; html: string; from: string } {
  const r = Math.min(5, Math.max(1, Math.round(data.rating)));
  const subject = `New ${r}-star review from ${data.reviewer_name}`;
  const inner = `
  <tr>
    <td style="padding:8px 28px 0;">
      <h1 style="margin:0 0 12px;font-family:Georgia,'Cormorant Garamond','Times New Roman',serif;font-size:24px;font-weight:600;color:${GOLD};line-height:1.2;">
        New review
      </h1>
      <p style="margin:0 0 8px;font-family:system-ui,-apple-system,sans-serif;font-size:14px;color:${TEXT};">
        From <strong>${escapeHtml(data.reviewer_name)}</strong>
      </p>
      <div style="margin:12px 0;">${starsHtml(data.rating)}</div>
      ${
        data.show_attended?.trim()
          ? `<p style="margin:0 0 12px;font-family:system-ui,-apple-system,sans-serif;font-size:13px;color:${MUTED};">Show attended: ${escapeHtml(data.show_attended)}</p>`
          : ""
      }
      <div style="margin:16px 0;padding:16px;border-radius:12px;background:rgba(255,255,255,0.04);border:1px solid rgba(201,168,76,0.15);">
        <p style="margin:0;font-family:Georgia,'Cormorant Garamond','Times New Roman',serif;font-size:16px;line-height:1.6;color:${TEXT};">${escapeHtml(data.body).replace(/\n/g, "<br/>")}</p>
      </div>
      ${button(data.profile_url, "View on your profile")}
    </td>
  </tr>`;
  return {
    subject,
    html: wrapBody(inner),
    from: "PinnacleMagic <hello@pinnaclemagic.com>",
  };
}

/** New article published — broadcast to opted-in subscribers */
export function emailNewArticlePublished(data: {
  article_title: string;
  article_url: string;
  author_name: string;
  excerpt?: string | null;
  category?: string | null;
}): { subject: string; html: string; from: string } {
  const subject = `New article: ${data.article_title}`;
  const settingsUrl = `${siteBaseUrl()}/profile/edit`;
  const inner = `
  <tr>
    <td style="padding:8px 28px 0;">
      ${data.category?.trim() ? `<p style="margin:0 0 10px;font-family:system-ui,-apple-system,sans-serif;font-size:11px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;color:${GOLD};">${escapeHtml(data.category)}</p>` : ""}
      <h1 style="margin:0 0 12px;font-family:Georgia,'Cormorant Garamond','Times New Roman',serif;font-size:26px;font-weight:600;color:${TEXT};line-height:1.25;">
        ${escapeHtml(data.article_title)}
      </h1>
      <p style="margin:0 0 6px;font-family:system-ui,-apple-system,sans-serif;font-size:13px;color:${MUTED};">
        By <strong style="color:${TEXT};">${escapeHtml(data.author_name)}</strong>
      </p>
      ${
        data.excerpt?.trim()
          ? `<p style="margin:16px 0 0;font-family:system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.65;color:${TEXT};">${escapeHtml(data.excerpt)}</p>`
          : ""
      }
      ${button(data.article_url, "Read the article")}
      <p style="margin:0 24px 8px;font-family:system-ui,-apple-system,sans-serif;font-size:12px;color:${MUTED};text-align:center;">
        <a href="${escapeHtml(settingsUrl)}" style="color:${GOLD};text-decoration:underline;">Unsubscribe from article emails</a>
      </p>
    </td>
  </tr>`;
  return {
    subject,
    html: wrapBody(inner),
    from: "PinnacleMagic <hello@pinnaclemagic.com>",
  };
}

export async function sendWithResend(params: {
  to: string;
  subject: string;
  html: string;
  from: string;
  replyTo?: string | string[];
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("RESEND_API_KEY is not set; skipping email send.");
    return { ok: false, error: "Email not configured" };
  }
  const resend = new Resend(key);
  const { error } = await resend.emails.send({
    from: params.from,
    to: params.to,
    subject: params.subject,
    html: params.html,
    ...(params.replyTo ? { replyTo: params.replyTo } : {}),
  });
  if (error) {
    console.error("Resend error:", error);
    return { ok: false, error: error.message || "Send failed" };
  }
  return { ok: true };
}

export async function sendPinnacleMagicEmail(
  type: PinnacleMagicEmailType,
  to: string,
  data: Record<string, unknown>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  let built: { subject: string; html: string; from: string };
  try {
    switch (type) {
      case "booking_request":
        built = emailBookingRequest(data as unknown as Parameters<typeof emailBookingRequest>[0]);
        break;
      case "booking_accepted":
        built = emailBookingAccepted(data as unknown as Parameters<typeof emailBookingAccepted>[0]);
        break;
      case "booking_declined":
        built = emailBookingDeclined(data as unknown as Parameters<typeof emailBookingDeclined>[0]);
        break;
      case "new_follower":
        built = emailNewFollower(data as unknown as Parameters<typeof emailNewFollower>[0]);
        break;
      case "new_review":
        built = emailNewReview(data as unknown as Parameters<typeof emailNewReview>[0]);
        break;
      case "article_submitted":
        built = emailArticleSubmitted(data as unknown as Parameters<typeof emailArticleSubmitted>[0]);
        break;
      case "venue_submitted":
        built = emailVenueSubmitted(data as unknown as Parameters<typeof emailVenueSubmitted>[0]);
        break;
      case "founding_member_welcome":
        built = emailFoundingMemberWelcome(
          data as unknown as Parameters<typeof emailFoundingMemberWelcome>[0],
        );
        break;
      case "magician_invite":
        built = emailMagicianInvite(data as unknown as Parameters<typeof emailMagicianInvite>[0]);
        break;
      case "tagged_in_show_invite":
        built = emailTaggedInShowInvite(
          data as unknown as Parameters<typeof emailTaggedInShowInvite>[0],
        );
        break;
      case "new_article_published":
        built = emailNewArticlePublished(
          data as unknown as Parameters<typeof emailNewArticlePublished>[0],
        );
        break;
      default:
        return { ok: false, error: "Unknown email type" };
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Template error" };
  }
  return sendWithResend({ to, ...built });
}
