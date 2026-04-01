import { Suspense } from "react";
import SetupClient from "./SetupClient";

export default function ProfileSetupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-black text-zinc-500">
          Loading…
        </div>
      }
    >
      <SetupClient />
    </Suspense>
  );
}
