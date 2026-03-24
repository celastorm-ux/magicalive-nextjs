-- =============================================================================
-- Clerk + Supabase: profiles table (text id = Clerk user id, e.g. user_2abc123)
-- Run in Supabase Dashboard → SQL Editor
-- =============================================================================
--
-- App uses the Supabase anon key; Clerk provides user.id only (stored as
-- profiles.id). RLS policies should allow the operations you need for anon
-- (e.g. public read, or restrictive policies if you use a service role on the server).
--
-- =============================================================================

-- 1) Ensure id is TEXT (Clerk ids are NOT UUIDs)
--    If you already have uuid, migrate data first; for a fresh table:
CREATE TABLE IF NOT EXISTS public.profiles (
  id text PRIMARY KEY,
  account_type text NOT NULL,
  display_name text,
  email text,
  handle text,
  location text,
  age integer,
  short_bio text,
  full_bio text,
  specialty_tags text[] DEFAULT '{}',
  available_for text,
  credentials text[] DEFAULT '{}',
  instagram text,
  tiktok text,
  youtube text,
  website text,
  showreel_url text,
  updated_at timestamptz DEFAULT now()
);

-- If table exists with wrong type:
-- ALTER TABLE public.profiles ALTER COLUMN id TYPE text;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop old policies if re-running (optional)
-- DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
-- DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
-- DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

-- JWT `sub` claim must match profiles.id (Clerk user id)
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING ((auth.jwt() ->> 'sub') = id);

CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  WITH CHECK ((auth.jwt() ->> 'sub') = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING ((auth.jwt() ->> 'sub') = id)
  WITH CHECK ((auth.jwt() ->> 'sub') = id);

-- Optional: allow users to delete only their row
-- CREATE POLICY "profiles_delete_own"
--   ON public.profiles FOR DELETE
--   USING ((auth.jwt() ->> 'sub') = id);

-- =============================================================================
-- Venues: user_id should be TEXT (Clerk id). Enable if venue saves use JWT.
-- =============================================================================
/*
ALTER TABLE public.venues
  ALTER COLUMN user_id TYPE text;

ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "venues_select_public"
  ON public.venues FOR SELECT USING (true);

CREATE POLICY "venues_insert_own"
  ON public.venues FOR INSERT
  WITH CHECK ((auth.jwt() ->> 'sub') = user_id);
*/
