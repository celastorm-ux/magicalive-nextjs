-- Optional: public description for shows and lectures (run in Supabase SQL editor if missing)
alter table public.shows add column if not exists description text;
