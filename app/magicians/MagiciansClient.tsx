"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { CLASSES } from "@/lib/constants";
import { createNotification } from "@/lib/notifications";
import { formatLastSeen } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

type Magician = {
  id: string;
  name: string;
  location: string;
  avatarUrl: string | null;
  tags: string[];
  styleKeys: string[];
  bookings: string[];
  rating: number;
  reviews: number;
  onlineNow: boolean;
  /** Display string from formatLastSeen */
  lastSeenLabel: string;
  gradient: string;
  isFoundingMember: boolean;
  isUnclaimed: boolean;
};

const CITIES = [
  "All cities",
] as const;

const STYLES = [
  "Any style",
] as const;

const CORE_SPECIALTY_TAGS = [
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

const BOOKINGS = [
  "Any booking",
] as const;

const selectClass =
  "w-full min-w-0 cursor-pointer rounded-2xl border border-white/10 bg-white/5 py-2.5 pl-3 pr-8 text-sm text-zinc-100 outline-none transition focus:border-[var(--ml-gold)]/50 sm:min-w-[140px]";

const CARD_GRADIENTS = [
  "from-violet-950 via-purple-900/90 to-indigo-950",
  "from-indigo-950 via-slate-900 to-zinc-950",
  "from-blue-950 via-cyan-950/80 to-slate-950",
  "from-teal-950 via-emerald-950/70 to-black",
  "from-rose-950 via-red-950/80 to-zinc-950",
  "from-amber-950 via-yellow-950/50 to-stone-950",
] as const;

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++)
    h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function firstInitial(name: string) {
  return (name.trim()[0] || "M").toUpperCase();
}

export default function MagiciansClient() {
  const searchParams = useSearchParams();
  const { user } = useUser();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [city, setCity] = useState<string>(CITIES[0]);
  const [style, setStyle] = useState<string>(STYLES[0]);
  const [booking, setBooking] = useState<string>(BOOKINGS[0]);
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [sidebarTag, setSidebarTag] = useState<string | null>(null);
  const [magicians, setMagicians] = useState<Magician[]>([]);
  const [dirLoading, setDirLoading] = useState(true);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [followBusyId, setFollowBusyId] = useState<string | null>(null);

  useEffect(() => {
    const styleParam = searchParams.get("style")?.trim();
    const cityParam = searchParams.get("city")?.trim();
    const availableFor = searchParams.get("available_for")?.trim();
    setStyle(styleParam || STYLES[0]);
    setSidebarTag(styleParam || null);
    setCity(cityParam || CITIES[0]);
    if (availableFor) setBooking(availableFor);
  }, [searchParams]);

  useEffect(() => {
    void (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, display_name, location, specialty_tags, available_for, rating, review_count, avatar_url, is_online, last_seen, is_founding_member, is_unclaimed",
        )
        .eq("account_type", "magician")
        .order("created_at", { ascending: false });
      setDirLoading(false);
      if (error || !data?.length) {
        setMagicians([]);
        return;
      }
      setMagicians(
        data.map((row) => {
          const id = String(row.id);
          const h = hashId(id);
          const tags = (row.specialty_tags as string[]) ?? [];
          const avail = (row.available_for as string | null) ?? null;
          const isOnline = Boolean(row.is_online);
          const lastSeenRaw = (row.last_seen as string | null) ?? null;
          const lastSeenLabel = isOnline
            ? "Online now"
            : lastSeenRaw
              ? formatLastSeen(lastSeenRaw)
              : "Never active";
          return {
            id,
            name: (row.display_name as string)?.trim() || "Magician",
            location: (row.location as string)?.trim() || "—",
            avatarUrl: (row.avatar_url as string | null) ?? null,
            tags: tags.length ? tags.slice(0, 6) : ["Performer"],
            styleKeys: tags,
            bookings: avail ? [avail] : ["Corporate", "Private", "Theater", "Wedding"],
            rating: Number(row.rating ?? 0),
            reviews: Number(row.review_count ?? 0),
            onlineNow: isOnline,
            lastSeenLabel,
            gradient: CARD_GRADIENTS[h % CARD_GRADIENTS.length]!,
            isFoundingMember: Boolean(row.is_founding_member),
            isUnclaimed: Boolean((row as { is_unclaimed?: boolean | null }).is_unclaimed),
          } satisfies Magician;
        }),
      );
    })();
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setFollowingIds(new Set());
      return;
    }
    void (async () => {
      const { data } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);
      setFollowingIds(
        new Set((data ?? []).map((row: { following_id: string }) => String(row.following_id))),
      );
    })();
  }, [user?.id]);

  const toggleFollow = async (magicianId: string) => {
    if (!user?.id || user.id === magicianId || followBusyId) return;
    const already = followingIds.has(magicianId);
    setFollowBusyId(magicianId);
    setFollowingIds((prev) => {
      const next = new Set(prev);
      if (already) next.delete(magicianId);
      else next.add(magicianId);
      return next;
    });
    setMagicians((prev) =>
      prev.map((m) =>
        m.id === magicianId
          ? { ...m, reviews: m.reviews, rating: m.rating }
          : m,
      ),
    );
    if (already) {
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", magicianId);
      const { data: p } = await supabase
        .from("profiles")
        .select("follower_count")
        .eq("id", magicianId)
        .maybeSingle();
      await supabase
        .from("profiles")
        .update({ follower_count: Math.max(0, Number(p?.follower_count ?? 0) - 1) })
        .eq("id", magicianId);
    } else {
      const { error: followInsertErr } = await supabase
        .from("follows")
        .insert({ follower_id: user.id, following_id: magicianId });
      const { data: p } = await supabase
        .from("profiles")
        .select("follower_count")
        .eq("id", magicianId)
        .maybeSingle();
      if (!followInsertErr) {
        await supabase
          .from("profiles")
          .update({ follower_count: Number(p?.follower_count ?? 0) + 1 })
          .eq("id", magicianId);
      }
      const fanName =
        user.fullName?.trim() ||
        user.firstName?.trim() ||
        user.username?.trim() ||
        "Someone";
      const followerCount = Number(p?.follower_count ?? 0) + 1;
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      if (!followInsertErr) {
        const { data: selfProf } = await supabase
          .from("profiles")
          .select("avatar_url")
          .eq("id", user.id)
          .maybeSingle();
        void createNotification({
          recipientId: magicianId,
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
            following_id: magicianId,
            fan_name: fanName,
            follower_count: followerCount,
            fan_profile_url: `${origin}/profile/fan?id=${encodeURIComponent(user.id)}`,
          },
        }),
      });
    }
    setFollowBusyId(null);
  };

  const cityCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const m of magicians) {
      const loc = m.location.split(",")[0]?.trim() || m.location;
      c[loc] = (c[loc] ?? 0) + 1;
    }
    return c;
  }, [magicians]);

  const cityOptions = useMemo(() => {
    const set = new Set<string>();
    for (const m of magicians) {
      const loc = m.location.split(",")[0]?.trim() || m.location.trim();
      if (loc) set.add(loc);
    }
    return [CITIES[0], ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [magicians]);

  const cityOptionsWithQuery = useMemo(() => {
    const qp = searchParams.get("city")?.trim();
    if (!qp || cityOptions.includes(qp)) return cityOptions;
    return [CITIES[0], qp, ...cityOptions.filter((c) => c !== CITIES[0])];
  }, [cityOptions, searchParams]);

  const styleOptions = useMemo(() => {
    const set = new Set<string>(CORE_SPECIALTY_TAGS);
    for (const m of magicians) for (const t of m.tags) if (t.trim()) set.add(t);
    const orderedCore = CORE_SPECIALTY_TAGS.filter((t) => set.has(t));
    const extras = Array.from(set).filter((t) => !CORE_SPECIALTY_TAGS.includes(t as (typeof CORE_SPECIALTY_TAGS)[number]));
    return [STYLES[0], ...orderedCore, ...extras.sort((a, b) => a.localeCompare(b))];
  }, [magicians]);

  const styleOptionsWithQuery = useMemo(() => {
    const qp = searchParams.get("style")?.trim();
    if (!qp || styleOptions.includes(qp)) return styleOptions;
    return [STYLES[0], qp, ...styleOptions.filter((s) => s !== STYLES[0])];
  }, [styleOptions, searchParams]);

  const bookingOptions = useMemo(() => {
    const set = new Set<string>();
    for (const m of magicians) for (const b of m.bookings) if (b.trim()) set.add(b);
    return [BOOKINGS[0], ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [magicians]);

  const bookingOptionsWithQuery = useMemo(() => {
    const qp = searchParams.get("available_for")?.trim();
    if (!qp || bookingOptions.includes(qp)) return bookingOptions;
    return [BOOKINGS[0], qp, ...bookingOptions.filter((b) => b !== BOOKINGS[0])];
  }, [bookingOptions, searchParams]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return magicians.filter((m) => {
      if (onlineOnly && !m.onlineNow) return false;
      if (city !== "All cities") {
        const inCity = m.location.toLowerCase().includes(city.toLowerCase());
        if (!inCity) return false;
      }
      if (style !== "Any style") {
        const st = style.toLowerCase();
        const match =
          m.styleKeys.some((k) => k.toLowerCase().includes(st)) ||
          m.tags.some((t) => t.toLowerCase().includes(st));
        if (!match) return false;
      }
      if (booking !== "Any booking" && !m.bookings.includes(booking)) return false;
      if (sidebarTag && !m.tags.includes(sidebarTag)) return false;
      if (q) {
        const hay = `${m.name} ${m.location}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [search, city, style, booking, onlineOnly, sidebarTag, magicians]);

  const toggleSidebarTag = (tag: string) => {
    setSidebarTag((t) => {
      const next = t === tag ? null : tag;
      setStyle(next ?? STYLES[0]);
      return next;
    });
  };

  const hasActiveFilters =
    search.trim().length > 0 ||
    city !== CITIES[0] ||
    style !== STYLES[0] ||
    booking !== BOOKINGS[0] ||
    onlineOnly ||
    sidebarTag !== null;

  const clearAllFilters = () => {
    setSearch("");
    setCity(CITIES[0]);
    setStyle(STYLES[0]);
    setBooking(BOOKINGS[0]);
    setOnlineOnly(false);
    setSidebarTag(null);
  };

  return (
    <div className="min-h-0 flex-1 bg-black pb-16 pt-8 text-zinc-100 sm:pt-12">
      <div className={`${CLASSES.section} max-w-7xl`}>
        {/* Header */}
        <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--ml-gold)]">
          The performers
        </p>
        <h1 className="ml-font-heading text-4xl font-semibold tracking-tight text-zinc-50 sm:text-5xl">
          Browse <span className="text-[var(--ml-gold)] italic">magicians</span>
        </h1>
        <p className="mt-3 text-sm text-zinc-400 sm:text-base">
          {dirLoading
            ? "Loading directory…"
            : filtered.length === magicians.length
              ? `${magicians.length} magician${magicians.length === 1 ? "" : "s"} in the directory`
              : `${filtered.length} of ${magicians.length} match your filters`}
        </p>

        {/* Filter bar */}
        <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
              ⌕
            </span>
            <input
              type="search"
              placeholder="Search by name, city, or specialty…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && search.trim()) {
                  e.preventDefault();
                  router.push(`/search?q=${encodeURIComponent(search.trim())}`);
                }
              }}
              className={`${CLASSES.inputSearch} pl-9`}
            />
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:gap-4">
            <select
              className={selectClass}
              value={city}
              onChange={(e) => setCity(e.target.value)}
            >
              {cityOptionsWithQuery.map((c) => (
                <option key={c} value={c} className="bg-zinc-900">
                  {c}
                </option>
              ))}
            </select>
            <select
              className={selectClass}
              value={style}
              onChange={(e) => {
                const next = e.target.value;
                setStyle(next);
                setSidebarTag(next === STYLES[0] ? null : next);
              }}
            >
              {styleOptionsWithQuery.map((s) => (
                <option key={s} value={s} className="bg-zinc-900">
                  {s}
                </option>
              ))}
            </select>
            <select
              className={selectClass}
              value={booking}
              onChange={(e) => setBooking(e.target.value)}
            >
              {bookingOptionsWithQuery.map((b) => (
                <option key={b} value={b} className="bg-zinc-900">
                  {b}
                </option>
              ))}
            </select>
            <div className="flex flex-1 flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3 lg:border-t-0 lg:pt-0">
              <span className="text-sm text-zinc-400">
                <span className="font-semibold text-zinc-200">{filtered.length}</span>{" "}
                results
              </span>
              <button
                type="button"
                onClick={() => setOnlineOnly((v) => !v)}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wider transition ${
                  onlineOnly
                    ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-200"
                    : "border-white/15 bg-white/5 text-zinc-400 hover:border-white/25 hover:text-zinc-200"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    onlineOnly ? "bg-emerald-400" : "bg-zinc-600"
                  }`}
                />
                Online now
              </button>
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-300 transition hover:border-white/25 hover:text-zinc-100"
                >
                  Clear all filters
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-10 lg:flex-row lg:items-start">
          {/* Grid */}
          <div className="min-w-0 flex-1">
            {dirLoading ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/50"
                  >
                    <div className="h-36 animate-pulse bg-white/10" />
                    <div className="space-y-3 p-4">
                      <div className="h-5 w-2/3 animate-pulse rounded bg-white/10" />
                      <div className="h-4 w-1/2 animate-pulse rounded bg-white/10" />
                      <div className="flex gap-2">
                        <div className="h-5 w-16 animate-pulse rounded-full bg-white/10" />
                        <div className="h-5 w-20 animate-pulse rounded-full bg-white/10" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : magicians.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/15 bg-white/[0.02] px-8 py-20 text-center">
                <p className="ml-font-heading text-2xl text-zinc-200">
                  No magicians yet — be the first to create a profile
                </p>
                <p className="mt-2 max-w-md text-sm text-zinc-500">
                  Be the first to publish a magician profile on Magicalive.
                </p>
                <Link
                  href="/create-profile"
                  className={`${CLASSES.btnPrimary} mt-6 text-sm`}
                >
                  Create profile
                </Link>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/15 bg-white/[0.02] px-8 py-20 text-center">
                <p className="ml-font-heading text-2xl text-zinc-200">
                  No magicians match
                </p>
                <p className="mt-2 max-w-md text-sm text-zinc-500">
                  Try clearing filters, searching something else, or turning off
                  &quot;Online now&quot;.
                </p>
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className={`${CLASSES.btnPrimary} mt-6 text-sm`}
                >
                  Reset all filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((m) => (
                  <article
                    key={m.id}
                    className="group overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/50 transition hover:border-[var(--ml-gold)]/35 hover:shadow-[0_0_40px_-12px_rgba(245,204,113,0.15)]"
                  >
                    <div
                      className={`relative flex h-36 items-center justify-center bg-gradient-to-br ${m.gradient}`}
                    >
                      {m.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={m.avatarUrl}
                          alt=""
                          className="h-20 w-20 rounded-full border-2 border-white/20 object-cover drop-shadow-lg transition group-hover:scale-105"
                        />
                      ) : (
                        <span className="inline-flex h-20 w-20 items-center justify-center rounded-full border-2 border-white/20 bg-black/25 text-3xl font-semibold text-zinc-100 drop-shadow-lg transition group-hover:scale-105">
                          {firstInitial(m.name)}
                        </span>
                      )}
                      {m.isUnclaimed ? (
                        <span className="pointer-events-none absolute bottom-2 right-2 rounded border border-amber-600/35 bg-black/55 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-200/90 backdrop-blur-sm">
                          Unclaimed
                        </span>
                      ) : null}
                      <div className="absolute right-3 top-3">
                        {m.isFoundingMember ? (
                          <span className="absolute -left-8 -top-1 text-[var(--ml-gold)]" title="Founding Member">
                            ♣
                          </span>
                        ) : null}
                        {m.onlineNow ? (
                          <span
                            className="inline-flex items-center justify-center"
                            title="Online now"
                            aria-label="Online now"
                          >
                            <span className="relative flex h-2.5 w-2.5">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60" />
                              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]" />
                            </span>
                          </span>
                        ) : (
                          <span className="rounded-full border border-white/10 bg-black/40 px-2.5 py-1 text-[10px] font-medium text-zinc-400 backdrop-blur-sm">
                            {m.lastSeenLabel}
                          </span>
                        )}
                      </div>
                      {user?.id !== m.id ? (
                        user?.id ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              void toggleFollow(m.id);
                            }}
                            disabled={followBusyId === m.id}
                            className="absolute left-3 top-3 rounded-full border border-[var(--ml-gold)]/35 bg-black/50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--ml-gold)] backdrop-blur-sm"
                          >
                            {followingIds.has(m.id) ? "♥ Following" : "♡ Follow"}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              router.push("/sign-in");
                            }}
                            className="absolute left-3 top-3 rounded-full border border-[var(--ml-gold)]/35 bg-black/50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--ml-gold)] backdrop-blur-sm"
                          >
                            ♡ Follow
                          </button>
                        )
                      ) : null}
                    </div>
                    <div className="p-4">
                      <h2 className="ml-font-heading text-lg font-semibold text-zinc-50 group-hover:text-[var(--ml-gold)]">
                        <Link href={`/profile/magician?id=${encodeURIComponent(m.id)}`}>
                          {m.name}
                          {m.isFoundingMember ? <span className="ml-2 text-[var(--ml-gold)]">♣</span> : null}
                        </Link>
                      </h2>
                      <p className="mt-0.5 text-sm text-zinc-500">{m.location}</p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {m.tags.map((tag) => (
                          <Link
                            key={tag}
                            href={`/magicians?style=${encodeURIComponent(tag)}`}
                            className={`${CLASSES.tag} transition hover:border-[var(--ml-gold)]/45 hover:bg-[var(--ml-gold)]/10`}
                          >
                            {tag}
                          </Link>
                        ))}
                      </div>
                      <div className="mt-4 flex items-center gap-2 border-t border-white/5 pt-3">
                        <span className="text-[var(--ml-gold)]">★</span>
                        <span className="text-sm font-semibold text-zinc-100">
                          {m.rating.toFixed(1)}
                        </span>
                        <span className="text-xs text-zinc-500">
                          ({m.reviews} reviews)
                        </span>
                      </div>
                      <div className="mt-3">
                        <Link
                          href={`/profile/magician?id=${encodeURIComponent(m.id)}`}
                          className={CLASSES.btnSecondarySm}
                        >
                          View profile
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="w-full shrink-0 space-y-8 lg:w-72 xl:w-80">
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Filter by specialty
              </h3>
              <div className="flex flex-wrap gap-2">
                {styleOptions.filter((t) => t !== STYLES[0]).map((tag) => (
                  <Link
                    key={tag}
                    href={
                      sidebarTag === tag
                        ? `/magicians${city !== CITIES[0] ? `?city=${encodeURIComponent(city)}` : ""}`
                        : `/magicians?style=${encodeURIComponent(tag)}${city !== CITIES[0] ? `&city=${encodeURIComponent(city)}` : ""}`
                    }
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      sidebarTag === tag
                        ? "border-[var(--ml-gold)] bg-[var(--ml-gold)]/15 text-[var(--ml-gold)]"
                        : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/20 hover:text-zinc-200"
                    }`}
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                By city
              </h3>
              <ul className="space-y-1 rounded-2xl border border-white/10 bg-white/[0.03] p-2">
                {cityOptions.filter((c) => c !== CITIES[0]).map((c) => (
                  <li key={c}>
                    <button
                      type="button"
                      onClick={() => setCity(city === c ? CITIES[0] : c)}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition ${
                        city === c
                          ? "bg-[var(--ml-gold)]/10 text-[var(--ml-gold)]"
                          : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                      }`}
                    >
                      <span>{c}</span>
                      <span className="text-xs text-zinc-500">{cityCounts[c] ?? 0}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-[var(--ml-gold)]/25 bg-[var(--ml-gold)]/10 p-5">
              <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[var(--ml-gold)]/10 blur-2xl" />
              <p className="ml-font-heading text-lg font-semibold text-zinc-100">
                Are you a magician?
              </p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                List your act, connect with venues, and grow your audience.
              </p>
              <Link
                href="/create-profile"
                className={`${CLASSES.btnPrimary} mt-4 w-full text-center sm:inline-flex`}
              >
                Create profile
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
