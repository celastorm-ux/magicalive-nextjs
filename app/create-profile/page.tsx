import { Suspense } from "react";
import CreateProfileClient from "./CreateProfileClient";
import CreateProfileGate from "./CreateProfileGate";

export default function CreateProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh flex-1 items-center justify-center bg-black text-zinc-500">
          <span
            className="inline-block size-10 animate-spin rounded-full border-2 border-[var(--ml-gold)]/30 border-t-[var(--ml-gold)]"
            aria-hidden
          />
        </div>
      }
    >
      <CreateProfileGate>
        <CreateProfileClient />
      </CreateProfileGate>
    </Suspense>
  );
}
