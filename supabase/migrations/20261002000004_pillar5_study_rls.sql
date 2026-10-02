-- Pillar 5 — Study-level access on documents
--
-- BEFORE RUNNING, list the existing policies on documents:
--
--   select policyname, cmd, qual from pg_policies where tablename = 'documents';
--
-- Postgres ORs permissive policies together. If an org-wide policy with a name
-- other than "documents org isolation" is still there, it keeps granting
-- org-wide access and this migration restricts nothing. Drop any such policy too.
--
-- Changes from the original draft:
--  * Study membership already exists in study_members (managed from User
--    management), so can_access_study accepts an active study_members row as well
--    as a study_access_grants row. Otherwise anyone added to a study from the UI
--    after this migration would be locked out of its documents.
--  * The backfill copies study_members. The original copied every non-admin user
--    into every study that had documents, which granted org-wide access to all
--    existing users and made the restriction meaningless.
--  * The documents policy gets an explicit WITH CHECK, and RLS is explicitly enabled.

create table if not exists study_access_grants (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id),
  study_id text not null,
  user_id uuid not null,
  granted_by uuid,
  granted_at timestamptz default now(),
  is_active boolean default true,
  unique (org_id, study_id, user_id)
);

alter table study_access_grants enable row level security;

drop policy if exists "org isolation" on study_access_grants;
create policy "org isolation" on study_access_grants
  using (org_id = (select org_id from user_roles where user_id = auth.uid() and is_active = true limit 1));

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
  select ur.role into v_role
  from user_roles ur
  where ur.user_id = p_user_id and ur.org_id = p_org_id and ur.is_active = true
  limit 1;

  if v_role is null then
    return false;
  end if;

  if v_role in ('System Administrator', 'Sponsor Admin', 'TMF Lead') then
    return true;
  end if;

  return exists (
    select 1 from study_access_grants g
    where g.user_id = p_user_id and g.study_id = p_study_id
      and g.org_id = p_org_id and g.is_active = true
  ) or exists (
    select 1 from study_members m
    where m.user_id = p_user_id and m.study_id = p_study_id
      and m.org_id = p_org_id and coalesce(m.is_active, true)
  );
end;
$$;

alter table documents enable row level security;

drop policy if exists "documents org isolation" on documents;
drop policy if exists "documents study access" on documents;
create policy "documents study access" on documents
  for all
  using (
    org_id = (select org_id from user_roles where user_id = auth.uid() and is_active = true limit 1)
    and can_access_study(auth.uid(), study_id, org_id)
  )
  with check (
    org_id = (select org_id from user_roles where user_id = auth.uid() and is_active = true limit 1)
    and can_access_study(auth.uid(), study_id, org_id)
  );

insert into study_access_grants (org_id, study_id, user_id)
select distinct m.org_id, m.study_id, m.user_id
from study_members m
where m.user_id is not null
  and m.org_id is not null
  and coalesce(m.is_active, true)
on conflict do nothing;
