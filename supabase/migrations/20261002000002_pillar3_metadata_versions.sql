-- Pillar 3 — Metadata versioning
-- Each row is a snapshot of a document's metadata taken immediately BEFORE a change.
-- Matches the live database as of 2026-10-02.

create table if not exists document_metadata_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id),
  org_id uuid references organizations(id),
  study_id text,
  version_no integer not null default 1,
  snapshot jsonb not null,
  change_reason text,
  changed_by_id uuid,
  changed_by_email text,
  changed_at timestamptz default now()
);

alter table document_metadata_versions enable row level security;

drop policy if exists "org isolation" on document_metadata_versions;
create policy "org isolation" on document_metadata_versions
  using (org_id = (select org_id from user_roles where user_id = auth.uid() and is_active = true limit 1));

create index if not exists document_metadata_versions_document_id_version_no_idx
  on document_metadata_versions(document_id, version_no);

-- Fix applied 2026-10-02: two concurrent saves could otherwise claim the same version number.
alter table document_metadata_versions
  add constraint uq_doc_version unique (document_id, version_no);
