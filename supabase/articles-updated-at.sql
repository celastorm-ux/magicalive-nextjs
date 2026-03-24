-- Run in Supabase SQL editor if articles.updated_at is missing
alter table public.articles add column if not exists updated_at timestamptz default now();
