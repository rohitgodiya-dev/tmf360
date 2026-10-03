-- Part 2b — parties, people and study structure (Domain Model v1, sections 3–4)
--
-- New tables, built alongside the existing ones:
--   role_permissions                     the role → permission matrix as data (mirrors lib/permissions.ts)
--   parties, persons                     organisation and people directory (USR-07, STU-07)
--   study_parties                        an organisation's role in a study
--   study_countries, study_sites         study structure with lifecycle status (STU-02, STU-03)
--   contact_roles, contact_role_types    a person's role at study, country or site level (e.g. PI)
--
-- Every new table:
--   * is tenant-scoped by org_id, set by the database (never trusted from the client)
--   * is readable only within the org (and the study, for study-scoped tables)
--   * is writable only with the required permission
--   * has no delete path (soft delete / deactivation only, DI-06)
--   * writes an audit_trail entry for every insert and update, with before/after
--     values in old_value/new_value (covered by the audit hash chain)
--   * carries row_version for optimistic locking
--
-- Also fixes user_roles.can_delete, which defaulted to true for everyone.

------------------------------------------------------------------------------
-- Audit chain functions: pin search_path
------------------------------------------------------------------------------

-- compute_audit_hash() calls digest() (pgcrypto, in the "extensions" schema) without a
-- schema prefix, so it only worked when the caller's search_path included extensions.
-- Any audited write from a function with a strict search_path failed. Logic unchanged.
alter function compute_audit_hash() set search_path = public, extensions;
alter function verify_audit_chain(uuid) set search_path = public, extensions;

------------------------------------------------------------------------------
-- Helpers
------------------------------------------------------------------------------

create or replace function current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id from user_roles
  where user_id = auth.uid() and is_active = true and org_id is not null
  limit 1;
$$;

create table if not exists role_permissions (
  role text not null,
  permission text not null,
  primary key (role, permission)
);

alter table role_permissions enable row level security;
drop policy if exists "role permissions readable" on role_permissions;
create policy "role permissions readable" on role_permissions for select to authenticated using (true);
revoke insert, update, delete, truncate on role_permissions from anon, authenticated;

-- Seeded from lib/permissions.ts. Changes go through migrations (change control, SIG-04);
-- an integration test fails if the two drift apart.
insert into role_permissions (role, permission)
select r, p from (values
  ('upload_document',    array['System Administrator','Sponsor Admin','TMF Lead','Clinical Trial Manager','Clinical Trial Associate','CRA','Regulatory','Quality Assurance','Site Coordinator','Investigator']),
  ('submit_document',    array['System Administrator','Sponsor Admin','TMF Lead','Clinical Trial Manager','Clinical Trial Associate','CRA','Regulatory','Quality Assurance','Site Coordinator','Investigator']),
  ('review_document',    array['System Administrator','Sponsor Admin','TMF Lead','Clinical Trial Manager','Regulatory','Quality Assurance']),
  ('approve_document',   array['System Administrator','Sponsor Admin','TMF Lead','Regulatory','Quality Assurance']),
  ('reject_document',    array['System Administrator','Sponsor Admin','TMF Lead','Regulatory','Quality Assurance']),
  ('delete_document',    array['System Administrator','Sponsor Admin','TMF Lead']),
  ('view_document',      array['System Administrator','Sponsor Admin','TMF Lead','Clinical Trial Manager','Clinical Trial Associate','CRA','Regulatory','Quality Assurance','Medical Monitor','Site Coordinator','Investigator','Auditor','Inspector']),
  ('create_study',       array['System Administrator','Sponsor Admin','TMF Lead','Clinical Trial Manager']),
  ('edit_study',         array['System Administrator','Sponsor Admin','TMF Lead','Clinical Trial Manager']),
  ('view_study',         array['System Administrator','Sponsor Admin','TMF Lead','Clinical Trial Manager','Clinical Trial Associate','CRA','Regulatory','Quality Assurance','Medical Monitor','Site Coordinator','Investigator','Auditor','Inspector']),
  ('manage_directory',   array['System Administrator','Sponsor Admin','TMF Lead','Clinical Trial Manager']),
  ('invite_users',       array['System Administrator','Sponsor Admin','TMF Lead']),
  ('manage_roles',       array['System Administrator','Sponsor Admin']),
  ('view_audit_trail',   array['System Administrator','Sponsor Admin','TMF Lead','Regulatory','Quality Assurance','Auditor','Inspector']),
  ('run_quality_checks', array['System Administrator','Sponsor Admin','TMF Lead','Quality Assurance']),
  ('view_gap_analysis',  array['System Administrator','Sponsor Admin','TMF Lead','Clinical Trial Manager','CRA','Regulatory','Quality Assurance','Auditor','Inspector']),
  ('export_inspection',  array['System Administrator','Sponsor Admin','TMF Lead','Regulatory','Auditor','Inspector'])
) as m(p, roles), unnest(m.roles) as r
on conflict do nothing;

create or replace function user_has_permission(p_permission text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from user_roles ur
    join role_permissions rp on rp.role = ur.role and rp.permission = p_permission
    where ur.user_id = auth.uid() and ur.is_active = true
  );
$$;

-- Study access by study row id (the new tables reference studies.id).
create or replace function can_access_study_id(p_study_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from studies s
    where s.id = p_study_id
      and s.org_id = current_org_id()
      and can_access_study(auth.uid(), s.study_id, s.org_id)
  );
$$;

------------------------------------------------------------------------------
-- can_delete fix
------------------------------------------------------------------------------

-- No blanket default: a new role gets the delete permission of its role unless set explicitly.
alter table user_roles alter column can_delete drop default;

create or replace function default_can_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.can_delete is null then
    new.can_delete := exists (
      select 1 from role_permissions where role = new.role and permission = 'delete_document'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists user_roles_default_can_delete on user_roles;
create trigger user_roles_default_can_delete
  before insert on user_roles
  for each row execute function default_can_delete();

-- Existing rows all carried the old blanket default; align them with their role.
update user_roles ur
set can_delete = exists (
  select 1 from role_permissions rp where rp.role = ur.role and rp.permission = 'delete_document'
)
where ur.can_delete is distinct from exists (
  select 1 from role_permissions rp where rp.role = ur.role and rp.permission = 'delete_document'
);

------------------------------------------------------------------------------
-- Shared row triggers
------------------------------------------------------------------------------

-- Fills org_id (from the study for study-scoped tables, otherwise the user's org)
-- and created_by; the client never chooses its tenant.
create or replace function structure_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_study_id uuid := (to_jsonb(new) ->> 'study_id')::uuid;
begin
  if v_study_id is not null then
    select org_id into new.org_id from studies where id = v_study_id;
  elsif auth.uid() is not null then
    new.org_id := current_org_id();
  end if; -- with no signed-in user (service role), keep the org the caller set
  if new.org_id is null then
    raise exception 'Cannot determine organisation for % row', tg_table_name;
  end if;
  new.created_by := auth.uid();
  new.created_at := now();
  new.row_version := 1;
  return new;
end;
$$;

-- Maintains updated_*/row_version and blocks changes to identity and tenancy columns.
create or replace function structure_before_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.id is distinct from old.id
     or new.org_id is distinct from old.org_id
     or new.created_at is distinct from old.created_at
     or new.created_by is distinct from old.created_by
     or (to_jsonb(new) ->> 'study_id') is distinct from (to_jsonb(old) ->> 'study_id') then
    raise exception 'id, org_id, study_id and created_* cannot be changed on %', tg_table_name;
  end if;
  new.updated_at := now();
  new.updated_by := auth.uid();
  new.row_version := old.row_version + 1;
  return new;
end;
$$;

-- Writes one audit_trail row per insert/update with the changed values (REG-01).
create or replace function structure_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new jsonb := to_jsonb(new);
  v_old jsonb := case when tg_op = 'UPDATE' then to_jsonb(old) else '{}'::jsonb end;
  v_skip text[] := array['updated_at', 'updated_by', 'row_version', 'change_reason', 'created_at', 'created_by'];
  v_before jsonb := '{}'::jsonb;
  v_after jsonb := '{}'::jsonb;
  v_key text;
  v_study_code text;
begin
  for v_key in select jsonb_object_keys(v_new) loop
    if v_key <> all (v_skip)
       and (v_new -> v_key) is distinct from (v_old -> v_key)
       and not (tg_op = 'INSERT' and jsonb_typeof(v_new -> v_key) = 'null') then
      if tg_op = 'UPDATE' then
        v_before := v_before || jsonb_build_object(v_key, v_old -> v_key);
      end if;
      v_after := v_after || jsonb_build_object(v_key, v_new -> v_key);
    end if;
  end loop;

  if tg_op = 'UPDATE' and v_after = '{}'::jsonb then
    return new; -- nothing meaningful changed
  end if;

  if v_new ? 'study_id' then
    select study_id into v_study_code from studies where id = (v_new ->> 'study_id')::uuid;
  end if;

  insert into audit_trail (user_id, user_email, org_id, action, study_id,
                           field_changed, old_value, new_value, signature_reason)
  values (
    auth.uid(),
    coalesce(auth.jwt() ->> 'email', 'system'),
    new.org_id,
    tg_table_name || '.' || lower(tg_op),
    v_study_code,
    tg_table_name || ':' || new.id,
    case when tg_op = 'UPDATE' then v_before::text end,
    v_after::text,
    v_new ->> 'change_reason'
  );
  return new;
end;
$$;

------------------------------------------------------------------------------
-- Tables
------------------------------------------------------------------------------

create table if not exists parties (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  party_type text not null check (party_type in ('sponsor', 'cro', 'site', 'vendor', 'regulator', 'other')),
  name text not null check (length(trim(name)) > 0),
  parent_party_id uuid references parties(id),
  country_code text check (country_code ~ '^[A-Z]{2}$'),
  is_internal boolean not null default false,
  -- The organisation in this system this party represents (e.g. a Site360 site org); used in Part 10.
  linked_org_id uuid references organizations(id),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz,
  updated_by uuid,
  row_version integer not null default 1,
  change_reason text
);
create unique index if not exists parties_unique_name on parties (org_id, party_type, lower(name));

create table if not exists persons (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  given_name text not null check (length(trim(given_name)) > 0),
  family_name text not null check (length(trim(family_name)) > 0),
  email text check (email is null or email ~ '^[^@\s]+@[^@\s]+$'),
  primary_party_id uuid references parties(id),
  professional_ids jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz,
  updated_by uuid,
  row_version integer not null default 1,
  change_reason text
);
create unique index if not exists persons_unique_email on persons (org_id, lower(email)) where email is not null;

create table if not exists study_parties (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  study_id uuid not null references studies(id),
  party_id uuid not null references parties(id),
  role text not null check (role in ('sponsor', 'cro', 'vendor', 'central_lab', 'other')),
  valid_from date,
  valid_to date,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz,
  updated_by uuid,
  row_version integer not null default 1,
  change_reason text,
  check (valid_to is null or valid_from is null or valid_to >= valid_from)
);
create unique index if not exists study_parties_unique on study_parties (study_id, party_id, role);

create table if not exists study_countries (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  study_id uuid not null references studies(id),
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  status text not null default 'startup' check (status in ('startup', 'ongoing', 'closed')),
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz,
  updated_by uuid,
  row_version integer not null default 1,
  change_reason text,
  unique (study_id, country_code),
  unique (id, study_id)
);

create table if not exists study_sites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  study_id uuid not null references studies(id),
  study_country_id uuid not null,
  site_number text not null check (length(trim(site_number)) > 0),
  site_party_id uuid not null references parties(id),
  display_name text not null check (length(trim(display_name)) > 0),
  status text not null default 'identified'
    check (status in ('identified', 'selected', 'qualified', 'ongoing', 'closed', 'deactivated')),
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz,
  updated_by uuid,
  row_version integer not null default 1,
  change_reason text,
  unique (study_id, site_number),
  unique (id, study_id),
  -- The country must belong to the same study.
  foreign key (study_country_id, study_id) references study_countries (id, study_id)
);

create table if not exists contact_role_types (
  code text primary key,
  label text not null,
  status text not null default 'active' check (status in ('active', 'retired'))
);
alter table contact_role_types enable row level security;
drop policy if exists "contact role types readable" on contact_role_types;
create policy "contact role types readable" on contact_role_types for select to authenticated using (true);
revoke insert, update, delete, truncate on contact_role_types from anon, authenticated;
insert into contact_role_types (code, label) values
  ('PI', 'Principal Investigator'),
  ('SUB_I', 'Sub-Investigator'),
  ('STUDY_COORDINATOR', 'Study Coordinator'),
  ('CRA', 'Clinical Research Associate'),
  ('PHARMACIST', 'Pharmacist'),
  ('STUDY_NURSE', 'Study Nurse'),
  ('REGULATORY_CONTACT', 'Regulatory Contact'),
  ('OTHER', 'Other')
on conflict (code) do nothing;

create table if not exists contact_roles (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  study_id uuid not null references studies(id),
  person_id uuid not null references persons(id),
  scope_type text not null check (scope_type in ('study', 'country', 'site')),
  scope_id uuid not null,
  role_code text not null references contact_role_types(code),
  start_date date not null default current_date,
  end_date date,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz,
  updated_by uuid,
  row_version integer not null default 1,
  change_reason text,
  check (end_date is null or end_date >= start_date)
);
create index if not exists contact_roles_scope on contact_roles (scope_type, scope_id);

-- The scope must be this study, or a country/site of this study.
create or replace function contact_role_scope_check()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (
    (new.scope_type = 'study' and new.scope_id = new.study_id)
    or (new.scope_type = 'country' and exists (select 1 from study_countries c where c.id = new.scope_id and c.study_id = new.study_id))
    or (new.scope_type = 'site' and exists (select 1 from study_sites s where s.id = new.scope_id and s.study_id = new.study_id))
  ) then
    raise exception 'Contact scope % % does not belong to study %', new.scope_type, new.scope_id, new.study_id;
  end if;
  if not exists (select 1 from persons p where p.id = new.person_id and p.org_id = new.org_id) then
    raise exception 'Person % is not in this organisation', new.person_id;
  end if;
  return new;
end;
$$;

-- Directory references must stay inside the organisation.
create or replace function same_org_party_check()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_party uuid := coalesce((to_jsonb(new) ->> 'site_party_id')::uuid,
                           (to_jsonb(new) ->> 'party_id')::uuid,
                           (to_jsonb(new) ->> 'primary_party_id')::uuid,
                           (to_jsonb(new) ->> 'parent_party_id')::uuid);
begin
  if v_party is not null and not exists (select 1 from parties p where p.id = v_party and p.org_id = new.org_id) then
    raise exception 'Party % is not in this organisation', v_party;
  end if;
  return new;
end;
$$;

------------------------------------------------------------------------------
-- Triggers, RLS and grants for each table
------------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['parties', 'persons', 'study_parties', 'study_countries', 'study_sites', 'contact_roles'] loop
    execute format('drop trigger if exists %1$s_before_insert on %1$I', t);
    execute format('create trigger %1$s_before_insert before insert on %1$I for each row execute function structure_before_insert()', t);
    execute format('drop trigger if exists %1$s_before_update on %1$I', t);
    execute format('create trigger %1$s_before_update before update on %1$I for each row execute function structure_before_update()', t);
    execute format('drop trigger if exists %1$s_audit on %1$I', t);
    execute format('create trigger %1$s_audit after insert or update on %1$I for each row execute function structure_audit()', t);
    execute format('alter table %I enable row level security', t);
    execute format('revoke delete, truncate on %I from anon, authenticated', t);
    execute format('revoke all on %I from anon', t);
  end loop;

  foreach t in array array['parties', 'persons', 'study_parties', 'study_sites'] loop
    execute format('drop trigger if exists %1$s_same_org on %1$I', t);
    execute format('create trigger %1$s_same_org before insert or update on %1$I for each row execute function same_org_party_check()', t);
  end loop;
end $$;

-- The org check must run after org_id is filled in: trigger names sort alphabetically
-- ("before_insert" < "same_org"), and the scope check runs last for the same reason.
drop trigger if exists contact_roles_scope on contact_roles;
create trigger contact_roles_scope before insert or update on contact_roles
  for each row execute function contact_role_scope_check();

-- Directory: whole organisation can read; manage_directory can write.
drop policy if exists "parties read" on parties;
create policy "parties read" on parties for select to authenticated using (org_id = current_org_id());
drop policy if exists "parties write" on parties;
create policy "parties write" on parties for insert to authenticated with check (user_has_permission('manage_directory'));
drop policy if exists "parties update" on parties;
create policy "parties update" on parties for update to authenticated
  using (org_id = current_org_id() and user_has_permission('manage_directory'))
  with check (org_id = current_org_id());

drop policy if exists "persons read" on persons;
create policy "persons read" on persons for select to authenticated using (org_id = current_org_id());
drop policy if exists "persons write" on persons;
create policy "persons write" on persons for insert to authenticated with check (user_has_permission('manage_directory'));
drop policy if exists "persons update" on persons;
create policy "persons update" on persons for update to authenticated
  using (org_id = current_org_id() and user_has_permission('manage_directory'))
  with check (org_id = current_org_id());

-- Study structure: anyone with access to the study can read; edit_study can write.
do $$
declare
  t text;
begin
  foreach t in array array['study_parties', 'study_countries', 'study_sites', 'contact_roles'] loop
    execute format('drop policy if exists "%1$s read" on %1$I', t);
    execute format('create policy "%1$s read" on %1$I for select to authenticated using (can_access_study_id(study_id))', t);
    execute format('drop policy if exists "%1$s write" on %1$I', t);
    execute format('create policy "%1$s write" on %1$I for insert to authenticated with check (can_access_study_id(study_id) and user_has_permission(''edit_study''))', t);
    execute format('drop policy if exists "%1$s update" on %1$I', t);
    execute format('create policy "%1$s update" on %1$I for update to authenticated using (can_access_study_id(study_id) and user_has_permission(''edit_study'')) with check (can_access_study_id(study_id))', t);
  end loop;
end $$;
