"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import JsonLd from "@/components/JsonLd";
import { CLASSES } from "@/lib/constants";
import { siteBaseUrl } from "@/lib/magicalive-resend";
import { supabase } from "@/lib/supabase";
import MagicianProfileClient, { type MagicianProfileInitialBundle } from "./MagicianProfileClient";

type BundleJson = {
  profile: Record<string, unknown> | null;
  shows: unknown[];
  pastShows: unknown[];
  reviews: unknown[];
  articles: unknown[];
};

function MagicianProfileFallback() {
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

function MagicianProfilePageContent() {
  const searchParams = useSearchParams();
  const { user, isLoaded } = useUser();

  const profileIdFromUrl = searchParams.get("id");
  const profileId = (profileIdFromUrl?.trim() || user?.id || "").trim();
  const readyForOwnId = Boolean(profileIdFromUrl?.trim()) || isLoaded;

  const [isLoading, setIsLoading] = useState(true);
  const [bundle, setBundle] = useState<BundleJson | null>(null);
  const [profileProbe, setProfileProbe] = useState<{
    data: Record<string, unknown> | null;
    error: unknown;
  } | null>(null);

  const fetchGenRef = useRef(0);

  useEffect(() => {
    if (!readyForOwnId) {
      return;
    }

    if (!profileId) {
      fetchGenRef.current += 1;
      setBundle(null);
      setProfileProbe(null);
      setIsLoading(false);
      return;
    }

    const gen = ++fetchGenRef.current;
    setIsLoading(true);
    setBundle(null);
    setProfileProbe(null);

    let cancelled = false;

    void (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", profileId)
        .single();

      if (cancelled || gen !== fetchGenRef.current) return;

      setProfileProbe({ data: data as Record<string, unknown> | null, error });

      if (error || !data) {
        setBundle(null);
        setIsLoading(false);
        return;
      }

      const accountType = (data as { account_type?: string | null }).account_type;
      if (accountType !== "magician") {
        setBundle(null);
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/profile/magician-bundle?id=${encodeURIComponent(profileId)}`);
        const bundleJson = (await res.json()) as BundleJson;
        if (cancelled || gen !== fetchGenRef.current) return;
        setBundle(bundleJson);
      } catch {
        if (cancelled || gen !== fetchGenRef.current) return;
        setBundle(null);
      } finally {
        if (!cancelled && gen === fetchGenRef.current) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [readyForOwnId, profileId]);

  if (!readyForOwnId || isLoading) {
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

  if (!profileId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black px-6 text-center text-zinc-400">
        <p>No magician selected.</p>
        <Link href="/magicians" className={CLASSES.btnPrimarySm}>
          Browse magicians
        </Link>
      </div>
    );
  }

  if (
    profileProbe?.error ||
    !profileProbe?.data ||
    (profileProbe.data as { account_type?: string }).account_type !== "magician" ||
    !bundle?.profile
  ) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black px-6 text-center">
        <p className="text-zinc-400">Profile not found.</p>
        <Link href="/create-profile" className={CLASSES.btnPrimarySm}>
          Create profile
        </Link>
      </div>
    );
  }

  const p = bundle.profile as {
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
    profile: bundle.profile as MagicianProfileInitialBundle["profile"],
    shows: bundle.shows as MagicianProfileInitialBundle["shows"],
    pastShows: bundle.pastShows as MagicianProfileInitialBundle["pastShows"],
    reviews: bundle.reviews as MagicianProfileInitialBundle["reviews"],
    articles: bundle.articles as MagicianProfileInitialBundle["articles"],
  };

  return (
    <>
      <JsonLd data={personSchema} />
      <MagicianProfileClient resolvedProfileId={profileId} initial={initial} />
    </>
  );
}

export default function MagicianProfilePage() {
  return (
    <Suspense fallback={<MagicianProfileFallback />}>
      <MagicianProfilePageContent />
    </Suspense>
  );
}
