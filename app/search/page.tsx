import { Suspense } from "react";
import SearchPageClient from "./SearchPageClient";

function PageFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black text-zinc-500">
      Loading…
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<PageFallback />}>
      <SearchPageClient />
    </Suspense>
  );
}
