"use client";

import { useClerk, useSessionList, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AvailabilityCalendar } from "@/components/AvailabilityCalendar";
import { LocationPicker } from "@/components/LocationPicker";
import { CLASSES } from "@/lib/constants";
import { findCountryForCity, pickerStateFromDatabase, stateValueForDatabase } from "@/lib/locations";
import { createNotification } from "@/lib/notifications";
import { supabase } from "@/lib/supabase";

type Tab = "overview" | "post" | "shows" | "availability" | "articles" | "settings";

type Profile = {
  id: string;
  account_type: string | null;
  display_name: string | null;
  full_bio: string | null;
  specialty_tags: string[] | null;
  avatar_url: string | null;
  instagram: string | null;
  youtube: string | null;
  facebook: string | null;
  tiktok: string | null;
  profile_views: number | null;
  booking_requests_count?: number | null;
  follower_count: number | null;
  review_count: number | null;
  is_online: boolean | null;
  show_online_status: boolean | null;
  show_last_active: boolean | null;
  email_new_followers: boolean | null;
  email_new_reviews: boolean | null;
};

type ShowRow = {
  id: string;
  magician_id: string;
  name: string;
  date: string;
  time: string | null;
  venue_name: string;
  city: string;
  state: string | null;
  ticket_url: string | null;
  is_public: boolean | null;
  venue_id: string | null;
  event_type?: string | null;
  skill_level?: string | null;
  includes_workbook?: boolean | null;
  includes_props?: boolean | null;
  max_attendees?: number | null;
  is_online?: boolean | null;
};

type VenueOption = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
};

type BookingRequestRow = {
  id: string;
  requester_id: string | null;
  requester_name: string | null;
  requester_email: string | null;
  event_date: string | null;
  event_time: string | null;
  event_type: string | null;
  event_location: string | null;
  guest_count: number | null;
  budget_range: string | null;
  message: string | null;
  status: string | null;
  reply_message: string | null;
};

type MyArticleRow = {
  id: string;
  title: string | null;
  status: string | null;
  view_count: number | null;
  like_count: number | null;
  published_at: string | null;
  created_at: string | null;
  rejection_reason: string | null;
};

const VENUE_SELECT_PLACEHOLDER = "";
const VENUE_OTHER = "__other__";

type PostEventKind = "show" | "lecture";
const SKILL_LEVELS = ["Beginner", "Intermediate", "Advanced", "All levels"] as const;

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm font-normal text-zinc-100 placeholder:text-zinc-500 outline-none transition focus:border-[var(--ml-gold)]/50 focus:bg-white/10";
const labelClass =
  "mb-2 block text-[10px] font-medium uppercase tracking-widest text-zinc-500";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "post", label: "Post a show" },
  { id: "shows", label: "My shows" },
  { id: "availability", label: "Availability" },
  { id: "articles", label: "My Articles" },
  { id: "settings", label: "Settings" },
];

function formatLastSignIn(at: Date | null | undefined): string {
  if (!at) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(at);
  } catch {
    return "—";
  }
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const { isLoaded: sessionsLoaded, sessions } = useSessionList();
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [shows, setShows] = useState<ShowRow[]>([]);
  const [venueOptions, setVenueOptions] = useState<VenueOption[]>([]);
  const [bookingRequests, setBookingRequests] = useState<BookingRequestRow[]>([]);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [myArticles, setMyArticles] = useState<MyArticleRow[]>([]);

  const [saveMsg, setSaveMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [posting, setPosting] = useState(false);
  const [editSaveMsg, setEditSaveMsg] = useState("");
  const [revokeAllBusy, setRevokeAllBusy] = useState(false);

  const [socialYoutube, setSocialYoutube] = useState("");
  const [socialInstagram, setSocialInstagram] = useState("");
  const [socialFacebook, setSocialFacebook] = useState("");
  const [socialTikTok, setSocialTikTok] = useState("");
  const [socialSaving, setSocialSaving] = useState(false);

  const [editingShowId, setEditingShowId] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editVenueSelect, setEditVenueSelect] = useState<string>(VENUE_SELECT_PLACEHOLDER);
  const [editShowName, setEditShowName] = useState("");
  const [editShowDate, setEditShowDate] = useState("");
  const [editShowTime, setEditShowTime] = useState("");
  const [editVenueName, setEditVenueName] = useState("");
  const [editShowCity, setEditShowCity] = useState("");
  const [editShowPickCountry, setEditShowPickCountry] = useState("");
  const [editShowPickState, setEditShowPickState] = useState("");
  const [editTicketUrl, setEditTicketUrl] = useState("");
  const [editIsPublic, setEditIsPublic] = useState(true);

  const [showName, setShowName] = useState("");
  const [showDate, setShowDate] = useState("");
  const [showTime, setShowTime] = useState("");
  const [venueSelect, setVenueSelect] = useState<string>(VENUE_SELECT_PLACEHOLDER);
  const [venueName, setVenueName] = useState("");
  const [showCity, setShowCity] = useState("");
  const [showPickCountry, setShowPickCountry] = useState("");
  const [showPickState, setShowPickState] = useState("");
  const [ticketUrl, setTicketUrl] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  const [postEventType, setPostEventType] = useState<PostEventKind>("show");
  const [lectureSkillLevel, setLectureSkillLevel] = useState<(typeof SKILL_LEVELS)[number]>("All levels");
  const [lectureMaxAttendees, setLectureMaxAttendees] = useState("");
  const [lectureIncludesWorkbook, setLectureIncludesWorkbook] = useState(false);
  const [lectureIncludesProps, setLectureIncludesProps] = useState(false);
  const [lectureOnline, setLectureOnline] = useState(false);
  const [meetingLink, setMeetingLink] = useState("");

  const [editEventType, setEditEventType] = useState<PostEventKind>("show");
  const [editSkillLevel, setEditSkillLevel] = useState<(typeof SKILL_LEVELS)[number]>("All levels");
  const [editMaxAttendees, setEditMaxAttendees] = useState("");
  const [editIncludesWorkbook, setEditIncludesWorkbook] = useState(false);
  const [editIncludesProps, setEditIncludesProps] = useState(false);
  const [editIsOnline, setEditIsOnline] = useState(false);
  const [editMeetingLink, setEditMeetingLink] = useState("");

  const load = async (uid: string) => {
    const { data: p } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .maybeSingle();
    if (!p) {
      router.replace("/create-profile");
      return;
    }
    const profileData = p as unknown as Profile;
    if (profileData.account_type !== "magician") {
      router.replace("/");
      return;
    }
    setProfile(profileData);
    setSocialYoutube(profileData.youtube?.trim() || "");
    setSocialInstagram(profileData.instagram?.trim() || "");
    setSocialFacebook(profileData.facebook?.trim() || "");
    setSocialTikTok(profileData.tiktok?.trim() || "");

    const { data: s } = await supabase
      .from("shows")
      .select("*")
      .eq("magician_id", uid)
      .order("date", { ascending: true });
    setShows((s ?? []) as ShowRow[]);

    const { data: vens } = await supabase
      .from("venues")
      .select("id, name, city, state")
      .order("name", { ascending: true });
    setVenueOptions((vens ?? []) as VenueOption[]);

    const { data: br } = await supabase
      .from("booking_requests")
      .select("*")
      .eq("magician_id", uid)
      .order("created_at", { ascending: false });
    setBookingRequests((br ?? []) as BookingRequestRow[]);

    const { data: ar } = await supabase
      .from("articles")
      .select("id, title, status, view_count, like_count, published_at, created_at, rejection_reason")
      .eq("author_id", uid)
      .order("published_at", { ascending: false, nullsFirst: true });
    setMyArticles((ar ?? []) as MyArticleRow[]);
  };

  useEffect(() => {
    if (!isLoaded) return;
    if (!user?.id) {
      router.replace("/sign-in");
      return;
    }
    void (async () => {
      setLoading(true);
      await load(user.id);
      setLoading(false);
    })();
  }, [isLoaded, user?.id, router]);

  const upcomingShows = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return shows.filter((s) => {
      const d = new Date(s.date);
      return !Number.isNaN(d.getTime()) && d >= today;
    });
  }, [shows]);

  const pastShows = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return shows.filter((s) => {
      const d = new Date(s.date);
      return !Number.isNaN(d.getTime()) && d < today;
    });
  }, [shows]);

  const checklist = useMemo(() => {
    const profileId = profile?.id ?? user?.id;
    const items = [
      {
        id: "published",
        label: "Profile published",
        done: true,
        action: () => {
          if (profileId) {
            router.push(`/profile/magician?id=${encodeURIComponent(profileId)}`);
          }
        },
      },
      {
        id: "bio",
        label: "Bio added",
        done: Boolean(profile?.full_bio?.trim()),
        action: () => router.push("/profile/edit"),
      },
      {
        id: "tags",
        label: "Specialty tags added",
        done: Boolean((profile?.specialty_tags?.length ?? 0) > 0),
        action: () => router.push("/profile/edit"),
      },
      {
        id: "photo",
        label: "Profile photo added",
        done: Boolean(profile?.avatar_url),
        action: () => router.push("/profile/edit"),
      },
      {
        id: "show",
        label: "First show posted",
        done: shows.length > 0,
        action: () => setTab("post"),
      },
      {
        id: "social",
        label: "Social links added",
        done: Boolean(profile?.instagram || profile?.youtube || profile?.facebook || profile?.tiktok),
        action: () => router.push("/profile/edit"),
      },
    ];
    return items;
  }, [profile, shows.length, router, user?.id]);

  const stats = useMemo(
    () => [
      { label: "Profile views", value: profile?.profile_views ?? 0 },
      { label: "Followers", value: profile?.follower_count ?? 0 },
      { label: "Shows posted", value: shows.length },
      { label: "Reviews", value: profile?.review_count ?? 0 },
    ],
    [profile, shows.length],
  );

  const mockViews7Days = useMemo(() => {
    const base = Number(profile?.profile_views ?? 0);
    const vals = [8, 11, 9, 14, 17, 19, 23];
    return vals.map((v, i) => ({
      day: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i]!,
      value: Math.max(1, Math.round((v / 23) * Math.max(6, base / 8 || 8))),
    }));
  }, [profile?.profile_views]);

  const postShow = async () => {
    if (!user?.id) return;
    setErrorMsg("");
    setSaveMsg("");
    if (!showName.trim() || !showDate || !showTime) {
      setErrorMsg("Please fill in all required fields");
      return;
    }

    if (postEventType === "lecture") {
      if (lectureOnline) {
        if (!meetingLink.trim()) {
          setErrorMsg("Please add a meeting or registration link for online lectures.");
          return;
        }
      } else {
        if (!showCity.trim()) {
          setErrorMsg("City is required for in-person lectures.");
          return;
        }
        if (venueSelect === VENUE_SELECT_PLACEHOLDER) {
          setErrorMsg("Please select a venue or choose “Other / not listed”.");
          return;
        }
        if (!venueName.trim()) {
          setErrorMsg("Venue name is required.");
          return;
        }
      }
    } else {
      if (!showCity.trim()) {
        setErrorMsg("Please fill in all required fields");
        return;
      }
      if (venueSelect === VENUE_SELECT_PLACEHOLDER) {
        setErrorMsg("Please select a venue or choose “Other / not listed”.");
        return;
      }
      if (!venueName.trim()) {
        setErrorMsg("Venue name is required.");
        return;
      }
    }

    const maxParsed =
      postEventType === "lecture" && lectureMaxAttendees.trim()
        ? Number.parseInt(lectureMaxAttendees.trim(), 10)
        : null;
    if (postEventType === "lecture" && lectureMaxAttendees.trim() && (!Number.isFinite(maxParsed) || maxParsed! < 1)) {
      setErrorMsg("Max attendees must be a positive number.");
      return;
    }

    setPosting(true);
    try {
      const normalizedDate = /^\d{4}-\d{2}-\d{2}$/.test(showDate)
        ? showDate
        : new Date(showDate).toISOString().slice(0, 10);

      const isLecture = postEventType === "lecture";
      const online = isLecture && lectureOnline;

      const venueIdForInsert = online
        ? null
        : venueSelect !== VENUE_OTHER && venueSelect !== VENUE_SELECT_PLACEHOLDER
          ? venueSelect
          : null;

      const row = {
        magician_id: user.id,
        name: showName.trim(),
        date: normalizedDate,
        time: showTime,
        venue_name: online ? "Online" : venueName.trim(),
        city: online ? "" : showCity.trim(),
        state: online
          ? null
          : stateValueForDatabase(showPickCountry, showPickState).trim() || null,
        venue_id: venueIdForInsert,
        ticket_url: online ? meetingLink.trim() || null : ticketUrl.trim() || null,
        is_public: isPublic,
        event_type: postEventType,
        skill_level: isLecture ? lectureSkillLevel : null,
        includes_workbook: isLecture ? lectureIncludesWorkbook : false,
        includes_props: isLecture ? lectureIncludesProps : false,
        max_attendees: isLecture && maxParsed != null && Number.isFinite(maxParsed) ? maxParsed : null,
        is_online: isLecture ? lectureOnline : false,
      };

      const { error } = await supabase.from("shows").insert(row);

      if (error) throw error;
    } catch (error) {
      const msg =
        (error as { message?: string })?.message || String(error) || "Unknown error";
      setErrorMsg(msg);
      setPosting(false);
      return;
    }
    setPosting(false);
    setSaveMsg(postEventType === "lecture" ? "Lecture added successfully" : "Show added successfully");
    setShowName("");
    setShowDate("");
    setShowTime("");
    setVenueSelect(VENUE_SELECT_PLACEHOLDER);
    setVenueName("");
    setShowCity("");
    setShowPickCountry("");
    setShowPickState("");
    setTicketUrl("");
    setIsPublic(true);
    setPostEventType("show");
    setLectureSkillLevel("All levels");
    setLectureMaxAttendees("");
    setLectureIncludesWorkbook(false);
    setLectureIncludesProps(false);
    setLectureOnline(false);
    setMeetingLink("");
    await load(user.id);
  };

  const removeShow = async (id: string) => {
    if (!window.confirm("Delete this show? This cannot be undone")) return;
    const prev = shows;
    setShows((curr) => curr.filter((s) => s.id !== id));
    const { error } = await supabase.from("shows").delete().eq("id", id);
    if (error) {
      setErrorMsg("Something went wrong");
      setShows(prev);
      return;
    }
  };

  const startEditShow = (s: ShowRow) => {
    setEditSaveMsg("");
    setErrorMsg("");
    setEditingShowId(s.id);
    const kind: PostEventKind = s.event_type === "lecture" ? "lecture" : "show";
    setEditEventType(kind);
    setEditShowName(s.name);
    setEditShowDate(s.date);
    setEditShowTime(s.time ?? "");
    setEditVenueName(s.venue_name ?? "");
    const c = s.city ?? "";
    setEditShowCity(c);
    const co = findCountryForCity(c) || "";
    setEditShowPickCountry(co);
    setEditShowPickState(pickerStateFromDatabase(co, s.state));
    setEditTicketUrl(s.ticket_url ?? "");
    setEditIsPublic(Boolean(s.is_public));
    setEditVenueSelect(s.venue_id ?? VENUE_OTHER);
    const slRaw = s.skill_level?.trim();
    setEditSkillLevel(
      slRaw && (SKILL_LEVELS as readonly string[]).includes(slRaw)
        ? (slRaw as (typeof SKILL_LEVELS)[number])
        : "All levels",
    );
    setEditMaxAttendees(s.max_attendees != null ? String(s.max_attendees) : "");
    setEditIncludesWorkbook(Boolean(s.includes_workbook));
    setEditIncludesProps(Boolean(s.includes_props));
    setEditIsOnline(Boolean(s.is_online));
    setEditMeetingLink(kind === "lecture" && s.is_online ? (s.ticket_url ?? "") : "");
  };

  const saveEditShow = async () => {
    if (!editingShowId) return;
    setErrorMsg("");
    setEditSaveMsg("");
    if (!editShowName.trim() || !editShowDate || !editShowTime) {
      setErrorMsg("Please fill in all required fields");
      return;
    }

    if (editEventType === "lecture") {
      if (editIsOnline) {
        if (!editMeetingLink.trim()) {
          setErrorMsg("Meeting or registration link is required for online lectures.");
          return;
        }
      } else if (!editShowCity.trim() || !editVenueName.trim()) {
        setErrorMsg("Venue and city are required for in-person lectures.");
        return;
      }
    } else if (!editShowCity.trim() || !editVenueName.trim()) {
      setErrorMsg("Please fill in all required fields");
      return;
    }

    const maxEdit =
      editEventType === "lecture" && editMaxAttendees.trim()
        ? Number.parseInt(editMaxAttendees.trim(), 10)
        : null;
    if (editEventType === "lecture" && editMaxAttendees.trim() && (!Number.isFinite(maxEdit) || maxEdit! < 1)) {
      setErrorMsg("Max attendees must be a positive number.");
      return;
    }

    setEditSaving(true);
    const normalizedDate = /^\d{4}-\d{2}-\d{2}$/.test(editShowDate)
      ? editShowDate
      : new Date(editShowDate).toISOString().slice(0, 10);
    const online = editEventType === "lecture" && editIsOnline;
    const venueIdForUpdate = online
      ? null
      : editVenueSelect !== VENUE_OTHER && editVenueSelect !== VENUE_SELECT_PLACEHOLDER
        ? editVenueSelect
        : null;

    const updatePayload = {
      name: editShowName.trim(),
      date: normalizedDate,
      time: editShowTime,
      venue_name: online ? "Online" : editVenueName.trim(),
      city: online ? "" : editShowCity.trim(),
      state: online
        ? null
        : stateValueForDatabase(editShowPickCountry, editShowPickState).trim() || null,
      venue_id: venueIdForUpdate,
      ticket_url: online ? editMeetingLink.trim() || null : editTicketUrl.trim() || null,
      is_public: editIsPublic,
      event_type: editEventType,
      skill_level: editEventType === "lecture" ? editSkillLevel : null,
      includes_workbook: editEventType === "lecture" ? editIncludesWorkbook : false,
      includes_props: editEventType === "lecture" ? editIncludesProps : false,
      max_attendees:
        editEventType === "lecture" && maxEdit != null && Number.isFinite(maxEdit) ? maxEdit : null,
      is_online: editEventType === "lecture" ? editIsOnline : false,
    };

    const { error } = await supabase.from("shows").update(updatePayload).eq("id", editingShowId);
    setEditSaving(false);
    if (error) {
      setErrorMsg(error.message || "Something went wrong");
      return;
    }
    setShows((curr) =>
      curr.map((s) =>
        s.id === editingShowId
          ? {
              ...s,
              ...updatePayload,
              city: updatePayload.city,
              venue_name: updatePayload.venue_name,
            }
          : s,
      ),
    );
    setEditSaveMsg("Updated");
    setEditingShowId(null);
  };

  const saveSocialLinks = async () => {
    if (!user?.id) return;
    setErrorMsg("");
    setSaveMsg("");
    setSocialSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        youtube: socialYoutube.trim() || null,
        instagram: socialInstagram.trim() || null,
        facebook: socialFacebook.trim() || null,
        tiktok: socialTikTok.trim() || null,
      })
      .eq("id", user.id);
    setSocialSaving(false);
    if (error) {
      setErrorMsg(error.message || "Something went wrong");
      return;
    }
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            youtube: socialYoutube.trim() || null,
            instagram: socialInstagram.trim() || null,
            facebook: socialFacebook.trim() || null,
            tiktok: socialTikTok.trim() || null,
          }
        : prev,
    );
    setSaveMsg("Social links saved");
  };

  const updateBookingRequest = async (id: string, status: "accepted" | "declined") => {
    const reply_message = (replyDrafts[id] || "").trim() || null;
    const row = bookingRequests.find((r) => r.id === id);
    const { error } = await supabase
      .from("booking_requests")
      .update({ status, reply_message })
      .eq("id", id);
    if (error) {
      setErrorMsg(error.message || "Could not update request");
      return;
    }
    const requesterId = row?.requester_id?.trim() || null;
    const magicianName =
      profile?.display_name?.trim() ||
      user?.fullName?.trim() ||
      user?.firstName?.trim() ||
      "A magician";
    if (requesterId && user?.id) {
      void createNotification({
        recipientId: requesterId,
        senderId: user.id,
        senderName: magicianName,
        senderAvatar: profile?.avatar_url?.trim() || undefined,
        type: status === "accepted" ? "booking_accepted" : "booking_declined",
        message:
          status === "accepted"
            ? `${magicianName} accepted your booking request`
            : `${magicianName} is unavailable for your requested date`,
        link: status === "accepted" ? "/dashboard" : "/magicians",
      });
    }
    setBookingRequests((curr) => {
      const next = curr.map((r) => (r.id === id ? { ...r, status, reply_message } : r));
      if (user?.id) {
        const pendingCount = Math.max(0, next.filter((r) => r.status === "pending").length);
        void supabase
          .from("profiles")
          .update({ booking_requests_count: pendingCount })
          .eq("id", user.id);
      }
      return next;
    });
    const replyText = (replyDrafts[id] || "").trim();
    void fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: status === "accepted" ? "booking_accepted" : "booking_declined",
        data:
          status === "accepted"
            ? { booking_id: id }
            : { booking_id: id, reply_message: replyText },
      }),
    });
  };

  const removeArticle = async (id: string) => {
    const ok = window.confirm("Delete this article? This cannot be undone.");
    if (!ok) return;
    const { error } = await supabase.from("articles").delete().eq("id", id).eq("author_id", user?.id ?? "");
    if (error) {
      setErrorMsg(error.message || "Could not delete article");
      return;
    }
    setMyArticles((prev) => prev.filter((a) => a.id !== id));
  };

  const renderShowRow = (s: ShowRow, past = false) => (
    <div
      key={s.id}
      className={`flex flex-col gap-3 rounded-xl border border-white/10 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between ${
        past ? "bg-black/30" : "bg-white/[0.02]"
      }`}
    >
      <div className="text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
              s.event_type === "lecture"
                ? "border-violet-400/40 text-violet-200"
                : "border-[var(--ml-gold)]/35 text-[var(--ml-gold)]"
            }`}
          >
            {s.event_type === "lecture" ? "Lecture" : "Show"}
          </span>
          <p className={`font-semibold ${past ? "text-zinc-200" : "text-zinc-100"}`}>
            {s.date} — {s.name}
          </p>
        </div>
        <p className="text-zinc-500">
          {s.event_type === "lecture" && s.is_online
            ? "Online"
            : [s.venue_name, s.city].filter(Boolean).join(", ") || "—"}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${s.is_public ? "border-emerald-400/30 text-emerald-300" : "border-zinc-500/30 text-zinc-400"}`}>
          {s.is_public ? "Public" : "Private"}
        </span>
        <button
          type="button"
          onClick={() => startEditShow(s)}
          className="rounded-lg border border-white/15 px-2 py-1 text-xs text-zinc-300"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => void removeShow(s.id)}
          className="rounded-lg border border-red-500/35 px-2 py-1 text-xs text-red-300"
        >
          Delete
        </button>
      </div>
      {editingShowId === s.id ? (
        <div className="mt-2 w-full rounded-xl border border-[var(--ml-gold)]/25 bg-black/30 p-4 sm:col-span-2">
          <div className="mb-4 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setEditEventType("show")}
              className={`flex items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-sm font-semibold transition ${
                editEventType === "show"
                  ? "border-[var(--ml-gold)] bg-[var(--ml-gold)]/15 text-[var(--ml-gold)]"
                  : "border-white/10 bg-white/5 text-zinc-400"
              }`}
            >
              🎭 Show
            </button>
            <button
              type="button"
              onClick={() => setEditEventType("lecture")}
              className={`flex items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-sm font-semibold transition ${
                editEventType === "lecture"
                  ? "border-[var(--ml-gold)] bg-[var(--ml-gold)]/15 text-[var(--ml-gold)]"
                  : "border-white/10 bg-white/5 text-zinc-400"
              }`}
            >
              📚 Lecture
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass}>{editEventType === "lecture" ? "Lecture title *" : "Show name *"}</label>
              <input className={inputClass} value={editShowName} onChange={(e) => setEditShowName(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Date *</label>
              <input type="date" className={inputClass} value={editShowDate} onChange={(e) => setEditShowDate(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Time *</label>
              <input type="time" className={inputClass} value={editShowTime} onChange={(e) => setEditShowTime(e.target.value)} />
            </div>
            {editEventType === "lecture" ? (
              <>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Skill level</label>
                  <select
                    className={inputClass}
                    value={editSkillLevel}
                    onChange={(e) => setEditSkillLevel(e.target.value as (typeof SKILL_LEVELS)[number])}
                  >
                    {SKILL_LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl} className="bg-zinc-900">
                        {lvl}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Max attendees</label>
                  <input
                    type="number"
                    min={1}
                    className={inputClass}
                    value={editMaxAttendees}
                    onChange={(e) => setEditMaxAttendees(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <div className="flex flex-col justify-end gap-2 sm:col-span-1">
                  <label className="inline-flex items-center gap-2 text-xs text-zinc-300">
                    <input type="checkbox" checked={editIncludesWorkbook} onChange={(e) => setEditIncludesWorkbook(e.target.checked)} />
                    Includes workbook
                  </label>
                  <label className="inline-flex items-center gap-2 text-xs text-zinc-300">
                    <input type="checkbox" checked={editIncludesProps} onChange={(e) => setEditIncludesProps(e.target.checked)} />
                    Includes props
                  </label>
                  <label className="inline-flex items-center gap-2 text-xs text-zinc-300">
                    <input type="checkbox" checked={editIsOnline} onChange={(e) => setEditIsOnline(e.target.checked)} />
                    Online lecture
                  </label>
                </div>
                {editIsOnline ? (
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Meeting / registration link *</label>
                    <input
                      type="url"
                      className={inputClass}
                      value={editMeetingLink}
                      onChange={(e) => setEditMeetingLink(e.target.value)}
                      placeholder="https://…"
                    />
                  </div>
                ) : null}
              </>
            ) : null}
            {editEventType === "show" || (editEventType === "lecture" && !editIsOnline) ? (
              <>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Venue *</label>
                  <select
                    className={inputClass}
                    value={editVenueSelect}
                    onChange={(e) => {
                      const v = e.target.value;
                      setEditVenueSelect(v);
                      if (v === VENUE_OTHER) {
                        setEditVenueName("");
                        setEditShowCity("");
                        setEditShowPickCountry("");
                        setEditShowPickState("");
                      } else if (v && v !== VENUE_SELECT_PLACEHOLDER) {
                        const opt = venueOptions.find((x) => x.id === v);
                        if (opt) {
                          const ct = opt.city?.trim() || "";
                          const co = findCountryForCity(ct) || "";
                          setEditVenueName(opt.name);
                          setEditShowCity(ct);
                          setEditShowPickCountry(co);
                          setEditShowPickState(pickerStateFromDatabase(co, opt.state));
                        }
                      }
                    }}
                  >
                    <option value={VENUE_SELECT_PLACEHOLDER} className="bg-zinc-900">
                      Select a venue…
                    </option>
                    {venueOptions.map((v) => (
                      <option key={v.id} value={v.id} className="bg-zinc-900">
                        {v.name}
                        {v.city ? ` — ${v.city}` : ""}
                      </option>
                    ))}
                    <option value={VENUE_OTHER} className="bg-zinc-900">
                      Other / not listed
                    </option>
                  </select>
                </div>
                {editVenueSelect === VENUE_OTHER ? (
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Venue name *</label>
                    <input className={inputClass} value={editVenueName} onChange={(e) => setEditVenueName(e.target.value)} />
                  </div>
                ) : null}
                <div className="sm:col-span-2">
                  <LocationPicker
                    required
                    selectedCountry={editShowPickCountry}
                    selectedState={editShowPickState}
                    selectedCity={editShowCity}
                    onCountryChange={setEditShowPickCountry}
                    onStateChange={setEditShowPickState}
                    onCityChange={setEditShowCity}
                  />
                </div>
              </>
            ) : null}
            {editEventType === "show" || (editEventType === "lecture" && !editIsOnline) ? (
              <div className="sm:col-span-2">
                <label className={labelClass}>Ticket URL</label>
                <input type="url" className={inputClass} value={editTicketUrl} onChange={(e) => setEditTicketUrl(e.target.value)} />
              </div>
            ) : null}
          </div>
          <label className="mt-3 inline-flex items-center gap-2 text-xs text-zinc-300">
            <input type="checkbox" checked={editIsPublic} onChange={(e) => setEditIsPublic(e.target.checked)} />
            Make this event public
          </label>
          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => void saveEditShow()}
              disabled={editSaving}
              className={CLASSES.btnPrimarySm}
            >
              {editSaving ? "Saving…" : "Save changes"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingShowId(null);
                setErrorMsg("");
              }}
              className={CLASSES.btnSecondarySm}
            >
              Cancel
            </button>
            {editSaveMsg ? <span className="text-xs font-medium text-emerald-400">{editSaveMsg}</span> : null}
          </div>
        </div>
      ) : null}
    </div>
  );

  const updateSetting = async (field: string, value: boolean) => {
    if (!user?.id) return;
    setErrorMsg("");
    const { error } = await supabase
      .from("profiles")
      .update({ [field]: value })
      .eq("id", user.id);
    if (error) {
      setErrorMsg("Something went wrong");
      return;
    }
    setProfile((prev) => (prev ? ({ ...prev, [field]: value } as Profile) : prev));
  };

  if (loading || !isLoaded || !profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black text-zinc-500">
        <span
          className="inline-block size-10 animate-spin rounded-full border-2 border-[var(--ml-gold)]/30 border-t-[var(--ml-gold)]"
          aria-hidden
        />
        <p className="text-sm">Loading dashboard…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--ml-gold)]">
          Magician dashboard
        </p>
        <h1 className="ml-font-heading text-3xl font-semibold text-zinc-50 sm:text-4xl">
          Manage your <em className="text-[var(--ml-gold)] italic">stage</em>
        </h1>

        <div className="mt-6 border-b border-white/10">
          <div className="-mb-px flex gap-1 overflow-x-auto pb-px">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTab(t.id);
                  setSaveMsg("");
                  setErrorMsg("");
                }}
                className={`shrink-0 border-b-2 px-4 py-3 text-sm font-medium transition ${
                  tab === t.id
                    ? "border-[var(--ml-gold)] text-[var(--ml-gold)]"
                    : "border-transparent text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {tab === "overview" ? (
          <div className="mt-8 space-y-8">
            <div className="rounded-2xl border border-[var(--ml-gold)]/25 bg-[var(--ml-gold)]/10 p-5">
              <p className="ml-font-heading text-2xl font-semibold text-zinc-100">
                You&apos;re live, {profile.display_name || "Magician"}{" "}
                <span className="inline-block animate-pulse text-[var(--ml-gold)]">✦</span>
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <h2 className="mb-4 ml-font-heading text-xl font-semibold text-zinc-100">
                Profile strength
              </h2>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {checklist.map((i) => (
                  <button
                    key={i.id}
                    type="button"
                    onClick={i.action}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 text-left transition hover:border-white/20"
                  >
                    <span
                      className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                        i.done
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "border border-[var(--ml-gold)]/40 text-[var(--ml-gold)]"
                      }`}
                    >
                      {i.done ? "✓" : "○"}
                    </span>
                    <span className="text-sm text-zinc-300">{i.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {stats.map((s) => (
                <div
                  key={s.label}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-center"
                >
                  <p className="ml-font-heading text-2xl font-semibold text-[var(--ml-gold)]">
                    {s.value}
                  </p>
                  <p className="mt-1 text-[10px] uppercase tracking-wider text-zinc-500">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <h2 className="mb-4 ml-font-heading text-xl font-semibold text-zinc-100">
                Profile views (last 7 days)
              </h2>
              <div className="grid grid-cols-7 items-end gap-2">
                {mockViews7Days.map((d) => (
                  <div key={d.day} className="flex flex-col items-center gap-2">
                    <div
                      className="w-full max-w-[22px] rounded-t bg-[var(--ml-gold)]/55"
                      style={{ height: `${Math.max(12, d.value * 4)}px` }}
                      title={`${d.day}: ${d.value}`}
                    />
                    <span className="text-[10px] text-zinc-500">{d.day}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <h2 className="mb-4 ml-font-heading text-xl font-semibold text-zinc-100">
                Social links
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>YouTube channel URL</label>
                  <input className={inputClass} value={socialYoutube} onChange={(e) => setSocialYoutube(e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Instagram profile URL</label>
                  <input className={inputClass} value={socialInstagram} onChange={(e) => setSocialInstagram(e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Facebook page URL</label>
                  <input className={inputClass} value={socialFacebook} onChange={(e) => setSocialFacebook(e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>TikTok profile URL</label>
                  <input className={inputClass} value={socialTikTok} onChange={(e) => setSocialTikTok(e.target.value)} />
                </div>
              </div>
              <button
                type="button"
                onClick={() => void saveSocialLinks()}
                disabled={socialSaving}
                className={`${CLASSES.btnPrimary} mt-4 text-xs uppercase tracking-wider disabled:opacity-60`}
              >
                {socialSaving ? "Saving…" : "Save social links"}
              </button>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <h2 className="mb-4 ml-font-heading text-xl font-semibold text-zinc-100">
                Recent activity
              </h2>
              <ul className="space-y-2 text-sm text-zinc-400">
                {[
                  "Profile published successfully",
                  "You updated your bio",
                  "You added specialty tags",
                  "Follower joined your audience",
                  "A visitor viewed your profile",
                ].map((a, i) => (
                  <li key={i} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}

        {tab === "post" ? (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <h2 className="mb-5 ml-font-heading text-xl font-semibold text-zinc-100">
              Post a show or lecture
            </h2>
            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setPostEventType("show")}
                className={`flex items-center justify-center gap-2 rounded-2xl border px-4 py-4 text-base font-semibold transition ${
                  postEventType === "show"
                    ? "border-[var(--ml-gold)] bg-[var(--ml-gold)]/15 text-[var(--ml-gold)] shadow-[0_0_24px_rgba(245,204,113,0.12)]"
                    : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/20"
                }`}
              >
                🎭 Show
              </button>
              <button
                type="button"
                onClick={() => setPostEventType("lecture")}
                className={`flex items-center justify-center gap-2 rounded-2xl border px-4 py-4 text-base font-semibold transition ${
                  postEventType === "lecture"
                    ? "border-[var(--ml-gold)] bg-[var(--ml-gold)]/15 text-[var(--ml-gold)] shadow-[0_0_24px_rgba(245,204,113,0.12)]"
                    : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/20"
                }`}
              >
                📚 Lecture
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelClass}>{postEventType === "lecture" ? "Lecture title *" : "Show name *"}</label>
                <input className={inputClass} value={showName} onChange={(e) => setShowName(e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Date *</label>
                <input type="date" className={inputClass} value={showDate} onChange={(e) => setShowDate(e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Time *</label>
                <input type="time" className={inputClass} value={showTime} onChange={(e) => setShowTime(e.target.value)} />
              </div>
              {postEventType === "lecture" ? (
                <>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Skill level</label>
                    <select
                      className={inputClass}
                      value={lectureSkillLevel}
                      onChange={(e) => setLectureSkillLevel(e.target.value as (typeof SKILL_LEVELS)[number])}
                    >
                      {SKILL_LEVELS.map((lvl) => (
                        <option key={lvl} value={lvl} className="bg-zinc-900">
                          {lvl}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Max attendees</label>
                    <input
                      type="number"
                      min={1}
                      className={inputClass}
                      value={lectureMaxAttendees}
                      onChange={(e) => setLectureMaxAttendees(e.target.value)}
                      placeholder="Optional cap"
                    />
                  </div>
                  <div className="flex flex-col justify-end gap-2">
                    <label className="inline-flex items-center gap-2 text-sm text-zinc-300">
                      <input
                        type="checkbox"
                        checked={lectureIncludesWorkbook}
                        onChange={(e) => setLectureIncludesWorkbook(e.target.checked)}
                      />
                      Includes workbook
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm text-zinc-300">
                      <input
                        type="checkbox"
                        checked={lectureIncludesProps}
                        onChange={(e) => setLectureIncludesProps(e.target.checked)}
                      />
                      Includes props
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm text-zinc-300">
                      <input type="checkbox" checked={lectureOnline} onChange={(e) => setLectureOnline(e.target.checked)} />
                      Online lecture
                    </label>
                  </div>
                  {lectureOnline ? (
                    <div className="sm:col-span-2">
                      <label className={labelClass}>Meeting / registration link *</label>
                      <input
                        type="url"
                        className={inputClass}
                        value={meetingLink}
                        onChange={(e) => setMeetingLink(e.target.value)}
                        placeholder="https://zoom.us/… or ticket link"
                      />
                    </div>
                  ) : null}
                </>
              ) : null}
              {postEventType === "show" || (postEventType === "lecture" && !lectureOnline) ? (
                <>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Venue *</label>
                    <select
                      className={inputClass}
                      value={venueSelect}
                      onChange={(e) => {
                        const v = e.target.value;
                        setVenueSelect(v);
                        if (v === VENUE_OTHER) {
                          setVenueName("");
                          setShowCity("");
                          setShowPickCountry("");
                          setShowPickState("");
                        } else if (v && v !== VENUE_SELECT_PLACEHOLDER) {
                          const opt = venueOptions.find((x) => x.id === v);
                          if (opt) {
                            const ct = opt.city?.trim() || "";
                            const co = findCountryForCity(ct) || "";
                            setVenueName(opt.name);
                            setShowCity(ct);
                            setShowPickCountry(co);
                            setShowPickState(pickerStateFromDatabase(co, opt.state));
                          }
                        } else {
                          setVenueName("");
                          setShowCity("");
                          setShowPickCountry("");
                          setShowPickState("");
                        }
                      }}
                    >
                      <option value={VENUE_SELECT_PLACEHOLDER} className="bg-zinc-900">
                        Select a venue…
                      </option>
                      {venueOptions.map((v) => (
                        <option key={v.id} value={v.id} className="bg-zinc-900">
                          {v.name}
                          {v.city ? ` — ${v.city}` : ""}
                        </option>
                      ))}
                      <option value={VENUE_OTHER} className="bg-zinc-900">
                        Other / not listed
                      </option>
                    </select>
                  </div>
                  {venueSelect === VENUE_OTHER ? (
                    <div className="sm:col-span-2">
                      <label className={labelClass}>Venue name *</label>
                      <input
                        className={inputClass}
                        value={venueName}
                        onChange={(e) => setVenueName(e.target.value)}
                        placeholder="Enter venue name"
                      />
                    </div>
                  ) : null}
                  {venueSelect !== VENUE_SELECT_PLACEHOLDER && venueSelect !== "" ? (
                    <>
                      <div className="sm:col-span-2">
                        <LocationPicker
                          required
                          selectedCountry={showPickCountry}
                          selectedState={showPickState}
                          selectedCity={showCity}
                          onCountryChange={setShowPickCountry}
                          onStateChange={setShowPickState}
                          onCityChange={setShowCity}
                        />
                      </div>
                    </>
                  ) : null}
                </>
              ) : null}
              {postEventType === "show" || (postEventType === "lecture" && !lectureOnline) ? (
                <div className="sm:col-span-2">
                  <label className={labelClass}>Ticket URL</label>
                  <input type="url" className={inputClass} value={ticketUrl} onChange={(e) => setTicketUrl(e.target.value)} />
                </div>
              ) : null}
            </div>
            <label className="mt-5 inline-flex items-center gap-2 text-sm text-zinc-300">
              <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
              Make this event public
            </label>
            {saveMsg ? <p className="mt-4 text-sm font-medium text-emerald-400">{saveMsg}</p> : null}
            {errorMsg ? <p className="mt-4 text-sm font-medium text-red-400">{errorMsg}</p> : null}
            <button
              type="button"
              onClick={() => void postShow()}
              disabled={posting}
              className={`${CLASSES.btnPrimary} mt-5 text-xs uppercase tracking-wider disabled:opacity-60`}
            >
              {posting ? "Adding…" : "Add to my profile"}
            </button>
          </div>
        ) : null}

        {tab === "shows" ? (
          <div className="mt-8 space-y-8">
            {shows.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-14 text-center">
                <p className="ml-font-heading text-2xl text-zinc-200">No shows yet</p>
                <button
                  type="button"
                  onClick={() => setTab("post")}
                  className={`${CLASSES.btnPrimary} mt-5 text-sm`}
                >
                  Post your first show
                </button>
              </div>
            ) : (
              <>
                <section>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--ml-gold)]">
                    Upcoming shows
                  </h3>
                  <div className="space-y-2">
                    {upcomingShows.length ? (
                      upcomingShows.map((s) => renderShowRow(s))
                    ) : (
                      <p className="text-sm text-zinc-500">No upcoming shows.</p>
                    )}
                  </div>
                </section>
                <section>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Past shows
                  </h3>
                  <div className="space-y-2">
                    {pastShows.length ? (
                      pastShows.map((s) => renderShowRow(s, true))
                    ) : (
                      <p className="text-sm text-zinc-500">No past shows.</p>
                    )}
                  </div>
                </section>
              </>
            )}
          </div>
        ) : null}

        {tab === "availability" ? (
          <div className="mt-8 space-y-8">
            <AvailabilityCalendar magicianId={profile.id} isOwner />

            <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <h3 className="mb-4 ml-font-heading text-xl font-semibold text-zinc-100">
                Booking requests
              </h3>
              {bookingRequests.length ? (
                <div className="space-y-3">
                  {bookingRequests.map((r) => (
                    <article key={r.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-zinc-100">
                            {r.requester_name || "Requester"}{" "}
                            <span className="text-zinc-500">· {r.requester_email || "No email"}</span>
                          </p>
                          <p className="mt-1 text-xs text-zinc-500">
                            {[r.event_date, r.event_time, r.event_type, r.event_location]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        </div>
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-wider ${
                            r.status === "accepted"
                              ? "border-emerald-400/35 text-emerald-300"
                              : r.status === "declined"
                                ? "border-red-400/35 text-red-300"
                                : "border-[var(--ml-gold)]/35 text-[var(--ml-gold)]"
                          }`}
                        >
                          {r.status || "pending"}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-zinc-400">
                        Guests: {r.guest_count ?? "—"} · Budget: {r.budget_range || "—"}
                      </p>
                      <p className="mt-2 text-sm text-zinc-300">{r.message || "—"}</p>

                      <div className="mt-3">
                        <input
                          className={inputClass}
                          placeholder="Reply message (optional)"
                          value={replyDrafts[r.id] ?? r.reply_message ?? ""}
                          onChange={(e) =>
                            setReplyDrafts((prev) => ({ ...prev, [r.id]: e.target.value }))
                          }
                        />
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void updateBookingRequest(r.id, "accepted")}
                          className={CLASSES.btnPrimarySm}
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          onClick={() => void updateBookingRequest(r.id, "declined")}
                          className={CLASSES.btnSecondarySm}
                        >
                          Decline
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-zinc-500">No booking requests yet.</p>
              )}
            </section>
          </div>
        ) : null}

        {tab === "articles" ? (
          <div className="mt-8">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-zinc-400">Track review status, live pieces, and feedback.</p>
              <Link href="/submit-article" className={CLASSES.btnPrimarySm}>
                Write new article
              </Link>
            </div>
            {myArticles.length ? (
              <div className="space-y-3">
                {myArticles.map((a) => {
                  const st = (a.status || "").toLowerCase();
                  return (
                  <article key={a.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="ml-font-heading text-lg text-zinc-100">
                          {a.title?.trim() || "Untitled article"}
                        </h3>
                        <p className="mt-1 text-xs text-zinc-500">
                          {(a.published_at || a.created_at)
                            ? new Date(a.published_at || a.created_at || "").toLocaleDateString()
                            : "No date"}
                        </p>
                      </div>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${
                          st === "published"
                            ? "border-emerald-400/35 text-emerald-300"
                            : st === "pending"
                              ? "border-[var(--ml-gold)]/40 text-[var(--ml-gold)]"
                              : st === "rejected"
                                ? "border-red-500/40 text-red-300"
                                : "border-zinc-500/35 text-zinc-400"
                        }`}
                      >
                        {st === "pending"
                          ? "Under review"
                          : st === "published"
                            ? "Live"
                            : st === "rejected"
                              ? "Not approved"
                              : a.status || "draft"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-zinc-400">
                      Views: {Number(a.view_count ?? 0)} · Likes: {Number(a.like_count ?? 0)}
                    </p>
                    {st === "rejected" && a.rejection_reason?.trim() ? (
                      <p className="mt-2 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-sm text-zinc-400">
                        <span className="font-semibold text-red-300/90">Editor note: </span>
                        {a.rejection_reason.trim()}
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Link
                        href={`/articles/${encodeURIComponent(a.id)}/edit`}
                        className={`${CLASSES.btnSecondarySm} border-[var(--ml-gold)]/30 text-[var(--ml-gold)] hover:border-[var(--ml-gold)]/45 hover:bg-[var(--ml-gold)]/10`}
                      >
                        Edit
                      </Link>
                      {st === "published" ? (
                        <Link
                          href={`/articles/${encodeURIComponent(a.id)}`}
                          className={CLASSES.btnSecondarySm}
                        >
                          View live
                        </Link>
                      ) : null}
                      {st === "pending" ? (
                        <Link
                          href={`/articles/${encodeURIComponent(a.id)}/preview`}
                          className={CLASSES.btnSecondarySm}
                        >
                          Preview
                        </Link>
                      ) : null}
                      {st === "rejected" ? (
                        <Link href="/submit-article" className={CLASSES.btnPrimarySm}>
                          Revise and resubmit
                        </Link>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => void removeArticle(a.id)}
                        className="rounded-lg border border-red-500/35 px-2 py-1 text-xs text-red-300"
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-14 text-center">
                <p className="ml-font-heading text-2xl text-zinc-200">No articles yet</p>
                <Link href="/submit-article" className={`${CLASSES.btnPrimary} mt-5 inline-flex text-sm`}>
                  Write your first article
                </Link>
              </div>
            )}
          </div>
        ) : null}

        {tab === "settings" ? (
          <div className="mt-8 space-y-6">
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <h3 className="ml-font-heading text-lg font-semibold text-zinc-100">Security</h3>
              <p className="mt-1 text-sm text-zinc-500">
                Manage your password and active sign-ins. Revoking sessions signs you out everywhere—including this
                device—and you will need to sign in again.
              </p>
              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Last sign in</p>
                  <p className="mt-1 text-zinc-200">
                    {formatLastSignIn(user?.lastSignInAt ? new Date(user.lastSignInAt) : null)}
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                    Active sessions (this browser)
                  </p>
                  <p className="mt-1 text-zinc-200">
                    {sessionsLoaded ? (sessions?.length ?? 0) : "…"}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href="/profile/edit#password"
                  className={`${CLASSES.btnSecondary} inline-flex text-xs uppercase tracking-wider`}
                >
                  Change password
                </Link>
                <button
                  type="button"
                  disabled={revokeAllBusy}
                  onClick={() => {
                    void (async () => {
                      if (
                        !window.confirm(
                          "Sign out all devices? You will be signed out everywhere and must sign in again.",
                        )
                      ) {
                        return;
                      }
                      setRevokeAllBusy(true);
                      setErrorMsg("");
                      try {
                        const res = await fetch("/api/auth/revoke-all-sessions", { method: "POST" });
                        if (!res.ok) {
                          setErrorMsg("Could not revoke sessions.");
                          setRevokeAllBusy(false);
                          return;
                        }
                        await signOut({ redirectUrl: "/sign-in" });
                      } catch {
                        setErrorMsg("Could not revoke sessions.");
                        setRevokeAllBusy(false);
                      }
                    })();
                  }}
                  className="rounded-xl border border-red-500/35 bg-red-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-red-200 transition hover:bg-red-500/20 disabled:opacity-60"
                >
                  {revokeAllBusy ? "Signing out…" : "Sign out all devices"}
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <div className="space-y-3">
              {[
                { field: "is_online", label: "Show in directory", value: Boolean(profile.is_online) },
                { field: "show_online_status", label: "Show online status", value: Boolean(profile.show_online_status) },
                { field: "show_last_active", label: "Show last active time", value: Boolean(profile.show_last_active) },
                { field: "email_new_followers", label: "Email notifications for new followers", value: Boolean(profile.email_new_followers) },
                { field: "email_new_reviews", label: "Email notifications for new reviews", value: Boolean(profile.email_new_reviews) },
              ].map((row) => (
                <label
                  key={row.field}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm"
                >
                  <span className="text-zinc-300">{row.label}</span>
                  <input
                    type="checkbox"
                    checked={row.value}
                    onChange={(e) => void updateSetting(row.field, e.target.checked)}
                  />
                </label>
              ))}
            </div>
            {errorMsg ? <p className="mt-4 text-sm font-medium text-red-400">{errorMsg}</p> : null}
            <Link href="/profile/edit" className={`${CLASSES.btnSecondary} mt-5 inline-flex text-xs uppercase tracking-wider`}>
              Edit profile
            </Link>
          </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

