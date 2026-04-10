"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";

type LayoutChromeProps = {
  children: ReactNode;
};

// Subtle fixed radial glow per route — color stops keyed by path prefix.
// rgba values kept low (0.12–0.18) so they tint without overpowering.
const PAGE_GLOWS: { prefix: string; color: string }[] = [
  { prefix: "/magicians",      color: "rgba(139, 92, 246, 0.15)"  }, // violet
  { prefix: "/events",         color: "rgba(244, 63, 94, 0.13)"   }, // rose
  { prefix: "/venues",         color: "rgba(56, 189, 248, 0.13)"  }, // sky blue
  { prefix: "/articles",       color: "rgba(20, 184, 166, 0.13)"  }, // teal
  { prefix: "/for-magicians",  color: "rgba(251, 146, 60, 0.14)"  }, // orange
  { prefix: "/about",          color: "rgba(99, 102, 241, 0.14)"  }, // indigo
  { prefix: "/contact",        color: "rgba(14, 165, 233, 0.13)"  }, // sky
  { prefix: "/groups",         color: "rgba(34, 197, 94, 0.12)"   }, // emerald
  { prefix: "/magic-shops",    color: "rgba(250, 204, 21, 0.12)"  }, // yellow
  { prefix: "/dealers",        color: "rgba(249, 115, 22, 0.13)"  }, // amber-orange
  { prefix: "/hire-a-magician",color: "rgba(236, 72, 153, 0.13)"  }, // pink
  { prefix: "/magic-shows",    color: "rgba(168, 85, 247, 0.13)"  }, // purple
  { prefix: "/submit",         color: "rgba(52, 211, 153, 0.12)"  }, // green
  { prefix: "/profile",        color: "rgba(148, 163, 184, 0.10)" }, // slate
  { prefix: "/dashboard",      color: "rgba(245, 204, 113, 0.13)" }, // gold
  { prefix: "/",               color: "rgba(245, 204, 113, 0.12)" }, // gold (home)
];

function getPageGlow(pathname: string): string | null {
  // Match longest prefix first (more specific routes win)
  const match = PAGE_GLOWS
    .filter(({ prefix }) => pathname === prefix || pathname.startsWith(prefix + "/") || (prefix === "/" && pathname === "/"))
    .sort((a, b) => b.prefix.length - a.prefix.length)[0];
  return match?.color ?? null;
}

export function LayoutChrome({ children }: LayoutChromeProps) {
  const pathname = usePathname();
  const hideChrome =
    pathname.startsWith("/search") ||
    pathname.startsWith("/notifications") ||
    pathname.startsWith("/claim-profile");

  const glowColor = getPageGlow(pathname);

  return (
    <>
      {glowColor && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-0"
          style={{
            background: `radial-gradient(ellipse 90% 45% at 50% 0%, ${glowColor}, transparent 70%)`,
          }}
        />
      )}
      {!hideChrome ? <Nav /> : null}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">{children}</div>
      {!hideChrome ? <Footer /> : null}
    </>
  );
}
