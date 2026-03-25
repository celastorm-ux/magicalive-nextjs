"use client";

import { useClerk, useSignUp, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CLASSES } from "@/lib/constants";

function clerkEmailAlreadyExists(err: unknown): boolean {
  const errors = (err as { errors?: Array<{ code?: string }> })?.errors;
  return errors?.some((e) => e.code === "form_identifier_exists") ?? false;
}

type ClerkSignUpResource = {
  create: (params: {
    emailAddress: string;
    password: string;
    firstName: string;
    lastName?: string;
  }) => Promise<unknown>;
  prepareEmailAddressVerification: (params: { strategy: "email_code" }) => Promise<unknown>;
  attemptEmailAddressVerification: (params: { code: string }) => Promise<unknown>;
  status: string | null;
  createdSessionId: string | null;
};

function asClerkSignUp(
  signUp: NonNullable<ReturnType<typeof useSignUp>["signUp"]>,
): ClerkSignUpResource {
  return signUp as unknown as ClerkSignUpResource;
}

type ClaimProfile = {
  id: string;
  display_name: string | null;
  location: string | null;
  specialty_tags: string[] | null;
};

export default function ClaimProfileClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const profileId = searchParams.get("id")?.trim() ?? "";
  const { user, isLoaded } = useUser();
  const { signUp } = useSignUp();
  const { setActive, loaded: clerkLoaded } = useClerk();

  const [profile, setProfile] = useState<ClaimProfile | null>(null);
  const [loadErr, setLoadErr] = useState("");
  const [loading, setLoading] = useState(true);

  const [connectBusy, setConnectBusy] = useState(false);
  const [connectErr, setConnectErr] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [signBusy, setSignBusy] = useState(false);
  const [signErr, setSignErr] = useState("");
  const [awaitingVerify, setAwaitingVerify] = useState(false);
  const [verifyCode, setVerifyCode] = useState("");

  useEffect(() => {
    if (!profileId) {
      setLoading(false);
      setLoadErr("Missing profile id");
      return;
    }
    void (async () => {
      const res = await fetch(`/api/claim-profile?id=${encodeURIComponent(profileId)}`);
      const json = (await res.json()) as { ok?: boolean; profile?: ClaimProfile; error?: string };
      setLoading(false);
      if (!res.ok || !json.ok || !json.profile) {
        setLoadErr(json.error || "Could not load this profile");
        return;
      }
      setProfile(json.profile);
    })();
  }, [profileId]);

  const runClaimApi = async () => {
    const res = await fetch("/api/claim-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId }),
    });
    return (await res.json()) as { ok?: boolean; error?: string };
  };

  const connectProfile = async () => {
    setConnectErr("");
    setConnectBusy(true);
    try {
      const json = await runClaimApi();
      if (!json.ok) {
        setConnectErr(json.error || "Claim failed");
        return;
      }
      router.push("/profile");
    } catch {
      setConnectErr("Request failed");
    } finally {
      setConnectBusy(false);
    }
  };

  const submitSignUpAndClaim = async () => {
    setSignErr("");
    if (!profileId || !profile) return;
    if (password.length < 8) {
      setSignErr("Password must be at least 8 characters.");
      return;
    }
    if (password !== passwordConfirm) {
      setSignErr("Passwords do not match.");
      return;
    }
    const em = email.trim();
    if (!em) {
      setSignErr("Email is required.");
      return;
    }
    if (!clerkLoaded || !signUp) {
      setSignErr("Signup is not available. Try again.");
      return;
    }
    const su = asClerkSignUp(signUp);
    const displayName = profile.display_name?.trim() || "Magician";
    const nameParts = displayName.split(/\s+/).filter(Boolean);
    const firstName = nameParts[0] ?? "User";
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : undefined;

    if (awaitingVerify) {
      const code = verifyCode.trim();
      if (!code) {
        setSignErr("Enter the verification code.");
        return;
      }
      setSignBusy(true);
      try {
        await su.attemptEmailAddressVerification({ code });
        if (su.status === "complete" && su.createdSessionId) {
          await setActive({ session: su.createdSessionId });
          await router.refresh();
          const claimJson = await runClaimApi();
          if (!claimJson.ok) {
            setSignErr(claimJson.error || "Could not link profile");
            setSignBusy(false);
            return;
          }
          router.push("/profile");
        } else {
          setSignErr("Invalid code. Try again.");
        }
      } catch {
        setSignErr("Verification failed.");
      } finally {
        setSignBusy(false);
      }
      return;
    }

    setSignBusy(true);
    try {
      await su.create({
        emailAddress: em,
        password,
        firstName,
        ...(lastName ? { lastName } : {}),
      });
    } catch (err) {
      setSignBusy(false);
      if (clerkEmailAlreadyExists(err)) {
        setSignErr("An account with this email already exists. Sign in, then return to this page.");
      } else {
        setSignErr("Could not create account.");
      }
      return;
    }
    try {
      if (su.status === "complete" && su.createdSessionId) {
        await setActive({ session: su.createdSessionId });
        await router.refresh();
        const claimJson = await runClaimApi();
        if (!claimJson.ok) {
          setSignErr(claimJson.error || "Could not link profile");
          setSignBusy(false);
          return;
        }
        router.push("/profile");
      } else {
        await su.prepareEmailAddressVerification({ strategy: "email_code" });
        setAwaitingVerify(true);
      }
    } catch {
      setSignErr("Something went wrong.");
    } finally {
      setSignBusy(false);
    }
  };

  if (!profileId) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-black px-6 text-center">
        <p className="text-zinc-400">Missing profile id.</p>
        <Link href="/magicians" className={`${CLASSES.btnPrimarySm} mt-4`}>
          Browse magicians
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-black text-zinc-500">
        Loading…
      </div>
    );
  }

  if (loadErr || !profile) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-black px-6 text-center">
        <p className="text-zinc-400">{loadErr || "Profile not found."}</p>
        <Link href="/magicians" className={`${CLASSES.btnPrimarySm} mt-4`}>
          Browse magicians
        </Link>
      </div>
    );
  }

  const tags = profile.specialty_tags ?? [];
  const loggedIn = Boolean(isLoaded && user?.id);

  return (
    <div className="min-h-dvh bg-black px-5 py-12 text-zinc-100 sm:px-8">
      <div className="mx-auto max-w-lg">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--ml-gold)]">
          Magicalive
        </p>
        <h1 className="mt-2 ml-font-heading text-3xl font-semibold text-zinc-50">
          Claim your Magicalive profile
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          This profile was created on your behalf. Create an account to take ownership.
        </p>

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Profile preview</p>
          <p className="mt-2 text-lg font-semibold text-zinc-100">{profile.display_name?.trim() || "Magician"}</p>
          {profile.location?.trim() ? (
            <p className="mt-1 text-sm text-zinc-400">{profile.location.trim()}</p>
          ) : null}
          {tags.length ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-zinc-300"
                >
                  {t}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="mt-8">
          <div id="clerk-captcha" />
          {loggedIn ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <p className="text-sm text-zinc-400">
                Connect this placeholder profile to your signed-in account. Your shows and reviews will move with it.
              </p>
              {connectErr ? <p className="mt-3 text-sm text-red-400">{connectErr}</p> : null}
              <button
                type="button"
                disabled={connectBusy}
                onClick={() => void connectProfile()}
                className={`${CLASSES.btnPrimary} mt-4 w-full text-sm disabled:opacity-50`}
              >
                {connectBusy ? "Connecting…" : "Connect this profile to your account"}
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <p className="mb-4 text-sm text-zinc-400">
                {awaitingVerify
                  ? "Enter the code we emailed you to finish signup and claim this profile."
                  : "Create your account with email and password."}
              </p>
              {!awaitingVerify ? (
                <>
                  <label className="mb-1 block text-[10px] font-medium uppercase tracking-widest text-zinc-500">
                    Email
                  </label>
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mb-4 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-[var(--ml-gold)]/40"
                  />
                  <label className="mb-1 block text-[10px] font-medium uppercase tracking-widest text-zinc-500">
                    Password
                  </label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mb-4 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-[var(--ml-gold)]/40"
                  />
                  <label className="mb-1 block text-[10px] font-medium uppercase tracking-widest text-zinc-500">
                    Confirm password
                  </label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-[var(--ml-gold)]/40"
                  />
                </>
              ) : (
                <>
                  <label className="mb-1 block text-[10px] font-medium uppercase tracking-widest text-zinc-500">
                    Verification code
                  </label>
                  <input
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-[var(--ml-gold)]/40"
                    placeholder="6-digit code"
                  />
                </>
              )}
              {signErr ? <p className="mt-3 text-sm text-red-400">{signErr}</p> : null}
              <button
                type="button"
                disabled={signBusy || !clerkLoaded}
                onClick={() => void submitSignUpAndClaim()}
                className={`${CLASSES.btnPrimary} mt-5 w-full text-sm disabled:opacity-50`}
              >
                {signBusy
                  ? "Working…"
                  : awaitingVerify
                    ? "Verify and claim profile"
                    : "Create account and claim profile"}
              </button>
              <p className="mt-4 text-center text-xs text-zinc-500">
                Already have an account?{" "}
                <Link href="/sign-in" className="font-medium text-[var(--ml-gold)] hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
