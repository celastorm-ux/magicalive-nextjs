"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

export default function SSOCallbackPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-black px-4 py-12">
      <div id="clerk-captcha" data-cl-theme="dark" data-cl-size="invisible" />
      <AuthenticateWithRedirectCallback
        signInUrl="/sign-in"
        signUpUrl="/sign-up"
        signInFallbackRedirectUrl="/"
        signUpFallbackRedirectUrl="/create-profile/complete"
      />
    </div>
  );
}
