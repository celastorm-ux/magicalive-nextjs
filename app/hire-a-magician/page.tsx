import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { CLASSES } from "@/lib/constants";
import { buildMetadata } from "@/lib/seo";
import { getRouteSupabase } from "@/lib/supabase-route";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Hire a Magician — Find Professional Magicians for Any Event | Magicalive",
    description:
      "Find and hire professional magicians for corporate events, weddings, private parties and more. Browse profiles, check availability and send booking requests.",
  });
}

const EVENT_TYPE_CARDS: Array<{
  emoji: string;
  label: string;
  href: string;
}> = [
  { emoji: "🏢", label: "Corporate events", href: "/magicians?available_for=Corporate%20events" },
  { emoji: "💒", label: "Weddings", href: "/magicians?available_for=Weddings" },
  { emoji: "🎂", label: "Private parties", href: "/magicians?available_for=Private%20parties" },
  { emoji: "🎪", label: "Festivals", href: "/magicians?available_for=Festivals" },
  { emoji: "🎭", label: "Theater shows", href: "/magicians?available_for=Theater%20%2F%20stage" },
  { emoji: "🎓", label: "Lectures and workshops", href: "/magicians?style=Mentalism" },
];

const FAQ_ITEMS: Array<{ q: string; a: string }> = [
  {
    q: "How much does it cost to hire a magician?",
    a: "Rates vary by performer and event type. Most professional magicians charge between $300–$2,000 for private events. Corporate and stage shows typically range higher. Send a booking request through Magicalive to get a quote.",
  },
  {
    q: "How far in advance should I book a magician?",
    a: "For weddings and corporate events book at least 4–6 weeks in advance. For popular performers during peak season (November–January) book 3+ months ahead.",
  },
  {
    q: "What types of events can magicians perform at?",
    a: "Professional magicians perform at corporate events, weddings, birthday parties, bar mitzvahs, festivals, restaurants, theaters and private parties. Many also offer virtual shows.",
  },
  {
    q: "What is close-up magic vs stage magic?",
    a: "Close-up magic happens inches from your guests — card tricks, coin magic, mentalism — perfect for cocktail hours and intimate gatherings. Stage magic uses larger illusions and works for theater shows and large events.",
  },
  {
    q: "How do I know if a magician is professional?",
    a: "Look for verified reviews from real audiences, credentials like SAM or IBM membership, a showreel video, and a complete Magicalive profile.",
  },
];

type FeaturedRow = {
  id: string;
  display_name: string | null;
  location: string | null;
  specialty_tags: unknown;
  avatar_url: string | null;
};

function firstInitial(name: string) {
  return (name.trim()[0] || "M").toUpperCase();
}

export default async function HireAMagicianPage() {
  const db = await getRouteSupabase();
  const { data: featuredRows } = await db
    .from("profiles")
    .select("id, display_name, location, specialty_tags, avatar_url, review_count")
    .eq("account_type", "magician")
    .order("review_count", { ascending: false })
    .limit(4);

  const featured = (featuredRows ?? []) as FeaturedRow[];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Hire a Magician — Magicalive",
    description:
      "Find and hire professional magicians for corporate events, weddings, private parties and more.",
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
          Magicalive
        </p>
        <h1 className="ml-font-heading text-4xl font-semibold tracking-tight text-zinc-50 sm:text-5xl">
          Hire a Magician for Your Next Event
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg">
          Browse professional magicians, check their availability, and send a booking request — all in one place.
        </p>

        <form
          action="/search"
          method="get"
          className="mt-8 flex max-w-xl flex-col gap-3 sm:flex-row sm:items-stretch"
        >
          <label htmlFor="hire-search" className="sr-only">
            Search magicians
          </label>
          <input
            id="hire-search"
            name="q"
            type="search"
            placeholder="Search by name, city, or specialty…"
            className={`${CLASSES.inputSearch} min-h-[48px] flex-1`}
          />
          <button type="submit" className={`${CLASSES.btnPrimary} shrink-0 sm:min-w-[120px]`}>
            Search
          </button>
        </form>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/magicians" className={CLASSES.btnPrimary}>
            Find a magician near me
          </Link>
          <a
            href="#event-types"
            className={`${CLASSES.btnSecondary} border-[var(--ml-gold)]/25 text-[var(--ml-gold)] hover:border-[var(--ml-gold)]/40`}
          >
            Browse by event type
          </a>
        </div>

        <section id="event-types" className="mt-16 scroll-mt-24">
          <h2 className={`${CLASSES.headingSection}`}>Book for your event type</h2>
          <p className="mt-2 max-w-2xl text-sm text-zinc-500">
            Jump to magicians who list these formats on their profile.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {EVENT_TYPE_CARDS.map((c) => (
              <Link
                key={c.label}
                href={c.href}
                className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-[var(--ml-gold)]/35 hover:bg-white/[0.05]"
              >
                <span className="text-2xl">{c.emoji}</span>
                <p className="mt-3 text-sm font-semibold text-zinc-100 group-hover:text-[var(--ml-gold)]">
                  {c.label}
                </p>
                <p className="mt-2 text-xs text-zinc-500">View directory →</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-20">
          <h2 className={CLASSES.headingSection}>How it works</h2>
          <ol className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              "Browse magician profiles and check availability",
              "Send a booking request with your event details",
              "The magician responds within 24 hours",
            ].map((text, i) => (
              <li
                key={text}
                className="relative rounded-2xl border border-white/10 bg-white/[0.03] p-6 pt-10"
              >
                <span className="absolute left-5 top-4 text-3xl font-semibold text-[var(--ml-gold)]/80">
                  {i + 1}
                </span>
                <p className="text-sm leading-relaxed text-zinc-300">{text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className={CLASSES.headingSection}>Featured magicians</h2>
              <p className="mt-2 text-sm text-zinc-500">A snapshot of professionals on Magicalive.</p>
            </div>
            <Link href="/magicians" className={`${CLASSES.linkGold} text-sm font-semibold`}>
              Full directory →
            </Link>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featured.length ? (
              featured.map((m) => {
                const name = m.display_name?.trim() || "Magician";
                const tags = Array.isArray(m.specialty_tags) ? (m.specialty_tags as string[]).slice(0, 3) : [];
                return (
                  <Link
                    key={m.id}
                    href={`/profile/magician?id=${encodeURIComponent(m.id)}`}
                    className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition hover:border-[var(--ml-gold)]/30"
                  >
                    <div className="relative aspect-square bg-gradient-to-br from-violet-950/80 to-zinc-950">
                      {m.avatar_url?.trim() ? (
                        <Image
                          src={m.avatar_url.trim()}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="(max-width:1024px) 50vw, 25vw"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-3xl font-semibold text-zinc-500">
                          {firstInitial(name)}
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <p className="font-semibold text-zinc-100 group-hover:text-[var(--ml-gold)]">{name}</p>
                      {m.location?.trim() ? (
                        <p className="mt-1 text-xs text-zinc-500">{m.location.trim()}</p>
                      ) : null}
                      {tags.length ? (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {tags.map((t) => (
                            <span
                              key={t}
                              className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-zinc-400"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </Link>
                );
              })
            ) : (
              <p className="text-sm text-zinc-500">Magicians will appear as they join the directory.</p>
            )}
          </div>
        </section>

        <section className="mt-20 border-t border-white/10 pt-16">
          <h2 className={CLASSES.headingSection}>Hiring FAQs</h2>
          <dl className="mt-8 space-y-8">
            {FAQ_ITEMS.map((item) => (
              <div key={item.q}>
                <dt className="ml-font-heading text-lg font-semibold text-zinc-100">{item.q}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-zinc-400">{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-20 rounded-2xl border border-[var(--ml-gold)]/25 bg-[var(--ml-gold)]/[0.06] p-8 text-center">
          <h2 className={`${CLASSES.headingSub} text-zinc-50`}>Find your magician</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-zinc-400">
            Search the directory by city to see who performs near you.
          </p>
          <form action="/magicians" method="get" className="mx-auto mt-6 flex max-w-md flex-col gap-3 sm:flex-row">
            <label htmlFor="hire-city" className="sr-only">
              City
            </label>
            <input
              id="hire-city"
              name="city"
              type="text"
              placeholder="City or region"
              className={`${CLASSES.inputSearch} min-h-[48px] flex-1`}
            />
            <button type="submit" className={`${CLASSES.btnPrimary} shrink-0`}>
              Browse
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
