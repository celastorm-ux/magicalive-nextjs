"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { CLASSES } from "@/lib/constants";

const SUBJECT_OPTIONS = [
  { value: "general", label: "General enquiry" },
  { value: "booking", label: "Booking question" },
  { value: "collaboration", label: "Collaboration" },
  { value: "press", label: "Press or media" },
  { value: "other", label: "Other" },
] as const;

type ContactModalProps = {
  open: boolean;
  onClose: () => void;
  magicianId: string;
  magicianName: string;
};

const inputClass =
  "w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition focus:border-[var(--ml-gold)]/45 focus:bg-black/50";
const labelClass =
  "mb-1.5 block text-[10px] font-medium uppercase tracking-widest text-zinc-500";

export function ContactModal({ open, onClose, magicianId, magicianName }: ContactModalProps) {
  const { user, isLoaded } = useUser();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subjectType, setSubjectType] = useState<(typeof SUBJECT_OPTIONS)[number]["value"]>("general");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!open) return;
    setSuccessMsg("");
    setErrorMsg("");
    setMessage("");
    setSubjectType("general");
    if (user) {
      setName(user.fullName?.trim() || user.firstName?.trim() || user.username?.trim() || "");
      setEmail(user.primaryEmailAddress?.emailAddress?.trim() || "");
    } else {
      setName("");
      setEmail("");
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
    setErrorMsg("");
    setSuccessMsg("");
    if (!name.trim() || !email.trim() || !email.includes("@")) {
      setErrorMsg("Please enter your name and a valid email.");
      return;
    }
    if (message.trim().length < 20) {
      setErrorMsg("Message must be at least 20 characters.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/contact-magician", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          magician_id: magicianId,
          sender_name: name.trim(),
          sender_email: email.trim(),
          subject_type: subjectType,
          message: message.trim(),
        }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setErrorMsg(json.error || "Something went wrong. Please try again.");
        setSending(false);
        return;
      }
      setSuccessMsg(
        `Message sent! ${magicianName} will receive your message by email and will be in touch soon.\nKeep an eye on your inbox for their reply.`,
      );
      setMessage("");
    } catch {
      setErrorMsg("Network error. Please try again.");
    }
    setSending(false);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="relative z-10 w-full max-w-lg rounded-2xl border border-[var(--ml-gold)]/25 bg-zinc-950 p-6 shadow-2xl shadow-black/50"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="ml-font-heading text-xl font-semibold text-zinc-50 sm:text-2xl">
          Contact {magicianName}
        </h2>
        <p className="mt-1 text-xs text-zinc-500">We&apos;ll email your message to the performer.</p>

        <div className="mt-5 space-y-4">
          <div>
            <label className={labelClass}>Your name</label>
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className={labelClass}>Your email</label>
            <input
              type="email"
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className={labelClass}>Subject</label>
            <select
              className={inputClass}
              value={subjectType}
              onChange={(e) => setSubjectType(e.target.value as (typeof SUBJECT_OPTIONS)[number]["value"])}
            >
              {SUBJECT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value} className="bg-zinc-900">
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Message (min. 20 characters)</label>
            <textarea
              className={`${inputClass} min-h-[140px] resize-y`}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              required
            />
          </div>
        </div>

        {errorMsg ? <p className="mt-4 text-sm text-red-400">{errorMsg}</p> : null}
        {successMsg ? (
          <p className="mt-4 whitespace-pre-line text-sm font-medium text-emerald-400">{successMsg}</p>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void submit()}
            disabled={sending || !isLoaded || Boolean(successMsg)}
            className={`${CLASSES.btnPrimary} text-sm disabled:opacity-50`}
          >
            {sending ? "Sending…" : "Send message"}
          </button>
          <button type="button" onClick={onClose} className={CLASSES.btnSecondarySm}>
            {successMsg ? "Close" : "Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}
