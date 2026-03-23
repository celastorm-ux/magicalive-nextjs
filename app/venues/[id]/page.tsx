"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CLASSES } from "@/lib/constants";
import { supabase } from "@/lib/supabase";

type VenueRow = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  venue_type: string | null;
  capacity: number | null;
  established_year: number | null;
  description: string | null;
  tags: string[] | null;
  contact_email: string | null;
  full_address: string | null;
  website: string | null;
  user_id?: string | null;
};

type ShowProfile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

type ShowUpcoming = {
  id: string;
  name: string;
  date: string | null;
  time: string | null;
  ticket_url: string | null;
  magician_id: string | null;
  profiles: ShowProfile | null;
};

type ShowUpcomingRow = Omit<ShowUpcoming, "profiles"> & {
  profiles: ShowProfile | ShowProfile[] | null;
};

type ShowForMagicians = {
  magician_id: string | null;
  profiles: ShowProfile | ShowProfile[] | null;
};

type MagicianCard = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

const TABS = ["About", "Upcoming shows", "Magicians", "Reviews"] as const;
type DetailTab = (typeof TABS)[number];

const CARD_GRADIENTS = [
  "from-amber-950 via-yellow-900/50 to-stone-950",
  "from-rose-950 via-red-950/70 to-zinc-950",
  "from-indigo-950 via-violet-950 to-black",
  "from-sky-950 via-blue-950 to-slate-950",
  "from-teal-950 via-emerald-950 to-black",
  "from-purple-950 via-fuchsia-950/60 to-black",
] as const;

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function initials(name: string) {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (!p.length) return "M";
  if (p.length === 1) return p[0]![0]!.toUpperCase();
  return `${p[0]![0]}${p[p.length - 1]![0]}`.toUpperCase();
}

function normalizeShowProfile(
  profiles: ShowProfile | ShowProfile[] | null | undefined,
): ShowProfile | null {
  if (profiles == null) return null;
  return Array.isArray(profiles) ? (profiles[0] ?? null) : profiles;
}

function formatShowDate(dateStr: string | null) {
  if (!dateStr) return "Date TBA";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "Date TBA";
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function VenueDetailPage() {
  const params = useParams<{ id: string | string[] }>();
  const rawId = params?.id;
  const venueId = Array.isArray(rawId) ? (rawId[0] ?? "") : (rawId ?? "");

  const [loading, setLoading] = useState(true);
  const [venue, setVenue] = useState<VenueRow | null>(null);
  const [upcomingShows, setUpcomingShows] = useState<ShowUpcoming[]>([]);
  const [pastCount, setPastCount] = useState(0);
  const [totalShows, setTotalShows] = useState(0);
  const [magicians, setMagicians] = useState<MagicianCard[]>([]);
  const [tab, setTab] = useState<DetailTab>("About");

  useEffect(() => {
    if (!venueId) {
      setLoading(false);
      setVenue(null);
      return;
    }

    void (async () => {
      setLoading(true);
      const today = new Date().toISOString().split("T")[0];

      const { data: vRow, error: vErr } = await supabase
        .from("venues")
        .select("*")
        .eq("id", venueId)
        .maybeSingle();

      if (vErr || !vRow) {
        setVenue(null);
        setUpcomingShows([]);
        setPastCount(0);
        setTotalShows(0);
        setMagicians([]);
        setLoading(false);
        return;
      }

      setVenue(vRow as VenueRow);

      const { data: upcoming } = await supabase
        .from("shows")
        .select(
          "id, name, date, time, ticket_url, magician_id, profiles(id, display_name, avatar_url)",
        )
        .eq("venue_id", venueId)
        .gte("date", today)
        .eq("is_public", true)
        .order("date", { ascending: true });

      setUpcomingShows(
        ((upcoming ?? []) as ShowUpcomingRow[]).map((s) => ({
          ...s,
          profiles: normalizeShowProfile(s.profiles),
        })),
      );

      const { count: pastC } = await supabase
        .from("shows")
        .select("*", { count: "exact", head: true })
        .eq("venue_id", venueId)
        .lt("date", today);
      setPastCount(pastC ?? 0);

      const { count: totalC } = await supabase
        .from("shows")
        .select("*", { count: "exact", head: true })
        .eq("venue_id", venueId);
      setTotalShows(totalC ?? 0);

      const { data: magRows } = await supabase
        .from("shows")
        .select("magician_id, profiles(id, display_name, avatar_url)")
        .eq("venue_id", venueId)
        .not("magician_id", "is", null);

      const byId = new Map<string, MagicianCard>();
      for (const row of (magRows ?? []) as ShowForMagicians[]) {
        const mid = row.magician_id;
        const p = normalizeShowProfile(row.profiles);
        if (!mid || !p?.id || byId.has(mid)) continue;
        byId.set(mid, {
          id: p.id,
          display_name: p.display_name,
          avatar_url: p.avatar_url,
        });
      }
      setMagicians(Array.from(byId.values()));

      setLoading(false);
    })();
  }, [venueId]);

  const bannerGradient = useMemo(() => {
    if (!venue) return CARD_GRADIENTS[0];
    return CARD_GRADIENTS[hashId(venue.id) % CARD_GRADIENTS.length]!;
  }, [venue]);

  const locationLine = useMemo(() => {
    if (!venue) return "";
    return [venue.city, venue.state].filter(Boolean).join(", ");
  }, [venue]);

  const hasOwner = Boolean(venue?.user_id?.trim());

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black text-zinc-500">
        <span
          className="inline-block size-10 animate-spin rounded-full border-2 border-[var(--ml-gold)]/30 border-t-[var(--ml-gold)]"
          aria-hidden
        />
        <p className="text-sm">Loading venue…</p>
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black px-6 text-center text-zinc-400">
        <p>Venue not found.</p>
        <Link href="/venues" className={CLASSES.btnPrimarySm}>
          Back to venues
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-20 text-zinc-100">
      <div className="relative h-56 sm:h-72 md:h-80">
        <div className={`absolute inset-0 bg-gradient-to-br ${bannerGradient}`} aria-hidden />
        <div
          className="absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(-35deg,transparent,transparent 10px,rgba(255,255,255,0.05) 10px,rgba(255,255,255,0.05) 11px)",
          }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/45 to-black" aria-hidden />
        <div className={`${CLASSES.section} relative flex h-full max-w-6xl flex-col justify-end pb-8`}>
          <Link
            href="/venues"
            className="mb-4 text-xs uppercase tracking-wider text-zinc-400 transition hover:text-zinc-100"
          >
            ← All venues
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="ml-font-heading text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl md:text-5xl">
              {venue.name}
            </h1>
            {venue.venue_type?.trim() ? (
              <span className="rounded-full border border-[var(--ml-gold)]/35 bg-[var(--ml-gold)]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--ml-gold)]">
                {venue.venue_type}
              </span>
            ) : null}
          </div>
          {locationLine ? (
            <p className="mt-2 text-sm text-zinc-400">{locationLine}</p>
          ) : null}
        </div>
      </div>

      <div className={`${CLASSES.section} mt-8 max-w-6xl`}>
        <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Capacity", value: venue.capacity != null ? venue.capacity.toLocaleString() : "—" },
            { label: "Upcoming shows", value: String(upcomingShows.length) },
            { label: "Total shows hosted", value: String(totalShows) },
            { label: "Established", value: venue.established_year != null ? String(venue.established_year) : "—" },
          ].map((s) => (
            <div key={s.label} className="text-center sm:text-left">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{s.label}</p>
              <p className="mt-1 ml-font-heading text-xl font-semibold text-[var(--ml-gold)]">{s.value}</p>
            </div>
          ))}
        </div>
        {pastCount > 0 ? (
          <p className="mt-2 text-center text-xs text-zinc-600 sm:text-left">
            {pastCount} past {pastCount === 1 ? "show" : "shows"} on record
          </p>
        ) : null}
      </div>

      <div className={`${CLASSES.section} mt-8 max-w-6xl`}>
        <div className="border-b border-white/10">
          <div className="-mb-px flex gap-1 overflow-x-auto pb-px">
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
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_280px]">
          <div className="min-w-0 space-y-6">
            {tab === "About" && (
              <div className="space-y-6">
                <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                  <h2 className="ml-font-heading text-xl font-semibold text-zinc-100">About</h2>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                    {venue.description?.trim() || "No description has been added for this venue yet."}
                  </p>
                </section>
                <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                  <h2 className="ml-font-heading text-lg font-semibold text-zinc-100">Venue details</h2>
                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-zinc-500">Capacity</dt>
                      <dd className="text-zinc-200">{venue.capacity != null ? venue.capacity.toLocaleString() : "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500">Type</dt>
                      <dd className="text-zinc-200">{venue.venue_type?.trim() || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500">Established</dt>
                      <dd className="text-zinc-200">{venue.established_year ?? "—"}</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-zinc-500">Address</dt>
                      <dd className="text-zinc-200">{venue.full_address?.trim() || locationLine || "—"}</dd>
                    </div>
                  </dl>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {(venue.tags ?? []).length ? (
                      venue.tags!.map((tag) => (
                        <span key={tag} className={CLASSES.tag}>
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-zinc-600">No tags yet.</span>
                    )}
                  </div>
                </section>
              </div>
            )}

            {tab === "Upcoming shows" && (
              <ul className="space-y-3">
                {upcomingShows.length ? (
                  upcomingShows.map((s) => {
                    const magName = s.profiles?.display_name?.trim() || "Magician";
                    const magId = s.magician_id || s.profiles?.id;
                    const ticket = s.ticket_url?.trim();
                    return (
                      <li
                        key={s.id}
                        className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-medium uppercase tracking-wider text-[var(--ml-gold)]">
                            {formatShowDate(s.date)}
                            {s.time ? ` · ${s.time}` : ""}
                          </p>
                          <Link
                            href={`/events/${encodeURIComponent(s.id)}`}
                            className="mt-1 block ml-font-heading text-lg font-semibold text-zinc-100 transition hover:text-[var(--ml-gold)]"
                          >
                            {s.name}
                          </Link>
                          {magId ? (
                            <Link
                              href={`/profile/magician?id=${encodeURIComponent(magId)}`}
                              className="mt-1 inline-block text-sm text-zinc-500 transition hover:text-[var(--ml-gold)]/80 hover:underline"
                            >
                              {magName}
                            </Link>
                          ) : (
                            <p className="mt-1 text-sm text-zinc-500">{magName}</p>
                          )}
                        </div>
                        {ticket ? (
                          <a
                            href={ticket}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={CLASSES.btnPrimarySm}
                          >
                            Tickets
                          </a>
                        ) : (
                          <span className="text-xs text-zinc-600">No ticket link</span>
                        )}
                      </li>
                    );
                  })
                ) : (
                  <li className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-12 text-center text-sm text-zinc-500">
                    No upcoming public shows listed.
                  </li>
                )}
              </ul>
            )}

            {tab === "Magicians" && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {magicians.length ? (
                  magicians.map((m) => {
                    const name = m.display_name?.trim() || "Magician";
                    return (
                      <Link
                        key={m.id}
                        href={`/profile/magician?id=${encodeURIComponent(m.id)}`}
                        className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-[var(--ml-gold)]/30"
                      >
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-gradient-to-br from-violet-900 to-indigo-950 text-lg font-semibold">
                          {m.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={m.avatar_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            initials(name)
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="ml-font-heading font-semibold text-zinc-100">{name}</p>
                          <p className="text-xs text-zinc-500">Performed here</p>
                        </div>
                      </Link>
                    );
                  })
                ) : (
                  <p className="col-span-full rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-12 text-center text-sm text-zinc-500">
                    No magicians on record for this venue yet.
                  </p>
                )}
              </div>
            )}

            {tab === "Reviews" && (
              <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-14 text-center">
                <p className="text-sm text-zinc-400">Venue reviews are coming soon.</p>
                <p className="mt-2 text-xs text-zinc-600">Check back later to read and leave feedback.</p>
              </div>
            )}
          </div>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ml-gold)]">
                Contact
              </h3>
              {venue.contact_email?.trim() ? (
                <a
                  href={`mailto:${venue.contact_email}`}
                  className="mt-3 block break-all text-sm text-zinc-300 transition hover:text-[var(--ml-gold)]"
                >
                  {venue.contact_email}
                </a>
              ) : (
                <p className="mt-3 text-sm text-zinc-600">No contact email listed.</p>
              )}
              {venue.website?.trim() ? (
                <a
                  href={venue.website.startsWith("http") ? venue.website : `https://${venue.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-block text-sm text-[var(--ml-gold)]/85 hover:underline"
                >
                  Website
                </a>
              ) : null}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ml-gold)]">
                Tags
              </h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {(venue.tags ?? []).length ? (
                  venue.tags!.map((tag) => (
                    <span key={tag} className={CLASSES.tag}>
                      {tag}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-zinc-600">None yet.</span>
                )}
              </div>
            </div>

            {!hasOwner ? (
              <Link
                href="/contact"
                className={`${CLASSES.btnSecondary} flex w-full justify-center text-center text-xs uppercase tracking-wider`}
              >
                Claim this venue
              </Link>
            ) : null}
          </aside>
        </div>
      </div>
    </div>
  );
}
