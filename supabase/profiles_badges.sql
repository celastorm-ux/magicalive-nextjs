-- Add org membership badges column to profiles.
-- Run in the Supabase SQL Editor.

alter table public.profiles
  add column if not exists badges text[] default '{}';
