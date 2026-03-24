import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import { CLASSES } from "@/lib/constants";
import { siteBaseUrl } from "@/lib/magicalive-resend";
import { buildMetadata } from "@/lib/seo";
import { getMagicianProfileBundle } from "@/lib/server/detail-pages";
import MagicianProfileClient, { type MagicianProfileInitialBundle } from "./MagicianProfileClient";

type PageSearchParams = Promise<{ id?: string | string[] }>;

function pickId(raw: string | string[] | undefined): string {
  if (typeof raw === "string") return raw.trim();
  if (Array.isArray(raw) && raw[0]) return String(raw[0]).trim();
  return "";
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: PageSearchParams;
}): Promise<Metadata> {
  const sp = await searchParams;
  const idParam = pickId(sp.id);
  const { userId } = await auth();
  const profileId = (idParam || userId || "").trim();
  if (!profileId) {
    return buildMetadata({
      title: "Magician Profile — Magicalive",
      description: "Discover professional magicians on Magicalive.",
    });
  }
  const bundle = await getMagicianProfileBundle(profileId);
  const p = bundle?.profile as
    | {
        display_name?: string | null;
        short_bio?: string | null;
        specialty_tags?: string[] | null;
        avatar_url?: string | null;
      }
    | null
    | undefined;
  if (!p) {
    return buildMetadata({
      title: "Magician Profile — Magicalive",
      description: "Discover professional magicians on Magicalive.",
    });
  }
  const tags = (p.specialty_tags ?? []).filter(Boolean).join(", ");
  const description = (p.short_bio?.trim() || tags || "View this performer on Magicalive.").slice(0, 160);
  return buildMetadata({
    title: `${(p.display_name?.trim() || "Magician")} — Magicalive`,
    description,
    image: p.avatar_url,
    type: "website",
  });
}

export default async function MagicianProfilePage({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) {
  const sp = await searchParams;
  const idParam = pickId(sp.id);
  const { userId } = await auth();
  const profileId = (idParam || userId || "").trim();

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

  const bundle = await getMagicianProfileBundle(profileId);

  if (!bundle?.profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black px-6 text-center">
        <p className="text-zinc-400">Magician profile not found.</p>
        <Link href="/magicians" className={CLASSES.btnPrimarySm}>
          Back to directory
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

  return (
    <>
      <JsonLd data={personSchema} />
      <MagicianProfileClient
        resolvedProfileId={profileId}
        initial={
          {
            profile: bundle.profile,
            shows: bundle.shows,
            pastShows: bundle.pastShows,
            reviews: bundle.reviews,
            articles: bundle.articles,
          } as MagicianProfileInitialBundle
        }
      />
    </>
  );
}
