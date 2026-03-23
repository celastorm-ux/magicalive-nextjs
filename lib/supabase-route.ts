import { auth } from "@clerk/nextjs/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseWithAuth, supabase } from "@/lib/supabase";

/**
 * Supabase client for Route Handlers: service role if set (verify Clerk userId on every query),
 * else JWT from Clerk session, else anon (matches existing client-side behavior).
 */
export async function getRouteSupabase(): Promise<SupabaseClient> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey) {
    return createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  const { getToken } = await auth();
  let token: string | null = null;
  try {
    token = await getToken({ template: "supabase" });
  } catch {
    /* JWT template may not be configured */
  }
  if (!token) token = await getToken();
  if (token) return getSupabaseWithAuth(token);
  return supabase;
}
