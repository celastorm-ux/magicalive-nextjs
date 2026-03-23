import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Magician Profile — Magicalive",
  description: "Discover professional magicians on Magicalive.",
});

export default function MagicianProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
