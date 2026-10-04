-- Part 8b — Post-filing operations. Baseline M11 OPS-01..06, Section 5 matrix.
--
-- * Delete (OPS-01/02): coded reason + comment, through delete_document(). Documents that are
--   not Final are deleted directly (delete_document permission). Final documents need a
--   deletion request approved by a different person with an electronic signature ("Deletion
--   approved").
-- * Recycle bin (OPS-03): restore_document() within 180 days; the deletion stays in the audit trail.
-- * Reclassify (OPS-04): reclassify_document() changes artifact and level with a reason; open
--   QC tasks are cancelled (an Under Review document returns to Draft); Final needs an
--   attestation ("Reclassified").
-- * Revision request on Final (OPS-05): request_revision() — "file as Final" applies metadata
--   corrections with an attestation ("Revision approved"); "collaboration" returns the document to
--   Draft with the proposed revision for a new file and QC.
-- * Version history (OPS-06): file versions (Part 4b) plus metadata snapshots, now taken by the
--   database on every core metadata change instead of by the browser.
-- * Users can no longer delete, restore, re-file or edit Final metadata by writing the row.
-- * Fix: restoring an archived Final document (Archived → Approved) was blocked by the Part 7 guard.

alter table documents add column if not exists deletion_code text
  check (deletion_code in ('incorrectly_indexed', 'not_tmf_relevant', 'other'));

------------------------------------------------------------------------------
-- 1. Metadata snapshots by the database (Pillar 3, OPS-06)
------------------------------------------------------------------------------
create or replace function documents_snapshot_metadata() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_next integer;
begin
  if (new.artifact_num, new.artifact_name, new.custom_file_name, new.version, new.owner, new.effective_date,
      new.expiry_date, new.study_country_id, new.study_site_id, new.zone)
     is not distinct from
     (old.artifact_num, old.artifact_name, old.custom_file_name, old.version, old.owner, old.effective_date,
      old.expiry_date, old.study_country_id, old.study_site_id, old.zone) then
    return new;
  end if;
  select coalesce(max(version_no), 0) + 1 into v_next from document_metadata_versions where document_id = old.id;
  insert into document_metadata_versions (document_id, org_id, study_id, version_no, snapshot, change_reason, changed_by_id, changed_by_email, changed_at)
  values (old.id, old.org_id, old.study_id, v_next,
          jsonb_build_object('artifact_num', old.artifact_num, 'artifact_name', old.artifact_name, 'zone', old.zone, 'status', old.status,
            'version', old.version, 'owner', old.owner, 'effective_date', old.effective_date, 'expiry_date', old.expiry_date,
            'custom_file_name', old.custom_file_name, 'study_country_id', old.study_country_id, 'study_site_id', old.study_site_id),
          coalesce(nullif(current_setting('app.change_reason', true), ''), 'Metadata changed'),
          auth.uid(), jwt_email(), now());
  return new;
end;
$$;
drop trigger if exists documents_snapshot_metadata on documents;
create trigger documents_snapshot_metadata before update on documents
  for each row execute function documents_snapshot_metadata();

------------------------------------------------------------------------------
-- 2. Guards: deletes, restores, Final metadata only through the functions below
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
     and (new.artifact_num, new.custom_file_name, new.version, new.owner, new.effective_date, new.expiry_date, new.study_country_id, new.study_site_id)
         is distinct from
         (old.artifact_num, old.custom_file_name, old.version, old.owner, old.effective_date, old.expiry_date, old.study_country_id, old.study_site_id) then
    raise exception 'Final documents change only through a Revision request or Reclassify' using errcode = '42501';
  end if;
  return new;
end;
$$;
drop trigger if exists documents_x_post_filing_guard on documents;
create trigger documents_x_post_filing_guard before update on documents
  for each row execute function documents_post_filing_guard();

-- Part 7 guard, unchanged except: restoring an archived Final document is allowed
-- (Archived → Approved when it was Approved before archiving and keeps its approval).
create or replace function documents_workflow_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'UPDATE' and old.deleted_at is not null and new.deleted_at is null and new.status = 'Under Review' then
    new.status := 'Draft';
  end if;
  if auth.uid() is null or coalesce(current_setting('app.qc_workflow', true), '') = 'on' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if coalesce(new.status, 'Draft') <> 'Draft' then
      raise exception 'New documents start as Draft; submit them for QC to have them approved' using errcode = '42501';
    end if;
    return new;
  end if;
  if old.status = 'Archived' and new.status = 'Approved' and old.pre_archive_status = 'Approved'
     and coalesce(old.approved_at, '') <> '' and new.approved_at is not distinct from old.approved_at
     and new.approved_by is not distinct from old.approved_by then
    return new;   -- un-archive of a Final document
  end if;
  if new.status is distinct from old.status
     and (new.status in ('Under Review', 'Approved') or old.status = 'Under Review')
     and new.deleted_at is not distinct from old.deleted_at then
    raise exception 'Use Submit for QC; documents are approved or returned only through their QC task' using errcode = '42501';
  end if;
  if (new.approved_at, new.approved_by, new.rejected_at, new.rejected_by)
     is distinct from (old.approved_at, old.approved_by, old.rejected_at, old.rejected_by) then
    raise exception 'Approval and rejection are recorded by the QC workflow' using errcode = '42501';
  end if;
  return new;
end;
$$;

------------------------------------------------------------------------------
-- 3. Delete and restore (OPS-01..03)
------------------------------------------------------------------------------
create or replace function post_filing_doc(p_document uuid) returns documents
language plpgsql security definer set search_path = public as $$
declare d documents;
begin
  select * into d from documents where id = p_document for update;
  if not found
     or not exists (select 1 from user_roles where user_id = auth.uid() and org_id = d.org_id and is_active)
     or not can_access_study(auth.uid(), d.study_id, d.org_id) then
    raise exception 'Not found' using errcode = '42501';
  end if;
  return d;
end;
$$;
revoke all on function post_filing_doc(uuid) from public, anon, authenticated;

create or replace function deletion_code_label(p_code text) returns text language sql immutable as $$
  select case p_code when 'incorrectly_indexed' then 'Incorrectly Indexed' when 'not_tmf_relevant' then 'Not TMF Relevant' else 'Other' end
$$;

-- Moves a document to the Recycle Bin. Used directly for documents that are not Final, and by
-- decide_deletion() for approved deletion requests.
create or replace function soft_delete_document(d documents, p_code text, p_comment text, p_action text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform set_config('app.post_filing', 'on', true);
  perform set_config('app.change_reason', 'Deleted', true);
  update documents set deleted_at = now(), deleted_by = jwt_email(), deleted_by_id = auth.uid(), deletion_code = p_code,
    deletion_reason = trim(p_comment), pre_deletion_status = d.status, status = 'Deleted'
    where id = d.id;
  perform set_config('app.post_filing', 'off', true);
  insert into audit_trail (user_id, org_id, action, document_id, study_id, field_changed, old_value, new_value, signature_reason, document_name)
  values (auth.uid(), d.org_id, p_action, d.id, d.study_id, 'status', d.status, 'Deleted',
          deletion_code_label(p_code) || ': ' || trim(p_comment), coalesce(nullif(trim(d.custom_file_name), ''), d.artifact_name));
end;
$$;
revoke all on function soft_delete_document(documents, text, text, text) from public, anon, authenticated;

create or replace function delete_document(p_document uuid, p_code text, p_comment text) returns void
language plpgsql security definer set search_path = public as $$
declare d documents;
begin
  d := post_filing_doc(p_document);
  if not has_org_permission(d.org_id, 'delete_document') then
    raise exception 'Your role does not allow deleting documents' using errcode = '42501';
  end if;
  if d.deleted_at is not null then raise exception 'This document is already in the Recycle Bin'; end if;
  if p_code is null or p_code not in ('incorrectly_indexed', 'not_tmf_relevant', 'other') then raise exception 'Choose a reason'; end if;
  if length(trim(coalesce(p_comment, ''))) < 3 then raise exception 'Add a comment explaining the deletion'; end if;
  if d.status in ('Approved', 'Archived') then
    raise exception 'Final documents need a deletion request approved by another administrator';
  end if;
  perform soft_delete_document(d, p_code, p_comment, 'Document deleted');
end;
$$;
revoke all on function delete_document(uuid, text, text) from public, anon;
grant execute on function delete_document(uuid, text, text) to authenticated;

create or replace function restore_document(p_document uuid, p_reason text) returns text
language plpgsql security definer set search_path = public as $$
declare
  d documents;
  v_status text;
begin
  d := post_filing_doc(p_document);
  if not has_org_permission(d.org_id, 'delete_document') then
    raise exception 'Your role does not allow restoring documents' using errcode = '42501';
  end if;
  if d.deleted_at is null then raise exception 'This document is not in the Recycle Bin'; end if;
  if d.deleted_at < now() - interval '180 days' then
    raise exception 'Documents can be restored for 180 days after deletion; this one was deleted on %', d.deleted_at::date;
  end if;
  if length(trim(coalesce(p_reason, ''))) < 3 then raise exception 'Give a reason for restoring'; end if;
  -- An Under Review document's QC task was cancelled on deletion; it comes back as Draft.
  v_status := case when d.pre_deletion_status = 'Under Review' or d.pre_deletion_status is null then 'Draft' else d.pre_deletion_status end;
  perform set_config('app.post_filing', 'on', true);
  perform set_config('app.qc_workflow', 'on', true);
  update documents set deleted_at = null, deleted_by = null, deleted_by_id = null, deletion_code = null, deletion_reason = null,
    pre_deletion_status = null, status = v_status
    where id = d.id;
  perform set_config('app.qc_workflow', 'off', true);
  perform set_config('app.post_filing', 'off', true);
  insert into audit_trail (user_id, org_id, action, document_id, study_id, field_changed, old_value, new_value, signature_reason, document_name)
  values (auth.uid(), d.org_id, 'Document restored', d.id, d.study_id, 'status', 'Deleted', v_status, trim(p_reason),
          coalesce(nullif(trim(d.custom_file_name), ''), d.artifact_name));
  return v_status;
end;
$$;
revoke all on function restore_document(uuid, text) from public, anon;
grant execute on function restore_document(uuid, text) to authenticated;

-- Deletion requests for Final documents (OPS-02).
create table if not exists deletion_requests (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  study_id uuid not null references studies(id),
  document_id uuid not null references documents(id),
  reason_code text not null check (reason_code in ('incorrectly_indexed', 'not_tmf_relevant', 'other')),
  comment text not null check (length(trim(comment)) >= 3),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'withdrawn')),
  requested_by uuid not null,
  requested_at timestamptz not null default now(),
  decided_by uuid,
  decided_at timestamptz,
  decision_comment text,
  signature_event_id uuid references signature_events(id),
  check (status = 'pending' or (decided_by is not null and decided_at is not null)),
  check (status <> 'approved' or signature_event_id is not null)
);
create unique index if not exists deletion_requests_one_pending on deletion_requests (document_id) where status = 'pending';
alter table deletion_requests enable row level security;
drop policy if exists "study members read deletion requests" on deletion_requests;
create policy "study members read deletion requests" on deletion_requests for select
  using (org_id in (select org_id from user_roles where user_id = auth.uid() and is_active) and can_access_study_id(study_id));
drop trigger if exists deletion_requests_audit on deletion_requests;
create trigger deletion_requests_audit after insert or update on deletion_requests
  for each row execute function structure_audit();

create or replace function request_deletion(p_document uuid, p_code text, p_comment text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  d documents;
  v_study uuid;
  v_id uuid;
begin
  d := post_filing_doc(p_document);
  if not has_org_permission(d.org_id, 'upload_document') then
    raise exception 'Your role does not allow requesting deletions' using errcode = '42501';
  end if;
  if d.deleted_at is not null then raise exception 'This document is already in the Recycle Bin'; end if;
  if d.status not in ('Approved', 'Archived') then raise exception 'Only Final documents need a deletion request; delete this one directly'; end if;
  if p_code is null or p_code not in ('incorrectly_indexed', 'not_tmf_relevant', 'other') then raise exception 'Choose a reason'; end if;
  if length(trim(coalesce(p_comment, ''))) < 3 then raise exception 'Add a comment explaining the deletion'; end if;
  if exists (select 1 from deletion_requests where document_id = d.id and status = 'pending') then
    raise exception 'A deletion request for this document is already waiting for approval';
  end if;
  select id into v_study from studies where org_id = d.org_id and study_id = d.study_id order by created_at limit 1;
  insert into deletion_requests (org_id, study_id, document_id, reason_code, comment, requested_by)
  values (d.org_id, v_study, d.id, p_code, trim(p_comment), auth.uid()) returning id into v_id;
  return v_id;
end;
$$;
revoke all on function request_deletion(uuid, text, text) from public, anon;
grant execute on function request_deletion(uuid, text, text) to authenticated;

-- Approve (electronic signature "Deletion approved", needs a fresh re-authentication) or reject a
-- pending request. The approver must hold delete_document and must not be the requester.
-- The requester may withdraw their own request (p_decision 'withdrawn', no signature).
create or replace function decide_deletion(p_request uuid, p_decision text, p_comment text, p_reauth uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  r deletion_requests;
  d documents;
  v_signer user_roles;
  v_email text;
  v_sig uuid;
  v_version document_file_versions;
begin
  select * into r from deletion_requests where id = p_request for update;
  if not found or not can_access_study_id(r.study_id) then raise exception 'Not found' using errcode = '42501'; end if;
  if r.status <> 'pending' then raise exception 'This request is already %', r.status; end if;
  d := post_filing_doc(r.document_id);
  if p_decision = 'withdrawn' then
    if r.requested_by <> auth.uid() then raise exception 'Only the requester can withdraw a request' using errcode = '42501'; end if;
    update deletion_requests set status = 'withdrawn', decided_by = auth.uid(), decided_at = now(), decision_comment = nullif(trim(coalesce(p_comment, '')), '') where id = r.id;
    return;
  end if;
  if p_decision not in ('approved', 'rejected') then raise exception 'Choose Approve or Reject'; end if;
  if not has_org_permission(r.org_id, 'delete_document') then
    raise exception 'Your role does not allow approving deletions' using errcode = '42501';
  end if;
  if r.requested_by = auth.uid() then raise exception 'Someone other than the requester must decide a deletion request' using errcode = '42501'; end if;
  if p_decision = 'rejected' then
    if length(trim(coalesce(p_comment, ''))) < 3 then raise exception 'Say why the request is rejected'; end if;
    update deletion_requests set status = 'rejected', decided_by = auth.uid(), decided_at = now(), decision_comment = trim(p_comment) where id = r.id;
    return;
  end if;

  update reauth_proofs set used_at = now()
    where id = p_reauth and user_id = auth.uid() and purpose = 'deletion_approval' and used_at is null and expires_at > now();
  if not found then raise exception 'Re-enter your password to sign this approval' using errcode = '42501'; end if;
  select * into v_signer from user_roles where user_id = auth.uid() and org_id = r.org_id and is_active limit 1;
  v_email := coalesce(jwt_email(), v_signer.email);
  select * into v_version from document_file_versions where document_id = d.id order by version_no desc limit 1;
  insert into signature_events (org_id, kind, action, meaning, signer_id, signer_name, signer_email, document_id, file_version_id, file_hash)
  values (r.org_id, 'signature', 'deletion_approval', 'Deletion approved', auth.uid(),
          coalesce(nullif(trim(v_signer.full_name), ''), v_email), v_email, d.id, v_version.id, v_version.file_hash)
  returning id into v_sig;
  update deletion_requests set status = 'approved', decided_by = auth.uid(), decided_at = now(),
    decision_comment = nullif(trim(coalesce(p_comment, '')), ''), signature_event_id = v_sig where id = r.id;
  perform soft_delete_document(d, r.reason_code, r.comment, 'Final document deleted (approved request, electronic signature)');
end;
$$;
revoke all on function decide_deletion(uuid, text, text, uuid) from public, anon;
grant execute on function decide_deletion(uuid, text, text, uuid) to authenticated;

------------------------------------------------------------------------------
-- 4. Reclassify (OPS-04)
------------------------------------------------------------------------------
create or replace function reclassify_document(p_document uuid, p_artifact text, p_country uuid, p_site uuid, p_reason text, p_reauth uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  d documents;
  v_art tmf_config;
  v_study uuid;
  v_country uuid;
  v_new_status text;
  v_email text := jwt_email();
  v_signer user_roles;
  v_version document_file_versions;
begin
  d := post_filing_doc(p_document);
  if d.deleted_at is not null then raise exception 'Restore the document before reclassifying it'; end if;
  if not has_org_permission(d.org_id, 'upload_document') then
    raise exception 'Your role does not allow reclassifying documents' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_reason, ''))) < 3 then raise exception 'Give a reason for reclassifying'; end if;
  select * into v_art from tmf_config where org_id = d.org_id and study_id = d.study_id and type = 'artifact' and artifact_num = p_artifact and is_enabled limit 1;
  if v_art.id is null then raise exception 'Choose an artifact that is enabled for this study'; end if;
  select id into v_study from studies where org_id = d.org_id and study_id = d.study_id order by created_at limit 1;
  v_country := study_scope_country(v_study, p_country, p_site);   -- raises if not in the study; a site brings its country
  if (d.artifact_num, d.study_country_id, d.study_site_id) is not distinct from (p_artifact, v_country, p_site) then
    raise exception 'Nothing to change';
  end if;

  if d.status in ('Approved', 'Archived') then
    if not has_org_permission(d.org_id, 'approve_document') then
      raise exception 'Reclassifying a Final document needs a role that can approve documents' using errcode = '42501';
    end if;
    update reauth_proofs set used_at = now()
      where id = p_reauth and user_id = auth.uid() and purpose = 'reclassify' and used_at is null and expires_at > now();
    if not found then raise exception 'Re-enter your password to confirm reclassifying a Final document' using errcode = '42501'; end if;
    select * into v_signer from user_roles where user_id = auth.uid() and org_id = d.org_id and is_active limit 1;
    select * into v_version from document_file_versions where document_id = d.id order by version_no desc limit 1;
    insert into signature_events (org_id, kind, action, meaning, signer_id, signer_name, signer_email, document_id, file_version_id, file_hash)
    values (d.org_id, 'attestation', 'reclassify', 'Reclassified, with reason', auth.uid(),
            coalesce(nullif(trim(v_signer.full_name), ''), coalesce(v_email, v_signer.email)), coalesce(v_email, v_signer.email),
            d.id, v_version.id, v_version.file_hash);
  end if;

  v_new_status := case when d.status = 'Under Review' then 'Draft' else d.status end;
  perform set_config('app.post_filing', 'on', true);
  perform set_config('app.qc_workflow', 'on', true);
  perform set_config('app.change_reason', 'Reclassified: ' || trim(p_reason), true);
  update document_tasks set status = 'cancelled', cancel_reason = 'Document reclassified: ' || trim(p_reason)
    where document_id = d.id and status = 'open';
  update documents set artifact_num = v_art.artifact_num, artifact_name = v_art.artifact_name, zone = v_art.zone_num,
    study_country_id = v_country, study_site_id = p_site, status = v_new_status
    where id = d.id;
  perform set_config('app.qc_workflow', 'off', true);
  perform set_config('app.post_filing', 'off', true);
  insert into audit_trail (user_id, org_id, action, document_id, study_id, field_changed, old_value, new_value, signature_reason, document_name)
  values (auth.uid(), d.org_id, 'Document reclassified', d.id, d.study_id, 'artifact_num', d.artifact_num, v_art.artifact_num, trim(p_reason),
          coalesce(nullif(trim(d.custom_file_name), ''), d.artifact_name));
  return v_new_status;
end;
$$;
revoke all on function reclassify_document(uuid, text, uuid, uuid, text, uuid) from public, anon;
grant execute on function reclassify_document(uuid, text, uuid, uuid, text, uuid) to authenticated;

------------------------------------------------------------------------------
-- 4b. Earlier file versions are readable like the document (OPS-06)
------------------------------------------------------------------------------
-- Part 1 version, plus: a file that was an earlier version of a document has the same access as
-- that document (same organisation, study access). Everything else is unchanged.
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

  -- An earlier version of a record file: same access as its document.
  if exists (select 1 from document_file_versions v where v.file_path = p_name) then
    return exists (
      select 1 from document_file_versions v
      join documents d on d.id = v.document_id
      where v.file_path = p_name
        and d.org_id = v_org
        and can_access_study(v_uid, d.study_id, d.org_id)
    );
  end if;

  if v_top = 'vault' then
    return split_part(p_name, '/', 2) = v_org::text
       and can_access_study(v_uid, split_part(p_name, '/', 3), v_org);
  end if;

  if v_top = 'messages' then
    -- The uploader always keeps access (covers conversations with no study).
    return p_owner = v_uid or exists (
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

------------------------------------------------------------------------------
-- 5. Revision requests on Final documents (OPS-05)
------------------------------------------------------------------------------
create table if not exists revision_requests (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  study_id uuid not null references studies(id),
  document_id uuid not null references documents(id),
  rationale text not null check (rationale in ('metadata_update', 'content_and_metadata_update', 'filing_error', 'other')),
  description text not null check (length(trim(description)) >= 3),
  proposed_revision text,
  process text not null check (process in ('file_as_final', 'collaboration')),
  changes jsonb not null default '{}'::jsonb,
  signature_event_id uuid references signature_events(id),
  requested_by uuid not null,
  requested_at timestamptz not null default now(),
  check (process <> 'file_as_final' or signature_event_id is not null)
);
alter table revision_requests enable row level security;
drop policy if exists "study members read revision requests" on revision_requests;
create policy "study members read revision requests" on revision_requests for select
  using (org_id in (select org_id from user_roles where user_id = auth.uid() and is_active) and can_access_study_id(study_id));
drop trigger if exists revision_requests_append_only on revision_requests;
create trigger revision_requests_append_only before update or delete on revision_requests
  for each row execute function append_only();

-- p_changes (file_as_final only): any of custom_file_name, version, owner, effective_date, expiry_date.
create or replace function request_revision(p_document uuid, p_rationale text, p_description text, p_revision text,
                                            p_process text, p_changes jsonb, p_reauth uuid) returns text
language plpgsql security definer set search_path = public as $$
declare
  d documents;
  v_study uuid;
  v_sig uuid;
  v_email text := jwt_email();
  v_signer user_roles;
  v_version document_file_versions;
  v_changes jsonb := coalesce(p_changes, '{}'::jsonb);
  v_bad text;
begin
  d := post_filing_doc(p_document);
  if d.deleted_at is not null or d.status <> 'Approved' then raise exception 'Revision requests are for Final documents'; end if;
  if p_rationale not in ('metadata_update', 'content_and_metadata_update', 'filing_error', 'other') then raise exception 'Choose a rationale'; end if;
  if p_process not in ('file_as_final', 'collaboration') then raise exception 'Choose File as Final or Start collaboration'; end if;
  if length(trim(coalesce(p_description, ''))) < 3 then raise exception 'Describe the revision'; end if;
  select id into v_study from studies where org_id = d.org_id and study_id = d.study_id order by created_at limit 1;
  select * into v_signer from user_roles where user_id = auth.uid() and org_id = d.org_id and is_active limit 1;
  select * into v_version from document_file_versions where document_id = d.id order by version_no desc limit 1;

  if p_process = 'file_as_final' then
    if p_rationale = 'content_and_metadata_update' then raise exception 'A content change needs a new file: choose Start collaboration'; end if;
    if not has_org_permission(d.org_id, 'approve_document') then
      raise exception 'Filing a revision as Final needs a role that can approve documents' using errcode = '42501';
    end if;
    select k into v_bad from jsonb_object_keys(v_changes) k
      where k not in ('custom_file_name', 'version', 'owner', 'effective_date', 'expiry_date') limit 1;
    if v_bad is not null then raise exception 'Field % cannot be revised here', v_bad; end if;
    if v_changes = '{}'::jsonb and nullif(trim(coalesce(p_revision, '')), '') is null then raise exception 'Nothing to change'; end if;
    update reauth_proofs set used_at = now()
      where id = p_reauth and user_id = auth.uid() and purpose = 'revision' and used_at is null and expires_at > now();
    if not found then raise exception 'Re-enter your password to approve this revision' using errcode = '42501'; end if;
    insert into signature_events (org_id, kind, action, meaning, signer_id, signer_name, signer_email, document_id, file_version_id, file_hash)
    values (d.org_id, 'attestation', 'revision', 'Revision approved', auth.uid(),
            coalesce(nullif(trim(v_signer.full_name), ''), coalesce(v_email, v_signer.email)), coalesce(v_email, v_signer.email),
            d.id, v_version.id, v_version.file_hash)
    returning id into v_sig;
    perform set_config('app.post_filing', 'on', true);
    perform set_config('app.change_reason', 'Revision filed as Final: ' || trim(p_description), true);
    update documents set
      custom_file_name = case when v_changes ? 'custom_file_name' then v_changes ->> 'custom_file_name' else custom_file_name end,
      version = coalesce(nullif(trim(coalesce(p_revision, '')), ''), case when v_changes ? 'version' then v_changes ->> 'version' else version end),
      owner = case when v_changes ? 'owner' then v_changes ->> 'owner' else owner end,
      effective_date = case when v_changes ? 'effective_date' then v_changes ->> 'effective_date' else effective_date end,
      expiry_date = case when v_changes ? 'expiry_date' then v_changes ->> 'expiry_date' else expiry_date end
      where id = d.id;
    perform set_config('app.post_filing', 'off', true);
  else
    if not has_org_permission(d.org_id, 'upload_document') then
      raise exception 'Your role does not allow revising documents' using errcode = '42501';
    end if;
    perform set_config('app.post_filing', 'on', true);
    perform set_config('app.qc_workflow', 'on', true);
    perform set_config('app.change_reason', 'Revision started: ' || trim(p_description), true);
    update documents set status = 'Draft', approved_at = null, approved_by = null,
      version = coalesce(nullif(trim(coalesce(p_revision, '')), ''), version),
      rejection_reason = null, submission_reason = null
      where id = d.id;
    perform set_config('app.qc_workflow', 'off', true);
    perform set_config('app.post_filing', 'off', true);
  end if;

  insert into revision_requests (org_id, study_id, document_id, rationale, description, proposed_revision, process, changes, signature_event_id, requested_by)
  values (d.org_id, v_study, d.id, p_rationale, trim(p_description), nullif(trim(coalesce(p_revision, '')), ''), p_process, v_changes, v_sig, auth.uid());
  insert into audit_trail (user_id, org_id, action, document_id, study_id, field_changed, old_value, new_value, signature_reason, document_name)
  values (auth.uid(), d.org_id, case when p_process = 'file_as_final' then 'Revision filed as Final (attestation)' else 'Revision started (back to Draft)' end,
          d.id, d.study_id, 'status', 'Approved', case when p_process = 'file_as_final' then 'Approved' else 'Draft' end,
          initcap(replace(p_rationale, '_', ' ')) || ': ' || trim(p_description), coalesce(nullif(trim(d.custom_file_name), ''), d.artifact_name));
  return case when p_process = 'file_as_final' then 'Approved' else 'Draft' end;
end;
$$;
revoke all on function request_revision(uuid, text, text, text, text, jsonb, uuid) from public, anon;
grant execute on function request_revision(uuid, text, text, text, text, jsonb, uuid) to authenticated;
