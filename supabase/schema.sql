-- Run in Supabase SQL Editor. Adjust RLS policies for your security model.
-- Clerk user ids are used as text primary keys (e.g. user_2abc...).

create table if not exists public.profiles (
  id text primary key,
  account_type text not null,
  display_name text,
  email text,
  handle text,
  location text,
  age integer,
  short_bio text,
  full_bio text,
  specialty_tags text[] default '{}',
  available_for text,
  credentials text[] default '{}',
  instagram text,
  tiktok text,
  youtube text,
  website text,
  showreel_url text,
  updated_at timestamptz default now()
);

create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  capacity integer,
  venue_type text,
  contact_email text,
  description text,
  user_id text not null,
  created_at timestamptz default now()
);

-- Example permissive policies for development (tighten for production):
-- alter table public.profiles enable row level security;
-- create policy "Allow insert own profile" on public.profiles for insert with check (true);
-- create policy "Allow update own profile" on public.profiles for update using (true);
