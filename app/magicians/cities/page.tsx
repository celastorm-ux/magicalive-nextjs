import Link from "next/link";
import type { Metadata } from "next";
import { CITY_LANDING_PAGES, locationOrFilter } from "@/lib/city-landing";
import { CLASSES } from "@/lib/constants";
import { buildMetadata } from "@/lib/seo";
import { getRouteSupabase } from "@/lib/supabase-route";

export const metadata: Metadata = buildMetadata({
  title: "Magicians by city — Magicalive",
  description: "Explore city landing pages for magicians across major markets in the United States.",
});

export default async function MagiciansCitiesIndexPage() {
  const db = await getRouteSupabase();

  const rows = await Promise.all(
    CITY_LANDING_PAGES.map(async (c) => {
      const { count } = await db
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("account_type", "magician")
        .or(locationOrFilter(c.locationMatch));
      return { slug: c.slug, name: c.displayName, count: count ?? 0 };
    }),
  );

  return (
    <div className="min-h-0 flex-1 bg-black pb-16 pt-10 text-zinc-100 sm:pt-14">
      <div className={`${CLASSES.section} max-w-3xl`}>
        <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--ml-gold)]">
          City SEO hub
        </p>
        <h1 className="ml-font-heading text-4xl font-semibold tracking-tight text-zinc-50">
          Magicians by city
        </h1>
        <p className="mt-3 text-sm text-zinc-400">
          Local landing pages help collectors, planners, and fans discover performers in major markets. Each page lists verified directory members whose locations match that metro.
        </p>

        <ul className="mt-10 space-y-3">
          {rows
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((row) => (
              <li key={row.slug}>
                <Link
                  href={`/magicians/${row.slug}`}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 transition hover:border-[var(--ml-gold)]/35"
                >
                  <span className="font-semibold text-zinc-100">{row.name}</span>
                  <span className="text-sm text-[var(--ml-gold)]">
                    {row.count} magician{row.count === 1 ? "" : "s"} →
                  </span>
                </Link>
              </li>
            ))}
        </ul>

        <Link href="/magicians" className={`${CLASSES.linkGold} mt-10 inline-block text-sm`}>
          ← Back to full directory
        </Link>
      </div>
    </div>
  );
}
