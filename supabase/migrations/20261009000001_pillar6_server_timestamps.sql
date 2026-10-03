-- Pillar 6 — server timestamps and server-derived actors (21 CFR 11.10(e), ALCOA "contemporaneous").
--
-- Record times and "who" columns were written by the browser (new Date(), user.email),
-- so a wrong or altered client clock, or a crafted request, could backdate an approval
-- or attribute it to someone else. These BEFORE triggers make the database the source:
--
-- * When a lifecycle time is set (approved, rejected, archived, deleted, closed, disabled)
--   it is replaced with the server's now(), and the matching actor column with the
--   signed-in user's email / id from the JWT. Clearing the value (restore) is allowed.
-- * created_at can't be changed after insert; updated_at is always now().
-- * Requests without a user session (service role, migrations) are trusted and left
--   alone, so server code and data imports can still supply historical values.
--
-- Also closes three related gaps found while checking this pillar:
-- 1. audit_trail.created_at (part of the record hash) and user_email came from the client;
--    a user could also put an org_id of another organisation on their own audit rows,
--    appending to that organisation's hash chain.
-- 2. document_metadata_versions (Pillar 3) could be updated or deleted by any org member;
--    version history is now append-only.

------------------------------------------------------------------------------
-- Helpers
------------------------------------------------------------------------------

-- The signed-in user's email from the JWT, or null outside a user session.
create or replace function jwt_email() returns text
language sql stable set search_path = public as $$
  select nullif(auth.jwt() ->> 'email', '')
$$;

-- now() as the ISO-8601 UTC text the app writes into text time columns.
create or replace function now_iso() returns text
language sql stable set search_path = public as $$
  select to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
$$;

------------------------------------------------------------------------------
-- documents
------------------------------------------------------------------------------

create or replace function documents_server_stamps() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_email text := jwt_email();
  v_ins boolean := tg_op = 'INSERT';
begin
  if v_uid is null then return new; end if;

  if v_ins then new.created_at := now(); else new.created_at := old.created_at; end if;

  if coalesce(new.approved_at, '') <> '' and (v_ins or new.approved_at is distinct from old.approved_at) then
    new.approved_at := now_iso();
    new.approved_by := coalesce(v_email, new.approved_by);
  end if;
  if coalesce(new.rejected_at, '') <> '' and (v_ins or new.rejected_at is distinct from old.rejected_at) then
    new.rejected_at := now_iso();
    new.rejected_by := coalesce(v_email, new.rejected_by);
  end if;
  if new.archived_at is not null and (v_ins or new.archived_at is distinct from old.archived_at) then
    new.archived_at := now();
    new.archived_by := coalesce(v_email, new.archived_by);
  end if;
  if new.deleted_at is not null and (v_ins or new.deleted_at is distinct from old.deleted_at) then
    new.deleted_at := now();
    new.deleted_by := coalesce(v_email, new.deleted_by);
    new.deleted_by_id := v_uid;
  end if;
  return new;
end;
$$;

drop trigger if exists documents_server_stamps on documents;
create trigger documents_server_stamps before insert or update on documents
  for each row execute function documents_server_stamps();

------------------------------------------------------------------------------
-- isf_documents (Site360 ISF)
------------------------------------------------------------------------------

create or replace function isf_documents_server_stamps() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_email text := jwt_email();
  v_ins boolean := tg_op = 'INSERT';
begin
  if v_uid is null then return new; end if;

  if v_ins then
    new.created_at := now();
    new.uploaded_by := v_uid;
    new.uploaded_by_email := coalesce(v_email, new.uploaded_by_email);
  else
    new.created_at := old.created_at;
    new.uploaded_by := old.uploaded_by;
    new.uploaded_by_email := old.uploaded_by_email;
  end if;
  new.updated_at := now();

  if new.approved_at is not null and (v_ins or new.approved_at is distinct from old.approved_at) then
    new.approved_at := now();
    new.approved_by := v_uid;
    new.approved_by_email := coalesce(v_email, new.approved_by_email);
  end if;
  if new.archived_at is not null and (v_ins or new.archived_at is distinct from old.archived_at) then
    new.archived_at := now();
    new.archived_by := coalesce(v_email, new.archived_by);
  end if;
  return new;
end;
$$;

drop trigger if exists isf_documents_server_stamps on isf_documents;
create trigger isf_documents_server_stamps before insert or update on isf_documents
  for each row execute function isf_documents_server_stamps();

------------------------------------------------------------------------------
-- document_queries
------------------------------------------------------------------------------

create or replace function document_queries_server_stamps() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_email text := jwt_email();
  v_ins boolean := tg_op = 'INSERT';
begin
  if v_uid is null then return new; end if;

  if v_ins then
    new.created_at := now();
    new.raised_by := v_uid;
  else
    new.created_at := old.created_at;
    new.raised_by := old.raised_by;
  end if;
  if new.closed_at is not null and (v_ins or new.closed_at is distinct from old.closed_at) then
    new.closed_at := now();
    new.closed_by := coalesce(v_email, new.closed_by);
  end if;
  return new;
end;
$$;

drop trigger if exists document_queries_server_stamps on document_queries;
create trigger document_queries_server_stamps before insert or update on document_queries
  for each row execute function document_queries_server_stamps();

------------------------------------------------------------------------------
-- tmf_config (the existing tmf_config_guard_and_audit trigger runs after this one
-- alphabetically, so it audits the stamped values)
------------------------------------------------------------------------------

create or replace function tmf_config_server_stamps() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_email text := jwt_email();
  v_ins boolean := tg_op = 'INSERT';
begin
  if v_uid is null then return new; end if;

  if v_ins then
    new.created_at := now();
    new.created_by := coalesce(v_email, new.created_by);
  else
    new.created_at := old.created_at;
    new.created_by := old.created_by;
  end if;
  new.updated_at := now();
  if new.disabled_at is not null and (v_ins or new.disabled_at is distinct from old.disabled_at) then
    new.disabled_at := now();
    new.disabled_by := coalesce(v_email, new.disabled_by);
  end if;
  return new;
end;
$$;

drop trigger if exists tmf_config_server_stamps on tmf_config;
create trigger tmf_config_server_stamps before insert or update on tmf_config
  for each row execute function tmf_config_server_stamps();

------------------------------------------------------------------------------
-- document_metadata_versions: server stamps + append-only
------------------------------------------------------------------------------

create or replace function document_metadata_versions_server_stamps() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then return new; end if;
  new.changed_at := now();
  new.changed_by_id := v_uid;
  new.changed_by_email := coalesce(jwt_email(), new.changed_by_email);
  return new;
end;
$$;

drop trigger if exists document_metadata_versions_server_stamps on document_metadata_versions;
create trigger document_metadata_versions_server_stamps before insert on document_metadata_versions
  for each row execute function document_metadata_versions_server_stamps();

-- Users can never change or remove a version. Deletes without a user session (service
-- role: retention/destruction jobs, test cleanup) are allowed; updates never are.
create or replace function document_metadata_versions_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'DELETE' and auth.uid() is null then return old; end if;
  raise exception 'document_metadata_versions is append-only: % is not allowed', tg_op;
end;
$$;

drop trigger if exists document_metadata_versions_append_only on document_metadata_versions;
create trigger document_metadata_versions_append_only before update or delete on document_metadata_versions
  for each row execute function document_metadata_versions_guard();

drop policy if exists "org isolation" on document_metadata_versions;
drop policy if exists "org members read versions" on document_metadata_versions;
drop policy if exists "org members add versions" on document_metadata_versions;
create policy "org members read versions" on document_metadata_versions for select
  using (org_id in (select org_id from user_roles where user_id = auth.uid() and is_active));
create policy "org members add versions" on document_metadata_versions for insert
  with check (org_id in (select org_id from user_roles where user_id = auth.uid() and is_active));

------------------------------------------------------------------------------
-- audit_trail: server time, server email, own-organisation chain only
------------------------------------------------------------------------------

create or replace function compute_audit_hash() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare
  prev_record_hash text;
  content_str text;
  v_uid uuid := auth.uid();
begin
  -- The record time is always the server's (it is part of the hash).
  NEW.created_at := now();

  if v_uid is not null then
    NEW.user_email := coalesce(jwt_email(), NEW.user_email);
    -- A user may only append to the chain of an organisation they belong to.
    if NEW.org_id is not null and not exists (
      select 1 from user_roles where user_id = v_uid and org_id = NEW.org_id and is_active
    ) then
      raise exception 'audit_trail: not a member of organisation %', NEW.org_id using errcode = '42501';
    end if;
  end if;

  -- Get org_id from user if not set on the row
  if NEW.org_id is null then
    select org_id into NEW.org_id
    from user_roles
    where user_id = NEW.user_id and is_active = true
    limit 1;
  end if;

  -- Lock to prevent concurrent chain splits
  perform pg_advisory_xact_lock(hashtext(NEW.org_id::text));

  -- Get previous hash in this org's chain
  select record_hash into prev_record_hash
  from audit_trail
  where org_id = NEW.org_id
  order by sequence_no desc nulls last
  limit 1;

  NEW.sequence_no := nextval('audit_trail_seq');
  NEW.prev_hash := coalesce(prev_record_hash, 'GENESIS');

  content_str := concat(
    NEW.sequence_no::text,
    NEW.prev_hash,
    coalesce(NEW.user_id::text,''),
    coalesce(NEW.action,''),
    coalesce(NEW.document_id::text,''),
    coalesce(NEW.study_id,''),
    coalesce(NEW.old_value,''),
    coalesce(NEW.new_value,''),
    NEW.created_at::text
  );

  NEW.record_hash := encode(digest(content_str, 'sha256'), 'hex');

  return NEW;
end;
$$;
