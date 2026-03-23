import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Anonymous Supabase client (no user JWT). Use only for public reads.
 * For writes with Row Level Security tied to Clerk, use {@link getSupabaseWithAuth}.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Supabase client that sends the Clerk-issued JWT on each request.
 * Supabase validates the JWT (Clerk third-party auth or Clerk JWT template
 * signed with your Supabase JWT secret) so RLS can use `auth.jwt()->>'sub'`.
 *
 * @param accessToken - JWT from `session.getToken({ template: 'supabase' })` (or your template name)
 */
export function getSupabaseWithAuth(accessToken: string): SupabaseClient {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

/**
 * Clerk session JWT for Supabase RLS (`auth.jwt()->>'sub'`).
 * Prefer the `supabase` JWT template when configured.
 */
export async function createClerkSupabaseClient(
  getToken: (options?: { template?: string }) => Promise<string | null>,
): Promise<SupabaseClient> {
  let token: string | null = null;
  try {
    token = await getToken({ template: "supabase" });
  } catch {
    /* template may be missing */
  }
  if (!token) token = await getToken();
  return token ? getSupabaseWithAuth(token) : supabase;
}
