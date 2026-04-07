-- Article notification preferences for subscribers.
-- Run in Supabase SQL Editor.

alter table public.profiles
  add column if not exists email_new_articles boolean not null default true;
