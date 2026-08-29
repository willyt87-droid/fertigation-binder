-- Public Ask / House quote queue for the independent product project only.
-- Do not apply to the Ravena pilot.

create table if not exists public.contact_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  facility text not null default '',
  email text not null,
  message text not null,
  reason text not null,
  constraint contact_requests_reason_check check (reason in ('question', 'house_quote')),
  constraint contact_requests_name_len check (char_length(btrim(name)) between 1 and 120),
  constraint contact_requests_facility_len check (char_length(facility) <= 160),
  constraint contact_requests_email_check check (position('@' in email) > 1),
  constraint contact_requests_message_len check (char_length(btrim(message)) between 1 and 4000)
);

create index if not exists contact_requests_created_at_idx
  on public.contact_requests (created_at desc);

alter table public.contact_requests enable row level security;

drop policy if exists contact_requests_anon_insert on public.contact_requests;
create policy contact_requests_anon_insert on public.contact_requests
  for insert to anon, authenticated
  with check (true);

drop policy if exists contact_requests_admin_select on public.contact_requests;
create policy contact_requests_admin_select on public.contact_requests
  for select to authenticated
  using (public.is_platform_admin());

revoke all on table public.contact_requests from public, anon, authenticated;
grant insert on table public.contact_requests to anon, authenticated;
grant select on table public.contact_requests to authenticated;
