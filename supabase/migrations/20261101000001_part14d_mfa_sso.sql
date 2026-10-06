-- Part 14d — Two-factor login and SSO sign-in (PLT-01). Plan: docs/part14-plan.md (D50).
--
-- * org_security_settings: per organisation, whether two-factor sign-in (TOTP) is required and the
--   email domain used for SSO sign-in. Changes need a reason and are audited; only roles that manage
--   roles may change them. The API refuses sessions below assurance level 2 when two-factor is required
--   (or when the user has enrolled a factor).

create table if not exists org_security_settings (
  org_id uuid primary key references organizations(id),
  require_mfa boolean not null default false,
  sso_domain text check (sso_domain is null or sso_domain ~ '^[a-z0-9.-]+\.[a-z]{2,}$'),
  change_reason text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_by uuid,
  updated_at timestamptz,
  row_version integer not null default 1,
  id uuid not null default gen_random_uuid() unique
);
alter table org_security_settings enable row level security;
revoke delete, truncate on org_security_settings from anon, authenticated;
drop policy if exists "org members read" on org_security_settings;
drop policy if exists "admins add" on org_security_settings;
drop policy if exists "admins change" on org_security_settings;
create policy "org members read" on org_security_settings for select using (org_id in (select org_id from user_roles where user_id = auth.uid() and is_active));
create policy "admins add" on org_security_settings for insert with check (has_org_permission(org_id, 'manage_roles') and length(trim(coalesce(change_reason, ''))) >= 3);
create policy "admins change" on org_security_settings for update using (has_org_permission(org_id, 'manage_roles'))
  with check (has_org_permission(org_id, 'manage_roles') and length(trim(coalesce(change_reason, ''))) >= 3);
drop trigger if exists org_security_settings_before_insert on org_security_settings;
create trigger org_security_settings_before_insert before insert on org_security_settings for each row execute function structure_before_insert();
drop trigger if exists org_security_settings_before_update on org_security_settings;
create trigger org_security_settings_before_update before update on org_security_settings for each row execute function structure_before_update();
drop trigger if exists org_security_settings_audit on org_security_settings;
create trigger org_security_settings_audit after insert or update on org_security_settings for each row execute function structure_audit();

-- For the sign-in page: is there an SSO domain for this email address? (No organisation details leak:
-- only true/false.)
create or replace function sso_available(p_email text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from org_security_settings where sso_domain is not null and lower(split_part(p_email, '@', 2)) = sso_domain)
$$;
grant execute on function sso_available(text) to anon, authenticated;
