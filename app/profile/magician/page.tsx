import { Suspense } from "react";
import MagicianProfileClient from "./MagicianProfileClient";

function PageFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black text-zinc-500">
      Loading…
    </div>
  );
}

export default function MagicianProfilePage() {
  return (
    <Suspense fallback={<PageFallback />}>
      <MagicianProfileClient />
    </Suspense>
  );
}
