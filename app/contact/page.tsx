"use client";

import Link from "next/link";
import { useState } from "react";
import { CLASSES } from "@/lib/constants";

const CONTACT_CARDS = [
  {
    emoji: "✉️",
    label: "General",
    description: "Questions about the directory, your account, or how PinnacleMagic works.",
    email: "hello@pinnaclemagic.com",
  },
  {
    emoji: "📝",
    label: "Editorial",
    description: "Article pitches, corrections, and editorial policy.",
    email: "editorial@pinnaclemagic.com",
  },
  {
    emoji: "🛟",
    label: "Support",
    description: "Technical help, login issues, and billing.",
    email: "support@pinnaclemagic.com",
  },
  {
    emoji: "🏛️",
    label: "Venues",
    description: "Listings, map data, and partnership inquiries for spaces.",
    email: "venues@pinnaclemagic.com",
  },
] as const;

const TOPICS = [
  "General",
  "My profile",
  "Article pitch",
  "Venue listing",
  "Partnership",
  "Bug report",
  "Other",
] as const;

const FAQS: { q: string; a: React.ReactNode }[] = [
  {
    q: "How do I create a magician profile?",
    a: (
      <>
        Go to{" "}
        <Link href="/create-profile" className="text-[var(--ml-gold)] hover:underline">
          Create profile
        </Link>
        , choose <strong className="text-zinc-300">Magician</strong>, and walk through
        the steps. You&apos;ll add your act, specialties, and media; profiles go live
        after a quick review.
      </>
    ),
  },
  {
    q: "Is PinnacleMagic free to use?",
    a: "Browsing magicians, events, and venues is free. Performers and venues can create listings on free tiers; paid options unlock extra promotion and analytics where available.",
  },
  {
    q: "How do I get my venue listed?",
    a: (
      <>
        Use{" "}
        <Link href="/create-profile" className="text-[var(--ml-gold)] hover:underline">
          Create profile
        </Link>{" "}
        and select <strong className="text-zinc-300">Venue</strong>, or email{" "}
        <a
          href="mailto:venues@pinnaclemagic.com"
          className="text-[var(--ml-gold)] hover:underline"
        >
          venues@pinnaclemagic.com
        </a>{" "}
        with your space details. We typically confirm within a few business days.",
      </>
    ),
  },
  {
    q: "Can I submit an article if I am not a magician?",
    a: (
      <>
        Yes. We publish critics, historians, venue staff, and fans. Use{" "}
        <Link href="/submit-article" className="text-[var(--ml-gold)] hover:underline">
          Submit an article
        </Link>{" "}
        and choose the category that fits; editorial@pinnaclemagic.com is also fine for
        pitches.",
      </>
    ),
  },
  {
    q: "How does the online now status work?",
    a: "When you're signed in and active on PinnacleMagic, your profile can show a green \"Online now\" indicator. You can control visibility in profile settings; it's optional and not real-time location.",
  },
  {
    q: "Can I post events without a venue on PinnacleMagic?",
    a: "Events should be tied to a real venue or listed space when possible. Pop-ups and touring shows can use a temporary or “TBA” venue with a note — contact support if your case is unusual.",
  },
  {
    q: "How do I report an issue with a profile or article?",
    a: (
      <>
        Use this form with topic <strong className="text-zinc-300">Bug report</strong>{" "}
        or <strong className="text-zinc-300">Other</strong>, or email{" "}
        <a
          href="mailto:support@pinnaclemagic.com"
          className="text-[var(--ml-gold)] hover:underline"
        >
          support@pinnaclemagic.com
        </a>{" "}
        with links and a short description. We take harassment and misrepresentation
        seriously.",
      </>
    ),
  },
  {
    q: "How long does editorial review take?",
    a: "Article submissions are usually acknowledged within three business days; full review and scheduling can take one to two weeks depending on backlog. Urgent corrections are prioritized.",
  },
];

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition focus:border-[var(--ml-gold)]/50 focus:bg-white/10";

const labelClass =
  "mb-2 block text-[10px] font-semibold uppercase tracking-wider text-zinc-500";

export default function ContactPage() {
  const [topic, setTopic] = useState<(typeof TOPICS)[number]>("General");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <div className="min-h-0 flex-1 bg-black pb-24 pt-8 text-zinc-100 sm:pt-12">
      <div className={`${CLASSES.section} max-w-6xl`}>
        {/* Hero two-column */}
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--ml-gold)]">
              Get in touch
            </p>
            <h1 className="ml-font-heading text-4xl font-semibold tracking-tight text-zinc-50 sm:text-5xl">
              Contact <span className="text-[var(--ml-gold)] italic">us</span>
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-zinc-400 sm:text-base">
              Whether you&apos;re a performer, venue, writer, or fan — we read every
              message. Pick the channel that fits, or use the form and we&apos;ll route
              it to the right team.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {CONTACT_CARDS.map((c) => (
                <div
                  key={c.email}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-[var(--ml-gold)]/25"
                >
                  <span className="text-2xl">{c.emoji}</span>
                  <h2 className="mt-3 font-semibold text-zinc-100">{c.label}</h2>
                  <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                    {c.description}
                  </p>
                  <a
                    href={`mailto:${c.email}`}
                    className="mt-4 inline-block text-sm font-medium text-[var(--ml-gold)] hover:text-[var(--ml-gold-hover)] hover:underline"
                  >
                    {c.email}
                  </a>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 sm:p-8">
              <h2 className="ml-font-heading text-2xl font-semibold text-zinc-50">
                Send us a message
              </h2>

              <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                <div>
                  <p className={labelClass}>Topic</p>
                  <div className="flex flex-wrap gap-2">
                    {TOPICS.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTopic(t)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                          topic === t
                            ? "border-[var(--ml-gold)] bg-[var(--ml-gold)]/15 text-[var(--ml-gold)]"
                            : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/20 hover:text-zinc-200"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className={labelClass} htmlFor="contact-name">
                    Name
                  </label>
                  <input
                    id="contact-name"
                    className={inputClass}
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="contact-email">
                    Email
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    className={inputClass}
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="contact-subject">
                    Subject
                  </label>
                  <input
                    id="contact-subject"
                    className={inputClass}
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="What is this about?"
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="contact-message">
                    Message
                  </label>
                  <textarea
                    id="contact-message"
                    className={`${inputClass} min-h-[140px] resize-y`}
                    required
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="How can we help?"
                  />
                </div>

                {sent ? (
                  <div
                    className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm font-medium text-emerald-200"
                    role="status"
                  >
                    Message sent — we&apos;ll get back to you soon. (Demo: form not
                    connected to a server.)
                  </div>
                ) : (
                  <button type="submit" className={`${CLASSES.btnPrimary} w-full sm:w-auto`}>
                    Send message
                  </button>
                )}
              </form>
            </div>
          </div>
        </div>

        <hr className="my-16 border-white/10 sm:my-20" />

        {/* FAQ */}
        <p className="text-center text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--ml-gold)]">
          Common questions
        </p>
        <h2 className="mt-2 text-center ml-font-heading text-3xl font-semibold text-zinc-50 sm:text-4xl">
          Frequently asked questions
        </h2>

        <div className="mx-auto mt-12 grid max-w-5xl gap-4 sm:grid-cols-2">
          {FAQS.map((item, i) => {
            const open = openFaq === i;
            return (
              <div
                key={item.q}
                className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition hover:border-white/15"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(open ? null : i)}
                  className="flex w-full items-start gap-3 p-5 text-left"
                  aria-expanded={open}
                >
                  <span
                    className={`mt-0.5 shrink-0 text-[var(--ml-gold)] transition-transform duration-200 ${
                      open ? "rotate-90" : ""
                    }`}
                    aria-hidden
                  >
                    →
                  </span>
                  <span className="font-medium leading-snug text-zinc-100">
                    {item.q}
                  </span>
                </button>
                <div
                  className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                    open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  }`}
                >
                  <div className="min-h-0 overflow-hidden">
                    <div className="border-t border-white/5 px-5 pb-5 pl-12 pr-5 pt-0 text-sm leading-relaxed text-zinc-400">
                      {item.a}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
