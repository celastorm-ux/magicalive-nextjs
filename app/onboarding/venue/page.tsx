import { Suspense } from "react";
import VenueOnboardingClient from "./VenueOnboardingClient";

function PageFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black text-zinc-400">
      Loading…
    </div>
  );
}

export default function VenueOnboardingPage() {
  return (
    <Suspense fallback={<PageFallback />}>
      <VenueOnboardingClient />
    </Suspense>
  );
}
