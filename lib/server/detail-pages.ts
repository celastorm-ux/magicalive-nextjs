import { cache } from "react";
import { supabase } from "@/lib/supabase";
import { getRouteSupabase } from "@/lib/supabase-route";

export type MagicianProfileBundle = {
  profile: Record<string, unknown> | null;
  shows: unknown[];
  pastShows: unknown[];
  reviews: unknown[];
  articles: unknown[];
};

export const getMagicianProfileBundle = cache(async (profileId: string): Promise<MagicianProfileBundle | null> => {
  if (!profileId.trim()) return null;
  const db = await getRouteSupabase();
  const { data: p } = await db
    .from("profiles")
    .select("*, is_online, last_seen")
    .eq("id", profileId)
    .eq("account_type", "magician")
    .maybeSingle();
  if (!p) {
    return { profile: null, shows: [], pastShows: [], reviews: [], articles: [] };
  }
  const today = new Date().toISOString().split("T")[0]!;
  const [sh, psh, rv, ar] = await Promise.all([
    db
      .from("shows")
      .select("*")
      .eq("magician_id", profileId)
      .eq("is_past", false)
      .gte("date", today)
      .order("date", { ascending: true }),
    db
      .from("shows")
      .select("*")
      .eq("magician_id", profileId)
      .or(`is_past.eq.true,date.lt.${today}`)
      .order("date", { ascending: false }),
    db
      .from("reviews")
      .select("id, reviewer_name, reviewer_display_name, rating, body, show_attended, created_at")
      .eq("magician_id", profileId)
      .order("created_at", { ascending: false }),
    db
      .from("articles")
      .select("id, title, excerpt, category, published_at, read_time")
      .eq("author_id", profileId)
      .eq("status", "published")
      .order("published_at", { ascending: false }),
  ]);
  return {
    profile: p as Record<string, unknown>,
    shows: (sh.data ?? []) as unknown[],
    pastShows: (psh.data ?? []) as unknown[],
    reviews: (rv.data ?? []) as unknown[],
    articles: (ar.data ?? []) as unknown[],
  };
});

export type VenueDetailBundle = {
  venue: Record<string, unknown> | null;
  upcomingShows: Array<Record<string, unknown>>;
  pastCount: number;
  totalShows: number;
  magicians: Array<{ id: string; display_name: string | null; avatar_url: string | null }>;
};

function normalizeShowProfile(
  profiles: { id: string; display_name: string | null; avatar_url: string | null } | unknown[] | null | undefined,
): { id: string; display_name: string | null; avatar_url: string | null } | null {
  if (profiles == null) return null;
  return Array.isArray(profiles) ? (profiles[0] as { id: string; display_name: string | null; avatar_url: string | null } | undefined) ?? null : (profiles as { id: string; display_name: string | null; avatar_url: string | null });
}

/** Trim contact/url fields; treat non-string DB values and whitespace-only as empty. */
function normalizeVenueContactRow(row: Record<string, unknown>): Record<string, unknown> {
  const trimText = (v: unknown): string | null => {
    if (v == null) return null;
    const s = typeof v === "string" ? v : String(v);
    const t = s.trim();
    return t.length ? t : null;
  };
  return {
    ...row,
    website: trimText(row.website),
    address: trimText(row.address),
    phone: trimText(row.phone),
  };
}

/** PostgREST `or()` — avoid commas/parens in pattern breaking the filter string. */
function venueShowOrFilter(venueId: string, venueName: string): string {
  const safeName = venueName.replace(/[,()]/g, " ").trim();
  if (!safeName.length) return `venue_id.eq.${venueId}`;
  return `venue_id.eq.${venueId},venue_name.ilike.%${safeName}%`;
}

export const getVenueDetailBundle = cache(async (venueId: string): Promise<VenueDetailBundle | null> => {
  if (!venueId.trim()) return null;
  const { data: vRow, error: vErr } = await supabase.from("venues").select("*").eq("id", venueId).single();
  if (vErr || !vRow) {
    console.error("[getVenueDetailBundle] venues select error:", vErr?.message ?? "no row", vErr);
    return { venue: null, upcomingShows: [], pastCount: 0, totalShows: 0, magicians: [] };
  }

  const rawVenue = vRow as Record<string, unknown>;
  if (rawVenue.is_verified === false) {
    return { venue: null, upcomingShows: [], pastCount: 0, totalShows: 0, magicians: [] };
  }

  const venueNormalized = normalizeVenueContactRow(rawVenue);
  const venueName = String(rawVenue.name ?? "").trim();
  const today = new Date().toISOString().split("T")[0]!;

  const upcomingSelect =
    "id, name, date, time, ticket_url, magician_id, is_cancelled, profiles(id, display_name, avatar_url)";

  const [{ data: showsByVenueId }, { data: showsByName }] = await Promise.all([
    supabase
      .from("shows")
      .select(upcomingSelect)
      .eq("venue_id", venueId)
      .eq("is_public", true)
      .gte("date", today)
      .order("date", { ascending: true }),
    venueName.length > 0
      ? supabase
          .from("shows")
          .select(upcomingSelect)
          .ilike("venue_name", `%${venueName}%`)
          .eq("is_public", true)
          .gte("date", today)
          .order("date", { ascending: true })
      : Promise.resolve({ data: [] }),
  ]);

  const allUpcoming = [
    ...(showsByVenueId ?? []),
    ...((showsByName ?? []) as Array<Record<string, unknown>>),
  ] as Array<Record<string, unknown>>;
  const uniqueRaw = allUpcoming.filter(
    (show, index, self) => index === self.findIndex((s) => String(s.id) === String(show.id)),
  );
  uniqueRaw.sort((a, b) => String(a.date ?? "").localeCompare(String(b.date ?? "")));

  const upcomingShows = uniqueRaw.map((s) => ({
    ...s,
    profiles: normalizeShowProfile(s.profiles as Parameters<typeof normalizeShowProfile>[0]),
  }));

  const orFilter = venueShowOrFilter(venueId, venueName);

  const [{ count: pastC }, { count: totalC }, { data: magRows }] = await Promise.all([
    supabase
      .from("shows")
      .select("*", { count: "exact", head: true })
      .or(orFilter)
      .lt("date", today),
    supabase.from("shows").select("*", { count: "exact", head: true }).or(orFilter),
    supabase
      .from("shows")
      .select("magician_id, profiles(id, display_name, avatar_url)")
      .or(orFilter)
      .not("magician_id", "is", null),
  ]);

  const byId = new Map<string, { id: string; display_name: string | null; avatar_url: string | null }>();
  for (const row of (magRows ?? []) as Array<{ magician_id: string | null; profiles: unknown }>) {
    const mid = row.magician_id;
    const prof = normalizeShowProfile(row.profiles as Parameters<typeof normalizeShowProfile>[0]);
    if (!mid || !prof?.id || byId.has(mid)) continue;
    byId.set(mid, { id: prof.id, display_name: prof.display_name, avatar_url: prof.avatar_url });
  }

  return {
    venue: venueNormalized,
    upcomingShows,
    pastCount: pastC ?? 0,
    totalShows: totalC ?? 0,
    magicians: Array.from(byId.values()),
  };
});

export type EventDetailBundle = {
  event: Record<string, unknown> | null;
  moreByMagician: unknown[];
  youMightLike: unknown[];
  reviews: unknown[];
};

export const getEventDetailBundle = cache(async (eventId: string): Promise<EventDetailBundle | null> => {
  if (!eventId.trim()) return null;
  const db = await getRouteSupabase();
  const { data, error } = await db
    .from("shows")
    .select(
      "*, profiles(id, display_name, avatar_url, banner_url, location, specialty_tags, rating, review_count, short_bio)",
    )
    .eq("id", eventId)
    .single();
  if (error || !data) {
    return { event: null, moreByMagician: [], youMightLike: [], reviews: [] };
  }
  const current = data as Record<string, unknown> & { magician_id?: string | null; id?: string };
  const magicianId = current.magician_id ?? null;
  const today = new Date().toISOString().split("T")[0]!;
  let moreByMagician: unknown[] = [];
  let youMightLike: unknown[] = [];
  let reviews: unknown[] = [];
  if (magicianId) {
    const [{ data: more }, { data: other }, { data: rv }] = await Promise.all([
      db
        .from("shows")
        .select(
          "*, profiles(id, display_name, avatar_url, banner_url, location, specialty_tags, rating, review_count, short_bio)",
        )
        .eq("magician_id", magicianId)
        .gte("date", today)
        .eq("is_cancelled", false)
        .neq("id", current.id)
        .order("date", { ascending: true })
        .limit(3),
      db
        .from("shows")
        .select(
          "*, profiles(id, display_name, avatar_url, banner_url, location, specialty_tags, rating, review_count, short_bio)",
        )
        .neq("magician_id", magicianId)
        .gte("date", today)
        .eq("is_cancelled", false)
        .order("date", { ascending: true })
        .limit(3),
      db
        .from("reviews")
        .select("id, reviewer_name, reviewer_display_name, rating, body, created_at")
        .eq("magician_id", magicianId)
        .order("created_at", { ascending: false })
        .limit(3),
    ]);
    moreByMagician = (more ?? []) as unknown[];
    youMightLike = (other ?? []) as unknown[];
    reviews = (rv ?? []) as unknown[];
  }
  return { event: current as Record<string, unknown>, moreByMagician, youMightLike, reviews };
});

export type ArticlePublicBundle = {
  article: Record<string, unknown> | null;
  related: Array<{ id: string; title: string; category: string; coverImageUrl: string | null }>;
  moreArticles: Array<{ id: string; title: string; category: string; coverImageUrl: string | null }>;
};

export const getArticlePublicBundle = cache(async (articleId: string): Promise<ArticlePublicBundle | null> => {
  if (!articleId.trim()) return null;
  const db = await getRouteSupabase();
  const { data: artData, error: artErr } = await db
    .from("articles")
    .select(
      "id, author_id, title, excerpt, body, category, tags, read_time, cover_image_url, published_at, view_count, like_count, status, profiles:author_id(id, display_name, avatar_url)",
    )
    .eq("id", articleId)
    .maybeSingle();
  if (artErr || !artData) {
    return { article: null, related: [], moreArticles: [] };
  }
  const row = artData as Record<string, unknown>;
  const status = String(row.status || "").toLowerCase();
  if (status !== "published") {
    return { article: null, related: [], moreArticles: [] };
  }
  const sameCategory = (row.category as string | null)?.trim() || "";
  const [{ data: relRows }, { data: moreRows }] = await Promise.all([
    db
      .from("articles")
      .select("id, title, category, cover_image_url")
      .eq("status", "published")
      .eq("category", sameCategory)
      .neq("id", articleId)
      .order("published_at", { ascending: false })
      .limit(3),
    db
      .from("articles")
      .select("id, title, category, cover_image_url")
      .eq("status", "published")
      .neq("id", articleId)
      .order("published_at", { ascending: false })
      .limit(3),
  ]);
  const mapRow = (r: { id: string; title: string | null; category: string | null; cover_image_url: string | null }) => ({
    id: r.id,
    title: r.title?.trim() || "Untitled article",
    category: r.category?.trim() || "General",
    coverImageUrl: r.cover_image_url,
  });
  type ArtRow = { id: string; title: string | null; category: string | null; cover_image_url: string | null };
  return {
    article: row,
    related: ((relRows ?? []) as ArtRow[]).map(mapRow),
    moreArticles: ((moreRows ?? []) as ArtRow[]).map(mapRow),
  };
});
