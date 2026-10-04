-- Part 6 — Navigator (M04) and document viewer (M07).
--
-- 1. TMF level. A document (and an intake item) can belong to a country or a site of its
--    study; neither means study level (NAV-01 "My Trial" tree, NAV-04 TMF Level filter).
--    The database checks the country/site belongs to the same study, and a site always
--    brings its own country.
-- 2. documents.updated_at — "Last Modified" in the grid (NAV-05), stamped by the server.
-- 3. navigator_items — one row per live document plus one "Missing" row per enabled
--    artifact of the study that has no live document. security_invoker, so the caller's
--    row-level security applies: the grid, tiles and tree counts only ever show what the
--    caller may read (AZB-01/07). Expected and Incomplete come with placeholders (Part 8).
-- 4. file_intake_item() carries the intake item's country/site onto the filed document.

------------------------------------------------------------------------------
-- 1. TMF level
------------------------------------------------------------------------------

alter table documents add column if not exists study_country_id uuid references study_countries(id);
alter table documents add column if not exists study_site_id uuid references study_sites(id);
alter table documents add column if not exists updated_at timestamptz;
update documents set updated_at = created_at at time zone 'UTC' where updated_at is null;

alter table intake_items add column if not exists study_country_id uuid references study_countries(id);
alter table intake_items add column if not exists study_site_id uuid references study_sites(id);

-- The country for a study/country/site choice: the site's own country, the country given,
-- or null for study level. Raises if the country or site is not part of the study.
create or replace function study_scope_country(p_study uuid, p_country uuid, p_site uuid) returns uuid
language plpgsql stable security definer set search_path = public as $$
declare
  v_country uuid;
begin
  if p_site is not null then
    select study_country_id into v_country from study_sites where id = p_site and study_id = p_study;
    if v_country is null then raise exception 'Choose a site that belongs to this study'; end if;
    return v_country;
  end if;
  if p_country is not null and not exists (select 1 from study_countries where id = p_country and study_id = p_study) then
    raise exception 'Choose a country that belongs to this study';
  end if;
  return p_country;
end;
$$;
revoke all on function study_scope_country(uuid, uuid, uuid) from public, anon, authenticated;

-- Runs after documents_enforce_permissions (alphabetical), which therefore still compares
-- only what the client sent; changing the level is a metadata edit (upload_document).
create or replace function documents_scope_and_touch() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_study uuid;
begin
  if tg_op = 'INSERT'
     or new.study_country_id is distinct from old.study_country_id
     or new.study_site_id is distinct from old.study_site_id then
    if new.study_country_id is not null or new.study_site_id is not null then
      select id into v_study from studies where org_id = new.org_id and study_id = new.study_id
        order by created_at limit 1;
      new.study_country_id := study_scope_country(v_study, new.study_country_id, new.study_site_id);
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists documents_scope_and_touch on documents;
create trigger documents_scope_and_touch before insert or update on documents
  for each row execute function documents_scope_and_touch();

create or replace function intake_items_scope() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT'
     or new.study_country_id is distinct from old.study_country_id
     or new.study_site_id is distinct from old.study_site_id then
    new.study_country_id := study_scope_country(new.study_id, new.study_country_id, new.study_site_id);
  end if;
  return new;
end;
$$;

drop trigger if exists intake_items_b_scope on intake_items;
create trigger intake_items_b_scope before insert or update on intake_items
  for each row execute function intake_items_scope();

------------------------------------------------------------------------------
-- 3. navigator_items
------------------------------------------------------------------------------

create index if not exists documents_navigator on documents (org_id, study_id, artifact_num) where deleted_at is null;

drop view if exists navigator_items;
create view navigator_items with (security_invoker = true) as
select
  d.id as row_id,
  'document'::text as kind,
  d.id as document_id,
  d.org_id,
  d.study_id as study_code,
  case when d.status in ('Approved', 'Archived') then 'Final' else 'Under Revision' end as nav_status,
  case when d.status = 'Draft' and coalesce(d.rejection_reason, '') <> '' then 'Returned for rework'
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
  (d.status = 'Archived' or d.archived_at is not null) as is_historical
from documents d
left join study_countries sc on sc.id = d.study_country_id
left join study_sites ss on ss.id = d.study_site_id
where d.deleted_at is null
union all
select
  c.id,
  'missing',
  null::uuid,
  c.org_id,
  c.study_id,
  'Missing',
  'Not yet filed',
  c.artifact_name,
  c.artifact_num,
  nullif(split_part(c.artifact_num, '.', 1), ''),
  case when c.artifact_num like '%.%.%' then split_part(c.artifact_num, '.', 1) || '.' || split_part(c.artifact_num, '.', 2) end,
  null,
  c.artifact_name,
  null::uuid, null, null::uuid, null, null, null,
  null::timestamptz,
  'Study',
  null, null,
  false,
  false
from tmf_config c
where c.type = 'artifact' and c.is_enabled and c.artifact_num is not null
  and not exists (
    select 1 from documents d
    where d.org_id = c.org_id and d.study_id = c.study_id and d.artifact_num = c.artifact_num
      and d.deleted_at is null and d.archived_at is null and d.status is distinct from 'Archived'
  );

revoke all on navigator_items from anon;
grant select on navigator_items to authenticated;

------------------------------------------------------------------------------
-- 4. Filing carries the TMF level
------------------------------------------------------------------------------

create or replace function file_intake_item(p_item_id uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  r intake_items;
  v_code text;
  v_art tmf_config;
  v_doc uuid;
begin
  select * into r from intake_items where id = p_item_id for update;
  if not found
     or not exists (select 1 from user_roles where user_id = auth.uid() and org_id = r.org_id and is_active)
     or not can_access_study_id(r.study_id) then
    raise exception 'Not found' using errcode = '42501';
  end if;
  if not has_org_permission(r.org_id, 'upload_document') then
    raise exception 'Your role does not allow filing documents' using errcode = '42501';
  end if;
  if r.status not in ('received', 'indexed') then
    raise exception 'This intake item is already %', r.status;
  end if;
  if r.verification_status <> 'verified' then
    raise exception 'The file has not passed its integrity check';
  end if;

  select study_id into v_code from studies where id = r.study_id;
  select * into v_art from tmf_config
    where study_id = v_code and type = 'artifact' and artifact_num = r.artifact_num and is_enabled
    limit 1;
  if v_art.id is null then
    raise exception 'Choose an enabled TMF artifact for this study before filing';
  end if;

  insert into documents (
    study_id, user_id, org_id, artifact_num, artifact_name, zone, version, status, owner,
    effective_date, file_path, file_name, file_type, file_size, file_size_bytes, file_hash,
    custom_file_name, comments, study_country_id, study_site_id
  ) values (
    v_code, auth.uid(), r.org_id, v_art.artifact_num, v_art.artifact_name, v_art.zone_num,
    coalesce(r.version_label, ''), 'Draft', coalesce(r.owner, ''),
    coalesce(r.effective_date::text, ''), r.file_path, r.file_name, r.file_type, r.file_size_bytes,
    r.file_size_bytes, r.file_hash, coalesce(nullif(trim(r.title), ''), r.file_name), coalesce(r.notes, ''),
    r.study_country_id, r.study_site_id
  ) returning id into v_doc;

  perform set_config('app.intake_filing', 'on', true);
  update document_file_versions
    set verification_status = 'verified', verified_hash = r.file_hash, verified_at = now()
    where document_id = v_doc and file_hash = r.file_hash;
  update intake_items set status = 'filed', filed_document_id = v_doc where id = r.id;
  perform set_config('app.intake_filing', 'off', true);

  insert into audit_trail (user_id, org_id, action, document_id, study_id, field_changed, old_value, new_value, document_name)
  values (auth.uid(), r.org_id, 'Document filed from intake', v_doc, v_code, 'status', 'Intake', 'Draft',
          coalesce(nullif(trim(r.title), ''), r.file_name));
  return v_doc;
end;
$$;

revoke all on function file_intake_item(uuid) from public, anon;
grant execute on function file_intake_item(uuid) to authenticated;
