"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CLASSES } from "@/lib/constants";
import { supabase } from "@/lib/supabase";

const FAN_STYLES = [
  "Close-up magic",
  "Stage illusions",
  "Mentalism",
  "Card magic",
  "Coin magic",
  "Escape artistry",
  "Comedy magic",
  "Children's magic",
  "Corporate events",
  "Parlor magic",
  "Strolling magic",
  "Street magic",
  "Virtual shows",
] as const;

const HEAR_ABOUT = [
  "Select one…",
  "Search engine",
  "Social media",
  "Friend or colleague",
  "Live event",
  "A magician",
  "Podcast or article",
  "Other",
] as const;

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm font-normal text-zinc-100 placeholder:text-zinc-500 outline-none transition focus:border-[var(--ml-gold)]/50 focus:bg-white/10";

const labelClass =
  "mb-2 block text-[10px] font-medium uppercase tracking-widest text-zinc-500";

export default function FanOnboardingPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [city, setCity] = useState("");
  const [heardAbout, setHeardAbout] = useState<(typeof HEAR_ABOUT)[number]>(
    HEAR_ABOUT[0],
  );
  const [styles, setStyles] = useState<Set<string>>(() => new Set());
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview(null);
      return;
    }
    const u = URL.createObjectURL(photoFile);
    setPhotoPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [photoFile]);

  useEffect(() => {
    if (isLoaded && !user) {
      router.replace("/sign-in");
    }
  }, [isLoaded, user, router]);

  const toggleStyle = useCallback((s: string) => {
    setStyles((prev) => {
      const n = new Set(prev);
      if (n.has(s)) n.delete(s);
      else n.add(s);
      return n;
    });
  }, []);

  const finish = useCallback(async () => {
    if (!user?.id) return;
    setError("");
    setSaving(true);
    let avatar_url: string | null = photoUrl.trim() || null;
    if (photoFile) {
      const ext =
        photoFile.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "") || "jpg";
      const path = `fans/${user.id}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, photoFile, { upsert: true });
      if (!upErr) {
        const { data } = supabase.storage.from("avatars").getPublicUrl(path);
        avatar_url = data.publicUrl;
      }
    }
    const onboardingPayload: Record<string, unknown> = {
      location: city.trim() || null,
      specialty_tags: [...styles],
      onboarding_completed: true,
      onboarding_step: null,
      ...(avatar_url ? { avatar_url } : {}),
      ...(heardAbout !== HEAR_ABOUT[0]
        ? { bio: `How I found PinnacleMagic: ${heardAbout}` }
        : {}),
    };
    console.log("Saving onboarding data:", onboardingPayload);
    const { error: dbErr } = await supabase
      .from("profiles")
      .update(onboardingPayload)
      .eq("id", String(user.id))
      .eq("account_type", "fan");
    setSaving(false);
    if (dbErr) {
      console.log("Supabase error:", dbErr);
      setError("Something went wrong saving your profile. Please try again.");
      return;
    }
    router.push("/magicians");
  }, [user?.id, photoFile, photoUrl, city, styles, heardAbout, router]);

  if (!isLoaded || !user) {
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
          Fan setup
        </span>
      </div>

      <div className="mx-auto w-full max-w-[520px] flex-1 px-5 py-10 sm:px-8">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--ml-gold)]">
          Almost there
        </p>
        <h1 className="mb-2 ml-font-heading text-[32px] font-semibold leading-tight text-zinc-50">
          Personalise your{" "}
          <em className="text-[var(--ml-gold)] italic">experience</em>
        </h1>
        <p className="mb-8 text-[13px] leading-relaxed text-zinc-500">
          Optional details help us surface magicians and events you&apos;ll love.
          Skip anything you prefer not to share.
        </p>

        <div className="mb-[18px]">
          <label className={labelClass}>Profile photo (optional)</label>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/5">
              {photoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoPreview}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-2xl text-zinc-600">✦</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className={`${inputClass} cursor-pointer text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-zinc-200`}
                onChange={(e) =>
                  setPhotoFile(e.target.files?.[0] ?? null)
                }
              />
              <p className="mt-1.5 text-[11px] text-zinc-600">
                Or paste an image URL (optional)
              </p>
              <input
                type="url"
                className={`${inputClass} mt-1`}
                placeholder="https://…"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="mb-[18px]">
          <label className={labelClass}>City / location (optional)</label>
          <input
            type="text"
            className={inputClass}
            placeholder="e.g. London, UK"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </div>

        <div className="mb-[18px]">
          <label className={labelClass}>
            Favourite magic styles (optional)
          </label>
          <div className="flex flex-wrap gap-2">
            {FAN_STYLES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => toggleStyle(t)}
                className={`rounded-full border px-3 py-1.5 text-xs transition ${
                  styles.has(t)
                    ? "border-[var(--ml-gold)]/50 bg-[var(--ml-gold)]/10 text-[var(--ml-gold)]"
                    : "border-white/15 bg-white/5 text-zinc-400 hover:border-white/25"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-[18px]">
          <label className={labelClass}>How did you hear about us?</label>
          <select
            className={`${inputClass} cursor-pointer`}
            value={heardAbout}
            onChange={(e) =>
              setHeardAbout(e.target.value as (typeof HEAR_ABOUT)[number])
            }
          >
            {HEAR_ABOUT.map((o) => (
              <option key={o} className="bg-zinc-900">
                {o}
              </option>
            ))}
          </select>
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
          {saving ? "Saving…" : "Finish setup →"}
        </button>
      </div>
    </div>
  );
}
