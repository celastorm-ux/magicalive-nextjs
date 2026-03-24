"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function ProfileRouterPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  useEffect(() => {
    console.log("Profile router - isLoaded:", isLoaded);
    console.log("Profile router - user:", user?.id);
  }, [isLoaded, user?.id]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      router.replace("/sign-in");
      return;
    }
    console.log("Current user id:", user.id);
    void (async () => {
      console.log("Fetching profile for id:", user.id);
      const { data, error } = await supabase
        .from("profiles")
        .select("account_type")
        .eq("id", String(user.id))
        .maybeSingle();

      console.log("Supabase result:", data, error);
      console.log("Account type:", data?.account_type);

      if (error) {
        console.warn("Profile router Supabase error:", error);
      }

      if (!data) {
        router.replace("/create-profile");
        return;
      }

      const t = data.account_type as string | undefined;
      const uid = encodeURIComponent(user.id);

      if (t === "magician") {
        const dest = `/profile/magician?id=${uid}`;
        console.log("Redirecting to:", dest);
        router.replace(dest);
        return;
      }
      if (t === "fan") {
        router.replace(`/profile/fan?id=${uid}`);
        return;
      }
      if (t === "venue") {
        const email = user.primaryEmailAddress?.emailAddress;
        if (email) {
          const { data: vRow } = await supabase
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
  }, [isLoaded, user, router]);

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
