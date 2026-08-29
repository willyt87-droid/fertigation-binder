-- The Fertigation Binder — empty-project schema
-- Compatible with the pilot table shapes. Do not point this app at a live pilot database.
-- Apply in the Supabase SQL editor, or via: supabase db query -f supabase/migrations/20260829143600_init.sql

create table if not exists public.sites (
  id text primary key,
  name text not null,
  location text not null default ''
);

create table if not exists public.rooms (
  id text primary key,
  site_id text not null references public.sites (id) on delete cascade,
  name text not null,
  type text not null,
  max_zones integer not null default 8,
  sort_order integer not null default 0,
  constraint rooms_type_check check (type in ('flower', 'mom', 'veg')),
  constraint rooms_max_zones_check check (max_zones > 0)
);

create table if not exists public.cycles (
  id uuid primary key default gen_random_uuid(),
  room_id text not null references public.rooms (id) on delete cascade,
  number integer not null,
  start_date date not null,
  status text not null default 'in_progress',
  constraint cycles_number_check check (number > 0),
  constraint cycles_status_check check (status in ('in_progress', 'completed'))
);

create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  room_id text not null references public.rooms (id) on delete cascade,
  date date not null,
  zone integer not null,
  cultivar text,
  feed_ml integer,
  feed_ec double precision,
  feed_ph double precision,
  runoff_ml integer,
  runoff_ec double precision,
  runoff_ph double precision,
  notes text,
  created_at timestamptz not null default now(),
  tech text,
  constraint entries_zone_check check (zone > 0)
);

create index if not exists rooms_site_id_idx on public.rooms (site_id);
create index if not exists rooms_site_sort_idx on public.rooms (site_id, sort_order);
create index if not exists cycles_room_id_idx on public.cycles (room_id);
create index if not exists cycles_room_status_idx on public.cycles (room_id, status);
create index if not exists entries_room_id_idx on public.entries (room_id);
create index if not exists entries_room_date_idx on public.entries (room_id, date);

alter table public.sites enable row level security;
alter table public.rooms enable row level security;
alter table public.cycles enable row level security;
alter table public.entries enable row level security;

-- Anon key (this product's client) may read/write only these four tables.
revoke all on table public.sites from public, anon, authenticated;
revoke all on table public.rooms from public, anon, authenticated;
revoke all on table public.cycles from public, anon, authenticated;
revoke all on table public.entries from public, anon, authenticated;

grant select, insert, update, delete on table public.sites to anon;
grant select, insert, update, delete on table public.rooms to anon;
grant select, insert, update, delete on table public.cycles to anon;
grant select, insert, update, delete on table public.entries to anon;

drop policy if exists sites_anon_all on public.sites;
drop policy if exists rooms_anon_all on public.rooms;
drop policy if exists cycles_anon_all on public.cycles;
drop policy if exists entries_anon_all on public.entries;

create policy sites_anon_all on public.sites
  for all to anon using (true) with check (true);

create policy rooms_anon_all on public.rooms
  for all to anon using (true) with check (true);

create policy cycles_anon_all on public.cycles
  for all to anon using (true) with check (true);

create policy entries_anon_all on public.entries
  for all to anon using (true) with check (true);
