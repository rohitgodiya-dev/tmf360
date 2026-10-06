-- Part 17 — CRO study-scoped access (docs/enterprise-plan-review.md) (ENT-06..08)
--
-- CRO staff are members of the sponsor's organisation with access to named studies only (plan decision 2.4).
-- Built on study_members rather than a second access table:
--   * study_members.party_id     the CRO organisation (parties, party_type 'cro') the person works for
--   * study_members.expires_at   access ends automatically; can_access_study ignores expired rows
--   * user_invitations           an invitation can carry the study, CRO and expiry; accepting it creates the membership
--   * studies SELECT             in sponsor organisations a user sees only the studies they can access
--
-- Security fix (found while building this part): study_members was readable by every signed-in user in every
-- organisation (policy "using true"), and in sponsor organisations any user could insert, change or delete
-- memberships, i.e. grant themselves access to any study of their organisation. Now:
--   read   = members of the same organisation
--   write  = invite_users permission in the same organisation (or: yourself, on a study you just created)
--   delete = never in sponsor organisations (deactivate instead; zz_access_audit records every change)
-- Site organisations (Site360) keep their existing site-manager rule, now limited to their own organisation.

------------------------------------------------------------------------------
-- 1. Columns
------------------------------------------------------------------------------
alter table study_members add column if not exists party_id uuid references parties(id);
alter table study_members add column if not exists expires_at timestamptz;
alter table study_members add column if not exists deactivated_at timestamptz;
alter table study_members add column if not exists deactivation_reason text check (deactivation_reason is null or length(deactivation_reason) <= 2000);

alter table user_invitations add column if not exists study_code text;
alter table user_invitations add column if not exists party_id uuid references parties(id);
alter table user_invitations add column if not exists access_expires_at timestamptz;

------------------------------------------------------------------------------
-- 2. Integrity: same organisation, CRO party, real study, server-stamped deactivation
------------------------------------------------------------------------------
create or replace function study_members_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and (new.org_id is distinct from old.org_id or new.study_id is distinct from old.study_id
                           or new.user_id is distinct from old.user_id) then
    raise exception 'The organisation, study and person of a study membership cannot be changed';
  end if;
  if exists (select 1 from organizations o where o.id::text = new.org_id::text and o.type = 'Site') then
    return new; -- Site360 memberships keep their own rules
  end if;
  if new.user_id is not null and not exists (
    select 1 from user_roles ur where ur.user_id::text = new.user_id::text and ur.org_id::text = new.org_id::text) then
    raise exception 'This person is not a member of the organisation';
  end if;
  -- TMF360 keys memberships by study code; ISF access (isf_* policies) keys them by studies.id.
  if not exists (select 1 from studies s where (s.study_id = new.study_id::text or s.id::text = new.study_id::text)
                 and s.org_id::text = new.org_id::text) then
    raise exception 'Study not found';
  end if;
  if new.party_id is not null and not exists (
    select 1 from parties p where p.id = new.party_id and p.org_id::text = new.org_id::text and p.party_type = 'cro') then
    raise exception 'Choose a CRO from your organisation directory';
  end if;
  if new.expires_at is not null and (tg_op = 'INSERT' or new.expires_at is distinct from old.expires_at) and new.expires_at <= now() then
    raise exception 'The access end date must be in the future';
  end if;
  if tg_op = 'INSERT' then
    new.added_at := now();
    new.deactivated_at := null;
  elsif coalesce(old.is_active, true) and not coalesce(new.is_active, true) then
    new.deactivated_at := now();
  elsif not coalesce(old.is_active, true) and coalesce(new.is_active, true) then
    new.deactivated_at := null;
    new.deactivation_reason := null;
  else
    new.deactivated_at := old.deactivated_at;
  end if;
  return new;
end;
$$;
drop trigger if exists study_members_guard on study_members;
create trigger study_members_guard before insert or update on study_members for each row execute function study_members_guard();

------------------------------------------------------------------------------
-- 3. Policies
------------------------------------------------------------------------------
drop policy if exists "org members can view study members" on study_members;
drop policy if exists "admins can manage study members" on study_members;

create or replace function is_site_org(p_org text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from organizations o where o.id::text = p_org and o.type = 'Site');
$$;
create or replace function is_site_manager(p_org text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from user_roles ur where ur.user_id = auth.uid() and ur.org_id::text = p_org
                 and ur.is_active and ur.role in ('Site Coordinator', 'PI'));
$$;
revoke all on function is_site_org(text), is_site_manager(text) from public, anon;
grant execute on function is_site_org(text), is_site_manager(text) to authenticated;

create policy "study members read" on study_members for select to authenticated
  using (org_id::text = current_org_id()::text);
create policy "study members insert" on study_members for insert to authenticated
  with check (org_id::text = current_org_id()::text and (
    case when is_site_org(org_id::text) then is_site_manager(org_id::text)
    else user_has_permission('invite_users')
      or (user_id::text = auth.uid()::text and exists (
            select 1 from studies s where s.study_id = study_members.study_id::text and s.org_id::text = study_members.org_id::text
              and s.user_id = auth.uid() and user_has_permission('create_study')))
    end));
create policy "study members update" on study_members for update to authenticated
  using (org_id::text = current_org_id()::text and (
    case when is_site_org(org_id::text) then is_site_manager(org_id::text) else user_has_permission('invite_users') end))
  with check (org_id::text = current_org_id()::text);
create policy "site study members delete" on study_members for delete to authenticated
  using (org_id::text = current_org_id()::text and is_site_org(org_id::text) and is_site_manager(org_id::text));
revoke truncate on study_members from anon, authenticated;
revoke all on study_members from anon;

------------------------------------------------------------------------------
-- 4. Access: expired memberships no longer count
------------------------------------------------------------------------------
create or replace function can_access_study(p_user_id uuid, p_study_id text, p_org_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  select role into v_role from user_roles
  where user_id = p_user_id and org_id = p_org_id and is_active = true
  limit 1;

  if v_role is null then
    return false;
  end if;

  if v_role in ('System Administrator','Sponsor Admin','TMF Lead') then
    return true;
  end if;

  return exists (
    select 1 from study_access_grants g
    where g.user_id = p_user_id
      and g.study_id = p_study_id
      and g.org_id = p_org_id
      and g.is_active = true
  ) or exists (
    select 1 from study_members m
    where m.user_id::text = p_user_id::text
      and m.study_id::text = p_study_id
      and m.org_id::text = p_org_id::text
      and coalesce(m.is_active, true)
      and (m.expires_at is null or m.expires_at > now())
  );
end;
$$;

------------------------------------------------------------------------------
-- 5. Study list: in sponsor organisations, only studies the user can access (or created)
------------------------------------------------------------------------------
drop policy if exists "Users see org studies" on studies;
create policy "Users see org studies" on studies for select to authenticated
  using (org_id in (select user_roles.org_id from user_roles where user_roles.user_id = auth.uid())
         and (is_site_org(org_id::text) or user_id = auth.uid() or can_access_study(auth.uid(), study_id, org_id)));

create index if not exists study_members_study on study_members (org_id, study_id);
