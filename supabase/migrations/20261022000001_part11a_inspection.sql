-- Part 11a — Inspection Mode (M19 INS-01..09). Plan and decisions: docs/part11-plan.md (D27–D31).
--
-- * inspection_sessions: created by an authorised study-team member (INS-01) with the inspector's
--   identity, organisation, purpose and a start/end window; scope per session (INS-02): countries,
--   sites, taxonomy nodes (prefixes), record statuses (Final by default), version history and audit
--   trail in or out; download mode (INS-06). AI is always off (INS-05, D29).
-- * Inspectors have no account (D27). The secret link and access code are stored only as SHA-256
--   in inspection_session_secrets (service role only). The API checks them on every call through
--   inspection_auth(); all inspector reads go through the security-definer functions below, which
--   are the single place where scope is enforced. Nothing here is callable by signed-in users
--   except the study-team functions.
-- * inspection_requests: the document request queue (INS-07), time-stamped by the server.
-- * inspection_activity: append-only log of every login, search, view, page view time, download,
--   print and request (INS-08).

------------------------------------------------------------------------------
-- 1. Tables
------------------------------------------------------------------------------
create table if not exists inspection_sessions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  study_id uuid not null references studies(id),
  inspector_name text not null check (length(trim(inspector_name)) between 2 and 200),
  inspector_email text check (inspector_email is null or length(inspector_email) <= 320),
  inspector_org text not null check (length(trim(inspector_org)) between 2 and 200),
  purpose text not null check (length(trim(purpose)) between 3 and 2000),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  scope_countries uuid[] not null default '{}',
  scope_sites uuid[] not null default '{}',
  scope_nodes text[] not null default '{}',
  scope_statuses text[] not null default '{Approved}',
  include_versions boolean not null default false,
  include_audit boolean not null default false,
  download_mode text not null default 'view_only' check (download_mode in ('view_only', 'watermark', 'original')),
  ai_enabled boolean not null default false check (not ai_enabled),
  extra_document_ids uuid[] not null default '{}',
  failed_attempts integer not null default 0,
  locked_at timestamptz,
  last_seen_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid,
  revoke_reason text,
  change_reason text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_by uuid,
  updated_at timestamptz,
  row_version integer not null default 1,
  check (ends_at > starts_at),
  check (ends_at <= starts_at + interval '90 days'),
  check (cardinality(scope_statuses) > 0 and scope_statuses <@ array['Approved', 'Under Review', 'Draft', 'Rejected']),
  check (array_to_string(scope_nodes, ',') ~ '^(\d\d(\.\d\d){0,2}(,\d\d(\.\d\d){0,2})*)?$')
);
create index if not exists inspection_sessions_study on inspection_sessions (study_id, ends_at desc);

create table if not exists inspection_session_secrets (
  session_id uuid primary key references inspection_sessions(id),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  code_hash text not null check (code_hash ~ '^[0-9a-f]{64}$')
);

create table if not exists inspection_requests (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  session_id uuid not null references inspection_sessions(id),
  study_id uuid not null references studies(id),
  kind text not null check (kind in ('document', 'clarification', 'out_of_scope')),
  subject text not null check (length(trim(subject)) between 3 and 300),
  detail text check (detail is null or length(detail) <= 4000),
  document_id uuid references documents(id),
  status text not null default 'open' check (status in ('open', 'answered', 'closed')),
  response text check (response is null or length(response) <= 4000),
  response_document_id uuid references documents(id),
  scope_extended boolean not null default false,
  responded_by uuid,
  responded_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists inspection_requests_session on inspection_requests (session_id, created_at);

create table if not exists inspection_activity (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  session_id uuid not null references inspection_sessions(id),
  study_id uuid not null references studies(id),
  kind text not null check (kind in ('login', 'failed_code', 'locked', 'search', 'view', 'page_view', 'download', 'print', 'request', 'audit_view', 'versions_view')),
  document_id uuid references documents(id),
  detail jsonb not null default '{}'::jsonb,
  at timestamptz not null default now()
);
create index if not exists inspection_activity_session on inspection_activity (session_id, at desc);

drop trigger if exists inspection_activity_append_only on inspection_activity;
create trigger inspection_activity_append_only before update or delete on inspection_activity
  for each row execute function append_only();
drop trigger if exists inspection_session_secrets_append_only on inspection_session_secrets;
create trigger inspection_session_secrets_append_only before update or delete on inspection_session_secrets
  for each row execute function append_only();

drop trigger if exists inspection_sessions_before_insert on inspection_sessions;
create trigger inspection_sessions_before_insert before insert on inspection_sessions
  for each row execute function structure_before_insert();
drop trigger if exists inspection_sessions_before_update on inspection_sessions;
create trigger inspection_sessions_before_update before update on inspection_sessions
  for each row execute function structure_before_update();
-- Audit only the study team's changes (create, extend, revoke); the inspector's own trail is
-- inspection_activity, and login bookkeeping (last_seen_at, failed_attempts) is not a change.
drop trigger if exists inspection_sessions_audit on inspection_sessions;
create trigger inspection_sessions_audit after insert or update on inspection_sessions
  for each row when (auth.uid() is not null) execute function structure_audit();

alter table inspection_sessions enable row level security;
alter table inspection_session_secrets enable row level security;   -- no policies: service role only
alter table inspection_requests enable row level security;
alter table inspection_activity enable row level security;
revoke all on inspection_session_secrets from anon, authenticated;
revoke insert, update, delete, truncate on inspection_sessions, inspection_requests, inspection_activity from anon, authenticated;

-- Readable by study members who may see the audit trail (TMF Lead, QA, Regulatory, admins, auditors).
drop policy if exists "study team reads sessions" on inspection_sessions;
create policy "study team reads sessions" on inspection_sessions for select
  using (has_org_permission(org_id, 'view_audit_trail') and can_access_study_id(study_id));
drop policy if exists "study team reads requests" on inspection_requests;
create policy "study team reads requests" on inspection_requests for select
  using (has_org_permission(org_id, 'view_audit_trail') and can_access_study_id(study_id));
drop policy if exists "study team reads activity" on inspection_activity;
create policy "study team reads activity" on inspection_activity for select
  using (has_org_permission(org_id, 'view_audit_trail') and can_access_study_id(study_id));

------------------------------------------------------------------------------
-- 2. Study-team functions (signed-in users)
------------------------------------------------------------------------------
-- INS-01/02: creates a session. The API generates the secret link token and access code and
-- passes only their hashes. Needs invite_users (System Administrator, Sponsor Admin, TMF Lead).
create or replace function create_inspection_session(p jsonb, p_token_hash text, p_code_hash text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_study studies;
  v_id uuid;
  v_starts timestamptz := coalesce((p ->> 'starts_at')::timestamptz, now());
begin
  select * into v_study from studies where id = (p ->> 'study_id')::uuid;
  if not found or not can_access_study_id(v_study.id) then raise exception 'Not found' using errcode = '42501'; end if;
  if not has_org_permission(v_study.org_id, 'invite_users') then
    raise exception 'Your role does not allow creating inspection sessions' using errcode = '42501';
  end if;
  if (p ->> 'ends_at')::timestamptz <= now() then raise exception 'The session must end in the future'; end if;
  -- Scope ids must belong to this study.
  if exists (select 1 from jsonb_array_elements_text(coalesce(p -> 'scope_countries', '[]')) c
             where not exists (select 1 from study_countries sc where sc.id = c::uuid and sc.study_id = v_study.id)) then
    raise exception 'A selected country is not part of this study';
  end if;
  if exists (select 1 from jsonb_array_elements_text(coalesce(p -> 'scope_sites', '[]')) s
             where not exists (select 1 from study_sites ss where ss.id = s::uuid and ss.study_id = v_study.id)) then
    raise exception 'A selected site is not part of this study';
  end if;

  insert into inspection_sessions (study_id, inspector_name, inspector_email, inspector_org, purpose, starts_at, ends_at,
    scope_countries, scope_sites, scope_nodes, scope_statuses, include_versions, include_audit, download_mode)
  values (v_study.id, trim(p ->> 'inspector_name'), nullif(trim(coalesce(p ->> 'inspector_email', '')), ''), trim(p ->> 'inspector_org'),
    trim(p ->> 'purpose'), v_starts, (p ->> 'ends_at')::timestamptz,
    coalesce(array(select jsonb_array_elements_text(p -> 'scope_countries'))::uuid[], '{}'),
    coalesce(array(select jsonb_array_elements_text(p -> 'scope_sites'))::uuid[], '{}'),
    coalesce(array(select jsonb_array_elements_text(p -> 'scope_nodes')), '{}'),
    coalesce(nullif(array(select jsonb_array_elements_text(p -> 'scope_statuses')), '{}'), '{Approved}'),
    coalesce((p ->> 'include_versions')::boolean, false), coalesce((p ->> 'include_audit')::boolean, false),
    coalesce(p ->> 'download_mode', 'view_only'))
  returning id into v_id;
  insert into inspection_session_secrets (session_id, token_hash, code_hash) values (v_id, lower(p_token_hash), lower(p_code_hash));
  return v_id;
end;
$$;
revoke all on function create_inspection_session(jsonb, text, text) from public, anon;
grant execute on function create_inspection_session(jsonb, text, text) to authenticated;

-- Ends a session now (revoke) or moves its end time (extend/shorten), with a reason. Audited.
create or replace function change_inspection_session(p_session uuid, p_action text, p_ends_at timestamptz, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare
  s inspection_sessions;
begin
  select * into s from inspection_sessions where id = p_session for update;
  if not found or not can_access_study_id(s.study_id) then raise exception 'Not found' using errcode = '42501'; end if;
  if not has_org_permission(s.org_id, 'invite_users') then
    raise exception 'Your role does not allow changing inspection sessions' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_reason, ''))) < 3 then raise exception 'Give a reason of at least 3 characters'; end if;
  if s.revoked_at is not null then raise exception 'This session has already been ended'; end if;
  if p_action = 'revoke' then
    update inspection_sessions set revoked_at = now(), revoked_by = auth.uid(), revoke_reason = trim(p_reason), change_reason = trim(p_reason)
    where id = s.id;
  elsif p_action = 'set_end' then
    if p_ends_at is null or p_ends_at <= now() then raise exception 'The new end time must be in the future'; end if;
    update inspection_sessions set ends_at = p_ends_at, change_reason = trim(p_reason), locked_at = null, failed_attempts = 0 where id = s.id;
  else
    raise exception 'Unknown action';
  end if;
end;
$$;
revoke all on function change_inspection_session(uuid, text, timestamptz, text) from public, anon;
grant execute on function change_inspection_session(uuid, text, timestamptz, text) to authenticated;

-- INS-07: the study team answers a request; optionally attaches a document of this study, which
-- (when p_extend_scope) is added to the session's scope. Needs upload_document and study access.
create or replace function respond_inspection_request(p_request uuid, p_response text, p_document uuid, p_extend_scope boolean, p_close boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  r inspection_requests;
  v_study studies;
  d documents;
begin
  select * into r from inspection_requests where id = p_request for update;
  if not found or not can_access_study_id(r.study_id) then raise exception 'Not found' using errcode = '42501'; end if;
  if not has_org_permission(r.org_id, 'upload_document') then
    raise exception 'Your role does not allow answering inspection requests' using errcode = '42501';
  end if;
  if r.status = 'closed' then raise exception 'This request is closed'; end if;
  if length(trim(coalesce(p_response, ''))) < 2 then raise exception 'Write a response'; end if;
  select * into v_study from studies where id = r.study_id;
  if p_document is not null then
    select * into d from documents where id = p_document and org_id = r.org_id and study_id = v_study.study_id and deleted_at is null;
    if not found then raise exception 'That document is not part of this study'; end if;
  end if;
  update inspection_requests set status = case when p_close then 'closed' else 'answered' end, response = trim(p_response),
    response_document_id = p_document, scope_extended = (p_document is not null and coalesce(p_extend_scope, false)),
    responded_by = auth.uid(), responded_at = now()
  where id = r.id;
  if p_document is not null and coalesce(p_extend_scope, false) then
    update inspection_sessions set extra_document_ids = array(select distinct unnest(extra_document_ids || p_document)),
      change_reason = 'Scope extended for request: ' || r.subject
    where id = r.session_id;
  end if;
  insert into audit_trail (user_id, org_id, action, study_id, document_id, field_changed, new_value, signature_reason)
  values (auth.uid(), r.org_id, 'Inspection request answered', v_study.study_id, p_document, 'inspection_request:' || r.id,
          left(trim(p_response), 500), case when p_document is not null and p_extend_scope then 'Scope extended with the attached document' end);
end;
$$;
revoke all on function respond_inspection_request(uuid, text, uuid, boolean, boolean) from public, anon;
grant execute on function respond_inspection_request(uuid, text, uuid, boolean, boolean) to authenticated;

------------------------------------------------------------------------------
-- 3. Inspector functions (service role only; the API calls them after checking the secrets)
------------------------------------------------------------------------------
-- Checks the link token and access code. Wrong codes are counted; 10 lock the session.
-- Returns {"session": …} or {"error": message safe to show the inspector}. A wrong code must not
-- raise: that would roll back the failed-attempt count and the log entry, and lockout would never happen.
drop function if exists inspection_auth(text, text, boolean);
create or replace function inspection_auth(p_token_hash text, p_code_hash text, p_login boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  sec inspection_session_secrets;
  s inspection_sessions;
begin
  select * into sec from inspection_session_secrets where token_hash = lower(p_token_hash);
  if not found then return jsonb_build_object('error', 'This inspection link is not valid'); end if;
  select * into s from inspection_sessions where id = sec.session_id for update;
  if s.revoked_at is not null then return jsonb_build_object('error', 'This inspection session has been ended by the study team'); end if;
  if s.locked_at is not null then return jsonb_build_object('error', 'This session is locked after too many wrong access codes. Contact the study team.'); end if;
  if now() < s.starts_at then return jsonb_build_object('error', format('This inspection session starts at %s UTC', to_char(s.starts_at at time zone 'UTC', 'YYYY-MM-DD HH24:MI'))); end if;
  if now() >= s.ends_at then return jsonb_build_object('error', 'This inspection session has expired'); end if;
  if sec.code_hash <> lower(p_code_hash) then
    update inspection_sessions set failed_attempts = failed_attempts + 1,
      locked_at = case when failed_attempts + 1 >= 10 then now() end where id = s.id;
    insert into inspection_activity (org_id, session_id, study_id, kind, detail)
    values (s.org_id, s.id, s.study_id, case when s.failed_attempts + 1 >= 10 then 'locked' else 'failed_code' end,
            jsonb_build_object('attempt', s.failed_attempts + 1));
    return jsonb_build_object('error', case when s.failed_attempts + 1 >= 10
      then 'This session is locked after too many wrong access codes. Contact the study team.' else 'The access code is not correct' end);
  end if;
  update inspection_sessions set last_seen_at = now(), failed_attempts = 0 where id = s.id returning * into s;
  if p_login then
    insert into inspection_activity (org_id, session_id, study_id, kind) values (s.org_id, s.id, s.study_id, 'login');
  end if;
  return jsonb_build_object('session', to_jsonb(s));
end;
$$;
revoke all on function inspection_auth(text, text, boolean) from public, anon, authenticated;

-- The authorisation boundary (INS-02): is this document in the session's scope?
create or replace function inspection_in_scope(s inspection_sessions, d documents) returns boolean
language sql stable security definer set search_path = public as $$
  select d.id is not null
     and d.org_id = s.org_id
     and d.study_id = (select study_id from studies where id = s.study_id)
     and d.deleted_at is null
     and d.archived_at is null
     and (
       d.id = any (s.extra_document_ids)
       or (
         d.status = any (s.scope_statuses)
         and (cardinality(s.scope_countries) = 0 or d.study_country_id = any (s.scope_countries)
              or d.study_site_id in (select id from study_sites where study_country_id = any (s.scope_countries)))
         and (cardinality(s.scope_sites) = 0 or d.study_site_id = any (s.scope_sites))
         and (cardinality(s.scope_nodes) = 0 or exists (
               select 1 from unnest(s.scope_nodes) n where coalesce(d.artifact_num, '') = n or coalesce(d.artifact_num, '') like n || '.%'))
       )
     )
$$;
revoke all on function inspection_in_scope(inspection_sessions, documents) from public, anon, authenticated;

-- In-scope documents with their taxonomy placement (zone, section) and location.
create or replace function inspection_documents(p_session uuid)
returns table (id uuid, artifact_num text, artifact_name text, title text, zone_num text, zone_name text, section_num text, section_name text,
               status text, version text, effective_date text, expiry_date text, country_code text, site_number text, site_name text,
               file_name text, file_type text, has_file boolean, updated_at timestamptz, extra boolean)
language sql stable security definer set search_path = public as $$
  select d.id, d.artifact_num, d.artifact_name,
         coalesce(nullif(trim(d.custom_file_name), ''), d.file_name, d.artifact_name),
         coalesce(ta.zone_num, split_part(d.artifact_num, '.', 1)), tz.name,
         coalesce(ta.section_num, nullif(split_part(d.artifact_num, '.', 1) || '.' || split_part(d.artifact_num, '.', 2), '.')), ts.name,
         d.status, d.version, d.effective_date, d.expiry_date, sc.country_code, ss.site_number, ss.display_name,
         d.file_name, d.file_type, d.file_path is not null, coalesce(d.updated_at, d.created_at at time zone 'UTC'),
         d.id = any (s.extra_document_ids)
  from inspection_sessions s
  join studies st on st.id = s.study_id
  join documents d on d.org_id = s.org_id and d.study_id = st.study_id
  left join taxonomy_artifacts ta on ta.id = d.taxonomy_artifact_id
  left join taxonomy_zones tz on tz.version_id = ta.version_id and tz.zone_num = ta.zone_num
  left join taxonomy_sections ts on ts.version_id = ta.version_id and ts.section_num = ta.section_num
  left join study_sites ss on ss.id = d.study_site_id
  left join study_countries sc on sc.id = coalesce(d.study_country_id, ss.study_country_id)
  where s.id = p_session and inspection_in_scope(s, d)
$$;
revoke all on function inspection_documents(uuid) from public, anon, authenticated;

-- One document, only if it is in scope (null otherwise: indistinguishable from not found).
create or replace function inspection_document(p_session uuid, p_document uuid) returns documents
language sql stable security definer set search_path = public as $$
  select d.* from inspection_sessions s join documents d on d.id = p_document
  where s.id = p_session and inspection_in_scope(s, d)
$$;
revoke all on function inspection_document(uuid, uuid) from public, anon, authenticated;

create or replace function inspection_log(p_session uuid, p_kind text, p_document uuid, p_detail jsonb) returns void
language sql security definer set search_path = public as $$
  insert into inspection_activity (org_id, session_id, study_id, kind, document_id, detail)
  select s.org_id, s.id, s.study_id, p_kind, p_document, coalesce(p_detail, '{}'::jsonb) from inspection_sessions s where s.id = p_session
$$;
revoke all on function inspection_log(uuid, text, uuid, jsonb) from public, anon, authenticated;

-- INS-07: the inspector asks for a document, a clarification or a record outside scope.
create or replace function inspection_request(p_session uuid, p_kind text, p_subject text, p_detail text, p_document uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  s inspection_sessions;
  v_id uuid;
begin
  select * into s from inspection_sessions where id = p_session;
  if p_document is not null and inspection_document(p_session, p_document) is null then p_document := null; end if;
  insert into inspection_requests (org_id, session_id, study_id, kind, subject, detail, document_id)
  values (s.org_id, s.id, s.study_id, p_kind, trim(p_subject), nullif(trim(coalesce(p_detail, '')), ''), p_document)
  returning id into v_id;
  perform inspection_log(p_session, 'request', p_document, jsonb_build_object('request_id', v_id, 'kind', p_kind, 'subject', trim(p_subject)));
  return v_id;
end;
$$;
revoke all on function inspection_request(uuid, text, text, text, uuid) from public, anon, authenticated;

------------------------------------------------------------------------------
-- 4. Private bucket for generated files (watermarked inspector downloads, exports — Part 11b/c).
--    No storage policies: only the service role reads and writes it; users get short signed links.
------------------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('exports', 'exports', false) on conflict (id) do nothing;
