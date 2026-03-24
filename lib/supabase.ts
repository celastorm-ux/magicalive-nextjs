import { createClient } from "@supabase/supabase-js";

/** Anonymous Supabase client (NEXT_PUBLIC anon key). Pass Clerk `user.id` in queries as needed. */
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
