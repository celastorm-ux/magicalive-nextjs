import { supabase } from "@/lib/supabase";

export async function POST() {
  const twoMinutesAgo = new Date(
    Date.now() - 2 * 60 * 1000,
  ).toISOString();

  await supabase
    .from("profiles")
    .update({ is_online: false })
    .eq("is_online", true)
    .lt("last_seen", twoMinutesAgo);

  return Response.json({ success: true });
}