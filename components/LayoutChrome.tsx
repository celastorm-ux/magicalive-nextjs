"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";

type LayoutChromeProps = {
  children: ReactNode;
};

export function LayoutChrome({ children }: LayoutChromeProps) {
  const pathname = usePathname();
  const hideChrome = pathname.startsWith("/search") || pathname.startsWith("/notifications");

  return (
    <>
      {!hideChrome ? <Nav /> : null}
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      {!hideChrome ? <Footer /> : null}
    </>
  );
}
