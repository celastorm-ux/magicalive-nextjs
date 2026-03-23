import type { MetadataRoute } from "next";
import { siteBaseUrl } from "@/lib/magicalive-resend";

export default function robots(): MetadataRoute.Robots {
  const base = siteBaseUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
