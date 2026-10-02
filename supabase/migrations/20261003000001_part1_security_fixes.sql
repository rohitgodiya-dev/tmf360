-- Part 1 — urgent security fixes
--
-- 1. Audit trail becomes append-only (REG-01, DI-08).
-- 2. The Documents storage bucket becomes private; file access follows document
--    access (AZB-06). Previously anonymous users could read, upload, overwrite
--    and delete files in every bucket.
-- 3. Documents can no longer be hard-deleted through the API (DI-06); deletion is
--    the soft delete into the Recycle Bin.
--
-- Not changed here (flagged for follow-up): the open "allow all" storage policies
-- still apply to the isf-documents (Site360) and participant-resources
-- (Participant360) buckets.

------------------------------------------------------------------------------
-- 1. Append-only audit trail
------------------------------------------------------------------------------

drop policy if exists "Users see own audit trail" on audit_trail;

-- Same visibility as before (own entries); widening audit views by role is Part 4.
create policy "audit read own" on audit_trail
  for select to authenticated
  using (auth.uid() = user_id);

create policy "audit insert own" on audit_trail
  for insert to authenticated
  with check (auth.uid() = user_id);

revoke update, delete, truncate on audit_trail from anon, authenticated;

-- Blocks changes even for roles that bypass RLS (e.g. the service role).
create or replace function prevent_audit_modification()
returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_trail is append-only: % is not allowed', tg_op;
end;
$$;

drop trigger if exists audit_trail_append_only on audit_trail;
create trigger audit_trail_append_only
  before update or delete on audit_trail
  for each row execute function prevent_audit_modification();

drop trigger if exists audit_trail_no_truncate on audit_trail;
create trigger audit_trail_no_truncate
  before truncate on audit_trail
  for each statement execute function prevent_audit_modification();

------------------------------------------------------------------------------
-- 2. Private Documents bucket
------------------------------------------------------------------------------

-- Who may read a file in the Documents bucket. Path layouts in use:
--   <org_id or user_id>/<study_id>/<file>  document files (referenced by documents.file_path)
--   vault/<org_id>/<study_id>/<file>       Trinity study vault
--   messages/<conversation_id>/<file>      message attachments
create or replace function can_read_document_file(p_name text, p_owner uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_org uuid;
  v_top text := split_part(p_name, '/', 1);
begin
  if v_uid is null then
    return false;
  end if;

  select ur.org_id into v_org
  from user_roles ur
  where ur.user_id = v_uid and ur.is_active = true
  limit 1;

  -- A record file: same access as the document itself (org + study).
  if exists (select 1 from documents d where d.file_path = p_name) then
    return exists (
      select 1 from documents d
      where d.file_path = p_name
        and d.org_id = v_org
        and can_access_study(v_uid, d.study_id, d.org_id)
    );
  end if;

  if v_top = 'vault' then
    return split_part(p_name, '/', 2) = v_org::text
       and can_access_study(v_uid, split_part(p_name, '/', 3), v_org);
  end if;

  if v_top = 'messages' then
    return exists (
      select 1
      from conversations c
      join studies s on s.study_id::text = c.study_id::text and s.org_id = v_org
      where c.id::text = split_part(p_name, '/', 2)
        and can_access_study(v_uid, c.study_id::text, v_org)
    );
  end if;

  -- Uploaded but not yet attached to a document (e.g. while the add-document form is open).
  return p_owner = v_uid;
end;
$$;

-- Who may upload to (or overwrite) a path: only into their own org's or own user folder,
-- or the vault/messages areas of their org.
create or replace function can_write_document_file(p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_org uuid;
  v_top text := split_part(p_name, '/', 1);
begin
  if v_uid is null then
    return false;
  end if;

  select ur.org_id into v_org
  from user_roles ur
  where ur.user_id = v_uid and ur.is_active = true
  limit 1;

  if v_top = 'vault' then
    return split_part(p_name, '/', 2) = v_org::text;
  end if;
  if v_top = 'messages' then
    return v_org is not null;
  end if;
  return v_top = v_org::text or v_top = v_uid::text;
end;
$$;

update storage.buckets set public = false where id = 'Documents';

-- These targeted a bucket named 'documents' (lower case), which does not exist.
drop policy if exists "Allow all reads" on storage.objects;
drop policy if exists "Allow all uploads" on storage.objects;
drop policy if exists "Allow all updates" on storage.objects;
drop policy if exists "Allow all deletes" on storage.objects;

-- The bucket-less "allow all" policies stay for the other buckets but no longer
-- cover Documents (permissive policies are OR-ed, so they would override the rules below).
alter policy "allow all 1cqvdzs_0" on storage.objects using (bucket_id <> 'Documents');
alter policy "allow all 1cqvdzs_1" on storage.objects with check (bucket_id <> 'Documents');
alter policy "allow all 1cqvdzs_2" on storage.objects using (bucket_id <> 'Documents');
alter policy "allow all 1cqvdzs_3" on storage.objects using (bucket_id <> 'Documents');

drop policy if exists "documents bucket read" on storage.objects;
create policy "documents bucket read" on storage.objects
  for select to authenticated
  using (bucket_id = 'Documents' and can_read_document_file(name, owner));

drop policy if exists "documents bucket upload" on storage.objects;
create policy "documents bucket upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'Documents' and can_write_document_file(name));

-- Needed for upsert uploads. Paths are content hashes, so an overwrite carries identical content.
drop policy if exists "documents bucket overwrite" on storage.objects;
create policy "documents bucket overwrite" on storage.objects
  for update to authenticated
  using (bucket_id = 'Documents' and can_write_document_file(name))
  with check (bucket_id = 'Documents' and can_write_document_file(name));

-- No delete policy: original files are never removed (DI-01).

------------------------------------------------------------------------------
-- 3. No hard deletes of documents
------------------------------------------------------------------------------

drop policy if exists "admins can delete documents" on documents;

-- "documents study access" was FOR ALL, which also allowed DELETE. Same rule,
-- split per command with no delete.
drop policy if exists "documents study access" on documents;

create policy "documents study read" on documents
  for select
  using (
    org_id = (select org_id from user_roles where user_id = auth.uid() and is_active = true limit 1)
    and can_access_study(auth.uid(), study_id, org_id)
  );

create policy "documents study insert" on documents
  for insert
  with check (
    org_id = (select org_id from user_roles where user_id = auth.uid() and is_active = true limit 1)
    and can_access_study(auth.uid(), study_id, org_id)
  );

create policy "documents study update" on documents
  for update
  using (
    org_id = (select org_id from user_roles where user_id = auth.uid() and is_active = true limit 1)
    and can_access_study(auth.uid(), study_id, org_id)
  )
  with check (
    org_id = (select org_id from user_roles where user_id = auth.uid() and is_active = true limit 1)
    and can_access_study(auth.uid(), study_id, org_id)
  );

revoke delete on documents from anon, authenticated;
