import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Magic Venues — PinnacleMagic",
  description:
    "Discover magic-friendly venues across the US. Theaters, lounges, and private clubs hosting live magic.",
});

export default function VenuesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
