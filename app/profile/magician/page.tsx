"use client";

import { Suspense } from "react";
import MagicianProfilePageInner from "./MagicianProfilePageInner";

function MagicianProfileFallback() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black text-zinc-400">
      <span
        className="inline-block size-10 animate-spin rounded-full border-2 border-[var(--ml-gold)]/30 border-t-[var(--ml-gold)]"
        aria-hidden
      />
      <p className="text-sm">Loading profile…</p>
    </div>
  );
}

export default function MagicianProfilePage() {
  return (
    <Suspense fallback={<MagicianProfileFallback />}>
      <MagicianProfilePageInner />
    </Suspense>
  );
}
