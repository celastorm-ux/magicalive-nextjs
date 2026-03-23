"use client";

import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { useState } from "react";

export default function SignUpPage() {
  const [accepted, setAccepted] = useState(false);
  const [tried, setTried] = useState(false);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-black px-4 py-12">
      <div className="w-full max-w-md">
        <label className="mb-3 flex items-start gap-2 text-xs text-zinc-400">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            I agree to the Magicalive{" "}
            <Link href="/terms" target="_blank" rel="noopener noreferrer" className="text-[#f5cc71] hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="text-[#f5cc71] hover:underline">
              Privacy Policy
            </Link>
          </span>
        </label>
        {tried && !accepted ? (
          <p className="mb-3 text-sm text-red-400">Please accept the terms to continue</p>
        ) : null}
        <div
          className={!accepted ? "relative opacity-75" : ""}
          onClick={() => {
            if (!accepted) setTried(true);
          }}
        >
          {!accepted ? <div className="absolute inset-0 z-10" aria-hidden /> : null}
          <SignUp
            routing="path"
            path="/sign-up"
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
                identityPreviewText: "text-zinc-200",
                identityPreviewEditButton: "text-[#f5cc71]",
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
