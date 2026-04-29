"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { CLASSES } from "@/lib/constants";
import { formatShowDateShortEnUS, todayYmdLocal } from "@/lib/show-dates";
import { formatTime } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

const SIGN_UP_CREATE_PROFILE = `/sign-up?redirect_url=${encodeURIComponent("/create-profile")}`;

const CARD_HUES = [
  "rgba(167, 139, 250, 0.13)", // violet
  "rgba(96, 165, 250, 0.13)",  // blue
  "rgba(251, 113, 133, 0.13)", // rose
  "rgba(45, 212, 191, 0.13)",  // teal
  "rgba(251, 191, 36, 0.11)",  // amber
  "rgba(129, 140, 248, 0.13)", // indigo
];

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
  const [foundingRemaining, setFoundingRemaining] = useState<number | null>(null);
  const [foundingBannerDismissed, setFoundingBannerDismissed] = useState(false);
  const [passwordResetBanner, setPasswordResetBanner] = useState(false);
  const [magicianCount, setMagicianCount] = useState<number | null>(null);
  const [venueCount, setVenueCount] = useState<number | null>(null);

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
      const { data } = await supabase
        .from("articles")
        .select("id, title, excerpt, category, published_at, read_time, cover_image_url")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(3);
      setRecentArticles((data as HomeArticle[] | null) ?? []);
    })();
  }, []);

  useEffect(() => {
    const dismissed =
      typeof window !== "undefined" &&
      window.localStorage.getItem("pinnaclemagic_founding_banner_dismissed") === "1";
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

    void (async () => {
      const [{ count: mCount }, { count: vCount }] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("account_type", "magician"),
        supabase.from("venues").select("id", { count: "exact", head: true }).eq("is_verified", true),
      ]);
      setMagicianCount(Number(mCount ?? 0));
      setVenueCount(Number(vCount ?? 0));
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
                  window.localStorage.setItem("pinnaclemagic_founding_banner_dismissed", "1");
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
        <section className="relative overflow-hidden border-b border-white/10 pb-16 pt-20 sm:pb-20 sm:pt-28">
          <div className={`${CLASSES.section} relative z-10 text-center`}>
            <h1 className="ml-font-heading mx-auto mt-6 max-w-6xl text-center text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl sm:leading-[0.95] lg:text-[72px] lg:leading-[0.95]">
              Where the audience finds its <span className="italic text-[var(--ml-gold)]">magic</span>
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-base text-zinc-300 sm:text-lg">
              Discover magicians. Find live shows. Book performers.
            </p>
            <div className="mt-10 grid gap-5 text-left md:grid-cols-3">
              {[
                {
                  emoji: "🎩",
                  title: "I am a Magician",
                  sub: "Get discovered",
                  body: "Create your profile, list your shows, and connect with fans and event organisers across the world.",
                  href: createProfileHref,
                  cta: "Create free profile →",
                },
                {
                  emoji: "✨",
                  title: "I am a Fan",
                  sub: "Find the magic",
                  body: "Discover performers near you, browse upcoming shows, and follow your favourite magicians.",
                  href: "/events",
                  cta: "Browse events →",
                },
                {
                  emoji: "🎭",
                  title: "I need a Performer",
                  sub: "Book a magician",
                  body: "Find the perfect performer for your corporate event, wedding, or private party.",
                  href: "/hire-a-magician",
                  cta: "Find a magician →",
                },
              ].map((card) => (
                <article
                  key={card.title}
                  className="group flex h-full flex-col rounded-2xl border border-[var(--ml-gold)]/30 bg-[#151217] p-5 sm:p-7 transition hover:shadow-[0_0_30px_rgba(201,168,76,0.22)] hover:border-[var(--ml-gold)]/70"
                >
                  <div className="text-4xl" aria-hidden>{card.emoji}</div>
                  <h3 className="ml-font-heading mt-5 text-3xl font-semibold text-zinc-100">{card.title}</h3>
                  <p className="mt-1 text-sm uppercase tracking-[0.15em] text-[var(--ml-gold)]">{card.sub}</p>
                  <p className="mt-4 flex-1 text-sm leading-relaxed text-zinc-300">{card.body}</p>
                  <Link href={card.href} className="mt-6 text-sm font-semibold text-[var(--ml-gold)] transition hover:underline">
                    {card.cta}
                  </Link>
                </article>
              ))}
            </div>
            <div className="mt-10 border-t border-white/10 pt-4 text-xs uppercase tracking-[0.18em] text-zinc-500">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4">
                <span>{magicianCount ? `${magicianCount.toLocaleString()}+ Magicians` : "2,400+ Magicians"}</span>
                <span className="text-[var(--ml-gold)]">|</span>
                <span>840+ Shows</span>
                <span className="text-[var(--ml-gold)]">|</span>
                <span>{venueCount ? `${venueCount.toLocaleString()}+ Venues` : "60+ Venues"}</span>
                <span className="text-[var(--ml-gold)]">|</span>
                <span>Growing daily</span>
              </div>
            </div>
          </div>
          <div aria-hidden className="pointer-events-none absolute inset-0">
            {["♣", "♠", "♥", "♦", "♣", "♦", "♠", "♥"].map((suit, i) => (
              <span
                key={`${suit}-${i}`}
                className="absolute text-3xl text-[var(--ml-gold)]/10 sm:text-4xl"
                style={{
                  top: `${10 + ((i * 11) % 70)}%`,
                  left: `${6 + ((i * 13) % 88)}%`,
                  animation: `ml-suit-float ${18 + i * 2}s ease-in-out infinite`,
                  animationDelay: `${i * 0.9}s`,
                }}
              >
                {suit}
              </span>
            ))}
          </div>
        </section>


        <FadeInSection className={`${CLASSES.section} py-16`} delay={80}>
          <div className="border-b border-white/10 pb-6">
            <p className={`${CLASSES.labelCaps} text-[var(--ml-gold)]/90`}>Upcoming shows</p>
            <h2 className="ml-font-heading mt-3 text-4xl font-semibold text-zinc-50 sm:text-5xl">What&apos;s on this week</h2>
          </div>
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02]">
            {/* Mobile card view */}
            {upcomingEvents.slice(0, 4).map((e) => {
              const ticketLink = e.ticket_url?.trim() || null;
              return (
                <div key={`mob-${e.id}`} className="flex items-start justify-between border-b border-white/10 px-4 py-4 sm:hidden">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[var(--ml-gold)]">{e.date}{e.time?.trim() ? ` · ${formatTime(e.time)}` : ""}</p>
                    <Link href={`/events/${encodeURIComponent(e.id)}`} className="mt-0.5 block text-sm font-semibold text-zinc-100 hover:underline truncate">
                      {e.name}
                    </Link>
                    <p className="mt-0.5 text-xs text-zinc-400 truncate">{e.magician_name} · {e.venue}</p>
                  </div>
                  <div className="ml-3 shrink-0 text-sm">
                    {ticketLink ? (
                      <a href={ticketLink} target="_blank" rel="noopener noreferrer" className="font-semibold text-[var(--ml-gold)] hover:underline">
                        {e.event_type === "lecture" ? "Register" : "Tickets"}
                      </a>
                    ) : (
                      <span className="text-zinc-500">Enquire</span>
                    )}
                  </div>
                </div>
              );
            })}
            {/* Desktop table view */}
            <div className="hidden sm:block">
              <div className="grid grid-cols-[76px_1.1fr_1fr_1fr_auto] gap-3 border-b border-white/10 px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-500">
                <div>Date</div>
                <div>Show</div>
                <div>Venue</div>
                <div>Magician</div>
                <div className="text-right">Tickets</div>
              </div>
              {upcomingEvents.slice(0, 4).map((e) => {
                const ticketLink = e.ticket_url?.trim() || null;
                return (
                  <div key={e.id} className="grid grid-cols-[76px_1.1fr_1fr_1fr_auto] items-center gap-3 border-b border-white/10 px-6 py-4 text-sm">
                    <div className="text-[var(--ml-gold)]">{e.date}</div>
                    <div>
                      <Link href={`/events/${encodeURIComponent(e.id)}`} className="ml-font-heading text-base font-semibold text-zinc-100 hover:underline">
                        {e.name}
                      </Link>
                      {e.time?.trim() ? <p className="text-xs text-zinc-500">{formatTime(e.time)}</p> : null}
                    </div>
                    <div className="text-zinc-300">{e.venue}</div>
                    <div>
                      {e.magician_id ? (
                        <Link href={`/profile/magician?id=${encodeURIComponent(e.magician_id)}`} className="text-zinc-200 hover:underline">
                          {e.magician_name}
                        </Link>
                      ) : (
                        <span className="text-zinc-200">{e.magician_name}</span>
                      )}
                    </div>
                    <div className="text-right">
                      {ticketLink ? (
                        <a href={ticketLink} target="_blank" rel="noopener noreferrer" className="text-[var(--ml-gold)] hover:underline">
                          {e.event_type === "lecture" ? "Register" : "Tickets"}
                        </a>
                      ) : (
                        <span className="text-zinc-500">Enquire</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {upcomingEvents.length === 0 ? (
              <p className="px-6 py-8 text-sm text-zinc-500">No upcoming public shows yet.</p>
            ) : null}
          </div>
          <div className="mt-5">
            <Link href="/events" className="text-sm font-semibold text-[var(--ml-gold)] hover:underline">
              See all shows →
            </Link>
          </div>
        </FadeInSection>

        <FadeInSection className={`${CLASSES.section} py-16`} delay={90}>
          <div className="border-b border-white/10 pb-6">
            <p className={`${CLASSES.labelCaps} text-[var(--ml-gold)]/90`}>Featured magicians</p>
            <h2 className="ml-font-heading mt-3 text-4xl font-semibold text-zinc-50 sm:text-5xl">Featured performers</h2>
            <p className="mt-2 text-zinc-400">Magicians available for bookings</p>
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featuredLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                    <div className="animate-pulse space-y-4">
                      <div className="h-14 w-14 rounded-full bg-white/10" />
                      <div className="h-5 w-3/4 rounded bg-white/10" />
                      <div className="h-3 w-2/3 rounded bg-white/10" />
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
                : featuredMagicians.map((m, i) => (
                    <article key={m.id} className="group relative flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-[var(--ml-gold)]/45">
                      <div
                        className="absolute -top-16 left-1/2 h-36 w-64 -translate-x-1/2 rounded-full blur-2xl"
                        style={{ background: `radial-gradient(circle at center, ${CARD_HUES[i % CARD_HUES.length]}, rgba(0,0,0,0) 70%)` }}
                      />
                      <div className="relative">
                        <Link href={`/profile/magician?id=${encodeURIComponent(m.id)}`} className="inline-flex items-center gap-3">
                          {m.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={m.avatarUrl} alt="" className="h-12 w-12 rounded-full border border-white/20 object-cover" />
                          ) : (
                            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-zinc-800 text-lg font-semibold">
                              {initials(m.name)}
                            </span>
                          )}
                          <div>
                            <h3 className="ml-font-heading text-2xl font-semibold text-zinc-100 group-hover:text-[var(--ml-gold)]">{m.name}</h3>
                            <p className="text-sm text-zinc-400">{m.location}</p>
                          </div>
                        </Link>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {m.tags.slice(0, 2).map((tag, ti) => (
                            <Link key={`${m.id}-tag-${ti}`} href={`/magicians?style=${encodeURIComponent(tag)}`} className={`${CLASSES.tag} text-[10px]`}>
                              {tag}
                            </Link>
                          ))}
                        </div>
                        <div className="mt-5 flex items-center justify-between">
                          <div className="text-xs text-zinc-400">
                            {m.reviews >= 3 ? `★ ${m.rating.toFixed(1)} (${m.reviews} reviews)` : "Available for bookings"}
                          </div>
                          <Link href={`/profile/magician?id=${encodeURIComponent(m.id)}`} className="text-sm font-semibold text-[var(--ml-gold)] hover:underline">
                            View →
                          </Link>
                        </div>
                      </div>
                    </article>
                  ))}
          </div>
          <div className="mt-5">
            <Link href="/magicians" className="text-sm font-semibold text-[var(--ml-gold)] hover:underline">
              Browse all magicians →
            </Link>
          </div>
        </FadeInSection>

        <FadeInSection className={`${CLASSES.section} pb-8 pt-6`} delay={100}>
          {showFoundingSpots ? (
            <div className="rounded-xl border border-[var(--ml-gold)]/35 bg-[var(--ml-gold)]/8 px-4 py-4 sm:px-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[var(--ml-gold)]">
                    ♣ Founding Member spots — {foundingRemaining} of 100 remaining
                  </p>
                  <div className="mt-2 h-1.5 w-full max-w-xl overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-[var(--ml-gold)] transition-all duration-300"
                      style={{ width: `${foundingProgressPct}%` }}
                    />
                  </div>
                </div>
                <Link href={createProfileHref} className={CLASSES.btnPrimarySm}>
                  Claim your spot →
                </Link>
              </div>
            </div>
          ) : foundingRemaining === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-4 sm:px-6">
              <p className="text-sm text-zinc-300">
                Our 100 Founding Members have been selected. Create your free profile to join the community.
              </p>
            </div>
          ) : null}
        </FadeInSection>

        <FadeInSection className={`${CLASSES.section} py-12`} delay={110}>
          <div className="border-t border-white/10 pt-6">
            <div className="flex items-baseline justify-between">
              <p className={`${CLASSES.labelCaps} text-[var(--ml-gold)]/90`}>From the journal</p>
              <Link href="/articles" className="text-sm font-semibold text-[var(--ml-gold)] hover:underline">
                See all →
              </Link>
            </div>
            {recentArticles.length > 0 ? (
              <div className="mt-5 grid gap-5 md:grid-cols-[1.6fr_1fr]">
                {recentArticles[0] && (
                  <Link href={`/articles/${encodeURIComponent(recentArticles[0].id)}`} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
                    {recentArticles[0].cover_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={recentArticles[0].cover_image_url} alt="" className="h-52 w-full object-cover" style={{ objectPosition: "50% 25%" }} />
                    ) : (
                      <div className="h-44 w-full bg-[#1a1720]" />
                    )}
                    <div className="p-5">
                      {recentArticles[0].category ? (
                        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--ml-gold)]">{recentArticles[0].category}</p>
                      ) : null}
                      <h3 className="ml-font-heading text-xl font-semibold text-zinc-100 group-hover:text-[var(--ml-gold)] transition">{recentArticles[0].title}</h3>
                      {recentArticles[0].excerpt ? (
                        <p className="mt-2 text-sm leading-relaxed text-zinc-400 line-clamp-2">{recentArticles[0].excerpt}</p>
                      ) : null}
                    </div>
                  </Link>
                )}
                <div className="flex flex-col gap-5">
                  {recentArticles.slice(1).map((a) => (
                    <Link key={a.id} href={`/articles/${encodeURIComponent(a.id)}`} className="group flex flex-1 flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                      {a.category ? (
                        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--ml-gold)]">{a.category}</p>
                      ) : null}
                      <h3 className="ml-font-heading text-lg font-semibold text-zinc-100 group-hover:text-[var(--ml-gold)] transition leading-snug">{a.title}</h3>
                      {a.read_time ? (
                        <p className="mt-auto pt-3 text-xs text-zinc-500">{a.read_time}</p>
                      ) : null}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </FadeInSection>

        <FadeInSection className={`${CLASSES.section} py-10`} delay={120}>
          <div className="border-t border-white/10 pt-6">
            <p className={`${CLASSES.labelCaps} text-[var(--ml-gold)]/90`}>Our story</p>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-300">
              PinnacleMagic started with a simple idea: give the global magic community one stage to be seen, discovered, and booked.
              We are building the home for performers, fans, and event organisers to connect.
            </p>
            <Link href="/our-story" className="mt-3 inline-block text-sm font-semibold text-[var(--ml-gold)] hover:underline">
              Read our story →
            </Link>
          </div>
        </FadeInSection>

        <section className="border-t border-white/10 py-16">
          <div className={`${CLASSES.section}`}>
            <div className="rounded-3xl border border-white/10 bg-[#0f0d10] px-8 py-12 text-center sm:px-12">
              <p className={`${CLASSES.labelCaps} text-[var(--ml-gold)]/90`}>Join now</p>
              <h2 className="ml-font-heading mt-3 text-4xl font-semibold text-zinc-100 sm:text-5xl">
                The magic community starts here
              </h2>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link href={createProfileHref} className={CLASSES.btnPrimary}>
                  Create profile
                </Link>
                <Link href="/magicians" className={CLASSES.btnSecondary}>
                  Browse magicians
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <style jsx>{`
        @keyframes ml-suit-float {
          0%,
          100% {
            transform: translateY(0px);
            opacity: 0.08;
          }
          50% {
            transform: translateY(-16px);
            opacity: 0.18;
          }
        }
      `}</style>
    </div>
  );
}
