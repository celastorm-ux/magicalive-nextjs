-- Admin article review & moderation (run in Supabase SQL editor)

alter table public.profiles add column if not exists is_admin boolean default false;
alter table public.profiles add column if not exists created_at timestamptz default now();

alter table public.articles add column if not exists rejection_reason text;
alter table public.articles add column if not exists created_at timestamptz default now();

-- Optional: venue moderation flag (venues may already have is_verified from shows_reviews.sql)
alter table public.venues add column if not exists is_verified boolean default false;

-- Grant your first admin manually, e.g.:
-- update public.profiles set is_admin = true where id = 'user_xxxxxxxx';
