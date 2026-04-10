"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "pinnaclemagic_cookie_consent";
const EXIT_MS = 260;

export function CookieBanner() {
  const [open, setOpen] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    try {
      const existing = localStorage.getItem(STORAGE_KEY);
      if (!existing) setOpen(true);
    } catch {
      setOpen(false);
    }
  }, []);

  const choose = (value: "accepted" | "essential") => {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // no-op
    }
    setExiting(true);
    window.setTimeout(() => {
      setOpen(false);
      setExiting(false);
    }, EXIT_MS);
  };

  if (!open) return null;

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-[90] border-l-4 border-[var(--ml-gold)] bg-[#151217] p-4 shadow-2xl transition-transform duration-300 ease-out sm:p-5 ${
        exiting ? "translate-y-full" : "translate-y-0"
      }`}
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 sm:gap-5">
        <p className="text-sm leading-relaxed text-zinc-300">
          PinnacleMagic uses cookies to improve your experience. By continuing to use the site you
          agree to our{" "}
          <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="text-[var(--ml-gold)] hover:underline">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link href="/terms" target="_blank" rel="noopener noreferrer" className="text-[var(--ml-gold)] hover:underline">
            Terms of Service
          </Link>
          .
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={() => choose("accepted")}
            className="rounded-xl bg-[var(--ml-gold)] px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-[var(--ml-gold-hover)]"
          >
            Accept all
          </button>
          <button
            type="button"
            onClick={() => choose("essential")}
            className="rounded-xl border border-white/15 bg-transparent px-4 py-2.5 text-sm font-semibold text-zinc-300 transition hover:border-white/25 hover:text-zinc-100"
          >
            Essential only
          </button>
        </div>
      </div>
    </div>
  );
}
