"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function CreateProfileCompletePage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;

    if (!user?.id) {
      router.replace("/create-profile");
      return;
    }

    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.warn("create-profile/complete profile check:", error.message);
        router.replace("/create-profile");
        return;
      }

      if (data?.id) {
        router.replace("/profile");
        return;
      }

      router.replace("/create-profile");
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, user?.id, router]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-black px-4 text-zinc-400">
      <p className="text-sm">Finishing sign-in…</p>
    </div>
  );
}
