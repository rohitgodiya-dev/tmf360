-- Part 9 — Consistency engine and continuous readiness. Baseline 13.1 (Rule → Finding), M19 HLT-01..08.
-- Plan and decisions: docs/part9-plan.md.
--
-- * rules: the catalogue (stable code + version, dimension, severity, explanation, suggested action).
--   Evaluators are code (evaluate_study), not an admin-built rules engine (13.1).
-- * findings: what the rules found, per study, each pointing at the records that caused it, with
--   the rule version and the priority factors (criticality × severity × overdue × scope, HLT-08).
--   A finding stays open until its condition clears (resolved automatically) or someone accepts
--   it with a reason. Evaluation is derived data and is not written to the audit trail.
-- * Continuous readiness: changes to documents, expected artifacts, QC tasks, milestones and
--   sites mark the study dirty (study_health_state); the Health page re-evaluates dirty studies,
--   a daily job re-evaluates every study and stores a snapshot for trends (HLT-06).
-- * health_thresholds: per-organisation amber/red thresholds for the health indicators (HLT-04).

------------------------------------------------------------------------------
-- 1. Rule catalogue
------------------------------------------------------------------------------
create table if not exists rules (
  code text primary key,
  version integer not null default 1,
  name text not null,
  dimension text not null check (dimension in ('completeness', 'timeliness', 'quality', 'consistency')),
  severity text not null check (severity in ('high', 'medium', 'low')),
  description text not null,
  suggested_action text not null,
  is_active boolean not null default true
);
alter table rules enable row level security;
drop policy if exists "rules readable" on rules;
create policy "rules readable" on rules for select to authenticated using (true);
revoke insert, update, delete, truncate on rules from anon, authenticated;

insert into rules (code, version, name, dimension, severity, description, suggested_action) values
  ('RUL-EXPIRED-DOC', 1, 'Expired document', 'quality', 'high', 'A current Final document''s expiry date has passed.', 'File the renewed document (e.g. updated CV or licence) and archive the expired one.'),
  ('RUL-EXPIRING-SOON', 1, 'Document expiring soon', 'timeliness', 'low', 'A current Final document expires within 30 days.', 'Request the renewed document from its owner before it expires.'),
  ('RUL-MISSING-OVERDUE', 1, 'Expected document overdue', 'completeness', 'high', 'An expected artifact is past its due date and not filed.', 'File the document through Document Intake, or mark the expected artifact not needed with a reason.'),
  ('RUL-SITE-ACTIVE-MISSING', 1, 'Active site with missing documents', 'consistency', 'high', 'A site is active (ongoing) while expected documents for it are still not filed.', 'File the site''s outstanding documents; essential documents should be in place before activation.'),
  ('RUL-UNVERIFIED-FILE', 1, 'File integrity not verified', 'quality', 'high', 'A Final document''s current file has not passed the server integrity check.', 'Run the integrity check; if it fails, file a correct copy through a revision.'),
  ('RUL-QC-OVERDUE', 1, 'QC task overdue', 'timeliness', 'medium', 'A QC task is past its due date.', 'Complete the QC task or reassign it.'),
  ('RUL-INCOMPLETE-RECORD', 1, 'Record without a file', 'completeness', 'medium', 'A record has had no file attached for more than 14 days.', 'Attach the file, or delete the record with a reason.'),
  ('RUL-DATE-ORDER', 1, 'Effective date after expiry date', 'consistency', 'medium', 'The document''s effective date is later than its expiry date.', 'Correct the dates (a revision request for Final documents).'),
  ('RUL-DUPLICATE-FINAL', 1, 'Same file filed twice', 'consistency', 'medium', 'Two or more current Final documents have the same file.', 'Keep one and request deletion of the others with reason Incorrectly Indexed.'),
  ('RUL-REVISION-STALLED', 1, 'Revision stalled', 'timeliness', 'medium', 'A revision started more than 30 days ago is still Draft.', 'Upload the revised file and submit it for QC.'),
  ('RUL-QC-REJECTION-PATTERN', 1, 'Repeated QC rejections', 'quality', 'medium', 'Three or more QC rejections for the same reason in the last 90 days.', 'Address the root cause with the teams filing these documents (training, templates).'),
  ('RUL-STALE-DRAFT', 1, 'Draft not submitted', 'timeliness', 'low', 'A Draft with a file has not been submitted for QC for 30 days.', 'Submit it for QC, or delete it if it is not needed.'),
  ('RUL-FUTURE-EFFECTIVE', 1, 'Effective date in the future', 'consistency', 'low', 'A Final document''s effective date is in the future.', 'Check the date; correct it with a revision request if it is wrong.')
on conflict (code) do update set version = excluded.version, name = excluded.name, dimension = excluded.dimension, severity = excluded.severity,
  description = excluded.description, suggested_action = excluded.suggested_action;

------------------------------------------------------------------------------
-- 2. Findings, health state, thresholds, snapshots
------------------------------------------------------------------------------
create table if not exists findings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  study_id uuid not null references studies(id),
  rule_code text not null references rules(code),
  rule_version integer not null,
  fingerprint text not null,
  document_id uuid references documents(id),
  placeholder_id uuid references placeholders(id),
  task_id uuid references document_tasks(id),
  study_country_id uuid references study_countries(id),
  study_site_id uuid references study_sites(id),
  artifact_num text,
  explanation text not null,
  criticality numeric not null,
  severity_weight numeric not null,
  overdue_days integer not null default 0,
  overdue_factor numeric not null,
  scope_count integer not null default 1,
  scope_factor numeric not null,
  priority numeric not null,
  status text not null default 'open' check (status in ('open', 'resolved', 'accepted')),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  resolved_at timestamptz,
  accepted_by uuid,
  accepted_at timestamptz,
  accepted_reason text,
  assigned_to uuid references auth.users(id),
  assigned_by uuid,
  assigned_at timestamptz,
  check (status <> 'accepted' or length(trim(coalesce(accepted_reason, ''))) >= 3)
);
create unique index if not exists findings_current on findings (study_id, fingerprint) where status in ('open', 'accepted');
create index if not exists findings_study on findings (study_id, status, priority desc);

create table if not exists study_health_state (
  study_id uuid primary key references studies(id),
  org_id uuid not null references organizations(id),
  dirty_at timestamptz not null default now(),
  evaluated_at timestamptz
);

create table if not exists health_thresholds (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  indicator text not null,
  amber numeric not null,
  red numeric not null,
  change_reason text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_by uuid,
  updated_at timestamptz,
  row_version integer not null default 1,
  unique (org_id, indicator)
);

create table if not exists health_snapshots (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  study_id uuid not null references studies(id),
  taken_on date not null default current_date,
  indicators jsonb not null,
  created_at timestamptz not null default now(),
  unique (study_id, taken_on)
);

alter table findings enable row level security;
alter table study_health_state enable row level security;
alter table health_snapshots enable row level security;
alter table health_thresholds enable row level security;
drop policy if exists "study members read findings" on findings;
create policy "study members read findings" on findings for select
  using (org_id in (select org_id from user_roles where user_id = auth.uid() and is_active) and can_access_study_id(study_id));
drop policy if exists "study members read health state" on study_health_state;
create policy "study members read health state" on study_health_state for select
  using (org_id in (select org_id from user_roles where user_id = auth.uid() and is_active) and can_access_study_id(study_id));
drop policy if exists "study members read snapshots" on health_snapshots;
create policy "study members read snapshots" on health_snapshots for select
  using (org_id in (select org_id from user_roles where user_id = auth.uid() and is_active) and can_access_study_id(study_id));
drop policy if exists "org members read" on health_thresholds;
drop policy if exists "quality leads add" on health_thresholds;
drop policy if exists "quality leads change" on health_thresholds;
create policy "org members read" on health_thresholds for select
  using (org_id in (select org_id from user_roles where user_id = auth.uid() and is_active));
create policy "quality leads add" on health_thresholds for insert with check (has_org_permission(org_id, 'run_quality_checks'));
create policy "quality leads change" on health_thresholds for update
  using (has_org_permission(org_id, 'run_quality_checks')) with check (has_org_permission(org_id, 'run_quality_checks'));
drop trigger if exists health_thresholds_before_insert on health_thresholds;
create trigger health_thresholds_before_insert before insert on health_thresholds for each row execute function config_before_insert();
drop trigger if exists health_thresholds_before_update on health_thresholds;
create trigger health_thresholds_before_update before update on health_thresholds for each row execute function structure_before_update();
drop trigger if exists health_thresholds_audit on health_thresholds;
create trigger health_thresholds_audit after insert or update on health_thresholds for each row execute function structure_audit();

------------------------------------------------------------------------------
-- 3. Dirty tracking (continuous readiness)
------------------------------------------------------------------------------
create or replace function mark_study_dirty(p_study uuid) returns void
language sql security definer set search_path = public as $$
  insert into study_health_state (study_id, org_id, dirty_at)
  select s.id, s.org_id, now() from studies s where s.id = p_study
  on conflict (study_id) do update set dirty_at = now();
$$;
revoke all on function mark_study_dirty(uuid) from public, anon, authenticated;

create or replace function health_mark_dirty() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  r record := coalesce(new, old);
  v_study uuid;
begin
  if tg_table_name = 'documents' then
    select id into v_study from studies where org_id = r.org_id and study_id = (to_jsonb(r) ->> 'study_id') order by created_at limit 1;
  else
    v_study := (to_jsonb(r) ->> 'study_id')::uuid;
  end if;
  if v_study is not null then perform mark_study_dirty(v_study); end if;
  return null;
end;
$$;
do $$
declare t text;
begin
  foreach t in array array['documents', 'placeholders', 'document_tasks', 'milestones', 'study_sites'] loop
    execute format('drop trigger if exists %I on %I', 'zz_health_dirty', t);
    execute format('create trigger %I after insert or update or delete on %I for each row execute function health_mark_dirty()', 'zz_health_dirty', t);
  end loop;
end $$;

------------------------------------------------------------------------------
-- 4. Evaluation
------------------------------------------------------------------------------
create or replace function safe_date(p text) returns date language sql immutable as $$
  select case when p ~ '^\d{4}-\d{2}-\d{2}$' then p::date end
$$;

-- Evaluates every active rule for one study and reconciles its findings: new conditions open
-- findings, persisting ones are refreshed, cleared ones are resolved. Returns the open count.
-- Users may run it for studies they can access; the daily job runs it as the service role.
create or replace function evaluate_study(p_study uuid) returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_org uuid;
  v_code text;
  v_open integer;
begin
  select org_id, study_id into v_org, v_code from studies where id = p_study;
  if v_org is null then raise exception 'Not found' using errcode = '42501'; end if;
  if auth.uid() is not null and not can_access_study_id(p_study) then raise exception 'Not found' using errcode = '42501'; end if;

  create temp table if not exists _cand (
    fingerprint text, rule_code text, document_id uuid, placeholder_id uuid, task_id uuid,
    study_country_id uuid, study_site_id uuid, artifact_num text, overdue_days integer, scope_count integer, explanation text
  ) on commit drop;
  delete from _cand where true;   -- pg_safeupdate requires a WHERE clause

  with docs as (
    select d.*, coalesce(nullif(trim(d.custom_file_name), ''), d.file_name, d.artifact_name) as title,
           case when ss.id is not null then ' at site ' || ss.site_number when sc.id is not null then ' in ' || sc.country_code else '' end as where_txt
    from documents d
    left join study_sites ss on ss.id = d.study_site_id
    left join study_countries sc on sc.id = d.study_country_id
    where d.org_id = v_org and d.study_id = v_code and d.deleted_at is null and d.archived_at is null and d.status is distinct from 'Archived'
  )
  insert into _cand
  -- Expired / expiring Final documents
  select 'EXP:' || id, 'RUL-EXPIRED-DOC', id, null::uuid, null::uuid, study_country_id, study_site_id, artifact_num,
         current_date - safe_date(expiry_date), 1,
         format('%s (%s)%s expired on %s, %s days ago.', title, artifact_num, where_txt, expiry_date, current_date - safe_date(expiry_date))
  from docs where status = 'Approved' and safe_date(expiry_date) < current_date
  union all
  select 'SOON:' || id, 'RUL-EXPIRING-SOON', id, null::uuid, null::uuid, study_country_id, study_site_id, artifact_num, 0, 1,
         format('%s (%s)%s expires on %s, in %s days.', title, artifact_num, where_txt, expiry_date, safe_date(expiry_date) - current_date)
  from docs where status = 'Approved' and safe_date(expiry_date) between current_date and current_date + 30
  -- Records without a file
  union all
  select 'INC:' || id, 'RUL-INCOMPLETE-RECORD', id, null::uuid, null::uuid, study_country_id, study_site_id, artifact_num,
         greatest(0, (current_date - (created_at at time zone 'UTC')::date) - 14), 1,
         format('%s (%s)%s has had no file since %s.', title, artifact_num, where_txt, (created_at at time zone 'UTC')::date)
  from docs where file_path is null and status not in ('Approved') and created_at < now() - interval '14 days'
  -- Date consistency
  union all
  select 'DATE:' || id, 'RUL-DATE-ORDER', id, null::uuid, null::uuid, study_country_id, study_site_id, artifact_num, 0, 1,
         format('%s (%s)%s is effective %s but expires %s.', title, artifact_num, where_txt, effective_date, expiry_date)
  from docs where safe_date(effective_date) > safe_date(expiry_date)
  union all
  select 'FUT:' || id, 'RUL-FUTURE-EFFECTIVE', id, null::uuid, null::uuid, study_country_id, study_site_id, artifact_num, 0, 1,
         format('%s (%s)%s is Final but only effective from %s.', title, artifact_num, where_txt, effective_date)
  from docs where status = 'Approved' and safe_date(effective_date) > current_date
  -- Integrity of Final files
  union all
  select 'VER:' || d.id, 'RUL-UNVERIFIED-FILE', d.id, null::uuid, null::uuid, d.study_country_id, d.study_site_id, d.artifact_num, 0, 1,
         format('%s (%s)%s: current file v%s is %s.', d.title, d.artifact_num, d.where_txt, v.version_no, v.verification_status)
  from docs d
  join lateral (select version_no, verification_status from document_file_versions where document_id = d.id order by version_no desc limit 1) v on true
  where d.status = 'Approved' and v.verification_status not in ('verified', 'baselined')
  -- The same file filed as Final more than once
  union all
  select 'DUP:' || file_hash, 'RUL-DUPLICATE-FINAL', (array_agg(id order by created_at))[1], null::uuid, null::uuid, null::uuid, null::uuid, min(artifact_num),
         0, count(*)::int,
         format('The same file is Final %s times: %s.', count(*), string_agg(title || ' (' || artifact_num || ')', ', ' order by created_at))
  from docs where status = 'Approved' and file_hash is not null group by file_hash having count(*) > 1
  -- Drafts and revisions that stall
  union all
  select 'STALE:' || d.id, 'RUL-STALE-DRAFT', d.id, null::uuid, null::uuid, d.study_country_id, d.study_site_id, d.artifact_num,
         (current_date - coalesce(d.updated_at, d.created_at at time zone 'UTC')::date) - 30, 1,
         format('%s (%s)%s has been a Draft with a file since %s and was never submitted for QC.', d.title, d.artifact_num, d.where_txt, coalesce(d.updated_at, d.created_at at time zone 'UTC')::date)
  from docs d where d.status = 'Draft' and d.file_path is not null and coalesce(d.updated_at, d.created_at at time zone 'UTC') < now() - interval '30 days'
    and not exists (select 1 from revision_requests r where r.document_id = d.id)
  union all
  select 'REV:' || d.id, 'RUL-REVISION-STALLED', d.id, null::uuid, null::uuid, d.study_country_id, d.study_site_id, d.artifact_num,
         (current_date - r.requested_at::date) - 30, 1,
         format('A revision of %s (%s)%s started on %s and is still Draft.', d.title, d.artifact_num, d.where_txt, r.requested_at::date)
  from docs d
  join lateral (select requested_at from revision_requests where document_id = d.id and process = 'collaboration' order by requested_at desc limit 1) r on true
  where d.status = 'Draft' and r.requested_at < now() - interval '30 days';

  -- Expected artifacts overdue, and active sites still missing documents
  insert into _cand
  select 'PLC:' || p.id, 'RUL-MISSING-OVERDUE', null::uuid, p.id, null::uuid, p.study_country_id, p.study_site_id, p.artifact_num,
         current_date - p.due_date, 1,
         format('%s (%s)%s was due on %s and is %s days overdue.', coalesce(nullif(trim(p.title), ''), p.artifact_name), p.artifact_num,
                case when ss.id is not null then ' at site ' || ss.site_number when sc.id is not null then ' in ' || sc.country_code else '' end,
                p.due_date, current_date - p.due_date)
  from placeholders p
  left join study_sites ss on ss.id = p.study_site_id
  left join study_countries sc on sc.id = p.study_country_id
  where p.study_id = p_study and p.status = 'open' and p.due_date < current_date
  union all
  select 'SITE:' || s.id, 'RUL-SITE-ACTIVE-MISSING', null::uuid, null::uuid, null::uuid, s.study_country_id, s.id, null::text, 0, count(p.id)::int,
         format('Site %s (%s) is active but %s expected document(s) are not filed: %s.', s.site_number, coalesce(s.display_name, ''), count(p.id),
                string_agg(p.artifact_num, ', ' order by p.artifact_num))
  from study_sites s join placeholders p on p.study_site_id = s.id and p.status = 'open'
  where s.study_id = p_study and s.status = 'ongoing'
  group by s.id, s.study_country_id, s.site_number, s.display_name;

  -- QC: overdue tasks and repeated rejection reasons
  insert into _cand
  select 'QC:' || t.id, 'RUL-QC-OVERDUE', t.document_id, null::uuid, t.id, d.study_country_id, d.study_site_id, d.artifact_num,
         greatest(0, (current_date - (t.due_at at time zone 'UTC')::date)), 1,
         format('%s for %s (%s) was due on %s.', case t.task_type when 'inbound_qc' then 'Inbound QC' else 'Post-Approval QC' end,
                coalesce(nullif(trim(d.custom_file_name), ''), d.artifact_name), d.artifact_num, (t.due_at at time zone 'UTC')::date)
  from document_tasks t join documents d on d.id = t.document_id
  where t.study_id = p_study and t.status = 'open' and t.due_at < now()
  union all
  select 'QCR:' || x.code, 'RUL-QC-REJECTION-PATTERN', null::uuid, null::uuid, null::uuid, null::uuid, null::uuid, null::text, 0, x.n,
         format('%s QC rejections for "%s" in the last 90 days.', x.n, coalesce(r.label, x.code))
  from (
    select c.code, count(*)::int as n
    from qc_decisions q join document_tasks t on t.id = q.task_id, unnest(q.reason_codes) as c(code)
    where t.study_id = p_study and q.outcome = 'reject' and q.decided_at > now() - interval '90 days'
    group by c.code having count(*) >= 3
  ) x left join qc_reasons r on r.org_id = v_org and r.code = x.code;

  -- Reconcile with stored findings.
  with cand as (
    select c.*, ru.version as rule_version,
      case ru.severity when 'high' then 3 when 'medium' then 2 else 1 end as severity_weight,
      coalesce((select case tc.classification when 'Core' then 3 when 'Recommended' then 2 else 1 end
                from tmf_config tc where tc.org_id = v_org and tc.study_id = v_code and tc.type = 'artifact' and tc.artifact_num = c.artifact_num limit 1), 1) as criticality,
      round(1 + least(greatest(c.overdue_days, 0), 90) / 30.0, 2) as overdue_factor,
      least(greatest(c.scope_count, 1), 5) as scope_factor
    from _cand c join rules ru on ru.code = c.rule_code and ru.is_active
  ), upd as (
    update findings f set last_seen_at = now(), explanation = c.explanation, rule_version = c.rule_version,
      criticality = c.criticality, severity_weight = c.severity_weight, overdue_days = greatest(c.overdue_days, 0), overdue_factor = c.overdue_factor,
      scope_count = c.scope_count, scope_factor = c.scope_factor,
      priority = round(c.criticality * c.severity_weight * c.overdue_factor * c.scope_factor, 1)
    from cand c
    where f.study_id = p_study and f.fingerprint = c.fingerprint and f.status in ('open', 'accepted')
    returning f.fingerprint
  ), ins as (
    insert into findings (org_id, study_id, rule_code, rule_version, fingerprint, document_id, placeholder_id, task_id, study_country_id, study_site_id,
                          artifact_num, explanation, criticality, severity_weight, overdue_days, overdue_factor, scope_count, scope_factor, priority)
    select v_org, p_study, c.rule_code, c.rule_version, c.fingerprint, c.document_id, c.placeholder_id, c.task_id, c.study_country_id, c.study_site_id,
           c.artifact_num, c.explanation, c.criticality, c.severity_weight, greatest(c.overdue_days, 0), c.overdue_factor, c.scope_count, c.scope_factor,
           round(c.criticality * c.severity_weight * c.overdue_factor * c.scope_factor, 1)
    from cand c
    where not exists (select 1 from findings f where f.study_id = p_study and f.fingerprint = c.fingerprint and f.status in ('open', 'accepted'))
    returning 1
  )
  -- (upd and ins run as part of this statement; the rows they touch are disjoint from these.)
  update findings f set status = 'resolved', resolved_at = now()
  where f.study_id = p_study and f.status in ('open', 'accepted')
    and not exists (select 1 from cand c where c.fingerprint = f.fingerprint);

  insert into study_health_state (study_id, org_id, dirty_at, evaluated_at) values (p_study, v_org, now(), now())
  on conflict (study_id) do update set evaluated_at = now();
  select count(*) into v_open from findings where study_id = p_study and status = 'open';
  return v_open;
end;
$$;
revoke all on function evaluate_study(uuid) from public, anon;
grant execute on function evaluate_study(uuid) to authenticated;

------------------------------------------------------------------------------
-- 5. Human actions on findings (audited)
------------------------------------------------------------------------------
create or replace function accept_finding(p_finding uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare f findings;
begin
  select * into f from findings where id = p_finding for update;
  if not found or not can_access_study_id(f.study_id) then raise exception 'Not found' using errcode = '42501'; end if;
  if not has_org_permission(f.org_id, 'run_quality_checks') then raise exception 'Your role does not allow accepting findings' using errcode = '42501'; end if;
  if f.status <> 'open' then raise exception 'This finding is already %', f.status; end if;
  if length(trim(coalesce(p_reason, ''))) < 3 then raise exception 'Give a reason for accepting this finding'; end if;
  update findings set status = 'accepted', accepted_by = auth.uid(), accepted_at = now(), accepted_reason = trim(p_reason) where id = f.id;
  insert into audit_trail (user_id, org_id, action, document_id, study_id, field_changed, old_value, new_value, signature_reason)
  values (auth.uid(), f.org_id, 'Finding accepted', f.document_id, (select study_id from studies where id = f.study_id), f.rule_code, 'open', 'accepted', trim(p_reason));
end;
$$;
revoke all on function accept_finding(uuid, text) from public, anon;
grant execute on function accept_finding(uuid, text) to authenticated;

create or replace function assign_finding(p_finding uuid, p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
declare f findings;
begin
  select * into f from findings where id = p_finding for update;
  if not found or not can_access_study_id(f.study_id) then raise exception 'Not found' using errcode = '42501'; end if;
  if not (has_org_permission(f.org_id, 'run_quality_checks') or has_org_permission(f.org_id, 'edit_study')) then
    raise exception 'Your role does not allow assigning findings' using errcode = '42501';
  end if;
  if f.status <> 'open' then raise exception 'This finding is already %', f.status; end if;
  if p_user is not null and not exists (select 1 from user_roles where user_id = p_user and org_id = f.org_id and is_active) then
    raise exception 'Choose a member of your organisation';
  end if;
  update findings set assigned_to = p_user, assigned_by = auth.uid(), assigned_at = now() where id = f.id;
  insert into audit_trail (user_id, org_id, action, document_id, study_id, field_changed, old_value, new_value)
  values (auth.uid(), f.org_id, 'Finding assigned', f.document_id, (select study_id from studies where id = f.study_id), f.rule_code,
          f.assigned_to::text, p_user::text);
end;
$$;
revoke all on function assign_finding(uuid, uuid) from public, anon;
grant execute on function assign_finding(uuid, uuid) to authenticated;
