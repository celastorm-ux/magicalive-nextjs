"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LocationPicker } from "@/components/LocationPicker";
import { MAGICIAN_AVAILABLE_FOR_OPTIONS } from "@/lib/available-for-booking";
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

const EVENT_TYPES = MAGICIAN_AVAILABLE_FOR_OPTIONS;

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm font-normal text-zinc-100 placeholder:text-zinc-500 outline-none transition focus:border-[var(--ml-gold)]/50 focus:bg-white/10";
const labelClass =
  "mb-2 block text-[10px] font-medium uppercase tracking-widest text-zinc-500";

type ProfileRow = {
  id: string;
  account_type: string | null;
  display_name: string | null;
  handle: string | null;
  email: string | null;
  location: string | null;
  age: number | null;
  short_bio: string | null;
  full_bio: string | null;
  specialty_tags: string[] | null;
  available_for: string | null;
  credentials: string[] | null;
  badges: string[] | null;
  instagram: string | null;
  tiktok: string | null;
  youtube: string | null;
  website: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  contact_email?: string | null;
  email_new_articles?: boolean | null;
  media_urls?: string[] | null;
};

function initials(name: string) {
  return (name.trim()[0] || "U").toUpperCase();
}

export default function EditProfilePage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [photoUpdating, setPhotoUpdating] = useState(false);
  const [photoUpdated, setPhotoUpdated] = useState(false);
  const [bannerUpdating, setBannerUpdating] = useState(false);
  const [bannerUpdated, setBannerUpdated] = useState(false);
  const [okMsg, setOkMsg] = useState("");
  const [errMsg, setErrMsg] = useState("");
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const bannerInputRef = useRef<HTMLInputElement | null>(null);

  const [accountType, setAccountType] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");
  const [locCountry, setLocCountry] = useState("");
  const [locState, setLocState] = useState("");
  const [locCity, setLocCity] = useState("");
  const [age, setAge] = useState("");
  const [shortBio, setShortBio] = useState("");
  const [fullBio, setFullBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [availableFor, setAvailableFor] = useState<(typeof EVENT_TYPES)[number]>(
    EVENT_TYPES[0],
  );
  const [selectedTags, setSelectedTags] = useState<Set<string>>(() => new Set());
  const [selectedBadges, setSelectedBadges] = useState<Set<string>>(() => new Set());
  const [orgOptions, setOrgOptions] = useState<Array<{ name: string; abbreviation: string | null }>>([]);
  const [credentials, setCredentials] = useState<string[]>([""]);
  const [instagram, setInstagram] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [youtube, setYoutube] = useState("");
  const [website, setWebsite] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  const [emailNewArticles, setEmailNewArticles] = useState(true);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [mediaUploading, setMediaUploading] = useState(false);
  const mediaInputRef = useRef<HTMLInputElement | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdOk, setPwdOk] = useState("");
  const [pwdErr, setPwdErr] = useState("");

  useEffect(() => {
    if (!isLoaded) return;
    if (!user?.id) {
      router.replace("/sign-in");
      return;
    }
    void (async () => {
      const [{ data }, { data: orgData }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", String(user.id)).maybeSingle(),
        supabase.from("groups").select("name, abbreviation").order("name", { ascending: true }),
      ]);
      setOrgOptions((orgData ?? []) as Array<{ name: string; abbreviation: string | null }>);
      setLoading(false);
      if (!data) {
        router.replace("/create-profile");
        return;
      }
      const p = data as unknown as ProfileRow;
      setAccountType(p.account_type || "");
      setDisplayName(p.display_name || "");
      setHandle(p.handle || "");
      const parsed = parseStoredLocation(p.location);
      setLocCountry(parsed.country);
      setLocState(parsed.state);
      setLocCity(parsed.city);
      setAge(p.age != null ? String(p.age) : "");
      setShortBio(p.short_bio || "");
      setFullBio(p.full_bio || "");
      setAvatarUrl(p.avatar_url || null);
      setBannerUrl(p.banner_url || null);
      setSelectedTags(new Set(p.specialty_tags || []));
      setSelectedBadges(new Set(p.badges || []));
      setAvailableFor(
        ((p.available_for as (typeof EVENT_TYPES)[number]) || EVENT_TYPES[0]),
      );
      setCredentials((p.credentials && p.credentials.length ? p.credentials : [""]).slice());
      setInstagram(p.instagram || "");
      setTiktok(p.tiktok || "");
      setYoutube(p.youtube || "");
      setWebsite(p.website || "");
      setContactEmail(p.contact_email?.trim() || "");
      setEmailNewArticles(p.email_new_articles !== false);
      setMediaUrls((p.media_urls ?? []).filter(Boolean));
    })();
  }, [isLoaded, user?.id, router]);

  const isMagician = accountType === "magician";
  const previewInitial = useMemo(() => initials(displayName || "User"), [displayName]);
  const shownBanner = bannerPreview || bannerUrl;

  useEffect(() => {
    return () => {
      if (bannerPreview) URL.revokeObjectURL(bannerPreview);
    };
  }, [bannerPreview]);

  useEffect(() => {
    if (loading) return;
    const scrollToPassword = () => {
      if (typeof window === "undefined" || window.location.hash !== "#password") return;
      const el = document.getElementById("password");
      if (!el) return;
      requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    };
    scrollToPassword();
    window.addEventListener("hashchange", scrollToPassword);
    return () => window.removeEventListener("hashchange", scrollToPassword);
  }, [loading]);

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }, []);

  const updateCredential = (idx: number, value: string) => {
    setCredentials((prev) => prev.map((v, i) => (i === idx ? value : v)));
  };

  const addCredential = () => setCredentials((prev) => [...prev, ""]);
  const removeCredential = (idx: number) =>
    setCredentials((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));

  const onPickAvatar = async (file: File | null) => {
    if (!file || !user?.id) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) return;
    setPhotoUpdating(true);
    setPhotoUpdated(false);
    const path = `${String(user.id)}/avatar.jpg`;
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, {
        upsert: true,
        contentType: file.type,
      });
    if (upErr) {
      setPhotoUpdating(false);
      setErrMsg("Something went wrong");
      return;
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const timestamp = new Date().getTime();
    const publicUrl = `${data.publicUrl}?t=${timestamp}`;
    const { error: dbErr } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", String(user.id));
    setPhotoUpdating(false);
    if (dbErr) {
      setErrMsg("Something went wrong");
      return;
    }
    setAvatarUrl(publicUrl);
    setPhotoUpdated(true);
    setErrMsg("");
  };

  const onPickBanner = async (file: File | null) => {
    if (!file || !user?.id) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) return;
    setBannerUpdated(false);
    setBannerUpdating(true);
    setErrMsg("");
    if (bannerPreview) URL.revokeObjectURL(bannerPreview);
    const localPreview = URL.createObjectURL(file);
    setBannerPreview(localPreview);
    const path = `${String(user.id)}/banner.jpg`;
    const { error: upErr } = await supabase.storage
      .from("banners")
      .upload(path, file, {
        upsert: true,
        contentType: file.type,
      });
    if (upErr) {
      setBannerUpdating(false);
      setErrMsg("Something went wrong");
      return;
    }
    const { data } = supabase.storage.from("banners").getPublicUrl(path);
    const timestamp = new Date().getTime();
    const publicUrl = `${data.publicUrl}?t=${timestamp}`;
    const { error: dbErr } = await supabase
      .from("profiles")
      .update({ banner_url: publicUrl })
      .eq("id", String(user.id));
    setBannerUpdating(false);
    if (dbErr) {
      setErrMsg("Something went wrong");
      return;
    }
    setBannerUrl(publicUrl);
    setBannerUpdated(true);
  };

  const onPickMedia = async (file: File | null) => {
    if (!file || !user?.id) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) return;
    if (mediaUrls.length >= 12) {
      setErrMsg("Maximum 12 photos allowed.");
      return;
    }
    setMediaUploading(true);
    setErrMsg("");
    const ext = file.type === "image/png" ? "png" : file.type === "image/gif" ? "gif" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${String(user.id)}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("profile-media")
      .upload(path, file, { upsert: false, contentType: file.type });
    setMediaUploading(false);
    if (upErr) {
      setErrMsg("Upload failed. Try again.");
      return;
    }
    const { data } = supabase.storage.from("profile-media").getPublicUrl(path);
    setMediaUrls((prev) => [...prev, data.publicUrl]);
    setOkMsg("Photo added — click Save changes to save.");
    if (mediaInputRef.current) mediaInputRef.current.value = "";
  };

  const removeMedia = (url: string) => {
    setMediaUrls((prev) => prev.filter((u) => u !== url));
  };

  const save = async () => {
    if (!user?.id) return;
    setSaving(true);
    setOkMsg("");
    setErrMsg("");
    const parsedAge = age.trim() ? parseInt(age, 10) : NaN;
    const payload = {
      display_name: displayName.trim() || null,
      handle: handle.replace(/^@/, "").trim() || null,
      location:
        locCountry.trim() && locCity.trim()
          ? formatLocation(locCity, locState, locCountry)
          : locCity.trim()
            ? locCity.trim()
            : null,
      age: Number.isFinite(parsedAge) ? parsedAge : null,
      short_bio: shortBio.trim() || null,
      full_bio: fullBio.trim() || null,
      specialty_tags: isMagician ? [...selectedTags] : null,
      badges: isMagician ? [...selectedBadges] : null,
      available_for:
        isMagician && availableFor !== EVENT_TYPES[0] ? availableFor : null,
      credentials: isMagician
        ? credentials.map((x) => x.trim()).filter(Boolean)
        : null,
      instagram: instagram.trim() || null,
      tiktok: tiktok.trim() || null,
      youtube: youtube.trim() || null,
      website: website.trim() || null,
      contact_email: isMagician ? contactEmail.trim() || null : null,
      email_new_articles: emailNewArticles,
      media_urls: mediaUrls,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", String(user.id));
    setSaving(false);
    if (error) {
      setErrMsg(error.message || "Something went wrong");
      return;
    }
    setOkMsg("Profile updated successfully");
  };

  const savePassword = async () => {
    if (!user) return;
    setPwdErr("");
    setPwdOk("");
    if (!currentPassword.trim()) {
      setPwdErr("Enter your current password.");
      return;
    }
    if (newPassword.length < 8) {
      setPwdErr("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPwdErr("New password and confirmation do not match.");
      return;
    }
    setPwdSaving(true);
    try {
      await user.updatePassword({
        currentPassword: currentPassword.trim(),
        newPassword: newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setPwdOk("Password updated successfully");
    } catch (e: unknown) {
      const errObj = e as { errors?: Array<{ message?: string; longMessage?: string }> };
      const msg = errObj.errors?.[0]?.longMessage || errObj.errors?.[0]?.message;
      setPwdErr(msg || "Could not update password.");
    } finally {
      setPwdSaving(false);
    }
  };

  const deleteAccount = async () => {
    if (!user?.id) return;
    if (!window.confirm("Are you sure? This cannot be undone")) return;
    setDeleting(true);
    setErrMsg("");
    const { error } = await supabase.from("profiles").delete().eq("id", String(user.id));
    if (error) {
      setDeleting(false);
      setErrMsg("Something went wrong");
      return;
    }
    try {
      await user.delete();
      router.replace("/");
    } catch {
      setDeleting(false);
      setErrMsg("Something went wrong");
    }
  };

  if (loading || !isLoaded) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black text-zinc-500">
        <span
          className="inline-block size-10 animate-spin rounded-full border-2 border-[var(--ml-gold)]/30 border-t-[var(--ml-gold)]"
          aria-hidden
        />
        <p className="text-sm">Loading profile…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <div className="border-b border-[var(--ml-gold)]/15 px-5 py-4 sm:px-12">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link
            href="/profile"
            className="text-xs uppercase tracking-wider text-zinc-500 transition hover:text-zinc-200"
          >
            ← Back
          </Link>
          <h1 className="ml-font-heading text-2xl font-semibold text-zinc-50">
            Edit <em className="text-[var(--ml-gold)] italic">profile</em>
          </h1>
          <div className="w-12" />
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-5 py-8 sm:px-8">
        <section className="mb-8 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <p className="mb-3 text-[10px] font-medium uppercase tracking-widest text-zinc-500">
            Banner image
          </p>
          <input
            ref={bannerInputRef}
            type="file"
            accept="image/jpeg,image/png"
            className="hidden"
            onChange={(e) => void onPickBanner(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            onClick={() => bannerInputRef.current?.click()}
            className="group relative block w-full overflow-hidden rounded-xl border border-white/10"
          >
            <div className="relative aspect-[4/1] w-full">
              {shownBanner ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={shownBanner}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <>
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-950 via-purple-900/90 to-indigo-950" />
                  <div
                    className="absolute inset-0 opacity-[0.12]"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(-35deg,transparent,transparent 8px,rgba(255,255,255,0.06) 8px,rgba(255,255,255,0.06) 9px)",
                    }}
                  />
                  <div className="absolute inset-0 grid place-items-center text-xs font-medium text-zinc-300">
                    Add a banner image
                  </div>
                </>
              )}
              <span className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-black/70 text-xs text-zinc-100">
                {bannerUpdating ? "…" : "📷"}
              </span>
            </div>
          </button>
          {bannerUpdated ? (
            <p className="mt-3 text-sm font-medium text-emerald-400">
              Banner updated
            </p>
          ) : null}
        </section>

        <section className="mb-8 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <p className="mb-3 text-[10px] font-medium uppercase tracking-widest text-zinc-500">
            Profile photo
          </p>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/jpeg,image/png"
            className="hidden"
            onChange={(e) => void onPickAvatar(e.target.files?.[0] ?? null)}
          />
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-[var(--ml-gold)]/25 bg-gradient-to-br from-[#2d1f3d] to-[#534AB7] text-xl font-semibold">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  previewInitial
                )}
              </div>
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className="absolute bottom-0 right-0 inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-black/80 text-xs text-zinc-100 transition hover:bg-black"
                aria-label="Change profile photo"
              >
                {photoUpdating ? "…" : "📷"}
              </button>
            </div>
            <div className="text-sm text-zinc-500">JPG or PNG. Max 5MB recommended.</div>
          </div>
          {photoUpdated ? (
            <p className="mt-3 text-sm font-medium text-emerald-400">Photo updated</p>
          ) : null}
        </section>

        <section className="mb-8 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <h2 className="mb-4 ml-font-heading text-xl font-semibold text-zinc-100">
            Basic info
          </h2>
          <div className="mb-4">
            <label className={labelClass}>Display name</label>
            <input className={inputClass} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div className="mb-4">
            <label className={labelClass}>Handle</label>
            <input className={inputClass} value={handle} onChange={(e) => setHandle(e.target.value)} />
            <p className="mt-1 text-[11px] text-zinc-500">
              Changing your handle changes your profile URL.
            </p>
          </div>
          <div className="mb-4">
            <label className={labelClass}>Location</label>
            <LocationPicker
              className="mt-2"
              selectedCountry={locCountry}
              selectedState={locState}
              selectedCity={locCity}
              onCountryChange={setLocCountry}
              onStateChange={setLocState}
              onCityChange={setLocCity}
            />
          </div>
          <div className="mb-4">
            <label className={labelClass}>Age (optional)</label>
            <input type="number" className={inputClass} value={age} onChange={(e) => setAge(e.target.value)} />
          </div>
          <div className="mb-4">
            <label className={labelClass}>Short bio</label>
            <input className={inputClass} value={shortBio} onChange={(e) => setShortBio(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Full bio</label>
            <textarea rows={4} className={`${inputClass} resize-y`} value={fullBio} onChange={(e) => setFullBio(e.target.value)} />
          </div>
        </section>

        {isMagician ? (
          <section className="mb-8 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <h2 className="mb-4 ml-font-heading text-xl font-semibold text-zinc-100">
              Specialty
            </h2>
            <div className="mb-4 flex flex-wrap gap-2">
              {SPECIALTY_TAGS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleTag(t)}
                  className={`rounded-full border px-3 py-1.5 text-xs transition ${
                    selectedTags.has(t)
                      ? "border-[var(--ml-gold)]/45 bg-[var(--ml-gold)]/10 text-[var(--ml-gold)]"
                      : "border-white/15 bg-white/5 text-zinc-400 hover:border-white/25"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <div>
              <label className={labelClass}>Available for</label>
              <select
                className={`${inputClass} cursor-pointer`}
                value={availableFor}
                onChange={(e) => setAvailableFor(e.target.value as (typeof EVENT_TYPES)[number])}
              >
                {EVENT_TYPES.map((o) => (
                  <option key={o} className="bg-zinc-900">
                    {o}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-6 border-t border-white/10 pt-6">
              <label className={labelClass}>Contact email</label>
              <input
                type="email"
                className={inputClass}
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="e.g. bookings@yourdomain.com"
              />
              <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
                This is the email fans can reach you on. Defaults to your account email if left empty.
              </p>
            </div>
          </section>
        ) : null}

        {isMagician && orgOptions.length > 0 ? (
          <section className="mb-8 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <h2 className="mb-1 ml-font-heading text-xl font-semibold text-zinc-100">
              Memberships
            </h2>
            <p className="mb-4 text-[11px] text-zinc-500">
              Select any organizations you belong to.
            </p>
            <div className="flex flex-wrap gap-2">
              {orgOptions.map((org) => {
                const label = org.abbreviation?.trim() || org.name;
                const active = selectedBadges.has(org.name);
                return (
                  <button
                    key={org.name}
                    type="button"
                    onClick={() =>
                      setSelectedBadges((prev) => {
                        const next = new Set(prev);
                        if (next.has(org.name)) next.delete(org.name);
                        else next.add(org.name);
                        return next;
                      })
                    }
                    className={`rounded-full border px-3 py-1.5 text-xs transition ${
                      active
                        ? "border-[var(--ml-gold)]/45 bg-[var(--ml-gold)]/10 text-[var(--ml-gold)]"
                        : "border-white/15 bg-white/5 text-zinc-400 hover:border-white/25"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}

        {isMagician ? (
          <section className="mb-8 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <h2 className="mb-4 ml-font-heading text-xl font-semibold text-zinc-100">
              Credentials
            </h2>
            <div className="space-y-3">
              {credentials.map((c, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    className={inputClass}
                    value={c}
                    onChange={(e) => updateCredential(idx, e.target.value)}
                    placeholder="e.g. IBM Member, 10+ years experience"
                  />
                  <button
                    type="button"
                    onClick={() => removeCredential(idx)}
                    className="rounded-lg border border-white/15 px-3 py-2 text-xs text-zinc-300 hover:bg-white/5"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addCredential}
                className="rounded-lg border border-white/15 px-3 py-2 text-xs text-zinc-300 hover:bg-white/5"
              >
                Add credential
              </button>
            </div>
          </section>
        ) : null}

        <section className="mb-8 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <h2 className="mb-4 ml-font-heading text-xl font-semibold text-zinc-100">
            Social links
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Instagram</label>
              <input className={inputClass} value={instagram} onChange={(e) => setInstagram(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>TikTok</label>
              <input className={inputClass} value={tiktok} onChange={(e) => setTiktok(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>YouTube</label>
              <input className={inputClass} value={youtube} onChange={(e) => setYoutube(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Website</label>
              <input className={inputClass} value={website} onChange={(e) => setWebsite(e.target.value)} />
            </div>
          </div>
        </section>

        <section className="mb-8 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="ml-font-heading text-xl font-semibold text-zinc-100">Photos</h2>
            <span className="text-[11px] text-zinc-500">{mediaUrls.length}/12</span>
          </div>
          <input
            ref={mediaInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => void onPickMedia(e.target.files?.[0] ?? null)}
          />
          {mediaUrls.length > 0 ? (
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {mediaUrls.map((url) => (
                <div key={url} className="group relative aspect-video overflow-hidden rounded-xl border border-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => void removeMedia(url)}
                    className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/80 text-xs text-zinc-100 opacity-0 transition group-hover:opacity-100 hover:bg-red-600"
                    aria-label="Remove photo"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="mb-4 text-sm text-zinc-500">No photos yet. Add some to show on your profile.</p>
          )}
          <button
            type="button"
            disabled={mediaUploading || mediaUrls.length >= 12}
            onClick={() => mediaInputRef.current?.click()}
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-medium text-zinc-300 transition hover:bg-white/10 disabled:pointer-events-none disabled:opacity-50"
          >
            {mediaUploading ? "Uploading…" : "+ Add photo"}
          </button>
          <p className="mt-2 text-[11px] text-zinc-500">JPG, PNG, WebP or GIF. Max 12 photos.</p>
        </section>

        <section className="mb-8 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <h2 className="mb-4 ml-font-heading text-xl font-semibold text-zinc-100">
            Notification preferences
          </h2>
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={emailNewArticles}
              onChange={(e) => setEmailNewArticles(e.target.checked)}
              className="mt-0.5 h-4 w-4 cursor-pointer accent-[var(--ml-gold)]"
            />
            <span>
              <span className="block text-sm font-medium text-zinc-200">New article emails</span>
              <span className="block text-xs text-zinc-500">
                Get an email when a new article is published on PinnacleMagic.
              </span>
            </span>
          </label>
        </section>

        <section id="password" className="mb-8 scroll-mt-24 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <h2 className="mb-4 ml-font-heading text-xl font-semibold text-zinc-100">Change password</h2>
          {!user?.passwordEnabled ? (
            <p className="text-sm text-zinc-500">
              Your account does not use a password (you may sign in with a social provider). Use{" "}
              <Link href="/forgot-password" className="text-[var(--ml-gold)] hover:underline">
                forgot password
              </Link>{" "}
              only if you have a password on file.
            </p>
          ) : (
            <>
              <div className="mb-4">
                <label className={labelClass}>Current password</label>
                <input
                  type="password"
                  className={inputClass}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              <div className="mb-4">
                <label className={labelClass}>New password</label>
                <input
                  type="password"
                  className={inputClass}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                />
              </div>
              <div className="mb-4">
                <label className={labelClass}>Confirm new password</label>
                <input
                  type="password"
                  className={inputClass}
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                />
              </div>
              {pwdOk ? <p className="mb-3 text-sm font-medium text-emerald-400">{pwdOk}</p> : null}
              {pwdErr ? <p className="mb-3 text-sm font-medium text-red-400">{pwdErr}</p> : null}
              <button
                type="button"
                disabled={pwdSaving}
                onClick={() => void savePassword()}
                className={`${CLASSES.btnPrimary} text-xs uppercase tracking-wider disabled:opacity-60`}
              >
                {pwdSaving ? "Saving…" : "Save password"}
              </button>
            </>
          )}
        </section>

        {okMsg ? <p className="mb-4 text-sm font-medium text-emerald-400">{okMsg}</p> : null}
        {errMsg ? <p className="mb-4 text-sm font-medium text-red-400">{errMsg}</p> : null}

        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className={`${CLASSES.btnPrimary} w-full justify-center text-xs uppercase tracking-wider disabled:opacity-60 sm:w-auto`}
        >
          {saving ? "Saving…" : "Save changes"}
        </button>

        <section className="mt-10 rounded-2xl border border-red-500/25 bg-red-500/5 p-5">
          <h2 className="mb-2 ml-font-heading text-xl font-semibold text-zinc-100">Danger zone</h2>
          <p className="mb-4 text-sm text-zinc-400">
            Deleting your account removes your profile permanently.
          </p>
          <button
            type="button"
            onClick={() => void deleteAccount()}
            disabled={deleting}
            className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/20 disabled:opacity-60"
          >
            {deleting ? "Deleting…" : "Delete account"}
          </button>
        </section>
      </div>
    </div>
  );
}

