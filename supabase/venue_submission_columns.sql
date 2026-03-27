-- Optional columns for public venue submissions (run in Supabase SQL editor).
alter table public.venues add column if not exists submitter_name text;
alter table public.venues add column if not exists submission_notes text;
