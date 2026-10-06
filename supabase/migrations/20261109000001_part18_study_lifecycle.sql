-- Part 18 — study lifecycle and study banners (docs/enterprise-plan-review.md) (ENT-09, ENT-10)
--
-- * studies.lifecycle_status: Planning → Startup → Active → Closeout → Closed → Archived, changed only by
--   transition_study() (enforced: no skipping, Archived is final). Closed reuses the signed Part 11c close-out
--   (read-only study, open tasks cancelled); Archived needs its own signature and can never be reopened.
--   reopen_study() (Part 11c, signed) stays as the controlled correction path: Closed → Closeout.
-- * study_lifecycle_events: append-only history (from, to, reason, who, when, signature, what was acknowledged).
-- * studies writes: only roles with edit_study may edit a study record, and the legacy status column follows
--   the lifecycle (it was writable by any organisation member before).
-- * study_banner_state(): what every study member must see on every panel — read-only (closed/archived) and
--   "inspection in progress" (an inspection session open right now).

------------------------------------------------------------------------------
-- 1. Columns and history table
------------------------------------------------------------------------------
alter table studies add column if not exists lifecycle_status text;
alter table studies add column if not exists archived_at timestamptz;
alter table studies add column if not exists archived_by uuid;

-- Backfill once from the legacy free-text status; closed studies are Closed.
select set_config('app.study_lifecycle', 'on', false);
update studies set lifecycle_status = case
    when closed_at is not null then 'Closed'
    when status = 'Startup' then 'Startup'
    when status in ('Active', 'On Hold') then 'Active'
    when status = 'Closed' then 'Closeout'
    else 'Planning' end
  where lifecycle_status is null;
select set_config('app.study_lifecycle', 'off', false);
alter table studies alter column lifecycle_status set default 'Planning';
alter table studies alter column lifecycle_status set not null;
alter table studies drop constraint if exists studies_lifecycle_status_check;
alter table studies add constraint studies_lifecycle_status_check
  check (lifecycle_status in ('Planning', 'Startup', 'Active', 'Closeout', 'Closed', 'Archived'));

create table if not exists study_lifecycle_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  study_id uuid not null references studies(id),
  from_status text,
  to_status text not null,
  reason text not null check (length(trim(reason)) >= 3 and length(reason) <= 2000),
  details jsonb not null default '{}'::jsonb,
  signature_event_id uuid references signature_events(id),
  performed_by uuid,
  performed_by_email text,
  performed_at timestamptz not null default now()
);
create index if not exists study_lifecycle_events_study on study_lifecycle_events (study_id, performed_at desc);
alter table study_lifecycle_events enable row level security;
revoke insert, update, delete, truncate on study_lifecycle_events from anon, authenticated;
drop policy if exists "study lifecycle readable" on study_lifecycle_events;
create policy "study lifecycle readable" on study_lifecycle_events for select to authenticated using (can_access_study_id(study_id));

------------------------------------------------------------------------------
-- 2. Study record guard: lifecycle and close-out fields change only through the lifecycle functions
------------------------------------------------------------------------------
create or replace function studies_lifecycle_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if coalesce(current_setting('app.study_lifecycle', true), '') = 'on' then return new; end if;
  if new.closed_at is distinct from old.closed_at or new.closed_by is distinct from old.closed_by or new.close_reason is distinct from old.close_reason
     or new.lifecycle_status is distinct from old.lifecycle_status or new.archived_at is distinct from old.archived_at or new.archived_by is distinct from old.archived_by then
    raise exception 'Change the study status from the Study lifecycle panel';
  end if;
  if new.status is distinct from old.status then
    raise exception 'The study status follows its lifecycle; change it from the Study lifecycle panel';
  end if;
  if old.closed_at is not null and (to_jsonb(new) - 'marketing_authorisation_date') is distinct from (to_jsonb(old) - 'marketing_authorisation_date') then
    raise exception 'Study % is closed and read-only', old.study_id;
  end if;
  return new;
end;
$$;

-- New studies start in Planning (or Startup/Active when created that way); never Closed or Archived.
create or replace function studies_lifecycle_insert() returns trigger
language plpgsql set search_path = public as $$
begin
  if coalesce(current_setting('app.study_lifecycle', true), '') = 'on' then return new; end if;
  new.lifecycle_status := case when new.status in ('Startup', 'Active') then new.status else 'Planning' end;
  new.status := new.lifecycle_status;
  new.closed_at := null; new.closed_by := null; new.close_reason := null; new.archived_at := null; new.archived_by := null;
  return new;
end;
$$;
drop trigger if exists studies_lifecycle_insert on studies;
create trigger studies_lifecycle_insert before insert on studies for each row execute function studies_lifecycle_insert();

-- Only study editors may change a study record.
drop policy if exists "Users update org studies" on studies;
create policy "Users update org studies" on studies for update to authenticated
  using (org_id in (select user_roles.org_id from user_roles where user_roles.user_id = auth.uid())
         and (is_site_org(org_id::text) or (user_has_permission('edit_study') and can_access_study(auth.uid(), study_id, org_id))));

------------------------------------------------------------------------------
-- 3. Transitions
------------------------------------------------------------------------------
create or replace function lifecycle_allowed(p_from text, p_to text) returns boolean
language sql immutable as $$
  select (p_from, p_to) in (('Planning', 'Startup'), ('Startup', 'Active'), ('Startup', 'Planning'),
                            ('Active', 'Closeout'), ('Closeout', 'Active'), ('Closeout', 'Closed'), ('Closed', 'Archived'));
$$;

create or replace function record_lifecycle_event(s studies, p_from text, p_to text, p_reason text, p_details jsonb, p_sig uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into study_lifecycle_events (org_id, study_id, from_status, to_status, reason, details, signature_event_id, performed_by, performed_by_email)
  values (s.org_id, s.id, p_from, p_to, trim(p_reason), coalesce(p_details, '{}'::jsonb), p_sig, auth.uid(), coalesce(jwt_email(), 'system'));
  insert into audit_trail (user_id, org_id, action, study_id, field_changed, old_value, new_value, signature_reason)
  values (auth.uid(), s.org_id, 'Study lifecycle changed', s.study_id, 'studies:' || s.id, p_from, p_to, trim(p_reason));
end;
$$;
revoke all on function record_lifecycle_event(studies, text, text, text, jsonb, uuid) from public, anon, authenticated;

-- Moves a study one step. Closed: the signed close-out (p_reauth for 'study_closeout').
-- Archived: signed (p_reauth for 'study_archive'), final. Other steps: a reason.
create or replace function transition_study(p_study uuid, p_to text, p_reason text, p_reauth uuid default null, p_details jsonb default '{}'::jsonb)
returns text
language plpgsql security definer set search_path = public as $$
declare
  s studies;
  v_from text;
  v_sig uuid;
begin
  select * into s from studies where id = p_study for update;
  if not found or not can_access_study_id(s.id) then raise exception 'Not found' using errcode = '42501'; end if;
  if not has_org_permission(s.org_id, 'invite_users') then raise exception 'Your role does not allow changing the study status' using errcode = '42501'; end if;
  v_from := s.lifecycle_status;
  if v_from = 'Archived' then raise exception 'Study % is archived; its status can no longer change', s.study_id; end if;
  if not lifecycle_allowed(v_from, p_to) then raise exception 'A study cannot move from % to %', v_from, p_to; end if;
  if length(trim(coalesce(p_reason, ''))) < 3 then raise exception 'Give the reason for the change'; end if;

  if p_to = 'Closed' then
    perform set_config('app.lifecycle_caller', 'transition', true);
    perform close_study(s.id, p_reason, p_reauth);   -- signs, cancels open tasks, makes the study read-only
    perform set_config('app.lifecycle_caller', '', true);
    select id into v_sig from signature_events where study_id = s.id and action = 'study_closeout' order by signed_at desc limit 1;
  elsif p_to = 'Archived' then
    v_sig := sign_study_event(s, 'study_archive', 'Study TMF archived', p_reauth, 'study_archive');
  end if;

  perform set_config('app.study_lifecycle', 'on', true);
  update studies set lifecycle_status = p_to, status = p_to,
    archived_at = case when p_to = 'Archived' then now() else archived_at end,
    archived_by = case when p_to = 'Archived' then auth.uid() else archived_by end
  where id = s.id;
  perform set_config('app.study_lifecycle', 'off', true);
  perform record_lifecycle_event(s, v_from, p_to, p_reason, p_details, v_sig);
  return p_to;
end;
$$;
revoke all on function transition_study(uuid, text, text, uuid, jsonb) from public, anon;
grant execute on function transition_study(uuid, text, text, uuid, jsonb) to authenticated;

-- close_study / reopen_study (Part 11c) keep working from Archive & retention and now move the lifecycle too.
create or replace function close_study(p_study uuid, p_reason text, p_reauth uuid) returns integer
language plpgsql security definer set search_path = public as $$
declare
  s studies;
  v_cancelled integer;
  v_sig uuid;
begin
  select * into s from studies where id = p_study for update;
  if not found or not can_access_study_id(s.id) then raise exception 'Not found' using errcode = '42501'; end if;
  if not has_org_permission(s.org_id, 'invite_users') then raise exception 'Your role does not allow closing a study' using errcode = '42501'; end if;
  if s.closed_at is not null then raise exception 'This study is already closed'; end if;
  if s.lifecycle_status <> 'Closeout' then raise exception 'Move the study to Close-out before closing it (Study lifecycle)'; end if;
  if length(trim(coalesce(p_reason, ''))) < 3 then raise exception 'Give the reason for closing the study'; end if;
  v_sig := sign_study_event(s, 'study_closeout', 'Study TMF closed', p_reauth, 'study_closeout');
  perform set_config('app.study_lifecycle', 'on', true);
  update document_tasks set status = 'cancelled', cancel_reason = 'Study closed: ' || trim(p_reason), change_reason = 'Study closed'
    where study_id = s.id and status = 'open';
  get diagnostics v_cancelled = row_count;
  update studies set closed_at = now(), closed_by = auth.uid(), close_reason = trim(p_reason), lifecycle_status = 'Closed', status = 'Closed' where id = s.id;
  perform set_config('app.study_lifecycle', 'off', true);
  insert into audit_trail (user_id, org_id, action, study_id, field_changed, old_value, new_value, signature_reason)
  values (auth.uid(), s.org_id, 'Study closed (electronic signature)', s.study_id, 'studies:' || s.id, 'open',
          format('closed, read-only; %s open task(s) cancelled', v_cancelled), trim(p_reason));
  -- Called directly (Archive & retention) it records the lifecycle step itself; transition_study records its own.
  if coalesce(current_setting('app.lifecycle_caller', true), '') <> 'transition' then
    insert into study_lifecycle_events (org_id, study_id, from_status, to_status, reason, details, signature_event_id, performed_by, performed_by_email)
    values (s.org_id, s.id, 'Closeout', 'Closed', trim(p_reason), jsonb_build_object('cancelled_tasks', v_cancelled, 'via', 'close_study'), v_sig, auth.uid(), coalesce(jwt_email(), 'system'));
  end if;
  perform mark_study_dirty(s.id);
  return v_cancelled;
end;
$$;

create or replace function reopen_study(p_study uuid, p_reason text, p_reauth uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  s studies;
  v_sig uuid;
begin
  select * into s from studies where id = p_study for update;
  if not found or not can_access_study_id(s.id) then raise exception 'Not found' using errcode = '42501'; end if;
  if not has_org_permission(s.org_id, 'invite_users') then raise exception 'Your role does not allow reopening a study' using errcode = '42501'; end if;
  if s.lifecycle_status = 'Archived' then raise exception 'Study % is archived and can never be reopened', s.study_id; end if;
  if s.closed_at is null then raise exception 'This study is not closed'; end if;
  if length(trim(coalesce(p_reason, ''))) < 3 then raise exception 'Give the reason for reopening the study'; end if;
  v_sig := sign_study_event(s, 'study_reopen', 'Study TMF reopened', p_reauth, 'study_reopen');
  perform set_config('app.study_lifecycle', 'on', true);
  update studies set closed_at = null, closed_by = null, close_reason = null, lifecycle_status = 'Closeout', status = 'Closeout' where id = s.id;
  perform set_config('app.study_lifecycle', 'off', true);
  insert into audit_trail (user_id, org_id, action, study_id, field_changed, old_value, new_value, signature_reason)
  values (auth.uid(), s.org_id, 'Study reopened (electronic signature)', s.study_id, 'studies:' || s.id, 'closed', 'open', trim(p_reason));
  insert into study_lifecycle_events (org_id, study_id, from_status, to_status, reason, details, signature_event_id, performed_by, performed_by_email)
  values (s.org_id, s.id, 'Closed', 'Closeout', trim(p_reason), jsonb_build_object('via', 'reopen_study'), v_sig, auth.uid(), coalesce(jwt_email(), 'system'));
end;
$$;

------------------------------------------------------------------------------
-- 4. Banners for every study member
------------------------------------------------------------------------------
create or replace function study_banner_state(p_study uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  s studies;
  v_insp jsonb;
begin
  select * into s from studies where id = p_study;
  if not found or not can_access_study_id(s.id) then return null; end if;
  select jsonb_build_object('inspector_org', i.inspector_org, 'starts_at', i.starts_at, 'ends_at', i.ends_at) into v_insp
  from inspection_sessions i
  where i.study_id = s.id and i.revoked_at is null and i.starts_at <= now() and i.ends_at > now()
  order by i.ends_at limit 1;
  return jsonb_build_object(
    'lifecycle_status', s.lifecycle_status,
    'read_only', s.closed_at is not null,
    'closed_at', s.closed_at,
    'archived_at', s.archived_at,
    'inspection', v_insp);
end;
$$;
revoke all on function study_banner_state(uuid) from public, anon;
grant execute on function study_banner_state(uuid) to authenticated;
