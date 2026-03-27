"use client";

import Link from "next/link";
import { useState } from "react";
import { LocationPicker } from "@/components/LocationPicker";
import { CLASSES } from "@/lib/constants";
import { formatLocation } from "@/lib/locations";

const VENUE_TYPES = [
  "Theater",
  "Lounge",
  "Club",
  "Hotel",
  "Restaurant",
  "Magic center",
  "Bar",
  "Other",
] as const;

const GUIDELINES = [
  "What makes a good submission: be specific about the space and the kinds of magic hosted there.",
  "We only list venues that regularly host magic performances.",
  "Include as much detail as possible so our team can verify quickly.",
  "Include your website when you have one — it helps us confirm the venue exists and matches your description.",
] as const;

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition focus:border-[var(--ml-gold)]/50 focus:bg-white/10";

const labelClass =
  "mb-2 block text-[10px] font-semibold uppercase tracking-wider text-zinc-500";

export default function SubmitVenuePage() {
  const [venueName, setVenueName] = useState("");
  const [venueType, setVenueType] = useState<(typeof VENUE_TYPES)[number]>(VENUE_TYPES[0]);
  const [locCountry, setLocCountry] = useState("");
  const [locState, setLocState] = useState("");
  const [locCity, setLocCity] = useState("");
  const [fullAddress, setFullAddress] = useState("");
  const [capacity, setCapacity] = useState("");
  const [establishedYear, setEstablishedYear] = useState("");
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");
  const [submitterName, setSubmitterName] = useState("");
  const [submitterEmail, setSubmitterEmail] = useState("");
  const [submissionNotes, setSubmissionNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successEmail, setSuccessEmail] = useState("");
  const [successVenue, setSuccessVenue] = useState("");

  const resetForm = () => {
    setVenueName("");
    setVenueType(VENUE_TYPES[0]);
    setLocCountry("");
    setLocState("");
    setLocCity("");
    setFullAddress("");
    setCapacity("");
    setEstablishedYear("");
    setWebsite("");
    setPhone("");
    setDescription("");
    setSubmitterName("");
    setSubmitterEmail("");
    setSubmissionNotes("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!venueName.trim() || !locCountry.trim() || !locCity.trim() || !submitterName.trim() || !submitterEmail.trim()) {
      setError("Please complete all required fields.");
      return;
    }
    if (!submitterEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/submit-venue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: venueName.trim(),
          venueType,
          country: locCountry.trim(),
          state: locState.trim(),
          city: locCity.trim(),
          fullAddress: fullAddress.trim(),
          capacity: capacity.trim(),
          establishedYear: establishedYear.trim(),
          website: website.trim(),
          phone: phone.trim(),
          description: description.trim(),
          submitterName: submitterName.trim(),
          submitterEmail: submitterEmail.trim(),
          submissionNotes: submissionNotes.trim(),
        }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error || "Something went wrong. Please try again.");
        return;
      }
      setSuccessVenue(venueName.trim());
      setSuccessEmail(submitterEmail.trim());
      resetForm();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-0 flex-1 bg-black pb-24 pt-8 text-zinc-100 sm:pt-12">
      <div className={`${CLASSES.section} max-w-6xl`}>
        <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--ml-gold)]">
          Add your venue
        </p>
        <h1 className="ml-font-heading text-4xl font-semibold tracking-tight text-zinc-50 sm:text-5xl">
          Submit a <span className="text-[var(--ml-gold)] italic">venue</span>
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base">
          Know a great magic venue that&apos;s not listed? Submit it and we&apos;ll review it within 5 business
          days.
        </p>

        {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}

        {successVenue && successEmail ? (
          <div className="mt-8 rounded-2xl border border-[var(--ml-gold)]/30 bg-[var(--ml-gold)]/10 p-6 sm:p-8">
            <p className="ml-font-heading text-lg font-semibold text-[var(--ml-gold)]">Thank you!</p>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-300">
              We will review <span className="font-medium text-zinc-100">{successVenue}</span> and add it to the
              directory within 5 business days. We will email you at{" "}
              <span className="font-medium text-zinc-100">{successEmail}</span> when it goes live.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/venues" className={CLASSES.btnPrimarySm}>
                Browse venues
              </Link>
              <button
                type="button"
                onClick={() => {
                  setSuccessVenue("");
                  setSuccessEmail("");
                }}
                className={CLASSES.btnSecondarySm}
              >
                Submit another
              </button>
            </div>
          </div>
        ) : null}

        <div className={`mt-10 flex flex-col gap-12 lg:flex-row lg:items-start ${successVenue ? "hidden" : ""}`}>
          <form onSubmit={handleSubmit} className="min-w-0 flex-1 space-y-10 lg:max-w-3xl">
            <section className="space-y-4">
              <h2 className="ml-font-heading text-xl font-semibold text-zinc-100">Venue details</h2>
              <div>
                <label className={labelClass}>Venue name *</label>
                <input
                  className={inputClass}
                  required
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                  placeholder="e.g. The Magic Castle"
                />
              </div>
              <div>
                <label className={labelClass}>Venue type *</label>
                <select
                  className={inputClass}
                  required
                  value={venueType}
                  onChange={(e) => setVenueType(e.target.value as (typeof VENUE_TYPES)[number])}
                >
                  {VENUE_TYPES.map((t) => (
                    <option key={t} value={t} className="bg-zinc-900">
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Location *</label>
                <LocationPicker
                  className="mt-2"
                  selectedCountry={locCountry}
                  selectedState={locState}
                  selectedCity={locCity}
                  onCountryChange={setLocCountry}
                  onStateChange={setLocState}
                  onCityChange={setLocCity}
                  required
                />
                <p className="mt-2 text-[11px] text-zinc-600">
                  Saved as:{" "}
                  <span className="text-zinc-500">
                    {formatLocation(locCity, locState, locCountry).trim() || "—"}
                  </span>
                </p>
              </div>
              <div>
                <label className={labelClass}>Full address</label>
                <input
                  className={inputClass}
                  value={fullAddress}
                  onChange={(e) => setFullAddress(e.target.value)}
                  placeholder="Street, postal code…"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Capacity</label>
                  <input
                    type="number"
                    min={0}
                    className={inputClass}
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    placeholder="e.g. 250"
                  />
                </div>
                <div>
                  <label className={labelClass}>Established year</label>
                  <input
                    type="number"
                    min={1600}
                    max={2100}
                    className={inputClass}
                    value={establishedYear}
                    onChange={(e) => setEstablishedYear(e.target.value)}
                    placeholder="e.g. 1998"
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>Website URL</label>
                <input
                  type="url"
                  className={inputClass}
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://…"
                />
              </div>
              <div>
                <label className={labelClass}>Phone</label>
                <input
                  type="tel"
                  className={inputClass}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className={labelClass}>Description</label>
                <textarea
                  className={`${inputClass} min-h-[120px] resize-y`}
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What makes this venue special for magic audiences?"
                />
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="ml-font-heading text-xl font-semibold text-zinc-100">Your contact</h2>
              <div>
                <label className={labelClass}>Your name *</label>
                <input
                  className={inputClass}
                  required
                  value={submitterName}
                  onChange={(e) => setSubmitterName(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Your email *</label>
                <input
                  type="email"
                  className={inputClass}
                  required
                  value={submitterEmail}
                  onChange={(e) => setSubmitterEmail(e.target.value)}
                  placeholder="For follow-up about this submission"
                />
              </div>
              <div>
                <label className={labelClass}>Any additional notes</label>
                <textarea
                  className={`${inputClass} min-h-[88px] resize-y`}
                  rows={3}
                  value={submissionNotes}
                  onChange={(e) => setSubmissionNotes(e.target.value)}
                  placeholder="Anything else we should know?"
                />
              </div>
            </section>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button type="submit" disabled={submitting} className={CLASSES.btnPrimary}>
                {submitting ? "Submitting…" : "Submit venue"}
              </button>
              <Link href="/venues" className={CLASSES.btnSecondary}>
                Cancel
              </Link>
            </div>
          </form>

          <aside className="w-full shrink-0 space-y-8 lg:w-72">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Already listed?</h3>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                If your venue is already listed you can claim it and manage your profile.
              </p>
              <Link href="/venues" className={`${CLASSES.btnSecondarySm} mt-4 inline-flex`}>
                Browse venues
              </Link>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Guidelines</h3>
              <ul className="mt-4 list-disc space-y-3 pl-4 text-sm leading-relaxed text-zinc-400 marker:text-[var(--ml-gold)]">
                {GUIDELINES.map((g, i) => (
                  <li key={i}>{g}</li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
