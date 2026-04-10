"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";

type InviteRow = {
  id: string;
  created_at: string;
  email: string;
  name: string;
  personal_message: string | null;
  status: "pending" | "accepted" | "expired";
};

export default function AdminInvitesPage() {
  const { user, isLoaded } = useUser();
  const [ok, setOk] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState(
    "Hi [name], I'd love to invite you to join PinnacleMagic — a new platform built exclusively for professional magicians. Create your free profile and be one of our first 100 Founding Members. [personal message here]",
  );
  const [rows, setRows] = useState<InviteRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const res = await fetch("/api/admin/invites");
    const json = (await res.json()) as { ok?: boolean; invites?: InviteRow[] };
    if (res.ok && json.ok) setRows(json.invites ?? []);
  };

  useEffect(() => {
    if (!isLoaded || !user?.id) return;
    void (async () => {
      const res = await fetch("/api/admin/invites");
      if (res.ok) {
        setOk(true);
        await load();
      }
    })();
  }, [isLoaded, user?.id]);

  if (!isLoaded) return <div className="p-8 text-zinc-400">Loading…</div>;
  if (!ok) return <div className="p-8 text-zinc-400">Admin access required.</div>;

  return (
    <div className="min-h-screen bg-black p-6 text-zinc-100 sm:p-10">
      <h1 className="ml-font-heading text-3xl text-zinc-100">Admin Invites</h1>
      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="grid gap-3">
          <input
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2"
            placeholder="Magician name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <textarea
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2"
            rows={4}
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
          />
          <button
            className="rounded-xl bg-[var(--ml-gold)] px-4 py-2 font-semibold text-black"
            disabled={loading}
            onClick={() =>
              void (async () => {
                setLoading(true);
                await fetch("/api/admin/invites", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ name, email, personal_message: msg }),
                });
                setLoading(false);
                setName("");
                setEmail("");
                await load();
              })()
            }
          >
            Send invite
          </button>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="text-lg">Sent invites</h2>
        <div className="mt-4 space-y-3">
          {rows.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/40 p-3"
            >
              <div>
                <div className="font-medium">{r.name}</div>
                <div className="text-sm text-zinc-400">{r.email}</div>
                <div className="text-xs text-zinc-500">
                  {new Date(r.created_at).toLocaleDateString()} · {r.status}
                </div>
              </div>
              {r.status === "pending" ? (
                <div className="flex gap-2">
                  <button
                    className="rounded-lg border border-white/15 px-3 py-1 text-sm"
                    onClick={() =>
                      void fetch("/api/admin/invites", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ invite_id: r.id, action: "resend" }),
                      })
                    }
                  >
                    Resend
                  </button>
                  <button
                    className="rounded-lg border border-red-500/40 px-3 py-1 text-sm text-red-300"
                    onClick={() =>
                      void (async () => {
                        await fetch("/api/admin/invites", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ invite_id: r.id, action: "cancel" }),
                        });
                        await load();
                      })()
                    }
                  >
                    Cancel
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
