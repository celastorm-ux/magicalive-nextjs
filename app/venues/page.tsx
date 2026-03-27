"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CLASSES } from "@/lib/constants";
import {
  countriesForPicker,
  getCitiesForCountry,
  rowCityMatchesFilter,
} from "@/lib/locations";
import { supabase } from "@/lib/supabase";

const VenueMap = dynamic(() => import("@/components/VenueMap"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: "100%",
        background: "#0d0b0e",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#c9a84c",
      }}
    >
      Loading map...
    </div>
  ),
});

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
  website: string | null;
  address: string | null;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
};

type Venue = VenueRow & {
  cityKey: string;
  upcomingShows: number;
  gradient: string;
  emoji: string;
};

const ALL_COUNTRIES = "All countries";
const ALL_CITIES = "All cities";

const CAPS = ["Any capacity", "Under 300", "300-1000", "1000+"] as const;

const CARD_GRADIENTS = [
  "from-amber-950 via-yellow-900/50 to-stone-950",
  "from-rose-950 via-red-950/70 to-zinc-950",
  "from-indigo-950 via-violet-950 to-black",
  "from-sky-950 via-blue-950 to-slate-950",
  "from-teal-950 via-emerald-950 to-black",
  "from-purple-950 via-fuchsia-950/60 to-black",
] as const;

const EMOJIS = ["🏰", "🎭", "🗽", "🪄", "🌊", "✨", "🎪", "🃏"];

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function capacityMatches(capacity: number | null, cap: (typeof CAPS)[number]) {
  const c = capacity ?? 0;
  if (cap === "Any capacity") return true;
  if (cap === "Under 300") return c < 300;
  if (cap === "300-1000") return c >= 300 && c <= 1000;
  return c > 1000;
}

const selectClass =
  "min-w-0 flex-1 cursor-pointer rounded-2xl border border-white/10 bg-white/5 py-2.5 pl-3 pr-8 text-sm text-zinc-100 outline-none transition focus:border-[var(--ml-gold)]/50 sm:min-w-[140px]";

export default function VenuesPage() {
  const [search, setSearch] = useState("");
  const [filterCountry, setFilterCountry] = useState(ALL_COUNTRIES);
  const [filterCity, setFilterCity] = useState(ALL_CITIES);
  const [vtype, setVtype] = useState("Any type");
  const [cap, setCap] = useState<(typeof CAPS)[number]>("Any capacity");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);

  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const { data: venueRows, error: vErr } = await supabase
        .from("venues")
        .select("*")
        .order("name", { ascending: true });

      if (vErr) {
        console.error("[venues] fetch venues:", vErr);
      }

      const today = new Date().toISOString().split("T")[0];
      const { data: showRows } = await supabase
        .from("shows")
        .select("venue_id")
        .gte("date", today)
        .eq("is_public", true);

      const countByVenueId: Record<string, number> = {};
      for (const s of showRows ?? []) {
        const vid = (s as { venue_id: string | null }).venue_id;
        if (!vid) continue;
        countByVenueId[vid] = (countByVenueId[vid] ?? 0) + 1;
      }

      const rows = (venueRows ?? []) as VenueRow[];
      if (rows.length === 0) {
        setVenues([]);
        setLoading(false);
        return;
      }

      const mapped: Venue[] = rows.map((row) => {
        const cityStr = row.city?.trim() || "—";
        const h = hashId(row.id);
        return {
          ...row,
          cityKey: cityStr,
          upcomingShows: countByVenueId[row.id] ?? 0,
          gradient: CARD_GRADIENTS[h % CARD_GRADIENTS.length]!,
          emoji: EMOJIS[h % EMOJIS.length]!,
        };
      });

      setVenues(mapped);
      setLoading(false);
    })();
  }, []);

  const countryFilterOptions = useMemo(() => [ALL_COUNTRIES, ...countriesForPicker()], []);

  const cityFilterOptions = useMemo(() => {
    if (filterCountry === ALL_COUNTRIES) return [ALL_CITIES];
    return [ALL_CITIES, ...getCitiesForCountry(filterCountry)];
  }, [filterCountry]);

  const typeOptions = useMemo(() => {
    const set = new Set<string>();
    for (const v of venues) {
      const t = v.venue_type?.trim();
      if (t) set.add(t);
    }
    return ["Any type", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [venues]);

  useEffect(() => {
    if (filterCity !== ALL_CITIES && !cityFilterOptions.includes(filterCity)) {
      setFilterCity(ALL_CITIES);
    }
  }, [filterCity, cityFilterOptions]);

  useEffect(() => {
    if (vtype !== "Any type" && !typeOptions.includes(vtype)) setVtype("Any type");
  }, [vtype, typeOptions]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return venues.filter((v) => {
      const cityStr = v.city?.trim() || "";
      if (
        filterCity !== ALL_CITIES ||
        filterCountry !== ALL_COUNTRIES
      ) {
        if (
          !rowCityMatchesFilter(
            cityStr || null,
            filterCountry,
            filterCity,
            ALL_COUNTRIES,
            ALL_CITIES,
          )
        ) {
          return false;
        }
      }
      if (vtype !== "Any type" && (v.venue_type || "").trim() !== vtype) return false;
      if (!capacityMatches(v.capacity, cap)) return false;
      if (q) {
        const hay = `${v.name} ${cityStr} ${v.venue_type || ""} ${(v.tags ?? []).join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [search, filterCountry, filterCity, vtype, cap, venues]);

  const filteredIds = useMemo(() => new Set(filtered.map((v) => v.id)), [filtered]);

  const scrollToCard = useCallback((id: string) => {
    cardRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);

  useEffect(() => {
    if (selectedId && !filteredIds.has(selectedId)) setSelectedId(null);
  }, [filteredIds, selectedId]);

  const handleVenueFromMapClick = (id: string) => {
    if (!filteredIds.has(id)) return;
    setSelectedId(id);
    scrollToCard(id);
  };

  const headerSubtitle = loading
    ? "Loading venues…"
    : venues.length === 0
      ? "No venues on Magicalive yet"
      : filtered.length === venues.length
        ? `${venues.length} venue${venues.length === 1 ? "" : "s"} hosting shows on Magicalive`
        : `${filtered.length} of ${venues.length} venues match your filters`;

  return (
    <div className="min-h-0 flex-1 bg-black pb-20 pt-8 text-zinc-100 sm:pt-12">
      <div className={`${CLASSES.section} max-w-7xl`}>
        <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--ml-gold)]">
          Where magic happens
        </p>
        <h1 className="ml-font-heading text-4xl font-semibold tracking-tight text-zinc-50 sm:text-5xl">
          Active <span className="text-[var(--ml-gold)] italic">venues</span>
        </h1>
        <p className="mt-3 text-sm text-zinc-400 sm:text-base">{headerSubtitle}</p>

        <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
              ⌕
            </span>
            <input
              type="search"
              placeholder="Search venues, cities, types…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${CLASSES.inputSearch} pl-9`}
            />
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
            <select
              className={selectClass}
              value={filterCountry}
              onChange={(e) => {
                setFilterCountry(e.target.value);
                setFilterCity(ALL_CITIES);
              }}
            >
              {countryFilterOptions.map((c) => (
                <option key={c} value={c} className="bg-zinc-900">
                  {c}
                </option>
              ))}
            </select>
            <select
              className={selectClass}
              value={filterCity}
              onChange={(e) => setFilterCity(e.target.value)}
            >
              {cityFilterOptions.map((c) => (
                <option key={c} value={c} className="bg-zinc-900">
                  {c}
                </option>
              ))}
            </select>
            <select
              className={selectClass}
              value={vtype}
              onChange={(e) => setVtype(e.target.value)}
            >
              {typeOptions.map((t) => (
                <option key={t} value={t} className="bg-zinc-900">
                  {t}
                </option>
              ))}
            </select>
            <select
              className={selectClass}
              value={cap}
              onChange={(e) => setCap(e.target.value as (typeof CAPS)[number])}
            >
              {CAPS.map((c) => (
                <option key={c} value={c} className="bg-zinc-900">
                  {c}
                </option>
              ))}
            </select>
            <span className="text-sm text-zinc-500 lg:ml-auto">
              <span className="font-semibold text-zinc-300">{filtered.length}</span>{" "}
              results
            </span>
          </div>
        </div>

        {loading ? (
          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/50"
              >
                <div className="h-32 animate-pulse bg-white/10 sm:h-36" />
                <div className="space-y-3 p-5">
                  <div className="h-6 w-2/3 animate-pulse rounded bg-white/10" />
                  <div className="h-4 w-1/2 animate-pulse rounded bg-white/10" />
                  <div className="flex gap-2">
                    <div className="h-5 w-16 animate-pulse rounded-full bg-white/10" />
                    <div className="h-5 w-20 animate-pulse rounded-full bg-white/10" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : venues.length === 0 ? (
          <div className="mt-10 flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-8 py-16 text-center">
            <p className="ml-font-heading text-xl text-zinc-300">No venues listed yet</p>
            <p className="mt-2 text-sm text-zinc-500">
              Be the first venue on Magicalive.
            </p>
            <Link href="/contact" className={`${CLASSES.btnPrimary} mt-6`}>
              Get your venue listed
            </Link>
          </div>
        ) : (
          <div className="mt-10 flex w-full flex-col">
            {/* Map — full width, horizontal */}
            <div
              className="relative mb-8 h-[280px] w-full shrink-0 overflow-hidden rounded-[3px] border-[0.5px] border-[rgba(201,168,76,0.2)] bg-[#0a090c] sm:h-[400px]"
            >
              <VenueMap
                venues={filtered}
                activeVenueId={selectedId}
                onVenueClick={handleVenueFromMapClick}
              />
            </div>

            <div className="min-w-0 w-full">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-8 py-16 text-center">
                  <p className="ml-font-heading text-xl text-zinc-300">
                    No venues match
                  </p>
                  <p className="mt-2 text-sm text-zinc-500">
                    Try widening your search or clearing filters.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setFilterCountry(ALL_COUNTRIES);
                      setFilterCity(ALL_CITIES);
                      setVtype("Any type");
                      setCap("Any capacity");
                    }}
                    className={`${CLASSES.btnPrimary} mt-6`}
                  >
                    Reset filters
                  </button>
                </div>
              ) : (
                <ul className="grid w-full max-sm:grid-cols-1 gap-4 sm:[grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
                  {filtered.map((v) => (
                    <li key={v.id} className="min-w-0">
                      <div
                        ref={(el) => {
                          cardRefs.current[v.id] = el;
                        }}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setSelectedId(v.id);
                          scrollToCard(v.id);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            setSelectedId(v.id);
                            scrollToCard(v.id);
                          }
                        }}
                        className={`cursor-pointer overflow-hidden rounded-2xl border bg-zinc-950/50 transition ${
                          selectedId === v.id
                            ? "border-[var(--ml-gold)]/60 shadow-[0_0_32px_-8px_rgba(245,204,113,0.2)]"
                            : "border-white/10 hover:border-white/20"
                        }`}
                      >
                        <div className={`h-32 bg-gradient-to-br sm:h-36 ${v.gradient}`} />
                        <div className="p-5">
                          <h2 className="ml-font-heading text-xl font-semibold text-zinc-50">
                            {v.name}
                          </h2>
                          <p className="mt-1 text-sm text-zinc-500">
                            {v.city || "—"} · {v.venue_type || "Venue"}
                          </p>
                          <p className="mt-2 text-xs text-zinc-600">
                            Capacity {(v.capacity ?? 0).toLocaleString()} · Est.{" "}
                            {v.established_year ?? "—"}
                          </p>
                          {v.description?.trim() ? (
                            <p className="mt-2 line-clamp-2 text-sm text-zinc-500">
                              {v.description.trim()}
                            </p>
                          ) : null}
                          {v.website?.trim() ? (
                            <a
                              href={
                                v.website.trim().startsWith("http")
                                  ? v.website.trim()
                                  : `https://${v.website.trim()}`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                fontSize: "11px",
                                letterSpacing: "0.08em",
                                textTransform: "uppercase",
                                color: "#c9a84c",
                                border: "0.5px solid #8a6f2e",
                                padding: "5px 12px",
                                borderRadius: "2px",
                                textDecoration: "none",
                                display: "inline-block",
                                marginTop: "8px",
                              }}
                            >
                              Visit website ↗
                            </a>
                          ) : null}
                          <div className="mt-3 flex flex-wrap gap-2">
                            {(v.tags ?? []).length ? (
                              v.tags!.map((t) => (
                                <span key={t} className={CLASSES.tag}>
                                  {t}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-zinc-600">No tags</span>
                            )}
                          </div>
                          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                            <span className="text-sm font-semibold text-emerald-400">
                              {v.upcomingShows} upcoming{" "}
                              {v.upcomingShows === 1 ? "show" : "shows"}
                            </span>
                            <Link
                              href={`/venues/${encodeURIComponent(v.id)}`}
                              onClick={(e) => e.stopPropagation()}
                              className={CLASSES.btnPrimarySm}
                            >
                              View venue
                            </Link>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
