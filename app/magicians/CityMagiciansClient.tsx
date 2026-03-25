"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { CLASSES } from "@/lib/constants";
import { CITY_LANDING_PAGES, type CityLandingDefinition } from "@/lib/city-landing";

export type CityMagicianCard = {
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
  lastSeenLabel: string;
  gradient: string;
  isFoundingMember: boolean;
};

type VenueMini = { id: string; name: string; city: string | null; state: string | null };

const STYLES = ["Any style"] as const;
const selectClass =
  "w-full min-w-0 cursor-pointer rounded-2xl border border-white/10 bg-white/5 py-2.5 pl-3 pr-8 text-sm text-zinc-100 outline-none transition focus:border-[var(--ml-gold)]/50 sm:min-w-[140px]";

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

function firstInitial(name: string) {
  return (name.trim()[0] || "M").toUpperCase();
}

type CityMagiciansClientProps = {
  definition: CityLandingDefinition;
  magicians: CityMagicianCard[];
  venues: VenueMini[];
};

export default function CityMagiciansClient({
  definition,
  magicians,
  venues,
}: CityMagiciansClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [style, setStyle] = useState<string>(STYLES[0]);
  const [onlineOnly, setOnlineOnly] = useState(false);

  const styleOptions = useMemo(() => {
    const set = new Set<string>(CORE_SPECIALTY_TAGS);
    for (const m of magicians) for (const t of m.tags) if (t.trim()) set.add(t);
    const orderedCore = CORE_SPECIALTY_TAGS.filter((t) => set.has(t));
    const extras = Array.from(set).filter(
      (t) => !CORE_SPECIALTY_TAGS.includes(t as (typeof CORE_SPECIALTY_TAGS)[number]),
    );
    return [STYLES[0], ...orderedCore, ...extras.sort((a, b) => a.localeCompare(b))];
  }, [magicians]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return magicians.filter((m) => {
      if (onlineOnly && !m.onlineNow) return false;
      if (style !== STYLES[0]) {
        const st = style.toLowerCase();
        const match =
          m.styleKeys.some((k) => k.toLowerCase().includes(st)) ||
          m.tags.some((t) => t.toLowerCase().includes(st));
        if (!match) return false;
      }
      if (q) {
        const hay = `${m.name} ${m.location}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [search, style, onlineOnly, magicians]);

  const hasActiveFilters = search.trim().length > 0 || style !== STYLES[0] || onlineOnly;

  const clearAllFilters = () => {
    setSearch("");
    setStyle(STYLES[0]);
    setOnlineOnly(false);
  };

  const related = definition.relatedSlugs
    .map((slug) => CITY_LANDING_PAGES.find((c) => c.slug === slug))
    .filter(Boolean) as CityLandingDefinition[];

  return (
    <div className="min-h-0 flex-1 bg-black pb-16 pt-8 text-zinc-100 sm:pt-12">
      <div className={`${CLASSES.section} max-w-7xl`}>
        <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--ml-gold)]">
          City directory
        </p>
        <h1 className="ml-font-heading text-4xl font-semibold tracking-tight text-zinc-50 sm:text-5xl">
          Magicians in <span className="text-[var(--ml-gold)] italic">{definition.displayName}</span>
        </h1>
        <p className="mt-3 text-sm text-zinc-400 sm:text-base">
          <span className="font-semibold text-zinc-200">{magicians.length}</span> professional magician
          {magicians.length === 1 ? "" : "s"} available · {definition.heroSubtext}
        </p>

        <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
              ⌕
            </span>
            <input
              type="search"
              placeholder="Search by name, neighborhood, or specialty…"
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
            <select className={selectClass} value={style} onChange={(e) => setStyle(e.target.value)}>
              {styleOptions.map((s) => (
                <option key={s} value={s} className="bg-zinc-900">
                  {s}
                </option>
              ))}
            </select>
            <div className="flex flex-1 flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3 lg:border-t-0 lg:pt-0">
              <span className="text-sm text-zinc-400">
                <span className="font-semibold text-zinc-200">{filtered.length}</span> results
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
                <span className={`h-2 w-2 rounded-full ${onlineOnly ? "bg-emerald-400" : "bg-zinc-600"}`} />
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
          <div className="min-w-0 flex-1">
            {magicians.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/15 bg-white/[0.02] px-8 py-20 text-center">
                <p className="ml-font-heading text-2xl text-zinc-200">
                  No magicians in this city yet
                </p>
                <p className="mt-2 max-w-md text-sm text-zinc-500">
                  Check back soon or browse the full directory.
                </p>
                <Link href="/magicians" className={`${CLASSES.btnPrimary} mt-6 text-sm`}>
                  All magicians
                </Link>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/15 bg-white/[0.02] px-8 py-20 text-center">
                <p className="ml-font-heading text-2xl text-zinc-200">No magicians match</p>
                <p className="mt-2 max-w-md text-sm text-zinc-500">Try clearing filters or search.</p>
                <button type="button" onClick={clearAllFilters} className={`${CLASSES.btnPrimary} mt-6 text-sm`}>
                  Reset filters
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
                      <div className="absolute right-3 top-3">
                        {m.isFoundingMember ? (
                          <span className="absolute -left-8 -top-1 text-[var(--ml-gold)]" title="Founding Member">
                            ♣
                          </span>
                        ) : null}
                        {m.onlineNow ? (
                          <span className="inline-flex items-center justify-center" title="Online now" aria-label="Online now">
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
                    </div>
                    <div className="p-4">
                      <h3 className={CLASSES.headingCard}>
                        <Link
                          href={`/profile/magician?id=${encodeURIComponent(m.id)}`}
                          className="hover:underline"
                        >
                          {m.name}
                        </Link>
                      </h3>
                      <Link
                        href={`/magicians?city=${encodeURIComponent(definition.displayName)}`}
                        className="mt-1 block text-sm text-zinc-400 transition hover:text-[var(--ml-gold)]"
                      >
                        {m.location}
                      </Link>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {m.tags.slice(0, 6).map((tag) => (
                          <Link
                            key={`${m.id}-${tag}`}
                            href={`/magicians?style=${encodeURIComponent(tag)}`}
                            className={`${CLASSES.tag} transition hover:border-[var(--ml-gold)]/45 hover:bg-[var(--ml-gold)]/10`}
                          >
                            {tag}
                          </Link>
                        ))}
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[var(--ml-gold)]">★</span>
                          <span className="text-sm font-semibold text-zinc-100">{m.rating.toFixed(1)}</span>
                          <span className="text-xs text-zinc-400">({m.reviews} reviews)</span>
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
            )}
          </div>

          <aside className="w-full shrink-0 space-y-6 lg:w-72">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ml-gold)]">
                Venues in {definition.displayName}
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-zinc-300">
                {venues.length ? (
                  venues.map((v) => (
                    <li key={v.id}>
                      <Link
                        href={`/venues/${encodeURIComponent(v.id)}`}
                        className="transition hover:text-[var(--ml-gold)] hover:underline"
                      >
                        {v.name}
                      </Link>
                      <span className="block text-xs text-zinc-500">
                        {[v.city, v.state].filter(Boolean).join(", ")}
                      </span>
                    </li>
                  ))
                ) : (
                  <li className="text-zinc-500">Venues will appear as they join Magicalive.</li>
                )}
              </ul>
              <p className="mt-4 text-xs text-zinc-600">Spotlight: {definition.venueSpotlight.join(" · ")}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ml-gold)]">
                Other cities
              </h3>
              <ul className="mt-3 space-y-2 text-sm">
                {related.map((c) => (
                  <li key={c.slug}>
                    <Link href={`/magicians/${c.slug}`} className="text-zinc-300 hover:text-[var(--ml-gold)] hover:underline">
                      Magicians in {c.displayName}
                    </Link>
                  </li>
                ))}
              </ul>
              <Link href="/magicians/cities" className={`${CLASSES.linkGold} mt-4 inline-block text-sm`}>
                All city pages →
              </Link>
            </div>
          </aside>
        </div>

        <section className="mt-16 max-w-3xl border-t border-white/10 pt-12">
          <h2 className="ml-font-heading text-2xl font-semibold text-zinc-100">
            Magic in {definition.displayName}
          </h2>
          <div className="mt-4 space-y-4 text-sm leading-relaxed text-zinc-400">
            {definition.seoParagraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            {related.map((c) => (
              <Link
                key={c.slug}
                href={`/magicians/${c.slug}`}
                className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-300 transition hover:border-[var(--ml-gold)]/35"
              >
                {c.displayName}
              </Link>
            ))}
            <Link
              href="/magicians"
              className="rounded-full border border-[var(--ml-gold)]/35 bg-[var(--ml-gold)]/10 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--ml-gold)]"
            >
              Full directory
            </Link>
          </div>
        </section>

        <section className="mt-16 max-w-3xl border-t border-white/10 pt-12">
          <h2 className="ml-font-heading text-2xl font-semibold text-zinc-100">
            Hire a Magician in {definition.displayName}
          </h2>
          <div className="mt-4 space-y-4 text-sm leading-relaxed text-zinc-400">
            <p>{definition.hireBookerParagraphs[0]}</p>
            <p>{definition.hireBookerParagraphs[1]}</p>
            {venues.length ? (
              <p>
                Venues on Magicalive in this area include{" "}
                {venues.slice(0, 6).map((v, i) => (
                  <span key={v.id}>
                    {i > 0 ? ", " : ""}
                    <Link
                      href={`/venues/${encodeURIComponent(v.id)}`}
                      className="text-[var(--ml-gold)] underline decoration-[var(--ml-gold)]/30 underline-offset-2 hover:decoration-[var(--ml-gold)]"
                    >
                      {v.name}
                    </Link>
                  </span>
                ))}
                {venues.length > 6 ? " — and more listed on the platform." : "."}
              </p>
            ) : null}
          </div>
          <Link
            href="/hire-a-magician"
            className={`${CLASSES.btnPrimarySm} mt-8 inline-flex`}
          >
            Hire a magician — get started
          </Link>
        </section>
      </div>
    </div>
  );
}
