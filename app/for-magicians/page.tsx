import Link from "next/link";
import { FoundingMemberSpots } from "@/components/FoundingMemberSpots";

const BENEFITS = [
  ["Your own profile page", "A beautiful public profile showcasing your bio, specialty, credentials, photos and videos"],
  ["List your shows", "Post upcoming shows and lectures. They appear instantly on the events directory and your profile"],
  ["Get discovered", "Appear in searches by location, specialty and availability. Event organisers and fans find you directly"],
  ["Booking requests", "Receive booking enquiries directly through the platform with email notifications"],
  ["Build your reputation", "Collect verified reviews from fans who attended your shows"],
  ["Connect with the community", "Follow other magicians, read technique articles, and be part of the world's magic community"],
] as const;

export default function ForMagiciansPage() {
  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-10">
        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 sm:p-12">
          <h1 className="ml-font-heading text-5xl">Your magic deserves an audience</h1>
          <p className="mt-4 max-w-3xl text-zinc-300">
            Magicalive is the platform built exclusively for professional magicians. Create your profile, list your shows, and get discovered.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/create-profile" className="rounded-xl bg-[var(--ml-gold)] px-5 py-3 font-semibold text-black">Create your free profile</Link>
            <a href="#how-it-works" className="rounded-xl border border-white/15 px-5 py-3">See how it works</a>
          </div>
          <div className="mt-6 text-lg"><FoundingMemberSpots /></div>
        </section>

        <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map(([title, body]) => (
            <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <h3 className="text-lg text-[var(--ml-gold)]">{title}</h3>
              <p className="mt-2 text-sm text-zinc-400">{body}</p>
            </div>
          ))}
        </section>

        <section className="mt-10 rounded-3xl border border-white/10 bg-white/[0.03] p-8">
          <blockquote className="ml-font-heading text-3xl">“The platform the magic community has been waiting for”</blockquote>
          <p className="mt-4 text-[var(--ml-gold)]">Founding Member ♣</p>
          <div className="mt-4 flex flex-wrap gap-6 text-zinc-300">
            <span>Profiles created</span><span>Shows listed</span><span>Venues on platform</span>
          </div>
        </section>

        <section id="how-it-works" className="mt-10 rounded-3xl border border-white/10 bg-white/[0.03] p-8">
          <h2 className="ml-font-heading text-3xl">How it works</h2>
          <ol className="mt-4 space-y-2 text-zinc-300">
            <li>1. Create your free profile (5 minutes)</li>
            <li>2. Add your shows and set your availability</li>
            <li>3. Get discovered by fans and event organisers</li>
          </ol>
        </section>

        <section className="mt-10 rounded-3xl border border-white/10 bg-white/[0.03] p-8">
          <h2 className="ml-font-heading text-3xl">FAQ</h2>
          <div className="mt-4 space-y-4 text-zinc-300">
            <p><strong>Is it really free?</strong> Yes — creating a profile and listing shows is completely free.</p>
            <p><strong>Who can see my profile?</strong> Anyone on the internet. Your profile is public and indexed by Google.</p>
            <p><strong>How do booking requests work?</strong> Fans submit details and you receive an email notification.</p>
            <p><strong>Can I control my availability?</strong> Yes — use the availability calendar on your dashboard.</p>
            <p><strong>What is a Founding Member?</strong> The first 100 magicians get a permanent Founding Member badge.</p>
            <p><strong>How do I get started?</strong> Click Create your profile, choose Magician, and complete setup.</p>
          </div>
        </section>

        <section className="mt-10 rounded-3xl border border-[var(--ml-gold)]/30 bg-[var(--ml-gold)]/10 p-8">
          <h2 className="ml-font-heading text-3xl">Ready to join the magic community?</h2>
          <div className="mt-4">
            <Link href="/create-profile" className="inline-flex rounded-xl bg-[var(--ml-gold)] px-6 py-3 text-lg font-semibold text-black">Create your profile</Link>
          </div>
          <div className="mt-4"><FoundingMemberSpots /></div>
        </section>
      </main>
    </div>
  );
}
