import { Suspense } from "react";
import FanProfileClient from "./FanProfileClient";

function PageFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black text-zinc-500">
      Loading…
    </div>
  );
}

export default function FanProfilePage() {
  return (
    <Suspense fallback={<PageFallback />}>
      <FanProfileClient />
    </Suspense>
  );
}
