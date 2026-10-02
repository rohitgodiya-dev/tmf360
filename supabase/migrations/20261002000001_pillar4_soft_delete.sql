-- Pillar 4 — Soft delete + 180-day recycle bin
-- Run this BEFORE deploying the matching app/platform/page.tsx change: the app
-- filters on documents.deleted_at, and that query fails if the column is missing.

alter table documents
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by text,
  add column if not exists deleted_by_id uuid,
  add column if not exists deletion_reason text,
  add column if not exists pre_deletion_status text;

create index if not exists idx_documents_deleted_at
  on documents(org_id, deleted_at)
  where deleted_at is not null;
