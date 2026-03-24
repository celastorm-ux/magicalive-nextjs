"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { CLASSES } from "@/lib/constants";
import { supabase } from "@/lib/supabase";

const PAGE_SIZE = 20;

type NotificationRow = {
  id: string;
  recipient_id: string;
  sender_id: string | null;
  sender_name: string | null;
  sender_avatar: string | null;
  type: string;
  message: string;
  link: string;
  is_read: boolean;
  created_at: string;
};

function formatRelativeTime(iso: string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 45) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} minute${min === 1 ? "" : "s"} ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} day${day === 1 ? "" : "s"} ago`;
  const week = Math.floor(day / 7);
  if (week < 5) return `${week} week${week === 1 ? "" : "s"} ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function dateBucket(d: Date, now = new Date()): "Today" | "Yesterday" | "This week" | "Earlier" {
  const today = startOfLocalDay(now);
  const y = new Date(today);
  y.setDate(y.getDate() - 1);
  const day = startOfLocalDay(d);
  if (day.getTime() === today.getTime()) return "Today";
  if (day.getTime() === y.getTime()) return "Yesterday";
  const monday = new Date(today);
  const dow = (today.getDay() + 6) % 7;
  monday.setDate(today.getDate() - dow);
  if (day >= monday) return "This week";
  return "Earlier";
}

const SYSTEM_TYPES = new Set(["new_article_published", "article_rejected"]);

export default function NotificationsPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const offsetRef = useRef(0);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(msg);
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 4200);
  }, []);

  const fetchPage = useCallback(
    async (reset: boolean) => {
      const userId = user?.id;
      if (!userId) return;

      console.log("Current user id type:", typeof userId, "value:", userId);
      console.log("Fetching notifications for user:", userId);

      const from = reset ? 0 : offsetRef.current;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("recipient_id", userId)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) {
        console.error("Notifications fetch error:", JSON.stringify(error));
        console.error(
          "Error details:",
          error.message,
          (error as { code?: string }).code,
          (error as { details?: string }).details,
        );
        if (reset) setItems([]);
        setHasMore(false);
        return;
      }
      const rows = (data ?? []) as NotificationRow[];
      if (reset) {
        setItems(rows);
        offsetRef.current = rows.length;
      } else {
        setItems((prev) => {
          const seen = new Set(prev.map((r) => r.id));
          const merged = [...prev];
          for (const r of rows) {
            if (!seen.has(r.id)) merged.push(r);
          }
          return merged;
        });
        offsetRef.current += rows.length;
      }
      setHasMore(rows.length === PAGE_SIZE);
    },
    [user?.id],
  );

  useEffect(() => {
    if (!isLoaded) return;
    if (!user?.id) {
      router.replace("/sign-in");
      return;
    }
    offsetRef.current = 0;
    setLoading(true);
    void (async () => {
      await fetchPage(true);
      setLoading(false);
    })();
  }, [isLoaded, user?.id, router, fetchPage]);

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;

    void (async () => {
      if (cancelled) return;
      const ch = supabase
        .channel("notifications")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `recipient_id=eq.${user.id}`,
          },
          (payload) => {
            const row = payload.new as NotificationRow;
            if (!row?.id) return;
            setItems((prev) => {
              if (prev.some((p) => p.id === row.id)) return prev;
              return [row, ...prev];
            });
            showToast("New notification");
          },
        )
        .subscribe();
      channelRef.current = ch;
    })();

    return () => {
      cancelled = true;
      void channelRef.current?.unsubscribe();
      channelRef.current = null;
    };
  }, [user?.id, showToast]);

  const grouped = useMemo(() => {
    const order: Array<"Today" | "Yesterday" | "This week" | "Earlier"> = [
      "Today",
      "Yesterday",
      "This week",
      "Earlier",
    ];
    const map = new Map<string, NotificationRow[]>();
    for (const k of order) map.set(k, []);
    const now = new Date();
    for (const n of items) {
      const b = dateBucket(new Date(n.created_at), now);
      map.get(b)!.push(n);
    }
    return order.map((label) => ({ label, rows: map.get(label)! })).filter((g) => g.rows.length > 0);
  }, [items]);

  const markAllRead = async () => {
    if (!user?.id || markingAll) return;
    setMarkingAll(true);
    await supabase.from("notifications").update({ is_read: true }).eq("recipient_id", user.id).eq("is_read", false);
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setMarkingAll(false);
  };

  const deleteAll = async () => {
    if (!user?.id || deletingAll) return;
    if (!window.confirm("Delete all notifications? This cannot be undone.")) return;
    setDeletingAll(true);
    await supabase.from("notifications").delete().eq("recipient_id", user.id);
    setItems([]);
    offsetRef.current = 0;
    setHasMore(false);
    setDeletingAll(false);
  };

  const loadMore = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    await fetchPage(false);
    setLoadingMore(false);
  };

  const onRowClick = async (n: NotificationRow) => {
    if (!n.is_read) {
      await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
    }
    const href = n.link.startsWith("/") ? n.link : `/${n.link}`;
    router.push(href);
  };

  if (!isLoaded || !user?.id) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-black text-zinc-500">
        Loading…
      </div>
    );
  }

  return (
    <div className="relative min-h-dvh bg-black text-zinc-100">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10"
      >
        <div className="absolute left-1/2 top-[-120px] h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,var(--ml-gold-glow-strong),rgba(0,0,0,0)_62%)] blur-2xl" />
        <div
          className="absolute inset-0"
          style={{ background: "var(--ml-gradient-vignette)" }}
        />
      </div>

      {toast ? (
        <div
          className="fixed left-1/2 top-6 z-[100] -translate-x-1/2 rounded-full border border-[var(--ml-gold)]/35 bg-zinc-950/95 px-5 py-2.5 text-sm text-[#f0e8dc] shadow-lg backdrop-blur-md"
          role="status"
        >
          {toast}
        </div>
      ) : null}

      <div className={`${CLASSES.section} pb-24 pt-10`}>
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              href="/"
              className="text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-500 transition hover:text-[var(--ml-gold)]"
            >
              ← Home
            </Link>
            <h1 className="ml-font-heading mt-4 text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">
              Notifications
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void markAllRead()}
              disabled={markingAll || !items.some((n) => !n.is_read)}
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-zinc-200 transition hover:border-[var(--ml-gold)]/30 hover:bg-white/10 disabled:opacity-40"
            >
              Mark all as read
            </button>
            <button
              type="button"
              onClick={() => void deleteAll()}
              disabled={deletingAll || items.length === 0}
              className="rounded-xl border border-red-500/35 bg-red-500/5 px-4 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/15 disabled:opacity-40"
            >
              Delete all
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-zinc-500">Loading notifications…</p>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-8 py-16 text-center">
            <p className="text-sm text-zinc-500">No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-10">
            {grouped.map((group) => (
              <section key={group.label}>
                <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  {group.label}
                </h2>
                <ul className="space-y-2">
                  {group.rows.map((n) => {
                    const system = SYSTEM_TYPES.has(n.type);
                    return (
                      <li key={n.id}>
                        <button
                          type="button"
                          onClick={() => void onRowClick(n)}
                          className={`flex w-full items-start gap-3 rounded-xl border py-3 pl-4 pr-4 text-left transition hover:border-white/25 ${
                            n.is_read
                              ? "border-white/10 bg-white/[0.02]"
                              : "border-[var(--ml-gold)]/50 border-l-4 border-l-[var(--ml-gold)] bg-[var(--ml-gold-soft)]/50 pl-[13px]"
                          }`}
                        >
                          <span className="relative mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/5">
                            {system || (!n.sender_avatar && !n.sender_id) ? (
                              <span className="ml-font-heading text-[11px] font-semibold leading-none text-[var(--ml-gold)]">
                                M<span className="italic">L</span>
                              </span>
                            ) : n.sender_avatar ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={n.sender_avatar} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-xs font-medium text-zinc-400">
                                {(n.sender_name || "?").slice(0, 2).toUpperCase()}
                              </span>
                            )}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm leading-snug text-[#f0e8dc]">{n.message}</p>
                            {n.type === "new_message" ? (
                              <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
                                This message was sent to your contact email. Reply directly from your inbox.
                              </p>
                            ) : null}
                            <p className="mt-1 text-xs text-zinc-500">{formatRelativeTime(n.created_at)}</p>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}

            {hasMore ? (
              <div className="flex justify-center pt-4">
                <button
                  type="button"
                  onClick={() => void loadMore()}
                  disabled={loadingMore}
                  className={CLASSES.btnSecondary}
                >
                  {loadingMore ? "Loading…" : "Load more"}
                </button>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
