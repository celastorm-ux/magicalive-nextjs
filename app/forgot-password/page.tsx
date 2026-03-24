"use client";

import Link from "next/link";
import { useAuth, useSignIn } from "@clerk/nextjs";
import { useState } from "react";
import { CLASSES } from "@/lib/constants";

/** Clerk `useSignIn` return shape (resource may be nested as `signIn` depending on version). */
function getSignInResource(raw: ReturnType<typeof useSignIn>): SignInForReset | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  if ("signIn" in raw && (raw as { signIn?: SignInForReset }).signIn) {
    return (raw as { signIn: SignInForReset }).signIn;
  }
  if ("create" in raw && typeof (raw as { create?: unknown }).create === "function") {
    return raw as unknown as SignInForReset;
  }
  return undefined;
}

type SignInForReset = {
  create: (p: { identifier: string }) => Promise<{ error?: { message: string } | null }>;
  resetPasswordEmailCode: {
    sendCode: () => Promise<{ error?: { message: string } | null }>;
  };
};

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition focus:border-[var(--ml-gold)]/50 focus:bg-white/10";

export default function ForgotPasswordPage() {
  const { isLoaded } = useAuth();
  const signIn = getSignInResource(useSignIn());
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function sendReset(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!signIn || !isLoaded) return;
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Enter your email address.");
      return;
    }
    setBusy(true);
    try {
      const { error: createError } = await signIn.create({ identifier: trimmed });
      if (createError) {
        setError(createError.message || "Could not find an account with that email.");
        setBusy(false);
        return;
      }

      const { error: sendError } = await signIn.resetPasswordEmailCode.sendCode();
      if (sendError) {
        setError(sendError.message || "Could not send reset email.");
        setBusy(false);
        return;
      }

      setSent(true);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setError("");
    if (!signIn || !isLoaded || !email.trim()) return;
    setBusy(true);
    try {
      const { error: createError } = await signIn.create({ identifier: email.trim() });
      if (createError) {
        setError(createError.message || "Could not resend.");
        setBusy(false);
        return;
      }
      const { error: sendError } = await signIn.resetPasswordEmailCode.sendCode();
      if (sendError) {
        setError(sendError.message || "Could not resend.");
        return;
      }
      setSent(true);
    } catch {
      setError("Could not resend. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!isLoaded) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-black text-zinc-500">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-black px-4 py-12 text-zinc-100">
      <div className="mx-auto max-w-md">
        <Link
          href="/"
          className="mb-10 inline-flex items-center gap-1 leading-none transition hover:opacity-90"
        >
          <span className="ml-font-heading text-2xl font-semibold tracking-wide text-white">Magic</span>
          <span className="ml-font-heading text-2xl font-semibold tracking-wide italic text-[var(--ml-gold)]">alive</span>
        </Link>

        <div className="rounded-2xl border border-white/10 bg-zinc-950/80 p-6 shadow-[0_0_40px_-12px_rgba(201,168,76,0.12)] sm:p-8">
          {!sent ? (
            <>
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--ml-gold)]">
                Account recovery
              </p>
              <h1 className="mt-2 ml-font-heading text-2xl font-semibold text-zinc-50 sm:text-3xl">
                Reset your <span className="italic text-[var(--ml-gold)]">password</span>
              </h1>
              <p className="mt-3 text-sm text-zinc-400">
                Enter your email and we will send you a reset link and code.
              </p>
              <form className="mt-6 space-y-4" onSubmit={(e) => void sendReset(e)}>
                <div>
                  <label htmlFor="email" className="mb-2 block text-[10px] font-medium uppercase tracking-widest text-zinc-500">
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                    placeholder="you@example.com"
                    required
                  />
                </div>
                {error ? <p className="text-sm font-medium text-red-400">{error}</p> : null}
                <button
                  type="submit"
                  disabled={busy}
                  className={`${CLASSES.btnPrimary} w-full justify-center disabled:opacity-60`}
                >
                  {busy ? "Sending…" : "Send reset link"}
                </button>
              </form>
              <p className="mt-6 text-center text-sm text-zinc-500">
                Remember your password?{" "}
                <Link href="/sign-in" className="text-[var(--ml-gold)] hover:underline">
                  Sign in
                </Link>
              </p>
            </>
          ) : (
            <>
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--ml-gold)]">
                Account recovery
              </p>
              <h1 className="mt-2 ml-font-heading text-2xl font-semibold text-zinc-50">Check your inbox</h1>
              <p className="mt-3 text-sm text-zinc-400">
                We sent a password reset link and code to <span className="text-zinc-200">{email.trim()}</span>.
              </p>
              <p className="mt-4 text-sm text-zinc-500">
                Didn&apos;t receive it? Check your spam folder or try again.
              </p>
              {error ? <p className="mt-4 text-sm font-medium text-red-400">{error}</p> : null}
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => void resend()}
                  disabled={busy}
                  className={`${CLASSES.btnSecondary} flex-1 justify-center disabled:opacity-60`}
                >
                  {busy ? "Sending…" : "Resend"}
                </button>
                <Link
                  href={`/reset-password?email=${encodeURIComponent(email.trim())}`}
                  className={`${CLASSES.btnPrimary} flex-1 justify-center text-center`}
                >
                  Enter reset code
                </Link>
              </div>
              <p className="mt-6 text-center text-sm text-zinc-500">
                <Link href="/sign-in" className="text-[var(--ml-gold)] hover:underline">
                  Back to sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
