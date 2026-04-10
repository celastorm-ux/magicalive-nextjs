import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Browse Magicians — PinnacleMagic",
  description:
    "Discover 2400+ professional magicians. Filter by location, specialty, and availability.",
});

export default function MagiciansLayout({ children }: { children: React.ReactNode }) {
  return children;
}
