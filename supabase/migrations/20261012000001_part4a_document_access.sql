-- Part 4a — enforce document permissions in the database (AZB, REG-01, DI).
--
-- Role permissions (lib/permissions.ts, mirrored in role_permissions) were only applied in
-- the browser. Through the API anyone who could open a study could approve, reject, delete
-- or edit its documents, and three policies were wider than intended:
--
-- 1. documents: "Users insert org documents" (org check only) sat beside the study-checked
--    insert policy, so any org member could add documents to any study. Removed; inserts
--    also need upload_document.
-- 2. documents updates: a trigger now requires the permission for each kind of change, and
--    a document can't be moved to another organisation or study.
-- 3. study_access_grants: an "ALL" policy let any org member grant themselves access to any
--    study (bypassing Pillar 5). Members may read grants; only manage_roles may change them.
-- 4. Storage: uploaded files could be overwritten in place (the "overwrite" policies). Files
--    are content-addressed and must not change once stored, so overwriting is removed.

-- Does the signed-in user's active role in this organisation carry the permission?
create or replace function has_org_permission(p_org_id uuid, p_permission text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from user_roles ur
    join role_permissions rp on rp.role = ur.role and rp.permission = p_permission
    where ur.user_id = auth.uid() and ur.org_id = p_org_id and ur.is_active
  )
$$;

------------------------------------------------------------------------------
-- 1. documents: inserts
------------------------------------------------------------------------------

drop policy if exists "Users insert org documents" on documents;
drop policy if exists "documents study insert" on documents;
create policy "documents study insert" on documents for insert
  with check (
    org_id = (select org_id from user_roles where user_id = auth.uid() and is_active limit 1)
    and can_access_study(auth.uid(), study_id, org_id)
    and has_org_permission(org_id, 'upload_document')
  );

------------------------------------------------------------------------------
-- 2. documents: updates need the permission for the change being made
------------------------------------------------------------------------------

create or replace function documents_enforce_permissions() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_needed text;
begin
  if auth.uid() is null then return new; end if;  -- service role / migrations

  if new.org_id is distinct from old.org_id or new.study_id is distinct from old.study_id then
    raise exception 'A document cannot be moved to another organisation or study' using errcode = '42501';
  end if;

  if new.deleted_at is distinct from old.deleted_at then
    v_needed := 'delete_document';                       -- delete or restore
  elsif new.status = 'Approved' and old.status is distinct from 'Approved' then
    v_needed := 'approve_document';
  elsif coalesce(new.rejected_at, '') <> '' and new.rejected_at is distinct from old.rejected_at then
    v_needed := 'reject_document';
  elsif new.status = 'Under Review' and old.status is distinct from 'Under Review' then
    v_needed := 'submit_document';
  elsif (to_jsonb(new) - 'comments') = (to_jsonb(old) - 'comments') then
    v_needed := 'view_document';                         -- comment only
  else
    v_needed := 'upload_document';                       -- metadata edits, archive, other changes
  end if;

  if not has_org_permission(old.org_id, v_needed) then
    raise exception 'Your role does not allow this change (needs %)', v_needed using errcode = '42501';
  end if;
  return new;
end;
$$;

-- Named to run before documents_link_taxonomy and documents_server_stamps (alphabetical),
-- so it sees the values the client sent.
drop trigger if exists documents_enforce_permissions on documents;
create trigger documents_enforce_permissions before update on documents
  for each row execute function documents_enforce_permissions();

------------------------------------------------------------------------------
-- 3. study_access_grants
------------------------------------------------------------------------------

drop policy if exists "org isolation" on study_access_grants;
drop policy if exists "org members read grants" on study_access_grants;
drop policy if exists "role managers add grants" on study_access_grants;
drop policy if exists "role managers change grants" on study_access_grants;
drop policy if exists "role managers remove grants" on study_access_grants;
create policy "org members read grants" on study_access_grants for select
  using (org_id in (select org_id from user_roles where user_id = auth.uid() and is_active));
create policy "role managers add grants" on study_access_grants for insert
  with check (has_org_permission(org_id, 'manage_roles'));
create policy "role managers change grants" on study_access_grants for update
  using (has_org_permission(org_id, 'manage_roles')) with check (has_org_permission(org_id, 'manage_roles'));
create policy "role managers remove grants" on study_access_grants for delete
  using (has_org_permission(org_id, 'manage_roles'));

------------------------------------------------------------------------------
-- 4. Storage: stored files are immutable
------------------------------------------------------------------------------

drop policy if exists "documents bucket overwrite" on storage.objects;
drop policy if exists "isf bucket overwrite" on storage.objects;
