-- Stale presence cleanup: mark users offline if they have not heartbeated recently.
-- Schedule with pg_cron in Supabase (Database → Extensions → pg_cron) or Supabase Dashboard SQL.
--
-- Runs every 5 minutes; anyone still "online" but with last_seen older than 2 minutes is set offline.

-- Example: enable pg_cron once per project (requires sufficient Postgres privileges):
-- create extension if not exists pg_cron with schema extensions;

-- Schedule job (cron expression: every 5 minutes).
-- Run once after enabling pg_cron; adjust job name if it already exists.
/*
select cron.schedule(
  'magicalive_presence_stale_offline',
  '*/5 * * * *',
  $$
  update public.profiles
  set is_online = false
  where is_online = true
    and last_seen < now() - interval '2 minutes';
  $$
);
*/

-- Manual test (run in SQL editor):
-- update public.profiles
-- set is_online = false
-- where is_online = true
--   and last_seen < now() - interval '2 minutes';
