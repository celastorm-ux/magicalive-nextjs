import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { sendMagicaliveEmail, siteBaseUrl } from "@/lib/magicalive-resend";
import { getRouteSupabase } from "@/lib/supabase-route";

export const dynamic = "force-dynamic";

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const db = await getRouteSupabase();
  const { data: profile } = await db
    .from("profiles")
    .select("id, display_name, email, is_founding_member")
    .eq("id", userId)
    .maybeSingle();

  if (!profile || !profile.is_founding_member) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const to = (profile.email || "").trim();
  if (!to.includes("@")) return NextResponse.json({ ok: true, skipped: true });

  const out = await sendMagicaliveEmail("founding_member_welcome", to, {
    magician_name: profile.display_name?.trim() || "Magician",
    profile_url: `${siteBaseUrl()}/profile/magician?id=${encodeURIComponent(userId)}`,
  });
  if (!out.ok) return NextResponse.json({ ok: false, error: out.error }, { status: 500 });

  return NextResponse.json({ ok: true });
}
