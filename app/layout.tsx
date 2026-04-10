import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Cormorant_Garamond, Geist, Geist_Mono } from "next/font/google";
import { LayoutChrome } from "@/components/LayoutChrome";
import { CookieBanner } from "@/components/CookieBanner";
import PresenceTracker from "@/components/PresenceTracker";
import PresenceCleanupTrigger from "@/components/PresenceCleanupTrigger";
import JsonLd from "@/components/JsonLd";
import { buildMetadata } from "@/lib/seo";
import { siteBaseUrl } from "@/lib/pinnaclemagic-resend";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  ...buildMetadata({
    title: "PinnacleMagic — The World's Magic Community",
    description:
      "Discover magicians, browse upcoming shows, and explore venues. The definitive hub for magic performers and fans alike.",
    image: "/og-default.png",
    type: "website",
  }),
  verification: {
    google: "eUKBhmM38IorTzJnbXBFwCrCLlAF8z-oOyzkQg3Y9Es",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const base = siteBaseUrl();

  const siteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "PinnacleMagic",
    url: base,
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${base}/magicians?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };

  const orgSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "PinnacleMagic",
    url: base,
    logo: `${base}/og-default.png`,
    description:
      "The world's magic community — discover magicians near you, browse upcoming shows, and connect with magic societies worldwide.",
    sameAs: ["https://www.instagram.com/pinnaclemagic"],
  };

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${cormorant.variable} h-full antialiased`}
    >
      <body className="flex min-h-dvh flex-col">
        <JsonLd data={[siteSchema, orgSchema]} />
        <ClerkProvider>
          <PresenceTracker />
          <PresenceCleanupTrigger />
          <LayoutChrome>{children}</LayoutChrome>
          <CookieBanner />
        </ClerkProvider>
      </body>
    </html>
  );
}
