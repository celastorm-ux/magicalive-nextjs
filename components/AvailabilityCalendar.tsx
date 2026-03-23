"use client";

import { useEffect, useMemo, useState } from "react";
import { CLASSES } from "@/lib/constants";
import { supabase } from "@/lib/supabase";

type AvailabilityRow = { date: string; is_available: boolean };

type AvailabilityCalendarProps = {
  magicianId: string;
  isOwner: boolean;
  onRequestBooking?: (date: string) => void;
};

function ymd(d: Date) {
  return d.toISOString().split("T")[0]!;
}

/** Map only includes dates with a row in DB: true = available, false = unavailable. Absent key = neutral. */
export function AvailabilityCalendar({
  magicianId,
  isOwner,
  onRequestBooking,
}: AvailabilityCalendarProps) {
  const [monthStart, setMonthStart] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [availability, setAvailability] = useState<Record<string, boolean>>({});
  const [showDates, setShowDates] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const range = useMemo(() => {
    const first = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1);
    const last = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
    return { first, last };
  }, [monthStart]);

  useEffect(() => {
    if (!magicianId) return;
    void (async () => {
      setLoading(true);
      const firstStr = ymd(range.first);
      const lastStr = ymd(range.last);

      const { data: av } = await supabase
        .from("availability")
        .select("date, is_available")
        .eq("magician_id", magicianId)
        .gte("date", firstStr)
        .lte("date", lastStr);

      const { data: sh } = await supabase
        .from("shows")
        .select("date")
        .eq("magician_id", magicianId)
        .gte("date", firstStr)
        .lte("date", lastStr);

      const map: Record<string, boolean> = {};
      for (const row of (av ?? []) as AvailabilityRow[]) map[row.date] = row.is_available;
      setAvailability(map);
      setShowDates(new Set((sh ?? []).map((s: { date: string }) => s.date)));
      setLoading(false);
    })();
  }, [magicianId, range.first, range.last]);

  const days = useMemo(() => {
    const firstDayIdx = range.first.getDay(); // 0 sunday
    const totalDays = range.last.getDate();
    const slots: Array<Date | null> = [];
    for (let i = 0; i < firstDayIdx; i++) slots.push(null);
    for (let d = 1; d <= totalDays; d++) slots.push(new Date(range.first.getFullYear(), range.first.getMonth(), d));
    while (slots.length % 7 !== 0) slots.push(null);
    return slots;
  }, [range.first, range.last]);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  /** Cycle: neutral → available → unavailable → neutral */
  const toggleDay = async (dateStr: string) => {
    if (!isOwner) return;
    const current = availability[dateStr];

    if (current === undefined) {
      await supabase
        .from("availability")
        .upsert({ magician_id: magicianId, date: dateStr, is_available: true }, { onConflict: "magician_id,date" });
      setAvailability((prev) => ({ ...prev, [dateStr]: true }));
    } else if (current === true) {
      await supabase
        .from("availability")
        .upsert({ magician_id: magicianId, date: dateStr, is_available: false }, { onConflict: "magician_id,date" });
      setAvailability((prev) => ({ ...prev, [dateStr]: false }));
    } else {
      await supabase.from("availability").delete().eq("magician_id", magicianId).eq("date", dateStr);
      setAvailability((prev) => {
        const next = { ...prev };
        delete next[dateStr];
        return next;
      });
    }
  };

  const markWholeMonth = async (isAvailable: boolean) => {
    const rows: Array<{ magician_id: string; date: string; is_available: boolean }> = [];
    for (let d = 1; d <= range.last.getDate(); d++) {
      const date = new Date(range.first.getFullYear(), range.first.getMonth(), d);
      if (date < today) continue;
      rows.push({ magician_id: magicianId, date: ymd(date), is_available: isAvailable });
    }
    if (!rows.length) return;
    await supabase.from("availability").upsert(rows, { onConflict: "magician_id,date" });
    setAvailability((prev) => {
      const next = { ...prev };
      for (const r of rows) next[r.date] = isAvailable;
      return next;
    });
  };

  const clearWholeMonth = async () => {
    const firstStr = ymd(range.first);
    const lastStr = ymd(range.last);
    await supabase
      .from("availability")
      .delete()
      .eq("magician_id", magicianId)
      .gte("date", firstStr)
      .lte("date", lastStr);
    setAvailability((prev) => {
      const next = { ...prev };
      for (let d = 1; d <= range.last.getDate(); d++) {
        delete next[ymd(new Date(range.first.getFullYear(), range.first.getMonth(), d))];
      }
      return next;
    });
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonthStart(new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1))}
          className={CLASSES.btnSecondarySm}
        >
          ←
        </button>
        <h3 className="ml-font-heading text-xl text-zinc-100">
          {monthStart.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </h3>
        <button
          type="button"
          onClick={() => setMonthStart(new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1))}
          className={CLASSES.btnSecondarySm}
        >
          →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wider text-zinc-500">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1">
        {days.map((d, i) => {
          if (!d) return <div key={`empty-${i}`} className="h-12 rounded-lg bg-transparent" />;
          const dateStr = ymd(d);
          const past = d < today;
          const hasShow = showDates.has(dateStr);
          const val = availability[dateStr];
          const isNeutral = val === undefined;
          const base = isNeutral
            ? "bg-zinc-800/35 text-zinc-300"
            : val === true
              ? "bg-emerald-600/25 text-emerald-100"
              : "bg-red-600/25 text-red-100";
          const clickable = !past && (isOwner || val === true);
          return (
            <button
              key={dateStr}
              type="button"
              disabled={!clickable}
              onClick={() => {
                if (isOwner) void toggleDay(dateStr);
                else onRequestBooking?.(dateStr);
              }}
              className={`relative flex h-12 flex-col items-center justify-center rounded-lg border text-sm transition ${base} ${
                hasShow ? "border-[var(--ml-gold)]/70" : "border-white/10"
              } ${past ? "cursor-not-allowed bg-zinc-900/50 text-zinc-600" : clickable ? "hover:border-[var(--ml-gold)]/40" : "cursor-default"}`}
            >
              <span className="leading-none">{d.getDate()}</span>
              {!past && val === true ? (
                <span className="mt-0.5 text-[11px] font-semibold leading-none text-emerald-400" aria-hidden>
                  ✓
                </span>
              ) : null}
              {!past && val === false ? (
                <span className="mt-0.5 text-[11px] font-semibold leading-none text-red-400" aria-hidden>
                  ✕
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {loading ? <p className="mt-3 text-xs text-zinc-600">Loading availability…</p> : null}

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-zinc-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-zinc-600/80" />
          No preference set
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-emerald-500/70" />
          Available for bookings
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-red-500/70" />
          Unavailable
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 shrink-0 rounded border border-[var(--ml-gold)]/80" />
          Has show
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 shrink-0 rounded bg-zinc-800" />
          Past
        </span>
      </div>

      {isOwner ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => void markWholeMonth(true)} className={CLASSES.btnPrimarySm}>
            Mark whole month available
          </button>
          <button type="button" onClick={() => void markWholeMonth(false)} className={CLASSES.btnSecondarySm}>
            Mark whole month unavailable
          </button>
          <button
            type="button"
            onClick={() => void clearWholeMonth()}
            className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-400 transition hover:border-zinc-500/40 hover:text-zinc-200"
          >
            Clear whole month
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => onRequestBooking?.(ymd(today))} className={`${CLASSES.btnPrimarySm} mt-4`}>
          Request booking
        </button>
      )}
    </div>
  );
}
