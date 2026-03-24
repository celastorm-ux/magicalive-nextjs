import { Suspense } from "react";
import VenueProfileClient from "./VenueProfileClient";

function PageFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black text-zinc-500">
      Loading…
    </div>
  );
}

export default function VenueProfilePage() {
  return (
    <Suspense fallback={<PageFallback />}>
      <VenueProfileClient />
    </Suspense>
  );
}
