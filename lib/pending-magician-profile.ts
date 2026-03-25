/** localStorage key for wizard data when email verification is required */
export const PENDING_MAGICIAN_PROFILE_KEY = "pending_profile";

export type PendingMagicianProfileV1 = {
  displayName: string;
  handle: string;
  email: string;
  location: string;
  age: string;
  shortBio: string;
  fullBio: string;
  selectedTags: string[];
  availableFor: string;
  credentials: string[];
  instagram: string;
  tiktok: string;
  youtube: string;
  website: string;
  showreelUrl: string;
  accountType: "magician";
  v: 1;
};

/** Serializable venue row for pending signup (matches create-profile payload). */
export type PendingVenuePayloadV1 = {
  name: string;
  city: string;
  state: string | null;
  venue_type: string | null;
  capacity: number | null;
  established_year: null;
  description: string;
  contact_email: string;
  tags: string[];
};

export type PendingFanProfileV1 = {
  v: 1;
  accountType: "fan";
  display_name: string;
  email: string;
};

export type PendingVenueProfileV1 = {
  v: 1;
  accountType: "venue";
  venuePayload: PendingVenuePayloadV1;
};

export type PendingProfileV1 =
  | PendingMagicianProfileV1
  | PendingFanProfileV1
  | PendingVenueProfileV1;

export function parsePendingProfile(raw: string | null): PendingProfileV1 | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as PendingProfileV1;
    if (!p || typeof p !== "object" || (p as { v?: unknown }).v !== 1)
      return null;
    const at = (p as { accountType?: string }).accountType;
    if (at === "magician" || at === "fan" || at === "venue") return p;
    return null;
  } catch {
    return null;
  }
}
