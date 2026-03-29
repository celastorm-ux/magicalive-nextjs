export function formatTime(time: string): string {
  if (!time) return "";

  const [hourStr, minutePart = "00"] = time.trim().split(":");
  const minuteStr = (minutePart || "00").slice(0, 2);
  const hour = parseInt(hourStr ?? "", 10);

  if (Number.isNaN(hour)) return time.trim();

  const period = hour >= 12 ? "PM" : "AM";
  const standardHour = hour % 12 || 12;
  const minute = minuteStr.padStart(2, "0");

  return `${standardHour}:${minute} ${period}`;
}

export function formatLastSeen(lastSeen: string): string {
  const diff = Date.now() - new Date(lastSeen).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 2) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}