"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CLASSES } from "@/lib/constants";
import { supabase } from "@/lib/supabase";

export type ArticleDetailMode = "public" | "preview";

export type ArticleDetailRow = {
  id: string;
  author_id: string | null;
  title: string | null;
  excerpt: string | null;
  body: string | null;
  category: string | null;
  tags: string[] | null;
  read_time: string | number | null;
  cover_image_url: string | null;
  published_at: string | null;
  view_count: number | null;
  like_count: number | null;
  status: string | null;
  profiles:
    | { id: string | null; display_name: string | null; avatar_url: string | null }
    | Array<{ id: string | null; display_name: string | null; avatar_url: string | null }>
    | null;
};

export type MiniArticle = {
  id: string;
  title: string;
  category: string;
  coverImageUrl: string | null;
};

export type ArticleInitialPublic = {
  article: ArticleDetailRow;
  related: MiniArticle[];
  moreArticles: MiniArticle[];
};

type Heading = { id: string; text: string };

function normalizeProfile(
  p:
    | { id: string | null; display_name: string | null; avatar_url: string | null }
    | Array<{ id: string | null; display_name: string | null; avatar_url: string | null }>
    | null,
) {
  if (!p) return null;
  return Array.isArray(p) ? (p[0] ?? null) : p;
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

function formatReadTime(rt: string | number | null | undefined): string {
  if (rt == null || rt === "") return "5 min read";
  if (typeof rt === "number" && Number.isFinite(rt)) {
    return `${Math.max(1, Math.round(rt))} min read`;
  }
  const s = String(rt).trim();
  if (/^\d+$/.test(s)) return `${Math.max(1, parseInt(s, 10))} min read`;
  return s;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 64);
}

const YT_ID_RE = /^[a-zA-Z0-9_-]{11}$/;

function parseBody(body: string) {
  const lines = body.split(/\r?\n/);
  const blocks: Array<{ type: "h2" | "h3" | "p" | "quote"; text: string; id?: string }> = [];
  const headings: Heading[] = [];
  const videos: string[] = [];

  let paragraph: string[] = [];
  const flushParagraph = () => {
    const text = paragraph.join(" ").trim();
    if (text) blocks.push({ type: "p", text });
    paragraph = [];
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushParagraph();
      continue;
    }
    if (line.startsWith("### ")) {
      flushParagraph();
      const text = line.replace(/^###\s+/, "").trim();
      blocks.push({ type: "h3", text });
      continue;
    }
    if (line.startsWith("## ")) {
      flushParagraph();
      const text = line.replace(/^##\s+/, "").trim();
      const id = `toc-${slugify(text)}`;
      blocks.push({ type: "h2", text, id });
      headings.push({ id, text });
      continue;
    }
    if (line.startsWith("> ")) {
      flushParagraph();
      blocks.push({ type: "quote", text: line.replace(/^>\s+/, "").trim() });
      continue;
    }
    const ytMatch = /^\[youtube:([^\]]+)\]$/.exec(line);
    if (ytMatch) {
      flushParagraph();
      const videoId = ytMatch[1]!.trim();
      if (YT_ID_RE.test(videoId)) {
        videos.push(videoId);
      }
      continue;
    }
    paragraph.push(line);
  }
  flushParagraph();
  return { blocks, headings, videos };
}

export function ArticleDetailClient({
  mode,
  initialPublic = null,
}: {
  mode: ArticleDetailMode;
  initialPublic?: ArticleInitialPublic | null;
}) {
  const router = useRouter();
  const { user, isLoaded: userLoaded } = useUser();
  const params = useParams<{ id: string }>();
  const articleId = decodeURIComponent(String(params?.id ?? ""));

  const [loading, setLoading] = useState(() => !(mode === "public" && initialPublic?.article));
  const [article, setArticle] = useState<ArticleDetailRow | null>(
    () => (mode === "public" && initialPublic?.article ? initialPublic.article : null),
  );
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [likeCount, setLikeCount] = useState(() =>
    mode === "public" && initialPublic?.article ? Number(initialPublic.article.like_count ?? 0) : 0,
  );
  const [related, setRelated] = useState<MiniArticle[]>(
    () => (mode === "public" && initialPublic ? initialPublic.related : []),
  );
  const [moreArticles, setMoreArticles] = useState<MiniArticle[]>(
    () => (mode === "public" && initialPublic ? initialPublic.moreArticles : []),
  );
  const [progress, setProgress] = useState(0);
  const [activeSection, setActiveSection] = useState<string>("");
  const articleRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!articleId || !userLoaded) return;
    void (async () => {
      const useServerArticle =
        mode === "public" && initialPublic?.article && initialPublic.article.id === articleId;

      if (!useServerArticle) setLoading(true);

      let artData: ArticleDetailRow | null = null;
      if (useServerArticle) {
        artData = initialPublic!.article;
      } else {
        const res = await supabase
          .from("articles")
          .select(
            "id, author_id, title, excerpt, body, category, tags, read_time, cover_image_url, published_at, view_count, like_count, status, profiles:author_id(id, display_name, avatar_url)",
          )
          .eq("id", articleId)
          .maybeSingle();
        if (res.error || !res.data) {
          setArticle(null);
          setLoading(false);
          return;
        }
        artData = res.data as ArticleDetailRow;
      }

      let isAdminUser = false;
      if (user?.id) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", user.id)
          .maybeSingle();
        isAdminUser = Boolean((prof as { is_admin?: boolean | null } | null)?.is_admin);
      }

      if (!artData) {
        setArticle(null);
        setLoading(false);
        return;
      }

      const row = artData;
      const status = (row.status || "").toLowerCase();
      const isAuthor = Boolean(user?.id && user.id === row.author_id);

      if (mode === "preview") {
        if (!isAuthor && !isAdminUser) {
          setArticle(null);
          setLoading(false);
          return;
        }
      } else {
        if (status !== "published" && !isAuthor && !isAdminUser) {
          setArticle(null);
          setLoading(false);
          return;
        }
      }

      setArticle(row);
      setLikeCount(Number(row.like_count ?? 0));

      const bumpViews =
        mode === "public" && status === "published" && (!user?.id || user.id !== row.author_id);
      if (bumpViews) {
        const nextViews = Number(row.view_count ?? 0) + 1;
        void supabase.from("articles").update({ view_count: nextViews }).eq("id", row.id);
      }

      if (user?.id) {
        const [{ data: likedRow }, { data: savedRow }] = await Promise.all([
          supabase
            .from("article_likes")
            .select("id")
            .eq("article_id", row.id)
            .eq("user_id", user.id)
            .maybeSingle(),
          supabase
            .from("article_saves")
            .select("id")
            .eq("article_id", row.id)
            .eq("user_id", user.id)
            .maybeSingle(),
        ]);
        setLiked(Boolean(likedRow));
        setSaved(Boolean(savedRow));
      } else {
        setLiked(false);
        setSaved(false);
      }

      if (useServerArticle) {
        setRelated(initialPublic.related);
        setMoreArticles(initialPublic.moreArticles);
      } else {
        const sameCategory = row.category?.trim() || "";
        const [{ data: relRows }, { data: moreRows }] = await Promise.all([
          supabase
            .from("articles")
            .select("id, title, category, cover_image_url")
            .eq("status", "published")
            .eq("category", sameCategory)
            .neq("id", row.id)
            .order("published_at", { ascending: false })
            .limit(3),
          supabase
            .from("articles")
            .select("id, title, category, cover_image_url")
            .eq("status", "published")
            .neq("id", row.id)
            .order("published_at", { ascending: false })
            .limit(3),
        ]);
        setRelated(
          ((relRows ?? []) as Array<{ id: string; title: string | null; category: string | null; cover_image_url: string | null }>).map(
            (r) => ({
              id: r.id,
              title: r.title?.trim() || "Untitled article",
              category: r.category?.trim() || "General",
              coverImageUrl: r.cover_image_url,
            }),
          ),
        );
        setMoreArticles(
          ((moreRows ?? []) as Array<{ id: string; title: string | null; category: string | null; cover_image_url: string | null }>).map(
            (r) => ({
              id: r.id,
              title: r.title?.trim() || "Untitled article",
              category: r.category?.trim() || "General",
              coverImageUrl: r.cover_image_url,
            }),
          ),
        );
      }
      setLoading(false);
    })();
  }, [articleId, user?.id, userLoaded, mode, initialPublic]);

  const parsed = useMemo(() => parseBody(article?.body?.trim() || ""), [article?.body]);

  useEffect(() => {
    if (!parsed.headings.length) return;
    setActiveSection(parsed.headings[0]!.id);
  }, [parsed.headings]);

  const updateScrollState = useCallback(() => {
    const root = articleRef.current;
    if (!root) return;
    const top = root.getBoundingClientRect().top + window.scrollY;
    const h = root.offsetHeight;
    const vh = window.innerHeight;
    const y = window.scrollY;
    const start = top - 100;
    const end = top + h - vh * 0.75;
    const denom = Math.max(end - start, 1);
    const pct = ((y - start) / denom) * 100;
    setProgress(Math.min(100, Math.max(0, pct)));

    if (!parsed.headings.length) return;
    const anchor = window.innerHeight * 0.28;
    let current = parsed.headings[0]!.id;
    for (const hItem of parsed.headings) {
      const el = document.getElementById(hItem.id);
      if (el && el.getBoundingClientRect().top <= anchor) current = hItem.id;
    }
    setActiveSection(current);
  }, [parsed.headings]);

  useEffect(() => {
    updateScrollState();
    window.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      window.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [updateScrollState]);

  const toggleLike = async () => {
    if (!user?.id || !article) return;
    const nextLiked = !liked;
    setLiked(nextLiked);
    const nextCount = Math.max(0, likeCount + (nextLiked ? 1 : -1));
    setLikeCount(nextCount);
    if (nextLiked) {
      await supabase.from("article_likes").insert({ article_id: article.id, user_id: user.id });
    } else {
      await supabase.from("article_likes").delete().eq("article_id", article.id).eq("user_id", user.id);
    }
    await supabase.from("articles").update({ like_count: nextCount }).eq("id", article.id);
  };

  const toggleSave = async () => {
    if (!user?.id || !article) return;
    const nextSaved = !saved;
    setSaved(nextSaved);
    if (nextSaved) {
      await supabase.from("article_saves").insert({ article_id: article.id, user_id: user.id });
    } else {
      await supabase.from("article_saves").delete().eq("article_id", article.id).eq("user_id", user.id);
    }
  };

  const copyLink = async () => {
    if (!article) return;
    try {
      const url =
        mode === "preview"
          ? `${window.location.origin}/articles/${encodeURIComponent(article.id)}`
          : window.location.href;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const previewBannerText =
    article?.status === "pending"
      ? "Preview mode — this article is pending review"
      : article?.status === "rejected"
        ? "Preview mode — this article was not approved (visible only to you)"
        : "Preview mode — not yet published";

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-zinc-500">
        Loading article...
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-black px-6 py-20 text-zinc-100">
        <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
          <h1 className="ml-font-heading text-3xl text-zinc-100">Article not found</h1>
          <p className="mt-3 text-sm text-zinc-500">
            {mode === "preview"
              ? "You don’t have access to this preview, or the article doesn’t exist."
              : "This article may be unpublished or removed."}
          </p>
          <Link href="/articles" className={`${CLASSES.btnPrimary} mt-6 inline-flex`}>
            Back to articles
          </Link>
        </div>
      </div>
    );
  }

  const author = normalizeProfile(article.profiles);
  const authorName = author?.display_name?.trim() || "PinnacleMagic writer";
  const authorId = author?.id?.trim() || article.author_id || "";
  const tags = (article.tags ?? []).filter((t) => Boolean(t?.trim()));

  return (
    <div className="min-h-0 flex-1 bg-black pb-24 text-zinc-100">
      {mode === "preview" ? (
        <div className="border-b border-[var(--ml-gold)]/40 bg-[var(--ml-gold)]/15 px-4 py-3 text-center text-sm font-medium text-[var(--ml-gold)]">
          {previewBannerText}
        </div>
      ) : null}

      <div className="relative h-64 sm:h-80 md:h-96">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-950 via-purple-900 to-indigo-950" />
        {article.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={article.cover_image_url} alt="" className="absolute inset-0 h-full w-full object-cover object-top opacity-55" />
        ) : null}
        <span className="absolute left-4 top-4 sm:left-8 sm:top-6">
          <span className="rounded-full border border-[var(--ml-gold)]/35 bg-black/40 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--ml-gold)] backdrop-blur-sm">
            {article.category || "General"}
          </span>
        </span>
        <span className="absolute right-4 top-4 text-sm text-zinc-400 sm:right-8 sm:top-6">
          {formatReadTime(article.read_time)}
        </span>
      </div>

      <div className={`${CLASSES.section} max-w-6xl`}>
        <header className="mx-auto max-w-3xl pt-10">
          <h1 className="ml-font-heading text-3xl font-semibold leading-tight tracking-tight text-zinc-50 sm:text-4xl md:text-5xl">
            {article.title || "Untitled article"}
          </h1>
          <p className="mt-4 text-lg text-zinc-400 sm:text-xl">{article.excerpt || "Read the full article below."}</p>

          <div className="mt-8 flex flex-col gap-4 border-y border-white/10 py-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 text-2xl">
                {author?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={author.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  "✍️"
                )}
              </span>
              <div>
                {authorId ? (
                  <Link
                    href={`/profile/magician?id=${encodeURIComponent(authorId)}`}
                    className="font-semibold text-zinc-100 hover:text-[var(--ml-gold)]"
                  >
                    {authorName}
                  </Link>
                ) : (
                  <p className="font-semibold text-zinc-100">{authorName}</p>
                )}
                <p className="text-sm text-[var(--ml-gold)]">Author</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-zinc-500">
              <span>{fmtDate(article.published_at)}</span>
              <span>{Number(article.view_count ?? 0).toLocaleString()} views</span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void copyLink()}
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-zinc-300 transition hover:border-white/25 hover:text-zinc-100"
              >
                {copied ? "Copied" : "Share"}
              </button>
            </div>
          </div>
        </header>

        <div className="mt-12 flex flex-col gap-12 lg:flex-row lg:items-start">
          <article ref={articleRef} className="min-w-0 flex-1 lg:max-w-3xl">
            <div className="prose prose-invert max-w-none">
              {parsed.blocks.length ? (
                parsed.blocks.map((block, idx) => {
                  if (block.type === "h2") {
                    return (
                      <h2 key={idx} id={block.id} className="scroll-mt-28 mt-14 ml-font-heading text-2xl font-semibold text-zinc-100">
                        {block.text}
                      </h2>
                    );
                  }
                  if (block.type === "h3") {
                    return (
                      <h3 key={idx} id={block.id} className="scroll-mt-28 mt-10 ml-font-heading text-xl font-semibold text-zinc-100">
                        {block.text}
                      </h3>
                    );
                  }
                  if (block.type === "quote") {
                    return (
                      <blockquote
                        key={idx}
                        className="my-8 border-l-4 border-[var(--ml-gold)] bg-white/[0.02] py-3 pl-5 pr-4 text-lg italic leading-relaxed text-zinc-300"
                      >
                        {block.text}
                      </blockquote>
                    );
                  }
                  return (
                    <p key={idx} className="mt-4 text-base leading-relaxed text-zinc-400">
                      {block.text}
                    </p>
                  );
                })
              ) : (
                <p className="text-base leading-relaxed text-zinc-400">{article.body || "No content."}</p>
              )}
            </div>

            {parsed.videos.length ? (
              <div className="mt-12 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                <p className="mb-4 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  {parsed.videos.length === 1 ? "Video" : "Videos"}
                </p>
                <div className="space-y-5">
                  {parsed.videos.map((videoId, idx) => (
                    <div key={idx} className="overflow-hidden rounded-xl border border-white/10">
                      <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                        <iframe
                          className="absolute inset-0 h-full w-full"
                          src={`https://www.youtube-nocookie.com/embed/${videoId}`}
                          title={`Video ${idx + 1}`}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <footer className="mt-14 border-t border-white/10 pt-8">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Topics</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {tags.length ? (
                  tags.map((t) => (
                    <Link key={t} href="/articles" className={CLASSES.tag + " hover:border-[var(--ml-gold)]/40"}>
                      {t}
                    </Link>
                  ))
                ) : (
                  <span className="text-sm text-zinc-600">No tags</span>
                )}
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void toggleLike()}
                  className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                    liked
                      ? "border-[var(--ml-gold)]/50 bg-[var(--ml-gold)]/15 text-[var(--ml-gold)]"
                      : "border-white/15 bg-white/5 text-zinc-300 hover:border-white/25"
                  }`}
                >
                  <span>{liked ? "♥" : "♡"}</span>
                  <span>{likeCount.toLocaleString()}</span>
                </button>
                <button
                  type="button"
                  onClick={() => void toggleSave()}
                  className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                    saved
                      ? "border-[var(--ml-gold)]/50 bg-[var(--ml-gold)]/10 text-[var(--ml-gold)]"
                      : "border-white/15 bg-white/5 text-zinc-300 hover:border-white/25"
                  }`}
                >
                  {saved ? "Saved" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => void copyLink()}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:border-white/25"
                >
                  {copied ? "Copied" : "Share"}
                </button>
              </div>
            </footer>

            <div className="mt-16">
              <h2 className="ml-font-heading text-xl font-semibold text-zinc-100">More to read</h2>
              <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
                {moreArticles.map((a) => (
                  <Link
                    key={a.id}
                    href={`/articles/${encodeURIComponent(a.id)}`}
                    className="group overflow-hidden rounded-2xl border border-white/10 transition hover:border-[var(--ml-gold)]/30"
                  >
                    <div className="h-28 bg-gradient-to-br from-violet-950 via-purple-900 to-indigo-950">
                      {a.coverImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.coverImageUrl} alt="" className="h-full w-full object-cover opacity-70" />
                      ) : null}
                    </div>
                    <div className="p-4">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ml-gold)]">{a.category}</span>
                      <p className="mt-2 text-sm font-semibold leading-snug text-zinc-200 group-hover:text-[var(--ml-gold)]">{a.title}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </article>

          <aside className="top-24 w-full shrink-0 space-y-8 lg:sticky lg:w-72">
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Reading progress</p>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[var(--ml-gold)] transition-[width] duration-150 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {parsed.headings.length ? (
              <div>
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">In this article</p>
                <nav className="space-y-0.5 border-l border-white/10">
                  {parsed.headings.map((h) => (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => document.getElementById(h.id)?.scrollIntoView({ behavior: "smooth" })}
                      className={`block w-full border-l-2 py-2 pl-4 text-left text-sm transition ${
                        activeSection === h.id
                          ? "-ml-px border-[var(--ml-gold)] font-medium text-[var(--ml-gold)]"
                          : "border-transparent text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      {h.text}
                    </button>
                  ))}
                </nav>
              </div>
            ) : null}

            <div>
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Related reading</p>
              <div className="space-y-3">
                {related.map((r) => (
                  <Link
                    key={r.id}
                    href={`/articles/${encodeURIComponent(r.id)}`}
                    className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 transition hover:border-[var(--ml-gold)]/25"
                  >
                    <div className="h-14 w-16 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-violet-950 via-purple-900 to-indigo-950">
                      {r.coverImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.coverImageUrl} alt="" className="h-full w-full object-cover opacity-70" />
                      ) : null}
                    </div>
                    <p className="text-xs font-medium leading-snug text-zinc-300 hover:text-[var(--ml-gold)]">{r.title}</p>
                  </Link>
                ))}
                {!related.length ? <p className="text-xs text-zinc-500">No related articles yet.</p> : null}
              </div>
            </div>

            <button type="button" onClick={() => router.push("/articles")} className={`${CLASSES.btnSecondary} w-full justify-center`}>
              Back to articles
            </button>
          </aside>
        </div>
      </div>
    </div>
  );
}
