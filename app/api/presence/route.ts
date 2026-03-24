import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { userId, online } = (await request.json()) as {
      userId?: string;
      online?: boolean;
    };

    if (!userId) {
      return Response.json({ error: "No userId" }, { status: 400 });
    }

    await supabase
      .from("profiles")
      .update({
        is_online: Boolean(online),
        last_seen: new Date().toISOString(),
      })
      .eq("id", userId);

    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Failed" }, { status: 500 });
  }
}