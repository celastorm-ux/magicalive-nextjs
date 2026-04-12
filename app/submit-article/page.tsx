"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
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

const GUIDELINES = [
  "Original work only — no plagiarized or AI-generated articles presented as your own reporting.",
  "Fact-check names, dates, and venue details; we may verify claims before publishing.",
  "Disclose any commercial relationship with performers or venues you write about.",
  "Keep a constructive tone; personal attacks and harassment won’t be published.",
  "Images must be yours to use or properly licensed; include credit in the caption when required.",
  "We may edit for length, clarity, and house style while preserving your voice.",
] as const;

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition focus:border-[var(--ml-gold)]/50 focus:bg-white/10";

const labelClass =
  "mb-2 block text-[10px] font-semibold uppercase tracking-wider text-zinc-500";

export default function SubmitArticlePage() {
  const { user, isLoaded } = useUser();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>(
    CATEGORIES[0]
  );
  const [excerpt, setExcerpt] = useState("");
  const [body, setBody] = useState("");
  const [caption, setCaption] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submittedOk, setSubmittedOk] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wordCount = useMemo(
    () => (body.trim() ? body.trim().split(/\s+/).filter(Boolean).length : 0),
    [body],
  );
  const readTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !user?.id) {
      setError("Please sign in first.");
      return;
    }
    if (!title.trim() || !excerpt.trim() || !body.trim()) {
      setError("Please fill in title, excerpt, and body.");
      return;
    }
    setSubmitting(true);
    setError("");

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle();

    const authorName =
      (profile?.display_name as string | null)?.trim() ||
      user.fullName?.trim() ||
      user.firstName?.trim() ||
      "PinnacleMagic writer";

    let coverImageUrl: string | null = null;
    if (coverFile) {
      const safeName = coverFile.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const path = `${user.id}/${Date.now()}-${safeName}`;
      const { error: uploadErr } = await supabase.storage
        .from("article-covers")
        .upload(path, coverFile, { upsert: true });
      if (uploadErr) {
        setError(uploadErr.message || "Could not upload cover image.");
        setSubmitting(false);
        return;
      }
      const { data: pub } = supabase.storage.from("article-covers").getPublicUrl(path);
      coverImageUrl = pub.publicUrl;
    }

    const tags = body
      .split(/\r?\n/)
      .filter((line) => line.trim().startsWith("#"))
      .map((line) => line.replace(/^#+\s*/, "").trim())
      .filter(Boolean)
      .slice(0, 8);

    const { data: inserted, error: insertErr } = await supabase
      .from("articles")
      .insert({
        author_id: user.id,
        author_name: authorName,
        title: title.trim(),
        excerpt: excerpt.trim(),
        body: body.trim(),
        category,
        read_time: readTimeMinutes,
        cover_image_url: coverImageUrl,
        cover_image_caption: caption.trim() || null,
        tags,
        status: "pending",
        published_at: null,
      })
      .select("id")
      .single();

    if (insertErr || !inserted?.id) {
      setError(insertErr?.message || "Could not submit article.");
      setSubmitting(false);
      return;
    }

    void fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "article_submitted",
        data: {
          author_id: user.id,
          article_title: title.trim(),
          author_name: authorName,
          category,
          excerpt: excerpt.trim(),
        },
      }),
    });

    setSubmittedOk(true);
    setTitle("");
    setExcerpt("");
    setBody("");
    setCaption("");
    setCoverFile(null);
    setSubmitting(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f?.type.startsWith("image/")) setCoverFile(f);
  };

  return (
    <div className="min-h-0 flex-1 bg-black pb-24 pt-8 text-zinc-100 sm:pt-12">
      <div className={`${CLASSES.section} max-w-6xl`}>
        <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--ml-gold)]">
          Share your voice
        </p>
        <h1 className="ml-font-heading text-4xl font-semibold tracking-tight text-zinc-50 sm:text-5xl">
          Submit an <span className="text-[var(--ml-gold)] italic">article</span>
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base">
          Share interviews, tutorials, and stories with the PinnacleMagic audience.
        </p>
        {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}

        {submittedOk ? (
          <div className="mt-8 rounded-2xl border border-[var(--ml-gold)]/30 bg-[var(--ml-gold)]/10 p-6 sm:p-8">
            <p className="ml-font-heading text-lg font-semibold text-[var(--ml-gold)]">Submission received</p>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-300">
              Your article has been submitted for review. We will review it within 3 business days and notify you by
              email when it goes live.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/dashboard" className={CLASSES.btnPrimarySm}>
                View my articles
              </Link>
              <button
                type="button"
                onClick={() => setSubmittedOk(false)}
                className={CLASSES.btnSecondarySm}
              >
                Submit another
              </button>
            </div>
          </div>
        ) : null}

        <div className={`mt-10 flex flex-col gap-12 lg:flex-row lg:items-start ${submittedOk ? "hidden" : ""}`}>
          <form
            onSubmit={handleSubmit}
            className="min-w-0 flex-1 space-y-12 lg:max-w-3xl"
          >
            <section>
              <h2 className="ml-font-heading text-xl font-semibold text-zinc-100">
                Article details
              </h2>
              <div className="mt-6 space-y-4">
                <div>
                  <label className={labelClass}>Title</label>
                  <input
                    className={inputClass}
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Working headline"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Category</label>
                    <select
                      className={inputClass}
                      value={category}
                      onChange={(e) =>
                        setCategory(e.target.value as (typeof CATEGORIES)[number])
                      }
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c} className="bg-zinc-900">
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Estimated read time</label>
                    <input
                      className={inputClass}
                      value={`${readTimeMinutes} min read`}
                      readOnly
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Short excerpt</label>
                  <textarea
                    className={`${inputClass} min-h-[100px] resize-y`}
                    required
                    rows={4}
                    value={excerpt}
                    onChange={(e) => setExcerpt(e.target.value)}
                    placeholder="2–3 sentences for listing cards and social previews."
                  />
                </div>
              </div>
            </section>

            <section>
              <h2 className="ml-font-heading text-xl font-semibold text-zinc-100">
                Article body
              </h2>
              <textarea
                className={`${inputClass} mt-4 min-h-[280px] resize-y font-mono text-sm leading-relaxed`}
                required
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={"Write your article. Use ## headings for sections, blank lines between paragraphs, and [youtube:VIDEO_ID] on its own line to embed a video."}
              />
              <p className="mt-2 text-right text-xs text-zinc-500">
                {wordCount} {wordCount === 1 ? "word" : "words"}
              </p>
            </section>

            <section>
              <h2 className="ml-font-heading text-xl font-semibold text-zinc-100">
                Cover image
              </h2>
              <div
                role="button"
                tabIndex={0}
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ")
                    fileInputRef.current?.click();
                }}
                className="mt-4 cursor-pointer rounded-2xl border border-dashed border-[var(--ml-gold)]/30 bg-white/[0.02] px-6 py-12 text-center transition hover:border-[var(--ml-gold)]/50 hover:bg-[var(--ml-gold)]/5"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setCoverFile(f);
                  }}
                />
                <p className="text-2xl">📷</p>
                <p className="mt-2 text-sm text-zinc-400">
                  Drop an image here or click to browse
                </p>
                <p className="mt-1 text-xs text-zinc-600">
                  JPG, PNG, WebP · max 10MB
                </p>
                {coverFile ? (
                  <p className="mt-3 text-xs font-medium text-[var(--ml-gold)]">
                    {coverFile.name}
                  </p>
                ) : null}
              </div>
              <div className="mt-4">
                <label className={labelClass}>Image caption / credit</label>
                <input
                  className={inputClass}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Photo by…"
                />
              </div>
            </section>

            {/* Guidelines */}
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <h2 className="ml-font-heading text-lg font-semibold text-zinc-100">
                Submission guidelines
              </h2>
              <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-zinc-400 marker:text-[var(--ml-gold)]">
                {GUIDELINES.map((rule, i) => (
                  <li key={i}>{rule}</li>
                ))}
              </ol>
            </section>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button type="submit" disabled={submitting} className={CLASSES.btnPrimary}>
                {submitting ? "Submitting…" : "Submit for review"}
              </button>
              <Link href="/articles" className={CLASSES.btnSecondary}>
                Cancel
              </Link>
            </div>
          </form>

          <aside className="w-full shrink-0 space-y-8 lg:w-72">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                What we publish
              </h3>
              <ul className="mt-4 space-y-2 text-sm text-zinc-400">
                <li>
                  <span className="text-[var(--ml-gold)]">Interview</span> —
                  profiles and Q&amp;As with performers &amp; creators
                </li>
                <li>
                  <span className="text-[var(--ml-gold)]">Technique</span> —
                  tutorials and craft breakdowns
                </li>
                <li>
                  <span className="text-[var(--ml-gold)]">Review</span> — shows,
                  venues, recordings
                </li>
                <li>
                  <span className="text-[var(--ml-gold)]">News</span> — directory
                  &amp; industry updates
                </li>
                <li>
                  <span className="text-[var(--ml-gold)]">History</span> —
                  research and archival stories
                </li>
                <li>
                  <span className="text-[var(--ml-gold)]">Community</span> —
                  clubs, meetups, letters
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Tips for a strong submission
              </h3>
              <ol className="mt-4 list-decimal space-y-3 pl-4 text-sm leading-relaxed text-zinc-400 marker:font-semibold marker:text-[var(--ml-gold)]">
                <li>Lead with why the story matters now.</li>
                <li>
                  Quote sources directly when possible; attribute every claim.
                </li>
                <li>Keep paragraphs short for on-screen reading.</li>
                <li>
                  Suggest a headline — we may refine it for SEO and clarity.
                </li>
                <li>
                  One clear thesis beats a roundup unless it&apos;s explicitly
                  a list piece.
                </li>
              </ol>
            </div>

            <div className="rounded-2xl border border-[var(--ml-gold)]/25 bg-[var(--ml-gold)]/10 p-5">
              <h3 className="ml-font-heading text-lg font-semibold text-zinc-100">
                Questions?
              </h3>
              <p className="mt-2 text-sm text-zinc-400">
                Not sure if your idea fits? Ask before you invest in a full
                draft.
              </p>
              <Link
                href="/contact"
                className={`${CLASSES.btnPrimary} mt-4 inline-flex w-full justify-center`}
              >
                Contact editorial
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
