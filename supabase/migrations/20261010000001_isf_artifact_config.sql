-- Site360 ISF Configuration: a real per-site, per-study artifact settings table.
--
-- The ISF Configuration panel read and wrote zone/artifact settings (type, zone_num,
-- artifact_num, is_enabled, disabled_reason, ...) to isf_config, but isf_config is the
-- per-site ISF details table (isf_name, pi_name, irb_number, ...) and has none of those
-- columns. Seeding, enabling, disabling and custom artifacts all failed silently, and
-- "Reset to default" deleted from isf_config by site and study, which would have removed
-- the site's ISF details. Settings now live in isf_artifact_config (mirrors tmf_config);
-- isf_config keeps the site details.

create table if not exists isf_artifact_config (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  site_id uuid not null references sites(id) on delete cascade,
  study_id uuid not null references studies(id) on delete cascade,
  type text not null check (type in ('zone', 'artifact', 'sub_artifact')),
  zone_num text not null,
  zone_name text,
  section_num text,
  artifact_num text,
  artifact_name text,
  parent_artifact_num text,
  classification text,
  is_enabled boolean not null default true,
  is_locked boolean not null default false,
  is_custom boolean not null default false,
  disabled_reason text,
  disabled_by text,
  disabled_at timestamptz,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (type = 'zone' or artifact_num is not null)
);

-- One row per zone / artifact per site and study.
create unique index if not exists isf_artifact_config_unique
  on isf_artifact_config (site_id, study_id, type, zone_num, coalesce(artifact_num, ''));
create index if not exists isf_artifact_config_site_study on isf_artifact_config (site_id, study_id);

alter table isf_artifact_config enable row level security;

-- Anyone who can work on the study at this site can read its settings.
drop policy if exists "site study members read isf config" on isf_artifact_config;
create policy "site study members read isf config" on isf_artifact_config for select
  using (site360_can_access_study(org_id, study_id));

-- Only site administrators change them (the panel's isAdmin roles; user_roles stores a PI as 'Investigator').
create or replace function isf_config_admin(p_org_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from user_roles
    where user_id = auth.uid() and org_id = p_org_id and is_active
      and role in ('System Administrator', 'Site Coordinator', 'Investigator', 'PI')
  )
$$;

drop policy if exists "site admins add isf config" on isf_artifact_config;
create policy "site admins add isf config" on isf_artifact_config for insert
  with check (isf_config_admin(org_id) and site360_can_access_study(org_id, study_id));
drop policy if exists "site admins change isf config" on isf_artifact_config;
create policy "site admins change isf config" on isf_artifact_config for update
  using (isf_config_admin(org_id)) with check (isf_config_admin(org_id));
drop policy if exists "site admins remove isf config" on isf_artifact_config;
create policy "site admins remove isf config" on isf_artifact_config for delete
  using (isf_config_admin(org_id));

-- Server timestamps and actors (Pillar 6).
create or replace function isf_artifact_config_server_stamps() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_email text := jwt_email();
  v_ins boolean := tg_op = 'INSERT';
begin
  if v_uid is null then return new; end if;

  if v_ins then
    new.created_at := now();
    new.created_by := coalesce(v_email, new.created_by);
  else
    new.created_at := old.created_at;
    new.created_by := old.created_by;
    -- Keys can't be repointed; disable the row and add a new one instead.
    new.org_id := old.org_id; new.site_id := old.site_id; new.study_id := old.study_id;
  end if;
  new.updated_at := now();
  if new.disabled_at is not null and (v_ins or new.disabled_at is distinct from old.disabled_at) then
    new.disabled_at := now();
    new.disabled_by := coalesce(v_email, new.disabled_by);
  end if;
  return new;
end;
$$;

drop trigger if exists isf_artifact_config_server_stamps on isf_artifact_config;
create trigger isf_artifact_config_server_stamps before insert or update on isf_artifact_config
  for each row execute function isf_artifact_config_server_stamps();
