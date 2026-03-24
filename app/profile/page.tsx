"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createClerkSupabaseClient } from "@/lib/supabase";

export default function ProfileRouterPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      router.replace("/sign-in");
      return;
    }
    console.log("Current user id:", user.id);
    void (async () => {
      const client = await createClerkSupabaseClient(getToken);
      const { data: profile, error } = await client
        .from("profiles")
        .select("account_type")
        .eq("id", String(user.id))
        .maybeSingle();

      console.log("Profile found:", profile, error);

      if (error) {
        console.warn("Profile router Supabase error:", error);
      }

      if (!profile) {
        router.replace("/create-profile");
        return;
      }

      const t = profile.account_type as string | undefined;
      const uid = encodeURIComponent(user.id);

      if (t === "magician") {
        router.replace(`/profile/magician?id=${uid}`);
        return;
      }
      if (t === "fan") {
        router.replace(`/profile/fan?id=${uid}`);
        return;
      }
      if (t === "venue") {
        const email = user.primaryEmailAddress?.emailAddress;
        if (email) {
          const { data: vRow } = await client
            .from("venues")
            .select("id")
            .eq("contact_email", email)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (vRow?.id) {
            router.replace(`/profile/venue?id=${encodeURIComponent(String(vRow.id))}`);
            return;
          }
        }
        router.replace("/profile/venue");
        return;
      }

      router.replace("/create-profile");
    })();
  }, [isLoaded, user, router, getToken]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black text-zinc-400">
      <span
        className="inline-block size-10 animate-spin rounded-full border-2 border-[var(--ml-gold)]/30 border-t-[var(--ml-gold)]"
        aria-hidden
      />
      <p className="text-sm">Loading your profile…</p>
    </div>
  );
}
