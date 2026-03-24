import { supabase } from "@/lib/supabase";

type OfflinePayload = {
  id?: string;
};

export async function POST(request: Request) {
  let payload: OfflinePayload = {};
  try {
    payload = (await request.json()) as OfflinePayload;
  } catch {
    // sendBeacon can occasionally deliver an empty or non-JSON body
    payload = {};
  }

  const id = payload.id?.trim();
  if (!id) {
    return Response.json({ error: "No id" }, { status: 400 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({ is_online: false })
    .eq("id", id);

  if (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }

  const staleCutoff = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const { error: cleanupError } = await supabase
    .from("profiles")
    .update({ is_online: false })
    .lt("last_seen", staleCutoff)
    .eq("is_online", true);

  if (cleanupError) {
    return Response.json({ success: false, error: cleanupError.message }, { status: 500 });
  }

  return Response.json({ success: true });
}
