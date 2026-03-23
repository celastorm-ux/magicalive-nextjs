"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { SearchBar } from "@/components/SearchBar";
import { CLASSES } from "@/lib/constants";
import { supabase } from "@/lib/supabase";

type MagicianResult = {
  id: string;
  display_name: string | null;
  location: string | null;
  specialty_tags: string[] | null;
  avatar_url: string | null;
  rating: number | null;
  review_count: number | null;
  is_online: boolean | null;
  is_founding_member: boolean | null;
};

type ShowProfile = {
  id: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type ShowResult = {
  id: string;
  name: string | null;
  venue_name: string | null;
  city: string | null;
  date: string | null;
  ticket_url: string | null;
  profiles: ShowProfile | null;
};

/** Supabase may return nested `profiles` as an object or a one-element array. */
type ShowResultRow = Omit<ShowResult, "profiles"> & {
  profiles: ShowProfile | ShowProfile[] | null;
};

function normalizeShowProfiles(
  profiles: ShowProfile | ShowProfile[] | null | undefined,
): ShowProfile | null {
  if (profiles == null) return null;
  return Array.isArray(profiles) ? (profiles[0] ?? null) : profiles;
}

type VenueResult = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  venue_type: string | null;
  description: string | null;
  tags: string[] | null;
};

function escRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function Highlight({ text, q }: { text: string; q: string }) {
  if (!q.trim()) return <>{text}</>;
  const parts = text.split(new RegExp(`(${escRegExp(q)})`, "ig"));
  return (
    <>
      {parts.map((part, idx) =>
        part.toLowerCase() === q.toLowerCase() ? (
          <mark
            key={`${part}-${idx}`}
            className="rounded bg-[var(--ml-gold)]/20 px-0.5 text-[var(--ml-gold)]"
          >
            {part}
          </mark>
        ) : (
          <span key={`${part}-${idx}`}>{part}</span>
        ),
      )}
    </>
  );
}

function SearchPageContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const searchQuery = query.trim();
  const [loading, setLoading] = useState(false);
  const [magicians, setMagicians] = useState<MagicianResult[]>([]);
  const [shows, setShows] = useState<ShowResult[]>([]);
  const [venues, setVenues] = useState<VenueResult[]>([]);

  useEffect(() => {
    console.log("URL query param:", query);
    console.log("Search query:", searchQuery);
    if (!searchQuery) {
      setMagicians([]);
      setShows([]);
      setVenues([]);
      setLoading(false);
      return;
    }

    const runSearch = async () => {
      setLoading(true);
      const today = new Date().toISOString().split("T")[0];
      const q = searchQuery.replace(/[,%_]/g, " ").trim();
      console.log("Query being run with term:", q);

      const magiciansPromise = supabase
        .from("profiles")
        .select(
          "id, display_name, location, specialty_tags, avatar_url, rating, review_count, is_online, is_founding_member",
        )
        .eq("account_type", "magician")
        .ilike("display_name", `%${q}%`)
        .limit(8);

      const showsPromise = supabase
        .from("shows")
        .select("id, name, venue_name, city, date, ticket_url, profiles(display_name, avatar_url, id)")
        .eq("is_public", true)
        .gte("date", today)
        .or(`name.ilike.%${q}%,venue_name.ilike.%${q}%,city.ilike.%${q}%`)
        .limit(8);

      const venuesPromise = supabase
        .from("venues")
        .select("*")
        .or(`name.ilike.%${q}%,city.ilike.%${q}%,description.ilike.%${q}%,tags::text.ilike.%${q}%`)
        .limit(8);

      const [magRes, showRes, venRes] = await Promise.all([
        magiciansPromise,
        showsPromise,
        venuesPromise,
      ]);
      const magiciansData = magRes.data ?? [];
      const magiciansError = magRes.error;
      const showsData = showRes.data ?? [];
      const showsError = showRes.error;
      const venuesData = venRes.data ?? [];
      const venuesError = venRes.error;

      console.log("Magicians result:", magiciansData, magiciansError);
      console.log("Shows result:", showsData, showsError);
      console.log("Venues result:", venuesData, venuesError);

      setMagicians((magiciansData as MagicianResult[]) || []);
      setShows(
        ((showsData as ShowResultRow[]) || []).map((s) => ({
          ...s,
          profiles: normalizeShowProfiles(s.profiles),
        })),
      );
      setVenues((venuesData as VenueResult[]) || []);
      setLoading(false);
    };

    void runSearch();
  }, [query, searchQuery]);

  const total = useMemo(
    () => magicians.length + shows.length + venues.length,
    [magicians.length, shows.length, venues.length],
  );

  const allEmpty = !loading && total === 0 && searchQuery.length > 0;

  return (
    <div className="min-h-screen bg-black pb-16 pt-10 text-zinc-100">
      <div className={`${CLASSES.section} max-w-6xl`}>
        <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--ml-gold)]">
          Search
        </p>
        <h1 className="ml-font-heading text-4xl font-semibold tracking-tight text-zinc-50 sm:text-5xl">
          Find <span className="text-[var(--ml-gold)] italic">magic</span>
        </h1>
        <div className="mt-5 max-w-2xl">
          <SearchBar defaultValue={query} />
        </div>

        {searchQuery ? (
          <p className="mt-4 text-sm text-zinc-400">
            <span className="font-semibold text-zinc-200">{total}</span> results for{" "}
            <span className="text-[var(--ml-gold)]">{searchQuery}</span>
          </p>
        ) : (
          <p className="mt-4 text-sm text-zinc-500">Enter a search term</p>
        )}

        {loading ? (
          <div className="flex min-h-[280px] items-center justify-center">
            <span className="inline-block size-10 animate-spin rounded-full border-2 border-[var(--ml-gold)]/30 border-t-[var(--ml-gold)]" />
          </div>
        ) : null}

        {!loading && searchQuery ? (
          <div className="mt-8 space-y-10">
            <section>
              <div className="mb-4 flex items-center gap-3">
                <h2 className="ml-font-heading text-2xl text-zinc-100">Magicians</h2>
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-zinc-400">
                  {magicians.length}
                </span>
              </div>
              {magicians.length ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {magicians.map((m) => (
                    <article
                      key={m.id}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-[var(--ml-gold)]/35"
                    >
                      <p className="ml-font-heading text-lg text-zinc-100">
                        <Link href={`/profile/magician?id=${encodeURIComponent(m.id)}`} className="hover:underline">
                          <Highlight text={m.display_name?.trim() || "Magician"} q={searchQuery} />
                          {m.is_founding_member ? <span className="ml-2 text-[var(--ml-gold)]">♣</span> : null}
                        </Link>
                      </p>
                      <p className="mt-1 text-sm text-zinc-500">
                        <Highlight text={m.location || "Location not set"} q={searchQuery} />
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(m.specialty_tags ?? []).slice(0, 4).map((tag) => (
                          <Link
                            key={tag}
                            href={`/magicians?style=${encodeURIComponent(tag)}`}
                            className={`${CLASSES.tag} transition hover:border-[var(--ml-gold)]/45 hover:bg-[var(--ml-gold)]/10`}
                          >
                            <Highlight text={tag} q={searchQuery} />
                          </Link>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-zinc-500">
                  No magicians found matching <span className="text-zinc-300">{searchQuery}</span>
                </p>
              )}
            </section>

            <section>
              <div className="mb-4 flex items-center gap-3">
                <h2 className="ml-font-heading text-2xl text-zinc-100">Events</h2>
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-zinc-400">
                  {shows.length}
                </span>
              </div>
              {shows.length ? (
                <div className="space-y-3">
                  {shows.map((s) => (
                    <Link
                      key={s.id}
                      href={`/events/${encodeURIComponent(s.id)}`}
                      className="block rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-[var(--ml-gold)]/35"
                    >
                      <p className="ml-font-heading text-lg text-zinc-100">
                        <Highlight text={s.name || "Untitled show"} q={searchQuery} />
                      </p>
                      <p className="mt-1 text-sm text-zinc-500">
                        <Highlight text={[s.venue_name, s.city].filter(Boolean).join(" · ") || "Venue TBA"} q={searchQuery} />
                      </p>
                      <p className="mt-1 text-xs text-zinc-600">
                        {s.date ? new Date(s.date).toLocaleDateString() : "Date TBA"}
                        {s.profiles?.display_name ? ` · ${s.profiles.display_name}` : ""}
                      </p>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-zinc-500">
                  No events found matching <span className="text-zinc-300">{searchQuery}</span>
                </p>
              )}
            </section>

            <section>
              <div className="mb-4 flex items-center gap-3">
                <h2 className="ml-font-heading text-2xl text-zinc-100">Venues</h2>
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-zinc-400">
                  {venues.length}
                </span>
              </div>
              {venues.length ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {venues.map((v) => (
                    <Link
                      key={v.id}
                      href={`/venues/${encodeURIComponent(v.id)}`}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-[var(--ml-gold)]/35"
                    >
                      <p className="ml-font-heading text-lg text-zinc-100">
                        <Highlight text={v.name} q={searchQuery} />
                      </p>
                      <p className="mt-1 text-sm text-zinc-500">
                        <Highlight text={[v.city, v.state].filter(Boolean).join(", ") || "—"} q={searchQuery} />
                      </p>
                      <p className="mt-2 line-clamp-2 text-sm text-zinc-400">
                        <Highlight text={v.description?.trim() || "No description."} q={searchQuery} />
                      </p>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-zinc-500">
                  No venues found matching <span className="text-zinc-300">{searchQuery}</span>
                </p>
              )}
            </section>

            {allEmpty ? (
              <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.02] px-8 py-16 text-center">
                <p className="ml-font-heading text-2xl text-zinc-200">
                  No results for <span className="text-[var(--ml-gold)]">{searchQuery}</span>
                </p>
                <p className="mt-3 text-sm text-zinc-500">
                  Try different keywords, shorter terms, or searching by city, venue, or performer name.
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-black text-zinc-500">
          Loading…
        </div>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}
