import { auth } from "@clerk/nextjs/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getRouteSupabase } from "@/lib/supabase-route";

export type AdminContext = { userId: string; db: SupabaseClient };

/**
 * Returns authenticated Supabase (service role when configured) only if the user is an admin.
 */
export async function requireAdmin(): Promise<AdminContext | null> {
  const { userId } = await auth();
  if (!userId) return null;
  const db = await getRouteSupabase();
  const { data, error } = await db.from("profiles").select("is_admin").eq("id", userId).maybeSingle();
  if (error || !data || !(data as { is_admin?: boolean | null }).is_admin) return null;
  return { userId, db };
}
