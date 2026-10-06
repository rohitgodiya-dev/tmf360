-- Part 14g — Per-zone content permissions and blinded documents (USR-05, USR-06, REG-07). Plan: D52.
--
-- * study_zone_permissions: a user's level on one zone of one study: none / read / contribute /
--   unblinded_contribute. A study with no active grants keeps today's behaviour (everyone with study access
--   reads and contributes). Once a study has grants, a user without a grant on a zone has no access to it.
-- * documents.blinded: a blinded document is visible only with Unblinded Contribute on its zone.
-- * Granting Unblinded Contribute needs a second approver (a different user with manage_roles). Every grant,
--   approval and revocation is audited.
-- * Enforced in the documents RLS policies and the file-access helper, so every channel inherits it.

create table if not exists study_zone_permissions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  study_id uuid not null references studies(id),
  user_id uuid not null,
  zone_num text not null check (zone_num ~ '^[0-9]{2}$'),
  level text not null check (level in ('none', 'read', 'contribute', 'unblinded_contribute')),
  status text not null default 'active' check (status in ('pending', 'active', 'rejected', 'revoked')),
  reason text not null check (length(trim(reason)) >= 3),
  approved_by uuid,
  approved_at timestamptz,
  decision_reason text,
  change_reason text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_by uuid,
  updated_at timestamptz,
  row_version integer not null default 1
);
create unique index if not exists study_zone_permissions_live on study_zone_permissions (study_id, user_id, zone_num, status) where status in ('pending', 'active');
create index if not exists study_zone_permissions_study on study_zone_permissions (study_id) where status = 'active';

alter table study_zone_permissions enable row level security;
revoke insert, update, delete, truncate on study_zone_permissions from anon, authenticated;
drop policy if exists "study members read grants" on study_zone_permissions;
create policy "study members read grants" on study_zone_permissions for select
  using (can_access_study_id(study_id) and (user_id = auth.uid() or has_org_permission(org_id, 'manage_roles')));

drop trigger if exists study_zone_permissions_before_insert on study_zone_permissions;
create trigger study_zone_permissions_before_insert before insert on study_zone_permissions for each row execute function structure_before_insert();
drop trigger if exists study_zone_permissions_before_update on study_zone_permissions;
create trigger study_zone_permissions_before_update before update on study_zone_permissions for each row execute function structure_before_update();
drop trigger if exists study_zone_permissions_audit on study_zone_permissions;
create trigger study_zone_permissions_audit after insert or update on study_zone_permissions for each row execute function structure_audit();

------------------------------------------------------------------------------
-- The access decision
------------------------------------------------------------------------------
alter table documents add column if not exists blinded boolean not null default false;

-- The caller's level on the zone of a document of study p_study (study code). 'contribute' when the study
-- has no active grants (today's behaviour). Service-role callers (no auth.uid()) are not restricted here.
create or replace function document_zone_level(p_org uuid, p_study text, p_artifact text) returns text
language plpgsql stable security definer set search_path = public as $$
declare
  v_study uuid;
  v_level text;
begin
  if auth.uid() is null then return 'unblinded_contribute'; end if;
  select id into v_study from studies where study_id = p_study and org_id = p_org;
  if v_study is null or not exists (select 1 from study_zone_permissions where study_id = v_study and status = 'active') then
    return 'contribute';
  end if;
  select level into v_level from study_zone_permissions
   where study_id = v_study and user_id = auth.uid() and status = 'active' and zone_num = split_part(coalesce(p_artifact, ''), '.', 1);
  return coalesce(v_level, 'none');
end;
$$;

create or replace function can_see_document(p_org uuid, p_study text, p_artifact text, p_blinded boolean) returns boolean
language sql stable security definer set search_path = public as $$
  select case document_zone_level(p_org, p_study, p_artifact)
           when 'unblinded_contribute' then true
           when 'none' then false
           else not coalesce(p_blinded, false) end;
$$;

create or replace function can_contribute_document(p_org uuid, p_study text, p_artifact text, p_blinded boolean) returns boolean
language sql stable security definer set search_path = public as $$
  select case document_zone_level(p_org, p_study, p_artifact)
           when 'unblinded_contribute' then true
           when 'contribute' then not coalesce(p_blinded, false)
           else false end;
$$;
revoke all on function document_zone_level(uuid, text, text) from public, anon;
revoke all on function can_see_document(uuid, text, text, boolean) from public, anon;
revoke all on function can_contribute_document(uuid, text, text, boolean) from public, anon;
grant execute on function document_zone_level(uuid, text, text) to authenticated, service_role;
grant execute on function can_see_document(uuid, text, text, boolean) to authenticated, service_role;
grant execute on function can_contribute_document(uuid, text, text, boolean) to authenticated, service_role;

drop policy if exists "documents study read" on documents;
create policy "documents study read" on documents for select
  using (org_id = (select user_roles.org_id from user_roles where user_roles.user_id = auth.uid() and user_roles.is_active = true limit 1)
         and can_access_study(auth.uid(), study_id, org_id)
         and can_see_document(org_id, study_id, artifact_num, blinded));
drop policy if exists "documents study update" on documents;
create policy "documents study update" on documents for update
  using (org_id = (select user_roles.org_id from user_roles where user_roles.user_id = auth.uid() and user_roles.is_active = true limit 1)
         and can_access_study(auth.uid(), study_id, org_id)
         and can_contribute_document(org_id, study_id, artifact_num, blinded))
  with check (org_id = (select user_roles.org_id from user_roles where user_roles.user_id = auth.uid() and user_roles.is_active = true limit 1)
         and can_access_study(auth.uid(), study_id, org_id)
         and can_contribute_document(org_id, study_id, artifact_num, blinded));
drop policy if exists "documents study insert" on documents;
create policy "documents study insert" on documents for insert
  with check (org_id = (select user_roles.org_id from user_roles where user_roles.user_id = auth.uid() and user_roles.is_active limit 1)
              and can_access_study(auth.uid(), study_id, org_id) and has_org_permission(org_id, 'upload_document')
              and can_contribute_document(org_id, study_id, artifact_num, blinded));

-- Workflow functions run as definer and skip RLS; this trigger keeps the zone rules for them too: a user
-- can only create a document in, or move one to, a zone they contribute to, and only set_document_blinding
-- changes the blinded flag.
create or replace function documents_zone_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;
  if tg_op = 'INSERT' then
    if new.blinded and coalesce(current_setting('app.blinding', true), '') <> 'on' then raise exception 'Mark a document blinded with Set blinding'; end if;
    if not can_contribute_document(new.org_id, new.study_id, new.artifact_num, new.blinded) then
      raise exception 'You do not have Contribute access to zone %', split_part(coalesce(new.artifact_num, ''), '.', 1) using errcode = '42501';
    end if;
  else
    if new.blinded is distinct from old.blinded and coalesce(current_setting('app.blinding', true), '') <> 'on' then
      raise exception 'Mark a document blinded with Set blinding';
    end if;
    if new.artifact_num is distinct from old.artifact_num and not can_contribute_document(new.org_id, new.study_id, new.artifact_num, new.blinded) then
      raise exception 'You do not have Contribute access to zone %', split_part(coalesce(new.artifact_num, ''), '.', 1) using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists documents_zone_guard on documents;
create trigger documents_zone_guard before insert or update on documents for each row execute function documents_zone_guard();

-- Record files follow their document.
create or replace function can_read_document_file(p_name text, p_owner uuid)
returns boolean language plpgsql stable security definer set search_path = public as $$
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

  -- A record file: same access as the document itself (org + study + zone + blinding).
  if exists (select 1 from documents d where d.file_path = p_name) then
    return exists (
      select 1 from documents d
      where d.file_path = p_name
        and d.org_id = v_org
        and can_access_study(v_uid, d.study_id, d.org_id)
        and can_see_document(d.org_id, d.study_id, d.artifact_num, d.blinded)
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
        and can_see_document(d.org_id, d.study_id, d.artifact_num, d.blinded)
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
-- Grants
------------------------------------------------------------------------------
-- Grants a level (Unblinded Contribute is created pending a second approver). Replaces the user's live grant
-- on that zone. Returns the grant id.
create or replace function grant_zone_permission(p_study uuid, p_user uuid, p_zone text, p_level text, p_reason text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  s studies;
  v_id uuid;
begin
  select * into s from studies where id = p_study;
  if not found or not can_access_study_id(p_study) then raise exception 'Not found' using errcode = '42501'; end if;
  if not has_org_permission(s.org_id, 'manage_roles') then raise exception 'You do not have permission to manage access' using errcode = '42501'; end if;
  if not exists (select 1 from user_roles where user_id = p_user and org_id = s.org_id and is_active) then raise exception 'That user is not in this organisation'; end if;
  if p_level not in ('none', 'read', 'contribute', 'unblinded_contribute') then raise exception 'Unknown access level'; end if;
  if p_zone !~ '^[0-9]{2}$' then raise exception 'Zone must be a two-digit zone number'; end if;
  if length(trim(coalesce(p_reason, ''))) < 3 then raise exception 'Give a reason (at least 3 characters)'; end if;
  update study_zone_permissions set status = 'revoked', decision_reason = 'Replaced by a new grant', change_reason = p_reason
   where study_id = p_study and user_id = p_user and zone_num = p_zone and status in ('pending', 'active')
     and not (p_level = 'unblinded_contribute' and status = 'active');
  insert into study_zone_permissions (org_id, study_id, user_id, zone_num, level, status, reason, change_reason)
  values (s.org_id, p_study, p_user, p_zone, p_level, case when p_level = 'unblinded_contribute' then 'pending' else 'active' end, trim(p_reason), trim(p_reason))
  returning id into v_id;
  return v_id;
end;
$$;

-- A second user with manage_roles approves or rejects a pending Unblinded Contribute grant.
create or replace function decide_zone_permission(p_grant uuid, p_approve boolean, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare g study_zone_permissions;
begin
  select * into g from study_zone_permissions where id = p_grant for update;
  if not found or not can_access_study_id(g.study_id) then raise exception 'Not found' using errcode = '42501'; end if;
  if not has_org_permission(g.org_id, 'manage_roles') then raise exception 'You do not have permission to manage access' using errcode = '42501'; end if;
  if g.status <> 'pending' then raise exception 'This grant is not waiting for approval'; end if;
  if g.created_by = auth.uid() then raise exception 'A second person must approve Unblinded Contribute'; end if;
  if g.user_id = auth.uid() then raise exception 'You cannot approve your own unblinded access'; end if;
  if length(trim(coalesce(p_reason, ''))) < 3 then raise exception 'Give a reason (at least 3 characters)'; end if;
  if p_approve then
    update study_zone_permissions set status = 'revoked', decision_reason = 'Replaced by an approved grant', change_reason = p_reason
     where study_id = g.study_id and user_id = g.user_id and zone_num = g.zone_num and status = 'active';
  end if;
  update study_zone_permissions
     set status = case when p_approve then 'active' else 'rejected' end, approved_by = auth.uid(), approved_at = now(),
         decision_reason = trim(p_reason), change_reason = trim(p_reason)
   where id = p_grant;
end;
$$;

create or replace function revoke_zone_permission(p_grant uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare g study_zone_permissions;
begin
  select * into g from study_zone_permissions where id = p_grant for update;
  if not found or not can_access_study_id(g.study_id) then raise exception 'Not found' using errcode = '42501'; end if;
  if not has_org_permission(g.org_id, 'manage_roles') then raise exception 'You do not have permission to manage access' using errcode = '42501'; end if;
  if g.status not in ('pending', 'active') then raise exception 'This grant is no longer live'; end if;
  if length(trim(coalesce(p_reason, ''))) < 3 then raise exception 'Give a reason (at least 3 characters)'; end if;
  update study_zone_permissions set status = 'revoked', decision_reason = trim(p_reason), change_reason = trim(p_reason) where id = p_grant;
end;
$$;

-- Only a user with Unblinded Contribute on the document's zone can blind or unblind it. Audited.
create or replace function set_document_blinding(p_document uuid, p_blinded boolean, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare d documents;
begin
  select * into d from documents where id = p_document for update;
  if not found or not can_access_study(auth.uid(), d.study_id, d.org_id) or not can_see_document(d.org_id, d.study_id, d.artifact_num, d.blinded) then
    raise exception 'Not found' using errcode = '42501';
  end if;
  if document_zone_level(d.org_id, d.study_id, d.artifact_num) <> 'unblinded_contribute' then
    raise exception 'Only users with Unblinded Contribute on this zone can change blinding' using errcode = '42501';
  end if;
  if d.deleted_at is not null then raise exception 'This document is deleted'; end if;
  if d.blinded = p_blinded then return; end if;
  if length(trim(coalesce(p_reason, ''))) < 3 then raise exception 'Give a reason (at least 3 characters)'; end if;
  perform set_config('app.blinding', 'on', true);
  update documents set blinded = p_blinded where id = p_document;
  perform set_config('app.blinding', 'off', true);
  insert into audit_trail (user_id, org_id, action, study_id, document_id, document_name, field_changed, old_value, new_value, signature_reason)
  values (auth.uid(), d.org_id, case when p_blinded then 'Document blinded' else 'Document unblinded' end, d.study_id, d.id,
          coalesce(nullif(trim(d.custom_file_name), ''), d.artifact_name), 'blinded', d.blinded::text, p_blinded::text, trim(p_reason));
end;
$$;

revoke all on function grant_zone_permission(uuid, uuid, text, text, text) from public, anon;
revoke all on function decide_zone_permission(uuid, boolean, text) from public, anon;
revoke all on function revoke_zone_permission(uuid, text) from public, anon;
revoke all on function set_document_blinding(uuid, boolean, text) from public, anon;
grant execute on function grant_zone_permission(uuid, uuid, text, text, text) to authenticated;
grant execute on function decide_zone_permission(uuid, boolean, text) to authenticated;
grant execute on function revoke_zone_permission(uuid, text) to authenticated;
grant execute on function set_document_blinding(uuid, boolean, text) to authenticated;
