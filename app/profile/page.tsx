"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

/** Redirect-only route: one loader until Next.js replaces the URL. Refs avoid duplicate Supabase/redirect work. */
export default function ProfileRouterPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const hasRedirectedUnauthedRef = useRef(false);
  const fetchStartedForUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;

    if (!user?.id) {
      if (!hasRedirectedUnauthedRef.current) {
        hasRedirectedUnauthedRef.current = true;
        router.replace("/sign-in");
      }
      return;
    }

    if (fetchStartedForUserIdRef.current === user.id) {
      return;
    }
    fetchStartedForUserIdRef.current = user.id;

    void (async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("account_type")
          .eq("id", String(user.id))
          .maybeSingle();

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
            const { data: vRow } = await supabase
              .from("venues")
              .select("id")
              .eq("contact_email", email)
              .or("is_verified.is.null,is_verified.eq.true")
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
      } catch (e) {
        console.warn("Profile router error:", e);
        router.replace("/create-profile");
      }
    })();
  }, [isLoaded, user?.id, router]);

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
