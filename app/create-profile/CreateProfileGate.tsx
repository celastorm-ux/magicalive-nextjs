"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function CreateProfileGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [allowWizard, setAllowWizard] = useState(false);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }
    if (!user) {
      router.replace(
        `/sign-up?redirect_url=${encodeURIComponent("/create-profile")}`,
      );
      return;
    }

    let cancelled = false;

    void (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, account_type")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (data) {
        router.replace("/profile");
        return;
      }

      setAllowWizard(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, user, router]);

  if (!isLoaded || !user) {
    return (
      <div className="flex min-h-dvh flex-1 flex-col items-center justify-center gap-4 bg-black px-4 text-center text-zinc-400">
        <span
          className="inline-block size-10 animate-spin rounded-full border-2 border-[var(--ml-gold)]/30 border-t-[var(--ml-gold)]"
          aria-hidden
        />
        <p className="text-sm">Checking your account…</p>
      </div>
    );
  }

  if (!allowWizard) {
    return (
      <div className="flex min-h-dvh flex-1 flex-col items-center justify-center gap-4 bg-black px-4 text-center text-zinc-400">
        <span
          className="inline-block size-10 animate-spin rounded-full border-2 border-[var(--ml-gold)]/30 border-t-[var(--ml-gold)]"
          aria-hidden
        />
        <p className="text-sm">Loading profile wizard…</p>
      </div>
    );
  }

  return <>{children}</>;
}
