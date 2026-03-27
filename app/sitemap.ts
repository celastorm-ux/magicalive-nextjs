import type { MetadataRoute } from "next";
import { CITY_LANDING_PAGES } from "@/lib/city-landing";
import { siteBaseUrl } from "@/lib/magicalive-resend";
import { getRouteSupabase } from "@/lib/supabase-route";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteBaseUrl();
  const db = await getRouteSupabase();
  const [magicians, events, venues, articles] = await Promise.all([
    db.from("profiles").select("id").eq("account_type", "magician"),
    db.from("shows").select("id"),
    db.from("venues").select("id"),
    db.from("articles").select("id").eq("status", "published"),
  ]);

  const cityRoutes: MetadataRoute.Sitemap = CITY_LANDING_PAGES.map((c) => ({
    url: `${base}/magicians/${encodeURIComponent(c.slug)}`,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/magicians`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/hire-a-magician`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/magic-shows`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/events`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/venues`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/articles`, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.55 },
    { url: `${base}/contact`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/submit-article`, changeFrequency: "weekly", priority: 0.6 },
  ];

  const dynamicRoutes: MetadataRoute.Sitemap = [
    ...((magicians.data ?? []).map((m) => ({
      url: `${base}/profile/magician?id=${encodeURIComponent(String(m.id))}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })) as MetadataRoute.Sitemap),
    ...((events.data ?? []).map((e) => ({
      url: `${base}/events/${encodeURIComponent(String(e.id))}`,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })) as MetadataRoute.Sitemap),
    ...((venues.data ?? []).map((v) => ({
      url: `${base}/venues/${encodeURIComponent(String(v.id))}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })) as MetadataRoute.Sitemap),
    ...((articles.data ?? []).map((a) => ({
      url: `${base}/articles/${encodeURIComponent(String(a.id))}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })) as MetadataRoute.Sitemap),
  ];

  return [...staticRoutes, ...cityRoutes, ...dynamicRoutes];
}
