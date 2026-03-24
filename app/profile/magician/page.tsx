"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
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

  const [bundle, setBundle] = useState<BundleJson | null>(null);
  const [fetchState, setFetchState] = useState<"idle" | "loading" | "done">("idle");
  const [profileProbe, setProfileProbe] = useState<{
    data: Record<string, unknown> | null;
    error: unknown;
  } | null>(null);

  const readyForOwnId = profileIdFromUrl?.trim() ? true : isLoaded;

  useEffect(() => {
    console.log("Magician page - searchParams:", searchParams.toString());
    console.log("Magician page - profileId from URL:", profileIdFromUrl);
    console.log("Magician page - current user:", user?.id);
    console.log("Magician page - using id:", profileId);
  }, [searchParams, profileIdFromUrl, user?.id, profileId]);

  useEffect(() => {
    console.log("Final profileId being used:", profileId || "(empty)");
    if (!profileId) {
      console.log("No profileId found - showing not found");
    }
  }, [profileId]);

  useEffect(() => {
    if (!readyForOwnId) return;
    if (!profileId) {
      setBundle(null);
      setProfileProbe(null);
      setFetchState("done");
      return;
    }

    setBundle(null);
    setProfileProbe(null);
    setFetchState("loading");
    let cancelled = false;

    void (async () => {
      const { data: allProfiles, error: sampleError } = await supabase
        .from("profiles")
        .select("id, display_name, account_type")
        .limit(5);
      console.log("Sample profiles in database:", allProfiles, "sampleError:", sampleError);

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", profileId)
        .single();

      console.log("Magician page - Supabase result:", data, error);
      console.log("Profile query result:", data, error);
      console.log("Profile id being queried:", profileId);

      if (cancelled) return;

      setProfileProbe({ data: data as Record<string, unknown> | null, error });

      if (error || !data) {
        setBundle(null);
        setFetchState("done");
        return;
      }

      const accountType = (data as { account_type?: string | null }).account_type;
      if (accountType !== "magician") {
        console.log(
          "Magician page - row exists but account_type is not magician:",
          accountType,
        );
        setBundle(null);
        setFetchState("done");
        return;
      }

      try {
        const res = await fetch(`/api/profile/magician-bundle?id=${encodeURIComponent(profileId)}`);
        const bundleJson = (await res.json()) as BundleJson;
        if (!cancelled) setBundle(bundleJson);
      } catch (e) {
        console.log("Magician page - magician-bundle fetch failed:", e);
        if (!cancelled) setBundle(null);
      } finally {
        if (!cancelled) setFetchState("done");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [readyForOwnId, profileId]);

  if (!readyForOwnId || fetchState === "loading" || (fetchState === "idle" && profileId)) {
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
    fetchState === "done" &&
    (profileProbe?.error ||
      !profileProbe?.data ||
      (profileProbe.data as { account_type?: string }).account_type !== "magician" ||
      !bundle?.profile)
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
