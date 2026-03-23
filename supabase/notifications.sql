-- Notifications + Realtime (run in Supabase SQL Editor)

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id text not null references public.profiles (id) on delete cascade,
  sender_id text references public.profiles (id) on delete set null,
  sender_name text,
  sender_avatar text,
  type text not null,
  message text not null,
  link text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_recipient_created_idx
  on public.notifications (recipient_id, created_at desc);

create index if not exists notifications_recipient_unread_idx
  on public.notifications (recipient_id)
  where is_read = false;

alter table public.notifications enable row level security;

create policy "notifications_select_own"
  on public.notifications for select
  using ((auth.jwt() ->> 'sub') = recipient_id);

create policy "notifications_update_own"
  on public.notifications for update
  using ((auth.jwt() ->> 'sub') = recipient_id);

create policy "notifications_delete_own"
  on public.notifications for delete
  using ((auth.jwt() ->> 'sub') = recipient_id);

-- Inserts from signed-in users acting as the sender (follows, reviews, booking flows).
-- Service role bypasses RLS for admin/system rows (e.g. article published with null sender).
create policy "notifications_insert_as_sender"
  on public.notifications for insert
  with check (
    sender_id is not null
    and (auth.jwt() ->> 'sub') = sender_id
    and recipient_id <> (auth.jwt() ->> 'sub')
  );

-- Article publish/reject (sender_id null) when JWT is an admin profile
create policy "notifications_insert_admin_system"
  on public.notifications for insert
  with check (
    sender_id is null
    and exists (
      select 1
      from public.profiles p
      where p.id = (auth.jwt() ->> 'sub')
        and coalesce(p.is_admin, false) = true
    )
  );

-- Realtime: add table to the publication (ignore if already added)
do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception
  when duplicate_object then null;
end $$;
