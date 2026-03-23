"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function ProfileRouterPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      router.replace("/sign-in");
      return;
    }
    void (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("account_type")
        .eq("id", String(user.id))
        .maybeSingle();
      const t = data?.account_type as string | undefined;
      if (t === "magician") {
        router.replace(`/profile/magician?id=${encodeURIComponent(user.id)}`);
        return;
      }
      if (t === "fan") {
        router.replace("/profile/fan");
        return;
      }
      if (t === "venue") {
        router.replace("/profile/venue");
        return;
      }
      const email = user.primaryEmailAddress?.emailAddress;
      if (email) {
        const { data: v } = await supabase
          .from("venues")
          .select("id")
          .eq("contact_email", email)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (v?.id) {
          router.replace(
            `/profile/venue?id=${encodeURIComponent(String(v.id))}`,
          );
          return;
        }
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
