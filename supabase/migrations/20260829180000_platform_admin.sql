-- Platform operator (WT) vs facility owners.
-- Apply after 20260829160000_owner_onboarding.sql on an empty project. Do not run against a live pilot.

create table if not exists public.platform_admins (
  email text primary key,
  created_at timestamptz not null default now(),
  constraint platform_admins_email_check check (position('@' in email) > 1)
);

alter table public.platform_admins enable row level security;

-- Seed the first operator. Add more rows (or set VITE_PLATFORM_ADMIN_EMAILS and insert those emails) later.
insert into public.platform_admins (email)
values (lower('willyt87@gmail.com'))
on conflict (email) do nothing;

alter table public.sites
  add column if not exists status text not null default 'pending',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists owner_email text,
  add column if not exists aroya_key_saved boolean not null default false;

alter table public.sites drop constraint if exists sites_status_check;
alter table public.sites
  add constraint sites_status_check check (status in ('pending', 'active', 'paused'));

create index if not exists sites_status_idx on public.sites (status);
create index if not exists sites_created_at_idx on public.sites (created_at desc);

revoke all on table public.platform_admins from public, anon, authenticated;
grant select on table public.platform_admins to authenticated;

-- A signed-in user may only see their own allowlist row (used as a client membership check).
drop policy if exists platform_admins_self_select on public.platform_admins;
create policy platform_admins_self_select on public.platform_admins
  for select to authenticated
  using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.platform_admins pa
    where lower(pa.email) = (
      select lower(u.email)
      from auth.users u
      where u.id = auth.uid()
    )
  );
$$;

revoke all on function public.is_platform_admin() from public;
grant execute on function public.is_platform_admin() to authenticated;

-- Floor PIN unlocks only an approved (active) facility.
create or replace function public.check_floor_pin(p_site_id text, p_pin_hash text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.sites
    where id = p_site_id
      and pin_hash is not null
      and pin_hash = p_pin_hash
      and status = 'active'
  );
$$;

revoke all on function public.check_floor_pin(text, text) from public;
grant execute on function public.check_floor_pin(text, text) to anon, authenticated;

create or replace function public.admin_set_site_status(p_site_id text, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Not a platform admin';
  end if;
  if p_status not in ('pending', 'active', 'paused') then
    raise exception 'Invalid facility status';
  end if;
  update public.sites set status = p_status where id = p_site_id;
end;
$$;

revoke all on function public.admin_set_site_status(text, text) from public;
grant execute on function public.admin_set_site_status(text, text) to authenticated;

create or replace function public.admin_delete_site(p_site_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Not a platform admin';
  end if;
  delete from public.sites where id = p_site_id;
end;
$$;

revoke all on function public.admin_delete_site(text) from public;
grant execute on function public.admin_delete_site(text) to authenticated;

-- New facilities start pending. Only a platform admin may change status.
create or replace function public.sites_status_guard()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if not public.is_platform_admin() then
      new.status := 'pending';
    end if;
    return new;
  end if;
  if new.status is distinct from old.status and not public.is_platform_admin() then
    raise exception 'Only a platform admin can change facility status';
  end if;
  return new;
end;
$$;

drop trigger if exists sites_status_guard on public.sites;
create trigger sites_status_guard
  before insert or update on public.sites
  for each row
  execute function public.sites_status_guard();

drop policy if exists sites_anon_select on public.sites;
drop policy if exists sites_owner_all on public.sites;
drop policy if exists sites_admin_select on public.sites;
drop policy if exists sites_admin_update on public.sites;
drop policy if exists sites_admin_delete on public.sites;

-- Floor (anon): active facility cards only. Owners: their rows. Admins: every facility.
create policy sites_anon_select on public.sites
  for select to anon
  using (status = 'active');

create policy sites_owner_all on public.sites
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy sites_admin_select on public.sites
  for select to authenticated
  using (public.is_platform_admin());

create policy sites_admin_update on public.sites
  for update to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create policy sites_admin_delete on public.sites
  for delete to authenticated
  using (public.is_platform_admin());

drop policy if exists rooms_anon_select on public.rooms;
drop policy if exists rooms_admin_select on public.rooms;
create policy rooms_anon_select on public.rooms
  for select to anon
  using (exists (select 1 from public.sites s where s.id = site_id and s.status = 'active'));

create policy rooms_admin_select on public.rooms
  for select to authenticated
  using (public.is_platform_admin());

drop policy if exists cycles_anon_all on public.cycles;
drop policy if exists cycles_admin_select on public.cycles;
create policy cycles_anon_all on public.cycles
  for all to anon
  using (
    exists (
      select 1
      from public.rooms r
      join public.sites s on s.id = r.site_id
      where r.id = room_id and s.status = 'active'
    )
  )
  with check (
    exists (
      select 1
      from public.rooms r
      join public.sites s on s.id = r.site_id
      where r.id = room_id and s.status = 'active'
    )
  );

create policy cycles_admin_select on public.cycles
  for select to authenticated
  using (public.is_platform_admin());

drop policy if exists entries_anon_all on public.entries;
drop policy if exists entries_admin_select on public.entries;
create policy entries_anon_all on public.entries
  for all to anon
  using (
    exists (
      select 1
      from public.rooms r
      join public.sites s on s.id = r.site_id
      where r.id = room_id and s.status = 'active'
    )
  )
  with check (
    exists (
      select 1
      from public.rooms r
      join public.sites s on s.id = r.site_id
      where r.id = room_id and s.status = 'active'
    )
  );

create policy entries_admin_select on public.entries
  for select to authenticated
  using (public.is_platform_admin());

-- Queue view: invoker RLS so owners still only see their own if they hit it; admins see all.
drop view if exists public.admin_facility_queue;
create view public.admin_facility_queue
  with (security_invoker = true) as
select
  s.id,
  s.name,
  s.location,
  s.status,
  s.created_at,
  s.owner_email,
  s.aroya_key_saved,
  (select count(*)::int from public.rooms r where r.site_id = s.id) as room_count,
  (
    select max(e.created_at)
    from public.entries e
    join public.rooms r on r.id = e.room_id
    where r.site_id = s.id
  ) as last_activity
from public.sites s;

revoke all on public.admin_facility_queue from public, anon, authenticated;
grant select on public.admin_facility_queue to authenticated;
