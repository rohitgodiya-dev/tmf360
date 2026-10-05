-- Part 11c — Retention, legal hold, study close-out, archive and transfer (Baseline Section 6
-- RET-01..06, M16 EXP-04). Plan and decisions: docs/part11-plan.md (D34–D36).
--
-- * retention_policies: the organisation default (study_id null) and per-study overrides:
--   start trigger (study close-out, marketing authorisation or a fixed date) + duration (RET-01).
-- * legal_holds: at organisation, study or document level; held documents cannot be deleted (and
--   nothing is ever purged in TMF360: D34). Placing and releasing are audited (RET-02).
-- * Study close-out (RET-03): close_study() needs an electronic signature ("Study TMF closed"),
--   cancels open QC tasks with the reason and makes the study read-only; reopen_study() is signed too.
-- * Archive / transfer packages (RET-04/05): create_archive_job() needs an electronic signature
--   ("Archive package approved"); the package (all versions, metadata, audit trail, signatures,
--   manifest of hashes) is built by the API as an export job.

------------------------------------------------------------------------------
-- 1. Study lifecycle columns and signature linkage
------------------------------------------------------------------------------
alter table studies add column if not exists closed_at timestamptz;
alter table studies add column if not exists closed_by uuid;
alter table studies add column if not exists close_reason text;
alter table studies add column if not exists marketing_authorisation_date date;

alter table signature_events add column if not exists study_id uuid references studies(id);
alter table signature_events add column if not exists export_job_id uuid references export_jobs(id);
drop policy if exists "study signatures readable" on signature_events;
create policy "study signatures readable" on signature_events for select
  using (document_id is null and study_id is not null
         and org_id in (select org_id from user_roles where user_id = auth.uid() and is_active) and can_access_study_id(study_id));

-- Close-out fields change only inside close_study()/reopen_study(); while a study is closed its
-- record is read-only (except recording the marketing authorisation date, which starts retention).
create or replace function studies_lifecycle_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if coalesce(current_setting('app.study_lifecycle', true), '') = 'on' then return new; end if;
  if new.closed_at is distinct from old.closed_at or new.closed_by is distinct from old.closed_by or new.close_reason is distinct from old.close_reason then
    raise exception 'Close or reopen a study with its electronic signature (Archive & retention)';
  end if;
  if old.closed_at is not null and (to_jsonb(new) - 'marketing_authorisation_date') is distinct from (to_jsonb(old) - 'marketing_authorisation_date') then
    raise exception 'Study % is closed and read-only', old.study_id;
  end if;
  return new;
end;
$$;
drop trigger if exists studies_lifecycle_guard on studies;
create trigger studies_lifecycle_guard before update on studies for each row execute function studies_lifecycle_guard();

-- Read-only enforcement for everything that belongs to a closed study (RET-03).
create or replace function closed_study_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  r jsonb := to_jsonb(coalesce(new, old));
  v_closed timestamptz;
  v_code text;
begin
  if coalesce(current_setting('app.study_lifecycle', true), '') = 'on' then return coalesce(new, old); end if;
  if tg_table_name = 'documents' then
    select closed_at, study_id into v_closed, v_code from studies where org_id = (r ->> 'org_id')::uuid and study_id = r ->> 'study_id' order by created_at limit 1;
  else
    select closed_at, study_id into v_closed, v_code from studies where id = (r ->> 'study_id')::uuid;
  end if;
  if v_closed is not null then
    raise exception 'Study % is closed and read-only. Reopen it (with a signature) to make changes.', v_code;
  end if;
  return coalesce(new, old);
end;
$$;
do $$
declare t text;
begin
  foreach t in array array['documents', 'intake_items', 'placeholders', 'document_tasks', 'study_countries', 'study_sites', 'study_parties', 'milestones', 'contact_roles'] loop
    execute format('drop trigger if exists %I on %I', 'aa_closed_study_guard', t);
    execute format('create trigger %I before insert or update or delete on %I for each row execute function closed_study_guard()', 'aa_closed_study_guard', t);
  end loop;
end $$;

------------------------------------------------------------------------------
-- 2. Retention policies (RET-01)
------------------------------------------------------------------------------
create table if not exists retention_policies (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  study_id uuid references studies(id),
  start_trigger text not null check (start_trigger in ('study_closeout', 'marketing_authorisation', 'fixed_date')),
  years integer not null check (years between 1 and 100),
  start_date date,
  notes text check (notes is null or length(notes) <= 2000),
  change_reason text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_by uuid,
  updated_at timestamptz,
  row_version integer not null default 1,
  check (start_trigger <> 'fixed_date' or start_date is not null)
);
create unique index if not exists retention_policies_one_default on retention_policies (org_id) where study_id is null;
create unique index if not exists retention_policies_one_per_study on retention_policies (study_id) where study_id is not null;

alter table retention_policies enable row level security;
drop policy if exists "org members read retention" on retention_policies;
drop policy if exists "leads add retention" on retention_policies;
drop policy if exists "leads change retention" on retention_policies;
create policy "org members read retention" on retention_policies for select
  using (org_id in (select org_id from user_roles where user_id = auth.uid() and is_active) and (study_id is null or can_access_study_id(study_id)));
create policy "leads add retention" on retention_policies for insert
  with check (has_org_permission(org_id, 'invite_users') and (study_id is null or can_access_study_id(study_id)) and length(trim(coalesce(change_reason, ''))) >= 3);
create policy "leads change retention" on retention_policies for update
  using (has_org_permission(org_id, 'invite_users') and (study_id is null or can_access_study_id(study_id)))
  with check (has_org_permission(org_id, 'invite_users') and length(trim(coalesce(change_reason, ''))) >= 3);
revoke delete, truncate on retention_policies from anon, authenticated;
drop trigger if exists retention_policies_before_insert on retention_policies;
create trigger retention_policies_before_insert before insert on retention_policies for each row execute function structure_before_insert();
drop trigger if exists retention_policies_before_update on retention_policies;
create trigger retention_policies_before_update before update on retention_policies for each row execute function structure_before_update();
drop trigger if exists retention_policies_audit on retention_policies;
create trigger retention_policies_audit after insert or update on retention_policies for each row execute function structure_audit();

------------------------------------------------------------------------------
-- 3. Legal holds (RET-02)
------------------------------------------------------------------------------
create table if not exists legal_holds (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  scope text not null check (scope in ('tenant', 'study', 'document')),
  study_id uuid references studies(id),
  document_id uuid references documents(id),
  reason text not null check (length(trim(reason)) >= 3),
  reference text check (reference is null or length(reference) <= 200),
  placed_by uuid not null,
  placed_at timestamptz not null default now(),
  released_by uuid,
  released_at timestamptz,
  release_reason text,
  check ((scope = 'tenant' and study_id is null and document_id is null)
      or (scope = 'study' and study_id is not null and document_id is null)
      or (scope = 'document' and document_id is not null))
);
create index if not exists legal_holds_active on legal_holds (org_id) where released_at is null;

alter table legal_holds enable row level security;
revoke insert, update, delete, truncate on legal_holds from anon, authenticated;
drop policy if exists "org members read holds" on legal_holds;
create policy "org members read holds" on legal_holds for select
  using (org_id in (select org_id from user_roles where user_id = auth.uid() and is_active) and (study_id is null or can_access_study_id(study_id)));

-- Is this document covered by an active hold (organisation, its study, or itself)?
create or replace function document_on_hold(d documents) returns text
language sql stable security definer set search_path = public as $$
  select h.reason || coalesce(' (' || h.reference || ')', '') from legal_holds h
  where h.org_id = d.org_id and h.released_at is null
    and (h.scope = 'tenant'
      or (h.scope = 'document' and h.document_id = d.id)
      or (h.scope = 'study' and h.study_id in (select id from studies where org_id = d.org_id and study_id = d.study_id)))
  order by h.placed_at limit 1
$$;

create or replace function documents_legal_hold_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_hold text;
begin
  if (tg_op = 'DELETE') or (new.deleted_at is not null and old.deleted_at is null) then
    v_hold := document_on_hold(old);
    if v_hold is not null then raise exception 'This document is under legal hold (%) and cannot be deleted', v_hold; end if;
  end if;
  return coalesce(new, old);
end;
$$;
drop trigger if exists documents_legal_hold_guard on documents;
create trigger documents_legal_hold_guard before update or delete on documents for each row execute function documents_legal_hold_guard();

create or replace function place_legal_hold(p_scope text, p_study uuid, p_document uuid, p_reason text, p_reference text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_org uuid;
  v_study uuid := p_study;
  v_code text;
  v_id uuid;
  d documents;
begin
  if p_scope = 'document' then
    select * into d from documents where id = p_document and deleted_at is null;
    if not found then raise exception 'Not found' using errcode = '42501'; end if;
    v_org := d.org_id;
    select id, study_id into v_study, v_code from studies where org_id = d.org_id and study_id = d.study_id order by created_at limit 1;
  elsif p_scope = 'study' then
    select org_id, study_id into v_org, v_code from studies where id = p_study;
  elsif p_scope = 'tenant' then
    v_org := current_org_id(); v_study := null;
  else
    raise exception 'Choose organisation, study or document';
  end if;
  if v_org is null or (v_study is not null and not can_access_study_id(v_study)) then raise exception 'Not found' using errcode = '42501'; end if;
  if not has_org_permission(v_org, 'run_quality_checks') then raise exception 'Your role does not allow legal holds' using errcode = '42501'; end if;
  if length(trim(coalesce(p_reason, ''))) < 3 then raise exception 'Give the reason for the hold'; end if;
  insert into legal_holds (org_id, scope, study_id, document_id, reason, reference, placed_by)
  values (v_org, p_scope, case when p_scope = 'tenant' then null else v_study end, case when p_scope = 'document' then p_document end,
          trim(p_reason), nullif(trim(coalesce(p_reference, '')), ''), auth.uid())
  returning id into v_id;
  insert into audit_trail (user_id, org_id, action, study_id, document_id, field_changed, new_value, signature_reason)
  values (auth.uid(), v_org, 'Legal hold placed', v_code, case when p_scope = 'document' then p_document end, 'legal_hold:' || v_id,
          p_scope || coalesce(' ' || nullif(trim(coalesce(p_reference, '')), ''), ''), trim(p_reason));
  return v_id;
end;
$$;
revoke all on function place_legal_hold(text, uuid, uuid, text, text) from public, anon;
grant execute on function place_legal_hold(text, uuid, uuid, text, text) to authenticated;

create or replace function release_legal_hold(p_hold uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare
  h legal_holds;
  v_code text;
begin
  select * into h from legal_holds where id = p_hold for update;
  if not found or (h.study_id is not null and not can_access_study_id(h.study_id))
     or not exists (select 1 from user_roles where user_id = auth.uid() and org_id = h.org_id and is_active) then
    raise exception 'Not found' using errcode = '42501';
  end if;
  if not has_org_permission(h.org_id, 'run_quality_checks') then raise exception 'Your role does not allow legal holds' using errcode = '42501'; end if;
  if h.released_at is not null then raise exception 'This hold is already released'; end if;
  if length(trim(coalesce(p_reason, ''))) < 3 then raise exception 'Give the reason for releasing the hold'; end if;
  update legal_holds set released_at = now(), released_by = auth.uid(), release_reason = trim(p_reason) where id = h.id;
  select study_id into v_code from studies where id = h.study_id;
  insert into audit_trail (user_id, org_id, action, study_id, document_id, field_changed, old_value, new_value, signature_reason)
  values (auth.uid(), h.org_id, 'Legal hold released', v_code, h.document_id, 'legal_hold:' || h.id, h.reason, 'released', trim(p_reason));
end;
$$;
revoke all on function release_legal_hold(uuid, text) from public, anon;
grant execute on function release_legal_hold(uuid, text) to authenticated;

------------------------------------------------------------------------------
-- 4. Close-out and reopen (RET-03), electronic signatures
------------------------------------------------------------------------------
create or replace function sign_study_event(p_study studies, p_action text, p_meaning text, p_reauth uuid, p_purpose text, p_job uuid default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_signer user_roles;
  v_email text;
  v_sig uuid;
begin
  update reauth_proofs set used_at = now()
    where id = p_reauth and user_id = auth.uid() and purpose = p_purpose and used_at is null and expires_at > now();
  if not found then raise exception 'Re-enter your password to sign' using errcode = '42501'; end if;
  select * into v_signer from user_roles where user_id = auth.uid() and org_id = p_study.org_id and is_active limit 1;
  v_email := coalesce(jwt_email(), v_signer.email);
  insert into signature_events (org_id, kind, action, meaning, signer_id, signer_name, signer_email, study_id, export_job_id)
  values (p_study.org_id, 'signature', p_action, p_meaning, auth.uid(), coalesce(nullif(trim(v_signer.full_name), ''), v_email), v_email, p_study.id, p_job)
  returning id into v_sig;
  return v_sig;
end;
$$;
revoke all on function sign_study_event(studies, text, text, uuid, text, uuid) from public, anon, authenticated;

create or replace function close_study(p_study uuid, p_reason text, p_reauth uuid) returns integer
language plpgsql security definer set search_path = public as $$
declare
  s studies;
  v_cancelled integer;
begin
  select * into s from studies where id = p_study for update;
  if not found or not can_access_study_id(s.id) then raise exception 'Not found' using errcode = '42501'; end if;
  if not has_org_permission(s.org_id, 'invite_users') then raise exception 'Your role does not allow closing a study' using errcode = '42501'; end if;
  if s.closed_at is not null then raise exception 'This study is already closed'; end if;
  if length(trim(coalesce(p_reason, ''))) < 3 then raise exception 'Give the reason for closing the study'; end if;
  perform sign_study_event(s, 'study_closeout', 'Study TMF closed', p_reauth, 'study_closeout');
  perform set_config('app.study_lifecycle', 'on', true);
  -- Open tasks are cancelled with the reason (RET-03).
  update document_tasks set status = 'cancelled', cancel_reason = 'Study closed: ' || trim(p_reason), change_reason = 'Study closed'
    where study_id = s.id and status = 'open';
  get diagnostics v_cancelled = row_count;
  update studies set closed_at = now(), closed_by = auth.uid(), close_reason = trim(p_reason) where id = s.id;
  perform set_config('app.study_lifecycle', 'off', true);
  insert into audit_trail (user_id, org_id, action, study_id, field_changed, old_value, new_value, signature_reason)
  values (auth.uid(), s.org_id, 'Study closed (electronic signature)', s.study_id, 'studies:' || s.id, 'open',
          format('closed, read-only; %s open task(s) cancelled', v_cancelled), trim(p_reason));
  perform mark_study_dirty(s.id);
  return v_cancelled;
end;
$$;
revoke all on function close_study(uuid, text, uuid) from public, anon;
grant execute on function close_study(uuid, text, uuid) to authenticated;

create or replace function reopen_study(p_study uuid, p_reason text, p_reauth uuid) returns void
language plpgsql security definer set search_path = public as $$
declare s studies;
begin
  select * into s from studies where id = p_study for update;
  if not found or not can_access_study_id(s.id) then raise exception 'Not found' using errcode = '42501'; end if;
  if not has_org_permission(s.org_id, 'invite_users') then raise exception 'Your role does not allow reopening a study' using errcode = '42501'; end if;
  if s.closed_at is null then raise exception 'This study is not closed'; end if;
  if length(trim(coalesce(p_reason, ''))) < 3 then raise exception 'Give the reason for reopening the study'; end if;
  perform sign_study_event(s, 'study_reopen', 'Study TMF reopened', p_reauth, 'study_reopen');
  perform set_config('app.study_lifecycle', 'on', true);
  update studies set closed_at = null, closed_by = null, close_reason = null where id = s.id;
  perform set_config('app.study_lifecycle', 'off', true);
  insert into audit_trail (user_id, org_id, action, study_id, field_changed, old_value, new_value, signature_reason)
  values (auth.uid(), s.org_id, 'Study reopened (electronic signature)', s.study_id, 'studies:' || s.id, 'closed', 'open', trim(p_reason));
end;
$$;
revoke all on function reopen_study(uuid, text, uuid) from public, anon;
grant execute on function reopen_study(uuid, text, uuid) to authenticated;

------------------------------------------------------------------------------
-- 5. Archive and transfer packages (RET-04/05)
------------------------------------------------------------------------------
create or replace function create_archive_job(p_study uuid, p_kind text, p_recipient text, p_reason text, p_reauth uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  s studies;
  v_id uuid;
  v_sig uuid;
begin
  select * into s from studies where id = p_study;
  if not found or not can_access_study_id(s.id) then raise exception 'Not found' using errcode = '42501'; end if;
  if not has_org_permission(s.org_id, 'invite_users') or not has_org_permission(s.org_id, 'view_audit_trail') then
    raise exception 'Your role does not allow archive or transfer packages' using errcode = '42501';
  end if;
  if p_kind not in ('archive', 'transfer') then raise exception 'Choose archive or transfer'; end if;
  if p_kind = 'archive' and s.closed_at is null then raise exception 'Close the study before creating its end-of-study archive package'; end if;
  if p_kind = 'transfer' and length(trim(coalesce(p_recipient, ''))) < 2 then raise exception 'Name the organisation or system receiving the transfer'; end if;
  if length(trim(coalesce(p_reason, ''))) < 3 then raise exception 'Give the reason for the package'; end if;
  if exists (select 1 from export_jobs where study_id = s.id and kind = p_kind and status in ('queued', 'running')) then
    raise exception 'A package for this study is already being built';
  end if;
  insert into export_jobs (org_id, study_id, kind, options, requested_by)
  values (s.org_id, s.id, p_kind, jsonb_build_object('label', case when p_kind = 'archive' then 'End-of-study archive' else 'Transfer to ' || trim(p_recipient) end,
          'recipient', nullif(trim(coalesce(p_recipient, '')), ''), 'reason', trim(p_reason)), auth.uid())
  returning id into v_id;
  v_sig := sign_study_event(s, p_kind, 'Archive package approved', p_reauth, 'archive_approval', v_id);
  update export_jobs set options = options || jsonb_build_object('signature_event_id', v_sig) where id = v_id;
  insert into audit_trail (user_id, org_id, action, study_id, field_changed, new_value, signature_reason)
  values (auth.uid(), s.org_id, case when p_kind = 'archive' then 'Archive package approved (electronic signature)' else 'Transfer package approved (electronic signature)' end,
          s.study_id, 'export_job:' || v_id, coalesce(nullif(trim(coalesce(p_recipient, '')), ''), 'archive'), trim(p_reason));
  return v_id;
end;
$$;
revoke all on function create_archive_job(uuid, text, text, text, uuid) from public, anon;
grant execute on function create_archive_job(uuid, text, text, text, uuid) to authenticated;
