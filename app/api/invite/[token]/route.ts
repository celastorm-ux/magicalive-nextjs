import { NextResponse } from "next/server";
import { getRouteSupabase } from "@/lib/supabase-route";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = await getRouteSupabase();
  const { data, error } = await db.from("invites").select("*").eq("token", token).maybeSingle();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ ok: false, error: "Invalid invitation" }, { status: 404 });

  const expired = new Date(data.expires_at).getTime() < Date.now();
  const status = expired && data.status === "pending" ? "expired" : data.status;
  if (status === "expired" && data.status !== "expired") {
    await db.from("invites").update({ status: "expired" }).eq("id", data.id);
  }
  return NextResponse.json({ ok: true, invite: { ...data, status } });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const body = (await request.json()) as Record<string, unknown>;
  if (body.action !== "accept") {
    return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
  }
  const db = await getRouteSupabase();
  const { data } = await db.from("invites").select("*").eq("token", token).maybeSingle();
  if (!data) return NextResponse.json({ ok: false, error: "Invalid invitation" }, { status: 404 });
  if (data.status !== "pending") return NextResponse.json({ ok: false, error: "Invite already used" }, { status: 400 });
  if (new Date(data.expires_at).getTime() < Date.now()) {
    await db.from("invites").update({ status: "expired" }).eq("id", data.id);
    return NextResponse.json({ ok: false, error: "Invite expired" }, { status: 400 });
  }
  const { error } = await db.from("invites").update({ status: "accepted" }).eq("id", data.id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, invite: data });
}
