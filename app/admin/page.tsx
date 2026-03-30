import { Suspense } from "react";
import AdminClient from "./AdminClient";

/**
 * Admin UI lives in `./AdminClient.tsx` — e.g. `tab === "magicians"` / `showAddMagician`,
 * `tab === "shows"` (all shows, inline edit, filters).
 */

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-black text-zinc-500">
          Loading…
        </div>
      }
    >
      <AdminClient />
    </Suspense>
  );
}
