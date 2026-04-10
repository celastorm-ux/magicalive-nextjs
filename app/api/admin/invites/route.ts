import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { requireAdmin } from "@/lib/admin-server";
import { sendPinnacleMagicEmail, siteBaseUrl } from "@/lib/pinnaclemagic-resend";

export const dynamic = "force-dynamic";

function token() {
  return randomBytes(24).toString("hex");
}

export async function GET() {
  const ctx = await requireAdmin();
  if (!ctx) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const { data, error } = await ctx.db
    .from("invites")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, invites: data ?? [] });
}

export async function POST(request: Request) {
  const ctx = await requireAdmin();
  if (!ctx) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  const body = (await request.json()) as Record<string, unknown>;
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const personalMessage = String(body.personal_message || "").trim();
  if (!name || !email.includes("@")) {
    return NextResponse.json({ ok: false, error: "Name and valid email are required" }, { status: 400 });
  }

  const t = token();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await ctx.db
    .from("invites")
    .insert({
      name,
      email,
      invited_by: ctx.userId,
      personal_message: personalMessage,
      status: "pending",
      token: t,
      expires_at: expiresAt,
    })
    .select("*")
    .single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const inviteUrl = `${siteBaseUrl()}/invite/${encodeURIComponent(t)}`;
  const out = await sendPinnacleMagicEmail("magician_invite", email, {
    name,
    personal_message: personalMessage || `Hi ${name}, I'd love to invite you to join PinnacleMagic — a new platform built exclusively for professional magicians. Create your free profile and be one of our first 100 Founding Members.`,
    invite_url: inviteUrl,
  });
  if (!out.ok) return NextResponse.json({ ok: false, error: out.error }, { status: 500 });
  return NextResponse.json({ ok: true, invite: data });
}

export async function PATCH(request: Request) {
  const ctx = await requireAdmin();
  if (!ctx) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  const body = (await request.json()) as Record<string, unknown>;
  const inviteId = String(body.invite_id || "");
  const action = String(body.action || "");
  if (!inviteId || !["resend", "cancel"].includes(action)) {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  const { data: invite } = await ctx.db.from("invites").select("*").eq("id", inviteId).maybeSingle();
  if (!invite) return NextResponse.json({ ok: false, error: "Invite not found" }, { status: 404 });
  if (invite.status !== "pending") {
    return NextResponse.json({ ok: false, error: "Only pending invites can be updated" }, { status: 400 });
  }

  if (action === "cancel") {
    const { error } = await ctx.db.from("invites").update({ status: "expired" }).eq("id", inviteId);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const inviteUrl = `${siteBaseUrl()}/invite/${encodeURIComponent(invite.token)}`;
  const out = await sendPinnacleMagicEmail("magician_invite", invite.email, {
    name: invite.name,
    personal_message: invite.personal_message || "",
    invite_url: inviteUrl,
  });
  if (!out.ok) return NextResponse.json({ ok: false, error: out.error }, { status: 500 });
  return NextResponse.json({ ok: true });
}
