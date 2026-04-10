import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Magic Shops — PinnacleMagic",
  description: "Discover magic shops and retailers around the world.",
};

export default function MagicShopsPage() {
  return (
    <div className="min-h-0 flex-1 bg-black pb-20 pt-8 text-zinc-100 sm:pt-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-12">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--ml-gold)]">
          Coming soon
        </p>
        <h1 className="ml-font-heading text-4xl font-semibold tracking-tight text-zinc-50 sm:text-5xl">
          Magic <span className="italic text-[var(--ml-gold)]">shops</span>
        </h1>
        <p className="mt-4 max-w-xl text-sm text-zinc-400 sm:text-base">
          We&apos;re building a directory of magic shops and retailers. Check back soon.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center gap-2 text-sm text-[var(--ml-gold)] hover:underline"
        >
          ← Back to home
        </Link>
      </div>
    </div>
  );
}
