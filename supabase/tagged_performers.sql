-- Tagged co-performers on shows (JSONB). Run in Supabase SQL editor.
-- Depends on: public.shows, public.profiles

alter table public.shows
  add column if not exists tagged_performers jsonb not null default '[]'::jsonb;

comment on column public.shows.tagged_performers is
  'Co-performers array: registered { profile_id, name, status, avatar_url? }; invited { profile_id null, name, email, status, unclaimed_profile_id? }';

-- Optional backfill from legacy show_performers (registered only):
-- insert into ... select — run manually if you need to migrate old rows.

-- Public show IDs where a magician appears as a tagged registered co-performer (for profile "Featured in" lists).
create or replace function public.shows_where_profile_tagged(p_profile_id text)
returns table (show_id uuid)
language sql
stable
as $$
  select s.id
  from public.shows s
  where coalesce(s.is_public, true) = true
    and coalesce(s.is_cancelled, false) = false
    and exists (
      select 1
      from jsonb_array_elements(coalesce(s.tagged_performers, '[]'::jsonb)) elem
      where (elem->>'profile_id') is not null
        and (elem->>'profile_id') = p_profile_id
        and coalesce(elem->>'status', 'registered') = 'registered'
    );
$$;

grant execute on function public.shows_where_profile_tagged(text) to anon, authenticated;
