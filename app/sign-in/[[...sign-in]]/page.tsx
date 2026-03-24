import { SignIn } from "@clerk/nextjs";
import Link from "next/link";

export default function SignInPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-black px-4 py-12">
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
  );
}
