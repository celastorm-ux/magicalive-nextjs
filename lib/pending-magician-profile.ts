/** localStorage key for magician wizard data when email verification is required */
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
