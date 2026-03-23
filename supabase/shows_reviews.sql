-- Optional tables for magician / venue profiles (run in Supabase SQL editor)

create table if not exists public.shows (
  id uuid primary key default gen_random_uuid(),
  profile_id text references public.profiles(id) on delete cascade,
  venue_id uuid references public.venues(id) on delete set null,
  title text not null,
  venue_name text,
  starts_at timestamptz,
  ticket_url text,
  image_url text,
  status text default 'upcoming' check (status in ('upcoming', 'past', 'cancelled'))
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  magician_id text references public.profiles(id) on delete cascade,
  venue_id uuid references public.venues(id) on delete cascade,
  reviewer_display_name text,
  rating smallint check (rating >= 1 and rating <= 5),
  body text,
  show_title text,
  created_at timestamptz default now()
);

create index if not exists shows_profile_id_idx on public.shows (profile_id);
create index if not exists shows_venue_id_idx on public.shows (venue_id);
create index if not exists reviews_magician_id_idx on public.reviews (magician_id);
create index if not exists reviews_venue_id_idx on public.reviews (venue_id);

alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists is_verified boolean default false;
alter table public.profiles add column if not exists follower_count integer default 0;
alter table public.profiles add column if not exists years_active integer;
alter table public.profiles add column if not exists media_urls text[] default '{}';
alter table public.profiles add column if not exists online_visible boolean default false;

alter table public.venues add column if not exists is_verified boolean default false;
