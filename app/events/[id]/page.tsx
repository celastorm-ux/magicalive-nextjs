"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CLASSES } from "@/lib/constants";
import { supabase } from "@/lib/supabase";

type ShowWithMagician = {
  id: string;
  name: string;
  date: string | null;
  time: string | null;
  venue_name: string | null;
  venue_id: string | null;
  city: string | null;
  state: string | null;
  ticket_url: string | null;
  magician_id: string | null;
  description?: string | null;
  short_description?: string | null;
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
    banner_url: string | null;
    location: string | null;
    specialty_tags: string[] | null;
    rating: number | null;
    review_count: number | null;
    short_bio: string | null;
  } | null;
};

type ReviewItem = {
  id: string;
  reviewer_name: string | null;
  reviewer_display_name: string | null;
  rating: number | null;
  body: string | null;
  created_at: string | null;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "M";
  if (parts.length === 1) return parts[0]![0]!.toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

function formatLongDate(dateStr: string | null) {
  if (!dateStr) return "Date TBA";
  const dt = new Date(dateStr);
  if (Number.isNaN(dt.getTime())) return "Date TBA";
  return dt.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function createIcs(show: ShowWithMagician) {
  if (!show.date) return null;
  const start = new Date(`${show.date}T${show.time || "20:00"}:00`);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const loc =
    show.event_type === "lecture" && show.is_online
      ? "Online"
      : [show.venue_name, show.city, show.state].filter(Boolean).join(", ");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Magicalive//Event//EN",
    "BEGIN:VEVENT",
    `UID:${show.id}@magicalive`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${show.name}`,
    `LOCATION:${loc}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}

export default function EventDetailPage() {
  const params = useParams<{ id: string | string[] }>();
  const rawId = params?.id;
  const eventId = Array.isArray(rawId) ? (rawId[0] ?? "") : (rawId ?? "");
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<ShowWithMagician | null>(null);
  const [moreByMagician, setMoreByMagician] = useState<ShowWithMagician[]>([]);
  const [youMightLike, setYouMightLike] = useState<ShowWithMagician[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!eventId) {
      setLoading(false);
      return;
    }
    void (async () => {
      setLoading(true);
      console.log("Fetching show with id:", eventId);
      const { data, error } = await supabase
        .from("shows")
        .select(
          "*, profiles(id, display_name, avatar_url, banner_url, location, specialty_tags, rating, review_count, short_bio)",
        )
        .eq("id", eventId)
        .single();
      console.log("Show result:", data, error);

      const current = (!error ? (data as ShowWithMagician | null) : null) ?? null;
      setEvent(current);

      if (!current) {
        setLoading(false);
        return;
      }

      if (current.magician_id) {
        const today = new Date().toISOString().split("T")[0];
        const { data: more } = await supabase
          .from("shows")
          .select(
            "*, profiles(id, display_name, avatar_url, banner_url, location, specialty_tags, rating, review_count, short_bio)",
          )
          .eq("magician_id", current.magician_id)
          .gte("date", today)
          .neq("id", current.id)
          .order("date", { ascending: true })
          .limit(3);
        setMoreByMagician((more ?? []) as ShowWithMagician[]);

        const { data: other } = await supabase
          .from("shows")
          .select(
            "*, profiles(id, display_name, avatar_url, banner_url, location, specialty_tags, rating, review_count, short_bio)",
          )
          .neq("magician_id", current.magician_id)
          .gte("date", today)
          .order("date", { ascending: true })
          .limit(3);
        setYouMightLike((other ?? []) as ShowWithMagician[]);

        const { data: rv } = await supabase
          .from("reviews")
          .select("id, reviewer_name, reviewer_display_name, rating, body, created_at")
          .eq("magician_id", current.magician_id)
          .order("created_at", { ascending: false })
          .limit(3);
        setReviews((rv ?? []) as ReviewItem[]);
      }

      setLoading(false);
    })();
  }, [eventId]);

  const eventDate = useMemo(() => formatLongDate(event?.date ?? null), [event?.date]);
  const magicianName = event?.profiles?.display_name?.trim() || "Magician";
  const aboutShow =
    event?.description?.trim() ||
    event?.short_description?.trim() ||
    `An evening with ${magicianName}`;
  const ticketLink = event?.ticket_url?.trim() || null;
  const isLecture = event?.event_type === "lecture";
  const maxAtt = event?.max_attendees != null && event.max_attendees > 0 ? event.max_attendees : null;

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black text-zinc-500">
        <span className="inline-block size-10 animate-spin rounded-full border-2 border-[var(--ml-gold)]/30 border-t-[var(--ml-gold)]" />
        <p className="text-sm">Loading event…</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-zinc-400">
        Event not found
      </div>
    );
  }

  const onCopyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const onAddCalendar = () => {
    const ics = createIcs(event);
    if (!ics) return;
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${event.name.replace(/\s+/g, "-").toLowerCase()}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-black pb-20 text-zinc-100">
      <div className="relative h-64 sm:h-80 md:h-96">
        {event.profiles?.banner_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.profiles.banner_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-violet-950 via-purple-900/90 to-indigo-950" />
        )}
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(-35deg,transparent,transparent 8px,rgba(255,255,255,0.06) 8px,rgba(255,255,255,0.06) 9px)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-black" />
        <div className={`${CLASSES.section} relative flex h-full max-w-6xl items-end pb-8`}>
          <div>
            {isLecture ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-violet-400/40 bg-violet-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-violet-200">
                  Lecture
                </span>
                {event.skill_level ? (
                  <span className="rounded-full border border-violet-300/35 bg-violet-950/60 px-3 py-1 text-xs font-semibold text-violet-100">
                    {event.skill_level}
                  </span>
                ) : null}
                {event.is_online ? (
                  <span className="rounded-full border border-sky-500/35 bg-sky-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-sky-200">
                    Online
                  </span>
                ) : (
                  <span className="rounded-full border border-emerald-500/35 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-200">
                    In person
                  </span>
                )}
              </div>
            ) : null}
            <p className={`text-xs uppercase tracking-wider text-[var(--ml-gold)]/80 ${isLecture ? "mt-3" : ""}`}>
              {eventDate} {event.time ? `· ${event.time}` : ""}
            </p>
            <h1 className="mt-2 ml-font-heading text-4xl font-semibold text-zinc-50 sm:text-5xl">
              {event.name}
            </h1>
            <p className="mt-2 text-sm text-zinc-300">
              {isLecture && event.is_online ? (
                "Online session"
              ) : event.venue_id && event.venue_name ? (
                <>
                  <Link
                    href={`/venues/${encodeURIComponent(event.venue_id)}`}
                    className="text-[var(--ml-gold)]/90 transition hover:text-[var(--ml-gold)] hover:underline"
                  >
                    {event.venue_name}
                  </Link>
                  {(event.city || event.state) && (
                    <span>
                      {" "}
                      · {[event.city, event.state].filter(Boolean).join(", ")}
                    </span>
                  )}
                </>
              ) : (
                [event.venue_name, event.city, event.state].filter(Boolean).join(" · ") || "Venue TBA"
              )}
            </p>
          </div>
        </div>
      </div>

      <div className={`${CLASSES.section} mt-8 grid max-w-6xl gap-8 lg:grid-cols-[1.5fr_0.8fr]`}>
        <div className="space-y-6">
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="ml-font-heading text-xl font-semibold text-zinc-100">
              {isLecture ? "Lecture details" : "Event details"}
            </h2>
            <div className="mt-4 space-y-1 text-sm text-zinc-400">
              <p>{eventDate}</p>
              <p>{event.time || "Time TBA"}</p>
              {isLecture && event.is_online ? (
                <p className="text-sky-200/90">Online</p>
              ) : (
                <>
                  <p>
                    {event.venue_id && event.venue_name ? (
                      <Link
                        href={`/venues/${encodeURIComponent(event.venue_id)}`}
                        className="text-[var(--ml-gold)]/90 transition hover:text-[var(--ml-gold)] hover:underline"
                      >
                        {event.venue_name}
                      </Link>
                    ) : (
                      event.venue_name || "Venue TBA"
                    )}
                  </p>
                  <p>{[event.city, event.state].filter(Boolean).join(", ") || "Location TBA"}</p>
                </>
              )}
            </div>
            {isLecture ? (
              <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-4">
                {event.skill_level ? (
                  <span className="rounded-full border border-violet-400/40 bg-violet-950/50 px-3 py-1 text-xs font-semibold text-violet-100">
                    {event.skill_level}
                  </span>
                ) : null}
                {maxAtt != null ? (
                  <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-zinc-300">
                    Up to {maxAtt} spots
                  </span>
                ) : null}
                {event.is_online ? (
                  <span className="rounded-full border border-sky-500/35 px-3 py-1 text-xs text-sky-200">Online</span>
                ) : (
                  <span className="rounded-full border border-emerald-500/35 px-3 py-1 text-xs text-emerald-200">
                    In person
                  </span>
                )}
                {event.includes_workbook ? (
                  <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs text-amber-100">
                    Workbook included
                  </span>
                ) : null}
                {event.includes_props ? (
                  <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs text-amber-100">
                    Props included
                  </span>
                ) : null}
              </div>
            ) : null}
            <div className="mt-5 flex flex-wrap gap-3">
              {ticketLink ? (
                <a
                  href={ticketLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center rounded-xl bg-[var(--ml-gold)] px-5 py-3 text-sm font-semibold text-black transition hover:brightness-95 sm:w-auto"
                >
                  {isLecture ? "Register for lecture" : "Get tickets"}
                </a>
              ) : (
                <p className="text-sm text-zinc-500">
                  {isLecture
                    ? "No registration link yet — contact the presenter"
                    : "No ticket link provided — contact the magician directly"}{" "}
                  {event.magician_id ? (
                    <Link
                      href={`/profile/magician?id=${encodeURIComponent(event.magician_id)}`}
                      className="text-[var(--ml-gold)]/80 transition hover:underline"
                    >
                      here
                    </Link>
                  ) : null}
                </p>
              )}
              <button type="button" onClick={onAddCalendar} className={CLASSES.btnSecondary}>
                Add to calendar
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="ml-font-heading text-xl font-semibold text-zinc-100">
              {isLecture ? "About this lecture" : "About this show"}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">{aboutShow}</p>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="ml-font-heading text-xl font-semibold text-zinc-100">About the magician</h2>
            <div className="mt-4 flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-gradient-to-br from-violet-900 to-indigo-950 text-lg font-semibold">
                {event.profiles?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={event.profiles.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  initials(magicianName)
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="ml-font-heading text-2xl text-zinc-100">{magicianName}</p>
                <p className="mt-1 text-sm text-zinc-500">{event.profiles?.location || "Location not set"}</p>
                <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
                  <span className="text-[var(--ml-gold)]">★</span>
                  <span>{Number(event.profiles?.rating ?? 0).toFixed(1)}</span>
                  <span>({Number(event.profiles?.review_count ?? 0)} reviews)</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(event.profiles?.specialty_tags ?? []).slice(0, 6).map((tag) => (
                    <Link
                      key={tag}
                      href={`/magicians?style=${encodeURIComponent(tag)}`}
                      className={`${CLASSES.tag} transition hover:border-[var(--ml-gold)]/45 hover:bg-[var(--ml-gold)]/10`}
                    >
                      {tag}
                    </Link>
                  ))}
                </div>
                <p className="mt-3 text-sm text-zinc-400">
                  {event.profiles?.short_bio?.trim() || `Performer profile for ${magicianName}.`}
                </p>
                {event.magician_id ? (
                  <Link href={`/profile/magician?id=${encodeURIComponent(event.magician_id)}`} className="mt-4 inline-flex text-sm text-[var(--ml-gold)]/80 transition hover:underline">
                    View full profile →
                  </Link>
                ) : null}
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--ml-gold)]">Share this event</h3>
            <button type="button" onClick={() => void onCopyLink()} className={`${CLASSES.btnSecondary} mt-3 w-full justify-center`}>
              {copied ? "Link copied" : "Copy link"}
            </button>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--ml-gold)]">More shows by this magician</h3>
            <ul className="mt-3 space-y-3">
              {moreByMagician.length ? (
                moreByMagician.map((s) => (
                  <li key={s.id}>
                    <Link href={`/events/${encodeURIComponent(s.id)}`} className="block rounded-lg border border-white/10 bg-black/30 px-3 py-2 transition hover:border-[var(--ml-gold)]/30">
                      <p className="text-sm font-semibold text-zinc-100">{s.name}</p>
                      <p className="mt-0.5 text-xs text-zinc-500">{s.date ? new Date(s.date).toLocaleDateString() : "Date TBA"}</p>
                    </Link>
                  </li>
                ))
              ) : (
                <li className="text-sm text-zinc-600">No other upcoming shows.</li>
              )}
            </ul>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--ml-gold)]">You might also like</h3>
            <ul className="mt-3 space-y-3">
              {youMightLike.length ? (
                youMightLike.map((s) => (
                  <li key={s.id}>
                    <Link href={`/events/${encodeURIComponent(s.id)}`} className="block rounded-lg border border-white/10 bg-black/30 px-3 py-2 transition hover:border-[var(--ml-gold)]/30">
                      <p className="text-sm font-semibold text-zinc-100">{s.name}</p>
                      <p className="mt-0.5 text-xs text-zinc-500">{s.profiles?.display_name || "Magician"}</p>
                    </Link>
                  </li>
                ))
              ) : (
                <li className="text-sm text-zinc-600">No suggestions yet.</li>
              )}
            </ul>
          </section>
        </aside>
      </div>

      <section className={`${CLASSES.section} mt-8 max-w-6xl`}>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="ml-font-heading text-xl font-semibold text-zinc-100">Reviews of this magician</h2>
            {event.magician_id ? (
              <Link href={`/profile/magician?id=${encodeURIComponent(event.magician_id)}`} className="text-sm text-[var(--ml-gold)]/80 transition hover:underline">
                See all
              </Link>
            ) : null}
          </div>
          <div className="mt-4 space-y-4">
            {reviews.length ? (
              reviews.map((r) => (
                <article key={r.id} className="rounded-xl border border-white/10 bg-black/30 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-zinc-200">
                      {r.reviewer_display_name || r.reviewer_name || "Anonymous"}
                    </p>
                    <div className="flex items-center gap-1 text-[var(--ml-gold)]">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} className={i < Number(r.rating ?? 0) ? "" : "opacity-25"}>
                          ★
                        </span>
                      ))}
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-zinc-600">
                    {r.created_at ? new Date(r.created_at).toLocaleDateString() : ""}
                  </p>
                  <p className="mt-3 text-sm text-zinc-400">{r.body || "—"}</p>
                </article>
              ))
            ) : (
              <p className="text-sm text-zinc-600">No reviews yet.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

