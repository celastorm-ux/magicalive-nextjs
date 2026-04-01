"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LocationPicker } from "@/components/LocationPicker";
import { CLASSES } from "@/lib/constants";
import { formatLocation, parseStoredLocation } from "@/lib/locations";
import { supabase } from "@/lib/supabase";

const SPECIALTY_TAGS = [
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

const STEPS = [
  "Your name",
  "Username",
  "About you",
  "Specialty",
  "Location",
  "Social links",
] as const;
type Step = (typeof STEPS)[number];

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm font-normal text-zinc-100 placeholder:text-zinc-500 outline-none transition focus:border-[var(--ml-gold)]/50 focus:bg-white/10";
const labelClass =
  "mb-2 block text-[10px] font-medium uppercase tracking-widest text-zinc-500";

function slugify(val: string) {
  return val
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function SetupClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isNew = searchParams.get("new") === "1";
  const { user, isLoaded } = useUser();

  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [loadErr, setLoadErr] = useState("");
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  // Step 1 — name
  const [displayName, setDisplayName] = useState("");

  // Step 2 — handle
  const [handle, setHandle] = useState("");
  const [handleStatus, setHandleStatus] = useState<"idle" | "checking" | "taken" | "ok">("idle");
  const handleDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Step 3 — bio
  const [shortBio, setShortBio] = useState("");
  const [fullBio, setFullBio] = useState("");

  // Step 4 — specialty tags
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

  // Step 5 — location
  const [locCountry, setLocCountry] = useState("");
  const [locState, setLocState] = useState("");
  const [locCity, setLocCity] = useState("");

  // Step 6 — social
  const [instagram, setInstagram] = useState("");
  const [youtube, setYoutube] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [website, setWebsite] = useState("");

  // Photo
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    if (!user?.id) {
      router.replace("/sign-in");
      return;
    }
    void (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, handle, short_bio, full_bio, specialty_tags, location, instagram, youtube, tiktok, website, avatar_url, account_type")
        .eq("id", user.id)
        .maybeSingle();
      setLoading(false);
      if (!data) {
        router.replace("/create-profile");
        return;
      }
      const p = data as Record<string, unknown>;
      if ((p.account_type as string) !== "magician") {
        router.replace("/profile");
        return;
      }
      setProfileId(user.id);
      setDisplayName((p.display_name as string | null) ?? "");
      const existing = (p.handle as string | null) ?? "";
      setHandle(existing);
      setShortBio((p.short_bio as string | null) ?? "");
      setFullBio((p.full_bio as string | null) ?? "");
      setSelectedTags(new Set((p.specialty_tags as string[] | null) ?? []));
      const parsed = parseStoredLocation((p.location as string | null) ?? "");
      setLocCountry(parsed.country);
      setLocState(parsed.state);
      setLocCity(parsed.city);
      setInstagram((p.instagram as string | null) ?? "");
      setYoutube((p.youtube as string | null) ?? "");
      setTiktok((p.tiktok as string | null) ?? "");
      setWebsite((p.website as string | null) ?? "");
      setAvatarUrl((p.avatar_url as string | null) ?? null);
    })();
  }, [isLoaded, user?.id, router]);

  const checkHandle = useCallback(
    (raw: string) => {
      const slug = slugify(raw);
      if (!slug) {
        setHandleStatus("idle");
        return;
      }
      setHandleStatus("checking");
      if (handleDebounce.current) clearTimeout(handleDebounce.current);
      handleDebounce.current = setTimeout(() => {
        void (async () => {
          const { data } = await supabase
            .from("profiles")
            .select("id")
            .eq("handle", slug)
            .neq("id", user?.id ?? "")
            .maybeSingle();
          setHandleStatus(data ? "taken" : "ok");
        })();
      }, 400);
    },
    [user?.id],
  );

  const onHandleChange = (raw: string) => {
    setHandle(raw);
    checkHandle(raw);
  };

  const toggleTag = (t: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  };

  const onPickAvatar = async (file: File | null) => {
    if (!file || !user?.id) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) return;
    setPhotoUploading(true);
    const path = `${user.id}/avatar.jpg`;
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) {
      setPhotoUploading(false);
      return;
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = `${data.publicUrl}?t=${Date.now()}`;
    await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
    setAvatarUrl(url);
    setPhotoUploading(false);
  };

  const canNext = useMemo(() => {
    if (step === 0) return displayName.trim().length > 0;
    if (step === 1) {
      const slug = slugify(handle);
      return slug.length >= 2 && handleStatus === "ok";
    }
    return true;
  }, [step, displayName, handle, handleStatus]);

  const saveAll = async () => {
    if (!user?.id) return;
    setSaving(true);
    setErrMsg("");
    const location =
      locCountry.trim() && locCity.trim()
        ? formatLocation(locCity, locState, locCountry)
        : locCity.trim() || null;
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim() || null,
        handle: slugify(handle) || null,
        short_bio: shortBio.trim() || null,
        full_bio: fullBio.trim() || null,
        specialty_tags: [...selectedTags],
        location,
        instagram: instagram.trim() || null,
        youtube: youtube.trim() || null,
        tiktok: tiktok.trim() || null,
        website: website.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      setErrMsg("Something went wrong. Please try again.");
      return;
    }
    router.push(`/profile/magician?id=${encodeURIComponent(user.id)}`);
  };

  const next = () => {
    setErrMsg("");
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      void saveAll();
    }
  };

  const back = () => {
    setErrMsg("");
    setStep((s) => Math.max(0, s - 1));
  };

  if (!isLoaded || loading) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-black text-zinc-500">
        <span className="inline-block size-10 animate-spin rounded-full border-2 border-[var(--ml-gold)]/30 border-t-[var(--ml-gold)]" />
        <p className="text-sm">Loading…</p>
      </div>
    );
  }

  if (loadErr || !profileId) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-black px-6 text-center text-zinc-400">
        <p>{loadErr || "Profile not found."}</p>
        <Link href="/profile" className={`${CLASSES.btnPrimarySm} mt-4`}>
          Back to profile
        </Link>
      </div>
    );
  }

  const isLastStep = step === STEPS.length - 1;

  return (
    <div className="min-h-dvh bg-black px-5 py-10 text-zinc-100 sm:px-8">
      <div className="mx-auto max-w-lg">
        {/* Header */}
        <div className="mb-8 text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--ml-gold)]">
            Magicalive
          </p>
          {isNew ? (
            <>
              <h1 className="mt-2 ml-font-heading text-3xl font-semibold text-zinc-50">
                Welcome to Magicalive ✦
              </h1>
              <p className="mt-2 text-sm text-zinc-500">
                Let's set up your profile in a few quick steps.
              </p>
            </>
          ) : (
            <>
              <h1 className="mt-2 ml-font-heading text-3xl font-semibold text-zinc-50">
                Complete your profile
              </h1>
              <p className="mt-2 text-sm text-zinc-500">
                Fill in the details below to finish setting up.
              </p>
            </>
          )}
        </div>

        {/* Progress */}
        <div className="mb-8 flex items-center gap-1.5">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-all ${
                i <= step
                  ? "bg-[var(--ml-gold)]"
                  : "bg-white/10"
              }`}
            />
          ))}
        </div>
        <p className="mb-6 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
          Step {step + 1} of {STEPS.length} — {STEPS[step]}
        </p>

        {/* Step panels */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          {/* Step 0: Your name + photo */}
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <label className={labelClass}>Display name *</label>
                <input
                  className={inputClass}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. The Amazing Marcus"
                  autoFocus
                />
              </div>
              <div>
                <p className={labelClass}>Profile photo</p>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  className="hidden"
                  onChange={(e) => void onPickAvatar(e.target.files?.[0] ?? null)}
                />
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-white/20 bg-white/5 text-sm font-semibold text-zinc-400 transition hover:border-[var(--ml-gold)]/40 hover:text-zinc-200"
                  >
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : photoUploading ? (
                      <span className="text-xs">…</span>
                    ) : (
                      <span className="text-xs">📷</span>
                    )}
                  </button>
                  <p className="text-xs text-zinc-500">
                    Optional — JPG or PNG. You can always add this later.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Handle */}
          {step === 1 && (
            <div className="space-y-3">
              <div>
                <label className={labelClass}>Username *</label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-zinc-500">magicalive.com/</span>
                  <input
                    className={`${inputClass} flex-1`}
                    value={handle}
                    onChange={(e) => onHandleChange(e.target.value)}
                    placeholder="your-name"
                    autoFocus
                    autoCapitalize="none"
                    autoCorrect="off"
                  />
                </div>
                {handle.trim() && (
                  <p className={`mt-2 text-xs ${
                    handleStatus === "ok" ? "text-emerald-400" :
                    handleStatus === "taken" ? "text-red-400" :
                    "text-zinc-500"
                  }`}>
                    {handleStatus === "checking" && "Checking availability…"}
                    {handleStatus === "ok" && `✓ ${slugify(handle)} is available`}
                    {handleStatus === "taken" && `✗ ${slugify(handle)} is already taken`}
                  </p>
                )}
                <p className="mt-2 text-xs text-zinc-600">
                  Only lowercase letters, numbers, and hyphens. Min 2 characters.
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Bio */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Short bio</label>
                <input
                  className={inputClass}
                  value={shortBio}
                  onChange={(e) => setShortBio(e.target.value)}
                  placeholder="One sentence about you…"
                  autoFocus
                  maxLength={160}
                />
                <p className="mt-1 text-right text-xs text-zinc-600">{shortBio.length}/160</p>
              </div>
              <div>
                <label className={labelClass}>
                  Full bio{" "}
                  <span className="font-normal normal-case tracking-normal text-zinc-600">
                    (optional)
                  </span>
                </label>
                <textarea
                  rows={5}
                  className={`${inputClass} resize-y`}
                  value={fullBio}
                  onChange={(e) => setFullBio(e.target.value)}
                  placeholder="Tell audiences more about your background and style…"
                />
              </div>
            </div>
          )}

          {/* Step 3: Specialty tags */}
          {step === 3 && (
            <div>
              <p className={labelClass}>
                What kind of magic do you perform?{" "}
                <span className="font-normal normal-case tracking-normal text-zinc-600">
                  (pick all that apply)
                </span>
              </p>
              <div className="flex flex-wrap gap-2">
                {SPECIALTY_TAGS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTag(t)}
                    className={`rounded-full border px-3 py-1.5 text-xs transition ${
                      selectedTags.has(t)
                        ? "border-[var(--ml-gold)]/50 bg-[var(--ml-gold)]/15 text-[var(--ml-gold)]"
                        : "border-white/15 bg-white/5 text-zinc-400 hover:border-white/25"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Location */}
          {step === 4 && (
            <div>
              <p className={labelClass}>Where are you based?</p>
              <LocationPicker
                selectedCountry={locCountry}
                selectedState={locState}
                selectedCity={locCity}
                onCountryChange={setLocCountry}
                onStateChange={setLocState}
                onCityChange={setLocCity}
              />
            </div>
          )}

          {/* Step 5: Social links */}
          {step === 5 && (
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Instagram</label>
                <input
                  className={inputClass}
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  placeholder="@handle or profile URL"
                  autoFocus
                />
              </div>
              <div>
                <label className={labelClass}>YouTube</label>
                <input
                  className={inputClass}
                  value={youtube}
                  onChange={(e) => setYoutube(e.target.value)}
                  placeholder="@channel or URL"
                />
              </div>
              <div>
                <label className={labelClass}>TikTok</label>
                <input
                  className={inputClass}
                  value={tiktok}
                  onChange={(e) => setTiktok(e.target.value)}
                  placeholder="@handle"
                />
              </div>
              <div>
                <label className={labelClass}>Website</label>
                <input
                  className={inputClass}
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://yoursite.com"
                />
              </div>
            </div>
          )}
        </div>

        {/* Error */}
        {errMsg && (
          <p className="mt-3 text-sm text-red-400">{errMsg}</p>
        )}

        {/* Actions */}
        <div className="mt-6 flex items-center justify-between gap-3">
          {step > 0 ? (
            <button type="button" onClick={back} className={CLASSES.btnSecondary}>
              Back
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-3">
            {/* Skip is allowed on optional steps (2–5) */}
            {step >= 2 && !isLastStep && (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                className="text-sm text-zinc-500 transition hover:text-zinc-300"
              >
                Skip
              </button>
            )}
            <button
              type="button"
              onClick={next}
              disabled={(!canNext && step < 2) || saving}
              className={`${CLASSES.btnPrimary} disabled:opacity-50`}
            >
              {saving
                ? "Saving…"
                : isLastStep
                  ? "Finish & go to my profile"
                  : "Next →"}
            </button>
          </div>
        </div>

        {/* Skip entire wizard */}
        <p className="mt-6 text-center text-xs text-zinc-600">
          {isLastStep ? null : (
            <button
              type="button"
              onClick={() => void saveAll()}
              className="hover:text-zinc-400 hover:underline"
            >
              Skip setup — I'll fill this in later
            </button>
          )}
        </p>
      </div>
    </div>
  );
}
