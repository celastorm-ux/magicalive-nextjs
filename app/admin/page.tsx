import { Suspense } from "react";
import AdminClient from "./AdminClient";

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
