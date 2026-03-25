"use client";

import * as Clerk from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ComponentType } from "react";
import { CLASSES } from "@/lib/constants";
import {
  PENDING_MAGICIAN_PROFILE_KEY,
  type PendingMagicianProfileV1,
} from "@/lib/pending-magician-profile";
import { supabase } from "@/lib/supabase";
import pkg from "../../package.json";

const SELECT_EVENT_TYPES = "Select event types…";

const labelClass =
  "mb-2 block text-[10px] font-medium uppercase tracking-widest text-zinc-500";

function getEmailVerificationPage(): ComponentType | null {
  const C = Clerk as unknown as { EmailVerificationPage?: ComponentType };
  return typeof C.EmailVerificationPage === "function"
    ? C.EmailVerificationPage
    : null;
}

export default function VerifyEmailPage() {
  const router = useRouter();
  const { user, isLoaded } = Clerk.useUser();
  const [completeError, setCompleteError] = useState("");
  const [completeLoading, setCompleteLoading] = useState(false);
  const EmailVerificationPage = getEmailVerificationPage();

  useEffect(() => {
    const clerkDep = (
      pkg as { dependencies?: Record<string, string> }
    ).dependencies?.["@clerk/nextjs"];
    console.log("@clerk/nextjs (package.json):", clerkDep ?? "(not listed)");
  }, []);

  const finishWithPendingProfile = useCallback(async () => {
    setCompleteError("");
    if (!user?.id) {
      setCompleteError(
        "You are not signed in yet. Finish email verification first.",
      );
      return;
    }
    const raw = localStorage.getItem(PENDING_MAGICIAN_PROFILE_KEY);
    if (!raw) {
      router.push("/profile");
      return;
    }
    let pending: PendingMagicianProfileV1;
    try {
      pending = JSON.parse(raw) as PendingMagicianProfileV1;
    } catch {
      localStorage.removeItem(PENDING_MAGICIAN_PROFILE_KEY);
      router.push("/profile");
      return;
    }
    if (pending.v !== 1 || pending.accountType !== "magician") {
      localStorage.removeItem(PENDING_MAGICIAN_PROFILE_KEY);
      setCompleteError(
        "Saved profile data was invalid. Try creating your profile again.",
      );
      return;
    }

    setCompleteLoading(true);
    try {
      const ageNum = pending.age.trim() ? parseInt(pending.age, 10) : NaN;
      const availableVal =
        pending.availableFor === SELECT_EVENT_TYPES ? null : pending.availableFor;
      const emailForRow =
        pending.email.trim() ||
        user.primaryEmailAddress?.emailAddress ||
        "";

      const { error } = await supabase.from("profiles").insert({
        id: String(user.id),
        display_name: pending.displayName.trim(),
        handle: pending.handle.replace(/^@/, "").trim(),
        email: emailForRow,
        location: pending.location.trim(),
        age: Number.isFinite(ageNum) ? ageNum : null,
        short_bio: pending.shortBio.trim(),
        full_bio: pending.fullBio.trim(),
        account_type: "magician",
        specialty_tags: pending.selectedTags,
        available_for: availableVal,
        credentials: pending.credentials,
        instagram: pending.instagram.trim(),
        tiktok: pending.tiktok.trim(),
        youtube: pending.youtube.trim(),
        website: pending.website.trim(),
        showreel_url: pending.showreelUrl.trim(),
        avatar_url: null,
      });

      if (error) {
        const code = (error as { code?: string }).code;
        const msg = error.message ?? "";
        if (code === "23505" || msg.toLowerCase().includes("duplicate")) {
          localStorage.removeItem(PENDING_MAGICIAN_PROFILE_KEY);
          router.push("/profile");
          return;
        }
        console.error("Supabase save error:", error);
        throw error;
      }
      localStorage.removeItem(PENDING_MAGICIAN_PROFILE_KEY);
      void fetch("/api/founding-member/welcome", { method: "POST" });
      router.push("/profile");
    } catch (e: unknown) {
      const msg =
        e &&
        typeof e === "object" &&
        "message" in e &&
        typeof (e as { message?: string }).message === "string"
          ? (e as { message: string }).message
          : String(e);
      setCompleteError(msg || "Could not save profile.");
    } finally {
      setCompleteLoading(false);
    }
  }, [user, router]);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-8 px-4 py-12 sm:py-16">
      <div>
        <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--ml-gold)]">
          Magician signup
        </p>
        <h1 className="mb-2 ml-font-heading text-3xl font-semibold leading-tight text-zinc-50">
          Verify your <em className="text-[var(--ml-gold)] italic">email</em>
        </h1>
        <p className="text-[13px] leading-relaxed text-zinc-500">
          Complete this step so we can publish your Magicalive profile. If you
          came from the profile wizard, your answers are saved in this browser
          until you finish.
        </p>
      </div>

      <div className="rounded-xl border border-[var(--ml-gold)]/20 bg-white/[0.03] px-4 py-6 sm:px-6">
        {EmailVerificationPage ? (
          <EmailVerificationPage />
        ) : (
          <>
            <p className="mb-4 text-xs text-zinc-500">
              Use Clerk&apos;s sign-up flow below to enter your verification
              code or continue the email link from your inbox.
            </p>
            <div id="clerk-captcha" data-cl-theme="dark" data-cl-size="invisible" />
            <Clerk.SignUp
              routing="path"
              path="/verify-email"
              signInUrl="/sign-in"
              appearance={{
                variables: { colorPrimary: "#f5cc71" },
                elements: {
                  card: "bg-zinc-950 border border-[#f5cc71]/20 shadow-none",
                  headerTitle: "text-zinc-100",
                  headerSubtitle: "text-zinc-400",
                  socialButtonsBlockButton:
                    "border-white/10 bg-white/5 text-zinc-100 hover:bg-white/10",
                  formButtonPrimary:
                    "bg-[#f5cc71] text-black hover:bg-[#f2c24f]",
                  footerActionLink: "text-[#f5cc71] hover:text-[#f2c24f]",
                  formFieldInput:
                    "bg-white/5 border-white/10 text-zinc-100",
                },
              }}
            />
          </>
        )}
      </div>

      <div className="rounded-xl border border-white/10 bg-zinc-950/80 px-4 py-6 sm:px-6">
        <p className="mb-1 text-sm font-medium text-zinc-200">
          Prefer the link in your email?
        </p>
        <p className="mb-6 text-[13px] leading-relaxed text-zinc-500">
          Please check your email and click the verification link to complete
          your registration. When you&apos;re done, return here and confirm
          below so we can save your magician profile.
        </p>
        <label className={labelClass}>Status</label>
        <p className="mb-4 text-xs text-zinc-400">
          {isLoaded
            ? user?.id
              ? "Signed in — you can finish your profile."
              : "Not signed in yet — complete verification first."
            : "Loading…"}
        </p>
        {completeError ? (
          <p className="mb-4 text-sm font-medium text-red-400">{completeError}</p>
        ) : null}
        <button
          type="button"
          onClick={() => void finishWithPendingProfile()}
          disabled={completeLoading || !isLoaded || !user?.id}
          className={`${CLASSES.btnPrimary} text-xs uppercase tracking-wider disabled:opacity-60`}
        >
          {completeLoading ? (
            <span className="inline-flex items-center gap-2">
              <span
                className="inline-block size-4 shrink-0 animate-spin rounded-full border-2 border-black/25 border-t-black"
                aria-hidden
              />
              Saving…
            </span>
          ) : (
            "I have verified my email"
          )}
        </button>
        <p className="mt-6 text-center text-[11px] text-zinc-600">
          <Link href="/" className="text-[var(--ml-gold)] hover:underline">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
