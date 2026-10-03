-- Part 5 — Document Intake (the Baseline's "Staging Area"): files arrive, are indexed, then filed.
--
-- intake_items holds files that have been received for a study but are not yet TMF records.
--   received → indexed (artifact and metadata chosen) → filed (a documents row is created)
--                                                     ↘ rejected (with a reason)
-- * Rows are created through POST /api/v1/studies/:id/intake. The server re-hashes the
--   stored file and only it can mark the item verified; only verified items can be filed.
-- * The file itself never changes after receipt; filed and rejected items are final.
-- * Filing happens in file_intake_item(), which creates the document and closes the item
--   in one transaction, so an item can't be filed twice or left half-filed.
-- * Every insert and change is audited (structure_audit, Part 2b).

create table if not exists intake_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  study_id uuid not null references studies(id),
  file_path text not null,
  file_name text not null check (length(trim(file_name)) > 0),
  file_type text,
  file_size_bytes bigint check (file_size_bytes >= 0),
  file_hash text not null check (file_hash ~ '^[0-9a-f]{64}$'),
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified', 'verified', 'mismatch', 'missing')),
  status text not null default 'received' check (status in ('received', 'indexed', 'filed', 'rejected')),
  suggestion jsonb,                      -- AI classification suggestion (advisory only)
  artifact_num text,
  title text,
  version_label text,
  effective_date date,
  owner text,
  notes text,
  filed_document_id uuid references documents(id),
  rejected_reason text,
  change_reason text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_by uuid,
  updated_at timestamptz,
  row_version integer not null default 1,
  check (status <> 'rejected' or length(trim(coalesce(rejected_reason, ''))) > 0),
  check (status <> 'filed' or filed_document_id is not null)
);
create index if not exists intake_items_study on intake_items (study_id, status, created_at desc);
-- The same file can't be waiting in a study's intake twice.
create unique index if not exists intake_items_open_file on intake_items (study_id, file_hash)
  where status in ('received', 'indexed');

alter table intake_items enable row level security;
drop policy if exists "study members read intake" on intake_items;
drop policy if exists "uploaders add intake" on intake_items;
drop policy if exists "uploaders change intake" on intake_items;
create policy "study members read intake" on intake_items for select
  using (org_id in (select org_id from user_roles where user_id = auth.uid() and is_active)
         and can_access_study_id(study_id));
create policy "uploaders add intake" on intake_items for insert
  with check (has_org_permission(org_id, 'upload_document') and can_access_study_id(study_id));
create policy "uploaders change intake" on intake_items for update
  using (has_org_permission(org_id, 'upload_document') and can_access_study_id(study_id))
  with check (has_org_permission(org_id, 'upload_document') and can_access_study_id(study_id));

-- Users can index and reject; the file, verification and filing are the server's.
create or replace function intake_items_guard() returns trigger
language plpgsql set search_path = public as $$
declare
  v_filing boolean := coalesce(current_setting('app.intake_filing', true), '') = 'on';
begin
  if auth.uid() is null then return new; end if;   -- server (service role)

  if tg_op = 'INSERT' then
    new.verification_status := 'unverified';
    new.status := 'received';
    new.filed_document_id := null;
    new.rejected_reason := null;
    return new;
  end if;

  if old.status in ('filed', 'rejected') then
    raise exception 'This intake item is already %', old.status;
  end if;
  if (new.file_path, new.file_name, new.file_type, new.file_size_bytes, new.file_hash)
     is distinct from (old.file_path, old.file_name, old.file_type, old.file_size_bytes, old.file_hash) then
    raise exception 'The received file cannot be changed; reject the item and add the file again';
  end if;
  if new.verification_status is distinct from old.verification_status then
    raise exception 'Only the server can record the integrity check';
  end if;
  if (new.status = 'filed' or new.filed_document_id is not null) and not v_filing then
    raise exception 'Items are filed with file_intake_item()';
  end if;
  return new;
end;
$$;

drop trigger if exists intake_items_a_guard on intake_items;
create trigger intake_items_a_guard before insert or update on intake_items
  for each row execute function intake_items_guard();
-- Shared Part 2b triggers: org from the study, created_*/updated_*/row_version, audit.
drop trigger if exists intake_items_before_insert on intake_items;
create trigger intake_items_before_insert before insert on intake_items
  for each row execute function structure_before_insert();
drop trigger if exists intake_items_before_update on intake_items;
create trigger intake_items_before_update before update on intake_items
  for each row execute function structure_before_update();
drop trigger if exists intake_items_audit on intake_items;
create trigger intake_items_audit after insert or update on intake_items
  for each row execute function structure_audit();

-- The intake integrity check carries over to the filed document's first file version.
create or replace function document_file_versions_guard() returns trigger
language plpgsql set search_path = public as $$
declare
  v_verification text[] := array['verification_status', 'verified_hash', 'verified_at'];
  v_only_verification boolean;
begin
  if tg_op = 'UPDATE' then
    v_only_verification := (to_jsonb(new) - v_verification) = (to_jsonb(old) - v_verification);
    if v_only_verification and (auth.uid() is null or coalesce(current_setting('app.intake_filing', true), '') = 'on') then
      return new;
    end if;
  elsif auth.uid() is null then
    return old;
  end if;
  raise exception 'document_file_versions is append-only: % is not allowed', tg_op;
end;
$$;

-- Files a verified, indexed intake item into the TMF as a Draft document. Returns the document id.
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
    custom_file_name, comments
  ) values (
    v_code, auth.uid(), r.org_id, v_art.artifact_num, v_art.artifact_name, v_art.zone_num,
    coalesce(r.version_label, ''), 'Draft', coalesce(r.owner, ''),
    coalesce(r.effective_date::text, ''), r.file_path, r.file_name, r.file_type, r.file_size_bytes,
    r.file_size_bytes, r.file_hash, coalesce(nullif(trim(r.title), ''), r.file_name), coalesce(r.notes, '')
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
