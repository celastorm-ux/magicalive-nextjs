"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { SignOutButton, useAuth, useUser } from "@clerk/nextjs";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { CLASSES } from "@/lib/constants";
import { createClerkSupabaseClient, supabase } from "@/lib/supabase";

const NAV_ITEMS = [
  { label: "Home", href: "/" },
  { label: "Magicians", href: "/magicians" },
  { label: "Events", href: "/events" },
  { label: "Venues", href: "/venues" },
  { label: "Articles", href: "/articles" },
] as const;

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isSignedIn } = useUser();
  const { getToken } = useAuth();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isMagician, setIsMagician] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingBookingCount, setPendingBookingCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);
  const [profileDisplayName, setProfileDisplayName] = useState<string | null>(null);
  const [profileHandle, setProfileHandle] = useState<string | null>(null);
  const notifChannelRef = useRef<RealtimeChannel | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  const close = useCallback(() => setOpen(false), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);
  const closeUserMenu = useCallback(() => setUserMenuOpen(false), []);

  useEffect(() => {
    close();
    closeSearch();
    closeUserMenu();
  }, [pathname, close, closeSearch, closeUserMenu]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  useEffect(() => {
    if (!searchOpen) return;
    searchInputRef.current?.focus();
    searchInputRef.current?.select();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchOpen]);

  useEffect(() => {
    const key = "magicalive_recent_searches";
    try {
      const raw = localStorage.getItem(key);
      const parsed = raw ? (JSON.parse(raw) as string[]) : [];
      setRecentSearches(Array.isArray(parsed) ? parsed.slice(0, 5) : []);
    } catch {
      setRecentSearches([]);
    }
  }, []);

  useEffect(() => {
    const onOpen = () => setSearchOpen(true);
    window.addEventListener("ml:open-search-overlay", onOpen as EventListener);
    return () =>
      window.removeEventListener("ml:open-search-overlay", onOpen as EventListener);
  }, []);

  useEffect(() => {
    if (!userMenuOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      const el = userMenuRef.current;
      if (el && !el.contains(e.target as Node)) closeUserMenu();
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [userMenuOpen, closeUserMenu]);

  useEffect(() => {
    if (!userMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeUserMenu();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [userMenuOpen, closeUserMenu]);

  useEffect(() => {
    if (!isSignedIn || !user?.id) {
      setIsMagician(false);
      setIsAdmin(false);
      setPendingBookingCount(0);
      setProfileAvatarUrl(null);
      setProfileDisplayName(null);
      setProfileHandle(null);
      return;
    }
    void (async () => {
      const { data } = await supabase
        .from("profiles")
        .select(
          "account_type, booking_requests_count, is_admin, avatar_url, display_name, handle",
        )
        .eq("id", user.id)
        .maybeSingle();
      setIsMagician(data?.account_type === "magician");
      setIsAdmin(Boolean((data as { is_admin?: boolean | null } | null)?.is_admin));
      setPendingBookingCount(Number((data as { booking_requests_count?: number } | null)?.booking_requests_count ?? 0));
      const row = data as {
        avatar_url?: string | null;
        display_name?: string | null;
        handle?: string | null;
      } | null;
      setProfileAvatarUrl(row?.avatar_url?.trim() || null);
      setProfileDisplayName(row?.display_name?.trim() || null);
      setProfileHandle(row?.handle?.trim() || null);
    })();
  }, [isSignedIn, user?.id]);

  useEffect(() => {
    if (!isSignedIn || !user?.id) {
      setUnreadCount(0);
      void notifChannelRef.current?.unsubscribe();
      notifChannelRef.current = null;
      return;
    }

    let cancelled = false;

    void (async () => {
      const client = await createClerkSupabaseClient(getToken);
      const refetchCount = async () => {
        const { count } = await client
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("recipient_id", user.id)
          .eq("is_read", false);
        if (!cancelled) setUnreadCount(count ?? 0);
      };

      await refetchCount();

      const ch = client
        .channel("notifications")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `recipient_id=eq.${user.id}`,
          },
          () => void refetchCount(),
        )
        .subscribe();
      notifChannelRef.current = ch;
    })();

    return () => {
      cancelled = true;
      void notifChannelRef.current?.unsubscribe();
      notifChannelRef.current = null;
    };
  }, [isSignedIn, user?.id, getToken]);

  const clerkFallbackName =
    user?.fullName || user?.firstName || user?.username || "User";
  const headerDisplayName = profileDisplayName || clerkFallbackName;
  const headerHandleLine =
    profileHandle != null && profileHandle !== ""
      ? `@${profileHandle}`
      : user?.username
        ? `@${user.username}`
        : null;

  const runSearch = (raw: string) => {
    const q = raw.trim();
    if (!q) return;
    const next = [q, ...recentSearches.filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(
      0,
      5,
    );
    setRecentSearches(next);
    try {
      localStorage.setItem("magicalive_recent_searches", JSON.stringify(next));
    } catch {
      // ignore storage failures
    }
    setSearchOpen(false);
    setSearchQuery(q);
    router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  const removeRecent = (value: string) => {
    const next = recentSearches.filter((x) => x !== value);
    setRecentSearches(next);
    try {
      localStorage.setItem("magicalive_recent_searches", JSON.stringify(next));
    } catch {
      // ignore storage failures
    }
  };

  return (
    <header className={`relative ${CLASSES.headerSticky}`}>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-[18px] sm:px-6 lg:px-12">
        {/* Left */}
        <div className="shrink-0">
          <Link
            href="/"
            className="inline-flex shrink-0 items-center gap-0 leading-none"
          >
            <span className="ml-font-heading text-[32px] font-semibold tracking-wide text-[#ffffff]">
              Magic
            </span>
            <span className="ml-font-heading text-[32px] font-semibold tracking-wide italic text-[var(--ml-gold)]">
              alive
            </span>
          </Link>
        </div>

        {/* Center: links only */}
        <div className="hidden min-w-0 flex-1 items-center justify-center lg:flex">
          <nav className="shrink-0 items-center gap-[36px] lg:flex" aria-label="Main">
            {NAV_ITEMS.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`shrink-0 text-[12px] uppercase tracking-[0.07em] transition ${
                    active
                      ? "text-[var(--ml-gold)]"
                      : "text-zinc-400 hover:text-zinc-100"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            {!isSignedIn ? (
              <Link
                href="/for-magicians"
                className={`shrink-0 text-[12px] uppercase tracking-[0.07em] transition ${
                  isActivePath(pathname, "/for-magicians")
                    ? "text-[var(--ml-gold)]"
                    : "text-zinc-400 hover:text-zinc-100"
                }`}
              >
                For Magicians
              </Link>
            ) : null}
            {isSignedIn && isMagician ? (
              <Link
                href="/dashboard"
                className={`relative shrink-0 text-[12px] uppercase tracking-[0.07em] transition ${
                  isActivePath(pathname, "/dashboard")
                    ? "text-[var(--ml-gold)]"
                    : "text-zinc-400 hover:text-zinc-100"
                }`}
              >
                Dashboard
                {pendingBookingCount > 0 ? (
                  <span className="absolute -right-4 -top-2 inline-flex min-w-5 items-center justify-center rounded-full bg-[var(--ml-gold)] px-1.5 text-[10px] font-semibold text-black">
                    {pendingBookingCount > 9 ? "9+" : pendingBookingCount}
                  </span>
                ) : null}
              </Link>
            ) : null}
            {isSignedIn && isAdmin ? (
              <Link
                href="/admin"
                className={`shrink-0 text-[11px] uppercase tracking-[0.12em] text-zinc-600 transition hover:text-zinc-400 ${
                  isActivePath(pathname, "/admin") ? "text-zinc-400" : ""
                }`}
              >
                Admin
              </Link>
            ) : null}
          </nav>
        </div>

        {/* Right */}
        <div className="flex shrink-0 items-center gap-4">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="hidden h-10 w-10 items-center justify-center rounded-lg border border-[var(--ml-gold)]/25 bg-white/5 text-[var(--ml-gold)] transition hover:border-[var(--ml-gold)]/40 hover:bg-white/10 sm:flex"
            aria-label="Open search"
          >
            ⌕
          </button>

          <div
            className={
              isSignedIn
                ? "flex shrink-0 items-center gap-4"
                : "hidden shrink-0 items-center gap-4 sm:flex"
            }
          >
            {isSignedIn ? (
              <div className="relative shrink-0" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[var(--ml-gold)] text-[11px] font-semibold transition hover:opacity-95"
                  style={{
                    backgroundColor: profileAvatarUrl ? "transparent" : "rgba(0,0,0,0.55)",
                    color: "var(--ml-gold)",
                  }}
                  aria-expanded={userMenuOpen}
                  aria-haspopup="menu"
                  aria-label="Account menu"
                >
                  {profileAvatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profileAvatarUrl}
                      alt={headerDisplayName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    getInitials(headerDisplayName)
                  )}
                </button>
                {userMenuOpen ? (
                  <div
                    role="menu"
                    className="absolute right-0 z-50 mt-2 min-w-[15.5rem] overflow-hidden py-1 shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
                    style={{
                      backgroundColor: "var(--card-bg)",
                      borderRadius: 3,
                      border: "0.5px solid var(--card-border)",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="px-3.5 pb-2.5 pt-3">
                      <p className="truncate text-sm font-medium text-[#f0ebe3]">
                        {headerDisplayName}
                      </p>
                      {headerHandleLine ? (
                        <p className="mt-0.5 truncate text-xs text-[var(--ml-gold)]/70">
                          {headerHandleLine}
                        </p>
                      ) : null}
                    </div>
                    <div className="mx-2 border-t border-white/10" aria-hidden />
                    <div className="py-1">
                      <Link
                        href="/profile"
                        role="menuitem"
                        className="block px-3.5 py-2.5 text-sm text-zinc-200 transition hover:bg-white/[0.06]"
                        onClick={closeUserMenu}
                      >
                        View profile
                      </Link>
                      {isMagician ? (
                        <Link
                          href="/dashboard"
                          role="menuitem"
                          className="block px-3.5 py-2.5 text-sm text-zinc-200 transition hover:bg-white/[0.06]"
                          onClick={closeUserMenu}
                        >
                          Dashboard
                        </Link>
                      ) : null}
                      <Link
                        href="/profile/edit"
                        role="menuitem"
                        className="block px-3.5 py-2.5 text-sm text-zinc-200 transition hover:bg-white/[0.06]"
                        onClick={closeUserMenu}
                      >
                        Edit profile
                      </Link>
                      <Link
                        href="/notifications"
                        role="menuitem"
                        className="flex items-center justify-between gap-2 px-3.5 py-2.5 text-sm text-zinc-200 transition hover:bg-white/[0.06]"
                        onClick={closeUserMenu}
                      >
                        <span>Notifications</span>
                        {unreadCount > 0 ? (
                          <span className="inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-red-600/95 px-1.5 text-[10px] font-semibold text-white">
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </span>
                        ) : null}
                      </Link>
                    </div>
                    <div className="mx-2 border-t border-white/10" aria-hidden />
                    <div className="py-1">
                      <SignOutButton>
                        <button
                          type="button"
                          role="menuitem"
                          className="block w-full px-3.5 py-2.5 text-left text-sm text-red-400/85 transition hover:bg-white/[0.06]"
                        >
                          Sign out
                        </button>
                      </SignOutButton>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-[13px] font-medium text-zinc-200 transition hover:border-white/25 hover:bg-white/10"
                >
                  Sign in
                </Link>
                <Link
                  href="/create-profile"
                  className="inline-flex items-center justify-center rounded-xl bg-[var(--ml-gold)] px-5 py-2.5 text-[13px] font-semibold text-black transition hover:bg-[var(--ml-gold-hover)]"
                >
                  <span className="hidden min-[900px]:inline">Create profile</span>
                  <span className="min-[900px]:hidden">Create</span>
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-zinc-200 transition hover:bg-white/10 lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            <span className="sr-only">Menu</span>
            {open ? (
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      <div
        className={`overflow-hidden border-b border-white/10 bg-black/95 transition-all duration-300 ${
          searchOpen ? "max-h-[360px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div
          className={`mx-auto max-w-6xl px-4 pb-6 pt-4 transition duration-300 sm:px-6 ${
            searchOpen ? "translate-y-0" : "-translate-y-2"
          }`}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSearchOpen(false);
          }}
        >
          <div className="mx-auto max-w-2xl rounded-2xl border border-white/10 bg-black/90 p-4">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ml-gold)]">
                ⌕
              </span>
              <input
                ref={searchInputRef}
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    runSearch(searchQuery);
                  }
                  if (e.key === "Escape") {
                    e.preventDefault();
                    setSearchOpen(false);
                  }
                }}
                placeholder="Search magicians, events, venues..."
                className="w-full border-b border-[var(--ml-gold)]/35 bg-transparent py-3 pl-9 pr-10 text-base text-zinc-100 placeholder:text-zinc-500 outline-none"
              />
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-zinc-500 transition hover:text-zinc-300"
                aria-label="Close search"
              >
                ×
              </button>
            </div>
            <div className="mt-4">
              <p className="text-[11px] uppercase tracking-wider text-zinc-500">Recent searches</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {recentSearches.length ? (
                  recentSearches.map((item) => (
                    <span
                      key={item}
                      className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300"
                    >
                      <button type="button" onClick={() => runSearch(item)} className="hover:text-[var(--ml-gold)]">
                        {item}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeRecent(item)}
                        className="text-zinc-500 transition hover:text-zinc-200"
                        aria-label={`Remove ${item}`}
                      >
                        ×
                      </button>
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-zinc-600">No recent searches yet.</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {open ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
            aria-hidden
            onClick={close}
          />
          <nav
            id="mobile-nav"
            className="absolute left-0 right-0 top-full z-50 border-b border-white/10 bg-black/95 px-4 py-2 shadow-xl backdrop-blur-md lg:hidden"
            aria-label="Mobile main"
          >
            <div className="mx-auto max-w-6xl">
              <div className="border-b border-white/10 py-3">
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ml-gold)]">
                    ⌕
                  </span>
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        runSearch(searchQuery);
                        close();
                      }
                    }}
                    placeholder="Search magicians, events, venues..."
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-3 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition focus:border-[var(--ml-gold)]/40"
                  />
                </div>
              </div>
              {NAV_ITEMS.map((item) => {
                const active = isActivePath(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={
                      active
                        ? CLASSES.navMobileLinkActive
                        : CLASSES.navMobileLink
                    }
                  >
                    {item.label}
                  </Link>
                );
              })}
              {!isSignedIn ? (
                <>
                  <Link
                    href="/for-magicians"
                    className="block py-4 text-base font-medium text-zinc-300"
                  >
                    For Magicians
                  </Link>
                  <Link
                    href="/sign-in"
                    className="block py-4 text-base font-medium text-[var(--ml-gold)]"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/create-profile"
                    className="block py-4 text-base font-medium text-zinc-300"
                  >
                    Create profile
                  </Link>
                </>
              ) : (
                <>
                  {isMagician ? (
                    <Link
                      href="/dashboard"
                      className="block py-4 text-base font-medium text-[var(--ml-gold)]"
                    >
                      Dashboard
                    </Link>
                  ) : null}
                  {isAdmin ? (
                    <Link href="/admin" className="block py-4 text-base font-medium text-zinc-500">
                      Admin
                    </Link>
                  ) : null}
                  <Link
                    href="/profile"
                    className="block py-4 text-base font-medium text-[var(--ml-gold)]"
                  >
                    View profile
                  </Link>
                  <Link
                    href="/profile/edit"
                    className="block py-4 text-base font-medium text-zinc-300"
                  >
                    Edit profile
                  </Link>
                  <Link
                    href="/notifications"
                    className="flex items-center justify-between gap-2 py-4 text-base font-medium text-zinc-300"
                  >
                    <span>Notifications</span>
                    {unreadCount > 0 ? (
                      <span className="inline-flex min-w-6 justify-center rounded-full bg-red-600/95 px-2 text-xs font-semibold text-white">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    ) : null}
                  </Link>
                  <SignOutButton>
                    <button
                      type="button"
                      className="block py-4 text-base font-medium text-red-400/85"
                    >
                      Sign out
                    </button>
                  </SignOutButton>
                </>
              )}
            </div>
          </nav>
        </>
      ) : null}
    </header>
  );
}
