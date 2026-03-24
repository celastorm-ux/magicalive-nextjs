"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

/**
 * Marks the signed-in user online and keeps `last_seen` fresh while the app is open.
 * Uses a server route for tab-close / unload so `is_online` clears reliably.
 */
export function UserPresence() {
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded) return;
    const staleCutoff = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    void supabase
      .from("profiles")
      .update({ is_online: false })
      .lt("last_seen", staleCutoff)
      .eq("is_online", true);
  }, [isLoaded]);

  useEffect(() => {
    if (!isLoaded || !user?.id) return;

    const uid = user.id;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const markOnline = async () => {
      if (!isLoaded || !user || !user.id) return;
      console.log("Setting user online:", uid);
      const now = new Date().toISOString();
      await supabase
        .from("profiles")
        .update({ is_online: true, last_seen: now })
        .eq("id", uid);
      window.dispatchEvent(
        new CustomEvent("ml:presence-online", { detail: { id: uid } }),
      );
    };

    const pulseLastSeen = async () => {
      if (!isLoaded || !user || !user.id) return;
      const now = new Date().toISOString();
      await supabase
        .from("profiles")
        .update({ last_seen: now })
        .eq("id", uid);
    };

    const sendOfflineBeacon = () => {
      if (!isLoaded || !user || !user.id) return;
      try {
        const payload = JSON.stringify({ id: uid });
        const blob = new Blob([payload], { type: "application/json" });
        navigator.sendBeacon("/api/set-offline", blob);
      } catch {
        /* ignore */
      }
    };

    void markOnline();

    intervalId = setInterval(() => {
      void pulseLastSeen();
    }, 30_000);

    const onBeforeUnload = () => sendOfflineBeacon();
    const onPageHide = () => sendOfflineBeacon();

    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      if (intervalId) clearInterval(intervalId);
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("pagehide", onPageHide);
      sendOfflineBeacon();
    };
  }, [isLoaded, user?.id]);

  return null;
}
