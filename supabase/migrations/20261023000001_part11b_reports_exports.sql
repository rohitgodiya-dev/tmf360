-- Part 11b — Reports and exports (M13 RPT-02..05, M16 EXP-02..04). Plan: docs/part11-plan.md (D32, D33).
--
-- * User-management audit (RPT-02): changes to user_roles, study_members and study_access_grants
--   were not audited by the database (only some UI paths logged them). Triggers now write one
--   audit_trail row per change, so the User Management Audit Trail report is complete.
-- * export_jobs: exports run as background jobs (EXP-04). The API creates the job as the user,
--   builds the ZIP after responding, stores it in the private "exports" bucket and marks it done;
--   downloads are short-lived signed links until the job expires (7 days).

------------------------------------------------------------------------------
-- 1. User-management audit
------------------------------------------------------------------------------
create or replace function access_audit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  r jsonb := to_jsonb(coalesce(new, old));
  o jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  n jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  v_org uuid := coalesce(nullif(r ->> 'org_id', ''), nullif(r ->> 'organization_id', ''))::uuid;
  v_who text;
  v_action text;
  v_old text;
  v_new text;
  v_uid uuid := auth.uid();
  v_study text := r ->> 'study_id';
begin
  if v_org is null then return null; end if;
  if tg_op = 'UPDATE' and (o - array['notifications_enabled']) = (n - array['notifications_enabled']) then return null; end if;
  -- The audit chain only accepts rows from members of the organisation. When a signed-in user
  -- removes or deactivates their own last membership, they are no longer a member at this point;
  -- that one case cannot be chained and is skipped (it is still visible in the table itself).
  if v_uid is not null and not exists (select 1 from user_roles where user_id = v_uid and org_id = v_org and is_active) then
    return null;
  end if;

  v_who := coalesce(nullif(r ->> 'email', ''), (select email from user_roles where user_id = (r ->> 'user_id')::uuid and org_id = v_org limit 1), r ->> 'user_id');
  if tg_table_name = 'user_roles' then
    v_action := case tg_op when 'INSERT' then 'User role added' when 'DELETE' then 'User role removed'
      else case when (o ->> 'is_active') is distinct from (n ->> 'is_active') then
        case when (n ->> 'is_active')::boolean then 'User reactivated' else 'User deactivated' end else 'User role changed' end end;
    v_old := case when o is not null then format('%s%s; upload/download %s; download %s; delete %s', o ->> 'role', case when (o ->> 'is_active')::boolean then '' else ' (inactive)' end,
      o ->> 'can_upload_download', o ->> 'can_download', o ->> 'can_delete') end;
    v_new := case when n is not null then format('%s%s; upload/download %s; download %s; delete %s', n ->> 'role', case when (n ->> 'is_active')::boolean then '' else ' (inactive)' end,
      n ->> 'can_upload_download', n ->> 'can_download', n ->> 'can_delete') end;
  elsif tg_table_name = 'study_members' then
    v_action := case tg_op when 'INSERT' then 'Study member added' when 'DELETE' then 'Study member removed'
      else case when (n ->> 'is_active')::boolean then 'Study member changed' else 'Study member deactivated' end end;
    v_old := case when o is not null then format('%s%s', o ->> 'role', case when (o ->> 'is_active')::boolean then '' else ' (inactive)' end) end;
    v_new := case when n is not null then format('%s%s', n ->> 'role', case when (n ->> 'is_active')::boolean then '' else ' (inactive)' end) end;
  else
    v_action := case tg_op when 'INSERT' then 'Study access granted' when 'DELETE' then 'Study access removed'
      else case when (n ->> 'is_active')::boolean then 'Study access granted' else 'Study access revoked' end end;
    v_old := case when o is not null then case when (o ->> 'is_active')::boolean then 'access' else 'no access' end end;
    v_new := case when n is not null then case when (n ->> 'is_active')::boolean then 'access' else 'no access' end end;
  end if;

  insert into audit_trail (user_id, user_email, org_id, action, study_id, field_changed, old_value, new_value)
  values (v_uid, coalesce(auth.jwt() ->> 'email', 'system'), v_org, v_action, v_study, tg_table_name || ':' || v_who, v_old, v_new);
  return null;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['user_roles', 'study_members', 'study_access_grants'] loop
    execute format('drop trigger if exists %I on %I', 'zz_access_audit', t);
    execute format('create trigger %I after insert or update or delete on %I for each row execute function access_audit()', 'zz_access_audit', t);
  end loop;
end $$;

------------------------------------------------------------------------------
-- 2. Export jobs
------------------------------------------------------------------------------
create table if not exists export_jobs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  study_id uuid not null references studies(id),
  kind text not null check (kind in ('zip', 'archive', 'transfer')),
  status text not null default 'queued' check (status in ('queued', 'running', 'done', 'failed')),
  options jsonb not null default '{}'::jsonb,
  file_path text,
  file_size bigint,
  file_count integer,
  file_hash text,
  error text,
  requested_by uuid not null,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  expires_at timestamptz
);
create index if not exists export_jobs_study on export_jobs (study_id, created_at desc);

alter table export_jobs enable row level security;
revoke insert, update, delete, truncate on export_jobs from anon, authenticated;
drop policy if exists "requester and study auditors read exports" on export_jobs;
create policy "requester and study auditors read exports" on export_jobs for select
  using (can_access_study_id(study_id) and (requested_by = auth.uid() or has_org_permission(org_id, 'view_audit_trail')));

-- Creates a job for a study the caller can read (EXP-03). The documents themselves are read later
-- as the caller, so the export contains only what they may see. Audited.
create or replace function create_export_job(p_study uuid, p_kind text, p_options jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  s studies;
  v_id uuid;
begin
  select * into s from studies where id = p_study;
  if not found or not can_access_study_id(s.id) then raise exception 'Not found' using errcode = '42501'; end if;
  if not has_org_permission(s.org_id, 'view_document') then raise exception 'Your role does not allow exports' using errcode = '42501'; end if;
  if p_kind <> 'zip' then raise exception 'Unknown export type'; end if;
  if (select count(*) from export_jobs where requested_by = auth.uid() and status in ('queued', 'running')) >= 3 then
    raise exception 'You already have 3 exports running. Wait for one to finish.';
  end if;
  insert into export_jobs (org_id, study_id, kind, options, requested_by)
  values (s.org_id, s.id, p_kind, coalesce(p_options, '{}'::jsonb), auth.uid()) returning id into v_id;
  insert into audit_trail (user_id, org_id, action, study_id, field_changed, new_value)
  values (auth.uid(), s.org_id, 'Export requested', s.study_id, 'export_job:' || v_id, p_kind || ' ' || coalesce(p_options ->> 'label', ''));
  return v_id;
end;
$$;
revoke all on function create_export_job(uuid, text, jsonb) from public, anon;
grant execute on function create_export_job(uuid, text, jsonb) to authenticated;

------------------------------------------------------------------------------
-- 3. Audit trail review (RPT-02, 21 CFR 11.10(e)): until now users could read only their OWN audit
--    entries ("audit read own"), so neither the Audit trail panel nor the reports could show what
--    others did. Roles with view_audit_trail (admins, TMF Lead, QA, Regulatory, auditors) now read
--    their organisation's trail: organisation-level entries, and entries of studies they can access.
------------------------------------------------------------------------------
create index if not exists audit_trail_org_study_time on audit_trail (org_id, study_id, created_at);
drop policy if exists "auditors read organisation trail" on audit_trail;
create policy "auditors read organisation trail" on audit_trail for select
  using (
    has_org_permission(org_id, 'view_audit_trail')
    and (study_id is null or exists (
      select 1 from studies s where s.org_id = audit_trail.org_id and s.study_id = audit_trail.study_id and can_access_study_id(s.id)))
  );
