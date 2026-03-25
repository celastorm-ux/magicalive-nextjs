"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CLASSES } from "@/lib/constants";
import { supabase } from "@/lib/supabase";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm font-normal text-zinc-100 placeholder:text-zinc-500 outline-none transition focus:border-[var(--ml-gold)]/50 focus:bg-white/10";

const labelClass =
  "mb-2 block text-[10px] font-medium uppercase tracking-widest text-zinc-500";

export default function VenueOnboardingClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const venueId = searchParams.get("venueId")?.trim() ?? "";
  const { user, isLoaded } = useUser();

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState("");
  const [fullAddress, setFullAddress] = useState("");
  const [website, setWebsite] = useState("");
  const [openingHours, setOpeningHours] = useState("");
  const [magicDesc, setMagicDesc] = useState("");
  const [socialIg, setSocialIg] = useState("");
  const [socialFb, setSocialFb] = useState("");
  const [socialTt, setSocialTt] = useState("");
  const [socialYt, setSocialYt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!logoFile) {
      setLogoPreview(null);
      return;
    }
    const u = URL.createObjectURL(logoFile);
    setLogoPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [logoFile]);

  useEffect(() => {
    if (isLoaded && !user) {
      router.replace("/sign-in");
    }
  }, [isLoaded, user, router]);

  useEffect(() => {
    if (isLoaded && !venueId) {
      router.replace("/venues");
    }
  }, [isLoaded, venueId, router]);

  const finish = useCallback(async () => {
    if (!venueId || !user?.id) return;
    setError("");
    setSaving(true);
    let logo_url: string | null = logoUrl.trim() || null;
    if (logoFile) {
      const ext =
        logoFile.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "") || "jpg";
      const path = `venues/${venueId}/logo.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, logoFile, { upsert: true });
      if (!upErr) {
        const { data } = supabase.storage.from("avatars").getPublicUrl(path);
        logo_url = data.publicUrl;
      }
    }
    const onboardingData = {
      full_address: fullAddress.trim() || null,
      website: website.trim() || null,
      opening_hours: openingHours.trim() || null,
      magic_show_description: magicDesc.trim() || null,
      social_instagram: socialIg.trim() || null,
      social_facebook: socialFb.trim() || null,
      social_tiktok: socialTt.trim() || null,
      social_youtube: socialYt.trim() || null,
      ...(logo_url ? { logo_url } : {}),
    };
    console.log("Saving onboarding data:", onboardingData);
    const { error: dbErr } = await supabase
      .from("venues")
      .update(onboardingData)
      .eq("id", venueId);
    setSaving(false);
    if (dbErr) {
      console.log("Supabase error:", dbErr);
      setError("Something went wrong saving your profile. Please try again.");
      return;
    }
    router.push("/venues");
  }, [
    venueId,
    user?.id,
    logoFile,
    logoUrl,
    fullAddress,
    website,
    openingHours,
    magicDesc,
    socialIg,
    socialFb,
    socialTt,
    socialYt,
    router,
  ]);

  if (!isLoaded || !user || !venueId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-zinc-400">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-black text-zinc-100">
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--ml-gold)]/15 px-5 py-4 sm:px-12">
        <Link
          href="/"
          className="ml-font-heading text-xl font-semibold text-zinc-100 no-underline"
        >
          Magic<span className="text-[var(--ml-gold)] italic">alive</span>
        </Link>
        <span className="text-[11px] uppercase tracking-widest text-[var(--ml-gold)]">
          Venue setup
        </span>
      </div>

      <div className="mx-auto w-full max-w-[560px] flex-1 px-5 py-10 sm:px-8">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--ml-gold)]">
          Finish your listing
        </p>
        <h1 className="mb-2 ml-font-heading text-[32px] font-semibold leading-tight text-zinc-50">
          Make your venue{" "}
          <em className="text-[var(--ml-gold)] italic">shine</em>
        </h1>
        <p className="mb-8 text-[13px] leading-relaxed text-zinc-500">
          Add details magicians and bookers look for. All fields are optional
          except you&apos;ll want a strong magic-show blurb.
        </p>

        <div className="mb-[18px]">
          <label className={labelClass}>Venue logo / photo</label>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/15 bg-white/5">
              {logoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoPreview}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-3xl text-zinc-600">🏛</span>
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className={`${inputClass} cursor-pointer text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-zinc-200`}
                onChange={(e) =>
                  setLogoFile(e.target.files?.[0] ?? null)
                }
              />
              <input
                type="url"
                className={inputClass}
                placeholder="Or image URL"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="mb-[18px]">
          <label className={labelClass}>Full address</label>
          <textarea
            rows={2}
            className={`${inputClass} resize-y`}
            placeholder="Street, city, postcode…"
            value={fullAddress}
            onChange={(e) => setFullAddress(e.target.value)}
          />
        </div>

        <div className="mb-[18px]">
          <label className={labelClass}>Website</label>
          <input
            type="url"
            className={inputClass}
            placeholder="https://…"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </div>

        <div className="mb-[18px]">
          <label className={labelClass}>Opening hours</label>
          <textarea
            rows={3}
            className={`${inputClass} resize-y`}
            placeholder="e.g. Mon–Thu 6pm–11pm, Fri–Sat 5pm–1am…"
            value={openingHours}
            onChange={(e) => setOpeningHours(e.target.value)}
          />
        </div>

        <div className="mb-[18px]">
          <label className={labelClass}>
            Short description for magic shows
          </label>
          <textarea
            rows={4}
            className={`${inputClass} resize-y`}
            placeholder="What makes your space ideal for close-up, parlor, or stage magic?"
            value={magicDesc}
            onChange={(e) => setMagicDesc(e.target.value)}
          />
        </div>

        <p className="mb-2 text-[10px] font-medium uppercase tracking-widest text-zinc-500">
          Social media (optional)
        </p>
        <div className="mb-[18px] grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Instagram</label>
            <input
              className={inputClass}
              placeholder="@handle or URL"
              value={socialIg}
              onChange={(e) => setSocialIg(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Facebook</label>
            <input
              className={inputClass}
              placeholder="URL"
              value={socialFb}
              onChange={(e) => setSocialFb(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>TikTok</label>
            <input
              className={inputClass}
              placeholder="@handle or URL"
              value={socialTt}
              onChange={(e) => setSocialTt(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>YouTube</label>
            <input
              className={inputClass}
              placeholder="URL"
              value={socialYt}
              onChange={(e) => setSocialYt(e.target.value)}
            />
          </div>
        </div>

        {error ? (
          <p className="mb-4 text-sm text-red-400">{error}</p>
        ) : null}

        <button
          type="button"
          disabled={saving}
          onClick={() => void finish()}
          className={`${CLASSES.btnPrimary} w-full justify-center text-xs uppercase tracking-wider disabled:opacity-60 sm:w-auto`}
        >
          {saving ? "Saving…" : "Complete & go to directory →"}
        </button>
      </div>
    </div>
  );
}
