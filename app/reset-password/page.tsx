"use client";

import Link from "next/link";
import { useAuth, useClerk, useSignIn } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { CLASSES } from "@/lib/constants";

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
    verifyCode: (p: { code: string }) => Promise<{ error?: { message: string } | null }>;
    submitPassword: (p: { password: string }) => Promise<{ error?: { message: string } | null }>;
  };
  status: string;
  createdSessionId: string | null;
  finalize: (opts: {
    navigate: (args: {
      session: { currentTask?: unknown } | null;
      decorateUrl: (path: string) => string;
    }) => void | Promise<void>;
  }) => Promise<{ error?: { message: string } | null }>;
};

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition focus:border-[var(--ml-gold)]/50 focus:bg-white/10";

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoaded } = useAuth();
  const { setActive } = useClerk();
  const signIn = getSignInResource(useSignIn());
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
    if (!signIn || !isLoaded) return;

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
      const { error: createError } = await signIn.create({ identifier: trimmedEmail });
      if (createError) {
        setError(createError.message || "Could not start reset. Check your email.");
        setBusy(false);
        return;
      }

      const { error: verifyError } = await signIn.resetPasswordEmailCode.verifyCode({
        code: trimmedCode,
      });
      if (verifyError) {
        setError(verifyError.message || "Invalid or expired code.");
        setBusy(false);
        return;
      }

      const { error: pwError } = await signIn.resetPasswordEmailCode.submitPassword({
        password: newPassword,
      });
      if (pwError) {
        setError(pwError.message || "Could not set password.");
        setBusy(false);
        return;
      }

      if (signIn.status === "complete" && signIn.createdSessionId) {
        try {
          await setActive({ session: signIn.createdSessionId });
        } catch {
          setError("Password updated but we could not sign you in. Try signing in manually.");
          return;
        }
        router.push("/?password_reset=success");
      } else if (signIn.status === "complete") {
        const { error: finError } = await signIn.finalize({
          navigate: async ({ session, decorateUrl }) => {
            if (session?.currentTask) return;
            const url = decorateUrl(`/?password_reset=success`);
            if (url.startsWith("http")) {
              window.location.href = url;
            } else {
              router.push(url);
            }
          },
        });
        if (finError) {
          setError(finError.message || "Could not finish sign-in.");
        }
      } else {
        router.push("/?password_reset=success");
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "errors" in err && Array.isArray((err as { errors: { message?: string }[] }).errors)
          ? (err as { errors: { message?: string }[] }).errors[0]?.message
          : null;
      setError(msg || "Something went wrong. Try again.");
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
