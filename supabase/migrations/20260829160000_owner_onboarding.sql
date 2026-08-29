-- Owner onboarding, floor PIN hash, facility targets.
-- Apply after 20260829143600_init.sql on an empty project. Do not run against a live pilot.

alter table public.sites
  add column if not exists owner_id uuid references auth.users (id) on delete cascade,
  add column if not exists pin_hash text,
  add column if not exists targets jsonb not null default '{}'::jsonb,
  add column if not exists aroya_facility_id text;

alter table public.rooms
  add column if not exists aroya_room_id text;

create index if not exists sites_owner_id_idx on public.sites (owner_id);

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
  );
$$;

revoke all on function public.check_floor_pin(text, text) from public;
grant execute on function public.check_floor_pin(text, text) to anon, authenticated;

drop policy if exists sites_anon_all on public.sites;
drop policy if exists rooms_anon_all on public.rooms;
drop policy if exists cycles_anon_all on public.cycles;
drop policy if exists entries_anon_all on public.entries;

revoke all on table public.sites from anon, authenticated;
revoke all on table public.rooms from anon, authenticated;
revoke all on table public.cycles from anon, authenticated;
revoke all on table public.entries from anon, authenticated;

-- Floor (anon): read facility cards without pin_hash; log entries/cycles.
grant select (id, name, location, targets, aroya_facility_id) on table public.sites to anon;
grant select on table public.rooms to anon;
grant select, insert, update, delete on table public.cycles to anon;
grant select, insert, update, delete on table public.entries to anon;

-- Owners: full row access on their facilities (pin_hash included for writes).
grant select, insert, update, delete on table public.sites to authenticated;
grant select, insert, update, delete on table public.rooms to authenticated;
grant select, insert, update, delete on table public.cycles to authenticated;
grant select, insert, update, delete on table public.entries to authenticated;

create policy sites_anon_select on public.sites
  for select to anon
  using (true);

create policy sites_owner_all on public.sites
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy rooms_anon_select on public.rooms
  for select to anon
  using (true);

create policy rooms_owner_all on public.rooms
  for all to authenticated
  using (exists (select 1 from public.sites s where s.id = site_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.sites s where s.id = site_id and s.owner_id = auth.uid()));

create policy cycles_anon_all on public.cycles
  for all to anon
  using (true)
  with check (true);

create policy cycles_owner_all on public.cycles
  for all to authenticated
  using (
    exists (
      select 1
      from public.rooms r
      join public.sites s on s.id = r.site_id
      where r.id = room_id and s.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.rooms r
      join public.sites s on s.id = r.site_id
      where r.id = room_id and s.owner_id = auth.uid()
    )
  );

create policy entries_anon_all on public.entries
  for all to anon
  using (true)
  with check (true);

create policy entries_owner_all on public.entries
  for all to authenticated
  using (
    exists (
      select 1
      from public.rooms r
      join public.sites s on s.id = r.site_id
      where r.id = room_id and s.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.rooms r
      join public.sites s on s.id = r.site_id
      where r.id = room_id and s.owner_id = auth.uid()
    )
  );
