"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CLASSES } from "@/lib/constants";

const COMPARE_CARDS = [
  { emoji: "🎬", category: "Film", platform: "IMDb", highlight: false },
  { emoji: "🍽️", category: "Food", platform: "Yelp", highlight: false },
  { emoji: "🎵", category: "Music", platform: "Spotify", highlight: false },
  { emoji: "🎩", category: "Magic", platform: "PinnacleMagic ♣", highlight: true },
] as const;

export function HomeOurStoryTeaser() {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.1, rootMargin: "0px 0px -8% 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className={`border-t border-white/10 bg-black py-16 transition-[opacity,transform] duration-1000 ease-out sm:py-24 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
    >
      <div className={CLASSES.section}>
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-center lg:gap-14">
          <div className="border-l-2 border-[var(--ml-gold)]/45 pl-6 sm:pl-8">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--ml-gold)]">Our story</p>
            <h2 className="ml-font-heading mt-4 text-3xl font-semibold leading-tight tracking-tight text-zinc-50 sm:text-4xl md:text-[2.35rem]">
              A simple question with{" "}
              <span className="text-[var(--ml-gold)] italic">no answer</span>
            </h2>
            <div className="mt-6 space-y-4 text-sm leading-relaxed text-zinc-400 sm:text-base">
              <p>
                A friend asked me if I knew of any magic shows happening that Friday. I&apos;m a magician. I know this
                world inside out. But I was stumped. I couldn&apos;t name a single event — despite knowing the magic
                scene is alive and active.
              </p>
              <p>
                Film has IMDb. Food has Yelp. Music has Spotify. Magic had nothing. So we built PinnacleMagic — a home for
                every performer, fan, and venue in the magic world.
              </p>
            </div>
            <p className="mt-8">
              <Link
                href="/about"
                className="text-sm font-semibold text-[var(--ml-gold)] transition hover:text-[var(--ml-gold-hover)] hover:underline"
              >
                Read our full story →
              </Link>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {COMPARE_CARDS.map((c) => (
              <div
                key={c.category}
                className={`rounded-2xl px-4 py-4 sm:px-5 sm:py-5 ${
                  c.highlight
                    ? "border border-[var(--ml-gold)]/50 bg-[var(--ml-gold)]/[0.07] shadow-[0_0_24px_-8px_rgba(245,204,113,0.25)]"
                    : "border border-white/10 bg-white/[0.04]"
                }`}
              >
                <span className="text-2xl sm:text-3xl" aria-hidden>
                  {c.emoji}
                </span>
                <p className="mt-2 text-xs font-medium uppercase tracking-wider text-zinc-500">{c.category}</p>
                <p className="mt-1 ml-font-heading text-sm font-semibold text-[var(--ml-gold)] sm:text-base">
                  {c.platform}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
