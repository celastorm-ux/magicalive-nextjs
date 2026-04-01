"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { HomeOurStoryTeaser } from "@/components/HomeOurStoryTeaser";
import { CLASSES } from "@/lib/constants";
import { formatShowDateShortEnUS, todayYmdLocal } from "@/lib/show-dates";
import { formatTime } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

const SIGN_UP_CREATE_PROFILE = `/sign-up?redirect_url=${encodeURIComponent("/create-profile")}`;

type FeaturedMagician = {
  id: string;
  name: string;
  location: string;
  tags: string[];
  rating: number;
  reviews: number;
  onlineNow?: boolean;
  avatarUrl?: string | null;
};

type HomeArticle = {
  id: string;
  title: string | null;
  excerpt: string | null;
  category: string | null;
  published_at: string | null;
  read_time: string | null;
  cover_image_url: string | null;
};

type UpcomingEvent = {
  id: string;
  rawDate: string;
  date: string;
  time: string | null;
  name: string;
  venue: string;
  ticket_url: string | null;
  magician_id: string | null;
  magician_name: string;
  magician_avatar_url: string | null;
  event_type: string;
  is_online: boolean;
};

function CountUpStat({ value, label }: { value: string; label: string }) {
  const match = value.match(/^(\d+)(.*)$/);
  const target = match ? parseInt(match[1]!, 10) : 0;
  const suffix = match ? match[2] : value;
  const [count, setCount] = useState(0);

  useEffect(() => {
    const duration = 1400;
    const start = Date.now();
    const tick = () => {
      const progress = Math.min((Date.now() - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target]);

  return (
    <div className={`${CLASSES.card} px-4 py-4`}>
      <div className="ml-font-heading text-2xl font-semibold text-zinc-50">
        {count}{suffix}
      </div>
      <div className={`${CLASSES.labelCaps} mt-1`}>{label}</div>
    </div>
  );
}

function FadeInSection({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry?.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.08 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(20px)",
        transition: `opacity 0.55s ease ${delay}ms, transform 0.55s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "M";
  if (parts.length === 1) return parts[0]![0]!.toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

export default function HomeClient() {
  const { user, isSignedIn, isLoaded: userLoaded } = useUser();
  const [homeUserHasProfile, setHomeUserHasProfile] = useState(false);
  const [featuredMagicians, setFeaturedMagicians] = useState<FeaturedMagician[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [recentArticles, setRecentArticles] = useState<HomeArticle[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(true);
  const [foundingRemaining, setFoundingRemaining] = useState<number | null>(null);
  const [foundingBannerDismissed, setFoundingBannerDismissed] = useState(false);
  const [passwordResetBanner, setPasswordResetBanner] = useState(false);

  useEffect(() => {
    if (!userLoaded || !isSignedIn || !user?.id) {
      setHomeUserHasProfile(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();
      if (!cancelled) setHomeUserHasProfile(Boolean(data));
    })();
    return () => {
      cancelled = true;
    };
  }, [userLoaded, isSignedIn, user?.id]);

  const createProfileHref = useMemo(() => {
    if (!userLoaded || !isSignedIn) return SIGN_UP_CREATE_PROFILE;
    return homeUserHasProfile ? "/profile" : "/create-profile";
  }, [userLoaded, isSignedIn, homeUserHasProfile]);

  useEffect(() => {
    void (async () => {
      setFeaturedLoading(true);
      const { data: magRows, error: magErr } = await supabase
        .from("profiles")
        .select(
          "id, display_name, location, specialty_tags, avatar_url, rating, review_count, is_online",
        )
        .eq("account_type", "magician")
        .order("created_at", { ascending: false })
        .limit(4);
      setFeaturedLoading(false);
      if (!magErr && magRows?.length) {
        setFeaturedMagicians(
          magRows.map((row) => {
            const tags = (row.specialty_tags as string[] | null) ?? [];
            return {
              id: String(row.id),
              name: (row.display_name as string | null)?.trim() || "Magician",
              location: (row.location as string | null)?.trim() || "—",
              tags: tags.length ? tags.slice(0, 6) : ["Performer"],
              rating: Number(row.rating ?? 0),
              reviews: Number(row.review_count ?? 0),
              onlineNow: Boolean(row.is_online),
              avatarUrl: (row.avatar_url as string | null) ?? null,
            };
          }),
        );
      } else {
        setFeaturedMagicians([]);
      }
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchUpcoming = async () => {
      const { data: shows } = await supabase
        .from("shows")
        .select("*, profiles(id, display_name, avatar_url)")
        .eq("is_public", true)
        .eq("is_cancelled", false)
        .gte("date", todayYmdLocal())
        .order("date", { ascending: true })
        .limit(20);
      if (cancelled) return;
      const rows = (
        (shows ?? []) as Array<{
          id: string;
          date: string;
          name: string;
          venue_name: string | null;
          city: string | null;
          ticket_url: string | null;
          magician_id: string | null;
          event_type?: string | null;
          is_online?: boolean | null;
          time?: string | null;
          profiles: { id: string | null; display_name: string | null; avatar_url: string | null } | null;
        }>
      ).map((s) => {
        const isLec = s.event_type === "lecture";
        const online = Boolean(s.is_online);
        return {
          id: s.id,
          rawDate: s.date,
          date: formatShowDateShortEnUS(s.date),
          time: s.time ?? null,
          name: s.name,
          venue: isLec && online ? "Online" : [s.venue_name, s.city].filter(Boolean).join(" · ") || "Venue TBA",
          ticket_url: s.ticket_url,
          magician_id: s.magician_id ?? s.profiles?.id ?? null,
          magician_name: s.profiles?.display_name?.trim() || "Magician",
          magician_avatar_url: s.profiles?.avatar_url ?? null,
          event_type: s.event_type ?? "show",
          is_online: online,
        };
      });
      setUpcomingEvents(rows);
    };

    void fetchUpcoming();
    const onVis = () => {
      if (document.visibilityState === "visible") void fetchUpcoming();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  useEffect(() => {
    void (async () => {
      setArticlesLoading(true);
      const { data } = await supabase
        .from("articles")
        .select("id, title, excerpt, category, published_at, read_time, cover_image_url")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(3);
      setRecentArticles((data as HomeArticle[] | null) ?? []);
      setArticlesLoading(false);
    })();
  }, []);

  useEffect(() => {
    const dismissed =
      typeof window !== "undefined" &&
      window.localStorage.getItem("magicalive_founding_banner_dismissed") === "1";
    setFoundingBannerDismissed(dismissed);

    void (async () => {
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("account_type", "magician")
        .eq("is_founding_member", true);
      const claimed = Number(count ?? 0);
      setFoundingRemaining(Math.max(0, 100 - claimed));
    })();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams(window.location.search);
    if (p.get("password_reset") !== "success") return;
    setPasswordResetBanner(true);
    p.delete("password_reset");
    const qs = p.toString();
    const next = `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`;
    window.history.replaceState(null, "", next || "/");
  }, []);

  const foundingClaimed =
    foundingRemaining == null ? null : Math.max(0, Math.min(100, 100 - foundingRemaining));
  const foundingProgressPct =
    foundingClaimed == null ? 0 : Math.max(0, Math.min(100, foundingClaimed));
  const showFoundingSpots = (foundingRemaining ?? 0) > 0;
  const showFoundingBanner =
    foundingRemaining != null && foundingRemaining > 0 && !foundingBannerDismissed;

  return (
    <div className="min-h-dvh bg-black text-zinc-100">
      {showFoundingBanner ? (
        <div
          className="border-b px-4 py-2"
          style={{
            backgroundColor: "rgba(201,168,76,0.12)",
            borderBottomColor: "rgba(201,168,76,0.3)",
            borderBottomWidth: "0.5px",
          }}
        >
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-2">
            <div className="w-4 shrink-0" aria-hidden />
            <p className="min-w-0 flex-1 text-center text-xs text-zinc-100 sm:text-sm">
              <span className="text-[var(--ml-gold)]">♣</span> Founding Member spots are filling up —{" "}
              <span className="font-semibold text-[var(--ml-gold)]">
                {foundingRemaining} of 100 remaining
              </span>{" "}
              ·{" "}
              <Link href={createProfileHref} className="font-semibold text-[var(--ml-gold)] hover:underline">
                Join free →
              </Link>
            </p>
            <button
              type="button"
              onClick={() => {
                setFoundingBannerDismissed(true);
                if (typeof window !== "undefined") {
                  window.localStorage.setItem("magicalive_founding_banner_dismissed", "1");
                }
              }}
              className="h-6 w-6 shrink-0 rounded text-zinc-300 transition hover:bg-black/25 hover:text-zinc-100"
              aria-label="Dismiss founding member banner"
            >
              ×
            </button>
          </div>
        </div>
      ) : null}
      {passwordResetBanner ? (
        <div
          className="border-b border-emerald-500/35 bg-emerald-500/15 px-4 py-2 text-center text-sm text-emerald-100"
          role="status"
        >
          Your password was updated. You&apos;re signed in and ready to go.
          <button
            type="button"
            onClick={() => setPasswordResetBanner(false)}
            className="ml-3 inline text-emerald-200 underline hover:text-white"
          >
            Dismiss
          </button>
        </div>
      ) : null}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10"
      >
        <div className="ml-noise-overlay absolute inset-0" />
        <div className="absolute left-1/2 top-[-160px]">
          <div className="ml-orb-1 h-[520px] w-[820px] rounded-full bg-[radial-gradient(circle_at_center,var(--ml-gold-glow-strong),rgba(0,0,0,0)_62%)] blur-2xl" />
        </div>
        <div className="ml-orb-2 absolute bottom-[-220px] right-[-220px] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle_at_center,var(--ml-gold-glow-soft),rgba(0,0,0,0)_60%)] blur-3xl" />
        <div
          className="absolute inset-0"
          style={{ background: "var(--ml-gradient-vignette)" }}
        />
      </div>

      <main>
        <section className={`${CLASSES.section} pb-10 pt-14 sm:pt-18`}>
          <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-stretch">
            <div>
              <p className={CLASSES.pillGold}>
                The directory for magicians
                <span
                  className="h-1 w-1 rounded-full"
                  style={{ backgroundColor: "var(--ml-gold-dot)" }}
                />
                Discover • Book • Follow
              </p>

              <h1 className="ml-font-heading ml-hero-shimmer mt-6 text-4xl font-semibold leading-tight tracking-tight whitespace-nowrap sm:text-5xl">
                Where the audience finds its magic
              </h1>

              <p className={`${CLASSES.bodyLead} mt-5 max-w-2xl`}>
                Magicalive is the place to discover performers, track events, and explore venues — like IMDb, but for magic.
              </p>

              <div className="mt-8 flex flex-wrap gap-3 sm:flex-nowrap sm:items-center">
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new Event("ml:open-search-overlay"))}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-zinc-300 transition hover:border-[var(--ml-gold)]/35 hover:text-zinc-100"
                >
                  <span className="text-[var(--ml-gold)]">⌕</span>
                  <span>Search</span>
                </button>
                <Link href="/magicians" className={CLASSES.btnPrimary}>
                  Browse magicians
                </Link>
                <Link href="/events" className={CLASSES.btnSecondary}>
                  Explore events
                </Link>
              </div>

              <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  { value: "2400+", label: "Magicians" },
                  { value: "840", label: "Events" },
                  { value: "320", label: "Venues" },
                  { value: "18k", label: "Members" },
                ].map((stat) => (
                  <CountUpStat key={stat.label} value={stat.value} label={stat.label} />
                ))}
              </div>
            </div>

            <div className={`${CLASSES.cardGlass} h-full`}>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,var(--ml-gold-glow-mid),rgba(0,0,0,0)_55%)]" />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <h2 className={`${CLASSES.headingSub} mt-0`}>From the community</h2>
                  <Link href="/articles" className="text-xs font-medium text-[var(--ml-gold)] transition hover:underline">
                    All articles →
                  </Link>
                </div>
                <div className="mt-4 space-y-3">
                  {articlesLoading ? (
                    <>
                      <div className="animate-pulse overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
                        <div className="h-36 w-full bg-white/10" />
                        <div className="space-y-2 p-4">
                          <div className="h-3 w-1/4 rounded bg-white/10" />
                          <div className="h-4 w-3/4 rounded bg-white/10" />
                          <div className="h-3 w-full rounded bg-white/10" />
                        </div>
                      </div>
                      {Array.from({ length: 2 }).map((_, i) => (
                        <div key={i} className="flex animate-pulse gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                          <div className="h-12 w-16 shrink-0 rounded-lg bg-white/10" />
                          <div className="flex-1 space-y-2 py-1">
                            <div className="h-3.5 w-3/4 rounded bg-white/10" />
                            <div className="h-2.5 w-1/3 rounded bg-white/10" />
                          </div>
                        </div>
                      ))}
                    </>
                  ) : recentArticles.length ? (
                    <>
                      {/* Featured latest article */}
                      <Link
                        href={`/articles/${encodeURIComponent(recentArticles[0]!.id)}`}
                        className="group block overflow-hidden rounded-2xl border border-white/10 bg-black/20 transition hover:border-[var(--ml-gold)]/35"
                      >
                        {recentArticles[0]!.cover_image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={recentArticles[0]!.cover_image_url}
                            alt=""
                            className="h-36 w-full object-cover opacity-90 transition group-hover:opacity-100"
                          />
                        ) : (
                          <div className="h-36 w-full bg-white/5" />
                        )}
                        <div className="p-4">
                          {recentArticles[0]!.category ? (
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ml-gold)]/80">
                              {recentArticles[0]!.category}
                            </span>
                          ) : null}
                          <p className="mt-1 text-sm font-semibold leading-snug text-zinc-100">
                            {recentArticles[0]!.title?.trim() || "Untitled"}
                          </p>
                          {recentArticles[0]!.excerpt ? (
                            <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-zinc-400">
                              {recentArticles[0]!.excerpt}
                            </p>
                          ) : null}
                        </div>
                      </Link>
                      {/* Remaining articles */}
                      {recentArticles.slice(1).map((a) => (
                        <Link
                          key={a.id}
                          href={`/articles/${encodeURIComponent(a.id)}`}
                          className={`${CLASSES.cardRow} gap-3 transition hover:border-[var(--ml-gold)]/35`}
                        >
                          {a.cover_image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={a.cover_image_url}
                              alt=""
                              className="h-12 w-16 shrink-0 rounded-lg object-cover opacity-90"
                            />
                          ) : (
                            <div className="h-12 w-16 shrink-0 rounded-lg bg-white/5" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-zinc-100">
                              {a.title?.trim() || "Untitled"}
                            </p>
                            {a.category ? (
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ml-gold)]/80">
                                {a.category}
                              </span>
                            ) : null}
                          </div>
                        </Link>
                      ))}
                    </>
                  ) : (
                    <p className="text-sm text-zinc-500">No articles yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <FadeInSection className={`${CLASSES.section} pb-16 pt-2`}>
          <div className="flex items-end justify-between gap-6">
            <div>
              <h2 className={CLASSES.headingSection}>Upcoming events</h2>
              <p className={`${CLASSES.bodyMuted} mt-2`}>
                Shows and lectures from venues, stages, and online — curated from the directory.
              </p>
            </div>
            <Link href="/events" className={`${CLASSES.linkGold} hidden sm:inline-flex`}>
              See calendar →
            </Link>
          </div>

          <div className={`${CLASSES.tableShell} mt-8`}>
            <div className="grid grid-cols-[88px_1fr] gap-x-4 border-b border-white/10 px-5 py-4 text-xs font-semibold uppercase tracking-wide text-zinc-400 sm:grid-cols-[110px_1fr_220px_120px]">
              <div>Date</div>
              <div>Event</div>
              <div className="hidden sm:block">Venue</div>
              <div className="hidden sm:block text-right">Tickets</div>
            </div>

            <div className="max-h-[420px] divide-y divide-white/10 overflow-y-auto">
              {upcomingEvents.map((e) => (
                (() => {
                  const ticketLink = e.ticket_url?.trim() || null;
                  const isLec = e.event_type === "lecture";
                  const isToday = e.rawDate === todayYmdLocal();
                  return (
                <div
                  key={e.id}
                  className={`grid grid-cols-[88px_1fr] items-center gap-x-4 px-5 py-4 sm:grid-cols-[110px_1fr_220px_120px] ${CLASSES.tableRow} ${
                    isLec ? "border-l-2 border-l-violet-500/45 bg-violet-950/[0.12]" : ""
                  } ${isToday && !isLec ? "border-l-2 border-l-[var(--ml-gold)]/60 bg-[var(--ml-gold)]/[0.04]" : ""}`}
                >
                  <div>
                    <div
                      className={`text-sm font-semibold ${isLec ? "text-violet-200" : "text-[var(--ml-gold)]"}`}
                    >
                      {e.date}
                      {isToday ? (
                        <span className="ml-1.5 rounded-full bg-[var(--ml-gold)]/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--ml-gold)]">
                          Today
                        </span>
                      ) : null}
                    </div>
                    {e.time?.trim() ? (
                      <div className="mt-0.5 text-xs font-medium text-zinc-500">{formatTime(e.time)}</div>
                    ) : null}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/events/${encodeURIComponent(e.id)}`}
                        className="ml-font-heading text-base font-semibold text-zinc-50 transition hover:underline"
                      >
                        {e.name}
                      </Link>
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                          isLec
                            ? "border-violet-400/40 text-violet-200"
                            : "border-[var(--ml-gold)]/35 text-[var(--ml-gold)]"
                        }`}
                      >
                        {isLec ? "📚 Lecture" : "🎭 Show"}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-[var(--ml-gold)]/75">
                      <span className="inline-flex h-5 w-5 items-center justify-center overflow-hidden rounded-full border border-[var(--ml-gold)]/25 bg-white/5 text-[10px] text-zinc-200">
                        {e.magician_avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={e.magician_avatar_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          initials(e.magician_name)
                        )}
                      </span>
                      {e.magician_id ? (
                        <Link
                          href={`/profile/magician?id=${encodeURIComponent(e.magician_id)}`}
                          className="transition hover:underline"
                        >
                          {e.magician_name}
                        </Link>
                      ) : (
                        <span>{e.magician_name}</span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-zinc-400 sm:hidden">
                      {e.venue}
                    </div>
                  </div>
                  <div className="hidden text-sm text-zinc-300 sm:block">
                    {e.venue}
                  </div>
                  <div className="hidden sm:block text-right">
                    {ticketLink ? (
                      <a href={ticketLink} target="_blank" rel="noopener noreferrer" className={CLASSES.btnPrimarySm}>
                        {isLec ? "Register" : "Tickets"}
                      </a>
                    ) : (
                      <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                        Free / enquire
                      </span>
                    )}
                  </div>
                  <div className="mt-3 sm:hidden">
                    {ticketLink ? (
                      <a href={ticketLink} target="_blank" rel="noopener noreferrer" className={CLASSES.btnPrimarySm}>
                        {isLec ? "Register" : "Tickets"}
                      </a>
                    ) : (
                      <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                        Free / enquire
                      </span>
                    )}
                  </div>
                </div>
                  );
                })()
              ))}
              {upcomingEvents.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-zinc-500">No upcoming public shows yet.</div>
              ) : null}
            </div>
          </div>
        </FadeInSection>

        <FadeInSection className={`${CLASSES.section} pb-4`} delay={100}>
          {showFoundingSpots ? (
            <div className="rounded-3xl border border-[var(--ml-gold)]/25 bg-[var(--ml-gold)]/10 p-6 sm:p-8">
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--ml-gold)]">
                Limited availability
              </p>
              <h2 className="mt-2 ml-font-heading text-3xl font-semibold text-zinc-100 sm:text-4xl">
                Become a Founding Member ♣
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-200/90 sm:text-base">
                The first 100 magicians to join Magicalive receive a permanent Founding Member
                badge on their profile.{" "}
                <span className="text-[var(--ml-gold)]">{foundingRemaining} spots remaining.</span>
              </p>
              <div className="mt-6 grid gap-3 text-sm text-zinc-200 sm:grid-cols-3">
                <div>♣ Permanent badge on your profile</div>
                <div>♣ Free forever — no premium required</div>
                <div>♣ Be part of the founding community</div>
              </div>
              <div className="mt-6">
                <Link href={createProfileHref} className={CLASSES.btnPrimary}>
                  Claim your spot →
                </Link>
              </div>
              <div className="mt-6">
                <div className="mb-2 text-xs text-zinc-300">
                  {foundingClaimed} of 100 spots claimed
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-[var(--ml-gold)] transition-all duration-300"
                    style={{ width: `${foundingProgressPct}%` }}
                  />
                </div>
              </div>
            </div>
          ) : foundingRemaining === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
              <p className="text-sm text-zinc-300 sm:text-base">
                Our 100 Founding Members have been selected. Create your free profile to join the
                community.
              </p>
            </div>
          ) : null}
        </FadeInSection>

        <FadeInSection className={`${CLASSES.section} py-12`} delay={80}>
          <div className="flex items-end justify-between gap-6">
            <div>
              <h2 className={CLASSES.headingSection}>Featured magicians</h2>
              <p className={`${CLASSES.bodyMuted} mt-2`}>
                Highly rated performers, ready for stage, screen, or close‑up.
              </p>
            </div>
            <Link href="/magicians" className={`${CLASSES.linkGold} hidden sm:inline-flex`}>
              View all →
            </Link>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featuredLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className={`relative overflow-hidden p-5 ${CLASSES.cardInteractive}`}
                  >
                    <div className="animate-pulse space-y-4">
                      <div className="h-6 w-2/3 rounded bg-white/10" />
                      <div className="h-4 w-1/2 rounded bg-white/10" />
                      <div className="flex flex-wrap gap-2">
                        <div className="h-6 w-16 rounded-full bg-white/10" />
                        <div className="h-6 w-20 rounded-full bg-white/10" />
                      </div>
                      <div className="flex justify-between pt-2">
                        <div className="h-4 w-24 rounded bg-white/10" />
                        <div className="h-8 w-16 rounded-lg bg-white/10" />
                      </div>
                    </div>
                  </div>
                ))
              : featuredMagicians.length === 0
                ? (
                    <p className="col-span-full text-sm text-zinc-500">
                      No magicians to show yet.{" "}
                      <Link href="/magicians" className="text-[var(--ml-gold)] hover:underline">
                        Browse the directory
                      </Link>
                      .
                    </p>
                  )
                : featuredMagicians.map((m) => (
                    <article
                      key={m.id}
                      className={`group relative overflow-hidden p-5 ${CLASSES.cardInteractive}`}
                    >
                      <div className="absolute inset-0 opacity-0 transition group-hover:opacity-100">
                        <div className="absolute -top-16 left-1/2 h-40 w-80 -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,var(--ml-gold-glow-card),rgba(0,0,0,0)_70%)] blur-2xl" />
                      </div>

                      <div className="relative flex h-full flex-col">
                        <div className="mb-4 flex justify-center">
                          <Link
                            href={`/profile/magician?id=${encodeURIComponent(m.id)}`}
                            className="rounded-full focus:outline-none focus:ring-2 focus:ring-[var(--ml-gold)]/60"
                            aria-label={`View ${m.name}'s profile`}
                          >
                            {m.avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={m.avatarUrl}
                                alt=""
                                className="h-20 w-20 rounded-full border-2 border-white/20 object-cover drop-shadow-lg transition hover:border-[var(--ml-gold)]/60"
                              />
                            ) : (
                              <span className="inline-flex h-20 w-20 items-center justify-center rounded-full border-2 border-white/20 bg-zinc-800 text-3xl font-semibold text-zinc-100 drop-shadow-lg transition hover:border-[var(--ml-gold)]/60">
                                {initials(m.name)}
                              </span>
                            )}
                          </Link>
                        </div>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className={CLASSES.headingCard}>
                              <Link
                                href={`/profile/magician?id=${encodeURIComponent(m.id)}`}
                                className="hover:underline"
                              >
                                {m.name}
                              </Link>
                            </h3>
                            <p className="mt-1 text-sm text-zinc-400">{m.location}</p>
                          </div>
                          {m.onlineNow ? (
                            <span className={CLASSES.badgeOnline}>
                              <span className="relative flex h-2 w-2">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
                            </span>
                              Online now
                            </span>
                          ) : (
                            <span className={CLASSES.badgeAvailable}>Available</span>
                          )}
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {m.tags.map((tag, ti) => (
                            <Link
                              key={`${m.id}-tag-${ti}`}
                              href={`/magicians?style=${encodeURIComponent(tag)}`}
                              className={`${CLASSES.tag} transition hover:border-[var(--ml-gold)]/45 hover:bg-[var(--ml-gold)]/10`}
                            >
                              {tag}
                            </Link>
                          ))}
                        </div>

                        <div className="mt-auto flex items-center justify-between pt-5">
                          <div className="flex items-center gap-2">
                            <span className="text-[var(--ml-gold)]">★</span>
                            <span className="text-sm font-semibold text-zinc-100">
                              {m.rating.toFixed(1)}
                            </span>
                            <span className="text-xs text-zinc-400">
                              ({m.reviews} reviews)
                            </span>
                          </div>
                          <Link
                            href={`/profile/magician?id=${encodeURIComponent(m.id)}`}
                            className={CLASSES.btnSecondarySm}
                          >
                            View
                          </Link>
                        </div>
                      </div>
                    </article>
                  ))}
          </div>
        </FadeInSection>

        <HomeOurStoryTeaser />

        <section className="border-t border-white/10">
          <div className={`${CLASSES.section} py-14`}>
            <div className="relative overflow-hidden rounded-3xl border border-[var(--ml-gold-border-subtle)] bg-[var(--ml-gold-soft)] p-8 sm:p-10">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,var(--ml-gold-cta-glow),rgba(0,0,0,0)_55%)]" />
              <div className="relative flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
                <div>
                  <h2 className={CLASSES.headingSection}>
                    Magicians: be found, be booked, be remembered
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm text-zinc-200/90">
                    Create your Magicalive profile to showcase your act, collect reviews, and get discovered by audiences and venues.
                  </p>
                </div>
                <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                  <Link href={createProfileHref} className={CLASSES.btnPrimary}>
                    Create your profile
                  </Link>
                  <Link href="/for-magicians" className={CLASSES.btnSecondary}>
                    For magicians
                  </Link>
                  <Link href="/articles" className={CLASSES.btnOutlineLight}>
                    Read articles
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
