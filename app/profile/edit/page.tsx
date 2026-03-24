"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CLASSES } from "@/lib/constants";
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

const EVENT_TYPES = [
  "Select event types…",
  "Corporate events",
  "Private parties",
  "Theater / stage",
  "Weddings",
  "Festivals",
  "All of the above",
] as const;

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
  instagram: string | null;
  tiktok: string | null;
  youtube: string | null;
  website: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  contact_email?: string | null;
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
  const [location, setLocation] = useState("");
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
  const [credentials, setCredentials] = useState<string[]>([""]);
  const [instagram, setInstagram] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [youtube, setYoutube] = useState("");
  const [website, setWebsite] = useState("");
  const [contactEmail, setContactEmail] = useState("");

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
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", String(user.id))
        .maybeSingle();
      setLoading(false);
      if (!data) {
        router.replace("/create-profile");
        return;
      }
      const p = data as unknown as ProfileRow;
      setAccountType(p.account_type || "");
      setDisplayName(p.display_name || "");
      setHandle(p.handle || "");
      setLocation(p.location || "");
      setAge(p.age != null ? String(p.age) : "");
      setShortBio(p.short_bio || "");
      setFullBio(p.full_bio || "");
      setAvatarUrl(p.avatar_url || null);
      setBannerUrl(p.banner_url || null);
      setSelectedTags(new Set(p.specialty_tags || []));
      setAvailableFor(
        ((p.available_for as (typeof EVENT_TYPES)[number]) || EVENT_TYPES[0]),
      );
      setCredentials((p.credentials && p.credentials.length ? p.credentials : [""]).slice());
      setInstagram(p.instagram || "");
      setTiktok(p.tiktok || "");
      setYoutube(p.youtube || "");
      setWebsite(p.website || "");
      setContactEmail(p.contact_email?.trim() || "");
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

  const save = async () => {
    if (!user?.id) return;
    setSaving(true);
    setOkMsg("");
    setErrMsg("");
    const parsedAge = age.trim() ? parseInt(age, 10) : NaN;
    const payload = {
      display_name: displayName.trim() || null,
      handle: handle.replace(/^@/, "").trim() || null,
      location: location.trim() || null,
      age: Number.isFinite(parsedAge) ? parsedAge : null,
      short_bio: shortBio.trim() || null,
      full_bio: fullBio.trim() || null,
      specialty_tags: isMagician ? [...selectedTags] : null,
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
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", String(user.id));
    setSaving(false);
    if (error) {
      setErrMsg("Something went wrong");
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
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Location</label>
              <input className={inputClass} value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Age (optional)</label>
              <input type="number" className={inputClass} value={age} onChange={(e) => setAge(e.target.value)} />
            </div>
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

