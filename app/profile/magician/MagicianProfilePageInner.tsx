"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import JsonLd from "@/components/JsonLd";
import { CLASSES } from "@/lib/constants";
import { siteBaseUrl } from "@/lib/magicalive-resend";
import MagicianProfileClient, { type MagicianProfileInitialBundle } from "./MagicianProfileClient";

type BundleJson = {
  profile: Record<string, unknown> | null;
  shows: unknown[];
  pastShows: unknown[];
  reviews: unknown[];
  articles: unknown[];
};

export default function MagicianProfilePageInner() {
  const searchParams = useSearchParams();
  const profileId = searchParams.get("id");
  const { user, isLoaded } = useUser();
  const id = (profileId?.trim() || user?.id || "").trim();

  const [bundle, setBundle] = useState<BundleJson | null>(null);
  const [fetchState, setFetchState] = useState<"idle" | "loading" | "done">("idle");

  const readyForOwnId = profileId?.trim() ? true : isLoaded;

  useEffect(() => {
    console.log("Loading profile with id:", id || "");
  }, [id]);

  useEffect(() => {
    if (!readyForOwnId) return;
    if (!id) {
      setBundle(null);
      setFetchState("done");
      return;
    }
    setBundle(null);
    setFetchState("loading");
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/profile/magician-bundle?id=${encodeURIComponent(id)}`);
        const data = (await res.json()) as BundleJson;
        if (!cancelled) setBundle(data);
      } catch {
        if (!cancelled) setBundle(null);
      } finally {
        if (!cancelled) setFetchState("done");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [readyForOwnId, id]);

  if (!readyForOwnId || fetchState === "loading" || (fetchState === "idle" && id)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black text-zinc-400">
        <span
          className="inline-block size-10 animate-spin rounded-full border-2 border-[var(--ml-gold)]/30 border-t-[var(--ml-gold)]"
          aria-hidden
        />
        <p className="text-sm">Loading profile…</p>
      </div>
    );
  }

  if (!id) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black px-6 text-center text-zinc-400">
        <p>No magician selected.</p>
        <Link href="/magicians" className={CLASSES.btnPrimarySm}>
          Browse magicians
        </Link>
      </div>
    );
  }

  if (fetchState === "done" && (!bundle || !bundle.profile)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black px-6 text-center">
        <p className="text-zinc-400">Profile not found.</p>
        <Link href="/create-profile" className={CLASSES.btnPrimarySm}>
          Create profile
        </Link>
      </div>
    );
  }

  const p = bundle!.profile as {
    id: string;
    display_name?: string | null;
    short_bio?: string | null;
    location?: string | null;
    avatar_url?: string | null;
    instagram?: string | null;
    youtube?: string | null;
    tiktok?: string | null;
  };

  const base = siteBaseUrl();
  const profileUrl = `${base}/profile/magician?id=${encodeURIComponent(p.id)}`;
  const sameAs = [p.instagram, p.youtube, p.tiktok].filter((u): u is string => Boolean(u?.trim()));

  const personSchema = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: p.display_name?.trim() || "Magician",
    description: p.short_bio?.trim() || undefined,
    image: p.avatar_url || undefined,
    url: profileUrl,
    jobTitle: "Magician",
    address: p.location?.trim()
      ? {
          "@type": "PostalAddress",
          addressLocality: p.location.trim(),
        }
      : undefined,
    sameAs: sameAs.length ? sameAs : undefined,
  };

  const initial: MagicianProfileInitialBundle = {
    profile: bundle!.profile as MagicianProfileInitialBundle["profile"],
    shows: bundle!.shows as MagicianProfileInitialBundle["shows"],
    pastShows: bundle!.pastShows as MagicianProfileInitialBundle["pastShows"],
    reviews: bundle!.reviews as MagicianProfileInitialBundle["reviews"],
    articles: bundle!.articles as MagicianProfileInitialBundle["articles"],
  };

  return (
    <>
      <JsonLd data={personSchema} />
      <MagicianProfileClient resolvedProfileId={id} initial={initial} />
    </>
  );
}
