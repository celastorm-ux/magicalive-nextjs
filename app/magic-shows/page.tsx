import Link from "next/link";
import type { Metadata } from "next";
import { CLASSES } from "@/lib/constants";
import { buildMetadata } from "@/lib/seo";
import { parseShowYmd, todayYmdLocal } from "@/lib/show-dates";
import { formatTime } from "@/lib/utils";
import { getRouteSupabase } from "@/lib/supabase-route";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Magic Shows Near Me — Find Live Magic Shows | Magicalive",
    description:
      "Discover upcoming magic shows, close-up performances and mentalism events near you. Find tickets and book your seats.",
  });
}

const BROWSE_CITIES = [
  "Los Angeles",
  "New York",
  "Chicago",
  "Las Vegas",
  "Seattle",
  "Nashville",
  "Hollywood",
  "San Francisco",
  "Boston",
  "Philadelphia",
] as const;

const SHOW_STYLE_BLOCKS: Array<{ title: string; description: string; href: string }> = [
  {
    title: "Close-up magic shows",
    description:
      "Intimate miracles inches from the audience — cards, coins, and mentalism ideal for lounges, private rooms, and cocktail hours.",
    href: "/events?style=Close-up%20magic",
  },
  {
    title: "Stage illusions",
    description:
      "Large-scale magic built for theaters and ballrooms — illusions, production, and routines designed for the whole room.",
    href: "/events?style=Stage%20illusions",
  },
  {
    title: "Mentalism shows",
    description:
      "Mind-reading, predictions, and psychological illusion — perfect for corporate nights and theater-style runs.",
    href: "/events?style=Mentalism",
  },
  {
    title: "Comedy magic",
    description:
      "Laughter-first magic that keeps energy high for mixed audiences and celebrations.",
    href: "/events?style=Comedy%20magic",
  },
  {
    title: "Escape artistry",
    description:
      "Houdini-style escapes and stunt presentations for variety bills and special events.",
    href: "/events?style=Escape%20artistry",
  },
];

const FAQ_ITEMS: Array<{ q: string; a: string }> = [
  {
    q: "Where can I find magic shows near me?",
    a: "Magicalive lists upcoming magic shows across the US. Enter your city to see performances near you.",
  },
  {
    q: "How much do magic show tickets cost?",
    a: "Ticket prices vary from free to $200+ depending on the performer and venue. Intimate close-up shows typically cost $50–150. Grand stage productions can cost more.",
  },
  {
    q: "What should I expect at a magic show?",
    a: "Most magic shows last 45–90 minutes. Close-up shows are intimate with 10–50 people. Stage shows can have hundreds of audience members. Dress codes vary by venue.",
  },
];

type ShowRow = {
  id: string;
  name: string | null;
  date: string;
  time: string | null;
  venue_name: string | null;
  city: string | null;
  ticket_url: string | null;
  profiles: { display_name: string | null } | null;
};

function normalizeShowRow(raw: {
  id: string;
  name: string | null;
  date: string;
  time: string | null;
  venue_name: string | null;
  city: string | null;
  ticket_url: string | null;
  profiles: { display_name: string | null } | { display_name: string | null }[] | null;
}): ShowRow {
  const p = raw.profiles;
  const prof = Array.isArray(p) ? (p[0] ?? null) : p;
  return {
    id: raw.id,
    name: raw.name,
    date: raw.date,
    time: raw.time,
    venue_name: raw.venue_name,
    city: raw.city,
    ticket_url: raw.ticket_url,
    profiles: prof,
  };
}

function formatShowDate(ymd: string) {
  const p = parseShowYmd(ymd);
  if (!p) return ymd;
  return new Date(p.y, p.m - 1, p.d).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function MagicShowsPage() {
  const db = await getRouteSupabase();
  const todayStr = todayYmdLocal();
  const t = new Date();
  const weekEndCal = new Date(t.getFullYear(), t.getMonth(), t.getDate() + 7);
  const weekEndStr = `${weekEndCal.getFullYear()}-${String(weekEndCal.getMonth() + 1).padStart(2, "0")}-${String(weekEndCal.getDate()).padStart(2, "0")}`;

  const { data: rawShows } = await db
    .from("shows")
    .select("id, name, date, time, venue_name, city, ticket_url, profiles(display_name)")
    .eq("is_public", true)
    .eq("is_cancelled", false)
    .gte("date", todayStr)
    .lte("date", weekEndStr)
    .or("event_type.eq.show,event_type.is.null")
    .order("date", { ascending: true })
    .limit(6);

  const weekShows = (rawShows ?? []).map((r) => normalizeShowRow(r as Parameters<typeof normalizeShowRow>[0]));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Magic Shows Near Me — Magicalive",
    description: "Discover upcoming magic shows and live performances.",
    mainEntity: {
      "@type": "FAQPage",
      mainEntity: FAQ_ITEMS.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    },
  };

  return (
    <div className="min-h-dvh bg-black pb-20 pt-10 text-zinc-100 sm:pt-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className={`${CLASSES.section} max-w-5xl`}>
        <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--ml-gold)]">
          Live magic
        </p>
        <h1 className="ml-font-heading text-4xl font-semibold tracking-tight text-zinc-50 sm:text-5xl">
          Find Magic Shows Near You
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg">
          Upcoming performances from professional magicians across the US — from intimate close-up shows to grand stage
          illusions.
        </p>

        <form
          action="/events"
          method="get"
          className="mt-8 flex max-w-xl flex-col gap-3 sm:flex-row sm:items-stretch"
        >
          <label htmlFor="magic-shows-city" className="sr-only">
            City
          </label>
          <input
            id="magic-shows-city"
            name="city"
            type="text"
            placeholder="Enter your city…"
            className={`${CLASSES.inputSearch} min-h-[48px] flex-1`}
          />
          <button type="submit" className={`${CLASSES.btnPrimary} shrink-0`}>
            See events
          </button>
        </form>

        <section className="mt-16">
          <h2 className={CLASSES.headingSection}>This week&apos;s shows</h2>
          <p className="mt-2 text-sm text-zinc-500">Public listings starting in the next seven days.</p>
          <div className="mt-8 space-y-4">
            {weekShows.length ? (
              weekShows.map((s) => {
                const venueLine = [s.venue_name, s.city].filter(Boolean).join(" · ") || "Venue TBA";
                const performer = s.profiles?.display_name?.trim() || "Magician";
                return (
                  <article
                    key={s.id}
                    className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-[var(--ml-gold)]">
                        {formatShowDate(s.date)}
                        {s.time?.trim() ? ` · ${formatTime(s.time.trim())}` : ""}
                      </p>
                      <h3 className="mt-1 ml-font-heading text-lg font-semibold text-zinc-50">
                        {s.name?.trim() || "Show"}
                      </h3>
                      <p className="mt-1 text-sm text-zinc-400">{venueLine}</p>
                      <p className="mt-1 text-xs text-zinc-500">Featuring {performer}</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Link
                        href={`/events/${encodeURIComponent(s.id)}`}
                        className={CLASSES.btnSecondarySm}
                      >
                        Details
                      </Link>
                      {s.ticket_url?.trim() ? (
                        <a
                          href={s.ticket_url.trim()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={CLASSES.btnPrimarySm}
                        >
                          Tickets
                        </a>
                      ) : (
                        <Link href={`/events/${encodeURIComponent(s.id)}`} className={CLASSES.btnPrimarySm}>
                          Tickets
                        </Link>
                      )}
                    </div>
                  </article>
                );
              })
            ) : (
              <p className="text-sm text-zinc-500">
                No public shows in the next week yet — browse the full calendar for more dates.
              </p>
            )}
          </div>
        </section>

        <section className="mt-20">
          <h2 className={CLASSES.headingSection}>Browse by city</h2>
          <div className="mt-6 flex flex-wrap gap-2">
            {BROWSE_CITIES.map((city) => (
              <Link
                key={city}
                href={`/events?city=${encodeURIComponent(city)}`}
                className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-zinc-300 transition hover:border-[var(--ml-gold)]/40 hover:text-[var(--ml-gold)]"
              >
                {city}
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-20 border-t border-white/10 pt-16">
          <h2 className={CLASSES.headingSection}>Types of magic shows</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {SHOW_STYLE_BLOCKS.map((block) => (
              <Link
                key={block.title}
                href={block.href}
                className="group rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-[var(--ml-gold)]/35"
              >
                <h3 className="ml-font-heading text-lg font-semibold text-zinc-100 group-hover:text-[var(--ml-gold)]">
                  {block.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{block.description}</p>
                <p className="mt-3 text-xs font-semibold text-[var(--ml-gold)]">See matching events →</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-20 border-t border-white/10 pt-16">
          <h2 className={CLASSES.headingSection}>FAQs</h2>
          <dl className="mt-8 space-y-8">
            {FAQ_ITEMS.map((item) => (
              <div key={item.q}>
                <dt className="ml-font-heading text-lg font-semibold text-zinc-100">{item.q}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-zinc-400">{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="mt-16 flex justify-center">
          <Link href="/events" className={CLASSES.btnPrimary}>
            View full events calendar
          </Link>
        </div>
      </div>
    </div>
  );
}
