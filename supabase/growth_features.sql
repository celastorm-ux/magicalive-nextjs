-- Magicalive growth features SQL
-- Run this in Supabase SQL editor.

-- 1) Founding member support
alter table public.profiles
  add column if not exists is_founding_member boolean not null default false;

create table if not exists public.founding_member_count (
  id smallint primary key default 1,
  current_count integer not null default 0 check (current_count >= 0 and current_count <= 100),
  updated_at timestamptz not null default now(),
  constraint founding_member_count_single_row check (id = 1)
);

insert into public.founding_member_count (id, current_count)
values (1, 0)
on conflict (id) do nothing;

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

drop trigger if exists trg_assign_founding_member on public.profiles;
create trigger trg_assign_founding_member
before insert on public.profiles
for each row
execute function public.assign_founding_member();

-- 2) Invite system
create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  email text not null,
  name text not null,
  invited_by text not null,
  personal_message text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired')),
  token text not null unique,
  expires_at timestamptz not null
);

create index if not exists invites_status_idx on public.invites (status);
create index if not exists invites_email_idx on public.invites (email);
create index if not exists invites_expires_at_idx on public.invites (expires_at);
