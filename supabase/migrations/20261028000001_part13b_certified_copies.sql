-- Part 13b — Certified copies (Baseline section 5, CCP-03..06; regulatory requirement REG-06: certified copies
-- identified as such, with the certification process recorded). Plan: docs/part13-plan.md (D47).
--
-- * certified_copies: the certification of one file version of a document, linked to its source
--   (description, location and, for an electronic source, its hash), with the method (paper scan,
--   electronic conversion, electronic duplicate) and the verification performed (page count,
--   legibility, completeness, no alteration). Append-only.
-- * certify_document(): who may certify is the document's owner or a role that may approve documents.
--   Every check must be confirmed. The electronic signature, with the meaning "Certified as a true
--   copy of the original", is bound to the exact file hash of the certified version.
-- * documents.certified_copy marks the record; a later file version is not covered by an earlier
--   certification (the API reports which version is certified).

alter table documents add column if not exists certified_copy boolean not null default false;

create table if not exists certified_copies (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  study_id uuid not null references studies(id),
  document_id uuid not null references documents(id),
  file_version_id uuid not null references document_file_versions(id),
  file_hash text not null,
  source_description text not null check (length(trim(source_description)) between 3 and 1000),
  source_location text check (source_location is null or length(source_location) <= 1000),
  source_hash text check (source_hash is null or source_hash ~ '^[0-9a-f]{64}$'),
  method text not null check (method in ('paper_scan', 'electronic_conversion', 'electronic_duplicate')),
  checks jsonb not null,
  signature_event_id uuid not null references signature_events(id),
  certified_by uuid not null,
  certified_at timestamptz not null default now(),
  check (method <> 'electronic_duplicate' or source_hash is not null)
);
create index if not exists certified_copies_document on certified_copies (document_id, certified_at);

alter table certified_copies enable row level security;
revoke insert, update, delete, truncate on certified_copies from anon, authenticated;
drop policy if exists "readable with the document" on certified_copies;
create policy "readable with the document" on certified_copies for select using (exists (select 1 from documents d where d.id = document_id));
drop trigger if exists certified_copies_append_only on certified_copies;
create trigger certified_copies_append_only before update or delete on certified_copies for each row execute function append_only();

create or replace function certify_document(p_document uuid, p_method text, p_source_description text, p_source_location text, p_source_hash text,
                                            p_checks jsonb, p_reauth uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  d documents;
  s studies;
  v document_file_versions;
  v_signer user_roles;
  v_email text;
  v_sig uuid;
  v_id uuid;
  k text;
begin
  select * into d from documents where id = p_document and deleted_at is null;
  if not found then raise exception 'Not found' using errcode = '42501'; end if;
  select * into s from studies where org_id = d.org_id and study_id = d.study_id order by created_at limit 1;
  if s.id is null or not can_access_study_id(s.id)
     or not exists (select 1 from user_roles where user_id = auth.uid() and org_id = d.org_id and is_active) then
    raise exception 'Not found' using errcode = '42501';
  end if;
  -- Who may certify (CCP): the document's owner, or a role that may approve documents.
  if d.user_id is distinct from auth.uid() and not has_org_permission(d.org_id, 'approve_document') then
    raise exception 'Only the document owner or an approver may certify copies' using errcode = '42501';
  end if;
  if p_method not in ('paper_scan', 'electronic_conversion', 'electronic_duplicate') then raise exception 'Choose how the copy was made'; end if;
  if length(trim(coalesce(p_source_description, ''))) < 3 then raise exception 'Describe the original (source) document'; end if;
  foreach k in array array['page_count', 'legible', 'complete', 'unaltered'] loop
    if coalesce((p_checks ->> k)::boolean, false) is not true then
      raise exception 'Confirm every verification before certifying (%)', replace(k, '_', ' ');
    end if;
  end loop;
  select * into v from document_file_versions where document_id = d.id order by version_no desc limit 1;
  if not found or d.file_path is null then raise exception 'This document has no file to certify'; end if;
  if p_method = 'electronic_duplicate' and (p_source_hash is null or lower(p_source_hash) <> lower(coalesce(v.file_hash, ''))) then
    raise exception 'An electronic duplicate must have the same SHA-256 as its source';
  end if;
  if exists (select 1 from certified_copies where file_version_id = v.id) then raise exception 'This file version is already certified'; end if;

  update reauth_proofs set used_at = now()
    where id = p_reauth and user_id = auth.uid() and purpose = 'certified_copy' and used_at is null and expires_at > now();
  if not found then raise exception 'Re-enter your password to sign the certification' using errcode = '42501'; end if;
  select * into v_signer from user_roles where user_id = auth.uid() and org_id = d.org_id and is_active limit 1;
  v_email := coalesce(jwt_email(), v_signer.email);
  insert into signature_events (org_id, kind, action, meaning, signer_id, signer_name, signer_email, document_id, file_version_id, file_hash)
  values (d.org_id, 'signature', 'certified_copy', 'Certified as a true copy of the original', auth.uid(),
          coalesce(nullif(trim(v_signer.full_name), ''), v_email), v_email, d.id, v.id, v.file_hash)
  returning id into v_sig;
  insert into certified_copies (org_id, study_id, document_id, file_version_id, file_hash, source_description, source_location, source_hash, method, checks, signature_event_id, certified_by)
  values (d.org_id, s.id, d.id, v.id, v.file_hash, trim(p_source_description), nullif(trim(coalesce(p_source_location, '')), ''), nullif(lower(trim(coalesce(p_source_hash, ''))), ''),
          p_method, p_checks, v_sig, auth.uid())
  returning id into v_id;
  perform set_config('app.qc_workflow', 'on', true);   -- a workflow-controlled flag, set only here
  update documents set certified_copy = true where id = d.id;
  perform set_config('app.qc_workflow', 'off', true);
  insert into audit_trail (user_id, org_id, action, study_id, document_id, document_name, field_changed, old_value, new_value, signature_reason)
  values (auth.uid(), d.org_id, 'Certified as a true copy (electronic signature)', d.study_id, d.id, coalesce(nullif(trim(d.custom_file_name), ''), d.artifact_name),
          'certified_copy', 'false', format('file v%s sha256 %s', v.version_no, v.file_hash), replace(p_method, '_', ' ') || ': ' || trim(p_source_description));
  return v_id;
end;
$$;
revoke all on function certify_document(uuid, text, text, text, text, jsonb, uuid) from public, anon;
grant execute on function certify_document(uuid, text, text, text, text, jsonb, uuid) to authenticated;

-- The certified-copy mark is set only by certify_document() (signed); it can't be written directly.
create or replace function documents_certified_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if auth.uid() is null or coalesce(current_setting('app.qc_workflow', true), '') = 'on' then return new; end if;
  if (tg_op = 'INSERT' and new.certified_copy) or (tg_op = 'UPDATE' and new.certified_copy is distinct from old.certified_copy) then
    raise exception 'Certify a copy with its electronic signature (Certify as true copy)' using errcode = '42501';
  end if;
  return new;
end;
$$;
drop trigger if exists documents_certified_guard on documents;
create trigger documents_certified_guard before insert or update on documents for each row execute function documents_certified_guard();
