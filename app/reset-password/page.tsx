"use client";

import Link from "next/link";
import { useClerk, useSignIn } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { CLASSES } from "@/lib/constants";

function extractClerkError(err: unknown): string {
  if (err && typeof err === "object" && "errors" in err) {
    const errors = (err as { errors: { message?: string; longMessage?: string }[] }).errors;
    return errors[0]?.longMessage ?? errors[0]?.message ?? "Something went wrong.";
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong. Try again.";
}

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition focus:border-[var(--ml-gold)]/50 focus:bg-white/10";

type ClerkResetResult = {
  status: string;
  createdSessionId?: string | null;
};

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setActive } = useClerk();
  const { signIn } = useSignIn();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const emailParam = searchParams.get("email")?.trim();
    const codeParam = searchParams.get("code")?.trim();
    if (emailParam) setEmail(emailParam);
    if (codeParam) setCode(codeParam);
  }, [searchParams]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!signIn) return;

    const trimmedEmail = email.trim();
    const trimmedCode = code.trim();
    if (!trimmedEmail) {
      setError("Enter the email you used for your account.");
      return;
    }
    if (!trimmedCode) {
      setError("Enter the code from your email.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    setBusy(true);
    try {
      // If signIn isn't in the needs_first_factor state (e.g. fresh session),
      // re-initiate the reset flow. This also covers the case where the user
      // opens the link in a new browser tab.
      if (signIn.status !== "needs_first_factor") {
        await signIn.create({
          strategy: "reset_password_email_code" as any,
          identifier: trimmedEmail,
        });
      }

      const result = (await (signIn as any).attemptFirstFactor({
        strategy: "reset_password_email_code" as any,
        code: trimmedCode,
        password: newPassword,
      })) as ClerkResetResult;

      if (result.status === "complete" && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        router.push("/?password_reset=success");
      } else {
        // Unexpected state — send them to sign-in to try manually
        router.push("/sign-in");
      }
    } catch (err) {
      setError(extractClerkError(err));
    } finally {
      setBusy(false);
    }
  }

  if (!signIn) {
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
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--ml-gold)]">Account recovery</p>
          <h1 className="mt-2 ml-font-heading text-2xl font-semibold text-zinc-50 sm:text-3xl">
            Set a new <span className="italic text-[var(--ml-gold)]">password</span>
          </h1>
          <p className="mt-3 text-sm text-zinc-400">
            Enter the code from your email, then choose a new password. Codes expire after a short time.
          </p>

          <form className="mt-6 space-y-4" onSubmit={(e) => void onSubmit(e)}>
            <div>
              <label htmlFor="reset-email" className="mb-2 block text-[10px] font-medium uppercase tracking-widest text-zinc-500">
                Email
              </label>
              <input
                id="reset-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label htmlFor="reset-code" className="mb-2 block text-[10px] font-medium uppercase tracking-widest text-zinc-500">
                Reset code
              </label>
              <input
                id="reset-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className={inputClass}
                placeholder="From your email"
                required
              />
            </div>
            <div>
              <label htmlFor="new-pass" className="mb-2 block text-[10px] font-medium uppercase tracking-widest text-zinc-500">
                New password
              </label>
              <input
                id="new-pass"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={inputClass}
                required
                minLength={8}
              />
            </div>
            <div>
              <label htmlFor="confirm-pass" className="mb-2 block text-[10px] font-medium uppercase tracking-widest text-zinc-500">
                Confirm new password
              </label>
              <input
                id="confirm-pass"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputClass}
                required
                minLength={8}
              />
            </div>
            {error ? <p className="text-sm font-medium text-red-400">{error}</p> : null}
            <button
              type="submit"
              disabled={busy}
              className={`${CLASSES.btnPrimary} w-full justify-center disabled:opacity-60`}
            >
              {busy ? "Updating…" : "Reset password"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-500">
            <Link href="/forgot-password" className="text-[var(--ml-gold)]/80 hover:text-[var(--ml-gold)] hover:underline">
              Request a new code
            </Link>
            {" · "}
            <Link href="/sign-in" className="text-zinc-400 hover:text-zinc-200 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-black text-zinc-500">Loading…</div>
      }
    >
      <ResetPasswordInner />
    </Suspense>
  );
}
