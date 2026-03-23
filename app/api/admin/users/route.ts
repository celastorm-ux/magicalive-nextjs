import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await requireAdmin();
  if (!ctx) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }
  const { data, error } = await ctx.db
    .from("profiles")
    .select("id, display_name, email, account_type, is_admin, updated_at, created_at")
    .order("display_name", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, users: data ?? [] });
}

export async function PATCH(request: Request) {
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
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }
  const rec = body as Record<string, unknown>;
  const userId = typeof rec.userId === "string" ? rec.userId.trim() : "";
  const isAdmin = rec.is_admin === true || rec.is_admin === false ? rec.is_admin : null;
  if (!userId || isAdmin === null) {
    return NextResponse.json({ ok: false, error: "userId and is_admin required" }, { status: 400 });
  }

  if (userId === ctx.userId && !isAdmin) {
    return NextResponse.json({ ok: false, error: "Cannot remove your own admin access" }, { status: 400 });
  }

  const { error } = await ctx.db.from("profiles").update({ is_admin: isAdmin }).eq("id", userId);
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const ctx = await requireAdmin();
  if (!ctx) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId")?.trim() ?? "";
  if (!userId) {
    return NextResponse.json({ ok: false, error: "userId required" }, { status: 400 });
  }
  if (userId === ctx.userId) {
    return NextResponse.json({ ok: false, error: "Cannot delete your own account" }, { status: 400 });
  }

  try {
    const client = await clerkClient();
    await client.users.deleteUser(userId);
  } catch (e) {
    console.error("Clerk deleteUser:", e);
    const { error } = await ctx.db.from("profiles").delete().eq("id", userId);
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, partial: true, note: "Profile removed; Clerk user may still exist." });
  }

  await ctx.db.from("profiles").delete().eq("id", userId);

  return NextResponse.json({ ok: true });
}
