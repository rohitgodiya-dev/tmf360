-- Part 4b — file versions (RecordVersion) and server-side integrity checks.
--
-- A document row held only its current file; replacing the file left no record of the
-- earlier one, and the SHA-256 in the storage path was computed by the browser and never
-- checked. Now:
-- * document_file_versions keeps every file a document has had. The database adds the row
--   itself whenever documents.file_path is set or changes, so no code path can skip it.
--   Existing files are recorded as version 1.
-- * Versions are append-only. Only the server's integrity check (service role, POST
--   /api/v1/documents/:id/verify-file) may fill in the verification columns.
-- * An approved document's file can't be swapped.

create table if not exists document_file_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id),
  org_id uuid references organizations(id),
  study_id text,
  version_no integer not null check (version_no > 0),
  file_path text not null,
  file_name text,
  file_type text,
  file_size_bytes bigint,
  file_hash text,                       -- SHA-256 hex recorded at upload (browser-computed)
  uploaded_by uuid,
  uploaded_by_email text,
  created_at timestamptz not null default now(),
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified', 'verified', 'mismatch', 'missing', 'baselined')),
  verified_hash text,                   -- SHA-256 hex computed by the server from the stored bytes
  verified_at timestamptz,
  unique (document_id, version_no)
);
create index if not exists document_file_versions_doc on document_file_versions (document_id, version_no desc);

alter table document_file_versions enable row level security;
drop policy if exists "study members read file versions" on document_file_versions;
create policy "study members read file versions" on document_file_versions for select
  using (
    org_id in (select org_id from user_roles where user_id = auth.uid() and is_active)
    and can_access_study(auth.uid(), study_id, org_id)
  );
-- No insert/update/delete policies: rows come from the trigger below and the server.

-- Record a version whenever a document gets a file or a different file.
create or replace function documents_record_file_version() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.file_path is null or (tg_op = 'UPDATE' and new.file_path is not distinct from old.file_path) then
    return new;
  end if;
  insert into document_file_versions (
    document_id, org_id, study_id, version_no, file_path, file_name, file_type, file_size_bytes,
    file_hash, uploaded_by, uploaded_by_email
  ) values (
    new.id, new.org_id, new.study_id,
    coalesce((select max(version_no) from document_file_versions where document_id = new.id), 0) + 1,
    new.file_path, new.file_name, new.file_type, coalesce(new.file_size_bytes, new.file_size),
    new.file_hash, coalesce(auth.uid(), new.user_id), jwt_email()
  );
  return new;
end;
$$;

drop trigger if exists documents_record_file_version on documents;
create trigger documents_record_file_version after insert or update of file_path on documents
  for each row execute function documents_record_file_version();

-- An approved document's file is the approved record; it can't be replaced.
create or replace function documents_protect_approved_file() returns trigger
language plpgsql set search_path = public as $$
begin
  if auth.uid() is not null and old.status = 'Approved' and new.file_path is distinct from old.file_path then
    raise exception 'The file of an approved document cannot be replaced' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists documents_protect_approved_file on documents;
create trigger documents_protect_approved_file before update of file_path on documents
  for each row execute function documents_protect_approved_file();

-- Append-only. Without a user session (server), deletes are allowed and updates may only
-- fill in the verification columns.
create or replace function document_file_versions_guard() returns trigger
language plpgsql set search_path = public as $$
declare
  v_verification text[] := array['verification_status', 'verified_hash', 'verified_at'];
begin
  if auth.uid() is null then
    if tg_op = 'DELETE' then return old; end if;
    if (to_jsonb(new) - v_verification) = (to_jsonb(old) - v_verification) then return new; end if;
  end if;
  raise exception 'document_file_versions is append-only: % is not allowed', tg_op;
end;
$$;

drop trigger if exists document_file_versions_append_only on document_file_versions;
create trigger document_file_versions_append_only before update or delete on document_file_versions
  for each row execute function document_file_versions_guard();

-- Existing files become version 1.
insert into document_file_versions (
  document_id, org_id, study_id, version_no, file_path, file_name, file_type, file_size_bytes,
  file_hash, uploaded_by, created_at
)
select d.id, d.org_id, d.study_id, 1, d.file_path, d.file_name, d.file_type,
       coalesce(d.file_size_bytes, d.file_size), d.file_hash, d.user_id, coalesce(d.created_at, now())
from documents d
where d.file_path is not null
  and not exists (select 1 from document_file_versions v where v.document_id = d.id);
