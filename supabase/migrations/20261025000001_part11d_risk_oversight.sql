-- Part 11d — Risk scoring and study oversight (M14 RSK-01..05, OVS-01..04). Plan: docs/part11-plan.md (D37).
--
-- * risk_settings: per-organisation timeliness thresholds (indexing default 5 days, processing 30;
--   RSK-05), also used by the Timeliness report.
-- * risk_factor_weights: weights 0.1–5.0 per factor, 0 disables (RSK-02). Factors in three
--   categories (RSK-01): Completeness (missing artifact), Quality (one per QC reason), Timeliness
--   (late indexing, late processing). Factors without a row use their default weight.
-- * risk_events(study): every risk event with the record it comes from. The API turns them into
--   artifact scores (Σ weight × events × artifact impact, OVS-01) with roll-ups and explanations (OVS-03).
-- * oversight_activities (OVS-04): status, reference, title, type, rationale, due date, assignees;
--   completing one needs an electronic signature ("Oversight review completed").

------------------------------------------------------------------------------
-- 1. Settings and weights
------------------------------------------------------------------------------
create table if not exists risk_settings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null unique references organizations(id),
  indexing_days integer not null default 5 check (indexing_days between 1 and 365),
  processing_days integer not null default 30 check (processing_days between 1 and 365),
  change_reason text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_by uuid,
  updated_at timestamptz,
  row_version integer not null default 1
);

create table if not exists risk_factor_weights (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  factor text not null check (factor ~ '^(missing_artifact|late_indexing|late_processing|qc:[a-z0-9_]{1,60})$'),
  weight numeric(3,1) not null check (weight = 0 or weight between 0.1 and 5.0),
  change_reason text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_by uuid,
  updated_at timestamptz,
  row_version integer not null default 1,
  unique (org_id, factor)
);

do $$
declare t text;
begin
  foreach t in array array['risk_settings', 'risk_factor_weights'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "org members read" on %I', t);
    execute format('drop policy if exists "quality leads add" on %I', t);
    execute format('drop policy if exists "quality leads change" on %I', t);
    execute format('create policy "org members read" on %I for select using (org_id in (select org_id from user_roles where user_id = auth.uid() and is_active))', t);
    execute format($p$create policy "quality leads add" on %I for insert with check (has_org_permission(org_id, 'run_quality_checks') and length(trim(coalesce(change_reason, ''))) >= 3)$p$, t);
    execute format($p$create policy "quality leads change" on %I for update using (has_org_permission(org_id, 'run_quality_checks'))
      with check (has_org_permission(org_id, 'run_quality_checks') and length(trim(coalesce(change_reason, ''))) >= 3)$p$, t);
    execute format('revoke delete, truncate on %I from anon, authenticated', t);
    execute format('drop trigger if exists %I on %I', t || '_before_insert', t);
    execute format('create trigger %I before insert on %I for each row execute function structure_before_insert()', t || '_before_insert', t);
    execute format('drop trigger if exists %I on %I', t || '_before_update', t);
    execute format('create trigger %I before update on %I for each row execute function structure_before_update()', t || '_before_update', t);
    execute format('drop trigger if exists %I on %I', t || '_audit', t);
    execute format('create trigger %I after insert or update on %I for each row execute function structure_audit()', t || '_audit', t);
  end loop;
end $$;

------------------------------------------------------------------------------
-- 2. Risk events
------------------------------------------------------------------------------
create or replace function safe_ts(p text) returns timestamptz language plpgsql stable as $$
begin
  if p is null or p !~ '^\d{4}-\d{2}-\d{2}' then return null; end if;
  return p::timestamptz;
exception when others then
  return null;
end;
$$;

-- One row per risk event in a study, pointing at the record that caused it.
create or replace function risk_events(p_study uuid)
returns table (factor text, category text, artifact_num text, artifact_name text, document_id uuid, placeholder_id uuid, intake_id uuid,
               study_country_id uuid, study_site_id uuid, owner text, days integer, detail text)
language plpgsql stable security definer set search_path = public as $$
declare
  v_org uuid;
  v_code text;
  v_idx integer;
  v_proc integer;
begin
  select org_id, study_id into v_org, v_code from studies where id = p_study;
  if v_org is null then raise exception 'Not found' using errcode = '42501'; end if;
  if auth.uid() is not null and not can_access_study_id(p_study) then raise exception 'Not found' using errcode = '42501'; end if;
  select coalesce(max(rs.indexing_days), 5), coalesce(max(rs.processing_days), 30) into v_idx, v_proc from risk_settings rs where rs.org_id = v_org;

  return query
  -- Completeness: expected artifacts not yet filed.
  select 'missing_artifact', 'completeness', p.artifact_num, p.artifact_name, null::uuid, p.id, null::uuid, p.study_country_id, p.study_site_id,
         p.responsible_dept, case when p.due_date < current_date then current_date - p.due_date else 0 end,
         format('%s expected%s%s', coalesce(p.title, p.artifact_name), case when p.due_date is not null then ', due ' || p.due_date end,
                case when p.due_date < current_date then format(' (%s days overdue)', current_date - p.due_date) else '' end)
  from placeholders p where p.study_id = p_study and p.status = 'open'
  union all
  -- Quality: each reason on each QC rejection.
  select 'qc:' || rc, 'quality', d.artifact_num, d.artifact_name, d.id, null::uuid, null::uuid, d.study_country_id, d.study_site_id, d.owner, 0,
         format('QC rejection on %s (%s), %s', coalesce(nullif(trim(d.custom_file_name), ''), d.artifact_name), coalesce(r.label, rc), to_char(q.decided_at, 'YYYY-MM-DD'))
  from qc_decisions q
  join documents d on d.id = q.document_id and d.org_id = v_org and d.study_id = v_code and d.deleted_at is null
  cross join lateral unnest(q.reason_codes) rc
  left join qc_reasons r on r.org_id = v_org and r.code = rc
  where q.outcome = 'reject'
  union all
  -- Timeliness: intake items indexed/filed later than the threshold, or still waiting past it.
  select 'late_indexing', 'timeliness', coalesce(d.artifact_num, i.artifact_num), coalesce(d.artifact_name, i.title), d.id, null::uuid, i.id,
         coalesce(d.study_country_id, i.study_country_id), coalesce(d.study_site_id, i.study_site_id), coalesce(d.owner, i.owner),
         (extract(epoch from (coalesce(d.created_at at time zone 'UTC', now()) - i.created_at)) / 86400)::int,
         format('%s: %s days from intake to filing%s', coalesce(nullif(trim(d.custom_file_name), ''), i.title, i.file_name),
                (extract(epoch from (coalesce(d.created_at at time zone 'UTC', now()) - i.created_at)) / 86400)::int,
                case when d.id is null then ' (not filed yet)' else '' end)
  from intake_items i
  left join documents d on d.id = i.filed_document_id
  where i.study_id = p_study and i.status <> 'rejected'
    and coalesce(d.created_at at time zone 'UTC', now()) - i.created_at > make_interval(days => v_idx)
  union all
  -- Timeliness: filed documents that took (or are taking) longer than the threshold to reach Final.
  select 'late_processing', 'timeliness', d.artifact_num, d.artifact_name, d.id, null::uuid, null::uuid, d.study_country_id, d.study_site_id, d.owner,
         (extract(epoch from (coalesce(case when d.status = 'Approved' then safe_ts(d.approved_at) end, now()) - d.created_at at time zone 'UTC')) / 86400)::int,
         format('%s: %s days from filing to %s', coalesce(nullif(trim(d.custom_file_name), ''), d.artifact_name),
                (extract(epoch from (coalesce(case when d.status = 'Approved' then safe_ts(d.approved_at) end, now()) - d.created_at at time zone 'UTC')) / 86400)::int,
                case when d.status = 'Approved' then 'Final' else 'today (still ' || d.status || ')' end)
  from documents d
  where d.org_id = v_org and d.study_id = v_code and d.deleted_at is null and d.archived_at is null and d.file_path is not null
    and d.status in ('Approved', 'Draft', 'Under Review', 'Rejected')
    and coalesce(case when d.status = 'Approved' then safe_ts(d.approved_at) end, now()) - d.created_at at time zone 'UTC' > make_interval(days => v_proc);
end;
$$;
revoke all on function risk_events(uuid) from public, anon;
grant execute on function risk_events(uuid) to authenticated;

------------------------------------------------------------------------------
-- 3. Oversight activities (OVS-04)
------------------------------------------------------------------------------
create table if not exists oversight_activities (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  study_id uuid not null references studies(id),
  ref text,
  title text not null check (length(trim(title)) between 3 and 300),
  activity_type text not null check (activity_type in ('tmf_review', 'risk_review', 'qc_review', 'site_review', 'vendor_oversight', 'other')),
  rationale text not null check (length(trim(rationale)) between 3 and 4000),
  status text not null default 'open' check (status in ('open', 'in_review', 'completed', 'cancelled')),
  due_date date,
  assignees uuid[] not null default '{}',
  outcome text,
  completed_by uuid,
  completed_at timestamptz,
  signature_event_id uuid references signature_events(id),
  cancel_reason text,
  change_reason text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_by uuid,
  updated_at timestamptz,
  row_version integer not null default 1,
  unique (study_id, ref)
);
create index if not exists oversight_activities_study on oversight_activities (study_id, status);

alter table oversight_activities enable row level security;
drop policy if exists "study members read oversight" on oversight_activities;
drop policy if exists "quality leads add oversight" on oversight_activities;
drop policy if exists "quality leads change oversight" on oversight_activities;
create policy "study members read oversight" on oversight_activities for select
  using (org_id in (select org_id from user_roles where user_id = auth.uid() and is_active) and can_access_study_id(study_id));
create policy "quality leads add oversight" on oversight_activities for insert
  with check (has_org_permission(org_id, 'run_quality_checks') and can_access_study_id(study_id));
create policy "quality leads change oversight" on oversight_activities for update
  using (has_org_permission(org_id, 'run_quality_checks') and can_access_study_id(study_id))
  with check (has_org_permission(org_id, 'run_quality_checks') and can_access_study_id(study_id));
revoke delete, truncate on oversight_activities from anon, authenticated;

-- Reference OVS-n per study; completion fields only through complete_oversight(); a cancellation
-- needs a reason; completed and cancelled activities are final.
create or replace function oversight_before_write() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform pg_advisory_xact_lock(hashtext('oversight:' || new.study_id));
    new.ref := 'OVS-' || lpad(((select count(*) from oversight_activities where study_id = new.study_id) + 1)::text, 3, '0');
    if new.status not in ('open', 'in_review') then raise exception 'New oversight activities start open'; end if;
    new.completed_by := null; new.completed_at := null; new.signature_event_id := null; new.outcome := null;
    return new;
  end if;
  if old.status in ('completed', 'cancelled') then raise exception 'This oversight activity is % and cannot change', old.status; end if;
  if coalesce(current_setting('app.oversight_complete', true), '') <> 'on'
     and (new.status = 'completed' or new.completed_by is distinct from old.completed_by or new.signature_event_id is distinct from old.signature_event_id
          or new.completed_at is distinct from old.completed_at or new.outcome is distinct from old.outcome) then
    raise exception 'Complete an oversight activity with its electronic signature';
  end if;
  if new.status = 'cancelled' and length(trim(coalesce(new.cancel_reason, ''))) < 3 then raise exception 'Give the reason for cancelling'; end if;
  return new;
end;
$$;
drop trigger if exists oversight_before_insert on oversight_activities;
create trigger oversight_before_insert before insert on oversight_activities for each row execute function structure_before_insert();
drop trigger if exists oversight_before_update on oversight_activities;
create trigger oversight_before_update before update on oversight_activities for each row execute function structure_before_update();
drop trigger if exists oversight_zz_rules on oversight_activities;
create trigger oversight_zz_rules before insert or update on oversight_activities for each row execute function oversight_before_write();
drop trigger if exists oversight_audit on oversight_activities;
create trigger oversight_audit after insert or update on oversight_activities for each row execute function structure_audit();

create or replace function complete_oversight(p_activity uuid, p_outcome text, p_reauth uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  a oversight_activities;
  s studies;
  v_sig uuid;
begin
  select * into a from oversight_activities where id = p_activity for update;
  if not found or not can_access_study_id(a.study_id) then raise exception 'Not found' using errcode = '42501'; end if;
  if not has_org_permission(a.org_id, 'run_quality_checks') and not (auth.uid() = any (a.assignees)) then
    raise exception 'Only an assignee or a quality lead can complete this activity' using errcode = '42501';
  end if;
  if a.status not in ('open', 'in_review') then raise exception 'This oversight activity is already %', a.status; end if;
  if length(trim(coalesce(p_outcome, ''))) < 3 then raise exception 'Record the outcome of the review'; end if;
  select * into s from studies where id = a.study_id;
  v_sig := sign_study_event(s, 'oversight_review', 'Oversight review completed', p_reauth, 'oversight_review');
  perform set_config('app.oversight_complete', 'on', true);
  update oversight_activities set status = 'completed', outcome = trim(p_outcome), completed_by = auth.uid(), completed_at = now(),
    signature_event_id = v_sig, change_reason = 'Completed with electronic signature' where id = a.id;
  perform set_config('app.oversight_complete', 'off', true);
end;
$$;
revoke all on function complete_oversight(uuid, text, uuid) from public, anon;
grant execute on function complete_oversight(uuid, text, uuid) to authenticated;
