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
    .from("articles")
    .select("title, excerpt, cover_image_url")
    .eq("id", id)
    .maybeSingle();
  return buildMetadata({
    title: `${data?.title || "Article"} — Magicalive`,
    description: data?.excerpt || "Read this article on Magicalive.",
    image: data?.cover_image_url || "/og-default.png",
    type: "article",
  });
}

export default function ArticleDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
