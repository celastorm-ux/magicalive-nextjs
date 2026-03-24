"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { CLASSES } from "@/lib/constants";
import { supabase } from "@/lib/supabase";

type AdminTab = "articles" | "magicians" | "venues" | "users";

type ArticleAdminRow = {
  id: string;
  title: string | null;
  excerpt: string | null;
  body: string | null;
  category: string | null;
  status: string | null;
  author_id: string | null;
  author_name: string | null;
  published_at: string | null;
  created_at: string | null;
  view_count: number | null;
  like_count: number | null;
  rejection_reason: string | null;
  cover_image_url: string | null;
};

type MagicianAdminRow = {
  id: string;
  display_name: string | null;
  location: string | null;
  is_verified: boolean | null;
  updated_at: string | null;
  created_at: string | null;
  review_count: number | null;
  show_count: number;
};

type VenueAdminRow = {
  id: string;
  name: string | null;
  city: string | null;
  venue_type: string | null;
  created_at: string | null;
  is_verified: boolean | null;
};

type UserAdminRow = {
  id: string;
  display_name: string | null;
  email: string | null;
  account_type: string | null;
  is_admin: boolean | null;
  updated_at: string | null;
  created_at: string | null;
};

const TABS: Array<{ id: AdminTab; label: string }> = [
  { id: "articles", label: "Articles" },
  { id: "magicians", label: "Magicians" },
  { id: "venues", label: "Venues" },
  { id: "users", label: "Users" },
];

function wordCount(body: string | null | undefined): number {
  const t = body?.trim() || "";
  if (!t) return 0;
  return t.split(/\s+/).filter(Boolean).length;
}

function fmtShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function AdminClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoaded } = useUser();

  const tabParam = searchParams.get("tab") as AdminTab | null;
  const tab: AdminTab = TABS.some((t) => t.id === tabParam) ? (tabParam as AdminTab) : "articles";

  const [gateLoading, setGateLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  const [articles, setArticles] = useState<ArticleAdminRow[]>([]);
  const [articleFilter, setArticleFilter] = useState<"all" | "pending" | "published" | "rejected">("all");
  const [magicians, setMagicians] = useState<MagicianAdminRow[]>([]);
  const [venues, setVenues] = useState<VenueAdminRow[]>([]);
  const [users, setUsers] = useState<UserAdminRow[]>([]);

  const [dataLoading, setDataLoading] = useState(false);
  const [actionErr, setActionErr] = useState("");

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectArticleId, setRejectArticleId] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [pasteUrl, setPasteUrl] = useState("");
  const [coverSaving, setCoverSaving] = useState(false);
  const [coverSuccessId, setCoverSuccessId] = useState<string | null>(null);
  const coverFileInputRef = useRef<HTMLInputElement | null>(null);

  const setTab = useCallback(
    (next: AdminTab) => {
      const p = new URLSearchParams(searchParams.toString());
      p.set("tab", next);
      router.replace(`/admin?${p.toString()}`);
    },
    [router, searchParams],
  );

  useEffect(() => {
    if (!isLoaded) return;
    if (!user?.id) {
      router.replace("/sign-in");
      return;
    }
    void (async () => {
      const { data } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
      const ok = Boolean((data as { is_admin?: boolean | null } | null)?.is_admin);
      setAllowed(ok);
      setGateLoading(false);
      if (!ok) {
        router.replace("/");
      }
    })();
  }, [isLoaded, user?.id, router]);

  const fetchTab = useCallback(async () => {
    if (!allowed) return;
    setDataLoading(true);
    setActionErr("");
    try {
      if (tab === "articles") {
        const res = await fetch("/api/admin/articles");
        const json = (await res.json()) as { ok?: boolean; articles?: ArticleAdminRow[]; error?: string };
        if (!res.ok || !json.ok) throw new Error(json.error || "Failed to load articles");
        setArticles(json.articles ?? []);
      } else if (tab === "magicians") {
        const res = await fetch("/api/admin/magicians");
        const json = (await res.json()) as { ok?: boolean; magicians?: MagicianAdminRow[]; error?: string };
        if (!res.ok || !json.ok) throw new Error(json.error || "Failed to load magicians");
        setMagicians(json.magicians ?? []);
      } else if (tab === "venues") {
        const res = await fetch("/api/admin/venues");
        const json = (await res.json()) as { ok?: boolean; venues?: VenueAdminRow[]; error?: string };
        if (!res.ok || !json.ok) throw new Error(json.error || "Failed to load venues");
        setVenues(json.venues ?? []);
      } else if (tab === "users") {
        const res = await fetch("/api/admin/users");
        const json = (await res.json()) as { ok?: boolean; users?: UserAdminRow[]; error?: string };
        if (!res.ok || !json.ok) throw new Error(json.error || "Failed to load users");
        setUsers(json.users ?? []);
      }
    } catch (e) {
      setActionErr(e instanceof Error ? e.message : "Request failed");
    } finally {
      setDataLoading(false);
    }
  }, [allowed, tab]);

  useEffect(() => {
    if (!gateLoading && allowed) void fetchTab();
  }, [gateLoading, allowed, fetchTab]);

  const filteredArticles = useMemo(() => {
    if (articleFilter === "all") return articles;
    return articles.filter((a) => (a.status || "").toLowerCase() === articleFilter);
  }, [articles, articleFilter]);

  useEffect(() => {
    if (tab === "articles" && !dataLoading && articles.length === 0) {
      console.log("Articles:", articles);
    }
  }, [tab, dataLoading, articles]);

  const publishArticle = async (id: string) => {
    setActionErr("");
    const res = await fetch("/api/admin/articles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "publish", articleId: id }),
    });
    const json = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || !json.ok) {
      setActionErr(json.error || "Publish failed");
      return;
    }
    void fetchTab();
  };

  const unpublishArticle = async (id: string) => {
    setActionErr("");
    const res = await fetch("/api/admin/articles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "unpublish", articleId: id }),
    });
    const json = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || !json.ok) {
      setActionErr(json.error || "Unpublish failed");
      return;
    }
    void fetchTab();
  };

  const deleteArticle = async (id: string) => {
    if (!window.confirm("Permanently delete this article? This cannot be undone.")) return;
    setActionErr("");
    const res = await fetch("/api/admin/articles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", articleId: id }),
    });
    const json = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || !json.ok) {
      setActionErr(json.error || "Delete failed");
      return;
    }
    void fetchTab();
  };

  const submitReject = async () => {
    const reason = rejectReason.trim();
    if (!reason || !rejectArticleId) return;
    setActionErr("");
    const res = await fetch("/api/admin/articles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject", articleId: rejectArticleId, reason }),
    });
    const json = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || !json.ok) {
      setActionErr(json.error || "Reject failed");
      return;
    }
    setRejectOpen(false);
    setRejectArticleId("");
    setRejectReason("");
    void fetchTab();
  };

  const toggleMagicianVerified = async (profileId: string, next: boolean) => {
    setActionErr("");
    const res = await fetch("/api/admin/magicians", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId, is_verified: next }),
    });
    const json = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || !json.ok) {
      setActionErr(json.error || "Update failed");
      return;
    }
    void fetchTab();
  };

  const venueDecision = async (venueId: string, decision: "approve" | "reject") => {
    setActionErr("");
    const res = await fetch("/api/admin/venues", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ venueId, decision }),
    });
    const json = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || !json.ok) {
      setActionErr(json.error || "Update failed");
      return;
    }
    void fetchTab();
  };

  const toggleUserAdmin = async (uid: string, next: boolean) => {
    setActionErr("");
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: uid, is_admin: next }),
    });
    const json = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || !json.ok) {
      setActionErr(json.error || "Update failed");
      return;
    }
    void fetchTab();
  };

  const deleteUser = async (uid: string) => {
    if (!window.confirm("Permanently delete this account? This cannot be undone.")) return;
    setActionErr("");
    const res = await fetch(`/api/admin/users?userId=${encodeURIComponent(uid)}`, { method: "DELETE" });
    const json = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || !json.ok) {
      setActionErr(json.error || "Delete failed");
      return;
    }
    void fetchTab();
  };

  const closeImageUpload = useCallback(() => {
    setFilePreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setSelectedFile(null);
    setPasteUrl("");
    setUploadingFor(null);
    if (coverFileInputRef.current) coverFileInputRef.current.value = "";
  }, []);

  const openImageUpload = (articleId: string) => {
    setFilePreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setSelectedFile(null);
    setPasteUrl("");
    setUploadingFor(articleId);
    if (coverFileInputRef.current) coverFileInputRef.current.value = "";
    setActionErr("");
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!["image/jpeg", "image/png"].includes(f.type)) {
      setActionErr("Please choose a JPG or PNG file.");
      return;
    }
    setActionErr("");
    setSelectedFile(f);
    setFilePreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(f);
    });
  };

  const uploadCoverImage = async (articleId: string) => {
    if (!selectedFile) return;
    setCoverSaving(true);
    setActionErr("");
    try {
      const path = `${articleId}/cover.jpg`;
      const { error: upErr } = await supabase.storage
        .from("article-covers")
        .upload(path, selectedFile, { upsert: true, contentType: selectedFile.type });
      if (upErr) throw new Error(upErr.message);
      const { data: pub } = supabase.storage.from("article-covers").getPublicUrl(path);
      const publicUrl = pub.publicUrl;
      const { error: dbErr } = await supabase.from("articles").update({ cover_image_url: publicUrl }).eq("id", articleId);
      if (dbErr) throw new Error(dbErr.message);
      closeImageUpload();
      setCoverSuccessId(articleId);
      window.setTimeout(() => {
        setCoverSuccessId((id) => (id === articleId ? null : id));
      }, 3800);
      void fetchTab();
    } catch (e) {
      setActionErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setCoverSaving(false);
    }
  };

  const saveImageUrl = async (articleId: string) => {
    const raw = pasteUrl.trim();
    if (!raw) return;
    let parsed: URL;
    try {
      parsed = new URL(raw);
    } catch {
      setActionErr("Enter a valid http(s) image URL.");
      return;
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      setActionErr("URL must start with http:// or https://");
      return;
    }
    setCoverSaving(true);
    setActionErr("");
    try {
      const { error: dbErr } = await supabase.from("articles").update({ cover_image_url: raw }).eq("id", articleId);
      if (dbErr) throw new Error(dbErr.message);
      closeImageUpload();
      setCoverSuccessId(articleId);
      window.setTimeout(() => {
        setCoverSuccessId((id) => (id === articleId ? null : id));
      }, 3800);
      void fetchTab();
    } catch (e) {
      setActionErr(e instanceof Error ? e.message : "Update failed");
    } finally {
      setCoverSaving(false);
    }
  };

  const previewArticle = (id: string) => {
    window.open(`/articles/${encodeURIComponent(id)}/preview`, "_blank", "noopener,noreferrer");
  };

  if (gateLoading || !allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-zinc-500">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-24 pt-10 text-zinc-100">
      <div className={`${CLASSES.section} max-w-6xl`}>
        <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--ml-gold)]">
          Administration
        </p>
        <h1 className="ml-font-heading text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">
          Magicalive <span className="text-[var(--ml-gold)] italic">admin</span>
        </h1>

        <div className="mt-8 flex flex-wrap gap-2 border-b border-white/10 pb-4">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wider transition ${
                tab === t.id
                  ? "border-[var(--ml-gold)] bg-[var(--ml-gold)]/15 text-[var(--ml-gold)]"
                  : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/20 hover:text-zinc-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {actionErr ? <p className="mt-4 text-sm text-red-400">{actionErr}</p> : null}

        {tab === "articles" ? (
          <section className="mt-8">
            <div className="mb-6 flex flex-wrap gap-2">
              {(["all", "pending", "published", "rejected"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setArticleFilter(f)}
                  className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider ${
                    articleFilter === f
                      ? "border-white/25 bg-white/10 text-zinc-100"
                      : "border-white/10 text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            {dataLoading ? (
              <p className="text-sm text-zinc-500">Loading articles…</p>
            ) : (
              <ul className="space-y-4">
                {filteredArticles.map((article) => {
                  const st = (article.status || "").toLowerCase();
                  const coverUrl = article.cover_image_url?.trim() || null;
                  return (
                    <li
                      key={article.id}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h2 className="ml-font-heading text-lg font-semibold text-zinc-100">
                            {article.title?.trim() || "Untitled"}
                          </h2>
                          <p className="mt-1 text-xs text-zinc-500">
                            {article.author_name || "Unknown"} · {article.category || "—"} · Submitted{" "}
                            {fmtShort(article.created_at || article.published_at)} · {wordCount(article.body)} words
                          </p>
                          <p className="mt-2 line-clamp-2 text-sm text-zinc-400">{article.excerpt || "—"}</p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-wider ${
                            st === "published"
                              ? "border-emerald-500/40 text-emerald-300"
                              : st === "pending"
                                ? "border-[var(--ml-gold)]/40 text-[var(--ml-gold)]"
                                : "border-red-500/35 text-red-300"
                          }`}
                        >
                          {article.status || "—"}
                        </span>
                      </div>

                      <div className="button-row mt-4 flex flex-wrap items-center gap-2">
                        <Link
                          href={`/articles/${encodeURIComponent(article.id)}/edit`}
                          className="inline-flex shrink-0 items-center justify-center rounded-lg border border-[var(--ml-gold)]/50 bg-[var(--ml-gold)]/[0.08] px-3 py-2 text-xs font-semibold text-[var(--ml-gold)] transition hover:border-[var(--ml-gold)]/75 hover:bg-[var(--ml-gold)]/14"
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => openImageUpload(article.id)}
                          className="inline-flex shrink-0 items-center justify-center rounded-lg border border-white/12 bg-white/[0.04] px-3 py-2 text-xs font-medium text-zinc-300 transition hover:border-white/20 hover:bg-white/[0.08]"
                        >
                          {coverUrl ? "Change image" : "Add cover image"}
                        </button>

                        {st === "pending" ? (
                          <>
                            <button
                              type="button"
                              onClick={() => void publishArticle(article.id)}
                              className={CLASSES.btnPrimarySm}
                            >
                              Publish
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRejectArticleId(article.id);
                                setRejectReason("");
                                setRejectOpen(true);
                              }}
                              className="rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-semibold text-red-300 transition hover:bg-red-500/10"
                            >
                              Reject
                            </button>
                            <button
                              type="button"
                              onClick={() => previewArticle(article.id)}
                              className={CLASSES.btnSecondarySm}
                            >
                              Preview
                            </button>
                          </>
                        ) : null}

                        {st === "published" ? (
                          <>
                            <button
                              type="button"
                              onClick={() => void unpublishArticle(article.id)}
                              className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-200 transition hover:border-amber-500/35 hover:bg-amber-500/10"
                            >
                              Unpublish
                            </button>
                            <button
                              type="button"
                              onClick={() => previewArticle(article.id)}
                              className={CLASSES.btnSecondarySm}
                            >
                              Preview
                            </button>
                          </>
                        ) : null}

                        {st === "rejected" ? (
                          <>
                            <button
                              type="button"
                              onClick={() => void publishArticle(article.id)}
                              className={CLASSES.btnPrimarySm}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => previewArticle(article.id)}
                              className={CLASSES.btnSecondarySm}
                            >
                              Preview
                            </button>
                          </>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => void deleteArticle(article.id)}
                          className="rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-semibold text-red-300 transition hover:bg-red-500/10"
                        >
                          Delete
                        </button>

                        {coverSuccessId === article.id ? (
                          <span className="text-xs font-medium text-emerald-400">Cover image added</span>
                        ) : null}
                      </div>

                      {uploadingFor === article.id ? (
                        <div className="mt-4 rounded-xl border border-[var(--ml-gold)]/25 bg-black/50 p-4">
                          <input
                            ref={coverFileInputRef}
                            type="file"
                            accept="image/jpeg,image/png"
                            className="block w-full max-w-sm cursor-pointer text-xs text-zinc-400 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-zinc-200 hover:file:bg-white/15"
                            onChange={handleFileSelect}
                          />
                          {selectedFile && filePreviewUrl ? (
                            <div className="mt-3">
                              <img
                                src={filePreviewUrl}
                                alt="Preview"
                                className="h-[80px] w-[120px] rounded-[2px] border border-white/10 object-cover"
                              />
                            </div>
                          ) : null}
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              disabled={!selectedFile || coverSaving}
                              onClick={() => void uploadCoverImage(article.id)}
                              className="rounded-lg bg-[var(--ml-gold)] px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-[var(--ml-gold-hover)] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {coverSaving ? "Uploading…" : "Upload image"}
                            </button>
                            <button
                              type="button"
                              onClick={closeImageUpload}
                              className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-400 transition hover:text-zinc-200"
                            >
                              Cancel
                            </button>
                          </div>
                          <p className="mt-4 text-center text-[11px] text-zinc-500">— or —</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <input
                              type="text"
                              value={pasteUrl}
                              onChange={(e) => setPasteUrl(e.target.value)}
                              placeholder="Paste image URL"
                              className="min-w-[200px] flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-[var(--ml-gold)]/40"
                            />
                            <button
                              type="button"
                              disabled={coverSaving || !pasteUrl.trim()}
                              onClick={() => void saveImageUrl(article.id)}
                              className="rounded-lg border border-[var(--ml-gold)]/40 bg-[var(--ml-gold)]/10 px-3 py-2 text-xs font-semibold text-[var(--ml-gold)] transition hover:bg-[var(--ml-gold)]/20 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Save URL
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
                {!filteredArticles.length ? <p className="text-sm text-zinc-500">No articles in this filter.</p> : null}
              </ul>
            )}
          </section>
        ) : null}

        {tab === "magicians" ? (
          <section className="mt-8 overflow-x-auto">
            {dataLoading ? (
              <p className="text-sm text-zinc-500">Loading…</p>
            ) : (
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-zinc-500">
                    <th className="py-3 pr-4">Name</th>
                    <th className="py-3 pr-4">Location</th>
                    <th className="py-3 pr-4">Joined</th>
                    <th className="py-3 pr-4">Shows</th>
                    <th className="py-3 pr-4">Reviews</th>
                    <th className="py-3 pr-4">Verified</th>
                    <th className="py-3">Profile</th>
                  </tr>
                </thead>
                <tbody>
                  {magicians.map((m) => (
                    <tr key={m.id} className="border-b border-white/5">
                      <td className="py-3 pr-4 font-medium text-zinc-200">{m.display_name || "—"}</td>
                      <td className="py-3 pr-4 text-zinc-400">{m.location || "—"}</td>
                      <td className="py-3 pr-4 text-zinc-500">{fmtShort(m.created_at || m.updated_at)}</td>
                      <td className="py-3 pr-4 text-zinc-400">{m.show_count}</td>
                      <td className="py-3 pr-4 text-zinc-400">{Number(m.review_count ?? 0)}</td>
                      <td className="py-3 pr-4">
                        <button
                          type="button"
                          onClick={() => void toggleMagicianVerified(m.id, !m.is_verified)}
                          className="text-xs font-semibold text-[var(--ml-gold)] hover:underline"
                        >
                          {m.is_verified ? "On" : "Off"}
                        </button>
                      </td>
                      <td className="py-3">
                        <Link
                          href={`/profile/magician?id=${encodeURIComponent(m.id)}`}
                          className="text-xs text-zinc-400 hover:text-[var(--ml-gold)]"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!dataLoading && !magicians.length ? <p className="mt-4 text-sm text-zinc-500">No magicians.</p> : null}
          </section>
        ) : null}

        {tab === "venues" ? (
          <section className="mt-8 overflow-x-auto">
            {dataLoading ? (
              <p className="text-sm text-zinc-500">Loading…</p>
            ) : (
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-zinc-500">
                    <th className="py-3 pr-4">Name</th>
                    <th className="py-3 pr-4">City</th>
                    <th className="py-3 pr-4">Type</th>
                    <th className="py-3 pr-4">Submitted</th>
                    <th className="py-3 pr-4">Actions</th>
                    <th className="py-3">View</th>
                  </tr>
                </thead>
                <tbody>
                  {venues.map((v) => (
                    <tr key={v.id} className="border-b border-white/5">
                      <td className="py-3 pr-4 font-medium text-zinc-200">{v.name || "—"}</td>
                      <td className="py-3 pr-4 text-zinc-400">{v.city || "—"}</td>
                      <td className="py-3 pr-4 text-zinc-400">{v.venue_type || "—"}</td>
                      <td className="py-3 pr-4 text-zinc-500">{fmtShort(v.created_at)}</td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => void venueDecision(v.id, "approve")}
                            className="text-xs font-semibold text-emerald-400 hover:underline"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => void venueDecision(v.id, "reject")}
                            className="text-xs font-semibold text-red-400 hover:underline"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                      <td className="py-3">
                        <Link
                          href={`/venues/${encodeURIComponent(v.id)}`}
                          className="text-xs text-zinc-400 hover:text-[var(--ml-gold)]"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!dataLoading && !venues.length ? <p className="mt-4 text-sm text-zinc-500">No venues.</p> : null}
          </section>
        ) : null}

        {tab === "users" ? (
          <section className="mt-8 overflow-x-auto">
            {dataLoading ? (
              <p className="text-sm text-zinc-500">Loading…</p>
            ) : (
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-zinc-500">
                    <th className="py-3 pr-4">Name</th>
                    <th className="py-3 pr-4">Email</th>
                    <th className="py-3 pr-4">Type</th>
                    <th className="py-3 pr-4">Joined</th>
                    <th className="py-3 pr-4">Admin</th>
                    <th className="py-3">Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-white/5">
                      <td className="py-3 pr-4 font-medium text-zinc-200">{u.display_name || "—"}</td>
                      <td className="py-3 pr-4 text-zinc-400">{u.email || "—"}</td>
                      <td className="py-3 pr-4 text-zinc-400">{u.account_type || "—"}</td>
                      <td className="py-3 pr-4 text-zinc-500">{fmtShort(u.created_at || u.updated_at)}</td>
                      <td className="py-3 pr-4">
                        <button
                          type="button"
                          onClick={() => void toggleUserAdmin(u.id, !u.is_admin)}
                          className="text-xs font-semibold text-[var(--ml-gold)] hover:underline"
                        >
                          {u.is_admin ? "On" : "Off"}
                        </button>
                      </td>
                      <td className="py-3">
                        <button
                          type="button"
                          onClick={() => void deleteUser(u.id)}
                          className="text-xs font-semibold text-red-400 hover:underline"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!dataLoading && !users.length ? <p className="mt-4 text-sm text-zinc-500">No users.</p> : null}
          </section>
        ) : null}
      </div>

      {rejectOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-xl">
            <h3 className="ml-font-heading text-lg font-semibold text-zinc-100">Reject article</h3>
            <p className="mt-2 text-sm text-zinc-500">This message will be emailed to the author.</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={5}
              className="mt-4 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[var(--ml-gold)]/40"
              placeholder="Reason for rejection…"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setRejectOpen(false);
                  setRejectArticleId("");
                  setRejectReason("");
                }}
                className={CLASSES.btnSecondarySm}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitReject()}
                disabled={!rejectReason.trim()}
                className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300 disabled:opacity-40"
              >
                Send rejection
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
