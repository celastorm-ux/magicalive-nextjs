"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { TaggedPerformerLocal } from "@/lib/tagged-performers";

const MAX_TAGGED = 10;

export type MagicianSearchHit = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  location: string | null;
};

type Props = {
  value: TaggedPerformerLocal[];
  onChange: (next: TaggedPerformerLocal[]) => void;
  excludeUserId: string;
  inputClass: string;
  labelClass: string;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0]![0]!.toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

function newClientKey() {
  return `k-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function TaggedPerformersField({
  value,
  onChange,
  excludeUserId,
  inputClass,
  labelClass,
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MagicianSearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const seqRef = useRef(0);

  const taggedEmails = new Set(
    value
      .filter((v): v is Extract<TaggedPerformerLocal, { kind: "invited" }> => v.kind === "invited")
      .map((v) => v.email.toLowerCase()),
  );

  const runSearch = useCallback(
    async (q: string) => {
      const trim = q.trim();
      if (trim.length < 2) {
        setResults([]);
        return;
      }
      const seq = ++seqRef.current;
      setSearching(true);
      const regIds = value
        .filter((v): v is Extract<TaggedPerformerLocal, { kind: "registered" }> => v.kind === "registered")
        .map((v) => v.profile_id);
      const excludeIds = [excludeUserId, ...regIds].filter(Boolean);
      let rq = supabase
        .from("profiles")
        .select("id, display_name, avatar_url, location")
        .eq("account_type", "magician")
        .ilike("display_name", `%${trim}%`)
        .limit(5);
      if (excludeIds.length) {
        rq = rq.not("id", "in", `(${excludeIds.join(",")})`);
      }
      const { data } = await rq;
      if (seq !== seqRef.current) return;
      setResults((data ?? []) as MagicianSearchHit[]);
      setSearching(false);
    },
    [excludeUserId, value],
  );

  useEffect(() => {
    const trim = query.trim();
    if (trim.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    const t = setTimeout(() => {
      void runSearch(trim);
    }, 300);
    return () => clearTimeout(t);
  }, [query, runSearch]);

  const addRegistered = (hit: MagicianSearchHit) => {
    if (value.length >= MAX_TAGGED) return;
    const name = hit.display_name?.trim() || "Magician";
    if (value.some((v) => v.kind === "registered" && v.profile_id === hit.id)) return;
    onChange([
      ...value,
      {
        clientKey: newClientKey(),
        kind: "registered",
        profile_id: hit.id,
        name,
        avatar_url: hit.avatar_url,
        location: hit.location,
      },
    ]);
    setQuery("");
    setResults([]);
    setShowInvite(false);
  };

  const addInvite = () => {
    if (value.length >= MAX_TAGGED) return;
    const name = inviteName.trim();
    const email = inviteEmail.trim().toLowerCase();
    if (!name || !email.includes("@")) return;
    if (taggedEmails.has(email)) return;
    onChange([
      ...value,
      {
        clientKey: newClientKey(),
        kind: "invited",
        name,
        email,
      },
    ]);
    setInviteName("");
    setInviteEmail("");
    setShowInvite(false);
    setQuery("");
    setResults([]);
  };

  const removeKey = (key: string) => {
    onChange(value.filter((v) => v.clientKey !== key));
  };

  const qTrim = query.trim();
  const showNoResultsDropdown = qTrim.length >= 2 && !searching && results.length === 0;

  return (
    <div className="sm:col-span-2">
      <p className={labelClass}>
        Tag other performers{" "}
        <span className="font-normal normal-case tracking-normal text-zinc-600">
          (optional — max {MAX_TAGGED})
        </span>
      </p>

      {value.length > 0 ? (
        <div className="mb-3 flex flex-wrap gap-2">
          {value.map((p) => (
            <span
              key={p.clientKey}
              className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] py-1 pl-1 pr-2 text-xs text-zinc-200"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--ml-gold)]/30 bg-gradient-to-br from-violet-900/80 to-indigo-950 text-[10px] font-semibold text-zinc-100">
                {p.kind === "registered" && p.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  initials(p.name)
                )}
              </span>
              <span className="max-w-[140px] truncate font-medium">{p.name}</span>
              {p.kind === "registered" ? (
                <span className="text-emerald-400" title="On PinnacleMagic">
                  ✓
                </span>
              ) : (
                <span className="text-[var(--ml-gold)]" title="Invited by email">
                  ✉
                </span>
              )}
              <button
                type="button"
                onClick={() => removeKey(p.clientKey)}
                className="ml-0.5 text-zinc-500 transition hover:text-red-400"
                aria-label={`Remove ${p.name}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-zinc-500">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M21 21l-4.35-4.35M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <input
          type="search"
          className={`${inputClass} pl-10`}
          placeholder="Search for a magician on PinnacleMagic..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowInvite(false);
          }}
          disabled={value.length >= MAX_TAGGED}
          autoComplete="off"
        />
        {(searching || results.length > 0 || showNoResultsDropdown) && qTrim.length >= 2 && value.length < MAX_TAGGED ? (
          <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-white/10 bg-zinc-900 shadow-xl">
            {searching ? (
              <div className="px-4 py-3 text-xs text-zinc-500">Searching...</div>
            ) : results.length > 0 ? (
              <ul className="max-h-64 overflow-auto py-1">
                {results.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-white/10"
                      onClick={() => addRegistered(r)}
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-gradient-to-br from-violet-900 to-indigo-950 text-xs font-semibold">
                        {r.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={r.avatar_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          initials(r.display_name ?? "M")
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-zinc-100">
                          {r.display_name ?? "Magician"}
                        </span>
                        {r.location?.trim() ? (
                          <span className="block truncate text-xs text-zinc-500">{r.location}</span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="space-y-3 px-4 py-3">
                <p className="text-sm text-zinc-300">
                  Can&apos;t find <span className="font-medium text-zinc-100">{qTrim}</span> on PinnacleMagic?
                </p>
                {!showInvite ? (
                  <button
                    type="button"
                    onClick={() => {
                      setShowInvite(true);
                      setInviteName(qTrim);
                    }}
                    className="rounded-lg border border-[var(--ml-gold)]/40 bg-[var(--ml-gold)]/10 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--ml-gold)] transition hover:bg-[var(--ml-gold)]/15"
                  >
                    Invite them to join
                  </button>
                ) : (
                  <div className="rounded-lg border border-white/10 bg-black/30 p-3 space-y-2">
                    <div>
                      <label className="mb-1 block text-[10px] font-medium uppercase tracking-widest text-zinc-500">
                        Their name
                      </label>
                      <input
                        className={inputClass}
                        value={inviteName}
                        onChange={(e) => setInviteName(e.target.value)}
                        placeholder="Name"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-medium uppercase tracking-widest text-zinc-500">
                        Email
                      </label>
                      <input
                        type="email"
                        className={inputClass}
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="performer@email.com"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => addInvite()}
                      disabled={!inviteName.trim() || !inviteEmail.includes("@")}
                      className="w-full rounded-lg border border-[var(--ml-gold)]/45 bg-[var(--ml-gold)]/15 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--ml-gold)] transition hover:bg-[var(--ml-gold)]/25 disabled:opacity-50"
                    >
                      Send invite and tag
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}
      </div>
      <p className="mt-1.5 text-[11px] text-zinc-600">
        Registered magicians get an in-app notification. Others receive an email to claim a free profile.
      </p>
    </div>
  );
}
