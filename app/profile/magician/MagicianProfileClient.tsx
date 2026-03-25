"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AvailabilityCalendar } from "@/components/AvailabilityCalendar";
import { BookingModal } from "@/components/BookingModal";
import { ContactModal } from "@/components/ContactModal";
import { ReviewForm, type CreatedReview } from "@/components/ReviewForm";
import { CLASSES } from "@/lib/constants";
import { formatLastSeen } from "@/lib/utils";
import { createNotification } from "@/lib/notifications";
import { supabase } from "@/lib/supabase";

const TABS = [
  "About",
  "Media",
  "Shows",
  "Reviews",
  "Articles",
  "History",
] as const;
type Tab = (typeof TABS)[number];

function tabLabel(t: Tab): string {
  return t === "Shows" ? "Shows & Lectures" : t;
}

type MagicianRow = {
  id: string;
  display_name: string | null;
  handle: string | null;
  location: string | null;
  short_bio: string | null;
  full_bio: string | null;
  specialty_tags: string[] | null;
  credentials: string[] | null;
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
  youtube: string | null;
  website: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
  follower_count: number | null;
  review_count: number | null;
  years_active: number | null;
  media_urls: string[] | null;
  online_visible: boolean | null;
  updated_at: string | null;
  banner_url: string | null;
  profile_views: number | null;
  email: string | null;
  contact_email: string | null;
  is_founding_member: boolean | null;
  is_online: boolean | null;
  last_seen: string | null;
  is_unclaimed?: boolean | null;
};

type ShowRow = {
  id: string;
  name: string;
  venue_name: string | null;
  venue_id: string | null;
  city: string | null;
  date: string | null;
  time?: string | null;
  is_past: boolean | null;
  ticket_url: string | null;
  event_type?: string | null;
  skill_level?: string | null;
  includes_workbook?: boolean | null;
  includes_props?: boolean | null;
  max_attendees?: number | null;
  is_online?: boolean | null;
};

type ReviewRow = {
  id: string;
  reviewer_name: string | null;
  reviewer_display_name: string | null;
  rating: number | null;
  body: string | null;
  show_attended: string | null;
  created_at: string | null;
};

type ArticleRow = {
  id: string;
  title: string | null;
  excerpt: string | null;
  category: string | null;
  published_at: string | null;
  read_time: string | null;
};

export type MagicianProfileInitialBundle = {
  profile: MagicianRow;
  shows: ShowRow[];
  pastShows: ShowRow[];
  reviews: ReviewRow[];
  articles: ArticleRow[];
};

const MEDIA_FALLBACK = [
  "from-violet-900/80 to-purple-950",
  "from-indigo-900/80 to-slate-950",
  "from-amber-900/60 to-stone-950",
  "from-teal-900/70 to-emerald-950",
  "from-rose-900/60 to-zinc-950",
  "from-cyan-900/50 to-blue-950",
];

function initialFromName(name: string) {
  return (name.trim()[0] || "M").toUpperCase();
}

function toExternalUrl(raw: string): string {
  return raw.startsWith("http://") || raw.startsWith("https://")
    ? raw
    : `https://${raw}`;
}

function extractHandle(url: string | null, platform: "instagram" | "tiktok" | "youtube" | "facebook"): string | null {
  if (!url?.trim()) return null;
  const clean = url.trim().replace(/\/$/, "");
  const parts = clean.split("/");
  const last = parts[parts.length - 1] || "";
  if (!last) return null;

  if (platform === "instagram" || platform === "tiktok") {
    return last.startsWith("@") ? last : `@${last}`;
  }
  if (platform === "youtube") {
    return last.startsWith("@") ? last : `@${last}`;
  }
  if (platform === "facebook") {
    return last.startsWith("/") ? last : `/${last.replace(/^@/, "")}`;
  }
  return last;
}

function socialLink(platform: "instagram" | "tiktok" | "youtube" | "facebook", raw: string | null): string | null {
  if (!raw?.trim()) return null;
  const value = raw.trim();
  if (value.startsWith("http://") || value.startsWith("https://")) return value;

  const normalized = value.replace(/^@/, "").replace(/^\//, "");
  if (!normalized) return null;

  if (platform === "instagram") return `https://instagram.com/${normalized}`;
  if (platform === "tiktok") return `https://tiktok.com/@${normalized}`;
  if (platform === "youtube") return `https://youtube.com/@${normalized}`;
  return `https://facebook.com/${normalized}`;
}

function youtubeEmbedUrl(raw: string | null): string | null {
  if (!raw?.trim()) return null;
  const v = raw.trim();
  try {
    const u = new URL(toExternalUrl(v));
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.split("/").filter(Boolean)[0];
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (u.hostname.includes("youtube.com")) {
      const watchId = u.searchParams.get("v");
      if (watchId) return `https://www.youtube.com/embed/${watchId}`;
      const p = u.pathname.split("/").filter(Boolean);
      if (p[0] === "shorts" && p[1]) return `https://www.youtube.com/embed/${p[1]}`;
      if (p[0] === "embed" && p[1]) return `https://www.youtube.com/embed/${p[1]}`;
    }
  } catch {
    // fall through to null
  }
  return null;
}

type MagicianProfileClientProps = {
  resolvedProfileId?: string;
  initial?: MagicianProfileInitialBundle | null;
};

export default function MagicianProfileClient({
  resolvedProfileId = "",
  initial = null,
}: MagicianProfileClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramId = searchParams.get("id")?.trim();
  const { user, isLoaded } = useUser();
  const [tab, setTab] = useState<Tab>("About");
  const [profile, setProfile] = useState<MagicianRow | null>(
    () => (initial?.profile as MagicianRow | undefined) ?? null,
  );
  const [shows, setShows] = useState<ShowRow[]>(() => initial?.shows ?? []);
  const [pastShows, setPastShows] = useState<ShowRow[]>(() => initial?.pastShows ?? []);
  const [reviews, setReviews] = useState<ReviewRow[]>(() => initial?.reviews ?? []);
  const [articles, setArticles] = useState<ArticleRow[]>(() => initial?.articles ?? []);
  const [loading, setLoading] = useState(() => !initial?.profile);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [bookingDate, setBookingDate] = useState(() => new Date().toISOString().split("T")[0]!);
  const [showsListKind, setShowsListKind] = useState<"shows" | "lectures">("shows");
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [viewerIsAdmin, setViewerIsAdmin] = useState(false);

  const profileId = (paramId || resolvedProfileId || user?.id || "").trim();

  useEffect(() => {
    if (!isLoaded || !user?.id) {
      setViewerIsAdmin(false);
      return;
    }
    void (async () => {
      const { data } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
      setViewerIsAdmin(Boolean((data as { is_admin?: boolean | null } | null)?.is_admin));
    })();
  }, [isLoaded, user?.id]);

  const load = useCallback(async () => {
    if (!profileId) {
      console.log("No profile ID yet, waiting for user/search params");
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: p } = await supabase
      .from("profiles")
      .select("*, is_online, last_seen")
      .eq("id", profileId)
      .eq("account_type", "magician")
      .maybeSingle();
    if (!p) {
      setProfile(null);
      setShows([]);
      setPastShows([]);
      setReviews([]);
      setLoading(false);
      return;
    }
    setProfile(p as unknown as MagicianRow);
    const today = new Date().toISOString().split("T")[0];
    const { data: sh, error: shErr } = await supabase
      .from("shows")
      .select("*")
      .eq("magician_id", profileId)
      .eq("is_past", false)
      .gte("date", today)
      .order("date", { ascending: true });
    setShows(!shErr && sh ? (sh as ShowRow[]) : []);
    const { data: psh, error: pshErr } = await supabase
      .from("shows")
      .select("*")
      .eq("magician_id", profileId)
      .or(`is_past.eq.true,date.lt.${today}`)
      .order("date", { ascending: false });
    setPastShows(!pshErr && psh ? (psh as ShowRow[]) : []);
    const { data: rv, error: rvErr } = await supabase
      .from("reviews")
      .select(
        "id, reviewer_name, reviewer_display_name, rating, body, show_attended, created_at",
      )
      .eq("magician_id", profileId)
      .order("created_at", { ascending: false });
    setReviews(!rvErr && rv ? (rv as ReviewRow[]) : []);
    const { data: ar, error: arErr } = await supabase
      .from("articles")
      .select("id, title, excerpt, category, published_at, read_time")
      .eq("author_id", profileId)
      .eq("status", "published")
      .order("published_at", { ascending: false });
    setArticles(!arErr && ar ? (ar as ArticleRow[]) : []);
    setLoading(false);
  }, [profileId]);

  useEffect(() => {
    if (!profileId) {
      setLoading(false);
      return;
    }
    // When the parent already supplied a full bundle for this profileId, skip client
    // refetch. Important for React Strict Mode (dev): it runs this effect twice; a ref
    // gate would let the second run fall through and call load() again — causing a
    // second spinner and duplicate Supabase work. This condition is stable across replays.
    const initialMatches =
      initial?.profile != null && (initial.profile as MagicianRow).id === profileId;
    if (initialMatches) {
      setLoading(false);
      return;
    }
    void load();
  }, [load, profileId, initial?.profile]);

  useEffect(() => {
    if (!isLoaded || !user?.id || user.id !== profileId) return;

    const refreshOwnProfile = () => {
      void load();
    };

    // If presence marks this user online shortly after mount,
    // refresh so their own profile badge updates immediately.
    const onPresenceOnline = (event: Event) => {
      const detail = (event as CustomEvent<{ id?: string }>).detail;
      if (detail?.id === user.id) refreshOwnProfile();
    };

    const timer = setTimeout(refreshOwnProfile, 1200);
    window.addEventListener("ml:presence-online", onPresenceOnline as EventListener);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("ml:presence-online", onPresenceOnline as EventListener);
    };
  }, [isLoaded, user?.id, profileId, load]);

  useEffect(() => {
    if (!isLoaded || !profileId) return;
    if (user?.id && user.id === profileId) return;
    void (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("profile_views")
        .eq("id", profileId)
        .maybeSingle();
      const next = Number(data?.profile_views ?? 0) + 1;
      await supabase.from("profiles").update({ profile_views: next }).eq("id", profileId);
    })();
  }, [isLoaded, profileId, user?.id]);

  useEffect(() => {
    if (!user?.id || !profileId || user.id === profileId) {
      setIsFollowing(false);
      return;
    }
    void (async () => {
      const { data } = await supabase
        .from("follows")
        .select("*")
        .eq("follower_id", user.id)
        .eq("following_id", profileId)
        .maybeSingle();
      setIsFollowing(Boolean(data));
    })();
  }, [user?.id, profileId]);

  const isOwn = Boolean(user?.id && profileId === user.id);
  const showUnclaimedClaimBanner =
    Boolean(profile?.is_unclaimed) &&
    !viewerIsAdmin &&
    (!user?.id || user.id !== profileId);
  const upcoming = useMemo(() => shows, [shows]);
  const upcomingShowEvents = useMemo(
    () => upcoming.filter((s) => (s.event_type ?? "show") !== "lecture"),
    [upcoming],
  );
  const upcomingLectures = useMemo(
    () => upcoming.filter((s) => s.event_type === "lecture"),
    [upcoming],
  );
  const past = useMemo(() => pastShows, [pastShows]);
  const avgRating = useMemo(() => {
    const r = reviews.filter((x) => x.rating != null);
    if (!r.length) return null;
    return (
      r.reduce((a, b) => a + (b.rating ?? 0), 0) / r.length
    ).toFixed(1);
  }, [reviews]);

  if (!isLoaded && !initial?.profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-zinc-500">
        Loading…
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

  if (loading) {
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

  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black px-6 text-center">
        <p className="text-zinc-400">Magician profile not found.</p>
        <Link href="/magicians" className={CLASSES.btnPrimarySm}>
          Back to directory
        </Link>
      </div>
    );
  }

  const name = profile.display_name?.trim() || "Magician";
  const handle = profile.handle || "magician";
  const bio =
    profile.full_bio?.trim() ||
    profile.short_bio?.trim() ||
    "No biography yet.";
  const tags = profile.specialty_tags ?? [];
  const creds = profile.credentials ?? [];
  const media =
    (profile.media_urls?.filter(Boolean).length ?? 0) > 0
      ? profile.media_urls!
      : [];
  const memberSince = profile.updated_at
    ? new Date(profile.updated_at).toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      })
    : "—";
  const youtubeEmbed = youtubeEmbedUrl(profile.youtube);

  const onPickAvatar = async (file: File | null) => {
    if (!file || !profile || !isOwn) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) return;
    setAvatarUploading(true);
    const storagePath = `${profile.id}/avatar.jpg`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(storagePath, file, { upsert: true });
    if (!uploadError) {
      const { data } = supabase.storage.from("avatars").getPublicUrl(storagePath);
      const publicUrl = data.publicUrl;
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", profile.id);
      if (!updateError) {
        setProfile((prev) => (prev ? { ...prev, avatar_url: publicUrl } : prev));
      }
    }
    setAvatarUploading(false);
  };

  const toggleFollow = async () => {
    if (!user?.id || !profile || isOwn || followBusy) return;
    setFollowBusy(true);
    const currentlyFollowing = isFollowing;
    setIsFollowing(!currentlyFollowing);
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            follower_count: Math.max(
              0,
              Number(prev.follower_count ?? 0) + (currentlyFollowing ? -1 : 1),
            ),
          }
        : prev,
    );
    if (currentlyFollowing) {
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", profile.id);
      await supabase
        .from("profiles")
        .update({ follower_count: Math.max(0, Number(profile.follower_count ?? 0) - 1) })
        .eq("id", profile.id);
    } else {
      const { error: followInsertErr } = await supabase
        .from("follows")
        .insert({ follower_id: user.id, following_id: profile.id });
      if (!followInsertErr) {
        await supabase
          .from("profiles")
          .update({ follower_count: Number(profile.follower_count ?? 0) + 1 })
          .eq("id", profile.id);
      }
      const fanName =
        user.fullName?.trim() ||
        user.firstName?.trim() ||
        user.username?.trim() ||
        "Someone";
      const followerCount = Number(profile.follower_count ?? 0) + 1;
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      if (!followInsertErr) {
        const { data: selfProf } = await supabase
          .from("profiles")
          .select("avatar_url")
          .eq("id", user.id)
          .maybeSingle();
        void createNotification({
          recipientId: profile.id,
          senderId: user.id,
          senderName: fanName,
          senderAvatar: selfProf?.avatar_url?.trim() || undefined,
          type: "new_follower",
          message: `${fanName} started following you`,
          link: `/profile/magician?id=${encodeURIComponent(user.id)}`,
        });
      }
      void fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "new_follower",
          data: {
            follower_id: user.id,
            following_id: profile.id,
            fan_name: fanName,
            follower_count: followerCount,
            fan_profile_url: `${origin}/profile/fan?id=${encodeURIComponent(user.id)}`,
          },
        }),
      });
    }
    setFollowBusy(false);
  };

  const onReviewSubmitted = (newReview: CreatedReview) => {
    setReviews((prev) => [newReview as ReviewRow, ...prev]);
    setProfile((prev) =>
      prev
        ? { ...prev, review_count: Number(prev.review_count ?? 0) + 1 }
        : prev,
    );
  };

  return (
    <div className="min-h-screen bg-black pb-20 text-zinc-100">
      {showUnclaimedClaimBanner ? (
        <div className="border-b border-amber-600/40 bg-gradient-to-r from-amber-600/25 via-amber-500/20 to-amber-600/25 px-4 py-4 sm:px-8">
          <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-amber-100/95 sm:text-base">
              Is this you? Claim this profile to take ownership, edit your details and manage your shows.
            </p>
            <Link
              href={`/claim-profile?id=${encodeURIComponent(profile.id)}`}
              className="inline-flex shrink-0 items-center justify-center rounded-xl border border-amber-800/50 bg-black/30 px-4 py-2.5 text-sm font-semibold text-amber-50 transition hover:border-amber-500/60 hover:bg-black/45"
            >
              Claim this profile →
            </Link>
          </div>
        </div>
      ) : null}
      <div className="relative h-56 sm:h-72 md:h-80">
        {profile.banner_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.banner_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div
            className="absolute inset-0 bg-gradient-to-br from-violet-950 via-purple-900/90 to-indigo-950"
            aria-hidden
          />
        )}
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage: `repeating-linear-gradient(-35deg,transparent,transparent 8px,rgba(255,255,255,0.06) 8px,rgba(255,255,255,0.06) 9px)`,
          }}
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-black"
          aria-hidden
        />
        <div className="absolute left-5 top-4 sm:left-10">
          <Link
            href="/magicians"
            className="text-xs uppercase tracking-wider text-zinc-400 transition hover:text-zinc-100"
          >
            ← Directory
          </Link>
        </div>
      </div>

      <div className={`${CLASSES.section} relative -mt-16 max-w-6xl sm:-mt-20`}>
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
          <div className="min-w-0 flex-1">
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-end sm:gap-6">
              <div className="relative mx-auto shrink-0 sm:mx-0">
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  className="hidden"
                  onChange={(e) => void onPickAvatar(e.target.files?.[0] ?? null)}
                />
                <div
                  className={`flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-black text-5xl shadow-xl ring-4 sm:h-32 sm:w-32 sm:text-6xl ${
                    profile.online_visible
                      ? "ring-emerald-500/70"
                      : "ring-zinc-700/50"
                  } bg-gradient-to-br from-violet-800 to-indigo-950`}
                >
                  {profile.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.avatar_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span aria-hidden className="text-4xl font-semibold text-zinc-100">
                      {initialFromName(name)}
                    </span>
                  )}
                </div>
                {isOwn ? (
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="absolute bottom-1 right-1 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black/80 text-xs text-zinc-100 transition hover:bg-black"
                    aria-label="Update profile photo"
                  >
                    {avatarUploading ? "…" : "📷"}
                  </button>
                ) : null}
              </div>
              <div className="mt-4 flex-1 text-center sm:mt-0 sm:pb-1 sm:text-left">
                <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  <h1 className="ml-font-heading text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl md:text-5xl">
                    {name}
                  </h1>
                  {profile.is_founding_member ? (
                    <span className="inline-flex items-center rounded-full border border-[var(--ml-gold)]/35 bg-[var(--ml-gold)]/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--ml-gold)]">
                      Founding Member ♣
                    </span>
                  ) : null}
                  {profile.is_verified ? (
                    <span className="inline-flex items-center rounded-full border border-[var(--ml-gold)]/35 bg-[var(--ml-gold)]/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--ml-gold)]">
                      Verified
                    </span>
                  ) : null}
                  {profile.is_online ? (
                    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-200">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                      </span>
                      Online now
                    </span>
                  ) : profile.last_seen ? (
                    <span className="text-[10px] font-medium text-zinc-500">
                      Last seen {formatLastSeen(profile.last_seen)}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-[var(--ml-gold)]">@{handle}</p>
                <p className="mt-1 text-sm text-zinc-400">
                  {profile.location ? (
                    <Link
                      href={`/magicians?city=${encodeURIComponent(profile.location.split(",")[0]?.trim() || profile.location)}`}
                      className="transition hover:text-[var(--ml-gold)] hover:underline"
                    >
                      {profile.location}
                    </Link>
                  ) : (
                    "Location not set"
                  )}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Member since {memberSince}
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-3 sm:justify-start">
                  {isOwn ? (
                    <>
                      <Link
                        href="/dashboard"
                        className={`${CLASSES.btnPrimary} px-6`}
                      >
                        Dashboard
                      </Link>
                      <Link
                        href="/profile/edit"
                        className={`${CLASSES.btnSecondary} px-6`}
                      >
                        Edit profile
                      </Link>
                    </>
                  ) : (
                    <>
                      {user?.id ? (
                        <button
                          type="button"
                          onClick={() => void toggleFollow()}
                          disabled={followBusy}
                          className={`${CLASSES.btnPrimary} px-6`}
                        >
                          {isFollowing ? "♥ Following" : "♡ Follow"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => router.push("/sign-in")}
                          className={`${CLASSES.btnPrimary} px-6`}
                        >
                          Follow
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setBookingDate(new Date().toISOString().split("T")[0]!);
                          setBookingOpen(true);
                        }}
                        className={CLASSES.btnSecondary}
                      >
                        Book for event
                      </button>
                      <button
                        type="button"
                        onClick={() => setContactOpen(true)}
                        className="rounded-2xl border border-[var(--ml-gold)]/45 bg-transparent px-6 py-2.5 text-sm font-semibold text-[var(--ml-gold)] transition hover:border-[var(--ml-gold)]/70 hover:bg-[var(--ml-gold)]/10"
                      >
                        Contact
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-5">
              {[
                { label: "Rating", value: avgRating ?? "—" },
                { label: "Reviews", value: String(reviews.length) },
                {
                  label: "Followers",
                  value: String(profile.follower_count ?? 0),
                },
                { label: "Shows & lectures", value: String(upcoming.length) },
                {
                  label: "Years active",
                  value: String(profile.years_active ?? "—"),
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="bg-black/90 px-3 py-4 text-center sm:py-5"
                >
                  <div className="ml-font-heading text-xl font-semibold text-[var(--ml-gold)] sm:text-2xl">
                    {s.value}
                  </div>
                  <div className="mt-1 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 border-b border-white/10">
              <div className="-mb-px flex gap-1 overflow-x-auto pb-px scrollbar-none">
                {TABS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(t)}
                    className={`shrink-0 border-b-2 px-4 py-3 text-sm font-medium transition ${
                      tab === t
                        ? "border-[var(--ml-gold)] text-[var(--ml-gold)]"
                        : "border-transparent text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {tabLabel(t)}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-8 min-h-[200px]">
              {tab === "About" && (
                <div>
                  <div className="flex flex-wrap gap-2">
                    {tags.length ? (
                      tags.map((tag) => (
                        <Link
                          key={tag}
                          href={`/magicians?style=${encodeURIComponent(tag)}`}
                          className={`${CLASSES.tag} cursor-pointer transition hover:border-[var(--ml-gold)]/45 hover:bg-[var(--ml-gold)]/10`}
                        >
                          {tag}
                        </Link>
                      ))
                    ) : (
                      <span className="text-sm text-zinc-600">
                        No specialty tags yet.
                      </span>
                    )}
                  </div>
                  <h2 className="mt-8 ml-font-heading text-xl font-semibold text-zinc-100">
                    Biography
                  </h2>
                  <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-zinc-400">
                    {bio}
                  </div>
                  <div className="mt-8">
                    <h2 className="mb-3 ml-font-heading text-xl font-semibold text-zinc-100">
                      Availability
                    </h2>
                    <AvailabilityCalendar
                      magicianId={profile.id}
                      isOwner={isOwn}
                      onRequestBooking={(date) => {
                        if (isOwn) return;
                        setBookingDate(date);
                        setBookingOpen(true);
                      }}
                    />
                  </div>
                </div>
              )}
              {tab === "Media" && (
                <div className="space-y-4">
                  {youtubeEmbed ? (
                    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                      <div className="aspect-video w-full">
                        <iframe
                          src={youtubeEmbed}
                          title="YouTube latest video"
                          className="h-full w-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                        />
                      </div>
                    </div>
                  ) : null}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4">
                    {media.length
                      ? media.map((url, i) => (
                          <a
                            key={url + i}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="aspect-video overflow-hidden rounded-xl border border-white/10"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={url}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          </a>
                        ))
                      : MEDIA_FALLBACK.map((g, i) => (
                          <div
                            key={i}
                            className={`aspect-video rounded-xl bg-gradient-to-br ${g} border border-white/10`}
                          />
                        ))}
                  </div>
                </div>
              )}
              {tab === "Shows" && (
                <div className="space-y-4">
                  <div className="flex gap-2 border-b border-white/10">
                    <button
                      type="button"
                      onClick={() => setShowsListKind("shows")}
                      className={`border-b-2 px-4 py-2 text-sm font-semibold transition ${
                        showsListKind === "shows"
                          ? "border-[var(--ml-gold)] text-[var(--ml-gold)]"
                          : "border-transparent text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      Shows
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowsListKind("lectures")}
                      className={`border-b-2 px-4 py-2 text-sm font-semibold transition ${
                        showsListKind === "lectures"
                          ? "border-violet-400 text-violet-200"
                          : "border-transparent text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      Lectures
                    </button>
                  </div>
                  <ul className="divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/[0.02]">
                    {showsListKind === "shows" ? (
                      upcomingShowEvents.length ? (
                        upcomingShowEvents.map((show) => (
                          <li
                            key={show.id}
                            className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                          >
                            <div>
                              <p className="text-sm font-semibold text-[var(--ml-gold)]">
                                {show.date
                                  ? new Date(show.date).toLocaleDateString(undefined, {
                                      dateStyle: "medium",
                                    })
                                  : "Date TBA"}
                                {show.time ? ` · ${show.time}` : ""}
                              </p>
                              <Link
                                href={`/events/${encodeURIComponent(show.id)}`}
                                className="mt-1 inline-flex ml-font-heading text-lg font-semibold text-zinc-100 transition hover:underline"
                              >
                                {show.name}
                              </Link>
                              <div className="mt-0.5 text-sm text-zinc-500">
                                {show.venue_id && show.venue_name?.trim() ? (
                                  <Link
                                    href={`/venues/${encodeURIComponent(show.venue_id)}`}
                                    className="text-[var(--ml-gold)]/85 transition hover:text-[var(--ml-gold)] hover:underline"
                                  >
                                    {show.venue_name}
                                  </Link>
                                ) : (
                                  <span>{show.venue_name || "Venue TBA"}</span>
                                )}
                                {show.city ? <span>{` · ${show.city}`}</span> : null}
                              </div>
                            </div>
                            {show.ticket_url?.trim() ? (
                              <a
                                href={show.ticket_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={CLASSES.btnPrimarySm}
                              >
                                Tickets
                              </a>
                            ) : (
                              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                                Free / enquire
                              </span>
                            )}
                          </li>
                        ))
                      ) : (
                        <li className="px-5 py-10 text-center text-sm text-zinc-500">No upcoming shows</li>
                      )
                    ) : upcomingLectures.length ? (
                      upcomingLectures.map((show) => (
                        <li
                          key={show.id}
                          className="flex flex-col gap-3 border-l-2 border-l-violet-500/40 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                        >
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full border border-violet-400/35 bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-200">
                                Lecture
                              </span>
                              <p className="text-sm font-semibold text-violet-200/90">
                                {show.date
                                  ? new Date(show.date).toLocaleDateString(undefined, {
                                      dateStyle: "medium",
                                    })
                                  : "Date TBA"}
                                {show.time ? ` · ${show.time}` : ""}
                              </p>
                            </div>
                            <Link
                              href={`/events/${encodeURIComponent(show.id)}`}
                              className="mt-1 inline-flex ml-font-heading text-lg font-semibold text-zinc-100 transition hover:underline"
                            >
                              {show.name}
                            </Link>
                            {show.skill_level ? (
                              <p className="mt-1 text-xs font-medium text-violet-300/90">Level: {show.skill_level}</p>
                            ) : null}
                            <div className="mt-0.5 text-sm text-zinc-500">
                              {show.is_online ? (
                                <span className="text-sky-300/90">Online</span>
                              ) : show.venue_id && show.venue_name?.trim() ? (
                                <Link
                                  href={`/venues/${encodeURIComponent(show.venue_id)}`}
                                  className="text-[var(--ml-gold)]/85 transition hover:text-[var(--ml-gold)] hover:underline"
                                >
                                  {show.venue_name}
                                </Link>
                              ) : (
                                <span>{show.venue_name || "Venue TBA"}</span>
                              )}
                              {!show.is_online && show.city ? <span>{` · ${show.city}`}</span> : null}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {show.max_attendees != null && show.max_attendees > 0 ? (
                                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-zinc-400">
                                  Max {show.max_attendees}
                                </span>
                              ) : null}
                              {show.includes_workbook ? (
                                <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-100">
                                  Workbook
                                </span>
                              ) : null}
                              {show.includes_props ? (
                                <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-100">
                                  Props
                                </span>
                              ) : null}
                            </div>
                          </div>
                          {show.ticket_url?.trim() ? (
                            <a
                              href={show.ticket_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={CLASSES.btnPrimarySm}
                            >
                              Register
                            </a>
                          ) : (
                            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                              Free / enquire
                            </span>
                          )}
                        </li>
                      ))
                    ) : (
                      <li className="px-5 py-10 text-center text-sm text-zinc-500">No upcoming lectures</li>
                    )}
                  </ul>
                </div>
              )}
              {tab === "Reviews" && (
                <div className="w-full space-y-6">
                  <ReviewForm
                    magicianId={profile.id}
                    isOwnProfile={isOwn}
                    onSubmitted={onReviewSubmitted}
                  />
                  {reviews.length ? (
                    reviews.map((r) => (
                      <article
                        key={r.id}
                        className="w-full rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-7"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-lg font-semibold text-zinc-100">
                            {r.reviewer_display_name || r.reviewer_name || "Anonymous"}
                          </span>
                          <div className="flex items-center gap-1 text-[var(--ml-gold)]">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <span
                                key={i}
                                className={
                                  i < (r.rating ?? 0) ? "" : "opacity-25"
                                }
                              >
                                ★
                              </span>
                            ))}
                          </div>
                        </div>
                        <p className="mt-1 text-[11px] text-zinc-600">
                          {r.created_at
                            ? new Date(r.created_at).toLocaleDateString()
                            : ""}
                        </p>
                        <p className="mt-4 text-sm leading-relaxed text-zinc-300">
                          {r.body || "—"}
                        </p>
                        {r.show_attended ? (
                          <p className="mt-4 text-xs text-zinc-500">
                            Show:{" "}
                            <span className="text-zinc-400">
                              {r.show_attended}
                            </span>
                          </p>
                        ) : null}
                      </article>
                    ))
                  ) : (
                    <p className="text-center text-sm text-zinc-500">
                      No reviews yet.
                    </p>
                  )}
                </div>
              )}
              {tab === "Articles" && (
                <div className="space-y-3">
                  {articles.length ? (
                    articles.map((a) => (
                      <Link
                        key={a.id}
                        href={`/articles/${encodeURIComponent(a.id)}`}
                        className="block rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-[var(--ml-gold)]/35"
                      >
                        <p className="ml-font-heading text-lg text-zinc-100">
                          {a.title?.trim() || "Untitled article"}
                        </p>
                        <p className="mt-2 text-sm text-zinc-500">
                          {a.category || "General"} ·{" "}
                          {a.published_at
                            ? new Date(a.published_at).toLocaleDateString()
                            : "Unpublished"}{" "}
                          · {a.read_time || "5 min read"}
                        </p>
                        {a.excerpt?.trim() ? (
                          <p className="mt-2 text-sm text-zinc-400">{a.excerpt}</p>
                        ) : null}
                      </Link>
                    ))
                  ) : (
                    <p className="text-sm text-zinc-500">No published articles yet.</p>
                  )}
                </div>
              )}
              {tab === "History" && (
                <div className="overflow-hidden rounded-2xl border border-white/10">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/[0.04] text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                        <th className="px-4 py-3 sm:px-5">Date</th>
                        <th className="px-4 py-3 sm:px-5">Show</th>
                        <th className="hidden px-4 py-3 sm:table-cell sm:px-5">
                          Venue
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {past.length ? (
                        past.map((show) => (
                          <tr key={show.id}>
                            <td className="px-4 py-3 text-zinc-400 sm:px-5">
                              {show.date
                                ? new Date(show.date).toLocaleDateString()
                                : "—"}
                            </td>
                            <td className="px-4 py-3 font-medium text-zinc-200 sm:px-5">
                              {show.name}
                            </td>
                            <td className="hidden px-4 py-3 text-zinc-500 sm:table-cell sm:px-5">
                              {show.venue_name || "—"}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={3}
                            className="px-5 py-10 text-center text-zinc-500"
                          >
                            No past shows on record.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <aside className="w-full shrink-0 space-y-6 lg:w-80">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ml-gold)]">
                Credentials
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-zinc-400">
                {creds.length ? (
                  creds.map((c, i) => <li key={i}>• {c}</li>)
                ) : (
                  <li className="text-zinc-600">None listed.</li>
                )}
              </ul>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ml-gold)]">
                Details
              </h3>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-zinc-500">Handle</dt>
                  <dd className="text-zinc-300">@{handle}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-zinc-500">Location</dt>
                  <dd className="text-zinc-300">
                    {profile.location || "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-zinc-500">Email</dt>
                  <dd className="truncate text-zinc-300">
                    {isOwn ? "Visible to you" : "On request"}
                  </dd>
                </div>
              </dl>
              {!isOwn ? (
                <button
                  type="button"
                  onClick={() => setContactOpen(true)}
                  className="mt-4 flex w-full items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-left text-sm text-zinc-200 transition hover:border-[var(--ml-gold)]/35 hover:bg-[var(--ml-gold)]/5"
                >
                  <span className="text-base" aria-hidden>
                    ✉️
                  </span>
                  <span>Send a message</span>
                </button>
              ) : null}
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ml-gold)]">
                Social
              </h3>
              <div className="mt-3 space-y-2">
                {(() => {
                  const rows = [
                    {
                      key: "youtube",
                      label: "YouTube",
                      platform: "youtube" as const,
                      value: profile.youtube,
                      rowClass:
                        "border-red-400/30 bg-red-500/20 hover:bg-red-500/30",
                    },
                    {
                      key: "instagram",
                      label: "Instagram",
                      platform: "instagram" as const,
                      value: profile.instagram,
                      rowClass:
                        "border-fuchsia-400/30 bg-gradient-to-r from-fuchsia-500/30 to-purple-500/30 hover:brightness-110",
                    },
                    {
                      key: "facebook",
                      label: "Facebook",
                      platform: "facebook" as const,
                      value: profile.facebook,
                      rowClass:
                        "border-blue-400/30 bg-blue-500/25 hover:bg-blue-500/35",
                    },
                    {
                      key: "tiktok",
                      label: "TikTok",
                      platform: "tiktok" as const,
                      value: profile.tiktok,
                      rowClass:
                        "border-white/15 bg-black hover:bg-zinc-900",
                    },
                  ].filter((r) => Boolean(r.value?.trim()));

                  return rows.map((r) => {
                    const href = socialLink(r.platform, r.value);
                    if (!href) return null;
                    const handle = extractHandle(r.value, r.platform);
                    return (
                      <a
                        key={r.key}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`block rounded-lg border px-3 py-2 text-sm font-medium text-zinc-100 transition hover:border-[var(--ml-gold)]/45 hover:shadow-[0_0_18px_-10px_rgba(245,204,113,0.6)] ${r.rowClass}`}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="min-w-0">
                            <span className="text-zinc-100">{r.label}</span>
                            {handle ? (
                              <span className="ml-2 text-xs text-[var(--ml-gold)]/75">
                                {handle}
                              </span>
                            ) : null}
                          </span>
                          <span className="text-[var(--ml-gold)]/80">↗</span>
                        </span>
                      </a>
                    );
                  });
                })()}
                {!profile.instagram &&
                !profile.tiktok &&
                !profile.youtube &&
                !profile.facebook ? (
                  <p className="text-sm text-zinc-600">No social links added yet</p>
                ) : null}
              </div>
            </div>
          </aside>
        </div>
      </div>
      <BookingModal
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        magicianId={profile.id}
        selectedDate={bookingDate}
      />
      <ContactModal
        open={contactOpen}
        onClose={() => setContactOpen(false)}
        magicianId={profile.id}
        magicianName={name}
      />
    </div>
  );
}
