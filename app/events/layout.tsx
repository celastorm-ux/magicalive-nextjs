import type { Metadata } from "next";
import { Suspense } from "react";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Upcoming Magic Events — Magicalive",
  description:
    "Browse upcoming magic shows and lectures near you. Find tickets and add to your calendar.",
});

function EventsFallback() {
  return (
    <div className="flex min-h-[50vh] flex-1 items-center justify-center bg-black text-zinc-500">
      Loading events…
    </div>
  );
}

export default function EventsLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<EventsFallback />}>{children}</Suspense>;
}
