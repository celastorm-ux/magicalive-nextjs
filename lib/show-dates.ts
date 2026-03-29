/** Show `date` column is stored as plain `YYYY-MM-DD` (no timezone). */

const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;

export function todayYmdLocal(): string {
  const t = new Date();
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, "0");
  const d = String(t.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseShowYmd(dateStr: string | null | undefined): { y: number; m: number; d: number } | null {
  if (!dateStr?.trim()) return null;
  const m = YMD.exec(dateStr.trim());
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}

/** Local calendar midnight for comparisons (upcoming vs past). */
export function localMidnightFromShowDate(dateStr: string | null | undefined): Date | null {
  const p = parseShowYmd(dateStr);
  if (!p) return null;
  const dt = new Date(p.y, p.m - 1, p.d);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

/** Full weekday + month name (en-US), no UTC shift. */
export function formatShowDateLongEnUS(dateStr: string | null | undefined): string {
  const p = parseShowYmd(dateStr);
  if (!p) return "Date TBA";
  return new Date(p.y, p.m - 1, p.d).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** Short label for compact rows (e.g. homepage table). */
export function formatShowDateShortEnUS(dateStr: string | null | undefined): string {
  const p = parseShowYmd(dateStr);
  if (!p) return "—";
  return new Date(p.y, p.m - 1, p.d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/** Medium style for profile lists. */
export function formatShowDateMediumEnUS(dateStr: string | null | undefined): string {
  const p = parseShowYmd(dateStr);
  if (!p) return "Date TBA";
  return new Date(p.y, p.m - 1, p.d).toLocaleDateString("en-US", {
    dateStyle: "medium",
  });
}

/** Days from today’s local calendar date to the show date (0 = today). Invalid → large positive. */
export function daysAheadOfTodayLocal(dateStr: string): number {
  const eventDay = localMidnightFromShowDate(dateStr);
  if (!eventDay || Number.isNaN(eventDay.getTime())) return 10000;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor((eventDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}
