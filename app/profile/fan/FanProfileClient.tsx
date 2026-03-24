"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CLASSES } from "@/lib/constants";
import { supabase } from "@/lib/supabase";

type FanProfile = {
  display_name: string | null;
  handle: string | null;
  location: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  fan_favourite_styles: string[] | null;
  fan_member_since: string | null;
};

type FollowedMagician = {
  id: string;
  profileId: string;
  displayName: string;
  handle: string | null;
  location: string | null;
  avatarUrl: string | null;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0] + parts[parts.length - 1]![0]).toUpperCase();
}

export default function FanProfileClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramId = searchParams.get("id")?.trim();
  const { user, isLoaded } = useUser();
  const [profile, setProfile] = useState<FanProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [following, setFollowing] = useState<FollowedMagician[]>([]);
  const [followLoading, setFollowLoading] = useState(true);
  const [unfollowBusyId, setUnfollowBusyId] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const profileId = paramId || user?.id;
  const isOwn = Boolean(user?.id && profileId === user.id);

  useEffect(() => {
    if (!profileId) {
      if (isLoaded && !user) router.replace("/sign-in");
      setLoading(false);
      return;
    }
    void (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "display_name, handle, location, avatar_url, banner_url, fan_favourite_styles, fan_member_since",
        )
        .eq("id", String(profileId))
        .eq("account_type", "fan")
        .maybeSingle();
      setLoading(false);
      if (error || !data) {
        setProfile(null);
        return;
      }
      setProfile(data as FanProfile);
    })();
  }, [profileId, isLoaded, user, router]);

  useEffect(() => {
    if (!isOwn || !user?.id) {
      setFollowing([]);
      setFollowLoading(false);
      return;
    }
    setFollowLoading(true);
    void (async () => {
      const { data } = await supabase
        .from("follows")
        .select("id, following_id, profiles!follows_following_id_fkey(display_name, handle, location, avatar_url)")
        .eq("follower_id", user.id);
      const mapped =
        (data ?? []).map((row: any) => ({
          id: String(row.id),
          profileId: String(row.following_id),
          displayName: row.profiles?.display_name?.trim() || "Magician",
          handle: row.profiles?.handle ?? null,
          location: row.profiles?.location ?? null,
          avatarUrl: row.profiles?.avatar_url ?? null,
        })) ?? [];
      setFollowing(mapped);
      setFollowLoading(false);
    })();
  }, [isOwn, user?.id]);

  if (!profileId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-zinc-400">
        {isLoaded ? "Sign in to view your profile." : "Loading…"}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black text-zinc-500">
        <span
          className="inline-block size-10 animate-spin rounded-full border-2 border-[var(--ml-gold)]/30 border-t-[var(--ml-gold)]"
          aria-hidden
        />
        <p className="text-sm">Loading…</p>
      </div>
    );
  }

  const name =
    profile?.display_name?.trim() ||
    (isOwn ? user?.firstName || "Fan" : "Fan");
  const handle = profile?.handle || "—";
  const memberDate = profile?.fan_member_since
    ? new Date(profile.fan_member_since)
    : isOwn && user?.createdAt
      ? new Date(user.createdAt)
      : null;
  const memberLabel = memberDate
    ? memberDate.toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      })
    : "—";
  const styles = profile?.fan_favourite_styles?.length
    ? profile.fan_favourite_styles
    : [];

  const onPickAvatar = async (file: File | null) => {
    if (!file || !isOwn || !profileId) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) return;
    setAvatarUploading(true);
    const storagePath = `${String(profileId)}/avatar.jpg`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(storagePath, file, { upsert: true });
    if (!uploadError) {
      const { data } = supabase.storage.from("avatars").getPublicUrl(storagePath);
      const publicUrl = data.publicUrl;
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", String(profileId));
      if (!updateError) {
        setProfile((prev) => (prev ? { ...prev, avatar_url: publicUrl } : prev));
      }
    }
    setAvatarUploading(false);
  };

  const unfollowMagician = async (id: string, followingId: string) => {
    if (!user?.id || unfollowBusyId) return;
    setUnfollowBusyId(id);
    setFollowing((prev) => prev.filter((x) => x.id !== id));
    await supabase
      .from("follows")
      .delete()
      .eq("id", id)
      .eq("follower_id", user.id);
    const { data: target } = await supabase
      .from("profiles")
      .select("follower_count")
      .eq("id", followingId)
      .maybeSingle();
    const next = Math.max(0, Number(target?.follower_count ?? 0) - 1);
    await supabase
      .from("profiles")
      .update({ follower_count: next })
      .eq("id", followingId);
    setUnfollowBusyId(null);
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <div className="relative h-40 sm:h-56">
        {profile?.banner_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.banner_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-violet-950 via-purple-900/90 to-indigo-950" />
        )}
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(-35deg,transparent,transparent 8px,rgba(255,255,255,0.06) 8px,rgba(255,255,255,0.06) 9px)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-black" />
      </div>

      <header className="relative -mt-10 border-b border-[var(--ml-gold)]/15 px-5 py-5 sm:-mt-12 sm:px-12">
        <div className="mx-auto flex max-w-3xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-5">
            <div className="relative">
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png"
                className="hidden"
                onChange={(e) => void onPickAvatar(e.target.files?.[0] ?? null)}
              />
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[var(--ml-gold)]/25 bg-gradient-to-br from-[#2d1f3d] to-[#534AB7] text-xl font-semibold">
                {profile?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initials(name)
                )}
              </div>
              {isOwn ? (
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute bottom-0 right-0 inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-black/80 text-xs text-zinc-100 transition hover:bg-black"
                  aria-label="Update profile photo"
                >
                  {avatarUploading ? "…" : "📷"}
                </button>
              ) : null}
            </div>
            <div>
              <h1 className="ml-font-heading text-2xl font-semibold text-zinc-50 sm:text-3xl">
                {name}
              </h1>
              <p className="mt-0.5 font-mono text-sm text-[var(--ml-gold)]">
                @{handle}
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                {profile?.location || "No location set"}
              </p>
              <p className="mt-2 text-[10px] uppercase tracking-widest text-zinc-500">
                Member since{" "}
                <span className="text-zinc-400">{memberLabel}</span>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {isOwn ? (
              <Link
                href="/profile/edit"
                className={`${CLASSES.btnSecondary} text-xs uppercase tracking-wider`}
              >
                Edit profile
              </Link>
            ) : null}
            <Link
              href="/magicians"
              className="text-xs uppercase tracking-wider text-zinc-500 transition hover:text-zinc-200"
            >
              Browse magicians →
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
        {!profile ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-6 py-12 text-center">
            <p className="mb-4 text-zinc-400">Fan profile not found.</p>
            {isOwn ? (
              <Link href="/create-profile" className={CLASSES.btnPrimarySm}>
                Create profile
              </Link>
            ) : (
              <Link href="/magicians" className={CLASSES.btnPrimarySm}>
                Browse magicians
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="mb-10">
              <h2 className="mb-3 text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--ml-gold)]">
                Favourite magic styles
              </h2>
              {styles.length ? (
                <div className="flex flex-wrap gap-2">
                  {styles.map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-[var(--ml-gold)]/35 bg-[var(--ml-gold)]/10 px-3 py-1 text-xs text-[var(--ml-gold)]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-zinc-600">None selected yet.</p>
              )}
            </div>

            <div className="space-y-8">
              <section className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
                <h2 className="mb-2 ml-font-heading text-lg font-semibold text-zinc-100">
                  Reviews written
                </h2>
                <p className="text-sm text-zinc-500">
                  Reviews you post will appear here.
                </p>
                <div className="mt-6 flex min-h-[100px] items-center justify-center rounded-lg border border-dashed border-white/10 bg-black/40 text-sm text-zinc-600">
                  No reviews yet
                </div>
              </section>

              <section className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
                <h2 className="mb-2 ml-font-heading text-lg font-semibold text-zinc-100">
                  Magicians following
                </h2>
                <p className="text-sm text-zinc-500">
                  Magicians you follow will be listed here.
                </p>
                {isOwn ? (
                  followLoading ? (
                    <div className="mt-6 flex min-h-[100px] items-center justify-center rounded-lg border border-dashed border-white/10 bg-black/40 text-sm text-zinc-600">
                      Loading followed magicians…
                    </div>
                  ) : following.length === 0 ? (
                    <div className="mt-6 flex min-h-[120px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-white/10 bg-black/40 text-sm text-zinc-600">
                      <p>You are not following anyone yet</p>
                      <Link href="/magicians" className={CLASSES.btnPrimarySm}>
                        Browse magicians
                      </Link>
                    </div>
                  ) : (
                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                      {following.map((m) => (
                        <div
                          key={m.id}
                          className="rounded-xl border border-white/10 bg-white/[0.02] p-3"
                        >
                          <Link
                            href={`/profile/magician?id=${encodeURIComponent(m.profileId)}`}
                            className="flex items-center gap-3"
                          >
                            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-gradient-to-br from-violet-900 to-indigo-950 text-xs font-semibold">
                              {m.avatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={m.avatarUrl} alt="" className="h-full w-full object-cover" />
                              ) : (
                                initials(m.displayName)
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-zinc-200">
                                {m.displayName}
                              </p>
                              <p className="truncate text-xs text-zinc-500">
                                {m.location || "—"}
                              </p>
                            </div>
                          </Link>
                          <button
                            type="button"
                            onClick={() => void unfollowMagician(m.id, m.profileId)}
                            disabled={unfollowBusyId === m.id}
                            className="mt-3 w-full rounded-lg border border-[var(--ml-gold)]/35 bg-[var(--ml-gold)]/10 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--ml-gold)] transition hover:bg-[var(--ml-gold)]/15"
                          >
                            {unfollowBusyId === m.id ? "Updating…" : "Unfollow"}
                          </button>
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  <div className="mt-6 flex min-h-[100px] items-center justify-center rounded-lg border border-dashed border-white/10 bg-black/40 text-sm text-zinc-600">
                    Follow list is private
                  </div>
                )}
              </section>

              <section className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
                <h2 className="mb-2 ml-font-heading text-lg font-semibold text-zinc-100">
                  Events saved
                </h2>
                <p className="text-sm text-zinc-500">
                  Saved shows and events will show up here.
                </p>
                <div className="mt-6 flex min-h-[100px] items-center justify-center rounded-lg border border-dashed border-white/10 bg-black/40 text-sm text-zinc-600">
                  Nothing saved yet
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
