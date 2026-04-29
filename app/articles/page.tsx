"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CLASSES } from "@/lib/constants";
import { supabase } from "@/lib/supabase";

type ArticleRow = {
  id: string;
  title: string | null;
  excerpt: string | null;
  body: string | null;
  category: string | null;
  cover_image_url: string | null;
  read_time: string | number | null;
  published_at: string | null;
  status: string | null;
  view_count: number | null;
  author_id: string | null;
  profiles:
    | { id: string | null; display_name: string | null; avatar_url: string | null }
    | Array<{ id: string | null; display_name: string | null; avatar_url: string | null }>
    | null;
};

type ArticleCard = {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  coverImageUrl: string | null;
  readTime: string;
  publishedAt: string;
  publishedAtRaw: string | null;
  viewCount: number;
  author: { id: string; name: string; avatarUrl: string | null };
};

type WriterRow = {
  author_id: string | null;
  profiles:
    | { id: string | null; display_name: string | null; avatar_url: string | null }
    | Array<{ id: string | null; display_name: string | null; avatar_url: string | null }>
    | null;
};

function badgeClass(cat: string) {
  return "inline-block w-fit rounded-full border border-[var(--ml-gold)]/30 bg-[var(--ml-gold)]/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--ml-gold)]";
}

function formatReadTime(rt: string | number | null | undefined): string {
  if (rt == null || rt === "") return "5 min read";
  if (typeof rt === "number" && Number.isFinite(rt)) {
    return `${Math.max(1, Math.round(rt))} min read`;
  }
  const s = String(rt).trim();
  if (/^\d+$/.test(s)) return `${Math.max(1, parseInt(s, 10))} min read`;
  return s;
}

function fmtDate(input: string | null): string {
  if (!input) return "Unpublished";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "Unpublished";
  return d
    .toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
    })
    .replace(",", "");
}

function normalizeProfile(
  p:
    | { id: string | null; display_name: string | null; avatar_url: string | null }
    | Array<{ id: string | null; display_name: string | null; avatar_url: string | null }>
    | null,
) {
  if (!p) return null;
  return Array.isArray(p) ? (p[0] ?? null) : p;
}

function toCard(row: ArticleRow): ArticleCard {
  const profile = normalizeProfile(row.profiles);
  return {
    id: String(row.id),
    title: row.title?.trim() || "Untitled article",
    excerpt: row.excerpt?.trim() || "Read the full piece on PinnacleMagic.",
    category: row.category?.trim() || "General",
    coverImageUrl: row.cover_image_url,
    readTime: formatReadTime(row.read_time),
    publishedAt: fmtDate(row.published_at),
    publishedAtRaw: row.published_at,
    viewCount: Number(row.view_count ?? 0),
    author: {
      id: profile?.id?.trim() || "",
      name: profile?.display_name?.trim() || "PinnacleMagic writer",
      avatarUrl: profile?.avatar_url ?? null,
    },
  };
}

export default function ArticlesPage() {
  const [category, setCategory] = useState("All");
  const [listExtra, setListExtra] = useState(0);
  const [loading, setLoading] = useState(true);
  const [articles, setArticles] = useState<ArticleCard[]>([]);
  const [trending, setTrending] = useState<ArticleCard[]>([]);
  const [writers, setWriters] = useState<Array<{ id: string; name: string; avatarUrl: string | null; count: number }>>([]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const [{ data: articleRows }, { data: trendingRows }, { data: writerRows }] = await Promise.all([
        supabase
          .from("articles")
          .select(
            "id, title, excerpt, body, category, cover_image_url, read_time, published_at, status, view_count, author_id, profiles:author_id(id, display_name, avatar_url)",
          )
          .eq("status", "published")
          .order("published_at", { ascending: false }),
        supabase
          .from("articles")
          .select(
            "id, title, excerpt, body, category, cover_image_url, read_time, published_at, status, view_count, author_id, profiles:author_id(id, display_name, avatar_url)",
          )
          .eq("status", "published")
          .order("view_count", { ascending: false })
          .limit(5),
        supabase
          .from("articles")
          .select("author_id, profiles:author_id(id, display_name, avatar_url)")
          .eq("status", "published"),
      ]);

      const cards = ((articleRows ?? []) as ArticleRow[]).map(toCard);
      setArticles(cards);
      setTrending(((trendingRows ?? []) as ArticleRow[]).map(toCard));

      const writerMap = new Map<string, { id: string; name: string; avatarUrl: string | null; count: number }>();
      for (const row of (writerRows ?? []) as WriterRow[]) {
        const p = normalizeProfile(row.profiles);
        const id = p?.id?.trim() || row.author_id?.trim() || "";
        if (!id) continue;
        const prev = writerMap.get(id);
        if (prev) {
          prev.count += 1;
        } else {
          writerMap.set(id, {
            id,
            name: p?.display_name?.trim() || "PinnacleMagic writer",
            avatarUrl: p?.avatar_url ?? null,
            count: 1,
          });
        }
      }
      setWriters(Array.from(writerMap.values()).sort((a, b) => b.count - a.count).slice(0, 4));
      setLoading(false);
    })();
  }, []);

  const categories = useMemo(() => {
    const dynamic = Array.from(
      new Set(articles.map((a) => a.category).filter((c) => Boolean(c.trim()))),
    );
    return ["All", ...dynamic];
  }, [articles]);

  const filtered = useMemo(() => {
    if (category === "All") return articles;
    return articles.filter((a) => a.category === category);
  }, [articles, category]);

  const hero = filtered[0];
  const gridArticles = filtered.slice(1, 7);
  const listStart = 7;
  const listCount = 4 + listExtra * 4;
  const listArticles = filtered.slice(listStart, listStart + listCount);
  const hasMore = filtered.length > listStart + listCount;

  return (
    <div className="min-h-0 flex-1 bg-black pb-20 pt-8 text-zinc-100 sm:pt-12">
      <div className={`${CLASSES.section} max-w-7xl`}>
        <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--ml-gold)]">
          The community voice
        </p>
        <h1 className="ml-font-heading text-4xl font-semibold tracking-tight text-zinc-50 sm:text-5xl">
          Articles &amp;{" "}
          <span className="text-[var(--ml-gold)] italic">editorial</span>
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base">
          Long-form interviews, technique breakdowns, reviews, and stories from
          magicians, fans, and venues across the directory.
        </p>

        {/* Category tabs */}
        <div className="mt-8 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((c) => {
            const count = c === "All" ? articles.length : articles.filter((a) => a.category === c).length;
            return (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setCategory(c);
                  setListExtra(0);
                }}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wider transition ${
                  category === c
                    ? "border-[var(--ml-gold)] bg-[var(--ml-gold)]/15 text-[var(--ml-gold)]"
                    : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/20 hover:text-zinc-200"
                }`}
              >
                {c}
                <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${category === c ? "bg-[var(--ml-gold)]/20 text-[var(--ml-gold)]" : "bg-white/10 text-zinc-500"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-10 flex flex-col gap-10 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1">
            {loading ? (
              <div className="space-y-6">
                <div className="h-64 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]" />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-48 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]" />
                  ))}
                </div>
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.02] px-8 py-16 text-center">
                <p className="ml-font-heading text-xl text-zinc-300">
                  No published articles yet.
                </p>
                <button
                  type="button"
                  onClick={() => setCategory("All")}
                  className={`${CLASSES.btnPrimary} mt-4`}
                >
                  View all
                </button>
              </div>
            ) : (
              <>
                {/* Featured */}
                {hero ? (
                  <Link
                    href={`/articles/${encodeURIComponent(hero.id)}`}
                    className="group mb-10 flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition hover:border-[var(--ml-gold)]/35 lg:flex-row lg:min-h-[320px]"
                  >
                    <div
                      className="relative h-48 shrink-0 bg-zinc-900 lg:h-auto lg:w-[42%]"
                    >
                      <span className="absolute left-4 top-4 hidden lg:block">
                        <span className={badgeClass(hero.category)}>
                          {hero.category}
                        </span>
                      </span>
                      {hero.coverImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={hero.coverImageUrl} alt="" className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <div className="flex flex-1 flex-col justify-center p-6 sm:p-8">
                      <span className={badgeClass(hero.category) + " lg:hidden"}>
                        {hero.category}
                      </span>
                      <h2 className="mt-3 ml-font-heading text-2xl font-semibold leading-tight text-zinc-50 group-hover:text-[var(--ml-gold)] sm:text-3xl">
                        {hero.title}
                      </h2>
                      {hero.excerpt ? (
                        <p className="mt-4 text-sm leading-relaxed text-zinc-400">
                          {hero.excerpt}
                        </p>
                      ) : (
                        <p className="mt-4 text-sm leading-relaxed text-zinc-500">
                          Read the full piece on PinnacleMagic.
                        </p>
                      )}
                      <div className="mt-6 flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-white/10 text-lg">
                          {hero.author.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={hero.author.avatarUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            "✍️"
                          )}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-zinc-200">
                            By {hero.author.name}
                          </p>
                          <p className="text-xs text-zinc-500">{hero.publishedAt} · {hero.readTime}</p>
                        </div>
                      </div>
                    </div>
                  </Link>
                ) : null}

                {/* 2x3 grid */}
                {gridArticles.length > 0 ? (
                  <div className="mb-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {gridArticles.map((a) => (
                      <Link
                        key={a.id}
                        href={`/articles/${encodeURIComponent(a.id)}`}
                        className="group overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/40 transition hover:border-[var(--ml-gold)]/30"
                      >
                        <div className="relative h-36 bg-zinc-900">
                          <span className="absolute left-3 top-3 z-10">
                            <span className={badgeClass(a.category)}>
                              {a.category}
                            </span>
                          </span>
                          {a.coverImageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={a.coverImageUrl} alt="" className="h-full w-full object-cover" />
                          ) : null}
                        </div>
                        <div className="p-4">
                          <h3 className="ml-font-heading text-lg font-semibold leading-snug text-zinc-100 group-hover:text-[var(--ml-gold)]">
                            {a.title}
                          </h3>
                          <p className="mt-3 text-xs text-zinc-500">
                            {a.author.name} · {a.publishedAt} · {a.readTime}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : null}

                {/* List rows */}
                {listArticles.length > 0 ? (
                  <div className="space-y-0 rounded-2xl border border-white/10 bg-white/[0.02]">
                    {listArticles.map((a) => (
                      <Link
                        key={a.id}
                        href={`/articles/${encodeURIComponent(a.id)}`}
                        className="group flex items-center gap-4 border-b border-white/10 p-4 transition last:border-0 hover:bg-white/[0.04] sm:gap-5 sm:p-5"
                      >
                        <div className="h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-zinc-900 sm:h-20 sm:w-24">
                          {a.coverImageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={a.coverImageUrl} alt="" className="h-full w-full object-cover" />
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className={badgeClass(a.category) + " mb-2"}>
                            {a.category}
                          </span>
                          <h3 className="mt-1 font-semibold text-zinc-100 group-hover:text-[var(--ml-gold)]">
                            {a.title}
                          </h3>
                          <p className="mt-1 text-xs text-zinc-500">
                            By {a.author.name} · {a.publishedAt} · {a.readTime}
                          </p>
                        </div>
                        <span className="shrink-0 text-[var(--ml-gold)] transition group-hover:translate-x-0.5">
                          →
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : null}

                {hasMore ? (
                  <button
                    type="button"
                    onClick={() => setListExtra((n) => n + 1)}
                    className={`${CLASSES.btnSecondary} mx-auto mt-8 flex w-full max-w-xs justify-center sm:w-auto`}
                  >
                    Load more
                  </button>
                ) : null}
              </>
            )}
          </div>

          <aside className="w-full shrink-0 space-y-8 lg:w-80">
            <div>
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Trending this week
              </h3>
              <ol className="space-y-4">
                {trending.map((a, i) => (
                  <li key={a.id} className="flex gap-3">
                    <span className="ml-font-heading w-6 shrink-0 text-lg font-semibold text-[var(--ml-gold)]/80">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <Link
                        href={`/articles/${encodeURIComponent(a.id)}`}
                        className="text-sm font-medium leading-snug text-zinc-200 hover:text-[var(--ml-gold)]"
                      >
                        {a.title}
                      </Link>
                      <p className="mt-1 text-[10px] uppercase tracking-wider text-zinc-500">
                        {a.category} ·{" "}
                        {a.viewCount >= 1000
                          ? `${(a.viewCount / 1000).toFixed(1)}k views`
                          : `${a.viewCount} views`}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div>
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Featured writers
              </h3>
              <ul className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                {writers.map((w) => (
                  <li
                    key={w.id}
                    className="flex items-center gap-3 rounded-xl px-2 py-2"
                  >
                    <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-white/10 text-lg">
                      {w.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={w.avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        "✍️"
                      )}
                    </span>
                    <div>
                      <Link href={`/profile/magician?id=${encodeURIComponent(w.id)}`} className="font-medium text-zinc-200 hover:text-[var(--ml-gold)]">
                        {w.name}
                      </Link>
                      <p className="text-xs text-zinc-500">
                        {w.count} {w.count === 1 ? "article" : "articles"}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-[var(--ml-gold)]/30 bg-[var(--ml-gold)]/10 p-6">
              <p className="ml-font-heading text-lg font-semibold text-zinc-100">
                Write for PinnacleMagic
              </p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                Pitch interviews, tutorials, reviews, or community stories. We
                read every submission.
              </p>
              <Link
                href="/submit-article"
                className={`${CLASSES.btnPrimary} mt-4 inline-flex w-full justify-center sm:w-full`}
              >
                Submit an article
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
