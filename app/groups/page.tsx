"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CLASSES } from "@/lib/constants";
import { supabase } from "@/lib/supabase";

const SUITS = ["♣", "♠", "♥", "♦"] as const;

type CategoryFilter = "All" | "International" | "National" | "Regional";

type GroupRow = {
  id: string;
  name: string;
  abbreviation: string | null;
  founded_year: number | null;
  headquarters: string | null;
  country: string | null;
  description: string | null;
  website: string | null;
  membership_count: string | null;
  membership_type: string | null;
  logo_url: string | null;
  category: string | null;
  is_featured: boolean | null;
};

function normalizeWebsite(url: string | null | undefined): string | null {
  const t = url?.trim();
  if (!t) return null;
  if (t.startsWith("http://") || t.startsWith("https://")) return t;
  return `https://${t}`;
}

function suitForIndex(i: number): string {
  return SUITS[i % SUITS.length] ?? SUITS[0]!;
}

function GroupCard({
  org,
  suit,
  featured,
}: {
  org: GroupRow;
  suit: string;
  featured: boolean;
}) {
  const website = normalizeWebsite(org.website);
  const titleClass = featured
    ? "ml-font-heading text-2xl font-semibold leading-snug text-[var(--ml-gold)] sm:text-3xl"
    : "ml-font-heading text-xl font-semibold leading-snug text-[var(--ml-gold)] sm:text-2xl";

  return (
    <article
      className={`relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/50 transition hover:border-white/20 ${
        featured ? "p-6 sm:p-8" : "p-5 sm:p-6"
      }`}
    >
      <span
        className="pointer-events-none absolute right-4 top-4 select-none text-4xl text-[var(--ml-gold)]/15 sm:text-5xl"
        aria-hidden
      >
        {suit}
      </span>
      <div className="relative z-[1] flex min-h-0 flex-1 flex-col">
        <div className="flex flex-wrap items-start gap-3 gap-y-2">
          {org.logo_url?.trim() ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={org.logo_url.trim()}
              alt=""
              width={featured ? 56 : 48}
              height={featured ? 56 : 48}
              className={`shrink-0 rounded-lg border border-white/10 bg-black/30 object-contain ${
                featured ? "h-14 w-14" : "h-12 w-12"
              }`}
            />
          ) : null}
          <h2 className={titleClass}>{org.name}</h2>
          {org.abbreviation?.trim() ? (
            <span className="inline-flex shrink-0 items-center rounded-full border border-[var(--ml-gold)]/35 bg-[var(--ml-gold)]/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--ml-gold)]">
              {org.abbreviation.trim()}
            </span>
          ) : null}
        </div>
        {org.founded_year != null ? (
          <p className="mt-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
            Founded {org.founded_year}
          </p>
        ) : null}
        <p className="mt-1 text-sm text-zinc-400">
          {[org.headquarters?.trim(), org.country?.trim()].filter(Boolean).join(" · ") || "—"}
        </p>
        {org.membership_type?.trim() ? (
          <span className="mt-3 inline-flex w-fit rounded-full border border-white/12 bg-white/[0.06] px-3 py-1 text-[11px] font-medium text-zinc-300">
            {org.membership_type.trim()}
          </span>
        ) : null}
        {org.description?.trim() ? (
          <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-zinc-500">{org.description.trim()}</p>
        ) : null}
        {org.membership_count?.trim() ? (
          <p className="mt-4 text-sm font-semibold text-emerald-400">{org.membership_count.trim()}</p>
        ) : null}
        <div className="mt-auto pt-6">
          {website ? (
            <a
              href={website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-xl border border-[var(--ml-gold)]/45 bg-transparent px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ml-gold)] transition hover:border-[var(--ml-gold)]/70 hover:bg-[var(--ml-gold)]/10"
            >
              Visit website ↗
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export default function GroupsPage() {
  const [orgs, setOrgs] = useState<GroupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<CategoryFilter>("All");

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from("groups")
        .select(
          "id, name, abbreviation, founded_year, headquarters, country, description, website, membership_count, membership_type, logo_url, category, is_featured",
        )
        .order("is_featured", { ascending: false })
        .order("name", { ascending: true });

      if (fetchError) throw fetchError;

      const rows = (data ?? []) as GroupRow[];
      setOrgs(
        rows.map((r) => ({
          ...r,
          id: String(r.id),
          is_featured: Boolean(r.is_featured),
        })),
      );
    } catch (e) {
      console.error("[groups] fetch:", e);
      setError("Something went wrong loading organizations.");
      setOrgs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchGroups();
  }, [fetchGroups]);

  const filtered = useMemo(() => {
    if (filter === "All") return orgs;
    return orgs.filter((o) => (o.category ?? "").trim() === filter);
  }, [orgs, filter]);

  const featuredFiltered = useMemo(
    () => filtered.filter((o) => o.is_featured),
    [filtered],
  );

  const featuredIds = useMemo(() => new Set(featuredFiltered.map((o) => o.id)), [featuredFiltered]);

  const gridOrgs = useMemo(
    () => filtered.filter((o) => !featuredIds.has(o.id)),
    [filtered, featuredIds],
  );

  const tabs: CategoryFilter[] = ["All", "International", "National", "Regional"];

  if (error) {
    return (
      <div className="min-h-0 flex-1 bg-black pb-20 pt-8 text-zinc-100 sm:pt-12">
        <div className={`${CLASSES.section} max-w-6xl`}>
          <p className="text-zinc-300">{error}</p>
          <button type="button" onClick={() => void fetchGroups()} className={`${CLASSES.btnSecondary} mt-6`}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 bg-black pb-20 pt-8 text-zinc-100 sm:pt-12">
      <div className={`${CLASSES.section} max-w-6xl`}>
        <header>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--ml-gold)]">
            The community
          </p>
          <h1 className="ml-font-heading text-4xl font-semibold tracking-tight text-zinc-50 sm:text-5xl">
            Magic <span className="text-[var(--ml-gold)] italic">organizations</span>
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-zinc-400 sm:text-base">
            The societies and fellowships that unite the global magic community
          </p>
        </header>

        <div
          className="mt-8 flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-2 sm:p-3"
          role="tablist"
          aria-label="Filter by category"
        >
          {tabs.map((tab) => {
            const active = filter === tab;
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(tab)}
                className={`rounded-xl px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] transition sm:text-[13px] ${
                  active
                    ? "bg-[var(--ml-gold)]/15 text-[var(--ml-gold)] ring-1 ring-[var(--ml-gold)]/35"
                    : "text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200"
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="mt-12 space-y-10">
            <div className="grid gap-6 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-64 animate-pulse rounded-2xl border border-white/10 bg-zinc-950/50"
                />
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-52 animate-pulse rounded-2xl border border-white/10 bg-zinc-950/50"
                />
              ))}
            </div>
          </div>
        ) : orgs.length === 0 ? (
          <div className="mt-14 flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-8 py-16 text-center">
            <p className="ml-font-heading text-xl text-zinc-300">No organizations yet</p>
            <p className="mt-2 text-sm text-zinc-500">
              Run the Supabase migration to add the groups directory.
            </p>
          </div>
        ) : (
          <>
            {featuredFiltered.length > 0 ? (
              <section className="mt-12" aria-labelledby="featured-groups-heading">
                <h2
                  id="featured-groups-heading"
                  className="ml-font-heading text-lg font-semibold text-zinc-200 sm:text-xl"
                >
                  Featured organizations
                </h2>
                <ul className="mt-6 grid list-none gap-6 sm:grid-cols-2">
                  {featuredFiltered.map((org, i) => (
                    <li key={org.id}>
                      <GroupCard org={org} suit={suitForIndex(i)} featured />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {gridOrgs.length > 0 ? (
              <section
                className={featuredFiltered.length > 0 ? "mt-14" : "mt-12"}
              >
                <ul className="grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {gridOrgs.map((org, i) => (
                    <li key={org.id} className="flex min-h-0">
                      <div className="flex min-h-0 w-full">
                        <GroupCard org={org} suit={suitForIndex(i + featuredFiltered.length)} featured={false} />
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {filtered.length === 0 ? (
              <div className="mt-14 flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-8 py-14 text-center">
                <p className="ml-font-heading text-lg text-zinc-300">No organizations in this category</p>
                <button
                  type="button"
                  onClick={() => setFilter("All")}
                  className={`${CLASSES.btnSecondary} mt-5`}
                >
                  Show all
                </button>
              </div>
            ) : null}
          </>
        )}

        <section
          className="mt-16 rounded-2xl border border-[var(--ml-gold)]/25 bg-[var(--ml-gold)]/[0.06] px-6 py-10 text-center sm:px-10 sm:py-12"
          aria-labelledby="groups-cta-heading"
        >
          <h2 id="groups-cta-heading" className="ml-font-heading text-xl font-semibold text-zinc-50 sm:text-2xl">
            Already a member of one of these organizations?
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-zinc-400 sm:text-base">
            Add your membership credentials to your PinnacleMagic profile
          </p>
          <Link href="/profile/edit" className={`${CLASSES.btnPrimary} mt-8 inline-flex`}>
            Edit profile
          </Link>
        </section>
      </div>
    </div>
  );
}
