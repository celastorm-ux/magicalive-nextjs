import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Cormorant_Garamond, Geist, Geist_Mono } from "next/font/google";
import { LayoutChrome } from "@/components/LayoutChrome";
import { CookieBanner } from "@/components/CookieBanner";
import { UserPresence } from "@/components/UserPresence";
import { buildMetadata } from "@/lib/seo";
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

export const metadata: Metadata = buildMetadata({
  title: "Magicalive — The World's Magic Community",
  description:
    "Discover magicians, browse upcoming shows, and explore venues. The definitive hub for magic performers and fans alike.",
  image: "/og-default.png",
  type: "website",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${cormorant.variable} h-full antialiased`}
    >
      <body className="flex min-h-dvh flex-col">
        <ClerkProvider>
          <UserPresence />
          <LayoutChrome>{children}</LayoutChrome>
          <CookieBanner />
        </ClerkProvider>
      </body>
    </html>
  );
}
