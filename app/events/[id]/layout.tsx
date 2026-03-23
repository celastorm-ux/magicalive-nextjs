import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { getRouteSupabase } from "@/lib/supabase-route";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const db = await getRouteSupabase();
  const { data } = await db
    .from("shows")
    .select("name, venue_name, city, date, profiles(display_name)")
    .eq("id", id)
    .maybeSingle();
  const showName = data?.name?.trim() || "Event";
  const venue = data?.venue_name?.trim() || "Venue";
  const city = data?.city?.trim() || "City";
  const date = data?.date ? new Date(data.date).toLocaleDateString() : "TBA";
  const magicianName =
    ((Array.isArray(data?.profiles) ? data?.profiles[0] : data?.profiles) as { display_name?: string } | null)
      ?.display_name || "a magician";
  const base = buildMetadata({
    title: `${showName} — Magicalive Events`,
    description: `${showName} at ${venue} in ${city} on ${date}`,
  });
  return {
    ...base,
    openGraph: {
      title: showName,
      description: `See ${magicianName} perform at ${venue} on ${date}`,
      type: "website",
      images: ["/og-default.png"],
    },
  };
}

export default function EventDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
