"use client";

import { SignIn, useClerk, useSignIn } from "@clerk/nextjs";
import Link from "next/link";
import { OAuthEmailDivider, SocialOAuthButtons } from "@/components/SocialOAuthButtons";
import { clerkOAuthSignIn } from "@/lib/clerk-oauth";

export default function SignInPage() {
  const { loaded } = useClerk();
  const { signIn } = useSignIn();

  const startOAuth = async (strategy: "oauth_google" | "oauth_facebook") => {
    if (!signIn) return;
    const { error } = await clerkOAuthSignIn(signIn, {
      strategy,
      redirectCallbackUrl: "/sso-callback",
      redirectUrl: "/",
    });
    if (error) console.error("OAuth sign-in:", error);
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-black px-4 py-12">
      <div className="w-full max-w-md">
        <SocialOAuthButtons
          disabled={!loaded || !signIn}
          onGoogle={() => void startOAuth("oauth_google")}
          onFacebook={() => void startOAuth("oauth_facebook")}
        />
        <OAuthEmailDivider />
        <div id="clerk-captcha" data-cl-theme="dark" data-cl-size="invisible" />
        <SignIn
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          appearance={{
            variables: { colorPrimary: "#f5cc71" },
            elements: {
              card: "bg-zinc-950 border border-[#f5cc71]/20 shadow-none",
              headerTitle: "text-zinc-100",
              headerSubtitle: "text-zinc-400",
              socialButtonsRoot: "hidden",
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
        <p className="mt-3 text-center">
          <Link
            href="/forgot-password"
            className="text-xs text-[#f5cc71]/70 transition hover:text-[#f5cc71] hover:underline"
          >
            Forgot your password?
          </Link>
        </p>
      </div>
    </div>
  );
}
