import Link from "next/link";
import { CLASSES } from "@/lib/constants";

export default function NotFoundPage() {
  return (
    <div className="relative flex min-h-[70vh] items-center justify-center overflow-hidden bg-black px-6 py-16 text-zinc-100">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="absolute left-1/2 top-[-180px] h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,var(--ml-gold-glow-strong),rgba(0,0,0,0)_66%)] blur-2xl" />
        <div
          className="absolute inset-0"
          style={{ background: "var(--ml-gradient-vignette)" }}
        />
      </div>

      <div className="mx-auto flex w-full max-w-3xl flex-col items-center text-center">
        <p className="text-5xl sm:text-6xl" aria-hidden>
          🎩
        </p>
        <p className="mt-5 ml-font-heading text-[96px] leading-none text-[var(--ml-gold)] sm:text-[120px]">
          404
        </p>
        <h1 className="mt-4 ml-font-heading text-3xl font-semibold text-zinc-100 sm:text-4xl">
          This page has vanished
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-400 sm:text-base">
          Like a good magic trick — we can not find what you are looking for.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link href="/" className={CLASSES.btnPrimary}>
            Back to homepage
          </Link>
          <Link href="/magicians" className={CLASSES.btnSecondary}>
            Browse magicians
          </Link>
        </div>
      </div>
    </div>
  );
}
