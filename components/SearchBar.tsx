"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { CLASSES } from "@/lib/constants";

const RECENT_KEY = "magicalive_recent_searches";
const MAX_RECENT = 5;

type SearchBarProps = {
  placeholder?: string;
  className?: string;
  autoFocusSlash?: boolean;
  compact?: boolean;
  defaultValue?: string;
};

export function SearchBar({
  placeholder = "Search magicians, events, venues…",
  className = "",
  autoFocusSlash = true,
  compact = false,
  defaultValue = "",
}: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultValue);
  const [recent, setRecent] = useState<string[]>([]);
  const [openRecent, setOpenRecent] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setQuery(defaultValue);
  }, [defaultValue]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as string[];
      setRecent(Array.isArray(parsed) ? parsed.slice(0, MAX_RECENT) : []);
    } catch {
      setRecent([]);
    }
  }, []);

  useEffect(() => {
    if (!autoFocusSlash) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTypingTarget =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;
      if (isTypingTarget) return;
      if (e.key === "/") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [autoFocusSlash]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpenRecent(false);
    };
    window.addEventListener("click", onDoc);
    return () => window.removeEventListener("click", onDoc);
  }, []);

  const runSearch = (raw: string) => {
    const q = raw.trim();
    if (!q) return;
    const nextRecent = [q, ...recent.filter((r) => r.toLowerCase() !== q.toLowerCase())].slice(
      0,
      MAX_RECENT,
    );
    setRecent(nextRecent);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(nextRecent));
    } catch {
      // ignore storage errors
    }
    setOpenRecent(false);
    router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  const shellClass = useMemo(
    () =>
      compact
        ? "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
        : CLASSES.inputSearch,
    [compact],
  );

  return (
    <div ref={wrapRef} className={`relative w-full ${className}`}>
      <div className="relative">
        <button
          type="button"
          aria-label="Search"
          onClick={() => runSearch(query)}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 transition hover:text-[var(--ml-gold)]"
        >
          ⌕
        </button>
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpenRecent(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              runSearch(query);
            }
          }}
          placeholder={placeholder}
          className={`${shellClass} pl-9 pr-10`}
        />
        {query ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 transition hover:text-zinc-300"
          >
            ×
          </button>
        ) : null}
      </div>

      {openRecent && recent.length ? (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 rounded-xl border border-white/10 bg-black/95 p-2 shadow-xl backdrop-blur-md">
          <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Recent searches
          </p>
          <ul className="mt-1 space-y-1">
            {recent.map((item) => (
              <li key={item}>
                <button
                  type="button"
                  onClick={() => runSearch(item)}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-300 transition hover:bg-white/10 hover:text-zinc-100"
                >
                  {item}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
