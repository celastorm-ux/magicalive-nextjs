'use client';

import { useClerk, useSignUp, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
} from "react";
import { CLASSES } from "@/lib/constants";
import { OAuthEmailDivider, SocialOAuthButtons } from "@/components/SocialOAuthButtons";
import { clerkOAuthSignUp } from "@/lib/clerk-oauth";
import { FoundingMemberSpots } from "@/components/FoundingMemberSpots";
import { generateFanHandle } from "@/lib/generate-fan-handle";
import {
  PENDING_MAGICIAN_PROFILE_KEY,
  type PendingMagicianProfileV1,
} from "@/lib/pending-magician-profile";
import { supabase } from "@/lib/supabase";
import pkg from "../../package.json";

function clerkEmailAlreadyExists(err: unknown): boolean {
  const errors = (err as { errors?: Array<{ code?: string }> })?.errors;
  return errors?.some((e) => e.code === "form_identifier_exists") ?? false;
}

function isValidEmailFormat(email: string): boolean {
  const t = email.trim();
  if (!t) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
}

type MagStep1UiError = null | { kind: "terms" } | { kind: "message"; text: string };

/** Narrow typing for `signUp.create` from `useSignUp()`. */
type ClerkSignUpClient = {
  create: (params: {
    emailAddress: string;
    password: string;
    firstName?: string;
    lastName?: string;
    unsafeMetadata?: { display_name?: string };
  }) => Promise<unknown>;
};

function resolveSignUpSessionAndUserId(
  result: unknown,
  signUpResource: unknown,
): { sessionId: string | null; userId: string | null; status: string | undefined } {
  const res = result as {
    status?: string;
    createdSessionId?: string | null;
    createdUserId?: string | null;
  };
  const su = signUpResource as {
    status?: string | null;
    createdSessionId?: string | null;
    createdUserId?: string | null;
  };
  const status = res.status ?? su.status ?? undefined;
  const sessionId = res.createdSessionId ?? su.createdSessionId ?? null;
  const userId = res.createdUserId ?? su.createdUserId ?? null;
  return { sessionId, userId, status };
}

function unverifiedFieldsIncludeEmailAddress(fields: unknown): boolean {
  if (!fields || !Array.isArray(fields)) return false;
  return fields.some((item) => {
    if (item === "email_address" || item === "emailAddress") return true;
    if (typeof item === "string") return item.toLowerCase().includes("email");
    if (item && typeof item === "object" && "name" in item) {
      const n = String((item as { name?: string }).name ?? "");
      return n.includes("email");
    }
    return false;
  });
}

const signInHintClass = "mt-2 block text-[11px] text-zinc-500";
const signInLinkClass =
  "font-medium text-[var(--ml-gold)] no-underline hover:underline";

const TOTAL = 6;
const WIDTHS = ["0%", "8%", "25%", "42%", "58%", "75%", "92%"] as const;

const SPECIALTY_TAGS = [
  "Close-up magic",
  "Stage illusions",
  "Mentalism",
  "Card magic",
  "Coin magic",
  "Escape artistry",
  "Comedy magic",
  "Children's magic",
  "Corporate events",
  "Parlor magic",
  "Strolling magic",
  "Street magic",
  "Virtual shows",
] as const;

const EVENT_TYPES = [
  "Select event types…",
  "Corporate events",
  "Private parties",
  "Theater / stage",
  "Weddings",
  "Festivals",
  "All of the above",
] as const;

const VENUE_TYPES = [
  "Select type…",
  "Theater",
  "Lounge / bar",
  "Private club",
  "Hotel",
  "Festival venue",
  "Other",
] as const;

const MAG_STEP_LABELS = [
  "Account",
  "Identity",
  "Style",
  "Credentials",
  "Media",
  "Publish",
] as const;

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm font-normal text-zinc-100 placeholder:text-zinc-500 outline-none transition focus:border-[var(--ml-gold)]/50 focus:bg-white/10";

const labelClass =
  "mb-2 block text-[10px] font-medium uppercase tracking-widest text-zinc-500";

export default function CreateProfileClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoaded } = useUser();
  const clerk = useClerk();
  const { loaded: clerkLoaded } = clerk;
  const { signUp, setActive: setActiveFromSignUp, isLoaded: isSignUpLoaded } =
    useSignUp() as unknown as {
      signUp: ReturnType<typeof useSignUp>["signUp"];
      setActive?: (opts: { session: string }) => Promise<void>;
      isLoaded?: boolean;
    };
  const setActiveSession = setActiveFromSignUp ?? ((opts) => clerk.setActive(opts));
  const signUpLoaded =
    typeof isSignUpLoaded === "boolean" ? isSignUpLoaded : clerkLoaded;
  const typeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [magPassword, setMagPassword] = useState("");
  const [magPasswordConfirm, setMagPasswordConfirm] = useState("");
  const [magStep1Error, setMagStep1Error] = useState<MagStep1UiError>(null);
  const [magTermsAccepted, setMagTermsAccepted] = useState(false);

  const [fanPassword, setFanPassword] = useState("");
  const [fanPasswordConfirm, setFanPasswordConfirm] = useState("");
  const [fanTermsAccepted, setFanTermsAccepted] = useState(false);

  const [venuePassword, setVenuePassword] = useState("");
  const [venuePasswordConfirm, setVenuePasswordConfirm] = useState("");
  const [venueTermsAccepted, setVenueTermsAccepted] = useState(false);

  type Flow = "pick" | "magician" | "fan" | "venue";
  const [flow, setFlow] = useState<Flow>("pick");
  const [mStep, setMStep] = useState(0);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [fanPhase, setFanPhase] = useState<"form" | "success">("form");
  const [fanFooterHidden, setFanFooterHidden] = useState(false);
  /** Step labels row — only after choosing Magician card (not via Continue from step 0). */
  const [magicianLabelsVisible, setMagicianLabelsVisible] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [magAvatarFile, setMagAvatarFile] = useState<File | null>(null);
  const [magAvatarPreview, setMagAvatarPreview] = useState<string | null>(null);
  const [magEmail, setMagEmail] = useState("");
  const [city, setCity] = useState("");
  const [handle, setHandle] = useState("");
  const [age, setAge] = useState("");
  const [shortBio, setShortBio] = useState("");
  const [fullBio, setFullBio] = useState("");
  const [availableFor, setAvailableFor] = useState<(typeof EVENT_TYPES)[number]>(
    EVENT_TYPES[0],
  );
  const [selectedTags, setSelectedTags] = useState<Set<string>>(() => new Set());
  const [credValues, setCredValues] = useState<Record<number, string>>({
    0: "",
    1: "",
  });
  const [showreelUrl, setShowreelUrl] = useState("");
  const [instagram, setInstagram] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [youtube, setYoutube] = useState("");
  const [website, setWebsite] = useState("");

  const [fanName, setFanName] = useState("");
  const [fanEmail, setFanEmail] = useState("");
  const [fanSubmitting, setFanSubmitting] = useState(false);
  const [fanError, setFanError] = useState("");

  const [venueName, setVenueName] = useState("");
  const [venueCity, setVenueCity] = useState("");
  const [venueCapacity, setVenueCapacity] = useState("");
  const [venueType, setVenueType] = useState<(typeof VENUE_TYPES)[number]>(
    VENUE_TYPES[0],
  );
  const [venueEmail, setVenueEmail] = useState("");
  const [venueDesc, setVenueDesc] = useState("");
  const [venueSubmitting, setVenueSubmitting] = useState(false);
  const [venueError, setVenueError] = useState("");

  const [publishLoading, setPublishLoading] = useState(false);
  const [publishError, setPublishError] = useState("");

  const credIdRef = useRef(2);
  const [credRowIds, setCredRowIds] = useState([0, 1]);
  const magAvatarInputRef = useRef<HTMLInputElement | null>(null);
  const magMediaStep5InputRef = useRef<HTMLInputElement | null>(null);
  const [magAvatarUploadError, setMagAvatarUploadError] = useState("");
  const [isDraggingMedia, setIsDraggingMedia] = useState(false);

  const progressWidth = useMemo(() => {
    if (flow === "magician" && mStep >= 1) return WIDTHS[mStep];
    if (flow === "fan") return fanPhase === "success" ? "100%" : "50%";
    if (flow === "venue") return "50%";
    return "0%";
  }, [flow, mStep, fanPhase]);

  const showMagLabelsRow = magicianLabelsVisible && flow === "magician" && mStep >= 1;
  const showObFooter = !(flow === "fan" && fanPhase === "success");

  const selectType = useCallback((type: "magician" | "fan" | "venue") => {
    setSelectedCard(type);
    if (typeTimeoutRef.current) clearTimeout(typeTimeoutRef.current);
    typeTimeoutRef.current = setTimeout(() => {
      if (type === "magician") {
        setMagicianLabelsVisible(true);
        setFlow("magician");
        setMStep(1);
      } else if (type === "fan") {
        setFlow("fan");
        setMStep(0);
      } else {
        setFlow("venue");
        setMStep(0);
      }
    }, 200);
  }, []);

  useEffect(() => {
    const invitedEmail = searchParams.get("email")?.trim();
    if (invitedEmail && !magEmail) setMagEmail(invitedEmail);
  }, [searchParams, magEmail]);

  useEffect(() => {
    return () => {
      if (typeTimeoutRef.current) clearTimeout(typeTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!magAvatarFile) {
      setMagAvatarPreview(null);
      return;
    }
    const u = URL.createObjectURL(magAvatarFile);
    setMagAvatarPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [magAvatarFile]);

  useEffect(() => {
    const clerkDep = (
      pkg as { dependencies?: Record<string, string> }
    ).dependencies?.["@clerk/nextjs"];
    console.log("@clerk/nextjs (package.json):", clerkDep ?? "(not listed)");
  }, []);

  const goToM = useCallback((n: number) => {
    setMStep(n);
  }, []);

  const nextStep = useCallback(() => {
    if (flow === "pick") {
      setFlow("magician");
      setMStep(1);
      return;
    }
    if (flow === "magician" && mStep < TOTAL) goToM(mStep + 1);
  }, [flow, mStep, goToM]);

  const goBack = useCallback(() => {
    if (flow === "magician" && mStep > 1) {
      goToM(mStep - 1);
      return;
    }
    setMagStep1Error(null);
    setFlow("pick");
    setMStep(0);
    setSelectedCard(null);
    setMagicianLabelsVisible(false);
    setFanPhase("form");
    setFanFooterHidden(false);
  }, [flow, mStep, goToM]);

  const handleMagicianStep1Continue = useCallback(() => {
    setMagStep1Error(null);
    if (!magTermsAccepted) {
      setMagStep1Error({ kind: "terms" });
      return;
    }
    if (!isLoaded) return;
    if (user?.id) {
      goToM(2);
      return;
    }

    const name = displayName.trim();
    const email = magEmail.trim();
    if (!name) {
      setMagStep1Error({ kind: "message", text: "Please enter your display name" });
      return;
    }
    if (!email) {
      setMagStep1Error({ kind: "message", text: "Please enter your email" });
      return;
    }
    if (!isValidEmailFormat(email)) {
      setMagStep1Error({ kind: "message", text: "Please enter a valid email address" });
      return;
    }
    if (!magPassword.trim()) {
      setMagStep1Error({ kind: "message", text: "Please enter a password" });
      return;
    }
    if (magPassword !== magPasswordConfirm) {
      setMagStep1Error({ kind: "message", text: "Passwords do not match" });
      return;
    }
    if (magPassword.length < 8) {
      setMagStep1Error({ kind: "message", text: "Password must be at least 8 characters" });
      return;
    }

    goToM(2);
  }, [
    isLoaded,
    user?.id,
    magTermsAccepted,
    magEmail,
    displayName,
    magPassword,
    magPasswordConfirm,
    goToM,
  ]);

  const completeFan = useCallback(async () => {
    setFanError("");
    if (!fanTermsAccepted) {
      setFanError("Please accept the terms to continue");
      return;
    }
    if (!isLoaded) return;
    const email = fanEmail.trim();
    const display_name = fanName.trim() || "Fan";
    if (!email) {
      setFanError("Please enter your email.");
      return;
    }
    if (user?.id) {
      setFanSubmitting(true);
      const handle = generateFanHandle(display_name);
      const { error } = await supabase.from("profiles").insert({
        id: String(user.id),
        account_type: "fan",
        display_name,
        email,
        handle,
      });
      setFanSubmitting(false);
      if (error) {
        setFanError("Something went wrong, please try again");
        return;
      }
      router.push("/onboarding/fan");
      return;
    }
    if (!signUpLoaded || !signUp) {
      setFanError("Something went wrong, please try again");
      return;
    }
    if (fanPassword.length < 8) {
      setFanError("Password must be at least 8 characters.");
      return;
    }
    if (fanPassword !== fanPasswordConfirm) {
      setFanError("Passwords do not match.");
      return;
    }
    const nameParts = display_name.split(/\s+/).filter(Boolean);
    const firstName = nameParts[0] ?? "Fan";
    const lastName =
      nameParts.length > 1 ? nameParts.slice(1).join(" ") : undefined;
    setFanSubmitting(true);
    try {
      const result = await (signUp as unknown as ClerkSignUpClient).create({
        emailAddress: email,
        password: fanPassword,
        firstName,
        ...(lastName ? { lastName } : {}),
      });
      console.log("Signup result:", result);
      const { sessionId, userId, status } = resolveSignUpSessionAndUserId(
        result,
        signUp,
      );
      if (status !== "complete" || !sessionId || !userId) {
        setFanSubmitting(false);
        setFanError("Something went wrong, please try again");
        return;
      }
      await setActiveSession({ session: sessionId });
      await router.refresh();
      const handle = generateFanHandle(display_name);
      const { error } = await supabase.from("profiles").insert({
        id: String(userId),
        account_type: "fan",
        display_name,
        email,
        handle,
      });
      setFanSubmitting(false);
      if (error) {
        setFanError("Something went wrong, please try again");
        return;
      }
      router.push("/onboarding/fan");
    } catch (err: unknown) {
      setFanSubmitting(false);
      if (clerkEmailAlreadyExists(err)) {
        setFanError("exists");
      } else {
        setFanError("Something went wrong, please try again");
      }
    }
  }, [
    isLoaded,
    user?.id,
    signUpLoaded,
    signUp,
    fanTermsAccepted,
    fanName,
    fanEmail,
    fanPassword,
    fanPasswordConfirm,
    setActiveSession,
    router,
  ]);

  const completeVenue = useCallback(async () => {
    setVenueError("");
    if (!venueTermsAccepted) {
      setVenueError("Please accept the terms to continue");
      return;
    }
    if (!isLoaded) return;
    const cap = parseInt(venueCapacity, 10);
    const typeVal =
      venueType === VENUE_TYPES[0] ? null : venueType;
    const cityTrim = venueCity.trim();
    const commaIdx = cityTrim.lastIndexOf(",");
    const cityPart =
      commaIdx >= 0 ? cityTrim.slice(0, commaIdx).trim() : cityTrim;
    const statePart =
      commaIdx >= 0 ? cityTrim.slice(commaIdx + 1).trim() : "";
    const venuePayload = {
      name: venueName.trim(),
      city: cityPart || cityTrim,
      state: statePart || null,
      venue_type: typeVal,
      capacity: Number.isFinite(cap) ? cap : null,
      established_year: null as null,
      description: venueDesc.trim(),
      contact_email: venueEmail.trim(),
      tags: [] as string[],
    };
    if (!venuePayload.name || !venuePayload.contact_email) {
      setVenueError("Please fill in venue name and contact email.");
      return;
    }
    if (user?.id) {
      setVenueSubmitting(true);
      const { data, error } = await supabase
        .from("venues")
        .insert(venuePayload)
        .select("id")
        .single();
      setVenueSubmitting(false);
      if (error || !data?.id) {
        setVenueError("Something went wrong, please try again");
        return;
      }
      router.push(
        `/onboarding/venue?venueId=${encodeURIComponent(data.id)}`,
      );
      return;
    }
    if (!signUpLoaded || !signUp) {
      setVenueError("Something went wrong, please try again");
      return;
    }
    if (venuePassword.length < 8) {
      setVenueError("Password must be at least 8 characters.");
      return;
    }
    if (venuePassword !== venuePasswordConfirm) {
      setVenueError("Passwords do not match.");
      return;
    }
    const vn = venueName.trim();
    const nameParts = vn.split(/\s+/).filter(Boolean);
    const firstName = nameParts[0] ?? "Venue";
    const lastName =
      nameParts.length > 1 ? nameParts.slice(1).join(" ") : undefined;
    setVenueSubmitting(true);
    try {
      const result = await (signUp as unknown as ClerkSignUpClient).create({
        emailAddress: venuePayload.contact_email,
        password: venuePassword,
        firstName,
        ...(lastName ? { lastName } : {}),
      });
      console.log("Signup result:", result);
      const { sessionId, userId, status } = resolveSignUpSessionAndUserId(
        result,
        signUp,
      );
      if (status !== "complete" || !sessionId || !userId) {
        setVenueSubmitting(false);
        setVenueError("Something went wrong, please try again");
        return;
      }
      await setActiveSession({ session: sessionId });
      await router.refresh();
      const { data, error } = await supabase
        .from("venues")
        .insert(venuePayload)
        .select("id")
        .single();
      setVenueSubmitting(false);
      if (error || !data?.id) {
        setVenueError("Something went wrong, please try again");
        return;
      }
      router.push(`/onboarding/venue?venueId=${encodeURIComponent(data.id)}`);
    } catch (err: unknown) {
      setVenueSubmitting(false);
      if (clerkEmailAlreadyExists(err)) {
        setVenueError("exists");
      } else {
        setVenueError("Something went wrong, please try again");
      }
    }
  }, [
    isLoaded,
    user?.id,
    signUpLoaded,
    signUp,
    venueTermsAccepted,
    venueName,
    venueCity,
    venueCapacity,
    venueType,
    venueEmail,
    venueDesc,
    venuePassword,
    venuePasswordConfirm,
    setActiveSession,
    router,
  ]);

  const saveMagicianProfileToSupabase = useCallback(
    async (ClerkUserId: string) => {
      let avatarUrl: string | null = null;
      if (magAvatarFile && ClerkUserId) {
        const rawExt = magAvatarFile.name.split(".").pop()?.toLowerCase();
        const ext =
          rawExt && ["jpg", "jpeg", "png", "webp"].includes(rawExt)
            ? rawExt === "jpeg"
              ? "jpg"
              : rawExt
            : "jpg";
        const storagePath = `${String(ClerkUserId)}/avatar.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(storagePath, magAvatarFile, {
            upsert: true,
            contentType: magAvatarFile.type || `image/${ext === "jpg" ? "jpeg" : ext}`,
          });
        if (!uploadError) {
          const { data } = supabase.storage.from("avatars").getPublicUrl(storagePath);
          avatarUrl = `${data.publicUrl}?t=${Date.now()}`;
        }
      }
      const credentials = credRowIds
        .map((id) => credValues[id]?.trim())
        .filter(Boolean) as string[];
      const ageNum = age.trim() ? parseInt(age, 10) : NaN;
      const availableVal =
        availableFor === EVENT_TYPES[0] ? null : availableFor;
      const emailForRow =
        magEmail.trim() ||
        user?.primaryEmailAddress?.emailAddress ||
        "";
      const { error } = await supabase.from("profiles").insert({
        id: String(ClerkUserId),
        display_name: displayName.trim(),
        handle: handle.replace(/^@/, "").trim(),
        email: emailForRow,
        location: city.trim(),
        age: Number.isFinite(ageNum) ? ageNum : null,
        short_bio: shortBio.trim(),
        full_bio: fullBio.trim(),
        account_type: "magician",
        specialty_tags: [...selectedTags],
        available_for: availableVal,
        credentials,
        instagram: instagram.trim(),
        tiktok: tiktok.trim(),
        youtube: youtube.trim(),
        website: website.trim(),
        showreel_url: showreelUrl.trim(),
        avatar_url: avatarUrl,
      });
      if (error) {
        console.error("Supabase save error:", error);
        throw error;
      }
      void fetch("/api/founding-member/welcome", { method: "POST" });
    },
    [
      magAvatarFile,
      credRowIds,
      credValues,
      age,
      availableFor,
      magEmail,
      user?.primaryEmailAddress?.emailAddress,
      displayName,
      handle,
      city,
      shortBio,
      fullBio,
      selectedTags,
      showreelUrl,
      instagram,
      tiktok,
      youtube,
      website,
    ],
  );

  const publishMagician = useCallback(async () => {
    setPublishError("");
    if (!isLoaded) return;

    let clerkUserId: string | null = user?.id ?? null;

    if (!clerkUserId) {
      if (!signUpLoaded || !signUp) {
        setPublishError(
          "Account signup is not ready. Please refresh and try again.",
        );
        return;
      }
      const name = displayName.trim();
      const email = magEmail.trim();
      if (!name || !email || !isValidEmailFormat(email)) {
        setPublishError(
          "Please go back to step 1 and enter a valid display name and email.",
        );
        return;
      }
      if (
        !magPassword.trim() ||
        magPassword.length < 8 ||
        magPassword !== magPasswordConfirm
      ) {
        setPublishError(
          "Please go back to step 1 and enter matching passwords (min. 8 characters).",
        );
        return;
      }
      try {
        console.log("Starting publish...");
        console.log("Email:", email);
        console.log("Display name:", name);
        console.log("signUp object:", signUp);
        console.log("isLoaded (useUser):", isLoaded);
        console.log("signUpLoaded:", signUpLoaded);

        const result = await (signUp as unknown as ClerkSignUpClient).create({
          emailAddress: email,
          password: magPassword,
          firstName: name,
          unsafeMetadata: { display_name: name },
        });

        type SignUpShape = {
          status?: string | null;
          createdUserId?: string | null;
          createdSessionId?: string | null;
          missingFields?: unknown;
          unverifiedFields?: unknown;
        };
        const res = result as SignUpShape;
        const su = signUp as SignUpShape;
        console.log("Signup result:", result);
        console.log("Signup status (result):", res.status);
        console.log("Created user id (result):", res.createdUserId);
        console.log("Created session id (result):", res.createdSessionId);
        console.log("signUp after create — status:", su.status);
        console.log("signUp after create — createdUserId:", su.createdUserId);
        console.log("signUp after create — createdSessionId:", su.createdSessionId);

        const suLog = signUp as unknown as Record<string, unknown>;
        console.log("Verifications:", suLog.verifications);
        console.log("Unverified fields:", suLog.unverifiedFields);
        console.log("Required fields:", suLog.requiredFields);
        console.log("Missing fields:", suLog.missingFields);

        const effectiveStatus =
          (res.status ?? su.status)?.toString() ?? "";

        if (effectiveStatus === "complete") {
          const resolved = resolveSignUpSessionAndUserId(result, signUp);
          console.log("resolveSignUpSessionAndUserId:", resolved);
          const { sessionId, userId } = resolved;
          if (!sessionId || !userId) {
            console.warn(
              "Status complete but missing sessionId or userId after resolve",
              { sessionId, userId },
            );
            setPublishError(
              "Signup completed but session details were missing. Please try signing in.",
            );
            return;
          }
          console.log("Setting active session...");
          await setActiveSession({ session: sessionId });
          console.log("Session set — continuing to profile save…");
          await router.refresh();
          clerkUserId = userId;
        } else if (effectiveStatus === "missing_requirements") {
          const missing =
            res.missingFields ??
            (signUp as { missingFields?: unknown }).missingFields;
          const unverified =
            res.unverifiedFields ??
            (signUp as { unverifiedFields?: unknown }).unverifiedFields;
          console.log("Missing requirements:", missing);
          console.log("Unverified fields:", unverified);
          if (unverifiedFieldsIncludeEmailAddress(unverified)) {
            try {
              const credentialsForPending = credRowIds
                .map((id) => credValues[id]?.trim())
                .filter(Boolean) as string[];
              const pending: PendingMagicianProfileV1 = {
                displayName: displayName.trim(),
                handle: handle.trim(),
                email,
                location: city.trim(),
                age: age.trim(),
                shortBio: shortBio.trim(),
                fullBio: fullBio.trim(),
                selectedTags: [...selectedTags],
                availableFor: availableFor,
                credentials: credentialsForPending,
                instagram: instagram.trim(),
                tiktok: tiktok.trim(),
                youtube: youtube.trim(),
                website: website.trim(),
                showreelUrl: showreelUrl.trim(),
                accountType: "magician",
                v: 1,
              };
              localStorage.setItem(
                PENDING_MAGICIAN_PROFILE_KEY,
                JSON.stringify(pending),
              );
              console.log(
                "Stored pending_profile in localStorage; redirecting to /verify-email",
              );
              router.push("/verify-email");
            } catch (storeErr: unknown) {
              console.error("pending_profile localStorage error:", storeErr);
              setPublishError(
                "Could not save your profile draft. Check browser storage or try again.",
              );
            }
            return;
          }
          setPublishError("Please verify your email to continue");
          return;
        } else {
          console.log("Unexpected status:", effectiveStatus || "(empty)");
          setPublishError(
            `Unexpected error (${effectiveStatus || "unknown"}). Please try again.`,
          );
          return;
        }
      } catch (err: unknown) {
        console.error("Full error:", err);
        console.error("Error errors array:", (err as { errors?: unknown })?.errors);
        const first = (err as { errors?: Array<unknown> })?.errors?.[0] as
          | {
              code?: string;
              message?: string;
              longMessage?: string;
            }
          | undefined;
        console.error("First error:", first);
        console.error("Error code:", first?.code);
        console.error("Error message:", first?.message);
        console.error("Error long message:", first?.longMessage);

        const code = first?.code;
        if (code === "form_identifier_exists") {
          setPublishError(
            "An account with this email already exists. Sign in instead?",
          );
        } else {
          setPublishError(
            first?.longMessage ||
              first?.message ||
              (err as Error)?.message ||
              "Something went wrong",
          );
        }
        return;
      }
    }

    setPublishLoading(true);
    try {
      await saveMagicianProfileToSupabase(String(clerkUserId));
      console.log("Supabase profiles.insert: ok");
      router.push("/profile");
    } catch (insertErr: unknown) {
      const msg =
        insertErr &&
        typeof insertErr === "object" &&
        "message" in insertErr &&
        typeof (insertErr as { message?: string }).message === "string"
          ? (insertErr as { message: string }).message
          : String(insertErr);
      console.error("Supabase profiles.insert error:", insertErr);
      setPublishError(
        msg || "Could not save profile. Please try again.",
      );
    } finally {
      setPublishLoading(false);
    }
  }, [
    isLoaded,
    user,
    signUpLoaded,
    signUp,
    displayName,
    magEmail,
    magPassword,
    magPasswordConfirm,
    handle,
    city,
    age,
    shortBio,
    fullBio,
    selectedTags,
    availableFor,
    credRowIds,
    credValues,
    showreelUrl,
    instagram,
    tiktok,
    youtube,
    website,
    magAvatarFile,
    setActiveSession,
    router,
    saveMagicianProfileToSupabase,
  ]);

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }, []);

  const addCred = useCallback(() => {
    credIdRef.current += 1;
    const nid = credIdRef.current;
    setCredRowIds((ids) => [...ids, nid]);
    setCredValues((prev) => ({ ...prev, [nid]: "" }));
  }, []);

  const removeCred = useCallback((id: number) => {
    setCredRowIds((ids) => (ids.length > 1 ? ids.filter((x) => x !== id) : ids));
    setCredValues((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const setCredValue = useCallback((id: number, value: string) => {
    setCredValues((prev) => ({ ...prev, [id]: value }));
  }, []);

  const handleMagicianAvatarFileSelected = useCallback(
    (file: File | undefined | null) => {
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        setMagAvatarUploadError("Please select an image file");
        return;
      }
      setMagAvatarUploadError("");
      setMagAvatarFile(file);
    },
    [],
  );

  const handleMediaStep5DragOver = useCallback((e: DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingMedia(true);
  }, []);

  const handleMediaStep5DragLeave = useCallback((e: DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingMedia(false);
  }, []);

  const handleMediaStep5Drop = useCallback(
    (e: DragEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingMedia(false);
      const file = e.dataTransfer.files[0];
      if (file) handleMagicianAvatarFileSelected(file);
    },
    [handleMagicianAvatarFileSelected],
  );

  const startWizardSignUpOAuth = useCallback(
    async (strategy: "oauth_google" | "oauth_facebook") => {
      if (!signUpLoaded || !signUp) {
        console.warn("Clerk signUp not ready for OAuth");
        return;
      }
      const { error } = await clerkOAuthSignUp(signUp, {
        strategy,
        redirectCallbackUrl: "/sso-callback",
        redirectUrl: "/create-profile/complete",
      });
      if (error) console.error("OAuth sign-up:", error);
    },
    [signUp, signUpLoaded],
  );

  const previewName = displayName.trim() || "Your name";
  const previewLoc = city.trim() || "Your location";
  const previewTagList =
    selectedTags.size > 0 ? [...selectedTags].slice(0, 4) : ["Your tags"];

  const stepCounterText = useMemo(() => {
    if (flow === "magician" && mStep >= 1) return `${mStep} of ${TOTAL}`;
    if (flow === "fan") return "Fan account";
    if (flow === "venue") return "Venue listing";
    return "";
  }, [flow, mStep]);

  const showBack =
    (flow === "magician" && mStep >= 1) ||
    flow === "fan" ||
    flow === "venue";

  const showFooterContinue =
    flow === "pick" ||
    (flow === "magician" && mStep >= 1 && mStep < TOTAL);
  const showPublish = flow === "magician" && mStep === TOTAL;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-black text-zinc-100">
      {/* TOP BAR */}
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--ml-gold)]/15 px-5 py-4 sm:px-12">
        <Link
          href="/"
          className="ml-font-heading text-xl font-semibold text-zinc-100 no-underline"
        >
          Magic<span className="text-[var(--ml-gold)] italic">alive</span>
        </Link>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="border-0 bg-transparent text-xs text-zinc-500 transition hover:text-zinc-200"
        >
          Save &amp; exit
        </button>
      </div>

      {/* PROGRESS */}
      <div className="shrink-0 px-5 pt-5 sm:px-12">
        {showMagLabelsRow ? (
          <div className="mb-2.5 hidden min-[601px]:flex min-[601px]:justify-between">
            {MAG_STEP_LABELS.map((lbl, i) => (
              <span
                key={lbl}
                className={`text-[10px] uppercase tracking-widest transition-colors ${
                  i === mStep - 1
                    ? "text-[var(--ml-gold)]"
                    : i < mStep - 1
                      ? "text-[var(--ml-gold)]/45"
                      : "text-zinc-500"
                }`}
              >
                {lbl}
              </span>
            ))}
          </div>
        ) : null}
        <div className="h-0.5 overflow-hidden rounded-sm bg-white/[0.07]">
          <div
            className="h-full rounded-sm bg-[var(--ml-gold)] transition-[width] duration-300 ease-out"
            style={{ width: progressWidth }}
          />
        </div>
      </div>

      <div id="clerk-captcha" data-cl-theme="dark" data-cl-size="invisible" />

      <div className="mx-auto w-full max-w-[640px] flex-1 px-5 py-10 sm:px-12">
        {/* STEP 0 */}
        <div
          className={`ml-animate-step ${flow === "pick" ? "block" : "hidden"}`}
        >
          <p className="mb-2.5 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--ml-gold)]">
            Welcome to Magicalive
          </p>
          <h2 className="mb-2 ml-font-heading text-[34px] font-semibold leading-tight text-zinc-50">
            Who are <em className="text-[var(--ml-gold)] italic">you?</em>
          </h2>
          <p className="mb-8 text-[13px] leading-relaxed text-zinc-500">
            Pick the option that fits. Each path is tailored to what you need —
            you can always update your preferences later.
          </p>
          <p className="mb-6 text-sm">
            <FoundingMemberSpots compact />
          </p>
          <p className="mb-6 text-xs text-zinc-500">
            <Link href="/for-magicians" className="text-[var(--ml-gold)] hover:underline">
              Learn more about joining as a magician →
            </Link>
          </p>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
            {(
              [
                {
                  id: "magician",
                  icon: "🎩",
                  name: "Magician",
                  desc: "Build a public profile, list your shows, and get discovered by fans and event organisers",
                  perks: [
                    "Public profile page",
                    "Post upcoming shows",
                    "Appear in the directory",
                    "Collect fan reviews",
                  ],
                },
                {
                  id: "fan",
                  icon: "👥",
                  name: "Fan",
                  desc: "Discover magicians, browse events near you, follow your favourites, and leave reviews",
                  perks: [
                    "Follow magicians",
                    "Save upcoming events",
                    "Write reviews",
                    "Submit articles",
                  ],
                },
                {
                  id: "venue",
                  icon: "🏛️",
                  name: "Venue",
                  desc: "List your space in the directory and connect with magicians looking for a stage",
                  perks: [
                    "Venue profile page",
                    "Appear on the map",
                    "Post hosted shows",
                    "Connect with performers",
                  ],
                },
              ] as const
            ).map((card) => (
              <button
                key={card.id}
                type="button"
                onClick={() => selectType(card.id)}
                className={`cursor-pointer rounded-md border px-5 py-7 text-center transition select-none ${
                  selectedCard === card.id
                    ? "border-[var(--ml-gold)] bg-[var(--ml-gold)]/[0.08]"
                    : "border-white/10 bg-white/[0.04] hover:border-[var(--ml-gold)]/40 hover:bg-[var(--ml-gold)]/[0.03]"
                }`}
              >
                <div className="mb-3.5 text-4xl">{card.icon}</div>
                <div
                  className={`mb-1.5 ml-font-heading text-xl font-semibold ${
                    selectedCard === card.id ? "text-[var(--ml-gold)]" : "text-zinc-100"
                  }`}
                >
                  {card.name}
                </div>
                <div className="text-xs leading-relaxed text-zinc-500">{card.desc}</div>
                <div className="mt-3.5 flex flex-col gap-1.5 text-left">
                  {card.perks.map((p) => (
                    <div
                      key={p}
                      className={`flex items-center gap-1.5 text-[11px] ${
                        selectedCard === card.id ? "text-[#e8e0d0]" : "text-zinc-500"
                      }`}
                    >
                      <span className="shrink-0 text-[var(--ml-gold)]">♣</span>
                      {p}
                    </div>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* MAGICIAN m1 — account (before Step 2 Identity); Clerk signup runs on Publish */}
        <div
          className={`ml-animate-step ${flow === "magician" && mStep === 1 ? "block" : "hidden"}`}
        >
          <>
            <p className="mb-2.5 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--ml-gold)]">
              Step 1 of 6 — Magician
            </p>
            <h2 className="mb-2 ml-font-heading text-[34px] font-semibold leading-tight text-zinc-50">
              Create your <em className="text-[var(--ml-gold)] italic">account</em>
            </h2>
            <p className="mb-8 text-[13px] leading-relaxed text-zinc-500">
              You&apos;ll use this to manage your profile, post shows, and connect with fans.
            </p>
            <div className="mb-[18px]">
              <label className={labelClass}>Profile photo</label>
              <input
                ref={magAvatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  handleMagicianAvatarFileSelected(f ?? null);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => magAvatarInputRef.current?.click()}
                className="group flex flex-col items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-4 transition hover:border-[var(--ml-gold)]/35 sm:flex-row"
              >
                <span className="relative inline-flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[var(--ml-gold)]/30 bg-gradient-to-br from-[#2d1f3d] to-[#534AB7] text-xl font-semibold text-zinc-100">
                  {magAvatarPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={magAvatarPreview}
                      alt=""
                      className="h-full w-full object-cover"
                      style={{ width: 80, height: 80 }}
                    />
                  ) : (
                    (displayName.trim()[0] || "M").toUpperCase()
                  )}
                  <span
                    className="absolute bottom-0.5 right-0.5 flex h-7 w-7 items-center justify-center rounded-full border border-[var(--ml-gold)]/40 bg-black/80 text-[var(--ml-gold)] shadow-md backdrop-blur-sm transition group-hover:border-[var(--ml-gold)]"
                    aria-hidden
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                  </span>
                </span>
                <span className="text-center text-xs text-zinc-400 sm:text-left">
                  Click to upload a profile photo (JPG, PNG, or WebP)
                </span>
              </button>
              {magAvatarUploadError ? (
                <p className="mt-2 text-sm font-medium text-red-400">{magAvatarUploadError}</p>
              ) : null}
            </div>
            <div className="mb-[18px]">
              <label className={labelClass}>Display name</label>
              <input
                type="text"
                className={inputClass}
                placeholder="The name you perform under"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
            {!user?.id ? (
              <>
                <SocialOAuthButtons
                  disabled={!signUpLoaded || !signUp}
                  onGoogle={() => void startWizardSignUpOAuth("oauth_google")}
                  onFacebook={() => void startWizardSignUpOAuth("oauth_facebook")}
                />
                <OAuthEmailDivider />
              </>
            ) : null}
            <div className="mb-[18px]">
              <label className={labelClass}>Email address</label>
              <input
                type="email"
                className={inputClass}
                placeholder="your@email.com"
                value={magEmail}
                onChange={(e) => setMagEmail(e.target.value)}
              />
              <span className={signInHintClass}>
                Already have an account?{" "}
                <Link href="/sign-in" className={signInLinkClass}>
                  Sign in
                </Link>
              </span>
            </div>
            <div className="mb-[18px] grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Password</label>
                <input
                  type="password"
                  className={inputClass}
                  placeholder="Min. 8 characters"
                  value={magPassword}
                  onChange={(e) => setMagPassword(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Confirm password</label>
                <input
                  type="password"
                  className={inputClass}
                  placeholder="Repeat password"
                  value={magPasswordConfirm}
                  onChange={(e) => setMagPasswordConfirm(e.target.value)}
                />
              </div>
            </div>
            {magStep1Error?.kind === "message" ? (
              <p className="mb-3 text-sm font-medium text-red-400">{magStep1Error.text}</p>
            ) : null}
            {magStep1Error?.kind === "terms" ? (
              <p className="mb-3 text-sm font-medium text-red-400">
                Please accept the terms to continue
              </p>
            ) : null}
            <label className="mb-3 flex items-start gap-2 text-xs text-zinc-400">
              <input
                type="checkbox"
                checked={magTermsAccepted}
                onChange={(e) => setMagTermsAccepted(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                I agree to the Magicalive{" "}
                <Link
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--ml-gold)] hover:underline"
                >
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link
                  href="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--ml-gold)] hover:underline"
                >
                  Privacy Policy
                </Link>
              </span>
            </label>
          </>
        </div>

        {/* m2 */}
        <div
          className={`ml-animate-step ${flow === "magician" && mStep === 2 ? "block" : "hidden"}`}
        >
          <p className="mb-2.5 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--ml-gold)]">
            Step 2 of 6 — Magician
          </p>
          <h2 className="mb-2 ml-font-heading text-[34px] font-semibold leading-tight text-zinc-50">
            Your <em className="text-[var(--ml-gold)] italic">identity</em>
          </h2>
          <p className="mb-8 text-[13px] leading-relaxed text-zinc-500">
            Tell the community who you are and where you perform.
          </p>
          <div className="mb-[18px]">
            <label className={labelClass}>Handle / username</label>
            <input
              type="text"
              className={inputClass}
              placeholder="@yourhandle — no spaces"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
            />
            <p className="mt-1.5 text-[11px] leading-snug text-zinc-500">
              Your profile will live at magicalive.com/@yourhandle
            </p>
          </div>
          <div className="mb-[18px] grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div>
              <label className={labelClass}>City / Region</label>
              <input
                type="text"
                className={inputClass}
                placeholder="e.g. Los Angeles, CA"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>
                Age <span className="ml-1 text-[9px] text-zinc-500/55">optional</span>
              </label>
              <input
                type="number"
                className={inputClass}
                placeholder="e.g. 34"
                min={16}
                max={99}
                value={age}
                onChange={(e) => setAge(e.target.value)}
              />
            </div>
          </div>
          <div className="mb-[18px]">
            <label className={labelClass}>Short bio</label>
            <input
              type="text"
              className={inputClass}
              placeholder="One sentence — e.g. Mentalist based in LA"
              value={shortBio}
              onChange={(e) => setShortBio(e.target.value)}
            />
          </div>
          <div className="mb-[18px]">
            <label className={labelClass}>Full bio</label>
            <textarea
              rows={4}
              className={`${inputClass} resize-y`}
              placeholder="Your background, style, and what makes your shows unique…"
              value={fullBio}
              onChange={(e) => setFullBio(e.target.value)}
            />
          </div>
        </div>

        {/* m3 */}
        <div
          className={`ml-animate-step ${flow === "magician" && mStep === 3 ? "block" : "hidden"}`}
        >
          <p className="mb-2.5 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--ml-gold)]">
            Step 3 of 6 — Magician
          </p>
          <h2 className="mb-2 ml-font-heading text-[34px] font-semibold leading-tight text-zinc-50">
            Your <em className="text-[var(--ml-gold)] italic">style</em>
          </h2>
          <p className="mb-8 text-[13px] leading-relaxed text-zinc-500">
            Select all that apply. These tags help fans and event organisers find you.
          </p>
          <div className="mb-[18px]">
            <label className={labelClass}>Specialty tags</label>
            <div className="flex flex-wrap gap-2">
              {SPECIALTY_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`cursor-pointer px-3.5 py-1.5 text-[11px] uppercase tracking-wider transition select-none ${
                    selectedTags.has(tag)
                      ? "rounded-sm border border-[var(--ml-gold)] bg-[var(--ml-gold)]/15 text-[var(--ml-gold)]"
                      : "rounded-sm border border-[var(--ml-gold)]/25 text-zinc-500 hover:border-[var(--ml-gold)]/50 hover:text-zinc-100"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-6">
            <label className={labelClass}>Available for</label>
            <select
              className={`${inputClass} cursor-pointer`}
              value={availableFor}
              onChange={(e) =>
                setAvailableFor(e.target.value as (typeof EVENT_TYPES)[number])
              }
            >
              {EVENT_TYPES.map((o) => (
                <option key={o} className="bg-zinc-900 text-zinc-100">
                  {o}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* m4 */}
        <div
          className={`ml-animate-step ${flow === "magician" && mStep === 4 ? "block" : "hidden"}`}
        >
          <p className="mb-2.5 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--ml-gold)]">
            Step 4 of 6 — Magician
          </p>
          <h2 className="mb-2 ml-font-heading text-[34px] font-semibold leading-tight text-zinc-50">
            Credentials &amp; <em className="text-[var(--ml-gold)] italic">achievements</em>
          </h2>
          <p className="mb-8 text-[13px] leading-relaxed text-zinc-500">
            Awards, memberships, press mentions, notable clients. These build trust and set you apart.
          </p>
          <div className="flex flex-col gap-2.5">
            {credRowIds.map((id, idx) => (
              <div key={id} className="flex items-center gap-2">
                <input
                  type="text"
                  className={inputClass}
                  placeholder={
                    idx === 0
                      ? "e.g. SAM Member since 2015"
                      : idx === 1
                        ? "e.g. Winner — Pacific Coast Magic Championship 2021"
                        : "Add a credential…"
                  }
                  value={credValues[id] ?? ""}
                  onChange={(e) => setCredValue(id, e.target.value)}
                />
                <button
                  type="button"
                  className="shrink-0 border-0 bg-transparent px-1 text-lg leading-none text-zinc-500 transition hover:text-red-400"
                  onClick={() => removeCred(id)}
                  aria-label="Remove"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addCred}
            className="mt-1.5 w-full cursor-pointer rounded-md border border-dashed border-[var(--ml-gold)]/30 bg-transparent py-2.5 text-xs uppercase tracking-wider text-[var(--ml-gold)] transition hover:border-[var(--ml-gold)] hover:bg-[var(--ml-gold)]/5"
          >
            + Add another credential
          </button>
        </div>

        {/* m5 */}
        <div
          className={`ml-animate-step ${flow === "magician" && mStep === 5 ? "block" : "hidden"}`}
        >
          <p className="mb-2.5 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--ml-gold)]">
            Step 5 of 6 — Magician
          </p>
          <h2 className="mb-2 ml-font-heading text-[34px] font-semibold leading-tight text-zinc-50">
            Photos &amp; <em className="text-[var(--ml-gold)] italic">media</em>
          </h2>
          <p className="mb-8 text-[13px] leading-relaxed text-zinc-500">
            Upload your best shots and a showreel. Profiles with media get 3× more views.
          </p>
          <input
            ref={magMediaStep5InputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              handleMagicianAvatarFileSelected(f ?? null);
              e.target.value = "";
            }}
          />
          <div className="mb-[18px]">
            <label className={labelClass}>Profile photo (directory avatar)</label>
            <button
              type="button"
              className={`w-full cursor-pointer rounded-md border border-dashed px-8 py-8 text-center transition ${
                isDraggingMedia
                  ? "border-[var(--ml-gold)] bg-[var(--ml-gold)]/15"
                  : "border-[var(--ml-gold)]/30 hover:border-[var(--ml-gold)] hover:bg-[var(--ml-gold)]/5"
              }`}
              onClick={() => magMediaStep5InputRef.current?.click()}
              onDragOver={handleMediaStep5DragOver}
              onDragLeave={handleMediaStep5DragLeave}
              onDrop={handleMediaStep5Drop}
            >
              {magAvatarPreview ? (
                <div className="flex flex-col items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={magAvatarPreview}
                    alt=""
                    className="object-cover"
                    style={{ width: 80, height: 80, borderRadius: "50%" }}
                  />
                  <p className="text-[13px] text-zinc-400">
                    Click or drag a new image to replace
                  </p>
                  <p className="text-[11px] text-zinc-500/80">JPG, PNG, or WebP</p>
                </div>
              ) : (
                <>
                  <div className="mb-2.5 text-[26px]">🎞</div>
                  <div className="text-[13px] text-zinc-500">
                    Drop a profile photo here, or click to browse
                  </div>
                  <div className="mt-1 text-[11px] text-zinc-500/70">
                    JPG, PNG, or WebP — same image as Step 1
                  </div>
                </>
              )}
            </button>
            {magAvatarUploadError ? (
              <p className="mt-2 text-sm font-medium text-red-400">{magAvatarUploadError}</p>
            ) : null}
          </div>
          <div className="mb-[18px]">
            <label className={labelClass}>
              YouTube or Vimeo showreel{" "}
              <span className="ml-1 text-[9px] text-zinc-500/55">optional</span>
            </label>
            <input
              type="url"
              className={inputClass}
              placeholder="https://youtube.com/watch?v=…"
              value={showreelUrl}
              onChange={(e) => setShowreelUrl(e.target.value)}
            />
          </div>
          <div className="mb-[18px] grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div>
              <label className={labelClass}>
                Instagram{" "}
                <span className="ml-1 text-[9px] text-zinc-500/55">optional</span>
              </label>
              <input
                type="text"
                className={inputClass}
                placeholder="@handle"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>
                TikTok <span className="ml-1 text-[9px] text-zinc-500/55">optional</span>
              </label>
              <input
                type="text"
                className={inputClass}
                placeholder="@handle"
                value={tiktok}
                onChange={(e) => setTiktok(e.target.value)}
              />
            </div>
          </div>
          <div className="mb-[18px] grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div>
              <label className={labelClass}>
                YouTube{" "}
                <span className="ml-1 text-[9px] text-zinc-500/55">optional</span>
              </label>
              <input
                type="url"
                className={inputClass}
                placeholder="Channel or video URL"
                value={youtube}
                onChange={(e) => setYoutube(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>
                Website{" "}
                <span className="ml-1 text-[9px] text-zinc-500/55">optional</span>
              </label>
              <input
                type="url"
                className={inputClass}
                placeholder="https://…"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* m6 */}
        <div
          className={`ml-animate-step ${flow === "magician" && mStep === 6 ? "block" : "hidden"}`}
        >
          <p className="mb-2.5 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--ml-gold)]">
            Step 6 of 6 — Magician
          </p>
          <h2 className="mb-2 ml-font-heading text-[34px] font-semibold leading-tight text-zinc-50">
            Ready to go <em className="text-[var(--ml-gold)] italic">live?</em>
          </h2>
          <p className="mb-8 text-[13px] leading-relaxed text-zinc-500">
            Here&apos;s a preview of how you&apos;ll appear in the directory. You can edit
            everything after publishing.
          </p>
          <div className="mb-4 flex items-center gap-2 rounded-md border border-emerald-400/20 bg-emerald-400/10 px-3.5 py-2.5 text-xs text-emerald-200">
            <span>✓</span> Profile complete — all key sections filled in
          </div>
          <div className="mb-5 overflow-hidden rounded-md border border-white/10 bg-white/[0.04]">
            <div className="h-16 bg-gradient-to-br from-[#1a1020] to-[#2d1f3d]" />
            <div className="px-4 pb-4 pt-0">
              <div className="-mt-8 mb-2.5 flex h-[52px] w-[52px] items-center justify-center rounded-full border-[2.5px] border-[#151217] bg-gradient-to-br from-[#2d1f3d] to-[#534AB7] text-2xl">
                🎩
              </div>
              <div className="ml-font-heading text-xl font-semibold text-zinc-100">
                {previewName}
              </div>
              <div className="mb-2.5 text-xs text-zinc-500">{previewLoc}</div>
              <div className="flex flex-wrap gap-1.5">
                {previewTagList.map((t) => (
                  <span
                    key={t}
                    className="rounded-sm border border-[#8a6f2e]/40 px-2 py-0.5 text-[10px] uppercase tracking-wider text-[#c9a84c]/80"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <p className="text-xs leading-relaxed text-zinc-500">
            By publishing you agree to our{" "}
            <Link href="/contact" className="text-[var(--ml-gold)] no-underline hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/contact" className="text-[var(--ml-gold)] no-underline hover:underline">
              Community Guidelines
            </Link>
            .
          </p>
          {publishError ? (
            <p className="mt-4 text-sm font-medium text-red-400">
              {publishError.includes("Sign in instead") ? (
                <>
                  An account with this email already exists.{" "}
                  <Link href="/sign-in" className={signInLinkClass}>
                    Sign in instead?
                  </Link>
                </>
              ) : (
                publishError
              )}
            </p>
          ) : null}
        </div>

        {/* FAN */}
        <div
          className={`ml-animate-step ${flow === "fan" ? "block" : "hidden"}`}
        >
          <p className="mb-2.5 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--ml-gold)]">
            Fan account
          </p>
          <h2 className="mb-2 ml-font-heading text-[34px] font-semibold leading-tight text-zinc-50">
            Join the <em className="text-[var(--ml-gold)] italic">community</em>
          </h2>
          <p className="mb-8 text-[13px] leading-relaxed text-zinc-500">
            Create your free account to follow magicians, save events, and leave reviews.
          </p>
          {fanPhase === "form" ? (
            <div id="fan-form">
              <div className="mb-[18px]">
                <label className={labelClass}>Your name</label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="Your name"
                  value={fanName}
                  onChange={(e) => setFanName(e.target.value)}
                />
              </div>
              {!user?.id ? (
                <>
                  <SocialOAuthButtons
                    disabled={!signUpLoaded || !signUp}
                    onGoogle={() => void startWizardSignUpOAuth("oauth_google")}
                    onFacebook={() => void startWizardSignUpOAuth("oauth_facebook")}
                  />
                  <OAuthEmailDivider />
                </>
              ) : null}
              <div className="mb-[18px]">
                <label className={labelClass}>Email address</label>
                <input
                  type="email"
                  className={inputClass}
                  placeholder="your@email.com"
                  value={fanEmail}
                  onChange={(e) => setFanEmail(e.target.value)}
                />
                <span className={signInHintClass}>
                  Already have an account?{" "}
                  <Link href="/sign-in" className={signInLinkClass}>
                    Sign in
                  </Link>
                </span>
              </div>
              <div className="mb-[18px] grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Password</label>
                  <input
                    type="password"
                    className={inputClass}
                    placeholder="Min. 8 characters"
                    value={fanPassword}
                    onChange={(e) => setFanPassword(e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>Confirm password</label>
                  <input
                    type="password"
                    className={inputClass}
                    placeholder="Repeat password"
                    value={fanPasswordConfirm}
                    onChange={(e) => setFanPasswordConfirm(e.target.value)}
                  />
                </div>
              </div>
              {fanError === "exists" ? (
                <p className="mb-3 text-sm font-medium text-red-400">
                  An account with this email already exists.{" "}
                  <Link href="/sign-in" className={signInLinkClass}>
                    Sign in instead?
                  </Link>
                </p>
              ) : fanError ? (
                <p className="mb-3 text-sm font-medium text-red-400">
                  {fanError}
                </p>
              ) : null}
              <label className="mb-3 flex items-start gap-2 text-xs text-zinc-400">
                <input
                  type="checkbox"
                  checked={fanTermsAccepted}
                  onChange={(e) => setFanTermsAccepted(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  I agree to the Magicalive{" "}
                  <Link
                    href="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--ml-gold)] hover:underline"
                  >
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--ml-gold)] hover:underline"
                  >
                    Privacy Policy
                  </Link>
                </span>
              </label>
              <button
                type="button"
                onClick={() => void completeFan()}
                disabled={fanSubmitting || !fanTermsAccepted}
                className={`${CLASSES.btnPrimary} mt-1 text-xs uppercase tracking-wider disabled:opacity-60`}
              >
                {fanSubmitting ? "Saving…" : "Create fan account →"}
              </button>
            </div>
          ) : (
            <div className="py-10 text-center">
              <div className="mb-4 text-4xl text-[var(--ml-gold)]">♣</div>
              <div className="mb-2 ml-font-heading text-[26px] font-semibold text-zinc-100">
                Welcome to Magicalive
              </div>
              <div className="mx-auto mb-6 max-w-md text-[13px] leading-relaxed text-zinc-500">
                Your fan account is ready. Start discovering magicians, saving events, and
                building your community.
              </div>
              <Link
                href="/"
                className={`${CLASSES.btnPrimary} inline-flex text-xs uppercase tracking-wider`}
              >
                Explore Magicalive →
              </Link>
            </div>
          )}
        </div>

        {/* VENUE */}
        <div
          className={`ml-animate-step ${flow === "venue" ? "block" : "hidden"}`}
        >
          <p className="mb-2.5 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--ml-gold)]">
            Venue account
          </p>
          <h2 className="mb-2 ml-font-heading text-[34px] font-semibold leading-tight text-zinc-50">
            List your <em className="text-[var(--ml-gold)] italic">venue</em>
          </h2>
          <p className="mb-8 text-[13px] leading-relaxed text-zinc-500">
            Tell us about your space and we&apos;ll get you listed in the Magicalive venue
            directory within 5 business days.
          </p>
          <div className="mb-[18px]">
            <label className={labelClass}>Venue name</label>
            <input
              type="text"
              className={inputClass}
              placeholder="e.g. The Orpheum Theatre"
              value={venueName}
              onChange={(e) => setVenueName(e.target.value)}
            />
          </div>
          <div className="mb-[18px] grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div>
              <label className={labelClass}>City</label>
              <input
                type="text"
                className={inputClass}
                placeholder="e.g. Los Angeles, CA"
                value={venueCity}
                onChange={(e) => setVenueCity(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Capacity</label>
              <input
                type="number"
                className={inputClass}
                placeholder="e.g. 400"
                value={venueCapacity}
                onChange={(e) => setVenueCapacity(e.target.value)}
              />
            </div>
          </div>
          <div className="mb-[18px]">
            <label className={labelClass}>Venue type</label>
            <select
              className={`${inputClass} cursor-pointer`}
              value={venueType}
              onChange={(e) =>
                setVenueType(e.target.value as (typeof VENUE_TYPES)[number])
              }
            >
              {VENUE_TYPES.map((o) => (
                <option key={o} className="bg-zinc-900">
                  {o}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-[18px]">
            <label className={labelClass}>Contact email</label>
            <input
              type="email"
              className={inputClass}
              placeholder="your@venue.com"
              value={venueEmail}
              onChange={(e) => setVenueEmail(e.target.value)}
            />
            <span className={signInHintClass}>
              Already have an account?{" "}
              <Link href="/sign-in" className={signInLinkClass}>
                Sign in
              </Link>
            </span>
          </div>
          <div className="mb-[18px] grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Password</label>
              <input
                type="password"
                className={inputClass}
                placeholder="Min. 8 characters"
                value={venuePassword}
                onChange={(e) => setVenuePassword(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Confirm password</label>
              <input
                type="password"
                className={inputClass}
                placeholder="Repeat password"
                value={venuePasswordConfirm}
                onChange={(e) => setVenuePasswordConfirm(e.target.value)}
              />
            </div>
          </div>
          <div className="mb-[18px]">
            <label className={labelClass}>Brief description</label>
            <textarea
              rows={3}
              className={`${inputClass} resize-y`}
              placeholder="What makes your venue great for magic performances?"
              value={venueDesc}
              onChange={(e) => setVenueDesc(e.target.value)}
            />
          </div>
          {venueError === "exists" ? (
            <p className="mb-3 text-sm font-medium text-red-400">
              An account with this email already exists.{" "}
              <Link href="/sign-in" className={signInLinkClass}>
                Sign in instead?
              </Link>
            </p>
          ) : venueError ? (
            <p className="mb-3 text-sm font-medium text-red-400">{venueError}</p>
          ) : null}
          <label className="mb-3 flex items-start gap-2 text-xs text-zinc-400">
            <input
              type="checkbox"
              checked={venueTermsAccepted}
              onChange={(e) => setVenueTermsAccepted(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              I agree to the Magicalive{" "}
              <Link
                href="/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--ml-gold)] hover:underline"
              >
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--ml-gold)] hover:underline"
              >
                Privacy Policy
              </Link>
            </span>
          </label>
          <button
            type="button"
            onClick={() => void completeVenue()}
            disabled={venueSubmitting || !venueTermsAccepted}
            className={`${CLASSES.btnPrimary} mt-1 text-xs uppercase tracking-wider disabled:opacity-60`}
          >
            {venueSubmitting ? "Submitting…" : "Submit venue →"}
          </button>
        </div>
      </div>

      {/* FOOTER BAR (not site footer) */}
      {showObFooter && !fanFooterHidden ? (
        <div className="mt-auto flex shrink-0 items-center justify-between border-t border-[var(--ml-gold)]/15 px-5 py-5 sm:px-12">
          <button
            type="button"
            onClick={goBack}
            className={`border-0 bg-transparent text-xs uppercase tracking-wider text-zinc-500 transition hover:text-zinc-100 ${
              showBack ? "visible" : "invisible pointer-events-none"
            }`}
          >
            ← Back
          </button>
          <span className="text-xs text-zinc-500">{stepCounterText}</span>
          <div className="flex min-h-[42px] min-w-[140px] items-center justify-end gap-2">
            {showPublish ? (
              <button
                type="button"
                onClick={() => void publishMagician()}
                disabled={publishLoading}
                className={`${CLASSES.btnPrimary} inline-flex items-center justify-center gap-2 px-8 py-3 text-xs uppercase tracking-wider disabled:opacity-60`}
              >
                {publishLoading ? (
                  <>
                    <span
                      className="inline-block size-4 shrink-0 animate-spin rounded-full border-2 border-black/25 border-t-black"
                      aria-hidden
                    />
                    <span>Publishing…</span>
                  </>
                ) : (
                  "Publish my profile ♣"
                )}
              </button>
            ) : showFooterContinue ? (
              <button
                type="button"
                onClick={() => {
                  if (flow === "magician" && mStep === 1) {
                    void handleMagicianStep1Continue();
                  } else {
                    nextStep();
                  }
                }}
                disabled={flow === "magician" && mStep === 1 && !magTermsAccepted}
                className={`${CLASSES.btnPrimary} px-7 py-2.5 text-xs uppercase tracking-wider disabled:opacity-60`}
              >
                Continue →
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
