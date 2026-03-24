import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getRouteSupabase } from "@/lib/supabase-route";

/**
 * Reliable offline signal from navigator.sendBeacon / fetch(..., { keepalive: true })
 * when the tab closes (beforeunload handlers cannot always finish async Supabase writes).
 */
export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await getRouteSupabase();
  const { error } = await supabase
    .from("profiles")
    .update({ is_online: false })
    .eq("id", userId);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
