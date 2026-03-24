"use client";

import { useEffect } from "react";

export default function PresenceCleanupTrigger() {
  useEffect(() => {
    void fetch("/api/presence/cleanup", { method: "POST" });
  }, []);

  return null;
}