-- Part 8a — eTMF plan, placeholders (expected artifacts) and completeness. Baseline M08 PLC-01..07.
--
-- * plan_template_items: the organisation's eTMF plan — which artifacts are expected, at which
--   level, how many, and which milestone triggers them (PLC-01).
-- * placeholders: one expected document each. Generated from the plan when a milestone is
--   achieved (or when the plan is applied to a study), or added by hand (PLC-02/03).
-- * A placeholder is fulfilled automatically by a live document with the same artifact at the same
--   study/country/site (PLC-05); deleting or reclassifying the document opens it again. Manual
--   link/unlink is possible with a reason.
-- * navigator_items gains placeholder rows: Expected until the due date passes, then Missing
--   (PLC-04). Documents without a file are Incomplete. Studies with no placeholders keep the
--   Part 6 behaviour (every enabled artifact without a document is Missing).
-- * Completeness = Final ÷ all rows, computed by the API from the same filtered counts (PLC-06).
-- * The legacy expected_documents table (0 rows, unused) loses its open "using (true)" policy.

------------------------------------------------------------------------------
-- 0. Legacy table: no access
------------------------------------------------------------------------------
drop policy if exists "org members can manage expected documents" on expected_documents;
revoke all on expected_documents from anon, authenticated;

------------------------------------------------------------------------------
-- 1. eTMF plan template
------------------------------------------------------------------------------
create table if not exists plan_template_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  artifact_num text not null check (artifact_num ~ '^\d{2}\.\d{2}\.\d{2}$'),
  level text not null check (level in ('study', 'country', 'site')),
  quantity integer not null default 1 check (quantity between 1 and 50),
  trigger_milestone text references milestone_types(code),   -- null: created when the plan is applied
  due_offset_days integer not null default 30 check (due_offset_days between 0 and 3650),
  instructions text,
  responsible_org text,
  responsible_dept text,
  is_active boolean not null default true,
  change_reason text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_by uuid,
  updated_at timestamptz,
  row_version integer not null default 1
);
create unique index if not exists plan_template_items_unique
  on plan_template_items (org_id, artifact_num, level, coalesce(trigger_milestone, '')) where is_active;

create or replace function plan_template_items_check() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.trigger_milestone is not null and not exists (
       select 1 from milestone_types where code = new.trigger_milestone and applies_to = new.level) then
    raise exception 'Milestone % does not apply at % level', new.trigger_milestone, new.level;
  end if;
  return new;
end;
$$;
drop trigger if exists plan_template_items_a_check on plan_template_items;
create trigger plan_template_items_a_check before insert or update on plan_template_items
  for each row execute function plan_template_items_check();

alter table plan_template_items enable row level security;
drop policy if exists "org members read" on plan_template_items;
drop policy if exists "quality leads add" on plan_template_items;
drop policy if exists "quality leads change" on plan_template_items;
create policy "org members read" on plan_template_items for select
  using (org_id in (select org_id from user_roles where user_id = auth.uid() and is_active));
create policy "quality leads add" on plan_template_items for insert
  with check (has_org_permission(org_id, 'run_quality_checks'));
create policy "quality leads change" on plan_template_items for update
  using (has_org_permission(org_id, 'run_quality_checks')) with check (has_org_permission(org_id, 'run_quality_checks'));
drop trigger if exists plan_template_items_before_insert on plan_template_items;
create trigger plan_template_items_before_insert before insert on plan_template_items
  for each row execute function config_before_insert();
drop trigger if exists plan_template_items_before_update on plan_template_items;
create trigger plan_template_items_before_update before update on plan_template_items
  for each row execute function structure_before_update();
drop trigger if exists plan_template_items_audit on plan_template_items;
create trigger plan_template_items_audit after insert or update on plan_template_items
  for each row execute function structure_audit();

------------------------------------------------------------------------------
-- 2. Placeholders
------------------------------------------------------------------------------
create table if not exists placeholders (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  study_id uuid not null references studies(id),
  artifact_num text not null,
  artifact_name text,
  level text not null check (level in ('study', 'country', 'site')),
  study_country_id uuid references study_countries(id),
  study_site_id uuid references study_sites(id),
  title text,
  instructions text,
  responsible_org text,
  responsible_dept text,
  due_date date,
  status text not null default 'open' check (status in ('open', 'fulfilled', 'cancelled')),
  document_id uuid references documents(id),
  source text not null default 'manual' check (source in ('manual', 'plan')),
  template_item_id uuid references plan_template_items(id),
  milestone_id uuid references milestones(id),
  cancel_reason text,
  change_reason text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_by uuid,
  updated_at timestamptz,
  row_version integer not null default 1,
  check ((status = 'fulfilled') = (document_id is not null)),
  check (status <> 'cancelled' or length(trim(coalesce(cancel_reason, ''))) > 0),
  check ((level = 'study' and study_country_id is null and study_site_id is null)
      or (level = 'country' and study_country_id is not null and study_site_id is null)
      or (level = 'site' and study_site_id is not null))
);
create index if not exists placeholders_study on placeholders (study_id, status, artifact_num);
create unique index if not exists placeholders_one_per_document on placeholders (document_id) where status = 'fulfilled';

-- Level, artifact and scope checks; users may edit the descriptive fields, cancel with a reason,
-- and nothing else — fulfilment is done by match_placeholders()/link_placeholder().
create or replace function placeholders_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_code text;
  v_matching boolean := coalesce(current_setting('app.placeholder_match', true), '') = 'on';
begin
  if tg_op = 'INSERT' or (new.study_country_id, new.study_site_id, new.artifact_num) is distinct from (old.study_country_id, old.study_site_id, old.artifact_num) then
    if tg_op = 'UPDATE' and auth.uid() is not null then
      raise exception 'A placeholder''s artifact and level cannot be changed; cancel it and add a new one';
    end if;
    new.study_country_id := study_scope_country(new.study_id, new.study_country_id, new.study_site_id);
    select study_id into v_code from studies where id = new.study_id;
    select artifact_name into new.artifact_name from tmf_config
      where study_id = v_code and type = 'artifact' and artifact_num = new.artifact_num and is_enabled limit 1;
    if new.artifact_name is null then
      raise exception 'Artifact % is not enabled for this study', new.artifact_num;
    end if;
  end if;
  if tg_op = 'INSERT' then
    if auth.uid() is not null and not v_matching then
      new.status := 'open'; new.document_id := null; new.source := 'manual'; new.template_item_id := null; new.milestone_id := null;
    end if;
    return new;
  end if;
  if auth.uid() is not null and not v_matching then
    if old.status <> 'open' then
      raise exception 'This placeholder is already %', old.status;
    end if;
    if new.status = 'fulfilled' or new.document_id is distinct from old.document_id then
      raise exception 'Placeholders are fulfilled by filing a matching document, or with Link document';
    end if;
    if (new.source, new.template_item_id, new.milestone_id) is distinct from (old.source, old.template_item_id, old.milestone_id) then
      raise exception 'The origin of a placeholder cannot be changed';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists placeholders_a_guard on placeholders;
create trigger placeholders_a_guard before insert or update on placeholders
  for each row execute function placeholders_guard();
drop trigger if exists placeholders_before_insert on placeholders;
create trigger placeholders_before_insert before insert on placeholders
  for each row execute function structure_before_insert();
drop trigger if exists placeholders_before_update on placeholders;
create trigger placeholders_before_update before update on placeholders
  for each row execute function structure_before_update();
drop trigger if exists placeholders_audit on placeholders;
create trigger placeholders_audit after insert or update on placeholders
  for each row execute function structure_audit();

alter table placeholders enable row level security;
drop policy if exists "study members read placeholders" on placeholders;
drop policy if exists "study editors add placeholders" on placeholders;
drop policy if exists "study editors change placeholders" on placeholders;
create policy "study members read placeholders" on placeholders for select
  using (org_id in (select org_id from user_roles where user_id = auth.uid() and is_active) and can_access_study_id(study_id));
create policy "study editors add placeholders" on placeholders for insert
  with check (has_org_permission(org_id, 'edit_study') and can_access_study_id(study_id));
create policy "study editors change placeholders" on placeholders for update
  using (has_org_permission(org_id, 'edit_study') and can_access_study_id(study_id))
  with check (has_org_permission(org_id, 'edit_study') and can_access_study_id(study_id));

------------------------------------------------------------------------------
-- 3. Fulfilment (PLC-05)
------------------------------------------------------------------------------

-- Re-evaluates one document: releases any placeholder it no longer matches (deleted, archived,
-- reclassified, moved level) and fulfils the oldest open matching placeholder if it fulfils none.
create or replace function match_placeholders(p_document uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  d documents;
  v_study uuid;
  v_live boolean;
  v_target uuid;
begin
  select * into d from documents where id = p_document;
  if not found then return; end if;
  select id into v_study from studies where org_id = d.org_id and study_id = d.study_id order by created_at limit 1;
  v_live := d.deleted_at is null and d.archived_at is null and d.status is distinct from 'Archived' and v_study is not null;
  perform set_config('app.placeholder_match', 'on', true);

  -- Release a placeholder this document no longer satisfies.
  update placeholders p set status = 'open', document_id = null, change_reason = 'Document no longer matches'
    where p.document_id = d.id and p.status = 'fulfilled'
      and not (v_live and p.study_id = v_study and p.artifact_num = d.artifact_num
               and p.study_site_id is not distinct from d.study_site_id
               and (p.level <> 'country' or p.study_country_id = d.study_country_id)
               and (p.level = 'site' or d.study_site_id is null)
               and (p.level <> 'study' or d.study_country_id is null));

  if v_live and not exists (select 1 from placeholders where document_id = d.id and status = 'fulfilled') then
    select p.id into v_target from placeholders p
      where p.study_id = v_study and p.status = 'open' and p.artifact_num = d.artifact_num
        and ((p.level = 'site' and p.study_site_id = d.study_site_id)
          or (p.level = 'country' and d.study_site_id is null and p.study_country_id = d.study_country_id)
          or (p.level = 'study' and d.study_site_id is null and d.study_country_id is null))
      order by p.due_date nulls last, p.created_at
      limit 1 for update skip locked;
    if v_target is not null then
      update placeholders set status = 'fulfilled', document_id = d.id, change_reason = 'Matched by artifact and level'
        where id = v_target;
    end if;
  end if;
  perform set_config('app.placeholder_match', 'off', true);
end;
$$;
revoke all on function match_placeholders(uuid) from public, anon, authenticated;

create or replace function documents_match_placeholders() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT'
     or (new.artifact_num, new.study_country_id, new.study_site_id, new.deleted_at, new.archived_at, new.status)
        is distinct from (old.artifact_num, old.study_country_id, old.study_site_id, old.deleted_at, old.archived_at, old.status) then
    perform match_placeholders(new.id);
  end if;
  return new;
end;
$$;
drop trigger if exists documents_match_placeholders on documents;
create trigger documents_match_placeholders after insert or update on documents
  for each row execute function documents_match_placeholders();

-- A new placeholder takes an already-filed document that matches and fulfils nothing yet.
create or replace function placeholders_match_existing() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_code text;
  v_doc uuid;
begin
  if new.status <> 'open' then return new; end if;
  select study_id into v_code from studies where id = new.study_id;
  select d.id into v_doc from documents d
    where d.org_id = new.org_id and d.study_id = v_code and d.artifact_num = new.artifact_num
      and d.deleted_at is null and d.archived_at is null and d.status is distinct from 'Archived'
      and ((new.level = 'site' and d.study_site_id = new.study_site_id)
        or (new.level = 'country' and d.study_site_id is null and d.study_country_id = new.study_country_id)
        or (new.level = 'study' and d.study_site_id is null and d.study_country_id is null))
      and not exists (select 1 from placeholders p where p.document_id = d.id and p.status = 'fulfilled')
    order by d.created_at limit 1;
  if v_doc is not null then
    perform set_config('app.placeholder_match', 'on', true);
    update placeholders set status = 'fulfilled', document_id = v_doc, change_reason = 'Matched by artifact and level' where id = new.id;
    perform set_config('app.placeholder_match', 'off', true);
  end if;
  return new;
end;
$$;
drop trigger if exists placeholders_match_existing on placeholders;
create trigger placeholders_match_existing after insert on placeholders
  for each row execute function placeholders_match_existing();

-- Manual override (PLC-05 "Manage Expected Artifact"): link a document to a placeholder, or
-- unlink it (p_document null). The document must be live, in the same study, same artifact.
create or replace function link_placeholder(p_placeholder uuid, p_document uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare
  p placeholders;
  d documents;
  v_code text;
begin
  select * into p from placeholders where id = p_placeholder for update;
  if not found or not can_access_study_id(p.study_id) then raise exception 'Not found' using errcode = '42501'; end if;
  if not has_org_permission(p.org_id, 'edit_study') then
    raise exception 'Your role does not allow managing expected artifacts' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_reason, ''))) < 3 then raise exception 'Give a reason'; end if;
  if p.status = 'cancelled' then raise exception 'This placeholder is cancelled'; end if;
  perform set_config('app.placeholder_match', 'on', true);
  if p_document is null then
    update placeholders set status = 'open', document_id = null, change_reason = trim(p_reason) where id = p.id;
  else
    select study_id into v_code from studies where id = p.study_id;
    select * into d from documents where id = p_document;
    if not found or d.org_id <> p.org_id or d.study_id <> v_code or d.deleted_at is not null then
      raise exception 'Choose a live document from this study';
    end if;
    if d.artifact_num <> p.artifact_num then
      raise exception 'The document is filed as %, not %', d.artifact_num, p.artifact_num;
    end if;
    update placeholders set status = 'open', document_id = null, change_reason = 'Re-linked: ' || trim(p_reason)
      where document_id = d.id and status = 'fulfilled' and id <> p.id;
    update placeholders set status = 'fulfilled', document_id = d.id, change_reason = trim(p_reason) where id = p.id;
  end if;
  perform set_config('app.placeholder_match', 'off', true);
end;
$$;
revoke all on function link_placeholder(uuid, uuid, text) from public, anon;
grant execute on function link_placeholder(uuid, uuid, text) to authenticated;

------------------------------------------------------------------------------
-- 4. Generation from the plan (PLC-02)
------------------------------------------------------------------------------

-- Creates the placeholders a template item asks for at one scope, up to its quantity
-- (counting earlier ones from the same item and scope, whatever their status).
create or replace function generate_placeholders(p_item plan_template_items, p_study uuid, p_country uuid, p_site uuid,
                                                 p_due date, p_milestone uuid) returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_code text;
  v_have integer;
  v_made integer := 0;
begin
  select study_id into v_code from studies where id = p_study;
  if not exists (select 1 from tmf_config where study_id = v_code and type = 'artifact' and artifact_num = p_item.artifact_num and is_enabled) then
    return 0;   -- the study does not use this artifact
  end if;
  select count(*) into v_have from placeholders
    where template_item_id = p_item.id and study_id = p_study
      and study_site_id is not distinct from p_site
      and (p_item.level <> 'country' or study_country_id = p_country);
  perform set_config('app.placeholder_match', 'on', true);
  while v_have + v_made < p_item.quantity loop
    insert into placeholders (org_id, study_id, artifact_num, level, study_country_id, study_site_id, instructions,
                              responsible_org, responsible_dept, due_date, source, template_item_id, milestone_id)
    values (p_item.org_id, p_study, p_item.artifact_num, p_item.level, p_country, p_site, p_item.instructions,
            p_item.responsible_org, p_item.responsible_dept, p_due, 'plan', p_item.id, p_milestone);
    v_made := v_made + 1;
  end loop;
  perform set_config('app.placeholder_match', 'off', true);
  return v_made;
end;
$$;
revoke all on function generate_placeholders(plan_template_items, uuid, uuid, uuid, date, uuid) from public, anon, authenticated;

-- When a milestone is achieved, the plan items it triggers create their placeholders at that scope.
create or replace function milestones_generate_placeholders() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  i plan_template_items;
  v_country uuid;
  v_site uuid;
begin
  if new.status <> 'achieved' or (tg_op = 'UPDATE' and old.status = 'achieved') then return new; end if;
  if new.scope_type = 'site' then
    v_site := new.scope_id;
  elsif new.scope_type = 'country' then
    v_country := new.scope_id;
  end if;
  for i in select * from plan_template_items where org_id = new.org_id and is_active and trigger_milestone = new.milestone_type loop
    perform generate_placeholders(i, new.study_id, v_country, v_site, new.actual_date + i.due_offset_days, new.id);
  end loop;
  return new;
end;
$$;
drop trigger if exists milestones_generate_placeholders on milestones;
create trigger milestones_generate_placeholders after insert or update of status on milestones
  for each row execute function milestones_generate_placeholders();

-- "Apply eTMF plan" to a study: items without a trigger milestone are created now (due in
-- offset days) for the study and each of its countries/sites; items whose milestone is already
-- achieved catch up. Safe to run again. Returns how many placeholders were created.
create or replace function apply_plan(p_study uuid) returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_org uuid;
  i plan_template_items;
  c record;
  m record;
  v_made integer := 0;
begin
  select org_id into v_org from studies where id = p_study;
  if v_org is null or not can_access_study_id(p_study) then raise exception 'Not found' using errcode = '42501'; end if;
  if not has_org_permission(v_org, 'edit_study') then
    raise exception 'Your role does not allow applying the eTMF plan' using errcode = '42501';
  end if;
  for i in select * from plan_template_items where org_id = v_org and is_active loop
    if i.trigger_milestone is null then
      if i.level = 'study' then
        v_made := v_made + generate_placeholders(i, p_study, null, null, current_date + i.due_offset_days, null);
      elsif i.level = 'country' then
        for c in select id from study_countries where study_id = p_study loop
          v_made := v_made + generate_placeholders(i, p_study, c.id, null, current_date + i.due_offset_days, null);
        end loop;
      else
        for c in select id from study_sites where study_id = p_study loop
          v_made := v_made + generate_placeholders(i, p_study, null, c.id, current_date + i.due_offset_days, null);
        end loop;
      end if;
    else
      for m in select * from milestones where study_id = p_study and milestone_type = i.trigger_milestone and status = 'achieved' loop
        v_made := v_made + generate_placeholders(i, p_study,
          case when m.scope_type = 'country' then m.scope_id end, case when m.scope_type = 'site' then m.scope_id end,
          m.actual_date + i.due_offset_days, m.id);
      end loop;
    end if;
  end loop;
  return v_made;
end;
$$;
revoke all on function apply_plan(uuid) from public, anon;
grant execute on function apply_plan(uuid) to authenticated;

------------------------------------------------------------------------------
-- 5. Navigator: placeholder rows, Incomplete documents (PLC-04/06)
------------------------------------------------------------------------------
drop view if exists navigator_items;
create view navigator_items with (security_invoker = true) as
select
  d.id as row_id,
  'document'::text as kind,
  d.id as document_id,
  d.org_id,
  d.study_id as study_code,
  case when d.status in ('Approved', 'Archived') then 'Final'
       when d.file_path is null then 'Incomplete'
       else 'Under Revision' end as nav_status,
  case when d.status = 'Draft' and coalesce(d.rejection_reason, '') <> '' then 'Returned for rework'
       when d.file_path is null and d.status not in ('Approved', 'Archived') then 'No file attached'
       else coalesce(d.status, 'Draft') end as current_activity,
  d.artifact_name as document_type,
  d.artifact_num,
  nullif(split_part(d.artifact_num, '.', 1), '') as zone_num,
  case when d.artifact_num like '%.%.%' then split_part(d.artifact_num, '.', 1) || '.' || split_part(d.artifact_num, '.', 2) end as section_num,
  upper(left(d.id::text, 8)) as doc_ref,
  coalesce(nullif(trim(d.custom_file_name), ''), d.file_name, d.artifact_name) as title,
  d.study_country_id,
  sc.country_code,
  d.study_site_id,
  ss.site_number,
  ss.display_name as site_name,
  nullif(d.owner, '') as owner,
  coalesce(d.updated_at, d.created_at at time zone 'UTC') as last_modified,
  case when d.study_site_id is not null then 'Site' when d.study_country_id is not null then 'Country' else 'Study' end as tmf_level,
  d.file_type,
  nullif(d.version, '') as revision,
  (d.file_path is not null) as has_file,
  (d.status = 'Archived' or d.archived_at is not null) as is_historical,
  null::uuid as placeholder_id,
  null::date as due_date
from documents d
left join study_countries sc on sc.id = d.study_country_id
left join study_sites ss on ss.id = d.study_site_id
where d.deleted_at is null
union all
-- Open placeholders: Expected until their due date, then Missing.
select
  p.id, 'placeholder', null::uuid, p.org_id, s.study_id,
  case when p.due_date < current_date then 'Missing' else 'Expected' end,
  case when p.due_date < current_date then 'Overdue' else 'Expected' end,
  p.artifact_name, p.artifact_num,
  nullif(split_part(p.artifact_num, '.', 1), ''),
  case when p.artifact_num like '%.%.%' then split_part(p.artifact_num, '.', 1) || '.' || split_part(p.artifact_num, '.', 2) end,
  null,
  coalesce(nullif(trim(p.title), ''), p.artifact_name),
  p.study_country_id, sc.country_code, p.study_site_id, ss.site_number, ss.display_name,
  coalesce(nullif(trim(p.responsible_org), ''), nullif(trim(p.responsible_dept), '')),
  coalesce(p.updated_at, p.created_at),
  initcap(p.level),
  null, null, false, false,
  p.id, p.due_date
from placeholders p
join studies s on s.id = p.study_id
left join study_countries sc on sc.id = p.study_country_id
left join study_sites ss on ss.id = p.study_site_id
where p.status = 'open'
union all
-- Studies without a plan: every enabled artifact with no live document is Missing (Part 6).
select
  c.id, 'missing', null::uuid, c.org_id, c.study_id, 'Missing', 'Not yet filed',
  c.artifact_name, c.artifact_num,
  nullif(split_part(c.artifact_num, '.', 1), ''),
  case when c.artifact_num like '%.%.%' then split_part(c.artifact_num, '.', 1) || '.' || split_part(c.artifact_num, '.', 2) end,
  null, c.artifact_name,
  null::uuid, null, null::uuid, null, null, null,
  null::timestamptz, 'Study', null, null, false, false,
  null::uuid, null::date
from tmf_config c
where c.type = 'artifact' and c.is_enabled and c.artifact_num is not null
  and not exists (
    select 1 from documents d
    where d.org_id = c.org_id and d.study_id = c.study_id and d.artifact_num = c.artifact_num
      and d.deleted_at is null and d.archived_at is null and d.status is distinct from 'Archived')
  and not exists (
    select 1 from placeholders p join studies s on s.id = p.study_id
    where s.org_id = c.org_id and s.study_id = c.study_id and p.status <> 'cancelled');

revoke all on navigator_items from anon;
grant select on navigator_items to authenticated;

------------------------------------------------------------------------------
-- 6. Existing documents fulfil nothing yet (no placeholders exist); nothing to backfill.
------------------------------------------------------------------------------
