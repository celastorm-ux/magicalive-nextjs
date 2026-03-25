-- Unclaimed magician profiles (run in Supabase SQL editor)

alter table public.profiles
  add column if not exists is_unclaimed boolean not null default false;

alter table public.profiles
  add column if not exists unclaimed_name text;

-- Admin-created placeholders must not consume Founding Member slots
create or replace function public.assign_founding_member()
returns trigger
language plpgsql
as $$
declare
  cnt integer;
begin
  if new.account_type <> 'magician' then
    return new;
  end if;

  if coalesce(new.is_unclaimed, false) = true then
    new.is_founding_member := false;
    return new;
  end if;

  select current_count into cnt
  from public.founding_member_count
  where id = 1
  for update;

  if cnt < 100 then
    new.is_founding_member := true;
    update public.founding_member_count
      set current_count = current_count + 1,
          updated_at = now()
      where id = 1;
  else
    new.is_founding_member := false;
  end if;

  return new;
end;
$$;

-- Optional: allow anon/authenticated users to read magician rows for directory & profiles.
-- Adjust to match your existing RLS; example policy if none exists:
-- create policy "profiles_select_magicians_public"
--   on public.profiles for select
--   using (account_type = 'magician');
