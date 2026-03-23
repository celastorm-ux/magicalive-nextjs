"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

export function FoundingMemberSpots({
  compact = false,
}: {
  compact?: boolean;
}) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("founding_member_count")
        .select("current_count")
        .eq("id", 1)
        .maybeSingle();
      setCount(Number(data?.current_count ?? 0));
    })();

    const ch = supabase
      .channel("founding-member-count")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "founding_member_count" },
        (payload) => {
          const next = (payload.new as { current_count?: number } | null)?.current_count;
          if (typeof next === "number") setCount(next);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(ch);
    };
  }, []);

  const remaining = useMemo(() => Math.max(0, 100 - Number(count ?? 0)), [count]);

  if (count == null) {
    return <span className="text-zinc-500">Loading Founding Member spots…</span>;
  }
  if (remaining <= 0) {
    return <span className="text-zinc-400">Founding Member spots are now closed</span>;
  }

  if (compact) {
    return (
      <span className="text-[var(--ml-gold)]">
        Join as a Founding Member — {remaining} of 100 spots remaining
      </span>
    );
  }

  return (
    <span className="text-[var(--ml-gold)]">
      Join now — {remaining} of 100 Founding Member spots remaining
    </span>
  );
}
