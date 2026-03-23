"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CLASSES } from "@/lib/constants";
import { supabase } from "@/lib/supabase";

type FeaturedMagician = {
  id: string;
  name: string;
  location: string;
  tags: string[];
  rating: number;
  reviews: number;
  onlineNow?: boolean;
};

type UpcomingEvent = {
  id: string;
  date: string;
  name: string;
  venue: string;
  ticket_url: string | null;
  magician_id: string | null;
  magician_name: string;
  magician_avatar_url: string | null;
  event_type: string;
  is_online: boolean;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "M";
  if (parts.length === 1) return parts[0]![0]!.toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

export default function Home() {
  const [featuredMagicians, setFeaturedMagicians] = useState<FeaturedMagician[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [foundingRemaining, setFoundingRemaining] = useState<number | null>(null);
  const [foundingBannerDismissed, setFoundingBannerDismissed] = useState(false);

  useEffect(() => {
    void (async () => {
      setFeaturedLoading(true);
      const { data: magRows, error: magErr } = await supabase
        .from("profiles")
        .select(
          "id, display_name, location, specialty_tags, avatar_url, rating, review_count, is_online",
        )
        .eq("account_type", "magician")
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
            };
          }),
        );
      } else {
        setFeaturedMagicians([]);
      }
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      const { data: shows } = await supabase
        .from("shows")
        .select("*, profiles(id, display_name, avatar_url)")
        .eq("is_public", true)
        .gte("date", new Date().toISOString().split("T")[0])
        .order("date", { ascending: true })
        .limit(4);
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
          profiles: { id: string | null; display_name: string | null; avatar_url: string | null } | null;
        }>
      ).map((s) => {
        const isLec = s.event_type === "lecture";
        const online = Boolean(s.is_online);
        return {
          id: s.id,
          date: new Date(s.date).toLocaleDateString(undefined, { month: "short", day: "2-digit" }),
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
              <Link href="/create-profile" className="font-semibold text-[var(--ml-gold)] hover:underline">
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
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10"
      >
        <div className="absolute left-1/2 top-[-160px] h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,var(--ml-gold-glow-strong),rgba(0,0,0,0)_62%)] blur-2xl" />
        <div className="absolute bottom-[-220px] right-[-220px] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle_at_center,var(--ml-gold-glow-soft),rgba(0,0,0,0)_60%)] blur-3xl" />
        <div
          className="absolute inset-0"
          style={{ background: "var(--ml-gradient-vignette)" }}
        />
      </div>

      <main>
        <section className={`${CLASSES.section} pb-10 pt-14 sm:pt-18`}>
          <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
            <div>
              <p className={CLASSES.pillGold}>
                The directory for magicians
                <span
                  className="h-1 w-1 rounded-full"
                  style={{ backgroundColor: "var(--ml-gold-dot)" }}
                />
                Discover • Book • Follow
              </p>

              <h1 className={`${CLASSES.headingHero} mt-6`}>
                Where magic finds its audience
              </h1>

              <p className={`${CLASSES.bodyLead} mt-5 max-w-2xl`}>
                Magicalive is the place to discover performers, track events, and explore venues — like IMDb, but for magic.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new Event("ml:open-search-overlay"))}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-base text-zinc-300 transition hover:border-[var(--ml-gold)]/35 hover:text-zinc-100"
                  >
                    <span className="text-[var(--ml-gold)]">⌕</span>
                    <span>Search magicians, events, venues...</span>
                  </button>
                </div>
                <div className="flex gap-3">
                  <Link href="/magicians" className={CLASSES.btnPrimary}>
                    Browse magicians
                  </Link>
                  <Link href="/events" className={CLASSES.btnSecondary}>
                    Explore events
                  </Link>
                </div>
              </div>

              <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  { value: "2400+", label: "Magicians" },
                  { value: "840", label: "Events" },
                  { value: "320", label: "Venues" },
                  { value: "18k", label: "Members" },
                ].map((stat) => (
                  <div key={stat.label} className={`${CLASSES.card} px-4 py-4`}>
                    <div className="ml-font-heading text-2xl font-semibold text-zinc-50">
                      {stat.value}
                    </div>
                    <div className={`${CLASSES.labelCaps} mt-1`}>
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={CLASSES.cardGlass}>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,var(--ml-gold-glow-mid),rgba(0,0,0,0)_55%)]" />
              <div className="relative">
                <h2 className={`${CLASSES.headingSub} mt-0`}>
                  Tonight’s spotlight
                </h2>
                <p className="mt-2 text-sm leading-6 text-zinc-300">
                  Find performers who are available now, discover what’s on, and build your watchlist of acts you love.
                </p>

                <div className="mt-6 space-y-3">
                  {[
                    { label: "Online now", value: "63 performers" },
                    { label: "Trending this week", value: "Mentalism" },
                    { label: "Most booked city", value: "New York" },
                  ].map((row) => (
                    <div key={row.label} className={CLASSES.cardRow}>
                      <div className="text-sm text-zinc-300">{row.label}</div>
                      <div className="text-sm font-semibold text-[var(--ml-gold)]">
                        {row.value}
                      </div>
                    </div>
                  ))}
                </div>

                <div className={`${CLASSES.cardCta} mt-6`}>
                  <div>
                    <div className="text-sm font-semibold text-zinc-100">
                      Are you a magician?
                    </div>
                    <div className="text-xs text-zinc-300">
                      Get discovered by audiences and venues.
                    </div>
                    {showFoundingSpots ? (
                      <div className="mt-1 text-xs text-[var(--ml-gold)]/75">
                        ♣ {foundingRemaining} Founding Member spots remaining
                      </div>
                    ) : null}
                  </div>
                  <Link href="/create-profile" className={CLASSES.btnPrimarySm}>
                    Create profile
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={`${CLASSES.section} pb-4`}>
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
                <Link href="/create-profile" className={CLASSES.btnPrimary}>
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
        </section>

        <section className={`${CLASSES.section} pb-16 pt-2`}>
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

            <div className="divide-y divide-white/10">
              {upcomingEvents.map((e) => (
                (() => {
                  const ticketLink = e.ticket_url?.trim() || null;
                  const isLec = e.event_type === "lecture";
                  return (
                <div
                  key={e.id}
                  className={`grid grid-cols-[88px_1fr] items-center gap-x-4 px-5 py-4 sm:grid-cols-[110px_1fr_220px_120px] ${CLASSES.tableRow} ${
                    isLec ? "border-l-2 border-l-violet-500/45 bg-violet-950/[0.12]" : ""
                  }`}
                >
                  <div
                    className={`text-sm font-semibold ${isLec ? "text-violet-200" : "text-[var(--ml-gold)]"}`}
                  >
                    {e.date}
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
        </section>

        <section className={`${CLASSES.section} py-12`}>
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

                      <div className="relative">
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
                              <span className="h-2 w-2 rounded-full bg-emerald-300" />
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

                        <div className="mt-5 flex items-center justify-between">
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
        </section>

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
                  <Link href="/create-profile" className={CLASSES.btnPrimary}>
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
