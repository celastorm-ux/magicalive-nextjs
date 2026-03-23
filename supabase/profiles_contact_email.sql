-- Optional public contact address for magicians (run in Supabase SQL Editor)

alter table public.profiles
  add column if not exists contact_email text;

comment on column public.profiles.contact_email is 'Public-facing email for fan contact; falls back to profiles.email when null';
