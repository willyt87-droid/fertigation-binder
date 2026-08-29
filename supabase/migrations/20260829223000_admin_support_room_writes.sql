-- Support view: operator may edit owner room config. Collections stay SELECT-only.

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
