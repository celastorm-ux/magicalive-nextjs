-- Lectures support on public.shows (run in Supabase SQL Editor)

alter table public.shows
  add column if not exists event_type text not null default 'show',
  add column if not exists skill_level text,
  add column if not exists includes_workbook boolean not null default false,
  add column if not exists includes_props boolean not null default false,
  add column if not exists max_attendees integer,
  add column if not exists is_online boolean not null default false;

alter table public.shows drop constraint if exists shows_event_type_check;

alter table public.shows
  add constraint shows_event_type_check check (event_type in ('show', 'lecture'));

comment on column public.shows.event_type is 'show | lecture';
comment on column public.shows.skill_level is 'Beginner | Intermediate | Advanced | All levels (lectures)';
comment on column public.shows.max_attendees is 'Lecture capacity when limited seats';
