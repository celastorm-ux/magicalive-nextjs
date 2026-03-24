"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CLASSES } from "@/lib/constants";
import { supabase } from "@/lib/supabase";

const CATEGORIES = [
  "Interview",
  "Technique",
  "Review",
  "News",
  "History",
  "Community",
] as const;

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition focus:border-[var(--ml-gold)]/50 focus:bg-white/10";

const labelClass =
  "mb-2 block text-[10px] font-semibold uppercase tracking-wider text-zinc-500";

type ArticleRow = {
  id: string;
  author_id: string | null;
  title: string | null;
  excerpt: string | null;
  body: string | null;
  category: string | null;
  tags: string[] | null;
  read_time: number | null;
  cover_image_url: string | null;
  status: string | null;
  published_at: string | null;
  rejection_reason: string | null;
};

type Props = { articleId: string };

function normalizeTags(raw: unknown): string[] {
  if (!raw || !Array.isArray(raw)) return [];
  return raw.map((t) => String(t).trim()).filter(Boolean).slice(0, 24);
}

function categoryOptions(current: string | null): string[] {
  const c = (current || "").trim();
  const base: string[] = [...CATEGORIES];
  if (c && !base.includes(c)) base.unshift(c);
  return base;
}

function statusBadgeClass(st: string) {
  if (st === "published") return "border-emerald-500/40 text-emerald-300";
  if (st === "pending") return "border-[var(--ml-gold)]/40 text-[var(--ml-gold)]";
  if (st === "rejected") return "border-red-500/35 text-red-300";
  return "border-zinc-500/35 text-zinc-400";
}

export default function ArticleEditClient({ articleId }: Props) {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const coverFileRef = useRef<HTMLInputElement>(null);

  const [bootLoading, setBootLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [article, setArticle] = useState<ArticleRow | null>(null);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [excerpt, setExcerpt] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [coverPaste, setCoverPaste] = useState("");
  const [coverBusy, setCoverBusy] = useState(false);

  const [saveBusy, setSaveBusy] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [formErr, setFormErr] = useState("");

  const [adminBusy, setAdminBusy] = useState(false);
  const [adminErr, setAdminErr] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  const wordCount = useMemo(
    () => (body.trim() ? body.trim().split(/\s+/).filter(Boolean).length : 0),
    [body],
  );
  const readTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

  const loadArticle = useCallback(async () => {
    const { data, error } = await supabase
      .from("articles")
      .select(
        "id, author_id, title, excerpt, body, category, tags, read_time, cover_image_url, status, published_at, rejection_reason",
      )
      .eq("id", articleId)
      .maybeSingle();
    if (error || !data) return null;
    return data as ArticleRow;
  }, [articleId]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!user?.id) {
      router.replace("/sign-in");
      return;
    }

    let cancelled = false;
    void (async () => {
      setBootLoading(true);
      const [{ data: prof }, row] = await Promise.all([
        supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle(),
        loadArticle(),
      ]);
      if (cancelled) return;
      const admin = Boolean((prof as { is_admin?: boolean | null } | null)?.is_admin);
      setIsAdmin(admin);
      if (!row) {
        router.replace("/articles");
        return;
      }
      const isAuthor = row.author_id === user.id;
      if (!isAuthor && !admin) {
        router.replace("/articles");
        return;
      }
      setArticle(row);
      setTitle(row.title?.trim() || "");
      setExcerpt(row.excerpt?.trim() || "");
      setBody(row.body?.trim() || "");
      const rawCat = (row.category || "").trim();
      const opts = categoryOptions(row.category);
      setCategory(rawCat && opts.includes(rawCat) ? rawCat : CATEGORIES[0]);
      setTags(normalizeTags(row.tags));
      setCoverUrl(row.cover_image_url?.trim() || null);
      setBootLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, user?.id, articleId, router, loadArticle]);

  const insertAtCursor = (snippet: string) => {
    const el = bodyRef.current;
    if (!el) {
      setBody((b) => b + snippet);
      return;
    }
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    const before = body.slice(0, start);
    const after = body.slice(end);
    const next = before + snippet + after;
    setBody(next);
    const pos = start + snippet.length;
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  };

  const backHref = isAdmin ? "/admin" : "/dashboard";

  const uploadCoverFile = async (file: File) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setFormErr("Cover must be JPG, PNG, or WebP.");
      return;
    }
    setCoverBusy(true);
    setFormErr("");
    try {
      const path = `${articleId}/cover.jpg`;
      const { error: upErr } = await supabase.storage
        .from("article-covers")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw new Error(upErr.message);
      const { data: pub } = supabase.storage.from("article-covers").getPublicUrl(path);
      const publicUrl = pub.publicUrl;
      const { error: dbErr } = await supabase.from("articles").update({ cover_image_url: publicUrl }).eq("id", articleId);
      if (dbErr) throw new Error(dbErr.message);
      setCoverUrl(publicUrl);
      setArticle((a) => (a ? { ...a, cover_image_url: publicUrl } : a));
      if (coverFileRef.current) coverFileRef.current.value = "";
    } catch (e) {
      setFormErr(e instanceof Error ? e.message : "Cover upload failed");
    } finally {
      setCoverBusy(false);
    }
  };

  const applyCoverUrl = async () => {
    const raw = coverPaste.trim();
    if (!raw) return;
    let u: URL;
    try {
      u = new URL(raw);
    } catch {
      setFormErr("Enter a valid http(s) image URL.");
      return;
    }
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      setFormErr("URL must start with http:// or https://");
      return;
    }
    setCoverBusy(true);
    setFormErr("");
    try {
      const { error: dbErr } = await supabase.from("articles").update({ cover_image_url: raw }).eq("id", articleId);
      if (dbErr) throw new Error(dbErr.message);
      setCoverUrl(raw);
      setCoverPaste("");
      setArticle((a) => (a ? { ...a, cover_image_url: raw } : a));
    } catch (e) {
      setFormErr(e instanceof Error ? e.message : "Could not save image URL");
    } finally {
      setCoverBusy(false);
    }
  };

  const addTag = () => {
    const t = tagInput.trim().replace(/^#+/, "");
    if (!t || tags.includes(t)) return;
    if (tags.length >= 24) return;
    setTags((prev) => [...prev, t]);
    setTagInput("");
  };

  const saveArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !article) return;
    if (!title.trim() || !excerpt.trim() || !body.trim()) {
      setFormErr("Title, excerpt, and body are required.");
      return;
    }
    setSaveBusy(true);
    setFormErr("");
    setSaveOk(false);
    const now = new Date().toISOString();
    const payload: Record<string, unknown> = {
      title: title.trim(),
      excerpt: excerpt.trim(),
      body: body.trim(),
      category,
      read_time: readTimeMinutes,
      tags,
      updated_at: now,
    };
    const { error } = await supabase.from("articles").update(payload).eq("id", articleId);
    setSaveBusy(false);
    if (error) {
      setFormErr(error.message || "Save failed");
      return;
    }
    setSaveOk(true);
    window.setTimeout(() => setSaveOk(false), 4000);
    const next = await loadArticle();
    if (next) setArticle(next);
  };

  const adminPost = async (body: Record<string, unknown>) => {
    setAdminBusy(true);
    setAdminErr("");
    try {
      const res = await fetch("/api/admin/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error || "Request failed");
      const next = await loadArticle();
      if (next) {
        setArticle(next);
        setTitle(next.title?.trim() || "");
        setExcerpt(next.excerpt?.trim() || "");
        setBody(next.body?.trim() || "");
        setTags(normalizeTags(next.tags));
        setCoverUrl(next.cover_image_url?.trim() || null);
      }
    } catch (e) {
      setAdminErr(e instanceof Error ? e.message : "Action failed");
    } finally {
      setAdminBusy(false);
    }
  };

  const st = (article?.status || "").toLowerCase();

  if (!isLoaded || bootLoading) {
    return (
      <div className="flex min-h-[50vh] flex-1 items-center justify-center bg-black text-zinc-500">
        <div className="flex flex-col items-center gap-3">
          <span
            className="h-9 w-9 animate-spin rounded-full border-2 border-[var(--ml-gold)]/30 border-t-[var(--ml-gold)]"
            aria-hidden
          />
          <p className="text-sm">Loading article…</p>
        </div>
      </div>
    );
  }

  if (!article) return null;

  return (
    <div className="min-h-0 flex-1 bg-black pb-24 pt-8 text-zinc-100 sm:pt-10">
      <div className={`${CLASSES.section} max-w-4xl`}>
        <div className="mb-8 flex flex-wrap items-start gap-4">
          <Link
            href={backHref}
            className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 text-zinc-400 transition hover:border-[var(--ml-gold)]/35 hover:text-[var(--ml-gold)]"
            aria-label={isAdmin ? "Back to admin" : "Back to dashboard"}
          >
            <span className="text-lg leading-none">←</span>
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="ml-font-heading text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">
              Edit <span className="text-[var(--ml-gold)] italic">article</span>
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${statusBadgeClass(st)}`}
              >
                {article.status || "—"}
              </span>
            </div>
          </div>
        </div>

        {formErr ? <p className="mb-4 text-sm text-red-400">{formErr}</p> : null}
        {saveOk ? <p className="mb-4 text-sm font-medium text-emerald-400">Article saved</p> : null}
        {adminErr ? <p className="mb-4 text-sm text-red-400">{adminErr}</p> : null}

        <section className="mb-12">
          <h2 className="ml-font-heading text-xl font-semibold text-zinc-100">Cover image</h2>
          <div
            role="button"
            tabIndex={0}
            onClick={() => coverFileRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") coverFileRef.current?.click();
            }}
            className="relative mt-4 cursor-pointer overflow-hidden rounded-2xl border border-dashed border-[var(--ml-gold)]/30 bg-white/[0.02] transition hover:border-[var(--ml-gold)]/50 hover:bg-[var(--ml-gold)]/5"
          >
            <input
              ref={coverFileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void uploadCoverFile(f);
              }}
            />
            {coverUrl ? (
              <img src={coverUrl} alt="" className="aspect-[21/9] w-full object-cover sm:aspect-[2.4/1]" />
            ) : (
              <div className="flex aspect-[21/9] flex-col items-center justify-center px-6 py-10 sm:aspect-[2.4/1]">
                <p className="text-2xl opacity-60">📷</p>
                <p className="mt-2 text-sm text-zinc-400">Click to add a cover image</p>
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 py-3">
              <p className="text-center text-xs text-zinc-300">Click to change · JPG, PNG, WebP</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-end gap-2">
            <div className="min-w-[200px] flex-1">
              <label className={labelClass}>Or paste image URL</label>
              <input
                className={inputClass}
                value={coverPaste}
                onChange={(e) => setCoverPaste(e.target.value)}
                placeholder="https://…"
              />
            </div>
            <button
              type="button"
              disabled={coverBusy || !coverPaste.trim()}
              onClick={() => void applyCoverUrl()}
              className="rounded-xl border border-[var(--ml-gold)]/40 bg-[var(--ml-gold)]/10 px-4 py-2.5 text-xs font-semibold text-[var(--ml-gold)] transition hover:bg-[var(--ml-gold)]/20 disabled:opacity-40"
            >
              {coverBusy ? "Saving…" : "Apply URL"}
            </button>
          </div>
        </section>

        <form onSubmit={(e) => void saveArticle(e)} className="space-y-10">
          <section>
            <h2 className="ml-font-heading text-xl font-semibold text-zinc-100">Article details</h2>
            <div className="mt-6 space-y-4">
              <div>
                <label className={labelClass}>Title</label>
                <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Category</label>
                  <select
                    className={inputClass}
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    {categoryOptions(category).map((c) => (
                      <option key={c} value={c} className="bg-zinc-900">
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Read time</label>
                  <input className={inputClass} readOnly value={`${readTimeMinutes} min read`} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Excerpt</label>
                <textarea
                  className={`${inputClass} min-h-[100px] resize-y`}
                  rows={4}
                  required
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                />
              </div>
            </div>
          </section>

          <section>
            <h2 className="ml-font-heading text-xl font-semibold text-zinc-100">Article body</h2>
            <div className="mt-3 flex flex-wrap gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-2">
              <span className="w-full pl-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 sm:w-auto sm:pr-2">
                Insert
              </span>
              {(
                [
                  { label: "H2", text: "## " },
                  { label: "H3", text: "### " },
                  { label: "Break", text: "\n\n" },
                  { label: "List", text: "\n- " },
                ] as const
              ).map((b) => (
                <button
                  key={b.label}
                  type="button"
                  onClick={() => insertAtCursor(b.text)}
                  className="rounded-lg border border-white/10 bg-black/40 px-2.5 py-1 text-xs font-medium text-zinc-300 transition hover:border-[var(--ml-gold)]/35 hover:text-[var(--ml-gold)]"
                >
                  {b.label}
                </button>
              ))}
            </div>
            <textarea
              ref={bodyRef}
              className={`${inputClass} mt-3 min-h-[320px] resize-y font-mono text-sm leading-relaxed`}
              required
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Use ## headings and blank lines between paragraphs."
            />
            <p className="mt-2 text-right text-xs text-zinc-500">
              {wordCount} {wordCount === 1 ? "word" : "words"}
            </p>
          </section>

          <section>
            <h2 className="ml-font-heading text-xl font-semibold text-zinc-100">Tags</h2>
            <div className="mt-4 flex min-h-[42px] flex-wrap gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-3">
              {tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--ml-gold)]/25 bg-[var(--ml-gold)]/10 px-2.5 py-1 text-xs text-[var(--ml-gold)]"
                >
                  {t}
                  <button
                    type="button"
                    onClick={() => setTags((prev) => prev.filter((x) => x !== t))}
                    className="ml-0.5 rounded-full px-1 text-zinc-400 hover:text-zinc-100"
                    aria-label={`Remove ${t}`}
                  >
                    ×
                  </button>
                </span>
              ))}
              {tags.length === 0 ? <span className="self-center text-xs text-zinc-600">No tags yet</span> : null}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <input
                className={`${inputClass} max-w-xs flex-1`}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="Add tag, press Enter"
              />
              <button
                type="button"
                onClick={addTag}
                className={CLASSES.btnSecondarySm}
              >
                Add tag
              </button>
            </div>
          </section>

          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={saveBusy} className={CLASSES.btnPrimary}>
              {saveBusy ? "Saving…" : "Save changes"}
            </button>
            <Link href={`/articles/${encodeURIComponent(articleId)}/preview`} className={CLASSES.btnSecondary}>
              Preview
            </Link>
          </div>
        </form>

        {isAdmin ? (
          <section className="mt-14 rounded-2xl border border-red-500/20 bg-red-500/[0.04] p-6">
            <h2 className="ml-font-heading text-lg font-semibold text-red-200/90">Admin moderation</h2>
            <p className="mt-1 text-xs text-zinc-500">These actions affect live status and author notifications where applicable.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={adminBusy || st === "published"}
                onClick={() => void adminPost({ action: "publish", articleId })}
                className={CLASSES.btnPrimarySm}
              >
                Publish
              </button>
              <button
                type="button"
                disabled={adminBusy || st === "pending"}
                onClick={() => void adminPost({ action: "unpublish", articleId })}
                className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-200 transition hover:border-amber-500/35 hover:bg-amber-500/10 disabled:opacity-40"
              >
                Unpublish
              </button>
              <div className="flex w-full min-w-[200px] max-w-md flex-1 flex-wrap items-end gap-2 sm:w-auto">
                <input
                  className={`${inputClass} min-w-[160px] flex-1`}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Rejection reason (required)"
                />
                <button
                  type="button"
                  disabled={adminBusy || !rejectReason.trim()}
                  onClick={() => {
                    const reason = rejectReason.trim();
                    if (!reason) return;
                    void adminPost({ action: "reject", articleId, reason }).then(() => setRejectReason(""));
                  }}
                  className="rounded-lg border border-red-500/40 px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/10 disabled:opacity-40"
                >
                  Reject
                </button>
              </div>
              <button
                type="button"
                disabled={adminBusy}
                onClick={() => {
                  if (!window.confirm("Permanently delete this article?")) return;
                  void (async () => {
                    setAdminBusy(true);
                    setAdminErr("");
                    try {
                      const res = await fetch("/api/admin/articles", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "delete", articleId }),
                      });
                      const json = (await res.json()) as { ok?: boolean; error?: string };
                      if (!res.ok || !json.ok) throw new Error(json.error || "Delete failed");
                      router.replace("/admin?tab=articles");
                    } catch (e) {
                      setAdminErr(e instanceof Error ? e.message : "Delete failed");
                    } finally {
                      setAdminBusy(false);
                    }
                  })();
                }}
                className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/20"
              >
                Delete
              </button>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
