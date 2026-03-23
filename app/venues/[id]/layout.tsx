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
    .from("venues")
    .select("name, description, city, capacity")
    .eq("id", id)
    .maybeSingle();
  const name = data?.name?.trim() || "Venue";
  const city = data?.city?.trim() || "City";
  const capacity = data?.capacity ? `${data.capacity}` : "Unknown";
  const excerpt = (data?.description || "").slice(0, 120) || "Magic venue";
  return buildMetadata({
    title: `${name} — Magicalive Venues`,
    description: `${excerpt} | ${city} | ${capacity} capacity`,
  });
}

export default function VenueDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
