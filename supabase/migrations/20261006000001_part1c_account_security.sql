-- Part 1c — account and access takeover fixes
--
-- 1. user_roles: remove "Users can manage own role" (any user could make themselves
--    System Administrator, move to another organisation, or insert a role in any
--    organisation) and "Admins can update user_roles" (no organisation filter: admins
--    could change users in other companies). Replaced by:
--      * read your own row (plus the existing "same organisation" read rule)
--      * insert only your own first role, in an organisation you just created
--      * update only within your organisation, by user managers or yourself;
--        a guard trigger stops self-escalation and limits admin-role changes
--      * platform admins (admin_users) may deactivate users anywhere
-- 2. user_invitations (the unused legacy "invitations" table is left as is): server-side, single-use, expiring, hashed tokens. Replaces the
--    unauthenticated /api/invite that could reset any user's password.
-- 3. study_notification_recipients(): notification emails go only to active,
--    opted-in members of the caller's organisation who can access the study.

------------------------------------------------------------------------------
-- Helpers
------------------------------------------------------------------------------

create or replace function is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from admin_users au
    where lower(au.email) = lower(auth.jwt() ->> 'email') and au.is_active = true
  );
$$;

-- Site360 managers administer their own site organisation's users.
create or replace function is_site_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from user_roles ur
    join organizations o on o.id = ur.org_id and o.type = 'Site'
    where ur.user_id = auth.uid() and ur.is_active = true and ur.role = 'Site Coordinator'
  );
$$;

create or replace function org_has_members(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from user_roles where org_id = p_org_id);
$$;

------------------------------------------------------------------------------
-- 1. user_roles
------------------------------------------------------------------------------

drop policy if exists "Users can manage own role" on user_roles;
drop policy if exists "Admins can update user_roles" on user_roles;

drop policy if exists "user_roles read own" on user_roles;
create policy "user_roles read own" on user_roles for select to authenticated
  using (user_id = auth.uid());

-- Bootstrap only: the creator of a brand-new organisation becomes its first member.
drop policy if exists "user_roles bootstrap insert" on user_roles;
create policy "user_roles bootstrap insert" on user_roles for insert to authenticated
  with check (
    user_id = auth.uid()
    and role in ('System Administrator', 'Site Coordinator')
    and exists (select 1 from organizations o where o.id = user_roles.org_id and o.created_by = auth.uid())
    and not org_has_members(user_roles.org_id)
  );

drop policy if exists "user_roles update in org" on user_roles;
create policy "user_roles update in org" on user_roles for update to authenticated
  using (
    org_id = current_org_id()
    and (user_id = auth.uid() or user_has_permission('invite_users') or is_site_manager())
  )
  with check (org_id = current_org_id());

drop policy if exists "user_roles platform admin update" on user_roles;
create policy "user_roles platform admin update" on user_roles for update to authenticated
  using (is_platform_admin())
  with check (is_platform_admin());

revoke delete, truncate on user_roles from anon, authenticated;

create or replace function guard_user_role_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_roles text[] := array['System Administrator', 'Sponsor Admin'];
begin
  if auth.uid() is null then
    return new; -- server-side (service role) changes
  end if;
  if new.user_id is distinct from old.user_id
     or new.org_id is distinct from old.org_id
     or new.email is distinct from old.email then
    raise exception 'A user''s account, organisation and email cannot be changed here';
  end if;
  if old.user_id = auth.uid()
     and (new.role, new.is_active, new.can_delete, new.can_upload_download, new.can_download)
         is distinct from (old.role, old.is_active, old.can_delete, old.can_upload_download, old.can_download) then
    raise exception 'You cannot change your own role, status or permissions';
  end if;
  if new.role is distinct from old.role
     and (new.role = any (v_admin_roles) or old.role = any (v_admin_roles))
     and not user_has_permission('manage_roles') and not is_platform_admin() then
    raise exception 'Only administrators can grant or remove administrator roles';
  end if;
  return new;
end;
$$;

drop trigger if exists user_roles_guard_update on user_roles;
create trigger user_roles_guard_update
  before update on user_roles
  for each row execute function guard_user_role_update();

------------------------------------------------------------------------------
-- 2. user_invitations
------------------------------------------------------------------------------

create table if not exists user_invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  email text not null check (email ~ '^[^@\s]+@[^@\s]+$'),
  full_name text not null default '',
  role text not null,
  -- Only a SHA-256 hash of the token is stored; the token itself exists only in the link.
  token_hash text not null unique,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  expires_at timestamptz not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  accepted_user_id uuid references auth.users(id)
);
create index if not exists user_invitations_org_email on user_invitations (org_id, lower(email));

alter table user_invitations enable row level security;
revoke all on user_invitations from anon;
revoke insert, update, delete, truncate on user_invitations from authenticated;

drop policy if exists "user_invitations read" on user_invitations;
create policy "user_invitations read" on user_invitations for select to authenticated
  using (org_id = current_org_id() and user_has_permission('invite_users'));

------------------------------------------------------------------------------
-- 3. Notification recipients
------------------------------------------------------------------------------

create or replace function study_notification_recipients(p_study_code text)
returns table (email text, full_name text)
language sql
stable
security definer
set search_path = public
as $$
  select ur.email, ur.full_name
  from user_roles ur
  where exists (select 1 from studies s where s.study_id = p_study_code and s.org_id = current_org_id())
    and can_access_study(auth.uid(), p_study_code, current_org_id())
    and ur.org_id = current_org_id()
    and ur.is_active = true
    and coalesce(ur.notifications_enabled, true) = true
    and ur.email is not null
    and can_access_study(ur.user_id, p_study_code, ur.org_id);
$$;

revoke execute on function study_notification_recipients(text) from anon;
