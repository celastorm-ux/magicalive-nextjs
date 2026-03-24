/**
 * Human-readable presence / last activity for magician profiles.
 */
export function formatLastSeen(
  lastSeen: string | null | undefined,
  isOnline: boolean,
): string {
  if (isOnline) return "Online now";

  if (lastSeen == null || String(lastSeen).trim() === "") {
    return "Never active";
  }

  const dt = new Date(lastSeen);
  if (Number.isNaN(dt.getTime())) {
    return "Never active";
  }

  const ms = Date.now() - dt.getTime();
  if (ms < 0) return "Never active";

  const sec = Math.floor(ms / 1000);
  if (sec < 60) return "Online now";

  const min = Math.floor(ms / (1000 * 60));
  if (min < 60) {
    return `${Math.max(1, min)}m ago`;
  }

  const h = Math.floor(ms / (1000 * 60 * 60));
  if (h < 24) {
    return `${Math.max(1, h)}h ago`;
  }

  const d = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (d < 7) {
    return `${Math.max(1, d)}d ago`;
  }

  const weeks = Math.floor(d / 7);
  return `${Math.max(1, weeks)} week${weeks === 1 ? "" : "s"} ago`;
}
