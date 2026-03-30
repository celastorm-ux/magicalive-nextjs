import Link from "next/link";
import { Suspense } from "react";
import { CLASSES } from "@/lib/constants";
import { buildMetadata } from "@/lib/seo";
import { getRouteSupabase } from "@/lib/supabase-route";

const GAP_CARDS = [
  { emoji: "🎬", label: "Film", platform: "IMDb" },
  { emoji: "🍽️", label: "Food", platform: "Yelp & Michelin" },
  { emoji: "🎵", label: "Music", platform: "Spotify" },
  { emoji: "🎩", label: "Magic", platform: "?" },
] as const;

export async function generateMetadata() {
  return buildMetadata({
    title: "Our Story — Magicalive",
    description:
      "Magicalive was built by a Los Angeles magician who couldn't answer a simple question: where is the magic happening this Friday? This is that story.",
  });
}

async function getFoundingMemberClaimed(): Promise<number> {
  try {
    const db = await getRouteSupabase();
    const { data, error } = await db
      .from("founding_member_count")
      .select("current_count")
      .eq("id", 1)
      .maybeSingle();
    if (error || !data) return 0;
    const n = Number((data as { current_count?: number }).current_count ?? 0);
    return Math.min(100, Math.max(0, n));
  } catch {
    return 0;
  }
}

export default function AboutPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] flex-1 items-center justify-center bg-black text-zinc-500">
          <p className="text-sm">Loading…</p>
        </div>
      }
    >
      <AboutStory />
    </Suspense>
  );
}

async function AboutStory() {
  const foundingClaimed = await getFoundingMemberClaimed();
  const progressPct = Math.round((foundingClaimed / 100) * 100);

  return (
    <div className="min-h-0 flex-1 bg-black text-zinc-100">
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-10 sm:px-6 lg:px-10">
        <header className="max-w-3xl">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--ml-gold)]">Our story</p>
          <h1 className="ml-font-heading mt-3 text-4xl font-semibold leading-[1.1] tracking-tight text-zinc-50 sm:text-5xl md:text-6xl">
            Where the audience finds its
            <br />
            <span className="text-[var(--ml-gold)] italic">magic</span>
          </h1>
          <p className="mt-4 text-sm text-zinc-500">Founded in Los Angeles, CA</p>
        </header>

        <section className="mx-auto mt-16 max-w-3xl">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--ml-gold)]">The moment it started</p>
          <h2 className="ml-font-heading mt-3 text-3xl font-semibold text-zinc-50 sm:text-4xl">
            A simple question with no answer
          </h2>
          <div className="mt-8 space-y-6 text-base leading-relaxed text-zinc-400 sm:text-lg">
            <p>
              A friend texted me on a Tuesday. Did I know of any magic shows happening that Friday? I&apos;m a magician. I
              see my friends post their gigs constantly. I know the magic world is alive and active. But I was stumped. I
              couldn&apos;t name a single show.
            </p>
            <p>
              That moment stayed with me. Not because it was unusual — but because it wasn&apos;t. How many times had a
              potential audience member given up trying to find a magic show simply because there was nowhere obvious to
              look? How many bookings had magicians missed because event organisers couldn&apos;t find them?
            </p>
            <p className="text-zinc-300">
              The magic world is thriving. The platform it deserves just didn&apos;t exist yet.
            </p>
          </div>
        </section>

        <section className="mx-auto mt-24 max-w-5xl">
          <h2 className="ml-font-heading text-center text-3xl font-semibold text-zinc-50 sm:text-4xl">
            Every art form has its home
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {GAP_CARDS.map((c) => (
              <div
                key={c.label}
                className={`rounded-2xl border p-6 text-center ${
                  c.label === "Magic"
                    ? "border-[var(--ml-gold)]/35 bg-[var(--ml-gold)]/[0.06]"
                    : "border-white/10 bg-white/[0.03]"
                }`}
              >
                <span className="text-3xl" aria-hidden>
                  {c.emoji}
                </span>
                <p className="mt-3 ml-font-heading text-lg font-semibold text-zinc-200">{c.label}</p>
                <p className="mt-1 text-sm text-[var(--ml-gold)]">{c.platform}</p>
              </div>
            ))}
          </div>
          <div className="mx-auto mt-12 max-w-3xl space-y-4 text-center text-base leading-relaxed text-zinc-400">
            <p>
              Every creative industry has a platform that brings performers and audiences together. Magic — one of the
              oldest and most beloved performance arts — had nothing. No directory. No community hub. No way for a fan to
              discover who was performing in their city this weekend.
            </p>
            <p className="text-zinc-200">
              Magicalive is the answer to that <span className="text-[var(--ml-gold)]">question</span>.
            </p>
          </div>
        </section>

        <section className="mx-auto mt-24 max-w-3xl rounded-3xl border border-[var(--ml-gold)]/20 bg-[var(--ml-gold)]/[0.04] px-6 py-14 text-center sm:px-10 sm:py-16">
          <blockquote className="ml-font-heading text-2xl font-semibold leading-snug text-[var(--ml-gold)] sm:text-3xl md:text-4xl">
            &ldquo;Where the audience finds its magic&rdquo;
          </blockquote>
          <p className="mx-auto mt-8 max-w-xl text-sm leading-relaxed text-zinc-400 sm:text-base">
            We built Magicalive for two people: the magician who deserves to be discovered, and the fan who deserves to
            be amazed. Every profile, every show listing, every venue page exists to close the gap between them.
          </p>
        </section>

        <section className="mx-auto mt-24 max-w-6xl">
          <h2 className="ml-font-heading text-center text-3xl font-semibold text-zinc-50 sm:text-4xl">
            More than a directory
          </h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
              <h3 className="ml-font-heading text-xl font-semibold text-[var(--ml-gold)]">For magicians</h3>
              <p className="mt-4 text-sm leading-relaxed text-zinc-400">
                A professional home on the internet. Your profile, your shows, your availability, your reviews — all in
                one place. Built by a magician who understood exactly what was missing.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
              <h3 className="ml-font-heading text-xl font-semibold text-[var(--ml-gold)]">For fans</h3>
              <p className="mt-4 text-sm leading-relaxed text-zinc-400">
                The easiest way to find magic near you. Search your city, discover performers, browse upcoming shows, and
                follow the magicians you love.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
              <h3 className="ml-font-heading text-xl font-semibold text-[var(--ml-gold)]">For the community</h3>
              <p className="mt-4 text-sm leading-relaxed text-zinc-400">
                A platform where the magic world can exist together. Articles, lectures, venues, reviews — everything that
                makes magic culture rich and worth celebrating.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto mt-24 max-w-3xl rounded-3xl border border-white/10 bg-white/[0.03] px-6 py-12 sm:px-10">
          <h2 className="ml-font-heading text-center text-3xl font-semibold text-zinc-50 sm:text-4xl">The first chapter</h2>
          <p className="mx-auto mt-6 max-w-2xl text-center text-base leading-relaxed text-zinc-400">
            Magicalive launched in 2026 from Los Angeles. The first 100 magicians to join receive a permanent Founding
            Member badge — a small acknowledgment that they believed in this before anyone else did.
          </p>
          <div className="mx-auto mt-10 max-w-md">
            <p className="text-center text-sm font-medium text-zinc-300">
              <span className="text-[var(--ml-gold)]">{foundingClaimed}</span> of 100 Founding Member spots claimed
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full border border-[var(--ml-gold)]/25 bg-black/60">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[var(--ml-gold)]/80 to-[var(--ml-gold)] transition-[width] duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
          <div className="mt-10 flex justify-center">
            <Link
              href="/create-profile"
              className={`${CLASSES.btnPrimary} inline-flex px-8 py-3 text-base`}
            >
              Join as a Founding Member
            </Link>
          </div>
        </section>

        <section className="mx-auto mt-24 max-w-6xl">
          <h2 className="ml-font-heading text-center text-3xl font-semibold text-zinc-50 sm:text-4xl">
            What we believe
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                {
                  title: "Magic deserves better",
                  body: "The magic community is talented, passionate and underserved by the internet. We are here to change that.",
                },
                {
                  title: "Performers first",
                  body: "Every decision we make starts with the question: does this help magicians get more of what they deserve?",
                },
                {
                  title: "Authenticity over algorithm",
                  body: "No pay to play. No boosted listings. The best magicians rise because fans say so — through reviews and follows.",
                },
                {
                  title: "Built by the community",
                  body: "We are magicians building for magicians. We understand this world because we live in it.",
                },
              ] as const
            ).map((v) => (
              <div key={v.title} className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                <p className="text-lg text-[var(--ml-gold)]" aria-hidden>
                  ♣
                </p>
                <h3 className="ml-font-heading mt-3 text-lg font-semibold text-zinc-100">{v.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-zinc-500">{v.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto mt-24 max-w-2xl rounded-3xl border border-[var(--ml-gold)]/25 bg-gradient-to-b from-[var(--ml-gold)]/[0.08] to-transparent px-6 py-12 text-center sm:px-10">
          <h2 className="ml-font-heading text-2xl font-semibold text-zinc-50 sm:text-3xl">
            Ready to be part of something new?
          </h2>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/create-profile" className={CLASSES.btnPrimary}>
              Create your profile
            </Link>
            <Link href="/magicians" className={CLASSES.btnSecondary}>
              Browse magicians
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

