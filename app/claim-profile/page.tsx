import { Suspense } from "react";
import ClaimProfileClient from "./ClaimProfileClient";

function Fallback() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-black text-zinc-500">
      Loading…
    </div>
  );
}

export default function ClaimProfilePage() {
  return (
    <Suspense fallback={<Fallback />}>
      <ClaimProfileClient />
    </Suspense>
  );
}
