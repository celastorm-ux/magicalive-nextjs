"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { CLASSES } from "@/lib/constants";
import { supabase } from "@/lib/supabase";

type AdminTab = "articles" | "magicians" | "venues" | "users";

type ArticleAdminRow = {
  id: string;
  title: string | null;
  excerpt: string | null;
  body: string | null;
  category: string | null;
  status: string | null;
  author_id: string | null;
  author_name: string | null;
  published_at: string | null;
  created_at: string | null;
  view_count: number | null;
  like_count: number | null;
  rejection_reason: string | null;
  cover_image_url: string | null;
};

type MagicianAdminRow = {
  id: string;
  display_name: string | null;
  location: string | null;
  is_verified: boolean | null;
  is_unclaimed?: boolean | null;
  updated_at: string | null;
  created_at: string | null;
  review_count: number | null;
  show_count: number;
};

const ADMIN_SPEC_TAGS = [
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

const VENUE_SELECT_PLACEHOLDER = "";
const VENUE_OTHER = "__other__";
type PostEventKind = "show" | "lecture";

type AdminVenueOpt = { id: string; name: string | null; city: string | null; state: string | null };

type VenueAdminRow = {
  id: string;
  name: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  venue_type: string | null;
  full_address: string | null;
  capacity: number | string | null;
  website: string | null;
  description: string | null;
  submitter_name: string | null;
  submitter_email: string | null;
  contact_email: string | null;
  created_at: string | null;
  is_verified: boolean | null;
  latitude: number | string | null;
  longitude: number | string | null;
};

type UserAdminRow = {
  id: string;
  display_name: string | null;
  email: string | null;
  account_type: string | null;
  is_admin: boolean | null;
  updated_at: string | null;
  created_at: string | null;
};

const TABS: Array<{ id: AdminTab; label: string }> = [
  { id: "articles", label: "Articles" },
  { id: "magicians", label: "Magicians" },
  { id: "venues", label: "Venues" },
  { id: "users", label: "Users" },
];

function wordCount(body: string | null | undefined): number {
  const t = body?.trim() || "";
  if (!t) return 0;
  return t.split(/\s+/).filter(Boolean).length;
}

function fmtShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function fmtSubmitted(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/** Stable public handle for unclaimed profiles (required by directory / claim flow). */
function slugHandleForUnclaimed(displayName: string, idSuffix: string): string {
  const base = displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
  return `${base || "magician"}-${idSuffix.slice(0, 6)}`;
}

export default function AdminClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoaded } = useUser();

  const tabParam = searchParams.get("tab") as AdminTab | null;
  const tab: AdminTab = TABS.some((t) => t.id === tabParam) ? (tabParam as AdminTab) : "articles";

  const [gateLoading, setGateLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  const [articles, setArticles] = useState<ArticleAdminRow[]>([]);
  const [articleFilter, setArticleFilter] = useState<"all" | "pending" | "published" | "rejected">("all");
  const [magicians, setMagicians] = useState<MagicianAdminRow[]>([]);
  const [venues, setVenues] = useState<VenueAdminRow[]>([]);
  const [users, setUsers] = useState<UserAdminRow[]>([]);

  const [dataLoading, setDataLoading] = useState(false);
  const [actionErr, setActionErr] = useState("");

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectArticleId, setRejectArticleId] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  const [showAddMagician, setShowAddMagician] = useState(false);
  const [newMagName, setNewMagName] = useState("");
  const [newMagLocation, setNewMagLocation] = useState("");
  const [newMagTags, setNewMagTags] = useState<string[]>([]);
  const [newMagBio, setNewMagBio] = useState("");
  const [amInstagram, setAmInstagram] = useState("");
  const [amYoutube, setAmYoutube] = useState("");
  const [amTiktok, setAmTiktok] = useState("");
  const [amWebsite, setAmWebsite] = useState("");
  const [amBusy, setAmBusy] = useState(false);
  const [amMsg, setAmMsg] = useState("");

  const [postForMagicianId, setPostForMagicianId] = useState<string | null>(null);
  const [postVenues, setPostVenues] = useState<AdminVenueOpt[]>([]);
  const [postShowName, setPostShowName] = useState("");
  const [postShowDate, setPostShowDate] = useState("");
  const [postShowTime, setPostShowTime] = useState("");
  const [postVenueSelect, setPostVenueSelect] = useState(VENUE_SELECT_PLACEHOLDER);
  const [postVenueName, setPostVenueName] = useState("");
  const [postCity, setPostCity] = useState("");
  const [postState, setPostState] = useState("");
  const [postTicketUrl, setPostTicketUrl] = useState("");
  const [postIsPublic, setPostIsPublic] = useState(true);
  const [postEventType, setPostEventType] = useState<PostEventKind>("show");
  const [postBusy, setPostBusy] = useState(false);
  const [postErr, setPostErr] = useState("");
  const [postSuccess, setPostSuccess] = useState("");

  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [pasteUrl, setPasteUrl] = useState("");
  const [coverSaving, setCoverSaving] = useState(false);
  const [coverSuccessId, setCoverSuccessId] = useState<string | null>(null);
  const coverFileInputRef = useRef<HTMLInputElement | null>(null);

  const [geocodeBusy, setGeocodeBusy] = useState(false);
  const [geocodeMsg, setGeocodeMsg] = useState("");
  const [venueApprovedBanner, setVenueApprovedBanner] = useState<string | null>(null);
  const [pendingVenueBusyId, setPendingVenueBusyId] = useState<string | null>(null);
  const [editingVenueId, setEditingVenueId] = useState<string | null>(null);
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");
  const [manualSaving, setManualSaving] = useState(false);

  const setTab = useCallback(
    (next: AdminTab) => {
      const p = new URLSearchParams(searchParams.toString());
      p.set("tab", next);
      router.replace(`/admin?${p.toString()}`);
    },
    [router, searchParams],
  );

  useEffect(() => {
    if (!isLoaded) return;
    if (!user?.id) {
      router.replace("/sign-in");
      return;
    }
    void (async () => {
      const { data } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
      const ok = Boolean((data as { is_admin?: boolean | null } | null)?.is_admin);
      setAllowed(ok);
      setGateLoading(false);
      if (!ok) {
        router.replace("/");
      }
    })();
  }, [isLoaded, user?.id, router]);

  const fetchTab = useCallback(async () => {
    if (!allowed) return;
    setDataLoading(true);
    setActionErr("");
    try {
      if (tab === "articles") {
        const res = await fetch("/api/admin/articles");
        const json = (await res.json()) as { ok?: boolean; articles?: ArticleAdminRow[]; error?: string };
        if (!res.ok || !json.ok) throw new Error(json.error || "Failed to load articles");
        setArticles(json.articles ?? []);
      } else if (tab === "magicians") {
        const res = await fetch("/api/admin/magicians");
        const json = (await res.json()) as { ok?: boolean; magicians?: MagicianAdminRow[]; error?: string };
        if (!res.ok || !json.ok) throw new Error(json.error || "Failed to load magicians");
        setMagicians(json.magicians ?? []);
      } else if (tab === "venues") {
        const res = await fetch("/api/admin/venues");
        const json = (await res.json()) as { ok?: boolean; venues?: VenueAdminRow[]; error?: string };
        if (!res.ok || !json.ok) throw new Error(json.error || "Failed to load venues");
        setVenues(json.venues ?? []);
      } else if (tab === "users") {
        const res = await fetch("/api/admin/users");
        const json = (await res.json()) as { ok?: boolean; users?: UserAdminRow[]; error?: string };
        if (!res.ok || !json.ok) throw new Error(json.error || "Failed to load users");
        setUsers(json.users ?? []);
      }
    } catch (e) {
      setActionErr(e instanceof Error ? e.message : "Request failed");
    } finally {
      setDataLoading(false);
    }
  }, [allowed, tab]);

  useEffect(() => {
    if (!gateLoading && allowed) void fetchTab();
  }, [gateLoading, allowed, fetchTab]);

  const filteredArticles = useMemo(() => {
    if (articleFilter === "all") return articles;
    return articles.filter((a) => (a.status || "").toLowerCase() === articleFilter);
  }, [articles, articleFilter]);

  const pendingVenues = useMemo(
    () => venues.filter((v) => v.is_verified === false),
    [venues],
  );

  const verifiedVenuesForTable = useMemo(
    () => venues.filter((v) => v.is_verified !== false),
    [venues],
  );

  const venuesMissingCoords = useMemo(() => venues.filter((v) => v.latitude == null).length, [venues]);

  const sortedVenues = useMemo(() => {
    return [...verifiedVenuesForTable].sort(
      (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime(),
    );
  }, [verifiedVenuesForTable]);

  useEffect(() => {
    if (tab === "articles" && !dataLoading && articles.length === 0) {
      console.log("Articles:", articles);
    }
  }, [tab, dataLoading, articles]);

  const publishArticle = async (id: string) => {
    setActionErr("");
    const res = await fetch("/api/admin/articles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "publish", articleId: id }),
    });
    const json = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || !json.ok) {
      setActionErr(json.error || "Publish failed");
      return;
    }
    void fetchTab();
  };

  const unpublishArticle = async (id: string) => {
    setActionErr("");
    const res = await fetch("/api/admin/articles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "unpublish", articleId: id }),
    });
    const json = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || !json.ok) {
      setActionErr(json.error || "Unpublish failed");
      return;
    }
    void fetchTab();
  };

  const deleteArticle = async (id: string) => {
    if (!window.confirm("Permanently delete this article? This cannot be undone.")) return;
    setActionErr("");
    const res = await fetch("/api/admin/articles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", articleId: id }),
    });
    const json = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || !json.ok) {
      setActionErr(json.error || "Delete failed");
      return;
    }
    void fetchTab();
  };

  const submitReject = async () => {
    const reason = rejectReason.trim();
    if (!reason || !rejectArticleId) return;
    setActionErr("");
    const res = await fetch("/api/admin/articles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject", articleId: rejectArticleId, reason }),
    });
    const json = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || !json.ok) {
      setActionErr(json.error || "Reject failed");
      return;
    }
    setRejectOpen(false);
    setRejectArticleId("");
    setRejectReason("");
    void fetchTab();
  };

  const toggleMagicianVerified = async (profileId: string, next: boolean) => {
    setActionErr("");
    const res = await fetch("/api/admin/magicians", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId, is_verified: next }),
    });
    const json = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || !json.ok) {
      setActionErr(json.error || "Update failed");
      return;
    }
    void fetchTab();
  };

  const openAddMagicianModal = () => {
    setNewMagName("");
    setNewMagLocation("");
    setNewMagTags([]);
    setNewMagBio("");
    setAmInstagram("");
    setAmYoutube("");
    setAmTiktok("");
    setAmWebsite("");
    setAmMsg("");
    setShowAddMagician(true);
  };

  const toggleAmTag = (t: string) => {
    setNewMagTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const submitAddMagician = async () => {
    const name = newMagName.trim();
    if (!name) {
      setAmMsg("Display name is required");
      return;
    }
    setAmBusy(true);
    setAmMsg("");
    const rand = Math.random().toString(36).slice(2, 11);
    const id = `unclaimed_${Date.now()}_${rand}`;
    const row = {
      id,
      display_name: name,
      location: newMagLocation.trim() || null,
      specialty_tags: newMagTags,
      short_bio: newMagBio.trim() || null,
      account_type: "magician" as const,
      is_unclaimed: true,
      is_verified: false,
      instagram: amInstagram.trim() || null,
      youtube: amYoutube.trim() || null,
      tiktok: amTiktok.trim() || null,
      website: amWebsite.trim() || null,
      handle: slugHandleForUnclaimed(name, rand),
      unclaimed_name: name,
    };
    const { error } = await supabase.from("profiles").insert(row);
    setAmBusy(false);
    if (error) {
      setAmMsg(error.message || "Create failed");
      return;
    }
    setAmMsg("Profile created successfully");
    void fetchTab();
    window.setTimeout(() => {
      setShowAddMagician(false);
      setAmMsg("");
    }, 1100);
  };

  const resetPostShowForm = () => {
    setPostShowName("");
    setPostShowDate("");
    setPostShowTime("");
    setPostVenueSelect(VENUE_SELECT_PLACEHOLDER);
    setPostVenueName("");
    setPostCity("");
    setPostState("");
    setPostTicketUrl("");
    setPostIsPublic(true);
    setPostEventType("show");
    setPostErr("");
    setPostSuccess("");
  };

  const openPostShowModal = async (magicianId: string) => {
    setPostForMagicianId(magicianId);
    resetPostShowForm();
    const { data, error } = await supabase
      .from("venues")
      .select("id, name, city, state")
      .or("is_verified.is.null,is_verified.eq.true")
      .order("name", { ascending: true });
    if (!error && data) {
      setPostVenues(
        data.map((v) => ({
          id: String(v.id),
          name: v.name ?? null,
          city: v.city ?? null,
          state: v.state ?? null,
        })),
      );
    } else {
      setPostVenues([]);
    }
  };

  const submitAdminPostShow = async () => {
    if (!postForMagicianId) return;
    setPostErr("");
    setPostSuccess("");
    if (!postShowName.trim() || !postShowDate) {
      setPostErr("Show name and date are required.");
      return;
    }
    if (postVenueSelect === VENUE_SELECT_PLACEHOLDER) {
      setPostErr('Select a venue or choose "Other".');
      return;
    }
    if (postVenueSelect === VENUE_OTHER && !postVenueName.trim()) {
      setPostErr("Venue name is required when you choose Other.");
      return;
    }
    if (!postCity.trim()) {
      setPostErr("City is required.");
      return;
    }

    const normalizedDate = /^\d{4}-\d{2}-\d{2}$/.test(postShowDate)
      ? postShowDate
      : new Date(postShowDate).toISOString().slice(0, 10);

    const venueIdForInsert =
      postVenueSelect !== VENUE_OTHER && postVenueSelect !== VENUE_SELECT_PLACEHOLDER
        ? postVenueSelect
        : null;

    const row = {
      magician_id: postForMagicianId,
      name: postShowName.trim(),
      date: normalizedDate,
      time: postShowTime.trim() || "",
      venue_name: postVenueName.trim(),
      city: postCity.trim(),
      state: postState.trim() || null,
      venue_id: venueIdForInsert,
      ticket_url: postTicketUrl.trim() || null,
      is_public: postIsPublic,
      event_type: postEventType,
      skill_level: postEventType === "lecture" ? "All levels" : null,
      includes_workbook: false,
      includes_props: false,
      max_attendees: null,
      is_online: false,
      is_past: false,
    };

    setPostBusy(true);
    const { error } = await supabase.from("shows").insert(row);
    setPostBusy(false);
    if (error) {
      console.error("Admin post event — Supabase error:", error);
      setPostErr(error.message || "Failed to create event");
      return;
    }
    setPostSuccess(postEventType === "lecture" ? "Lecture posted." : "Show posted.");
    void fetchTab();
    window.setTimeout(() => {
      setPostForMagicianId(null);
      resetPostShowForm();
    }, 900);
  };

  const approveVenue = async (venue: VenueAdminRow) => {
    setActionErr("");
    setVenueApprovedBanner(null);
    setPendingVenueBusyId(venue.id);
    try {
      const { error } = await supabase
        .from("venues")
        .update({ is_verified: true })
        .eq("id", venue.id);
      if (error) {
        setActionErr(error.message || "Could not approve venue");
        return;
      }

      let nextLat: number | string | null = venue.latitude;
      let nextLng: number | string | null = venue.longitude;
      let geoSuffix = "";

      const needsGeocode = venue.latitude == null || venue.longitude == null;
      if (needsGeocode) {
        try {
          const geoRes = await fetch("/api/admin/geocode-venue", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: venue.name ?? "",
              city: venue.city ?? "",
              state: venue.state ?? "",
              country: venue.country ?? "",
              full_address: venue.full_address ?? "",
            }),
          });
          const geoJson = (await geoRes.json()) as {
            ok?: boolean;
            lat?: number;
            lon?: number;
            error?: string;
          };
          if (geoRes.ok && geoJson.ok && geoJson.lat != null && geoJson.lon != null) {
            const { error: coordErr } = await supabase
              .from("venues")
              .update({
                latitude: geoJson.lat,
                longitude: geoJson.lon,
              })
              .eq("id", venue.id);
            if (!coordErr) {
              nextLat = geoJson.lat;
              nextLng = geoJson.lon;
              geoSuffix = " Coordinates added from OpenStreetMap.";
            }
          }
        } catch {
          // Geocode is best-effort; venue stays approved without coords
        }
      }

      setVenues((prev) =>
        prev.map((v) =>
          v.id === venue.id
            ? {
                ...v,
                is_verified: true,
                latitude: nextLat,
                longitude: nextLng,
              }
            : v,
        ),
      );

      setVenueApprovedBanner(`Approved.${geoSuffix}`);
      window.setTimeout(() => setVenueApprovedBanner(null), 8000);
    } finally {
      setPendingVenueBusyId(null);
    }
  };

  const rejectVenue = async (venueId: string) => {
    if (!window.confirm("Are you sure you want to reject and delete this venue?")) return;
    setActionErr("");
    setPendingVenueBusyId(venueId);
    try {
      const { error } = await supabase.from("venues").delete().eq("id", venueId);
      if (error) {
        setActionErr(error.message || "Could not delete venue");
        return;
      }
      setVenues((prev) => prev.filter((v) => v.id !== venueId));
    } finally {
      setPendingVenueBusyId(null);
    }
  };

  const runGeocodeVenues = async () => {
    setActionErr("");
    setGeocodeMsg("");
    setGeocodeBusy(true);
    try {
      const res = await fetch("/api/geocode-venues", { method: "POST" });
      const json = (await res.json()) as {
        success?: boolean;
        geocoded?: number;
        failed?: number;
        total?: number;
        error?: string;
        ok?: boolean;
      };
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Geocoding failed");
      }
      const n = json.geocoded ?? 0;
      setGeocodeMsg(`Geocoded ${n} venues successfully`);
      await fetchTab();
    } catch (e) {
      setActionErr(e instanceof Error ? e.message : "Geocoding failed");
    } finally {
      setGeocodeBusy(false);
    }
  };

  const openLocationEditor = (v: VenueAdminRow) => {
    setActionErr("");
    setEditingVenueId(v.id);
    setManualLat(v.latitude != null ? String(v.latitude) : "");
    setManualLng(v.longitude != null ? String(v.longitude) : "");
  };

  const saveManualVenueLocation = async (venueId: string) => {
    const lat = parseFloat(manualLat.trim());
    const lng = parseFloat(manualLng.trim());
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setActionErr("Enter valid latitude and longitude numbers.");
      return;
    }
    setActionErr("");
    setManualSaving(true);
    try {
      const res = await fetch("/api/admin/venues", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venueId, latitude: lat, longitude: lng }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setActionErr(json.error || "Save failed");
        return;
      }
      setEditingVenueId(null);
      await fetchTab();
    } finally {
      setManualSaving(false);
    }
  };

  const toggleUserAdmin = async (uid: string, next: boolean) => {
    setActionErr("");
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: uid, is_admin: next }),
    });
    const json = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || !json.ok) {
      setActionErr(json.error || "Update failed");
      return;
    }
    void fetchTab();
  };

  const deleteUser = async (uid: string) => {
    if (!window.confirm("Permanently delete this account? This cannot be undone.")) return;
    setActionErr("");
    const res = await fetch(`/api/admin/users?userId=${encodeURIComponent(uid)}`, { method: "DELETE" });
    const json = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || !json.ok) {
      setActionErr(json.error || "Delete failed");
      return;
    }
    void fetchTab();
  };

  const closeImageUpload = useCallback(() => {
    setFilePreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setSelectedFile(null);
    setPasteUrl("");
    setUploadingFor(null);
    if (coverFileInputRef.current) coverFileInputRef.current.value = "";
  }, []);

  const openImageUpload = (articleId: string) => {
    setFilePreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setSelectedFile(null);
    setPasteUrl("");
    setUploadingFor(articleId);
    if (coverFileInputRef.current) coverFileInputRef.current.value = "";
    setActionErr("");
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!["image/jpeg", "image/png"].includes(f.type)) {
      setActionErr("Please choose a JPG or PNG file.");
      return;
    }
    setActionErr("");
    setSelectedFile(f);
    setFilePreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(f);
    });
  };

  const uploadCoverImage = async (articleId: string) => {
    if (!selectedFile) return;
    setCoverSaving(true);
    setActionErr("");
    try {
      const path = `${articleId}/cover.jpg`;
      const { error: upErr } = await supabase.storage
        .from("article-covers")
        .upload(path, selectedFile, { upsert: true, contentType: selectedFile.type });
      if (upErr) throw new Error(upErr.message);
      const { data: pub } = supabase.storage.from("article-covers").getPublicUrl(path);
      const publicUrl = pub.publicUrl;
      const { error: dbErr } = await supabase.from("articles").update({ cover_image_url: publicUrl }).eq("id", articleId);
      if (dbErr) throw new Error(dbErr.message);
      closeImageUpload();
      setCoverSuccessId(articleId);
      window.setTimeout(() => {
        setCoverSuccessId((id) => (id === articleId ? null : id));
      }, 3800);
      void fetchTab();
    } catch (e) {
      setActionErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setCoverSaving(false);
    }
  };

  const saveImageUrl = async (articleId: string) => {
    const raw = pasteUrl.trim();
    if (!raw) return;
    let parsed: URL;
    try {
      parsed = new URL(raw);
    } catch {
      setActionErr("Enter a valid http(s) image URL.");
      return;
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      setActionErr("URL must start with http:// or https://");
      return;
    }
    setCoverSaving(true);
    setActionErr("");
    try {
      const { error: dbErr } = await supabase.from("articles").update({ cover_image_url: raw }).eq("id", articleId);
      if (dbErr) throw new Error(dbErr.message);
      closeImageUpload();
      setCoverSuccessId(articleId);
      window.setTimeout(() => {
        setCoverSuccessId((id) => (id === articleId ? null : id));
      }, 3800);
      void fetchTab();
    } catch (e) {
      setActionErr(e instanceof Error ? e.message : "Update failed");
    } finally {
      setCoverSaving(false);
    }
  };

  const previewArticle = (id: string) => {
    window.open(`/articles/${encodeURIComponent(id)}/preview`, "_blank", "noopener,noreferrer");
  };

  if (gateLoading || !allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-zinc-500">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-24 pt-10 text-zinc-100">
      <div className={`${CLASSES.section} max-w-6xl`}>
        <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--ml-gold)]">
          Administration
        </p>
        <h1 className="ml-font-heading text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">
          Magicalive <span className="text-[var(--ml-gold)] italic">admin</span>
        </h1>

        <div className="mt-8 flex flex-wrap gap-2 border-b border-white/10 pb-4">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wider transition ${
                tab === t.id
                  ? "border-[var(--ml-gold)] bg-[var(--ml-gold)]/15 text-[var(--ml-gold)]"
                  : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/20 hover:text-zinc-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {actionErr ? <p className="mt-4 text-sm text-red-400">{actionErr}</p> : null}

        {tab === "articles" ? (
          <section className="mt-8">
            <div className="mb-6 flex flex-wrap gap-2">
              {(["all", "pending", "published", "rejected"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setArticleFilter(f)}
                  className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider ${
                    articleFilter === f
                      ? "border-white/25 bg-white/10 text-zinc-100"
                      : "border-white/10 text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            {dataLoading ? (
              <p className="text-sm text-zinc-500">Loading articles…</p>
            ) : (
              <ul className="space-y-4">
                {filteredArticles.map((article) => {
                  const st = (article.status || "").toLowerCase();
                  const coverUrl = article.cover_image_url?.trim() || null;
                  return (
                    <li
                      key={article.id}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h2 className="ml-font-heading text-lg font-semibold text-zinc-100">
                            {article.title?.trim() || "Untitled"}
                          </h2>
                          <p className="mt-1 text-xs text-zinc-500">
                            {article.author_name || "Unknown"} · {article.category || "—"} · Submitted{" "}
                            {fmtShort(article.created_at || article.published_at)} · {wordCount(article.body)} words
                          </p>
                          <p className="mt-2 line-clamp-2 text-sm text-zinc-400">{article.excerpt || "—"}</p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-wider ${
                            st === "published"
                              ? "border-emerald-500/40 text-emerald-300"
                              : st === "pending"
                                ? "border-[var(--ml-gold)]/40 text-[var(--ml-gold)]"
                                : "border-red-500/35 text-red-300"
                          }`}
                        >
                          {article.status || "—"}
                        </span>
                      </div>

                      <div className="button-row mt-4 flex flex-wrap items-center gap-2">
                        <Link
                          href={`/articles/${encodeURIComponent(article.id)}/edit`}
                          className="inline-flex shrink-0 items-center justify-center rounded-lg border border-[var(--ml-gold)]/50 bg-[var(--ml-gold)]/[0.08] px-3 py-2 text-xs font-semibold text-[var(--ml-gold)] transition hover:border-[var(--ml-gold)]/75 hover:bg-[var(--ml-gold)]/14"
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => openImageUpload(article.id)}
                          className="inline-flex shrink-0 items-center justify-center rounded-lg border border-white/12 bg-white/[0.04] px-3 py-2 text-xs font-medium text-zinc-300 transition hover:border-white/20 hover:bg-white/[0.08]"
                        >
                          {coverUrl ? "Change image" : "Add cover image"}
                        </button>

                        {st === "pending" ? (
                          <>
                            <button
                              type="button"
                              onClick={() => void publishArticle(article.id)}
                              className={CLASSES.btnPrimarySm}
                            >
                              Publish
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRejectArticleId(article.id);
                                setRejectReason("");
                                setRejectOpen(true);
                              }}
                              className="rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-semibold text-red-300 transition hover:bg-red-500/10"
                            >
                              Reject
                            </button>
                            <button
                              type="button"
                              onClick={() => previewArticle(article.id)}
                              className={CLASSES.btnSecondarySm}
                            >
                              Preview
                            </button>
                          </>
                        ) : null}

                        {st === "published" ? (
                          <>
                            <button
                              type="button"
                              onClick={() => void unpublishArticle(article.id)}
                              className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-200 transition hover:border-amber-500/35 hover:bg-amber-500/10"
                            >
                              Unpublish
                            </button>
                            <button
                              type="button"
                              onClick={() => previewArticle(article.id)}
                              className={CLASSES.btnSecondarySm}
                            >
                              Preview
                            </button>
                          </>
                        ) : null}

                        {st === "rejected" ? (
                          <>
                            <button
                              type="button"
                              onClick={() => void publishArticle(article.id)}
                              className={CLASSES.btnPrimarySm}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => previewArticle(article.id)}
                              className={CLASSES.btnSecondarySm}
                            >
                              Preview
                            </button>
                          </>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => void deleteArticle(article.id)}
                          className="rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-semibold text-red-300 transition hover:bg-red-500/10"
                        >
                          Delete
                        </button>

                        {coverSuccessId === article.id ? (
                          <span className="text-xs font-medium text-emerald-400">Cover image added</span>
                        ) : null}
                      </div>

                      {uploadingFor === article.id ? (
                        <div className="mt-4 rounded-xl border border-[var(--ml-gold)]/25 bg-black/50 p-4">
                          <input
                            ref={coverFileInputRef}
                            type="file"
                            accept="image/jpeg,image/png"
                            className="block w-full max-w-sm cursor-pointer text-xs text-zinc-400 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-zinc-200 hover:file:bg-white/15"
                            onChange={handleFileSelect}
                          />
                          {selectedFile && filePreviewUrl ? (
                            <div className="mt-3">
                              <img
                                src={filePreviewUrl}
                                alt="Preview"
                                className="h-[80px] w-[120px] rounded-[2px] border border-white/10 object-cover"
                              />
                            </div>
                          ) : null}
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              disabled={!selectedFile || coverSaving}
                              onClick={() => void uploadCoverImage(article.id)}
                              className="rounded-lg bg-[var(--ml-gold)] px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-[var(--ml-gold-hover)] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {coverSaving ? "Uploading…" : "Upload image"}
                            </button>
                            <button
                              type="button"
                              onClick={closeImageUpload}
                              className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-400 transition hover:text-zinc-200"
                            >
                              Cancel
                            </button>
                          </div>
                          <p className="mt-4 text-center text-[11px] text-zinc-500">— or —</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <input
                              type="text"
                              value={pasteUrl}
                              onChange={(e) => setPasteUrl(e.target.value)}
                              placeholder="Paste image URL"
                              className="min-w-[200px] flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-[var(--ml-gold)]/40"
                            />
                            <button
                              type="button"
                              disabled={coverSaving || !pasteUrl.trim()}
                              onClick={() => void saveImageUrl(article.id)}
                              className="rounded-lg border border-[var(--ml-gold)]/40 bg-[var(--ml-gold)]/10 px-3 py-2 text-xs font-semibold text-[var(--ml-gold)] transition hover:bg-[var(--ml-gold)]/20 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Save URL
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
                {!filteredArticles.length ? <p className="text-sm text-zinc-500">No articles in this filter.</p> : null}
              </ul>
            )}
          </section>
        ) : null}

        {tab === "magicians" ? (
          <section className="mt-8 overflow-x-auto">
            <div style={{ marginBottom: 16, display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => {
                  openAddMagicianModal();
                }}
                style={{
                  background: "var(--gold)",
                  color: "var(--ink)",
                  border: "none",
                  padding: "10px 20px",
                  borderRadius: 2,
                  cursor: "pointer",
                  fontFamily: "DM Sans, ui-sans-serif, system-ui, sans-serif",
                  fontSize: 12,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                + Add magician
              </button>
            </div>
            {dataLoading ? (
              <p className="text-sm text-zinc-500">Loading…</p>
            ) : (
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-zinc-500">
                    <th className="py-3 pr-4">Name</th>
                    <th className="py-3 pr-4">Location</th>
                    <th className="py-3 pr-4">Joined</th>
                    <th className="py-3 pr-4">Shows</th>
                    <th className="py-3 pr-4">Reviews</th>
                    <th className="py-3 pr-4">Verified</th>
                    <th className="py-3 pr-4">Actions</th>
                    <th className="py-3">Profile</th>
                  </tr>
                </thead>
                <tbody>
                  {magicians.map((m) => (
                    <tr key={m.id} className="border-b border-white/5">
                      <td className="py-3 pr-4 font-medium text-zinc-200">
                        {m.display_name || "—"}
                        {m.is_unclaimed ? (
                          <span className="ml-2 rounded border border-amber-500/35 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-200/90">
                            Unclaimed
                          </span>
                        ) : null}
                      </td>
                      <td className="py-3 pr-4 text-zinc-400">{m.location || "—"}</td>
                      <td className="py-3 pr-4 text-zinc-500">{fmtShort(m.created_at || m.updated_at)}</td>
                      <td className="py-3 pr-4 text-zinc-400">{m.show_count}</td>
                      <td className="py-3 pr-4 text-zinc-400">{Number(m.review_count ?? 0)}</td>
                      <td className="py-3 pr-4">
                        <button
                          type="button"
                          onClick={() => void toggleMagicianVerified(m.id, !m.is_verified)}
                          className="text-xs font-semibold text-[var(--ml-gold)] hover:underline"
                        >
                          {m.is_verified ? "On" : "Off"}
                        </button>
                      </td>
                      <td className="py-3 pr-4">
                        <button
                          type="button"
                          onClick={() => void openPostShowModal(m.id)}
                          className="text-xs font-semibold text-zinc-300 underline decoration-white/20 hover:text-[var(--ml-gold)]"
                        >
                          Post event
                        </button>
                      </td>
                      <td className="py-3">
                        <Link
                          href={`/profile/magician?id=${encodeURIComponent(m.id)}`}
                          className="text-xs text-zinc-400 hover:text-[var(--ml-gold)]"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!dataLoading && !magicians.length ? <p className="mt-4 text-sm text-zinc-500">No magicians.</p> : null}
          </section>
        ) : null}

        {tab === "venues" ? (
          <section className="mt-8 overflow-x-auto">
            <div className="mb-8 rounded-2xl border border-[var(--ml-gold)]/30 bg-[var(--ml-gold)]/[0.06] p-5 sm:p-6">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="ml-font-heading text-lg font-semibold text-zinc-100">
                    Pending submissions
                  </h2>
                  <p className="mt-1 text-sm font-medium text-[var(--ml-gold)]">
                    {pendingVenues.length === 1
                      ? "1 venue awaiting review"
                      : `${pendingVenues.length} venues awaiting review`}
                  </p>
                </div>
              </div>
              {venueApprovedBanner ? (
                <div
                  className="mt-4 rounded-xl border border-emerald-400/45 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-200"
                  role="status"
                >
                  {venueApprovedBanner}
                </div>
              ) : null}
              {pendingVenues.length === 0 ? (
                <p className="mt-4 text-sm text-zinc-500">No pending venue submissions.</p>
              ) : (
                <div className="mt-5 space-y-4">
                  {pendingVenues.map((v) => (
                    <div
                      key={v.id}
                      className="rounded-2xl border border-white/10 bg-black/50 p-4 sm:p-5 shadow-[0_0_0_1px_rgba(201,168,76,0.08)_inset]"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex flex-wrap items-center gap-2">
                          <span
                            className={`${CLASSES.pillGold} border-[var(--ml-gold)]/50 bg-[var(--ml-gold)]/15 text-[var(--ml-gold)]`}
                          >
                            Pending
                          </span>
                          <h3 className="ml-font-heading text-base font-semibold text-zinc-50 sm:text-lg">
                            {v.name || "—"}
                          </h3>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={pendingVenueBusyId !== null}
                            onClick={() => void approveVenue(v)}
                            className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-45"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={pendingVenueBusyId !== null}
                            onClick={() => void rejectVenue(v.id)}
                            className={`${CLASSES.btnSecondarySm} border-red-400/35 text-red-200 hover:border-red-400/55 hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-45`}
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                        <div>
                          <dt className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                            Type
                          </dt>
                          <dd className="mt-0.5 text-zinc-200">{v.venue_type || "—"}</dd>
                        </div>
                        <div>
                          <dt className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                            City / state / country
                          </dt>
                          <dd className="mt-0.5 text-zinc-200">
                            {[v.city, v.state, v.country].filter(Boolean).join(", ") || "—"}
                          </dd>
                        </div>
                        <div className="sm:col-span-2 lg:col-span-1">
                          <dt className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                            Address
                          </dt>
                          <dd className="mt-0.5 text-zinc-200">{v.full_address?.trim() || "—"}</dd>
                        </div>
                        <div>
                          <dt className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                            Capacity
                          </dt>
                          <dd className="mt-0.5 text-zinc-200">
                            {v.capacity != null && v.capacity !== ""
                              ? Number(v.capacity).toLocaleString()
                              : "—"}
                          </dd>
                        </div>
                        <div className="sm:col-span-2">
                          <dt className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                            Website
                          </dt>
                          <dd className="mt-0.5 break-all text-zinc-200">
                            {v.website?.trim() ? (
                              <a
                                href={
                                  v.website.trim().startsWith("http")
                                    ? v.website.trim()
                                    : `https://${v.website.trim()}`
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[var(--ml-gold)] hover:underline"
                              >
                                {v.website.trim()}
                              </a>
                            ) : (
                              "—"
                            )}
                          </dd>
                        </div>
                        <div className="sm:col-span-2 lg:col-span-3">
                          <dt className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                            Description
                          </dt>
                          <dd className="mt-0.5 whitespace-pre-wrap text-zinc-300">
                            {v.description?.trim() || "—"}
                          </dd>
                        </div>
                        <div className="sm:col-span-2">
                          <dt className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                            Submitted by
                          </dt>
                          <dd className="mt-0.5 text-zinc-200">
                            {v.submitter_name?.trim() || "—"}
                            {v.submitter_email?.trim() || v.contact_email?.trim() ? (
                              <span className="text-zinc-400">
                                {" "}
                                ·{" "}
                                <a
                                  href={`mailto:${(v.submitter_email || v.contact_email)!.trim()}`}
                                  className="text-[var(--ml-gold)] hover:underline"
                                >
                                  {(v.submitter_email || v.contact_email)!.trim()}
                                </a>
                              </span>
                            ) : null}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                            Submitted date
                          </dt>
                          <dd className="mt-0.5 text-zinc-200">{fmtSubmitted(v.created_at)}</dd>
                        </div>
                      </dl>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-zinc-400">
                <p>
                  Total venues: <span className="font-semibold text-zinc-200">{venues.length}</span>
                </p>
                <p>
                  Verified:{" "}
                  <span className="font-semibold text-zinc-200">{verifiedVenuesForTable.length}</span>
                </p>
                <p>
                  Pending:{" "}
                  <span className="font-semibold text-zinc-200">{pendingVenues.length}</span>
                </p>
                <p>
                  Missing coordinates: <span className="font-semibold text-zinc-200">{venuesMissingCoords}</span>
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={geocodeBusy || venuesMissingCoords === 0 || dataLoading}
                  onClick={() => void runGeocodeVenues()}
                  className={`${CLASSES.btnPrimarySm} disabled:cursor-not-allowed disabled:opacity-40`}
                >
                  {geocodeBusy ? (
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--ml-gold)] border-t-transparent"
                        aria-hidden
                      />
                      Geocoding venues... this may take a minute
                    </span>
                  ) : (
                    `Auto-geocode ${venuesMissingCoords} venues`
                  )}
                </button>
                {geocodeMsg ? <p className="text-sm text-emerald-400/90">{geocodeMsg}</p> : null}
              </div>
            </div>
            <h3 className="mb-3 ml-font-heading text-base font-semibold text-zinc-200">
              Verified venues
            </h3>
            {dataLoading ? (
              <p className="text-sm text-zinc-500">Loading…</p>
            ) : (
              <table className="w-full min-w-[920px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-zinc-500">
                    <th className="py-3 pr-4">Name</th>
                    <th className="py-3 pr-4">City</th>
                    <th className="py-3 pr-4">State</th>
                    <th className="py-3 pr-4">Type</th>
                    <th className="py-3 pr-4">Coords</th>
                    <th className="py-3 pr-4">Submitted</th>
                    <th className="py-3">View</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedVenues.map((v) => (
                    <Fragment key={v.id}>
                      <tr className="border-b border-white/5">
                        <td className="py-3 pr-4 font-medium text-zinc-200">
                          <span>{v.name || "—"}</span>
                        </td>
                        <td className="py-3 pr-4 text-zinc-400">{v.city || "—"}</td>
                        <td className="py-3 pr-4 text-zinc-400">{v.state || "—"}</td>
                        <td className="py-3 pr-4 text-zinc-400">{v.venue_type || "—"}</td>
                        <td className="py-3 pr-4 text-xs text-zinc-500">
                          <span
                            className={`mr-2 inline-block h-2.5 w-2.5 rounded-full ${
                              v.latitude != null && v.longitude != null ? "bg-emerald-400" : "bg-red-400"
                            }`}
                            aria-hidden
                          />
                          {v.latitude != null && v.longitude != null ? (
                            <span className="font-mono text-zinc-400">
                              {Number(v.latitude).toFixed(4)}, {Number(v.longitude).toFixed(4)}
                            </span>
                          ) : (
                            <span className="text-zinc-600">—</span>
                          )}
                          {v.latitude == null || v.longitude == null ? (
                            <button
                              type="button"
                              onClick={() => openLocationEditor(v)}
                              className="ml-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--ml-gold)] hover:underline"
                            >
                              Set location
                            </button>
                          ) : null}
                        </td>
                        <td className="py-3 pr-4 text-zinc-500">{fmtShort(v.created_at)}</td>
                        <td className="py-3">
                          <Link
                            href={`/venues/${encodeURIComponent(v.id)}`}
                            className="text-xs text-zinc-400 hover:text-[var(--ml-gold)]"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                      {editingVenueId === v.id ? (
                        <tr className="border-b border-white/5 bg-white/[0.02]">
                          <td colSpan={7} className="px-4 py-4">
                            <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                              Manual coordinates
                            </p>
                            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                              <label className="flex min-w-[140px] flex-col gap-1 text-xs text-zinc-500">
                                Latitude
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={manualLat}
                                  onChange={(e) => setManualLat(e.target.value)}
                                  className="rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[var(--ml-gold)]/40"
                                  placeholder="e.g. 34.0983"
                                />
                              </label>
                              <label className="flex min-w-[140px] flex-col gap-1 text-xs text-zinc-500">
                                Longitude
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={manualLng}
                                  onChange={(e) => setManualLng(e.target.value)}
                                  className="rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[var(--ml-gold)]/40"
                                  placeholder="e.g. -118.3267"
                                />
                              </label>
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  disabled={manualSaving}
                                  onClick={() => void saveManualVenueLocation(v.id)}
                                  className={CLASSES.btnPrimarySm}
                                >
                                  {manualSaving ? "Saving…" : "Save"}
                                </button>
                                <button
                                  type="button"
                                  disabled={manualSaving}
                                  onClick={() => {
                                    setEditingVenueId(null);
                                    setActionErr("");
                                  }}
                                  className={CLASSES.btnSecondary}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            )}
            {!dataLoading && !venues.length ? (
              <p className="mt-4 text-sm text-zinc-500">No venues.</p>
            ) : null}
            {!dataLoading && venues.length > 0 && !sortedVenues.length ? (
              <p className="mt-4 text-sm text-zinc-500">No verified venues in the directory.</p>
            ) : null}
          </section>
        ) : null}

        {tab === "users" ? (
          <section className="mt-8 overflow-x-auto">
            {dataLoading ? (
              <p className="text-sm text-zinc-500">Loading…</p>
            ) : (
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-zinc-500">
                    <th className="py-3 pr-4">Name</th>
                    <th className="py-3 pr-4">Email</th>
                    <th className="py-3 pr-4">Type</th>
                    <th className="py-3 pr-4">Joined</th>
                    <th className="py-3 pr-4">Admin</th>
                    <th className="py-3">Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-white/5">
                      <td className="py-3 pr-4 font-medium text-zinc-200">{u.display_name || "—"}</td>
                      <td className="py-3 pr-4 text-zinc-400">{u.email || "—"}</td>
                      <td className="py-3 pr-4 text-zinc-400">{u.account_type || "—"}</td>
                      <td className="py-3 pr-4 text-zinc-500">{fmtShort(u.created_at || u.updated_at)}</td>
                      <td className="py-3 pr-4">
                        <button
                          type="button"
                          onClick={() => void toggleUserAdmin(u.id, !u.is_admin)}
                          className="text-xs font-semibold text-[var(--ml-gold)] hover:underline"
                        >
                          {u.is_admin ? "On" : "Off"}
                        </button>
                      </td>
                      <td className="py-3">
                        <button
                          type="button"
                          onClick={() => void deleteUser(u.id)}
                          className="text-xs font-semibold text-red-400 hover:underline"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!dataLoading && !users.length ? <p className="mt-4 text-sm text-zinc-500">No users.</p> : null}
          </section>
        ) : null}
      </div>

      {showAddMagician ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-xl">
            <h3 className="ml-font-heading text-lg font-semibold text-zinc-100">Add magician</h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-[10px] font-medium uppercase tracking-widest text-zinc-500">
                  Display name *
                </label>
                <input
                  value={newMagName}
                  onChange={(e) => setNewMagName(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[var(--ml-gold)]/40"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-medium uppercase tracking-widest text-zinc-500">
                  Location (city, state)
                </label>
                <input
                  value={newMagLocation}
                  onChange={(e) => setNewMagLocation(e.target.value)}
                  placeholder="e.g. Austin, TX"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-[var(--ml-gold)]/40"
                />
              </div>
              <div>
                <p className="mb-2 text-[10px] font-medium uppercase tracking-widest text-zinc-500">
                  Specialty tags
                </p>
                <div className="flex flex-wrap gap-2">
                  {ADMIN_SPEC_TAGS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleAmTag(t)}
                      className={`rounded-full border px-2.5 py-1 text-xs transition ${
                        newMagTags.includes(t)
                          ? "border-[var(--ml-gold)]/50 bg-[var(--ml-gold)]/15 text-[var(--ml-gold)]"
                          : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/20"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-medium uppercase tracking-widest text-zinc-500">
                  Short bio
                </label>
                <textarea
                  value={newMagBio}
                  onChange={(e) => setNewMagBio(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[var(--ml-gold)]/40"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[10px] font-medium uppercase tracking-widest text-zinc-500">
                    Instagram
                  </label>
                  <input
                    value={amInstagram}
                    onChange={(e) => setAmInstagram(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[var(--ml-gold)]/40"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-medium uppercase tracking-widest text-zinc-500">
                    YouTube
                  </label>
                  <input
                    value={amYoutube}
                    onChange={(e) => setAmYoutube(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[var(--ml-gold)]/40"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-medium uppercase tracking-widest text-zinc-500">
                    TikTok
                  </label>
                  <input
                    value={amTiktok}
                    onChange={(e) => setAmTiktok(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[var(--ml-gold)]/40"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-medium uppercase tracking-widest text-zinc-500">
                    Website
                  </label>
                  <input
                    value={amWebsite}
                    onChange={(e) => setAmWebsite(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[var(--ml-gold)]/40"
                  />
                </div>
              </div>
            </div>
            {amMsg ? (
              <p
                className={`mt-3 text-sm font-medium ${amMsg === "Profile created successfully" ? "text-emerald-400" : "text-red-400"}`}
              >
                {amMsg}
              </p>
            ) : null}
            <p className="mt-4 text-xs text-zinc-500">
              This creates an unclaimed profile. The magician can claim it when they join Magicalive.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddMagician(false);
                  setAmMsg("");
                }}
                className={CLASSES.btnSecondarySm}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={amBusy || !newMagName.trim()}
                onClick={() => void submitAddMagician()}
                className="rounded-lg border border-[var(--ml-gold)]/40 bg-[var(--ml-gold)] px-3 py-1.5 text-xs font-semibold text-black disabled:opacity-40"
              >
                {amBusy ? "Creating…" : "Create profile"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {postForMagicianId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-xl">
            <h3 className="ml-font-heading text-lg font-semibold text-zinc-100">Post event</h3>
            <div className="mt-4 mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setPostEventType("show")}
                className={`flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                  postEventType === "show"
                    ? "border-[var(--ml-gold)] bg-[var(--ml-gold)]/15 text-[var(--ml-gold)]"
                    : "border-white/10 bg-white/5 text-zinc-400"
                }`}
              >
                Show
              </button>
              <button
                type="button"
                onClick={() => setPostEventType("lecture")}
                className={`flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                  postEventType === "lecture"
                    ? "border-[var(--ml-gold)] bg-[var(--ml-gold)]/15 text-[var(--ml-gold)]"
                    : "border-white/10 bg-white/5 text-zinc-400"
                }`}
              >
                Lecture
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-[10px] font-medium uppercase tracking-widest text-zinc-500">
                  Show name *
                </label>
                <input
                  value={postShowName}
                  onChange={(e) => setPostShowName(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[var(--ml-gold)]/40"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-medium uppercase tracking-widest text-zinc-500">
                  Date *
                </label>
                <input
                  type="date"
                  value={postShowDate}
                  onChange={(e) => setPostShowDate(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[var(--ml-gold)]/40"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-medium uppercase tracking-widest text-zinc-500">
                  Time
                </label>
                <input
                  type="time"
                  value={postShowTime}
                  onChange={(e) => setPostShowTime(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[var(--ml-gold)]/40"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-[10px] font-medium uppercase tracking-widest text-zinc-500">
                  Venue *
                </label>
                <select
                  value={postVenueSelect}
                  onChange={(e) => {
                    const v = e.target.value;
                    setPostVenueSelect(v);
                    if (v === VENUE_OTHER) {
                      setPostVenueName("");
                      setPostCity("");
                      setPostState("");
                    } else if (v && v !== VENUE_SELECT_PLACEHOLDER) {
                      const opt = postVenues.find((x) => x.id === v);
                      if (opt) {
                        setPostVenueName(opt.name?.trim() || "");
                        setPostCity(opt.city?.trim() || "");
                        setPostState(opt.state?.trim() || "");
                      }
                    } else {
                      setPostVenueName("");
                      setPostCity("");
                      setPostState("");
                    }
                  }}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[var(--ml-gold)]/40"
                >
                  <option value={VENUE_SELECT_PLACEHOLDER} className="bg-zinc-900">
                    Select a venue…
                  </option>
                  {postVenues.map((v) => (
                    <option key={v.id} value={v.id} className="bg-zinc-900">
                      {v.name}
                      {v.city ? ` — ${v.city}` : ""}
                    </option>
                  ))}
                  <option value={VENUE_OTHER} className="bg-zinc-900">
                    Other
                  </option>
                </select>
              </div>
              {postVenueSelect === VENUE_OTHER ? (
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-[10px] font-medium uppercase tracking-widest text-zinc-500">
                    Venue name *
                  </label>
                  <input
                    value={postVenueName}
                    onChange={(e) => setPostVenueName(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[var(--ml-gold)]/40"
                  />
                </div>
              ) : null}
              {postVenueSelect !== VENUE_SELECT_PLACEHOLDER && postVenueSelect !== "" ? (
                <>
                  <div>
                    <label className="mb-1 block text-[10px] font-medium uppercase tracking-widest text-zinc-500">
                      City *
                    </label>
                    <input
                      value={postCity}
                      onChange={(e) => setPostCity(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[var(--ml-gold)]/40"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-medium uppercase tracking-widest text-zinc-500">
                      State
                    </label>
                    <input
                      value={postState}
                      onChange={(e) => setPostState(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[var(--ml-gold)]/40"
                    />
                  </div>
                </>
              ) : null}
              <div className="sm:col-span-2">
                <label className="mb-1 block text-[10px] font-medium uppercase tracking-widest text-zinc-500">
                  Ticket URL
                </label>
                <input
                  type="url"
                  value={postTicketUrl}
                  onChange={(e) => setPostTicketUrl(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[var(--ml-gold)]/40"
                />
              </div>
            </div>
            <label className="mt-2 inline-flex items-center gap-2 text-xs text-zinc-300">
              <input type="checkbox" checked={postIsPublic} onChange={(e) => setPostIsPublic(e.target.checked)} />
              Make this event public
            </label>
            {postErr ? <p className="mt-3 text-sm font-medium text-red-400">{postErr}</p> : null}
            {postSuccess ? <p className="mt-3 text-sm font-medium text-emerald-400">{postSuccess}</p> : null}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setPostForMagicianId(null);
                  resetPostShowForm();
                }}
                className={CLASSES.btnSecondarySm}
              >
                {postSuccess ? "Close" : "Cancel"}
              </button>
              <button
                type="button"
                disabled={postBusy}
                onClick={() => void submitAdminPostShow()}
                className="rounded-lg border border-[var(--ml-gold)]/40 bg-[var(--ml-gold)] px-3 py-1.5 text-xs font-semibold text-black disabled:opacity-40"
              >
                {postBusy ? "Posting…" : "Post event"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {rejectOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-xl">
            <h3 className="ml-font-heading text-lg font-semibold text-zinc-100">Reject article</h3>
            <p className="mt-2 text-sm text-zinc-500">This message will be emailed to the author.</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={5}
              className="mt-4 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[var(--ml-gold)]/40"
              placeholder="Reason for rejection…"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setRejectOpen(false);
                  setRejectArticleId("");
                  setRejectReason("");
                }}
                className={CLASSES.btnSecondarySm}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitReject()}
                disabled={!rejectReason.trim()}
                className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300 disabled:opacity-40"
              >
                Send rejection
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
