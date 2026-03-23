-- Run in Supabase SQL Editor (fan onboarding + venue onboarding + fan profile)

alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists heard_about text;
alter table public.profiles add column if not exists fan_favourite_styles text[] default '{}';
alter table public.profiles add column if not exists fan_member_since timestamptz default now();

alter table public.venues add column if not exists logo_url text;
alter table public.venues add column if not exists full_address text;
alter table public.venues add column if not exists website text;
alter table public.venues add column if not exists opening_hours text;
alter table public.venues add column if not exists magic_show_description text;
alter table public.venues add column if not exists social_instagram text;
alter table public.venues add column if not exists social_facebook text;
alter table public.venues add column if not exists social_tiktok text;
alter table public.venues add column if not exists social_youtube text;

-- Public read for fan avatars bucket (create bucket "avatars" in Storage, set public)
-- insert into storage.buckets (id, public) values ('avatars', true);
