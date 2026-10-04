-- Part 7 — Workflow (File Plan), tasks, quality control and signatures.
-- Baseline: M09 WFL-01..07, M10 QC-01..05, M20 SIG-01..05 / CCP-01..02, Section 5 matrix, Appendix B.
-- Plan and decisions: docs/part7-plan.md.
--
-- * A document reaches Under Review only through submit_for_qc(), and Approved only when its
--   last QC step is accepted in complete_qc_task(). A trigger blocks every other route (D2).
-- * QC tasks are created by the server from the File Plan; owners cannot pick or skip the
--   reviewer (QC-04). Reject needs at least one coded reason and a comment (QC-02) and sends the
--   document back to Draft; resubmitting starts again at the first step (QC-05).
-- * Every QC decision needs a fresh re-authentication: the API checks the password and records
--   a single-use reauth_proofs row (service role only); complete_qc_task() consumes it, so the
--   function cannot be called around the password check (D3).
-- * Each decision writes a signature_events row — an attestation by default, or an electronic
--   signature when the organisation chooses — with signer name, server time and meaning, linked
--   to the exact file version reviewed (SIG-02, CCP-01, D4). signature_events and qc_decisions
--   are append-only; each signature is also written to the hash-chained audit_trail.

------------------------------------------------------------------------------
-- 1. Configuration: QC reasons, File Plan steps, organisation workflow settings
------------------------------------------------------------------------------

create table if not exists qc_reasons (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  code text not null check (code ~ '^[a-z0-9_]{2,40}$'),
  label text not null check (length(trim(label)) > 0),
  category text not null default 'Quality',
  weight numeric(3, 2) not null default 1 check (weight between 0 and 5),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  change_reason text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_by uuid,
  updated_at timestamptz,
  row_version integer not null default 1,
  unique (org_id, code)
);

-- The 14 Appendix B quality reasons (Timeliness factors are KPIs, not reject reasons).
-- Seeded defaults are not audited row by row (app.config_seed): a new organisation's audit
-- trail starts empty, and its creator has no role in it yet. Later edits are audited.
create or replace function seed_qc_reasons(p_org uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform set_config('app.config_seed', 'on', true);
  insert into qc_reasons (org_id, code, label, weight, sort_order)
  select p_org, r.code, r.label, r.weight, r.ord
  from (values
    ('content', 'Content', 2.0, 1), ('duplicate', 'Duplicate Document', 0.5, 2),
    ('multiple_documents', 'Multiple Documents in One', 1.0, 3), ('not_etmf', 'Not eTMF Appropriate', 2.0, 4),
    ('expired', 'Expired Document', 0.5, 5), ('missing_dates', 'Missing Dates', 1.0, 6),
    ('blank_pages', 'Blank Pages', 0.25, 7), ('formatting', 'Formatting Issues', 0.25, 8),
    ('illegible', 'Illegible', 3.0, 9), ('pagination', 'Incorrect Pagination', 0.25, 10),
    ('missing_pages', 'Missing Pages', 1.0, 11), ('incorrectly_indexed', 'Incorrectly Indexed', 2.0, 12),
    ('unsigned', 'Unsigned', 2.0, 13), ('other', 'Other', 1.0, 14)
  ) as r(code, label, weight, ord)
  on conflict (org_id, code) do nothing;
  perform set_config('app.config_seed', 'off', true);
end;
$$;
revoke all on function seed_qc_reasons(uuid) from public, anon, authenticated;

create or replace function organizations_seed_qc_reasons() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform seed_qc_reasons(new.id);
  return new;
end;
$$;
drop trigger if exists organizations_seed_qc_reasons on organizations;
create trigger organizations_seed_qc_reasons after insert on organizations
  for each row execute function organizations_seed_qc_reasons();

select seed_qc_reasons(id) from organizations;

-- File Plan (WFL-01): ordered QC steps per artifact; artifact_num null = the organisation default.
-- With no steps configured, every document gets one Inbound QC step (5 days, approvers).
create table if not exists file_plan_steps (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  artifact_num text,
  position integer not null check (position between 1 and 10),
  step_type text not null check (step_type in ('inbound_qc', 'post_approval_qc')),
  assignee_role text,                    -- null = anyone whose role may approve documents
  duration_days integer not null default 5 check (duration_days between 1 and 365),
  is_active boolean not null default true,
  change_reason text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_by uuid,
  updated_at timestamptz,
  row_version integer not null default 1
);
create unique index if not exists file_plan_steps_position
  on file_plan_steps (org_id, coalesce(artifact_num, ''), position) where is_active;

-- Organisation workflow settings (D1): QC decisions as attestation (default) or e-signature.
create table if not exists workflow_settings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null unique references organizations(id),
  qc_control text not null default 'attestation' check (qc_control in ('attestation', 'signature')),
  change_reason text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_by uuid,
  updated_at timestamptz,
  row_version integer not null default 1
);

-- Like structure_before_insert, but keeps the org_id given: these rows are seeded for a new
-- organisation by whoever creates it, and RLS already limits users to their own organisation.
create or replace function config_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.org_id is null then
    raise exception 'org_id is required on %', tg_table_name;
  end if;
  new.created_by := auth.uid();
  new.created_at := now();
  new.row_version := 1;
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['qc_reasons', 'file_plan_steps', 'workflow_settings'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "org members read" on %I', t);
    execute format('drop policy if exists "quality leads add" on %I', t);
    execute format('drop policy if exists "quality leads change" on %I', t);
    execute format($p$create policy "org members read" on %I for select
      using (org_id in (select org_id from user_roles where user_id = auth.uid() and is_active))$p$, t);
    -- Configuration changes are kept (is_active), never deleted.
    execute format($p$create policy "quality leads add" on %I for insert
      with check (has_org_permission(org_id, 'run_quality_checks'))$p$, t);
    execute format($p$create policy "quality leads change" on %I for update
      using (has_org_permission(org_id, 'run_quality_checks'))
      with check (has_org_permission(org_id, 'run_quality_checks'))$p$, t);
    execute format('drop trigger if exists %I on %I', t || '_before_insert', t);
    execute format('create trigger %I before insert on %I for each row execute function config_before_insert()', t || '_before_insert', t);
    execute format('drop trigger if exists %I on %I', t || '_before_update', t);
    execute format('create trigger %I before update on %I for each row execute function structure_before_update()', t || '_before_update', t);
    execute format('drop trigger if exists %I on %I', t || '_audit', t);
    execute format($p$create trigger %I after insert or update on %I for each row
      when (coalesce(current_setting('app.config_seed', true), '') <> 'on') execute function structure_audit()$p$, t || '_audit', t);
  end loop;
end $$;

-- Replaces an artifact's (or the default) File Plan in one step; old steps are kept inactive.
-- p_steps: [{"step_type": "inbound_qc", "assignee_role": null, "duration_days": 5}, ...] in order.
create or replace function set_file_plan(p_artifact text, p_steps jsonb, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_org uuid := current_org_id();
  v_step jsonb;
  v_pos integer := 0;
begin
  if not has_org_permission(v_org, 'run_quality_checks') then
    raise exception 'Your role does not allow changing the File Plan' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_reason, ''))) < 3 then raise exception 'Give a reason for the change'; end if;
  if jsonb_typeof(p_steps) <> 'array' or jsonb_array_length(p_steps) > 10 then
    raise exception 'A File Plan has at most 10 steps';
  end if;
  update file_plan_steps set is_active = false, change_reason = trim(p_reason)
    where org_id = v_org and artifact_num is not distinct from nullif(trim(p_artifact), '') and is_active;
  for v_step in select * from jsonb_array_elements(p_steps) loop
    v_pos := v_pos + 1;
    if v_step ->> 'assignee_role' is not null and not exists (
         select 1 from role_permissions where role = v_step ->> 'assignee_role' and permission = 'approve_document') then
      raise exception 'Role % cannot approve documents', v_step ->> 'assignee_role';
    end if;
    insert into file_plan_steps (org_id, artifact_num, position, step_type, assignee_role, duration_days, change_reason)
    values (v_org, nullif(trim(p_artifact), ''), v_pos, v_step ->> 'step_type', v_step ->> 'assignee_role',
            coalesce((v_step ->> 'duration_days')::integer, 5), trim(p_reason));
  end loop;
end;
$$;
revoke all on function set_file_plan(text, jsonb, text) from public, anon;
grant execute on function set_file_plan(text, jsonb, text) to authenticated;

------------------------------------------------------------------------------
-- 2. Tasks, decisions, signatures, re-authentication proofs
------------------------------------------------------------------------------

create table if not exists document_tasks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  study_id uuid not null references studies(id),
  document_id uuid not null references documents(id),
  file_version_id uuid references document_file_versions(id),
  task_type text not null check (task_type in ('inbound_qc', 'post_approval_qc')),
  position integer not null,
  cycle integer not null default 1,      -- 1 + number of earlier rejections
  assignee_role text,                    -- null = anyone who may approve documents
  assignee_user uuid references auth.users(id),
  due_at timestamptz not null,
  status text not null default 'open' check (status in ('open', 'completed', 'cancelled')),
  outcome text check (outcome in ('accept', 'reject')),
  completed_by uuid,
  completed_at timestamptz,
  cancel_reason text,
  change_reason text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_by uuid,
  updated_at timestamptz,
  row_version integer not null default 1,
  check (status <> 'completed' or (outcome is not null and completed_by is not null and completed_at is not null)),
  check (status <> 'cancelled' or length(trim(coalesce(cancel_reason, ''))) > 0)
);
create index if not exists document_tasks_open on document_tasks (study_id, status, due_at);
create index if not exists document_tasks_document on document_tasks (document_id, created_at);
-- One open task per document at a time.
create unique index if not exists document_tasks_one_open on document_tasks (document_id) where status = 'open';

create table if not exists qc_decisions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  task_id uuid not null references document_tasks(id),
  document_id uuid not null references documents(id),
  outcome text not null check (outcome in ('accept', 'reject')),
  reason_codes text[] not null default '{}',
  comment text,
  signature_event_id uuid not null,
  decided_by uuid not null,
  decided_at timestamptz not null default now(),
  check (outcome = 'accept' or (cardinality(reason_codes) > 0 and length(trim(coalesce(comment, ''))) > 0))
);
create index if not exists qc_decisions_document on qc_decisions (document_id, decided_at);

create table if not exists signature_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  kind text not null check (kind in ('attestation', 'signature')),
  action text not null,
  meaning text not null,
  signer_id uuid not null,
  signer_name text not null,
  signer_email text not null,
  document_id uuid references documents(id),
  file_version_id uuid references document_file_versions(id),
  file_hash text,
  task_id uuid references document_tasks(id),
  auth_method text not null default 'password',
  signed_at timestamptz not null default now()
);
create index if not exists signature_events_document on signature_events (document_id, signed_at);

-- Written by the API (service role) right after it re-checks the user's password.
create table if not exists reauth_proofs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  purpose text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '2 minutes',
  used_at timestamptz
);
alter table reauth_proofs enable row level security;   -- no policies: service role only
revoke all on reauth_proofs from anon, authenticated;

alter table document_tasks enable row level security;
drop policy if exists "study members read tasks" on document_tasks;
create policy "study members read tasks" on document_tasks for select
  using (org_id in (select org_id from user_roles where user_id = auth.uid() and is_active)
         and can_access_study_id(study_id));
-- No insert/update policies: tasks change only inside the workflow functions below.

drop trigger if exists document_tasks_before_insert on document_tasks;
create trigger document_tasks_before_insert before insert on document_tasks
  for each row execute function structure_before_insert();
drop trigger if exists document_tasks_before_update on document_tasks;
create trigger document_tasks_before_update before update on document_tasks
  for each row execute function structure_before_update();
drop trigger if exists document_tasks_audit on document_tasks;
create trigger document_tasks_audit after insert or update on document_tasks
  for each row execute function structure_audit();

-- Decisions and signatures are readable with the document they belong to (documents RLS applies).
alter table qc_decisions enable row level security;
drop policy if exists "readable with the document" on qc_decisions;
create policy "readable with the document" on qc_decisions for select
  using (exists (select 1 from documents d where d.id = document_id));
alter table signature_events enable row level security;
drop policy if exists "readable with the document" on signature_events;
create policy "readable with the document" on signature_events for select
  using (exists (select 1 from documents d where d.id = document_id));

create or replace function append_only() returns trigger
language plpgsql set search_path = public as $$
begin
  raise exception '% is append-only: % is not allowed', tg_table_name, tg_op;
end;
$$;
drop trigger if exists qc_decisions_append_only on qc_decisions;
create trigger qc_decisions_append_only before update or delete on qc_decisions
  for each row execute function append_only();
drop trigger if exists signature_events_append_only on signature_events;
create trigger signature_events_append_only before update or delete on signature_events
  for each row execute function append_only();
drop trigger if exists signature_events_no_truncate on signature_events;
create trigger signature_events_no_truncate before truncate on signature_events
  for each statement execute function append_only();
drop trigger if exists qc_decisions_no_truncate on qc_decisions;
create trigger qc_decisions_no_truncate before truncate on qc_decisions
  for each statement execute function append_only();

------------------------------------------------------------------------------
-- 3. Status changes only through the workflow (D2)
------------------------------------------------------------------------------

create or replace function documents_workflow_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  -- A restored document's QC task was cancelled when it was deleted: it comes back as Draft.
  if tg_op = 'UPDATE' and old.deleted_at is not null and new.deleted_at is null and new.status = 'Under Review' then
    new.status := 'Draft';
  end if;
  if auth.uid() is null or coalesce(current_setting('app.qc_workflow', true), '') = 'on' then
    return new;   -- service role, migrations, or the workflow functions themselves
  end if;
  if tg_op = 'INSERT' then
    if coalesce(new.status, 'Draft') <> 'Draft' then
      raise exception 'New documents start as Draft; submit them for QC to have them approved' using errcode = '42501';
    end if;
    return new;
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
-- "w" sorts after the other documents triggers, so it sees the final values.
drop trigger if exists documents_workflow_guard on documents;
create trigger documents_workflow_guard before insert or update on documents
  for each row execute function documents_workflow_guard();

-- Deleting or archiving a document closes its open QC task.
create or replace function documents_close_tasks() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (new.deleted_at is not null and old.deleted_at is null)
     or (new.status = 'Archived' and old.status is distinct from 'Archived') then
    update document_tasks set status = 'cancelled',
      cancel_reason = case when new.deleted_at is not null then 'Document deleted' else 'Document archived' end
    where document_id = new.id and status = 'open';
  end if;
  return new;
end;
$$;
drop trigger if exists documents_close_tasks on documents;
create trigger documents_close_tasks after update on documents
  for each row execute function documents_close_tasks();

------------------------------------------------------------------------------
-- 4. Workflow functions
------------------------------------------------------------------------------

-- The File Plan for an artifact: its own steps, else the organisation default, else one Inbound QC step.
create or replace function file_plan_for(p_org uuid, p_artifact text)
returns table (step_position integer, step_type text, assignee_role text, duration_days integer)
language sql stable security definer set search_path = public as $$
  with own as (
    select s.position, s.step_type, s.assignee_role, s.duration_days from file_plan_steps s
    where s.org_id = p_org and s.is_active and s.artifact_num = p_artifact
  ), dflt as (
    select s.position, s.step_type, s.assignee_role, s.duration_days from file_plan_steps s
    where s.org_id = p_org and s.is_active and s.artifact_num is null
  )
  select * from own
  union all select * from dflt where not exists (select 1 from own)
  union all select 1, 'inbound_qc', null::text, 5 where not exists (select 1 from own) and not exists (select 1 from dflt)
  order by 1
$$;
revoke all on function file_plan_for(uuid, text) from public, anon;
grant execute on function file_plan_for(uuid, text) to authenticated;

-- Opens the task for one File Plan step; returns its id, or null when the plan has no such step.
create or replace function open_qc_task(p_doc documents, p_study uuid, p_after integer, p_cycle integer)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_step record;
  v_version uuid;
  v_task uuid;
begin
  select * into v_step from file_plan_for(p_doc.org_id, p_doc.artifact_num) f where f.step_position > p_after order by f.step_position limit 1;
  if not found then return null; end if;
  select id into v_version from document_file_versions where document_id = p_doc.id order by version_no desc limit 1;
  insert into document_tasks (org_id, study_id, document_id, file_version_id, task_type, position, cycle, assignee_role, due_at)
  values (p_doc.org_id, p_study, p_doc.id, v_version, v_step.step_type, v_step.step_position, p_cycle, v_step.assignee_role,
          now() + make_interval(days => v_step.duration_days))
  returning id into v_task;
  return v_task;
end;
$$;
revoke all on function open_qc_task(documents, uuid, integer, integer) from public, anon, authenticated;

-- The study row and access check shared by the functions below; raises "Not found" otherwise.
create or replace function workflow_study(p_doc documents) returns uuid
language plpgsql stable security definer set search_path = public as $$
declare v_study uuid;
begin
  select s.id into v_study from studies s where s.org_id = p_doc.org_id and s.study_id = p_doc.study_id order by s.created_at limit 1;
  if v_study is null
     or not exists (select 1 from user_roles where user_id = auth.uid() and org_id = p_doc.org_id and is_active)
     or not can_access_study(auth.uid(), p_doc.study_id, p_doc.org_id) then
    raise exception 'Not found' using errcode = '42501';
  end if;
  return v_study;
end;
$$;
revoke all on function workflow_study(documents) from public, anon, authenticated;

-- Draft → Under Review and the first QC task (WFL-03 "Filed" → Inbound QC).
create or replace function submit_for_qc(p_document uuid, p_comment text default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  d documents;
  v_study uuid;
  v_cycle integer;
  v_task uuid;
begin
  select * into d from documents where id = p_document for update;
  if not found then raise exception 'Not found' using errcode = '42501'; end if;
  v_study := workflow_study(d);
  if not has_org_permission(d.org_id, 'submit_document') then
    raise exception 'Your role does not allow submitting documents for QC' using errcode = '42501';
  end if;
  if d.deleted_at is not null or d.status is distinct from 'Draft' then
    raise exception 'Only Draft documents can be submitted for QC (this one is %)', coalesce(d.status, 'unknown');
  end if;
  if d.file_path is null then
    raise exception 'Attach the file before submitting for QC';
  end if;

  select coalesce(max(cycle), 0) + 1 into v_cycle from document_tasks where document_id = d.id;
  perform set_config('app.qc_workflow', 'on', true);
  update documents set status = 'Under Review', submission_reason = nullif(trim(coalesce(p_comment, '')), '')
    where id = d.id;
  v_task := open_qc_task(d, v_study, 0, v_cycle);
  perform set_config('app.qc_workflow', 'off', true);

  insert into audit_trail (user_id, org_id, action, document_id, study_id, field_changed, old_value, new_value, signature_reason, document_name)
  values (auth.uid(), d.org_id, 'Document submitted for QC', d.id, d.study_id, 'status', 'Draft', 'Under Review',
          nullif(trim(coalesce(p_comment, '')), ''), coalesce(nullif(trim(d.custom_file_name), ''), d.artifact_name));
  return v_task;
end;
$$;
revoke all on function submit_for_qc(uuid, text) from public, anon;
grant execute on function submit_for_qc(uuid, text) to authenticated;

-- May the signed-in user act on this task? Named user, the named role, or (no role) an approver.
create or replace function can_work_task(t document_tasks) returns boolean
language sql stable security definer set search_path = public as $$
  select has_org_permission(t.org_id, 'approve_document')
     and (t.assignee_user is null or t.assignee_user = auth.uid())
     and (t.assignee_role is null or exists (
           select 1 from user_roles where user_id = auth.uid() and org_id = t.org_id and is_active and role = t.assignee_role))
$$;
revoke all on function can_work_task(document_tasks) from public, anon;
grant execute on function can_work_task(document_tasks) to authenticated;

-- Accept or reject a QC task (QC-02..05, SIG-02). p_reauth comes from the API's password check.
create or replace function complete_qc_task(p_task uuid, p_outcome text, p_reason_codes text[], p_comment text, p_reauth uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  t document_tasks;
  d documents;
  v_study uuid;
  v_signer user_roles;
  v_email text;
  v_control text;
  v_meaning text;
  v_version document_file_versions;
  v_sig uuid;
  v_next uuid;
  v_labels text;
  v_bad text[];
  v_comment text := nullif(trim(coalesce(p_comment, '')), '');
  v_name text;
begin
  select * into t from document_tasks where id = p_task for update;
  if not found then raise exception 'Not found' using errcode = '42501'; end if;
  select * into d from documents where id = t.document_id for update;
  v_study := workflow_study(d);
  if t.status <> 'open' then
    raise exception 'This task is already %', t.status;
  end if;
  if not can_work_task(t) then
    raise exception 'This task is assigned to someone else' using errcode = '42501';
  end if;
  if p_outcome not in ('accept', 'reject') then
    raise exception 'Choose Accept or Reject';
  end if;
  if p_outcome = 'reject' then
    if not has_org_permission(t.org_id, 'reject_document') then
      raise exception 'Your role does not allow rejecting documents' using errcode = '42501';
    end if;
    if coalesce(cardinality(p_reason_codes), 0) = 0 or v_comment is null then
      raise exception 'A rejection needs at least one reason and a comment';
    end if;
    select array_agg(c) into v_bad from unnest(p_reason_codes) c
      where not exists (select 1 from qc_reasons r where r.org_id = t.org_id and r.code = c and r.is_active);
    if v_bad is not null then
      raise exception 'Unknown QC reason: %', array_to_string(v_bad, ', ');
    end if;
  end if;

  -- The reviewed file must still be the document's current file.
  select * into v_version from document_file_versions where document_id = d.id order by version_no desc limit 1;
  if t.file_version_id is distinct from v_version.id then
    raise exception 'The file changed after this task was created; it needs a new QC task';
  end if;

  -- Single-use proof that the API re-checked this user's password in the last two minutes.
  update reauth_proofs set used_at = now()
    where id = p_reauth and user_id = auth.uid() and purpose = 'qc_decision' and used_at is null and expires_at > now();
  if not found then
    raise exception 'Re-enter your password to confirm this decision' using errcode = '42501';
  end if;

  select * into v_signer from user_roles where user_id = auth.uid() and org_id = t.org_id and is_active limit 1;
  v_email := coalesce(jwt_email(), v_signer.email);
  v_name := coalesce(nullif(trim(v_signer.full_name), ''), v_email);
  select coalesce((select qc_control from workflow_settings where org_id = t.org_id), 'attestation') into v_control;
  v_meaning := case when p_outcome = 'accept' then 'Reviewed and accepted' else 'Reviewed and rejected' end;

  insert into signature_events (org_id, kind, action, meaning, signer_id, signer_name, signer_email,
                                document_id, file_version_id, file_hash, task_id)
  values (t.org_id, v_control, t.task_type, v_meaning, auth.uid(), v_name, v_email,
          d.id, v_version.id, v_version.file_hash, t.id)
  returning id into v_sig;

  insert into qc_decisions (org_id, task_id, document_id, outcome, reason_codes, comment, signature_event_id, decided_by)
  values (t.org_id, t.id, d.id, p_outcome, coalesce(p_reason_codes, '{}'), v_comment, v_sig, auth.uid());

  perform set_config('app.qc_workflow', 'on', true);
  update document_tasks set status = 'completed', outcome = p_outcome, completed_by = auth.uid(), completed_at = now(),
    change_reason = v_comment
    where id = t.id;

  if p_outcome = 'accept' then
    v_next := open_qc_task(d, v_study, t.position, t.cycle);
    if v_next is null then
      update documents set status = 'Approved', approved_by = v_email, approved_at = now_iso(), signature_reason = v_meaning
        where id = d.id;
    end if;
  else
    select string_agg(r.label, ', ' order by r.sort_order) into v_labels
      from qc_reasons r where r.org_id = t.org_id and r.code = any (p_reason_codes);
    update documents set status = 'Draft', rejection_reason = v_labels || ' — ' || v_comment,
      rejected_by = v_email, rejected_at = now_iso()
      where id = d.id;
  end if;
  perform set_config('app.qc_workflow', 'off', true);

  -- The signature in the hash-chained audit trail (SIG-02 manifestation: name, time, meaning).
  insert into audit_trail (user_id, org_id, action, document_id, study_id, field_changed, old_value, new_value, signature_reason, document_name)
  values (auth.uid(), t.org_id,
          case when p_outcome = 'accept' then 'QC accepted' else 'QC rejected' end || ' (' || v_control || ')',
          d.id, d.study_id, 'status', 'Under Review',
          case when p_outcome = 'reject' then 'Draft' when v_next is null then 'Approved' else 'Under Review' end,
          v_meaning || ' by ' || v_name || coalesce(' — ' || v_labels, '') || coalesce(': ' || v_comment, ''),
          coalesce(nullif(trim(d.custom_file_name), ''), d.artifact_name));

  return jsonb_build_object(
    'signature_event_id', v_sig,
    'next_task_id', v_next,
    'document_status', case when p_outcome = 'reject' then 'Draft' when v_next is null then 'Approved' else 'Under Review' end);
end;
$$;
revoke all on function complete_qc_task(uuid, text, text[], text, uuid) from public, anon;
grant execute on function complete_qc_task(uuid, text, text[], text, uuid) to authenticated;

-- Reassign an open task to a named approver or a role (WFL-05 Reassign). Needs a reason.
create or replace function reassign_qc_task(p_task uuid, p_user uuid, p_role text, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare
  t document_tasks;
  d documents;
begin
  select * into t from document_tasks where id = p_task for update;
  if not found then raise exception 'Not found' using errcode = '42501'; end if;
  select * into d from documents where id = t.document_id;
  perform workflow_study(d);
  if not has_org_permission(t.org_id, 'approve_document') then
    raise exception 'Your role does not allow reassigning QC tasks' using errcode = '42501';
  end if;
  if t.status <> 'open' then raise exception 'This task is already %', t.status; end if;
  if length(trim(coalesce(p_reason, ''))) < 3 then raise exception 'Give a reason for reassigning'; end if;
  if (p_user is null) = (p_role is null) then raise exception 'Choose either a person or a role'; end if;
  if p_user is not null and not exists (
       select 1 from user_roles ur join role_permissions rp on rp.role = ur.role and rp.permission = 'approve_document'
       where ur.user_id = p_user and ur.org_id = t.org_id and ur.is_active) then
    raise exception 'That person cannot approve documents';
  end if;
  if p_role is not null and not exists (select 1 from role_permissions where role = p_role and permission = 'approve_document') then
    raise exception 'That role cannot approve documents';
  end if;
  update document_tasks set assignee_user = p_user, assignee_role = p_role, change_reason = trim(p_reason) where id = t.id;
end;
$$;
revoke all on function reassign_qc_task(uuid, uuid, text, text) from public, anon;
grant execute on function reassign_qc_task(uuid, uuid, text, text) to authenticated;

-- Send a Draft or Under Review document back to its owner outside a QC decision (e.g. a flag
-- raised from Trinity). Approved documents need post-filing operations (Part 8) instead.
create or replace function return_for_rework(p_document uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare
  d documents;
  v_email text := jwt_email();
begin
  select * into d from documents where id = p_document for update;
  if not found then raise exception 'Not found' using errcode = '42501'; end if;
  perform workflow_study(d);
  if not has_org_permission(d.org_id, 'reject_document') then
    raise exception 'Your role does not allow returning documents' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_reason, ''))) < 3 then raise exception 'Give a reason'; end if;
  if d.deleted_at is not null or d.status not in ('Draft', 'Under Review') then
    raise exception 'Only Draft or Under Review documents can be returned (this one is %)', d.status;
  end if;

  perform set_config('app.qc_workflow', 'on', true);
  update document_tasks set status = 'cancelled', cancel_reason = 'Returned for rework: ' || trim(p_reason)
    where document_id = d.id and status = 'open';
  update documents set status = 'Draft', rejection_reason = trim(p_reason), rejected_by = v_email, rejected_at = now_iso()
    where id = d.id;
  perform set_config('app.qc_workflow', 'off', true);

  insert into audit_trail (user_id, org_id, action, document_id, study_id, field_changed, old_value, new_value, signature_reason, document_name)
  values (auth.uid(), d.org_id, 'Document returned for rework', d.id, d.study_id, 'status', d.status, 'Draft', trim(p_reason),
          coalesce(nullif(trim(d.custom_file_name), ''), d.artifact_name));
end;
$$;
revoke all on function return_for_rework(uuid, text) from public, anon;
grant execute on function return_for_rework(uuid, text) to authenticated;

------------------------------------------------------------------------------
-- 5. Documents already Under Review get their Inbound QC task
------------------------------------------------------------------------------

do $$
declare
  d documents;
  v_study uuid;
begin
  for d in select * from documents where status = 'Under Review' and deleted_at is null
           and not exists (select 1 from document_tasks t where t.document_id = documents.id and t.status = 'open') loop
    select id into v_study from studies where org_id = d.org_id and study_id = d.study_id order by created_at limit 1;
    if v_study is not null then
      perform open_qc_task(d, v_study, 0, 1);
    end if;
  end loop;
end $$;
