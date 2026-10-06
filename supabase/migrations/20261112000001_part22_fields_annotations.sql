-- Part 22 — required and type-specific fields per document type (RM-06) and reviewer annotations (VWR-03).
--
-- * artifact_field_rules: per organisation and TMF artifact, which standard fields are required and which extra
--   (type-specific) fields exist. Changed by administrators and TMF leads; every change is audited.
-- * custom_metadata on intake_items and documents holds the type-specific values. Final documents' values are frozen
--   (post-filing guard) and every change is snapshotted in document_metadata_versions (Pillar 3).
-- * metadata_gaps(): the missing required fields. Filing from intake and Submit for QC both refuse a document with gaps.
-- * document_annotations: reviewer notes pinned to a page position of the file version they were made on; never
--   deleted, only resolved. Added and resolved through functions (permission-checked, server-stamped, audited).

------------------------------------------------------------------------------
-- 1. Field rules
------------------------------------------------------------------------------
create table if not exists artifact_field_rules (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  artifact_num text not null check (artifact_num ~ '^[0-9]{2}(\.[0-9]{2}){0,2}$'),
  required_fields text[] not null default '{}'
    check (required_fields <@ array['title', 'version', 'effective_date', 'expiry_date', 'owner', 'country', 'site']::text[]),
  custom_fields jsonb not null default '[]'::jsonb check (jsonb_typeof(custom_fields) = 'array' and jsonb_array_length(custom_fields) <= 20),
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz,
  updated_by uuid,
  row_version integer not null default 1,
  change_reason text,
  unique (org_id, artifact_num)
);
alter table artifact_field_rules enable row level security;
revoke delete, truncate on artifact_field_rules from anon, authenticated;
revoke all on artifact_field_rules from anon;
drop policy if exists "field rules read" on artifact_field_rules;
create policy "field rules read" on artifact_field_rules for select to authenticated using (org_id = current_org_id());
drop policy if exists "field rules write" on artifact_field_rules;
create policy "field rules write" on artifact_field_rules for insert to authenticated
  with check (org_id = current_org_id() and user_has_permission('invite_users'));
drop policy if exists "field rules update" on artifact_field_rules;
create policy "field rules update" on artifact_field_rules for update to authenticated
  using (org_id = current_org_id() and user_has_permission('invite_users')) with check (org_id = current_org_id());
drop trigger if exists artifact_field_rules_before_insert on artifact_field_rules;
create trigger artifact_field_rules_before_insert before insert on artifact_field_rules for each row execute function structure_before_insert();
drop trigger if exists artifact_field_rules_before_update on artifact_field_rules;
create trigger artifact_field_rules_before_update before update on artifact_field_rules for each row execute function structure_before_update();
drop trigger if exists artifact_field_rules_audit on artifact_field_rules;
create trigger artifact_field_rules_audit after insert or update on artifact_field_rules for each row execute function structure_audit();

alter table intake_items add column if not exists custom_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(custom_metadata) = 'object');
alter table documents add column if not exists custom_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(custom_metadata) = 'object');

------------------------------------------------------------------------------
-- 2. Gaps: which required fields are empty (labels, for messages)
------------------------------------------------------------------------------
create or replace function metadata_gaps(p_org uuid, p_artifact text, p_values jsonb) returns text[]
language plpgsql stable security definer set search_path = public as $$
declare
  r artifact_field_rules;
  f text;
  cf jsonb;
  gaps text[] := '{}';
  labels constant jsonb := '{"title":"Title","version":"Version","effective_date":"Effective date","expiry_date":"Expiry date","owner":"Owner","country":"Country","site":"Site"}';
begin
  select * into r from artifact_field_rules where org_id = p_org and artifact_num = p_artifact;
  if not found then return gaps; end if;
  foreach f in array r.required_fields loop
    if nullif(trim(coalesce(p_values ->> f, '')), '') is null then gaps := gaps || (labels ->> f); end if;
  end loop;
  for cf in select * from jsonb_array_elements(r.custom_fields) loop
    if coalesce((cf ->> 'required')::boolean, false)
       and nullif(trim(coalesce(p_values -> 'custom' ->> (cf ->> 'key'), '')), '') is null then
      gaps := gaps || (cf ->> 'label');
    end if;
  end loop;
  return gaps;
end;
$$;
revoke all on function metadata_gaps(uuid, text, jsonb) from public, anon;
grant execute on function metadata_gaps(uuid, text, jsonb) to authenticated;

-- Filing from intake: the item must have every required field; type-specific values go to the document.
create or replace function file_intake_item(p_item_id uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  r intake_items;
  v_code text;
  v_art tmf_config;
  v_doc uuid;
  v_gaps text[];
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

  v_gaps := metadata_gaps(r.org_id, r.artifact_num, jsonb_build_object(
    'title', r.title, 'version', r.version_label, 'effective_date', r.effective_date, 'owner', r.owner,
    'country', r.study_country_id, 'site', r.study_site_id, 'custom', r.custom_metadata));
  if array_length(v_gaps, 1) > 0 then
    raise exception 'Fill in the required fields for % before filing: %', r.artifact_num, array_to_string(v_gaps, ', ');
  end if;

  insert into documents (
    study_id, user_id, org_id, artifact_num, artifact_name, zone, version, status, owner,
    effective_date, file_path, file_name, file_type, file_size, file_size_bytes, file_hash,
    custom_file_name, comments, study_country_id, study_site_id, custom_metadata
  ) values (
    v_code, auth.uid(), r.org_id, v_art.artifact_num, v_art.artifact_name, v_art.zone_num,
    coalesce(r.version_label, ''), 'Draft', coalesce(r.owner, ''),
    coalesce(r.effective_date::text, ''), r.file_path, r.file_name, r.file_type, r.file_size_bytes,
    r.file_size_bytes, r.file_hash, coalesce(nullif(trim(r.title), ''), r.file_name), coalesce(r.notes, ''),
    r.study_country_id, r.study_site_id, r.custom_metadata
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

-- Submit for QC (any channel): a document with required fields missing cannot go to review.
create or replace function documents_required_fields_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_gaps text[];
begin
  if new.status = 'Under Review' and old.status is distinct from 'Under Review' then
    v_gaps := metadata_gaps(new.org_id, new.artifact_num, jsonb_build_object(
      'title', new.custom_file_name, 'version', new.version, 'effective_date', new.effective_date, 'expiry_date', new.expiry_date,
      'owner', new.owner, 'country', new.study_country_id, 'site', new.study_site_id, 'custom', new.custom_metadata));
    if array_length(v_gaps, 1) > 0 then
      raise exception 'Fill in the required fields before submitting for QC: %', array_to_string(v_gaps, ', ');
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists documents_required_fields_guard on documents;
create trigger documents_required_fields_guard before update on documents for each row execute function documents_required_fields_guard();

------------------------------------------------------------------------------
-- 3. Final documents freeze custom fields too; metadata snapshots include them
------------------------------------------------------------------------------
create or replace function documents_post_filing_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if auth.uid() is null or coalesce(current_setting('app.post_filing', true), '') = 'on' then
    return new;
  end if;
  if new.deleted_at is distinct from old.deleted_at then
    raise exception 'Use Delete (with a reason code) or Restore from the Recycle Bin' using errcode = '42501';
  end if;
  if old.status in ('Approved', 'Under Review') and new.artifact_num is distinct from old.artifact_num then
    raise exception 'Use Reclassify to change the artifact of a document in QC or Final' using errcode = '42501';
  end if;
  if old.status = 'Approved' and new.status = 'Approved'
     and (new.artifact_num, new.custom_file_name, new.version, new.owner, new.effective_date, new.expiry_date, new.study_country_id, new.study_site_id, new.custom_metadata)
         is distinct from
         (old.artifact_num, old.custom_file_name, old.version, old.owner, old.effective_date, old.expiry_date, old.study_country_id, old.study_site_id, old.custom_metadata) then
    raise exception 'Final documents change only through a Revision request or Reclassify' using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace function documents_snapshot_metadata() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_next integer;
begin
  if (new.artifact_num, new.artifact_name, new.custom_file_name, new.version, new.owner, new.effective_date,
      new.expiry_date, new.study_country_id, new.study_site_id, new.zone, new.custom_metadata)
     is not distinct from
     (old.artifact_num, old.artifact_name, old.custom_file_name, old.version, old.owner, old.effective_date,
      old.expiry_date, old.study_country_id, old.study_site_id, old.zone, old.custom_metadata) then
    return new;
  end if;
  select coalesce(max(version_no), 0) + 1 into v_next from document_metadata_versions where document_id = old.id;
  insert into document_metadata_versions (document_id, org_id, study_id, version_no, snapshot, change_reason, changed_by_id, changed_by_email, changed_at)
  values (old.id, old.org_id, old.study_id, v_next,
          jsonb_build_object('artifact_num', old.artifact_num, 'artifact_name', old.artifact_name, 'zone', old.zone, 'status', old.status,
            'version', old.version, 'owner', old.owner, 'effective_date', old.effective_date, 'expiry_date', old.expiry_date,
            'custom_file_name', old.custom_file_name, 'study_country_id', old.study_country_id, 'study_site_id', old.study_site_id,
            'custom_metadata', old.custom_metadata),
          coalesce(nullif(current_setting('app.change_reason', true), ''), 'Metadata changed'),
          auth.uid(), jwt_email(), now());
  return new;
end;
$$;

------------------------------------------------------------------------------
-- 4. Reviewer annotations (VWR-03)
------------------------------------------------------------------------------
create table if not exists document_annotations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  study_id uuid not null references studies(id),
  document_id uuid not null references documents(id),
  file_version_id uuid references document_file_versions(id),
  page integer not null default 1 check (page >= 1),
  x numeric not null check (x >= 0 and x <= 1),
  y numeric not null check (y >= 0 and y <= 1),
  body text not null check (length(trim(body)) between 1 and 2000),
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_by uuid not null,
  created_by_email text,
  created_at timestamptz not null default now(),
  resolved_by uuid,
  resolved_by_email text,
  resolved_at timestamptz,
  resolution_note text check (resolution_note is null or length(resolution_note) <= 2000)
);
create index if not exists document_annotations_document on document_annotations (document_id, created_at);
alter table document_annotations enable row level security;
revoke insert, update, delete, truncate on document_annotations from anon, authenticated;
-- Visible to whoever can see the document (the documents policies decide, including zone permissions and blinding).
drop policy if exists "annotations readable" on document_annotations;
create policy "annotations readable" on document_annotations for select to authenticated
  using (exists (select 1 from documents d where d.id = document_id));
drop trigger if exists aa_closed_study_guard on document_annotations;
create trigger aa_closed_study_guard before insert or update or delete on document_annotations for each row execute function closed_study_guard();

create or replace function add_annotation(p_document uuid, p_page integer, p_x numeric, p_y numeric, p_body text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  d documents;
  v_study uuid;
  v_version uuid;
  v_id uuid;
begin
  select * into d from documents where id = p_document and deleted_at is null;
  -- The same visibility rule as the documents read policy (study access, zone permissions, blinding).
  if not found or d.org_id is distinct from current_org_id()
     or not can_access_study(auth.uid(), d.study_id, d.org_id) or not can_see_document(d.org_id, d.study_id, d.artifact_num, d.blinded) then
    raise exception 'Not found' using errcode = '42501';
  end if;
  select id into v_study from studies where org_id = d.org_id and study_id = d.study_id order by created_at limit 1;
  if v_study is null or not can_access_study_id(v_study) then raise exception 'Not found' using errcode = '42501'; end if;
  if not has_org_permission(d.org_id, 'review_document') then raise exception 'Only reviewers can annotate documents' using errcode = '42501'; end if;
  if d.file_path is null then raise exception 'This record has no file to annotate'; end if;
  if length(trim(coalesce(p_body, ''))) = 0 then raise exception 'Write the note'; end if;
  select id into v_version from document_file_versions where document_id = d.id order by version_no desc limit 1;
  insert into document_annotations (org_id, study_id, document_id, file_version_id, page, x, y, body, created_by, created_by_email)
  values (d.org_id, v_study, d.id, v_version, greatest(1, coalesce(p_page, 1)), p_x, p_y, trim(p_body), auth.uid(), coalesce(jwt_email(), 'system'))
  returning id into v_id;
  insert into audit_trail (user_id, user_email, org_id, action, study_id, document_id, field_changed, new_value, document_name)
  values (auth.uid(), coalesce(jwt_email(), 'system'), d.org_id, 'Annotation added', d.study_id, d.id, 'document_annotations:' || v_id,
          'page ' || greatest(1, coalesce(p_page, 1)) || ': ' || left(trim(p_body), 200), coalesce(nullif(d.custom_file_name, ''), d.file_name));
  return v_id;
end;
$$;
revoke all on function add_annotation(uuid, integer, numeric, numeric, text) from public, anon;
grant execute on function add_annotation(uuid, integer, numeric, numeric, text) to authenticated;

create or replace function resolve_annotation(p_annotation uuid, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
declare
  a document_annotations;
  v_code text;
begin
  select * into a from document_annotations where id = p_annotation for update;
  if not found or not can_access_study_id(a.study_id) then raise exception 'Not found' using errcode = '42501'; end if;
  if a.created_by <> auth.uid() and not has_org_permission(a.org_id, 'review_document') then
    raise exception 'Only the author or a reviewer can resolve this note' using errcode = '42501';
  end if;
  if a.status = 'resolved' then raise exception 'This note is already resolved'; end if;
  update document_annotations set status = 'resolved', resolved_by = auth.uid(), resolved_by_email = coalesce(jwt_email(), 'system'),
    resolved_at = now(), resolution_note = nullif(trim(coalesce(p_note, '')), '') where id = a.id;
  select study_id into v_code from studies where id = a.study_id;
  insert into audit_trail (user_id, user_email, org_id, action, study_id, document_id, field_changed, old_value, new_value)
  values (auth.uid(), coalesce(jwt_email(), 'system'), a.org_id, 'Annotation resolved', v_code, a.document_id, 'document_annotations:' || a.id,
          'open', 'resolved' || coalesce(': ' || nullif(trim(coalesce(p_note, '')), ''), ''));
end;
$$;
revoke all on function resolve_annotation(uuid, text) from public, anon;
grant execute on function resolve_annotation(uuid, text) to authenticated;
