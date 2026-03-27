"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { CLASSES } from "@/lib/constants";

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

export default function SubmitVenuePage() {
  const [name, setName] = useState("");
  const [venueType, setVenueType] =
    useState<(typeof VENUE_TYPES)[number]>("Theater");
  const [city, setCity] = useState("");
  const [stateVal, setStateVal] = useState("");
  const [country, setCountry] = useState("United States");
  const [address, setAddress] = useState("");
  const [capacity, setCapacity] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [submitterName, setSubmitterName] = useState("");
  const [submitterEmail, setSubmitterEmail] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !city.trim() || !submitterName.trim() || !submitterEmail.trim()) {
      setError("Please fill in all required fields.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/submit-venue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          venueType,
          country: country.trim() || "United States",
          state: stateVal.trim(),
          city: city.trim(),
          fullAddress: address.trim(),
          capacity: capacity.trim(),
          website: website.trim(),
          description: description.trim(),
          submitterName: submitterName.trim(),
          submitterEmail: submitterEmail.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        setError(typeof data?.error === "string" ? data.error : "Something went wrong.");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Couldn't reach the server — try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <main className="min-h-0 flex-1 bg-black pb-20 pt-8 text-zinc-100 sm:pt-12 min-h-[60vh] flex flex-col">
        <header className="mb-8">
          <div className={`${CLASSES.section} flex flex-wrap items-center gap-3`}>
            <Link href="/venues" className={CLASSES.navLink}>
              ← Venues
            </Link>
          </div>
        </header>

        <div className={CLASSES.section}>
          <div className="rounded-3xl border border-[var(--ml-gold)]/25 bg-[var(--ml-panel)]/40 p-8">
            <p className="ml-font-heading text-xs tracking-[0.22em] uppercase text-zinc-400">
              Thank you
            </p>
            <h1 className="mt-2 ml-font-heading text-3xl font-semibold text-white sm:text-4xl">
              Your venue was submitted
            </h1>
            <p className="mt-4 max-w-prose text-zinc-300">
              We&apos;ll review it shortly and publish it on Magicalive.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/venues" className={CLASSES.btnPrimary}>
                Browse venues
              </Link>
              <Link href="/" className={CLASSES.btnSecondary}>
                Home
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-0 flex-1 bg-black pb-20 pt-8 text-zinc-100 sm:pt-12 flex flex-col">
      <header className="mb-10">
        <div className={`${CLASSES.section} flex flex-wrap items-center gap-3`}>
          <Link href="/venues" className={CLASSES.navLink}>
            ← Venues
          </Link>
        </div>
        <div className={`${CLASSES.section} mt-6`}>
          <p className="ml-font-heading text-xs tracking-[0.22em] uppercase text-zinc-400">
            Add your venue
          </p>
          <h1 className="mt-3 ml-font-heading text-4xl font-semibold text-white sm:text-5xl">
            Submit a{" "}
            <span className="text-[var(--ml-gold)] italic">venue</span>
          </h1>
          <p className="mt-4 max-w-2xl text-zinc-300">
            Tell us about a stage, showroom, or venue where magic is hosted. We review every submission before it goes live.
          </p>
        </div>
      </header>

      <div className={CLASSES.section}>
        {error ? (
          <div className="mb-6 rounded-2xl border border-red-400/20 bg-red-400/10 px-5 py-4 text-sm text-red-100">
            {error}
          </div>
        ) : null}

        <form
          onSubmit={handleSubmit}
          className="mx-auto max-w-3xl space-y-8 rounded-3xl border border-white/10 bg-[var(--ml-panel)]/35 p-6 shadow-[var(--ml-shadow)] sm:p-10"
        >
          <section className="space-y-5">
            <Field label="Venue name" required htmlFor="sv-name">
              <input
                id="sv-name"
                className={CLASSES.input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="organization"
                required
                maxLength={200}
              />
            </Field>
            <Field label="Venue type" required htmlFor="sv-type">
              <select
                id="sv-type"
                className={`${CLASSES.input} appearance-none`}
                value={venueType}
                onChange={(e) =>
                  setVenueType(
                    e.target.value as (typeof VENUE_TYPES)[number],
                  )
                }
              >
                {VENUE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="City" required htmlFor="sv-city">
                <input
                  id="sv-city"
                  className={CLASSES.input}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  autoComplete="address-level2"
                  required
                  maxLength={120}
                />
              </Field>
              <Field label="State / region" htmlFor="sv-state">
                <input
                  id="sv-state"
                  className={CLASSES.input}
                  value={stateVal}
                  onChange={(e) => setStateVal(e.target.value)}
                  autoComplete="address-level1"
                  maxLength={120}
                />
              </Field>
              <Field label="Country" required htmlFor="sv-country">
                <input
                  id="sv-country"
                  className={CLASSES.input}
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  autoComplete="country-name"
                  required
                  maxLength={120}
                />
              </Field>
            </div>
            <Field label="Address" hint="Optional" htmlFor="sv-address">
              <input
                id="sv-address"
                className={CLASSES.input}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                autoComplete="street-address"
                maxLength={500}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Capacity" hint="Optional" htmlFor="sv-cap">
                <input
                  id="sv-cap"
                  className={CLASSES.input}
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  placeholder="e.g. 250"
                />
              </Field>
              <Field label="Website" hint="Optional" htmlFor="sv-web">
                <input
                  id="sv-web"
                  className={CLASSES.input}
                  type="url"
                  inputMode="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://"
                  maxLength={300}
                />
              </Field>
            </div>
            <Field label="Description" hint="Optional" htmlFor="sv-desc">
              <textarea
                id="sv-desc"
                className={`${CLASSES.input} min-h-[120px] resize-y`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={4000}
                placeholder="What makes this venue special for live magic?"
              />
            </Field>
          </section>

          <div className="border-t border-white/10 pt-8">
            <p className="ml-font-heading text-xs tracking-[0.22em] uppercase text-zinc-400">
              Your contact
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Your name" required htmlFor="sv-sn">
                <input
                  id="sv-sn"
                  className={CLASSES.input}
                  value={submitterName}
                  onChange={(e) => setSubmitterName(e.target.value)}
                  autoComplete="name"
                  required
                  maxLength={120}
                />
              </Field>
              <Field label="Your email" required htmlFor="sv-se">
                <input
                  id="sv-se"
                  className={CLASSES.input}
                  type="email"
                  value={submitterEmail}
                  onChange={(e) => setSubmitterEmail(e.target.value)}
                  autoComplete="email"
                  required
                  maxLength={200}
                />
              </Field>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button type="submit" className={CLASSES.btnPrimary} disabled={submitting}>
              {submitting ? "Submitting…" : "Submit venue"}
            </button>
            <Link href="/venues" className={CLASSES.btnSecondary}>
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}

function Field({
  label,
  hint,
  required,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-2" htmlFor={htmlFor}>
      <span className="text-sm font-semibold text-zinc-100">
        {label}
        {required ? <span className="text-red-300"> *</span> : null}
        {hint ? <span className="ml-2 font-normal text-zinc-500">({hint})</span> : null}
      </span>
      {children}
    </label>
  );
}
