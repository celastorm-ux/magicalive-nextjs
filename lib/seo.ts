import type { Metadata } from "next";
import { siteBaseUrl } from "@/lib/magicalive-resend";

const DEFAULT_OG = "/og-default.png";

export function buildMetadata(input: {
  title: string;
  description: string;
  image?: string | null;
  type?: "website" | "article";
}): Metadata {
  const image = input.image || DEFAULT_OG;
  return {
    title: input.title,
    description: input.description,
    openGraph: {
      title: input.title,
      description: input.description,
      type: input.type ?? "website",
      images: [image],
      url: siteBaseUrl(),
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      images: [image],
    },
  };
}
