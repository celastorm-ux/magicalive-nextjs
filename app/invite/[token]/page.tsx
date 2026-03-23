"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Invite = {
  email: string;
  name: string;
  status: "pending" | "accepted" | "expired";
};

export default function InviteTokenPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = params?.token || "";
  const [invite, setInvite] = useState<Invite | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/invite/${encodeURIComponent(token)}`);
      const json = (await res.json()) as { ok?: boolean; invite?: Invite };
      if (res.ok && json.ok && json.invite) setInvite(json.invite);
      setLoading(false);
    })();
  }, [token]);

  if (loading) return <div className="p-10 text-zinc-400">Loading invitation…</div>;
  if (!invite) return <div className="p-10 text-zinc-400">This invitation is invalid.</div>;
  if (invite.status === "expired") {
    return (
      <div className="p-10 text-zinc-100">
        <h1 className="text-3xl">This invitation has expired</h1>
        <Link href="/create-profile" className="mt-4 inline-block text-[var(--ml-gold)]">
          Create your profile anyway
        </Link>
      </div>
    );
  }
  if (invite.status === "accepted") {
    return <div className="p-10 text-zinc-100 text-3xl">This invitation has already been used</div>;
  }

  return (
    <div className="min-h-screen bg-black p-8 text-zinc-100 sm:p-14">
      <h1 className="ml-font-heading text-4xl">You&apos;ve been personally invited to join Magicalive</h1>
      <p className="mt-3 text-[var(--ml-gold)]">Founding Member ♣</p>
      <p className="mt-2 text-zinc-300">You have been reserved a Founding Member spot.</p>
      <button
        className="mt-6 rounded-xl bg-[var(--ml-gold)] px-5 py-3 font-semibold text-black"
        onClick={() =>
          void (async () => {
            await fetch(`/api/invite/${encodeURIComponent(token)}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "accept" }),
            });
            router.push(`/create-profile?email=${encodeURIComponent(invite.email)}`);
          })()
        }
      >
        Create your profile
      </button>
    </div>
  );
}
