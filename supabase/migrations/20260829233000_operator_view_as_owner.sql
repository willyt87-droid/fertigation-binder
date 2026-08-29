-- Operator may open a facility owner dashboard for support (same screens as the owner).
-- Admin already SELECTs sites, rooms, cycles, and entries. Room writes match owner settings.
-- Do not grant entry/cycle writes — that is the floor PIN path, not view-as-owner.
-- Apply only to the independent product project. Do not run against a live pilot.

drop policy if exists rooms_admin_insert on public.rooms;
create policy rooms_admin_insert on public.rooms
  for insert to authenticated
  with check (public.is_platform_admin());

drop policy if exists rooms_admin_update on public.rooms;
create policy rooms_admin_update on public.rooms
  for update to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists rooms_admin_delete on public.rooms;
create policy rooms_admin_delete on public.rooms
  for delete to authenticated
  using (public.is_platform_admin());
