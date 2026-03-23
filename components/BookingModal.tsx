"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CLASSES } from "@/lib/constants";

type BookingModalProps = {
  open: boolean;
  onClose: () => void;
  magicianId: string;
  selectedDate: string;
  onSubmitted?: () => void;
};

const EVENT_TYPES = ["Corporate", "Private party", "Wedding", "Birthday", "Festival", "Other"] as const;
const BUDGET_RANGES = ["Under $500", "$500-$1000", "$1000-$2500", "$2500-$5000", "$5000+"] as const;

export function BookingModal({
  open,
  onClose,
  magicianId,
  selectedDate,
  onSubmitted,
}: BookingModalProps) {
  const { user, isLoaded } = useUser();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [eventType, setEventType] = useState<(typeof EVENT_TYPES)[number]>("Corporate");
  const [eventTime, setEventTime] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [guestCount, setGuestCount] = useState("");
  const [budgetRange, setBudgetRange] = useState<(typeof BUDGET_RANGES)[number]>("$500-$1000");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!open) return;
    setStatusMsg("");
    setErrorMsg("");
    if (user) {
      setName(user.fullName?.trim() || user.firstName?.trim() || "");
      setEmail(user.primaryEmailAddress?.emailAddress?.trim() || "");
    }
  }, [open, user]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const submit = async () => {
    if (!isLoaded || !user?.id) return;
    setErrorMsg("");
    setStatusMsg("");
    if (!name.trim() || !email.trim() || !message.trim() || !selectedDate) {
      setErrorMsg("Please fill in all required fields.");
      return;
    }
    setSending(true);
    const res = await fetch("/api/booking-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        magician_id: magicianId,
        requester_name: name.trim(),
        requester_email: email.trim(),
        event_type: eventType,
        event_date: selectedDate,
        event_time: eventTime || null,
        event_location: eventLocation.trim() || null,
        guest_count: guestCount ? Number(guestCount) : null,
        budget_range: budgetRange,
        message: message.trim(),
      }),
    });
    const payload = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (!res.ok || !payload.ok) {
      setErrorMsg(payload.error || "Could not send request.");
      setSending(false);
      return;
    }

    setSending(false);
    setStatusMsg("Request sent! The magician will be in touch");
    onSubmitted?.();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-2xl border border-white/10 bg-black p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="ml-font-heading text-2xl text-zinc-100">Request booking</h3>
          <button type="button" onClick={onClose} className="text-zinc-500 hover:text-zinc-200">×</button>
        </div>

        {!isLoaded ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : !user ? (
          <p className="text-sm text-zinc-400">
            Sign in to send a booking request{" "}
            <Link href="/sign-in" className="text-[var(--ml-gold)] hover:underline">
              here
            </Link>
            .
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-zinc-100" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
              <input className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-zinc-100" placeholder="Your email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <input className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-zinc-100" type="date" value={selectedDate} readOnly />
              <select className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-zinc-100" value={eventType} onChange={(e) => setEventType(e.target.value as (typeof EVENT_TYPES)[number])}>
                {EVENT_TYPES.map((e) => <option key={e} value={e} className="bg-zinc-900">{e}</option>)}
              </select>
              <input className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-zinc-100" type="time" value={eventTime} onChange={(e) => setEventTime(e.target.value)} />
              <input className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-zinc-100" placeholder="Event location" value={eventLocation} onChange={(e) => setEventLocation(e.target.value)} />
              <input className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-zinc-100" type="number" min={1} placeholder="Approximate guest count" value={guestCount} onChange={(e) => setGuestCount(e.target.value)} />
              <select className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-zinc-100" value={budgetRange} onChange={(e) => setBudgetRange(e.target.value as (typeof BUDGET_RANGES)[number])}>
                {BUDGET_RANGES.map((b) => <option key={b} value={b} className="bg-zinc-900">{b}</option>)}
              </select>
              <textarea className="sm:col-span-2 min-h-[100px] rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-zinc-100" placeholder="Message to the magician" value={message} onChange={(e) => setMessage(e.target.value)} />
            </div>
            {statusMsg ? <p className="mt-3 text-sm font-medium text-emerald-400">{statusMsg}</p> : null}
            {errorMsg ? <p className="mt-3 text-sm font-medium text-red-400">{errorMsg}</p> : null}
            <div className="mt-4 flex items-center gap-2">
              <button type="button" onClick={() => void submit()} disabled={sending} className={CLASSES.btnPrimarySm}>
                {sending ? "Sending…" : "Send request"}
              </button>
              <button type="button" onClick={onClose} className={CLASSES.btnSecondarySm}>
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
