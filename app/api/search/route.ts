import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    console.log("Search query:", query);

    if (!query || query.length < 2) {
      return Response.json({ magicians: [], shows: [], venues: [] });
    }

    const [magiciansResult, showsResult, venuesResult] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, display_name, location, specialty_tags, avatar_url, rating, review_count, is_online",
        )
        .eq("account_type", "magician")
        .ilike("display_name", `%${query}%`)
        .limit(8),

      supabase
        .from("shows")
        .select("*, profiles(id, display_name, avatar_url)")
        .eq("is_public", true)
        .eq("is_cancelled", false)
        .gte("date", new Date().toISOString().split("T")[0])
        .ilike("name", `%${query}%`)
        .limit(8),

      supabase
        .from("venues")
        .select("*")
        .eq("is_verified", true)
        .ilike("name", `%${query}%`)
        .limit(8),
    ]);

    console.log("Magicians found:", magiciansResult.data?.length);
    console.log("Shows found:", showsResult.data?.length);
    console.log("Venues found:", venuesResult.data?.length);

    return Response.json({
      magicians: magiciansResult.data || [],
      shows: showsResult.data || [],
      venues: venuesResult.data || [],
    });
  } catch (error) {
    console.error("Search error:", error);
    return Response.json(
      { error: "Search failed", magicians: [], shows: [], venues: [] },
      { status: 500 },
    );
  }
}
