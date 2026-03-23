import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Upcoming Magic Events — Magicalive",
  description:
    "Browse upcoming magic shows and lectures near you. Find tickets and add to your calendar.",
});

export default function EventsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
