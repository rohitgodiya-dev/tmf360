-- Pillar 5 — Study-level access on documents
-- Matches the live database as of 2026-10-02.
--
-- Access rules: System Administrator / Sponsor Admin / TMF Lead see every study
-- in their org; everyone else needs an active study_access_grants row OR an
-- active study_members row (the membership managed from User management).
-- study_access_grants was not backfilled; access currently comes from study_members.

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

-- Fix applied 2026-10-02: also accept study_members. study_members columns are
-- not all uuid, so the comparison is done as text.
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
  );
end;
$$;

-- Other live policies on documents, kept as-is: "Users insert org documents"
-- (INSERT) and "admins can delete documents" (DELETE).
drop policy if exists "documents org isolation" on documents;
drop policy if exists "documents study access" on documents;
create policy "documents study access" on documents
  using (
    org_id = (select org_id from user_roles where user_id = auth.uid() and is_active = true limit 1)
    and can_access_study(auth.uid(), study_id, org_id)
  );
