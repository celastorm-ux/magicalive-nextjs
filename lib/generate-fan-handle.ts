/**
 * Fan handle: lowercase slug from name + random 4-digit suffix (e.g. sarahk2847).
 */
export function generateFanHandle(displayName: string): string {
  const slug =
    displayName
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .replace(/[^a-z0-9]+/g, "")
      .slice(0, 20) || "fan";
  const n = Math.floor(1000 + Math.random() * 9000);
  return `${slug}${n}`;
}
