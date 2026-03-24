import type { Metadata } from "next";
import type { ReactNode } from "react";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Magician Profile — Magicalive",
  description: "Discover professional magicians on Magicalive.",
});

export default function MagicianProfileLayout({ children }: { children: ReactNode }) {
  return children;
}
