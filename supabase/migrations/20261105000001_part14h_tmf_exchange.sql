-- Part 14h — TMF Reference Model Exchange Mechanism Standard (eTMF-EMS) export and import (MIG-09).
--
-- * Export: a new export job kind 'ems' builds <TRANSFERID>/exchange.xml plus the files in a
--   zone/section/artifact folder tree, following the published TmfReferenceModelExchange.xsd
--   (namespace https://tmfrefmodel.com/ems). Includes per-file audit records and signatures. Only users who
--   manage imports and exports of whole TMFs (invite_users) can run it.
-- * Import: an EMS package becomes an isolated Part 12b import batch (mapping, dry run, reconciliation and
--   signed acceptance stay the same). Each file's INTEGRITY is checked before it is staged.
-- * ems_transfers: one row per exchange in either direction; a TRANSFERID from a source can be imported once.

alter table export_jobs drop constraint if exists export_jobs_kind_check;
alter table export_jobs add constraint export_jobs_kind_check check (kind in ('zip', 'archive', 'transfer', 'ems'));

create or replace function create_export_job(p_study uuid, p_kind text, p_options jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  s studies;
  v_id uuid;
begin
  select * into s from studies where id = p_study;
  if not found or not can_access_study_id(s.id) then raise exception 'Not found' using errcode = '42501'; end if;
  if not has_org_permission(s.org_id, 'view_document') then raise exception 'Your role does not allow exports' using errcode = '42501'; end if;
  if p_kind not in ('zip', 'ems') then raise exception 'Unknown export type'; end if;
  if p_kind = 'ems' and not has_org_permission(s.org_id, 'invite_users') then
    raise exception 'Only TMF Leads and administrators can export a TMF exchange package' using errcode = '42501';
  end if;
  if (select count(*) from export_jobs where requested_by = auth.uid() and status in ('queued', 'running')) >= 3 then
    raise exception 'You already have 3 exports running. Wait for one to finish.';
  end if;
  insert into export_jobs (org_id, study_id, kind, options, requested_by)
  values (s.org_id, s.id, p_kind, coalesce(p_options, '{}'::jsonb), auth.uid()) returning id into v_id;
  insert into audit_trail (user_id, org_id, action, study_id, field_changed, new_value)
  values (auth.uid(), s.org_id, 'Export requested', s.study_id, 'export_job:' || v_id, p_kind || ' ' || coalesce(p_options ->> 'label', ''));
  return v_id;
end;
$$;

create table if not exists ems_transfers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  study_id uuid not null references studies(id),
  direction text not null check (direction in ('export', 'import')),
  transfer_source_id text not null,
  transfer_id text not null,
  specification_id text not null,
  event_id text,
  tmfrm_version text not null,
  objects integer not null default 0,
  files integer not null default 0,
  skipped jsonb not null default '[]'::jsonb,
  exchange_xml_sha256 text,
  exchange_xml_path text,
  export_job_id uuid references export_jobs(id),
  import_batch_id uuid references import_batches(id),
  requested_by uuid not null,
  change_reason text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_by uuid,
  updated_at timestamptz,
  row_version integer not null default 1
);
create unique index if not exists ems_transfers_once on ems_transfers (org_id, direction, transfer_source_id, transfer_id);

alter table ems_transfers enable row level security;
revoke insert, update, delete, truncate on ems_transfers from anon, authenticated;
drop policy if exists "study leads read transfers" on ems_transfers;
create policy "study leads read transfers" on ems_transfers for select using (can_access_study_id(study_id) and has_org_permission(org_id, 'invite_users'));

-- Written by the server (service role) after the caller passed the route's checks; append-only.
create or replace function ems_transfers_append_only() returns trigger
language plpgsql set search_path = public as $$
begin
  raise exception 'Exchange records cannot be changed';
end;
$$;
drop trigger if exists ems_transfers_before_insert on ems_transfers;
create trigger ems_transfers_before_insert before insert on ems_transfers for each row execute function structure_before_insert();
drop trigger if exists ems_transfers_no_update on ems_transfers;
create trigger ems_transfers_no_update before update or delete on ems_transfers for each row execute function ems_transfers_append_only();
drop trigger if exists ems_transfers_audit on ems_transfers;
create trigger ems_transfers_audit after insert on ems_transfers for each row execute function structure_audit();
