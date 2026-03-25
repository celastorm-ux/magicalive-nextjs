import { Suspense } from "react";
import AdminClient from "./AdminClient";

/**
 * Magicians tab (table, "+ Add magician", modal) is implemented in `./AdminClient.tsx`
 * — search for `tab === "magicians"` and state `showAddMagician`.
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
