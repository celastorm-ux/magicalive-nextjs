"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect } from "react";

export default function PresenceTracker() {
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded || !user?.id) return;

    void fetch("/api/presence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, online: true }),
    });

    const interval = setInterval(() => {
      void fetch("/api/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, online: true }),
      });
    }, 30000);

    const handleUnload = () => {
      navigator.sendBeacon(
        "/api/presence",
        JSON.stringify({ userId: user.id, online: false }),
      );
    };
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [isLoaded, user?.id]);

  return null;
}