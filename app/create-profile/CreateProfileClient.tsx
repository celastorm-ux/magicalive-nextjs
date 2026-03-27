'use client';

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
} from "react";
import { LocationPicker } from "@/components/LocationPicker";
import { MAGICIAN_AVAILABLE_FOR_OPTIONS } from "@/lib/available-for-booking";
import { CLASSES } from "@/lib/constants";
import { FoundingMemberSpots } from "@/components/FoundingMemberSpots";
import { countryUsesStatePicker, formatLocation } from "@/lib/locations";
import { generateFanHandle } from "@/lib/generate-fan-handle";
import { supabase } from "@/lib/supabase";
import pkg from "../../package.json";

type MagStep1UiError = null | { kind: "terms" } | { kind: "message"; text: string };

function clerkPrimaryEmail(
  user:
    | {
        primaryEmailAddress?: { emailAddress?: string | null } | null;
        emailAddresses?: Array<{ emailAddress?: string | null }>;
      }
    | null
    | undefined,
): string {
  const primary = user?.primaryEmailAddress?.emailAddress?.trim();
  if (primary) return primary;
  const first = user?.emailAddresses?.[0]?.emailAddress?.trim();
  return first ?? "";
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

const EVENT_TYPES = MAGICIAN_AVAILABLE_FOR_OPTIONS;

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
  const { user, isLoaded } = useUser();
  const typeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [magStep1Error, setMagStep1Error] = useState<MagStep1UiError>(null);
  const [magTermsAccepted, setMagTermsAccepted] = useState(false);

  const [fanTermsAccepted, setFanTermsAccepted] = useState(false);

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
  const [magLocCountry, setMagLocCountry] = useState("");
  const [magLocState, setMagLocState] = useState("");
  const [magLocCity, setMagLocCity] = useState("");
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
    if (!user?.id) {
      setMagStep1Error({
        kind: "message",
        text: "Please sign in to continue.",
      });
      return;
    }
    const name = displayName.trim();
    if (!name) {
      setMagStep1Error({ kind: "message", text: "Please enter your display name" });
      return;
    }
    if (!clerkPrimaryEmail(user)) {
      setMagStep1Error({
        kind: "message",
        text: "Your account needs an email address. Add one in your account settings.",
      });
      return;
    }
    goToM(2);
  }, [isLoaded, user, magTermsAccepted, displayName, goToM]);

  const completeFan = useCallback(async () => {
    setFanError("");
    if (!fanTermsAccepted) {
      setFanError("Please accept the terms to continue");
      return;
    }
    if (!isLoaded || !user?.id) {
      setFanError("Please sign in to continue.");
      return;
    }
    const email = clerkPrimaryEmail(user);
    if (!email) {
      setFanError(
        "Your account does not have an email on file. Add one in your account settings.",
      );
      return;
    }
    const display_name = fanName.trim() || "Fan";
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
  }, [isLoaded, user, fanTermsAccepted, fanName, router]);

  const completeVenue = useCallback(async () => {
    setVenueError("");
    if (!venueTermsAccepted) {
      setVenueError("Please accept the terms to continue");
      return;
    }
    if (!isLoaded || !user?.id) {
      setVenueError("Please sign in to continue.");
      return;
    }
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
    router.push(`/onboarding/venue?venueId=${encodeURIComponent(data.id)}`);
  }, [
    isLoaded,
    user?.id,
    venueTermsAccepted,
    venueName,
    venueCity,
    venueCapacity,
    venueType,
    venueEmail,
    venueDesc,
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
      const emailForRow = clerkPrimaryEmail(user);
      const { error } = await supabase.from("profiles").insert({
        id: String(ClerkUserId),
        display_name: displayName.trim(),
        handle: handle.replace(/^@/, "").trim(),
        email: emailForRow,
        location: formatLocation(magLocCity, magLocState, magLocCountry).trim() || null,
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
      user,
      displayName,
      handle,
      magLocCity,
      magLocState,
      magLocCountry,
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
    if (!isLoaded || !user?.id) {
      setPublishError(
        "You need to be signed in to publish. Refresh the page or sign in again.",
      );
      return;
    }
    if (!clerkPrimaryEmail(user)) {
      setPublishError(
        "Your account needs an email address before we can publish your profile.",
      );
      return;
    }
    setPublishLoading(true);
    try {
      await saveMagicianProfileToSupabase(String(user.id));
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
  }, [isLoaded, user, saveMagicianProfileToSupabase, router]);

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

  const previewName = displayName.trim() || "Your name";
  const previewLoc = formatLocation(magLocCity, magLocState, magLocCountry).trim() || "Your location";
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
              Welcome!{" "}
              <em className="text-[var(--ml-gold)] italic">Let&apos;s set up your profile.</em>
            </h2>
            <p className="mb-4 text-[13px] leading-relaxed text-zinc-500">
              You&apos;re signed in — add how you&apos;d like to appear on Magicalive. Your
              login email is already on file from your account.
            </p>
            <p className="mb-8 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[13px] text-zinc-300">
              <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">
                Signed in as
              </span>
              <br />
              <span className="font-medium text-zinc-100">
                {clerkPrimaryEmail(user) || "—"}
              </span>
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
          <div className="mb-[18px]">
            <LocationPicker
              selectedCountry={magLocCountry}
              selectedState={magLocState}
              selectedCity={magLocCity}
              onCountryChange={setMagLocCountry}
              onStateChange={setMagLocState}
              onCityChange={setMagLocCity}
              required
            />
          </div>
          <div className="mb-[18px]">
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
            You&apos;re signed in — choose how you&apos;d like to appear. Your email comes
            from your Magicalive account.
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
              <p className="mb-[18px] rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[13px] text-zinc-300">
                <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">
                  Signed in as
                </span>
                <br />
                <span className="font-medium text-zinc-100">
                  {clerkPrimaryEmail(user) || "—"}
                </span>
              </p>
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
              Public-facing contact for bookings and listings (can differ from your login
              email).
            </span>
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
                disabled={
                  (flow === "magician" && mStep === 1 && !magTermsAccepted) ||
                  (flow === "magician" &&
                    mStep === 2 &&
                    (!magLocCountry.trim() ||
                      !magLocCity.trim() ||
                      (countryUsesStatePicker(magLocCountry) && !magLocState.trim())))
                }
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
