"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useEffect, useRef } from "react";
import { createClerkSupabaseClient } from "@/lib/supabase";

/**
 * Marks the signed-in user online and keeps `last_seen` fresh while the app is open.
 * Uses a server route for tab-close / unload so `is_online` clears reliably.
 */
export function UserPresence() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    userIdRef.current = user?.id ?? null;
  }, [user?.id]);

  useEffect(() => {
    if (!isLoaded || !user?.id) return;

    const uid = user.id;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    const markOnline = async () => {
      if (!isLoaded || !user || !user.id) return;
      console.log("Setting user online:", uid);
      const db = await createClerkSupabaseClient(getToken);
      const now = new Date().toISOString();
      await db
        .from("profiles")
        .update({ is_online: true, last_seen: now })
        .eq("id", uid);
    };

    const pulseLastSeen = async () => {
      if (!isLoaded || !user || !user.id) return;
      const db = await createClerkSupabaseClient(getToken);
      const now = new Date().toISOString();
      await db
        .from("profiles")
        .update({ last_seen: now, is_online: true })
        .eq("id", uid);
    };

    const markOfflineClient = async () => {
      if (!isLoaded || !user || !user.id) return;
      try {
        const db = await createClerkSupabaseClient(getToken);
        await db.from("profiles").update({ is_online: false }).eq("id", uid);
      } catch {
        /* ignore */
      }
    };

    const markOfflineBeacon = () => {
      if (!isLoaded || !user || !user.id) return;
      try {
        void fetch("/api/presence/offline", {
          method: "POST",
          keepalive: true,
          credentials: "same-origin",
        });
      } catch {
        /* ignore */
      }
    };

    void markOnline();

    if (!isLoaded || !user || !user.id) return;
    intervalId = setInterval(() => {
      if (!cancelled && userIdRef.current) void pulseLastSeen();
    }, 60_000);

    if (!isLoaded || !user || !user.id) return;
    const onBeforeUnload = () => {
      markOfflineBeacon();
      void markOfflineClient();
    };

    if (!isLoaded || !user || !user.id) return;
    const onPageHide = () => {
      markOfflineBeacon();
      void markOfflineClient();
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("pagehide", onPageHide);
      markOfflineBeacon();
      void markOfflineClient();
    };
  }, [isLoaded, user?.id, getToken]);

  return null;
}
