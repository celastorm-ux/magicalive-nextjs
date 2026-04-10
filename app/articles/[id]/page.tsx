import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import { siteBaseUrl } from "@/lib/pinnaclemagic-resend";
import { buildMetadata } from "@/lib/seo";
import { getArticlePublicBundle } from "@/lib/server/detail-pages";
import { getRouteSupabase } from "@/lib/supabase-route";
import { ArticleDetailClient, type ArticleDetailRow, type ArticleInitialPublic } from "./ArticleDetailClient";

type PageParams = Promise<{ id: string }>;

function normalizeAuthor(
  p:
    | { id: string | null; display_name: string | null; avatar_url: string | null }
    | Array<{ id: string | null; display_name: string | null; avatar_url: string | null }>
    | null
    | undefined,
) {
  if (!p) return null;
  return Array.isArray(p) ? (p[0] ?? null) : p;
}

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { id } = await params;
  const db = await getRouteSupabase();
  const { data } = await db.from("articles").select("title, excerpt, cover_image_url").eq("id", id).maybeSingle();
  return buildMetadata({
    title: `${data?.title || "Article"} — PinnacleMagic`,
    description: data?.excerpt || "Read this article on PinnacleMagic.",
    image: data?.cover_image_url || "/og-default.png",
    type: "article",
  });
}

export default async function ArticleDetailPage({ params }: { params: PageParams }) {
  const { id } = await params;
  const bundle = await getArticlePublicBundle(id);

  if (!bundle?.article) {
    return <ArticleDetailClient mode="public" />;
  }

  const art = bundle.article as ArticleDetailRow;
  const author = normalizeAuthor(art.profiles);
  const authorName = author?.display_name?.trim() || "PinnacleMagic writer";
  const base = siteBaseUrl();

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: art.title,
    description: art.excerpt || undefined,
    author: {
      "@type": "Person",
      name: authorName,
    },
    datePublished: art.published_at || undefined,
    image: art.cover_image_url || undefined,
    publisher: {
      "@type": "Organization",
      name: "PinnacleMagic",
      url: base,
    },
  };

  const initialPublic: ArticleInitialPublic = {
    article: art,
    related: bundle.related,
    moreArticles: bundle.moreArticles,
  };

  return (
    <>
      <JsonLd data={articleSchema} />
      <ArticleDetailClient mode="public" initialPublic={initialPublic} />
    </>
  );
}
