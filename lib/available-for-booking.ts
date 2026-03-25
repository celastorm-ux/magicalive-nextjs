/**
 * Directory filters: URL query tokens + ilike substrings against profiles.available_for.
 * Profile forms store the full labels (MAGICIAN_AVAILABLE_FOR_OPTIONS) so tokens match via partial ilike.
 */
export const BOOKING_DIRECTORY_OPTIONS = [
  { token: "", label: "All bookings" },
  { token: "Corporate", label: "Corporate events" },
  { token: "Wedding", label: "Weddings" },
  { token: "Private", label: "Private parties" },
  { token: "Festival", label: "Festivals" },
  { token: "Theater", label: "Theater / stage" },
  { token: "Lecture", label: "Lectures and workshops" },
] as const;

export type BookingDirectoryToken = (typeof BOOKING_DIRECTORY_OPTIONS)[number]["token"];

export function bookingDirectoryLabelForToken(token: string): string {
  const row = BOOKING_DIRECTORY_OPTIONS.find((o) => o.token === token);
  return row?.label ?? token;
}

/** Persisted on profiles.available_for — keep in sync with hire + directory filters */
export const MAGICIAN_AVAILABLE_FOR_OPTIONS = [
  "Select event types…",
  "Corporate events",
  "Weddings",
  "Private parties",
  "Festivals",
  "Theater / stage",
  "Lectures and workshops",
  "All of the above",
] as const;

/** Matches profiles who selected the last option — show them for any booking-type directory filter */
export const MAGICIAN_AVAILABLE_FOR_ALL_LABEL =
  MAGICIAN_AVAILABLE_FOR_OPTIONS[MAGICIAN_AVAILABLE_FOR_OPTIONS.length - 1];
