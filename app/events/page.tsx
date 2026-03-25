"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CLASSES } from "@/lib/constants";
import { supabase } from "@/lib/supabase";

type EventRow = {
  id: string;
  name: string;
  date: string;
  time: string | null;
  venue_name: string | null;
  city: string | null;
  ticket_url: string | null;
  magician_id: string | null;
  event_type?: string | null;
  skill_level?: string | null;
  includes_workbook?: boolean | null;
  includes_props?: boolean | null;
  max_attendees?: number | null;
  is_online?: boolean | null;
  profiles: {
    id: string | null;
    display_name: string | null;
    avatar_url: string | null;
    location: string | null;
    specialty_tags?: string[] | null;
  } | null;
};

const DATE_FILTERS = ["Any date", "This week", "This month"] as const;
const LECTURE_SKILL_FILTERS = ["All levels", "Beginner", "Intermediate", "Advanced"] as const;
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
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const selectClass =
  "min-w-0 cursor-pointer rounded-2xl border border-white/10 bg-white/5 py-2.5 pl-3 pr-8 text-sm text-zinc-100 outline-none transition focus:border-[var(--ml-gold)]/50";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysAhead(dateStr: string) {
  const dt = new Date(dateStr);
  if (Number.isNaN(dt.getTime())) return 10000;
  const diff = startOfDay(dt).getTime() - startOfDay(new Date()).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "M";
  if (parts.length === 1) return parts[0]![0]!.toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

function isLecture(e: EventRow) {
  return e.event_type === "lecture";
}

function venueLine(e: EventRow) {
  if (isLecture(e) && e.is_online) return "Online";
  const parts = [e.venue_name, e.city].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Venue TBA";
}

export default function EventsPage() {
  const searchParams = useSearchParams();
  const [catalogTab, setCatalogTab] = useState<"shows" | "lectures">("shows");
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("All cities");
  const [style, setStyle] = useState("Any style");
  const [dateFilter, setDateFilter] = useState<(typeof DATE_FILTERS)[number]>("Any date");
  const [lectureSkillFilter, setLectureSkillFilter] =
    useState<(typeof LECTURE_SKILL_FILTERS)[number]>("All levels");
  const [lectureFormat, setLectureFormat] = useState<"all" | "online" | "in_person">("all");
  const [view, setView] = useState<"list" | "cards">("list");
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const c = searchParams.get("city")?.trim();
    if (c) setCity(c);
    const s = searchParams.get("style")?.trim();
    if (s) setStyle(s);
  }, [searchParams]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const today = new Date().toISOString().split("T")[0];
      let q = supabase
        .from("shows")
        .select("*, profiles(id, display_name, avatar_url, location, specialty_tags)")
        .eq("is_public", true)
        .gte("date", today)
        .order("date", { ascending: true });
      if (catalogTab === "shows") {
        q = q.or("event_type.eq.show,event_type.is.null");
      } else {
        q = q.eq("event_type", "lecture");
      }
      const { data: shows } = await q;
      setEvents((shows ?? []) as EventRow[]);
      setLoading(false);
    })();
  }, [catalogTab]);

  const cities = useMemo(() => {
    const set = new Set<string>();
    for (const e of events) {
      if (isLecture(e) && e.is_online) continue;
      if (e.city?.trim()) set.add(e.city.trim());
    }
    return ["All cities", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [events]);

  const citiesWithQuery = useMemo(() => {
    const qp = searchParams.get("city")?.trim();
    if (!qp || cities.includes(qp)) return cities;
    return ["All cities", qp, ...cities.filter((c) => c !== "All cities")];
  }, [cities, searchParams]);

  const styles = useMemo(() => {
    const set = new Set<string>(CORE_SPECIALTY_TAGS);
    for (const e of events) for (const t of e.profiles?.specialty_tags ?? []) set.add(t);
    const orderedCore = CORE_SPECIALTY_TAGS.filter((t) => set.has(t));
    const extras = Array.from(set).filter((t) => !CORE_SPECIALTY_TAGS.includes(t as (typeof CORE_SPECIALTY_TAGS)[number]));
    return ["Any style", ...orderedCore, ...extras.sort((a, b) => a.localeCompare(b))];
  }, [events]);

  const stylesWithQuery = useMemo(() => {
    const qp = searchParams.get("style")?.trim();
    if (!qp || styles.includes(qp)) return styles;
    return ["Any style", qp, ...styles.filter((s) => s !== "Any style")];
  }, [styles, searchParams]);

  const cityCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of events) {
      if (isLecture(e) && e.is_online) continue;
      const c = e.city?.trim();
      if (!c) continue;
      counts[c] = (counts[c] ?? 0) + 1;
    }
    return counts;
  }, [events]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter((e) => {
      if (catalogTab === "lectures") {
        if (lectureSkillFilter !== "All levels" && (e.skill_level || "") !== lectureSkillFilter) {
          return false;
        }
        if (lectureFormat === "online" && !e.is_online) return false;
        if (lectureFormat === "in_person" && e.is_online) return false;
      }
      if (city !== "All cities") {
        if (isLecture(e) && e.is_online) return false;
        if ((e.city || "").toLowerCase() !== city.toLowerCase()) return false;
      }
      if (style !== "Any style" && !(e.profiles?.specialty_tags ?? []).some((t) => t.toLowerCase() === style.toLowerCase())) {
        return false;
      }
      const ahead = daysAhead(e.date);
      if (dateFilter === "This week" && (ahead < 0 || ahead > 7)) return false;
      if (dateFilter === "This month" && (ahead < 0 || ahead > 30)) return false;
      if (q) {
        const hay = `${e.name} ${e.venue_name || ""} ${e.city || ""} ${e.profiles?.display_name || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [events, search, city, style, dateFilter, catalogTab, lectureSkillFilter, lectureFormat]);

  const grouped = useMemo(() => {
    const out: Record<"thisWeek" | "thisMonth" | "future", EventRow[]> = { thisWeek: [], thisMonth: [], future: [] };
    for (const e of filtered) {
      const ahead = daysAhead(e.date);
      if (ahead <= 7) out.thisWeek.push(e);
      else if (ahead <= 30) out.thisMonth.push(e);
      else out.future.push(e);
    }
    return out;
  }, [filtered]);

  const unit = catalogTab === "lectures" ? "lecture" : "show";
  const unitPlural = catalogTab === "lectures" ? "lectures" : "shows";

  const renderLectureBadges = (e: EventRow) => (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      {e.is_online ? (
        <span className="rounded-full border border-sky-500/35 bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-200">
          Online
        </span>
      ) : (
        <span className="rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-200">
          In person
        </span>
      )}
      {e.skill_level ? (
        <span className="rounded-full border border-violet-400/35 bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold text-violet-100">
          {e.skill_level}
        </span>
      ) : null}
      {e.max_attendees != null && e.max_attendees > 0 ? (
        <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] text-zinc-400">
          Max {e.max_attendees}
        </span>
      ) : null}
      {e.includes_workbook ? (
        <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-100">
          Workbook
        </span>
      ) : null}
      {e.includes_props ? (
        <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-100">
          Props
        </span>
      ) : null}
    </div>
  );

  const ticketLabel = (e: EventRow) => (isLecture(e) ? "Register" : "Tickets");

  return (
    <div className="min-h-0 flex-1 bg-black pb-20 pt-8 text-zinc-100 sm:pt-12">
      <div className={`${CLASSES.section} max-w-7xl`}>
        <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--ml-gold)]">What&apos;s on</p>
        <h1 className="ml-font-heading text-4xl font-semibold tracking-tight text-zinc-50 sm:text-5xl">
          Upcoming <span className="text-[var(--ml-gold)] italic">events</span>
        </h1>
        <p className="mt-3 text-sm text-zinc-400 sm:text-base">
          {loading
            ? "Loading events…"
            : `${filtered.length} ${filtered.length === 1 ? unit : unitPlural} on the calendar`}
        </p>

        <div className="mt-6 flex gap-2 border-b border-white/10">
          <button
            type="button"
            onClick={() => {
              setCatalogTab("shows");
              setCity("All cities");
            }}
            className={`border-b-2 px-4 py-3 text-sm font-semibold transition ${
              catalogTab === "shows"
                ? "border-[var(--ml-gold)] text-[var(--ml-gold)]"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Shows
          </button>
          <button
            type="button"
            onClick={() => {
              setCatalogTab("lectures");
              setCity("All cities");
            }}
            className={`border-b-2 px-4 py-3 text-sm font-semibold transition ${
              catalogTab === "lectures"
                ? "border-violet-400 text-violet-200"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Lectures
          </button>
        </div>

        <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">⌕</span>
            <input
              type="search"
              placeholder="Search events, venues, cities…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${CLASSES.inputSearch} pl-9`}
            />
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:gap-4">
            <select className={selectClass} value={city} onChange={(e) => setCity(e.target.value)}>
              {citiesWithQuery.map((c) => (
                <option key={c} value={c} className="bg-zinc-900">
                  {c}
                </option>
              ))}
            </select>
            <select className={selectClass} value={style} onChange={(e) => setStyle(e.target.value)}>
              {stylesWithQuery.map((s) => (
                <option key={s} value={s} className="bg-zinc-900">
                  {s}
                </option>
              ))}
            </select>
            <select className={selectClass} value={dateFilter} onChange={(e) => setDateFilter(e.target.value as (typeof DATE_FILTERS)[number])}>
              {DATE_FILTERS.map((d) => (
                <option key={d} value={d} className="bg-zinc-900">
                  {d}
                </option>
              ))}
            </select>
            {catalogTab === "lectures" ? (
              <>
                <select
                  className={selectClass}
                  value={lectureSkillFilter}
                  onChange={(e) => setLectureSkillFilter(e.target.value as (typeof LECTURE_SKILL_FILTERS)[number])}
                >
                  {LECTURE_SKILL_FILTERS.map((d) => (
                    <option key={d} value={d} className="bg-zinc-900">
                      {d === "All levels" ? "Skill: All levels" : `Skill: ${d}`}
                    </option>
                  ))}
                </select>
                <div className="flex rounded-xl border border-white/10 p-0.5">
                  <button
                    type="button"
                    onClick={() => setLectureFormat("all")}
                    className={`rounded-lg px-3 py-2 text-[11px] font-semibold uppercase tracking-wider transition ${
                      lectureFormat === "all" ? "bg-violet-500/25 text-violet-100" : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setLectureFormat("online")}
                    className={`rounded-lg px-3 py-2 text-[11px] font-semibold uppercase tracking-wider transition ${
                      lectureFormat === "online" ? "bg-sky-500/25 text-sky-100" : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    Online
                  </button>
                  <button
                    type="button"
                    onClick={() => setLectureFormat("in_person")}
                    className={`rounded-lg px-3 py-2 text-[11px] font-semibold uppercase tracking-wider transition ${
                      lectureFormat === "in_person" ? "bg-emerald-500/20 text-emerald-100" : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    In person
                  </button>
                </div>
              </>
            ) : null}
            <div className="flex flex-1 flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3 lg:border-t-0 lg:pt-0">
              <span className="text-sm text-zinc-400">
                <span className="font-semibold text-zinc-200">{filtered.length}</span> results
              </span>
              <div className="flex rounded-xl border border-white/10 p-0.5">
                <button
                  type="button"
                  onClick={() => setView("list")}
                  className={`rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wider transition ${view === "list" ? "bg-[var(--ml-gold)] text-black" : "text-zinc-500 hover:text-zinc-300"}`}
                >
                  List
                </button>
                <button
                  type="button"
                  onClick={() => setView("cards")}
                  className={`rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wider transition ${view === "cards" ? "bg-[var(--ml-gold)] text-black" : "text-zinc-500 hover:text-zinc-300"}`}
                >
                  Cards
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-10 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1">
            {!loading && events.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/15 bg-white/[0.02] px-8 py-20 text-center">
                <p className="ml-font-heading text-2xl text-zinc-200">
                  {catalogTab === "lectures" ? "No public lectures yet" : "No public shows yet"}
                </p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/15 bg-white/[0.02] px-8 py-20 text-center">
                <p className="ml-font-heading text-2xl text-zinc-200">No events match</p>
              </div>
            ) : view === "list" ? (
              <div className="space-y-12">
                {(["thisWeek", "thisMonth", "future"] as const).map((key) => {
                  const items = grouped[key];
                  if (!items.length) return null;
                  const label = key === "thisWeek" ? "This week" : key === "thisMonth" ? "This month" : "Future";
                  return (
                    <section key={key}>
                      <div className="mb-4 flex items-center gap-4">
                        <h2 className="shrink-0 ml-font-heading text-xl font-semibold text-zinc-100">{label}</h2>
                        <div className="h-px flex-1 bg-white/10" />
                        <span className="shrink-0 text-sm text-zinc-500">
                          {items.length} {items.length === 1 ? unit : unitPlural}
                        </span>
                      </div>
                      <ul className="divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/[0.02]">
                        {items.map((e) => {
                          const d = new Date(e.date);
                          const ticketLink = e.ticket_url?.trim() || null;
                          const lecture = isLecture(e);
                          return (
                            <li
                              key={e.id}
                              className={`flex flex-col gap-4 px-4 py-4 transition hover:bg-white/[0.03] sm:flex-row sm:items-center sm:gap-6 sm:px-5 ${
                                lecture ? "border-l-2 border-l-violet-500/50" : ""
                              }`}
                            >
                              <div className="flex w-full shrink-0 gap-4 sm:w-36">
                                <div
                                  className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl border bg-white/[0.04] ${
                                    lecture
                                      ? "border-violet-400/35 text-violet-200"
                                      : "border-[var(--ml-gold)]/25 bg-[var(--ml-gold)]/10"
                                  }`}
                                >
                                  <span
                                    className={`ml-font-heading text-xl font-semibold ${lecture ? "text-violet-200" : "text-[var(--ml-gold)]"}`}
                                  >
                                    {d.getDate()}
                                  </span>
                                  <span
                                    className={`text-[10px] font-medium uppercase tracking-wider ${lecture ? "text-violet-300/80" : "text-zinc-500"}`}
                                  >
                                    {MONTH_NAMES[d.getMonth()]}
                                  </span>
                                </div>
                                <div className="min-w-0 flex-1 sm:hidden">
                                  <Link
                                    href={`/events/${encodeURIComponent(e.id)}`}
                                    className="ml-font-heading text-lg font-semibold text-zinc-100 transition hover:underline"
                                  >
                                    {e.name}
                                  </Link>
                                  <p className="text-sm text-zinc-500">{venueLine(e)}</p>
                                  {lecture ? renderLectureBadges(e) : null}
                                  <div className="mt-1 flex items-center gap-2 text-xs text-[var(--ml-gold)]/75">
                                    <span className="inline-flex h-5 w-5 items-center justify-center overflow-hidden rounded-full border border-[var(--ml-gold)]/25 bg-white/5 text-[10px] text-zinc-200">
                                      {e.profiles?.avatar_url ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={e.profiles.avatar_url} alt="" className="h-full w-full object-cover" />
                                      ) : (
                                        initials(e.profiles?.display_name || "Magician")
                                      )}
                                    </span>
                                    {e.magician_id || e.profiles?.id ? (
                                      <Link
                                        href={`/profile/magician?id=${encodeURIComponent(String(e.magician_id || e.profiles?.id))}`}
                                        className="transition hover:underline"
                                      >
                                        {e.profiles?.display_name || "Magician"}
                                      </Link>
                                    ) : (
                                      <span>{e.profiles?.display_name || "Magician"}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="min-w-0 flex-1 max-sm:hidden">
                                <Link
                                  href={`/events/${encodeURIComponent(e.id)}`}
                                  className="ml-font-heading text-lg font-semibold text-zinc-100 transition hover:underline"
                                >
                                  {e.name}
                                </Link>
                                <p className="mt-0.5 text-sm text-zinc-400">{venueLine(e)}</p>
                                {lecture ? renderLectureBadges(e) : null}
                                <div className="mt-1 flex items-center gap-2 text-xs text-[var(--ml-gold)]/75">
                                  <span className="inline-flex h-5 w-5 items-center justify-center overflow-hidden rounded-full border border-[var(--ml-gold)]/25 bg-white/5 text-[10px] text-zinc-200">
                                    {e.profiles?.avatar_url ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img src={e.profiles.avatar_url} alt="" className="h-full w-full object-cover" />
                                    ) : (
                                      initials(e.profiles?.display_name || "Magician")
                                    )}
                                  </span>
                                  {e.magician_id || e.profiles?.id ? (
                                    <Link
                                      href={`/profile/magician?id=${encodeURIComponent(String(e.magician_id || e.profiles?.id))}`}
                                      className="transition hover:underline"
                                    >
                                      {e.profiles?.display_name || "Magician"}
                                    </Link>
                                  ) : (
                                    <span>{e.profiles?.display_name || "Magician"}</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end sm:gap-2">
                                <span className="text-sm text-zinc-500">{e.time || "TBA"}</span>
                                {ticketLink ? (
                                  <a href={ticketLink} target="_blank" rel="noopener noreferrer" className={CLASSES.btnPrimarySm}>
                                    {ticketLabel(e)}
                                  </a>
                                ) : (
                                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                                    Free / enquire
                                  </span>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((e) => {
                  const d = new Date(e.date);
                  const ticketLink = e.ticket_url?.trim() || null;
                  const lecture = isLecture(e);
                  return (
                    <article
                      key={e.id}
                      className={`overflow-hidden rounded-2xl border bg-zinc-950/50 transition ${
                        lecture ? "border-violet-500/30 hover:border-violet-400/45" : "border-white/10 hover:border-[var(--ml-gold)]/30"
                      }`}
                    >
                      <div
                        className={`relative h-36 ${
                          lecture
                            ? "bg-gradient-to-br from-violet-950 via-indigo-950 to-black"
                            : "bg-gradient-to-br from-violet-950 via-purple-900/90 to-indigo-950"
                        }`}
                      >
                        <div className="absolute left-3 top-3 rounded-lg border border-white/20 bg-black/40 px-2.5 py-1.5 text-center backdrop-blur-sm">
                          <div
                            className={`ml-font-heading text-lg font-semibold ${lecture ? "text-violet-200" : "text-[var(--ml-gold)]"}`}
                          >
                            {d.getDate()}
                          </div>
                          <div className="text-[9px] font-medium uppercase tracking-wider text-zinc-300">{MONTH_NAMES[d.getMonth()]}</div>
                        </div>
                      </div>
                      <div className="p-4">
                        <Link
                          href={`/events/${encodeURIComponent(e.id)}`}
                          className="ml-font-heading text-lg font-semibold text-zinc-100 transition hover:underline"
                        >
                          {e.name}
                        </Link>
                        <p className="mt-1 text-sm text-zinc-500">{venueLine(e)}</p>
                        {lecture ? renderLectureBadges(e) : null}
                        <div className="mt-2 flex items-center gap-2 text-xs text-[var(--ml-gold)]/75">
                          <span className="inline-flex h-5 w-5 items-center justify-center overflow-hidden rounded-full border border-[var(--ml-gold)]/25 bg-white/5 text-[10px] text-zinc-200">
                            {e.profiles?.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={e.profiles.avatar_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              initials(e.profiles?.display_name || "Magician")
                            )}
                          </span>
                          {e.magician_id || e.profiles?.id ? (
                            <Link
                              href={`/profile/magician?id=${encodeURIComponent(String(e.magician_id || e.profiles?.id))}`}
                              className="transition hover:underline"
                            >
                              {e.profiles?.display_name || "Magician"}
                            </Link>
                          ) : (
                            <span>{e.profiles?.display_name || "Magician"}</span>
                          )}
                          <span className="text-zinc-600">· {e.time || "TBA"}</span>
                        </div>
                        {ticketLink ? (
                          <a
                            href={ticketLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`${CLASSES.btnPrimarySm} mt-3 inline-flex`}
                          >
                            {ticketLabel(e)}
                          </a>
                        ) : (
                          <span className="mt-3 inline-flex rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                            Free / enquire
                          </span>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          <aside className="w-full shrink-0 space-y-8 lg:w-80">
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Browse by city</h3>
              <ul className="rounded-2xl border border-white/10 bg-white/[0.03] p-2">
                {cities.filter((c) => c !== "All cities").map((c) => (
                  <li key={c}>
                    <button
                      type="button"
                      onClick={() => setCity((prev) => (prev === c ? "All cities" : c))}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition ${city === c ? "bg-[var(--ml-gold)]/10 text-[var(--ml-gold)]" : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"}`}
                    >
                      <span>{c}</span>
                      <span className="text-xs text-zinc-500">{cityCounts[c] ?? 0}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <Link href="/magicians" className={CLASSES.btnSecondary}>
              Browse magicians
            </Link>
          </aside>
        </div>
      </div>
    </div>
  );
}
