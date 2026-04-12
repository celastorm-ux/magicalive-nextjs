"use client";

import { useSignIn, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clerkOAuthSignIn } from "@/lib/clerk-oauth";
import { supabase } from "@/lib/supabase";

const inputClass =
  "w-full rounded-xl border border-white/15 bg-white/[0.08] px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-400 outline-none transition focus:border-[var(--ml-gold)]/60 focus:bg-white/[0.12]";

const labelClass =
  "mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-zinc-500";

function extractClerkError(err: unknown): string {
  if (err && typeof err === "object" && "errors" in err) {
    const errors = (err as { errors: { message?: string; longMessage?: string }[] }).errors;
    return errors[0]?.longMessage ?? errors[0]?.message ?? "Something went wrong.";
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong. Try again.";
}

export default function SignInPage() {
  const router = useRouter();
  const { user, isLoaded: userLoaded } = useUser();
  const { signIn, setActive, isLoaded } = useSignIn();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Redirect already-signed-in users
  useEffect(() => {
    if (!userLoaded || !user?.id) return;
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      router.replace(data ? "/profile" : "/create-profile");
    })();
    return () => {
      cancelled = true;
    };
  }, [userLoaded, user?.id, router]);

  if (userLoaded && user) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-black px-4 py-12 text-zinc-400">
        <span
          className="inline-block size-10 animate-spin rounded-full border-2 border-[var(--ml-gold)]/30 border-t-[var(--ml-gold)]"
          aria-hidden
        />
        <p className="mt-4 text-sm">Redirecting…</p>
      </div>
    );
  }

  const startOAuth = async (strategy: "oauth_google" | "oauth_facebook") => {
    if (!isLoaded || !signIn) return;
    setError("");
    const { error: oauthErr } = await clerkOAuthSignIn(signIn, {
      strategy,
      redirectCallbackUrl: "/sso-callback",
      redirectUrl: "/",
    });
    if (oauthErr) setError(oauthErr);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signIn || !setActive) return;
    setError("");
    const id = identifier.trim();
    if (!id || !password) {
      setError("Please enter your email or username and password.");
      return;
    }
    setBusy(true);
    try {
      const result = await signIn.create({ identifier: id, password });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/profile");
      } else {
        setError("Sign-in could not be completed. Please try again.");
      }
    } catch (err) {
      setError(extractClerkError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 px-4 py-12">
      <div id="clerk-captcha" data-cl-theme="dark" data-cl-size="invisible" />
      <div className="w-full max-w-md">

        {/* Wordmark */}
        <Link
          href="/"
          className="mb-8 flex items-center justify-center gap-0 leading-none transition hover:opacity-90"
        >
          <span className="ml-font-heading text-3xl font-semibold tracking-wide text-white">Pinnacle</span>
          <span className="ml-font-heading text-3xl font-semibold tracking-wide italic text-[var(--ml-gold)]">Magic</span>
        </Link>

        <div className="rounded-2xl border border-white/20 bg-zinc-800/60 p-6 shadow-[0_0_40px_-12px_rgba(201,168,76,0.12)] backdrop-blur-sm sm:p-8">
          <h1 className="ml-font-heading text-2xl font-semibold text-zinc-50 sm:text-3xl">
            Welcome <span className="italic text-[var(--ml-gold)]">back</span>
          </h1>
          <p className="mt-1 text-sm text-zinc-300">Sign in to your account to continue.</p>

          {/* OAuth buttons */}
          <div className="mt-6 space-y-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => void startOAuth("oauth_google")}
              className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl border border-zinc-300/40 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-100 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
            >
              <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void startOAuth("oauth_facebook")}
              className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl border border-[#1877F2] bg-[#1877F2] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#166fe5] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
            >
              <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="white" aria-hidden>
                <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
              </svg>
              Continue with Facebook
            </button>
          </div>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/20" />
            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-400">or</span>
            <div className="h-px flex-1 bg-white/20" />
          </div>

          {/* Email / username + password form */}
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div>
              <label htmlFor="identifier" className={labelClass}>Email or username</label>
              <input
                id="identifier"
                name="identifier"
                type="text"
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className={inputClass}
                placeholder="you@example.com or your username"
                required
              />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="password" className={labelClass}>Password</label>
                <Link
                  href="/forgot-password"
                  className="text-[11px] text-[var(--ml-gold)]/70 transition hover:text-[var(--ml-gold)] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                placeholder="••••••••"
                required
              />
            </div>

            {error ? <p className="text-sm font-medium text-red-400">{error}</p> : null}

            <button
              type="submit"
              disabled={busy}
              className="flex w-full cursor-pointer items-center justify-center rounded-xl bg-[var(--ml-gold)] px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-[#f2c24f] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-400">
            Don&apos;t have an account?{" "}
            <Link href="/sign-up" className="text-[var(--ml-gold)] hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
