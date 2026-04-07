-- Adds columns referenced in code but missing from schema migrations.
-- All use IF NOT EXISTS so it's safe to re-run.
-- Run in Supabase SQL Editor.

alter table public.profiles
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists rating numeric(3,2) not null default 0,
  add column if not exists review_count integer not null default 0,
  add column if not exists is_online boolean not null default false,
  add column if not exists last_seen timestamptz,
  add column if not exists banner_url text;
