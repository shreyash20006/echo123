-- Echo.TGPCOP recruitment schema. Paste this file into Supabase SQL Editor.
-- Public submissions go through the submit-team-application Edge Function.

create table if not exists public.echo_team_applications (
  id uuid primary key default gen_random_uuid(),
  applicant_user_id uuid references auth.users(id) on delete set null,
  full_name text not null check (char_length(full_name) between 2 and 120),
  email text not null check (char_length(email) <= 254 and position('@' in email) > 1),
  phone text not null check (char_length(phone) between 7 and 25),
  college text not null check (char_length(college) between 2 and 180),
  course text,
  academic_year text,
  instagram text not null check (char_length(instagram) <= 500),
  profile_photo_path text,
  departments text[] not null check (cardinality(departments) > 0),
  other_department text,
  skills text[] not null default '{}',
  experience_level text check (experience_level is null or experience_level in ('Beginner','Intermediate','Advanced','Professional')),
  worked_projects text check (worked_projects is null or worked_projects in ('Yes','No')),
  previous_experience text,
  previous_organisation text,
  software_tools text[] not null default '{}',
  portfolio_links jsonb not null default '{}'::jsonb check (jsonb_typeof(portfolio_links) = 'object'),
  weekly_availability text check (weekly_availability is null or weekly_availability in ('1–3 hours','3–5 hours','5–8 hours','8+ hours')),
  event_availability text check (event_availability is null or event_availability in ('Yes','No','Depends')),
  smartphone_available text check (smartphone_available is null or smartphone_available in ('Yes','No')),
  team_comfort text check (team_comfort is null or team_comfort in ('Yes','No','Need to learn')),
  preferred_role text check (preferred_role is null or preferred_role in ('Creative','Production','Management','Both','Open to any role')),
  motivation text,
  suitability text,
  ideas text,
  learning_goals text,
  declaration_accepted boolean not null check (declaration_accepted),
  declaration_accurate boolean not null check (declaration_accurate),
  declaration_selection boolean not null check (declaration_selection),
  declaration_contact boolean not null check (declaration_contact),
  declaration_work_permission boolean not null check (declaration_work_permission),
  status text not null default 'pending' check (status in ('pending','under_review','shortlisted','selected','rejected')),
  admin_notes text not null default '',
  created_at timestamptz not null default now()
);

alter table public.echo_team_applications
  add column if not exists applicant_user_id uuid references auth.users(id) on delete set null;

-- Safe to run after the earlier longer form schema too.
alter table public.echo_team_applications alter column motivation drop not null;
alter table public.echo_team_applications alter column suitability drop not null;
alter table public.echo_team_applications drop constraint if exists echo_team_applications_motivation_check;
alter table public.echo_team_applications drop constraint if exists echo_team_applications_suitability_check;

create unique index if not exists echo_team_applications_email_uq on public.echo_team_applications (lower(email));
create unique index if not exists echo_team_applications_user_uq on public.echo_team_applications (applicant_user_id) where applicant_user_id is not null;
create index if not exists echo_team_applications_created_idx on public.echo_team_applications (created_at desc);
create index if not exists echo_team_applications_departments_idx on public.echo_team_applications using gin (departments);

alter table public.echo_team_applications enable row level security;
revoke all on public.echo_team_applications from anon, authenticated;
grant insert, select on public.echo_team_applications to service_role;
grant select, update on public.echo_team_applications to authenticated;
drop policy if exists "Echo admins read applications" on public.echo_team_applications;
create policy "Echo admins read applications" on public.echo_team_applications
  for select to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'echo_admin');
drop policy if exists "Echo admins update applications" on public.echo_team_applications;
create policy "Echo admins update applications" on public.echo_team_applications
  for update to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'echo_admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'echo_admin');

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table if not exists private.team_application_attempts (
  ip_hash text not null,
  attempted_at timestamptz not null default now()
);
revoke all on private.team_application_attempts from public, anon, authenticated;

create or replace function public.consume_team_application_rate_limit(p_ip_hash text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  recent_count integer;
begin
  if p_ip_hash is null or p_ip_hash !~ '^[a-f0-9]{64}$' then return false; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_ip_hash, 0));
  select count(*) into recent_count
    from private.team_application_attempts
    where ip_hash = p_ip_hash and attempted_at > now() - interval '1 hour';
  if recent_count >= 5 then return false; end if;
  insert into private.team_application_attempts(ip_hash) values (p_ip_hash);
  return true;
end;
$$;
revoke all on function public.consume_team_application_rate_limit(text) from public, anon, authenticated;
grant execute on function public.consume_team_application_rate_limit(text) to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('team-applications', 'team-applications', false, 3145728, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = 3145728,
  allowed_mime_types = array['image/jpeg','image/png','image/webp'];
drop policy if exists "Echo admins view applicant photos" on storage.objects;
create policy "Echo admins view applicant photos" on storage.objects
  for select to authenticated
  using (bucket_id = 'team-applications' and (select auth.jwt() -> 'app_metadata' ->> 'role') = 'echo_admin');
