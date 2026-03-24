"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CLASSES } from "@/lib/constants";
import { supabase } from "@/lib/supabase";

const TABS = ["About", "Shows", "Magicians", "Reviews"] as const;
type Tab = (typeof TABS)[number];

type VenueRow = Record<string, unknown> & {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  venue_type: string | null;
  capacity: number | null;
  description: string | null;
  contact_email: string | null;
  full_address: string | null;
  website: string | null;
  opening_hours: string | null;
  magic_show_description: string | null;
  social_instagram: string | null;
  social_facebook: string | null;
  social_tiktok: string | null;
  social_youtube: string | null;
  logo_url: string | null;
  established_year: number | null;
  is_verified: boolean | null;
};

type ShowRow = {
  id: string;
  title: string;
  profile_id: string | null;
  starts_at: string | null;
  ticket_url: string | null;
  status: string | null;
};

type ReviewRow = {
  id: string;
  reviewer_display_name: string | null;
  rating: number | null;
  body: string | null;
  created_at: string | null;
};

export default function VenueProfileClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramId = searchParams.get("id")?.trim();
  const { user, isLoaded } = useUser();
  const [tab, setTab] = useState<Tab>("About");
  const [venue, setVenue] = useState<VenueRow | null>(null);
  const [shows, setShows] = useState<ShowRow[]>([]);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [performers, setPerformers] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [loading, setLoading] = useState(true);

  const loadVenue = useCallback(
    async (venueId: string) => {
      const { data: v } = await supabase
        .from("venues")
        .select("*")
        .eq("id", venueId)
        .maybeSingle();
      if (!v) return null;
      return v as unknown as VenueRow;
    },
    [],
  );

  useEffect(() => {
    void (async () => {
      if (!isLoaded) return;
      let vid = paramId;
      if (!vid && user?.primaryEmailAddress?.emailAddress) {
        const { data: row } = await supabase
          .from("venues")
          .select("id")
          .eq("contact_email", user.primaryEmailAddress.emailAddress)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        vid = row?.id ? String(row.id) : undefined;
      }
      if (!vid) {
        setLoading(false);
        setVenue(null);
        return;
      }
      setLoading(true);
      const v = await loadVenue(vid);
      setVenue(v);
      if (!v) {
        setShows([]);
        setReviews([]);
        setPerformers([]);
        setLoading(false);
        return;
      }
      const { data: sh, error: shErr } = await supabase
        .from("shows")
        .select("id, title, profile_id, starts_at, ticket_url, status")
        .eq("venue_id", vid)
        .order("starts_at", { ascending: true });
      const showList = !shErr && sh ? (sh as ShowRow[]) : [];
      setShows(showList);
      const { data: rv, error: rvErr } = await supabase
        .from("reviews")
        .select("id, reviewer_display_name, rating, body, created_at")
        .eq("venue_id", vid)
        .order("created_at", { ascending: false });
      setReviews(!rvErr && rv ? (rv as ReviewRow[]) : []);
      const pids = [
        ...new Set(showList.map((s) => s.profile_id).filter(Boolean)),
      ] as string[];
      if (pids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", pids);
        setPerformers(
          (profs ?? []).map((p) => ({
            id: String(p.id),
            name: (p.display_name as string) || "Magician",
          })),
        );
      } else setPerformers([]);
      setLoading(false);
    })();
  }, [isLoaded, paramId, user, loadVenue]);

  const upcoming = useMemo(
    () =>
      shows.filter(
        (s) =>
          s.status !== "past" &&
          (!s.starts_at || new Date(s.starts_at) >= new Date()),
      ),
    [shows],
  );
  const totalHosted = shows.filter((s) => s.status === "past").length;
  const avgRating = useMemo(() => {
    const r = reviews.filter((x) => x.rating != null);
    if (!r.length) return null;
    return (
      r.reduce((a, b) => a + (b.rating ?? 0), 0) / r.length
    ).toFixed(1);
  }, [reviews]);

  const loc = venue
    ? [venue.city, venue.state].filter(Boolean).join(", ") ||
      venue.full_address ||
      "—"
    : "—";

  if (!isLoaded || loading) {
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
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black px-6 text-center">
        <p className="text-zinc-400">Venue not found.</p>
        <Link href="/venues" className={CLASSES.btnPrimarySm}>
          Back to venues
        </Link>
      </div>
    );
  }

  const isOwn =
    user?.primaryEmailAddress?.emailAddress &&
    venue.contact_email === user.primaryEmailAddress.emailAddress;

  return (
    <div className="min-h-screen bg-black pb-20 text-zinc-100">
      <div className="relative h-48 sm:h-56 md:h-64">
        <div
          className="absolute inset-0 bg-gradient-to-br from-amber-950/90 via-zinc-900 to-black"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-gradient-to-b from-transparent to-black"
          aria-hidden
        />
        <div className="absolute left-5 top-4 sm:left-10">
          <Link
            href="/venues"
            className="text-xs uppercase tracking-wider text-zinc-400 transition hover:text-zinc-100"
          >
            ← Venues
          </Link>
        </div>
      </div>

      <div className={`${CLASSES.section} relative -mt-14 max-w-6xl sm:-mt-16`}>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-10">
          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
              <div className="mx-auto flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-black bg-zinc-800 text-4xl shadow-xl sm:mx-0 sm:h-28 sm:w-28">
                {venue.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={venue.logo_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span aria-hidden>🏛</span>
                )}
              </div>
              <div className="flex-1 text-center sm:pb-1 sm:text-left">
                <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  <h1 className="ml-font-heading text-3xl font-semibold text-zinc-50 sm:text-4xl">
                    {venue.name}
                  </h1>
                  {venue.is_verified ? (
                    <span className="inline-flex rounded-full border border-[var(--ml-gold)]/35 bg-[var(--ml-gold)]/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--ml-gold)]">
                      Verified
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-zinc-400">{loc}</p>
                {venue.venue_type ? (
                  <p className="mt-0.5 text-xs uppercase tracking-wider text-zinc-500">
                    {venue.venue_type}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-4">
              {[
                { label: "Capacity", value: venue.capacity ?? "—" },
                { label: "Upcoming shows", value: String(upcoming.length) },
                { label: "Shows hosted", value: String(totalHosted) },
                { label: "Rating", value: avgRating ?? "—" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="bg-black/90 px-3 py-4 text-center sm:py-5"
                >
                  <div className="ml-font-heading text-xl font-semibold text-[var(--ml-gold)]">
                    {s.value}
                  </div>
                  <div className="mt-1 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 border-b border-white/10">
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

            <div className="mt-8 min-h-[180px]">
              {tab === "About" && (
                <div className="space-y-6 text-sm leading-relaxed text-zinc-400">
                  <div>
                    <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--ml-gold)]">
                      About
                    </h2>
                    <p className="whitespace-pre-wrap">
                      {venue.description || "No description yet."}
                    </p>
                  </div>
                  {venue.magic_show_description ? (
                    <div>
                      <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--ml-gold)]">
                        Magic at this venue
                      </h2>
                      <p className="whitespace-pre-wrap">
                        {venue.magic_show_description}
                      </p>
                    </div>
                  ) : null}
                  {venue.opening_hours ? (
                    <div>
                      <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--ml-gold)]">
                        Opening hours
                      </h2>
                      <p className="whitespace-pre-wrap">{venue.opening_hours}</p>
                    </div>
                  ) : null}
                </div>
              )}
              {tab === "Shows" && (
                <ul className="divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/[0.02]">
                  {upcoming.length ? (
                    upcoming.map((s) => (
                      <li
                        key={s.id}
                        className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                      >
                        <div>
                          <p className="text-sm font-semibold text-[var(--ml-gold)]">
                            {s.starts_at
                              ? new Date(s.starts_at).toLocaleDateString(
                                  undefined,
                                  { dateStyle: "medium" },
                                )
                              : "TBA"}
                          </p>
                          <p className="mt-1 font-semibold text-zinc-100">
                            {s.title}
                          </p>
                        </div>
                        {s.ticket_url ? (
                          <a
                            href={s.ticket_url}
                            target="_blank"
                            rel="noreferrer"
                            className={CLASSES.btnPrimarySm}
                          >
                            Tickets
                          </a>
                        ) : null}
                      </li>
                    ))
                  ) : (
                    <li className="px-5 py-10 text-center text-sm text-zinc-500">
                      No upcoming shows.
                    </li>
                  )}
                </ul>
              )}
              {tab === "Magicians" && (
                <div className="space-y-3">
                  {performers.length ? (
                    performers.map((p) => (
                      <Link
                        key={p.id}
                        href={`/profile/magician?id=${encodeURIComponent(p.id)}`}
                        className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 transition hover:border-[var(--ml-gold)]/30"
                      >
                        <span className="font-medium text-zinc-200">
                          {p.name}
                        </span>
                        <span className="text-xs text-[var(--ml-gold)]">
                          View →
                        </span>
                      </Link>
                    ))
                  ) : (
                    <p className="text-center text-sm text-zinc-500">
                      No performer history yet.
                    </p>
                  )}
                </div>
              )}
              {tab === "Reviews" && (
                <div className="space-y-4">
                  {reviews.length ? (
                    reviews.map((r) => (
                      <article
                        key={r.id}
                        className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
                      >
                        <div className="flex justify-between gap-2">
                          <span className="font-semibold text-zinc-200">
                            {r.reviewer_display_name || "Guest"}
                          </span>
                          <div className="text-[var(--ml-gold)]">
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
                        <p className="mt-2 text-sm text-zinc-400">{r.body}</p>
                      </article>
                    ))
                  ) : (
                    <p className="text-center text-sm text-zinc-500">
                      No reviews yet.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <aside className="w-full shrink-0 space-y-6 lg:w-80">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ml-gold)]">
                Details
              </h3>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-zinc-500">Capacity</dt>
                  <dd className="text-zinc-300">{venue.capacity ?? "—"}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-zinc-500">Type</dt>
                  <dd className="text-zinc-300">{venue.venue_type || "—"}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-zinc-500">Established</dt>
                  <dd className="text-zinc-300">
                    {venue.established_year ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Address</dt>
                  <dd className="mt-1 text-zinc-300">
                    {venue.full_address || loc}
                  </dd>
                </div>
              </dl>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ml-gold)]">
                Contact
              </h3>
              <p className="mt-3 break-all text-sm text-zinc-400">
                {venue.contact_email || "—"}
              </p>
              {isOwn ? (
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      `/onboarding/venue?venueId=${encodeURIComponent(venue.id)}`,
                    )
                  }
                  className={`${CLASSES.btnSecondary} mt-4 w-full text-xs`}
                >
                  Edit listing
                </button>
              ) : null}
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ml-gold)]">
                Social
              </h3>
              <ul className="mt-3 space-y-2 text-sm">
                {[
                  ["Instagram", venue.social_instagram],
                  ["Facebook", venue.social_facebook],
                  ["TikTok", venue.social_tiktok],
                  ["YouTube", venue.social_youtube],
                  ["Website", venue.website],
                ].map(([label, url]) =>
                  url ? (
                    <li key={label as string}>
                      <a
                        href={
                          String(url).startsWith("http")
                            ? String(url)
                            : `https://${url}`
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="text-[var(--ml-gold)] hover:underline"
                      >
                        {label}
                      </a>
                    </li>
                  ) : null,
                )}
                {!venue.social_instagram &&
                !venue.social_facebook &&
                !venue.social_tiktok &&
                !venue.social_youtube &&
                !venue.website ? (
                  <li className="text-zinc-600">No links.</li>
                ) : null}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
