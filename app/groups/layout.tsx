import type { Metadata } from "next";
import type { ReactNode } from "react";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Magic Organizations & Societies — Magicalive",
    description:
      "Discover the world's leading magic organizations including IBM SAM FISM The Magic Circle and the Academy of Magical Arts. Find your community.",
  };
}

export default function GroupsLayout({ children }: { children: ReactNode }) {
  return children;
}
