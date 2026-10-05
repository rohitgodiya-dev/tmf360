-- Part 12b — Migration and import (M18 MIG-01..08). Plan: docs/part12-plan.md (D43–D45).
--
-- * import_batches: an isolated import area per study (MIG-01). Nothing reaches the live TMF until the
--   batch is dry-run, reconciled and accepted with an electronic signature ("Import reconciled and
--   accepted") — business rule of M18.
-- * import_items: one source document each: the staged file (re-hashed by the server), the raw
--   manifest row, the mapped values, and its state (pending / ready / exception / excluded / imported).
-- * import_mappings: reusable source → target value mappings per organisation (MIG-02).
-- * run_import_dry_run(): applies mappings and builds the pre-import report: counts by mapped type,
--   unmapped values, missing required metadata, duplicates by hash and conflicts (MIG-03); every
--   failing item goes to the exception queue with its reasons (MIG-04).
-- * reconcile_import(): source vs target counts and server hashes item by item (MIG-05).
-- * accept_import(): signs and files every ready item through the normal documents table, so the same
--   integrity rules apply; imported records keep source system, source ID, original dates and
--   version as provenance (MIG-07).

alter table documents add column if not exists provenance jsonb;
alter table documents add column if not exists import_item_id uuid;

------------------------------------------------------------------------------
-- 1. Tables
------------------------------------------------------------------------------
create table if not exists import_batches (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  study_id uuid not null references studies(id),
  name text not null check (length(trim(name)) between 3 and 200),
  source_system text not null check (length(trim(source_system)) between 2 and 200),
  description text,
  status text not null default 'draft' check (status in ('draft', 'dry_run', 'reconciled', 'filed', 'cancelled')),
  dry_run_report jsonb,
  dry_run_at timestamptz,
  reconciliation jsonb,
  reconciled_at timestamptz,
  accepted_by uuid,
  accepted_at timestamptz,
  signature_event_id uuid references signature_events(id),
  filed_count integer,
  cancel_reason text,
  change_reason text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_by uuid,
  updated_at timestamptz,
  row_version integer not null default 1
);

create table if not exists import_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  batch_id uuid not null references import_batches(id),
  study_id uuid not null references studies(id),
  source_id text,
  source_path text not null,
  file_path text,
  file_name text,
  file_type text,
  file_size_bytes bigint,
  declared_hash text check (declared_hash is null or declared_hash ~ '^[0-9a-f]{64}$'),
  server_hash text,
  verification text not null default 'pending' check (verification in ('pending', 'verified', 'mismatch', 'missing')),
  raw jsonb not null default '{}'::jsonb,
  artifact_num text,
  target_status text check (target_status in ('Final', 'Draft')),
  study_country_id uuid references study_countries(id),
  study_site_id uuid references study_sites(id),
  title text,
  version_label text,
  effective_date date,
  owner text,
  state text not null default 'pending' check (state in ('pending', 'ready', 'exception', 'excluded', 'imported')),
  exceptions text[] not null default '{}',
  exclusion_reason text,
  document_id uuid references documents(id),
  change_reason text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_by uuid,
  updated_at timestamptz,
  row_version integer not null default 1,
  check (state <> 'excluded' or length(trim(coalesce(exclusion_reason, ''))) >= 3)
);
create index if not exists import_items_batch on import_items (batch_id, state);

create table if not exists import_mappings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  kind text not null check (kind in ('document_type', 'status', 'site', 'country')),
  source_value text not null check (length(trim(source_value)) between 1 and 300),
  target_value text not null check (length(trim(target_value)) between 1 and 300),
  change_reason text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_by uuid,
  updated_at timestamptz,
  row_version integer not null default 1
);
create unique index if not exists import_mappings_one on import_mappings (org_id, kind, lower(trim(source_value)));

do $$
declare t text;
begin
  foreach t in array array['import_batches', 'import_items', 'import_mappings'] loop
    execute format('alter table %I enable row level security', t);
    execute format('revoke delete, truncate on %I from anon, authenticated', t);
    execute format('drop trigger if exists %I on %I', t || '_before_insert', t);
    execute format('create trigger %I before insert on %I for each row execute function structure_before_insert()', t || '_before_insert', t);
    execute format('drop trigger if exists %I on %I', t || '_before_update', t);
    execute format('create trigger %I before update on %I for each row execute function structure_before_update()', t || '_before_update', t);
  end loop;
end $$;
-- Batches and mappings are audited row by row; items are audited through the batch functions
-- (a 10,000-item import would otherwise flood the trail with one row per field).
drop trigger if exists import_batches_audit on import_batches;
create trigger import_batches_audit after insert or update on import_batches for each row execute function structure_audit();
drop trigger if exists import_mappings_audit on import_mappings;
create trigger import_mappings_audit after insert or update on import_mappings for each row execute function structure_audit();

-- Migration is a lead task: invite_users (System Administrator, Sponsor Admin, TMF Lead).
drop policy if exists "leads read batches" on import_batches;
drop policy if exists "leads add batches" on import_batches;
drop policy if exists "leads change batches" on import_batches;
create policy "leads read batches" on import_batches for select using (has_org_permission(org_id, 'invite_users') and can_access_study_id(study_id));
create policy "leads add batches" on import_batches for insert with check (has_org_permission(org_id, 'invite_users') and can_access_study_id(study_id) and status = 'draft');
create policy "leads change batches" on import_batches for update using (has_org_permission(org_id, 'invite_users') and can_access_study_id(study_id))
  with check (has_org_permission(org_id, 'invite_users') and can_access_study_id(study_id));

drop policy if exists "leads read items" on import_items;
drop policy if exists "leads add items" on import_items;
drop policy if exists "leads change items" on import_items;
create policy "leads read items" on import_items for select using (has_org_permission(org_id, 'invite_users') and can_access_study_id(study_id));
create policy "leads add items" on import_items for insert with check (has_org_permission(org_id, 'invite_users') and can_access_study_id(study_id)
  and exists (select 1 from import_batches b where b.id = batch_id and b.study_id = import_items.study_id and b.status in ('draft', 'dry_run', 'reconciled')));
create policy "leads change items" on import_items for update using (has_org_permission(org_id, 'invite_users') and can_access_study_id(study_id))
  with check (has_org_permission(org_id, 'invite_users') and can_access_study_id(study_id));

drop policy if exists "org members read mappings" on import_mappings;
drop policy if exists "leads add mappings" on import_mappings;
drop policy if exists "leads change mappings" on import_mappings;
create policy "org members read mappings" on import_mappings for select using (org_id in (select org_id from user_roles where user_id = auth.uid() and is_active));
create policy "leads add mappings" on import_mappings for insert with check (has_org_permission(org_id, 'invite_users'));
create policy "leads change mappings" on import_mappings for update using (has_org_permission(org_id, 'invite_users')) with check (has_org_permission(org_id, 'invite_users'));

------------------------------------------------------------------------------
-- 2. Guards: status only through the functions; any item change undoes a reconciliation
------------------------------------------------------------------------------
create or replace function import_batches_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if coalesce(current_setting('app.import_flow', true), '') = 'on' then return new; end if;
  if old.status in ('filed', 'cancelled') then raise exception 'This import batch is % and cannot change', old.status; end if;
  if (new.status, new.dry_run_report, new.reconciliation, new.accepted_by, new.accepted_at, new.signature_event_id, new.filed_count, new.reconciled_at, new.dry_run_at)
     is distinct from (old.status, old.dry_run_report, old.reconciliation, old.accepted_by, old.accepted_at, old.signature_event_id, old.filed_count, old.reconciled_at, old.dry_run_at)
     and not (new.status = 'cancelled' and length(trim(coalesce(new.cancel_reason, ''))) >= 3
              and (new.dry_run_report, new.reconciliation, new.accepted_by) is not distinct from (old.dry_run_report, old.reconciliation, old.accepted_by)) then
    raise exception 'Run the dry run, reconciliation and acceptance through the import steps';
  end if;
  return new;
end;
$$;
drop trigger if exists import_batches_zz_guard on import_batches;
create trigger import_batches_zz_guard before update on import_batches for each row execute function import_batches_guard();

create or replace function import_items_guard() returns trigger
language plpgsql set search_path = public as $$
declare b import_batches;
begin
  select * into b from import_batches where id = new.batch_id;
  if b.status in ('filed', 'cancelled') then raise exception 'This import batch is % and its items cannot change', b.status; end if;
  if coalesce(current_setting('app.import_flow', true), '') = 'on' then return new; end if;
  -- Server-side verification is written by the server only (service role).
  if auth.uid() is not null and tg_op = 'UPDATE' and (new.server_hash, new.verification, new.document_id) is distinct from (old.server_hash, old.verification, old.document_id) then
    raise exception 'File verification is done by the server';
  end if;
  if auth.uid() is not null and tg_op = 'INSERT' then
    new.server_hash := null; new.verification := 'pending'; new.document_id := null;
    if new.state not in ('pending') then new.state := 'pending'; end if;
  end if;
  if tg_op = 'UPDATE' and new.state = 'imported' and old.state <> 'imported' then raise exception 'Items are imported only when the batch is accepted'; end if;
  if tg_op = 'UPDATE' and new.state = 'ready' and old.state <> 'ready' then raise exception 'Run the dry run to check an item'; end if;
  -- Any change after the dry run sends the batch back to draft: it must be checked again.
  if b.status in ('dry_run', 'reconciled') then
    perform set_config('app.import_flow', 'on', true);
    update import_batches set status = 'draft', reconciliation = null, reconciled_at = null where id = b.id;
    perform set_config('app.import_flow', 'off', true);
  end if;
  return new;
end;
$$;
drop trigger if exists import_items_zz_guard on import_items;
create trigger import_items_zz_guard before insert or update on import_items for each row execute function import_items_guard();

------------------------------------------------------------------------------
-- 3. Dry run (MIG-03/04)
------------------------------------------------------------------------------
create or replace function import_batch_for(p_batch uuid) returns import_batches
language plpgsql stable security definer set search_path = public as $$
declare b import_batches;
begin
  select * into b from import_batches where id = p_batch;
  if not found or not can_access_study_id(b.study_id) then raise exception 'Not found' using errcode = '42501'; end if;
  if not has_org_permission(b.org_id, 'invite_users') then raise exception 'Your role does not allow imports' using errcode = '42501'; end if;
  return b;
end;
$$;

create or replace function run_import_dry_run(p_batch uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  b import_batches;
  s studies;
  i import_items;
  v_ex text[];
  v_type text; v_status text; v_site text; v_country text;
  v_art text; v_tstatus text; v_site_id uuid; v_country_id uuid;
  v_report jsonb;
begin
  b := import_batch_for(p_batch);
  if b.status in ('filed', 'cancelled') then raise exception 'This import batch is %', b.status; end if;
  select * into s from studies where id = b.study_id;
  perform set_config('app.import_flow', 'on', true);
  for i in select * from import_items where batch_id = b.id and state <> 'excluded' and state <> 'imported' loop
    v_ex := '{}';
    v_type := nullif(trim(coalesce(i.raw ->> 'document_type', '')), '');
    v_status := nullif(trim(coalesce(i.raw ->> 'status', '')), '');
    v_site := nullif(trim(coalesce(i.raw ->> 'site', '')), '');
    v_country := nullif(trim(coalesce(i.raw ->> 'country', '')), '');
    -- Mapped values, unless the person has already set one on the item (manual re-map wins).
    v_art := coalesce(i.artifact_num, (select target_value from import_mappings m where m.org_id = b.org_id and m.kind = 'document_type' and lower(trim(m.source_value)) = lower(v_type)),
                      case when v_type ~ '^\d\d\.\d\d\.\d\d$' then v_type end);
    v_tstatus := coalesce(i.target_status, (select target_value from import_mappings m where m.org_id = b.org_id and m.kind = 'status' and lower(trim(m.source_value)) = lower(v_status)),
                          case when lower(v_status) in ('final', 'approved', 'effective') then 'Final' when lower(v_status) in ('draft', 'in progress') then 'Draft' end);
    v_site_id := coalesce(i.study_site_id, (select ss.id from study_sites ss where ss.study_id = b.study_id and (ss.site_number = v_site
                   or ss.site_number = (select target_value from import_mappings m where m.org_id = b.org_id and m.kind = 'site' and lower(trim(m.source_value)) = lower(v_site))) limit 1));
    v_country_id := coalesce(i.study_country_id, (select sc.id from study_countries sc where sc.study_id = b.study_id and (sc.country_code = upper(v_country)
                   or sc.country_code = (select target_value from import_mappings m where m.org_id = b.org_id and m.kind = 'country' and lower(trim(m.source_value)) = lower(v_country))) limit 1),
                   (select study_country_id from study_sites where id = v_site_id));

    if i.file_path is null or i.verification = 'missing' then v_ex := array_append(v_ex, 'File missing'); end if;
    if i.verification = 'mismatch' then v_ex := array_append(v_ex, 'File does not match its declared hash'); end if;
    if i.verification = 'pending' and i.file_path is not null then v_ex := array_append(v_ex, 'File not verified yet'); end if;
    if v_art is null then v_ex := array_append(v_ex, ('Unmapped document type: ' || coalesce(v_type, '(empty)')));
    elsif not exists (select 1 from tmf_config c where c.org_id = b.org_id and c.study_id = s.study_id and c.type = 'artifact' and c.artifact_num = v_art and c.is_enabled) then
      v_ex := array_append(v_ex, ('Artifact ' || v_art || ' is not enabled for this study'));
    end if;
    if v_tstatus is null then v_ex := array_append(v_ex, ('Unmapped status: ' || coalesce(v_status, '(empty)'))); end if;
    if v_site is not null and v_site_id is null then v_ex := array_append(v_ex, ('Unmapped site: ' || v_site)); end if;
    if v_country is not null and v_country_id is null then v_ex := array_append(v_ex, ('Unmapped country: ' || v_country)); end if;
    if coalesce(nullif(trim(coalesce(i.title, '')), ''), nullif(trim(coalesce(i.raw ->> 'title', '')), '')) is null then v_ex := array_append(v_ex, 'Missing title'); end if;
    if i.server_hash is not null and exists (select 1 from import_items o where o.batch_id = b.id and o.id <> i.id and o.state <> 'excluded' and o.server_hash = i.server_hash) then
      v_ex := array_append(v_ex, 'Duplicate: the same file appears more than once in this batch');
    end if;
    if i.server_hash is not null and exists (select 1 from documents d where d.org_id = b.org_id and d.study_id = s.study_id and d.deleted_at is null and d.file_hash = i.server_hash) then
      v_ex := array_append(v_ex, 'Conflict: this file is already in the study''s TMF');
    end if;

    update import_items set artifact_num = v_art, target_status = v_tstatus, study_site_id = v_site_id, study_country_id = v_country_id,
      title = coalesce(nullif(trim(coalesce(title, '')), ''), nullif(trim(coalesce(raw ->> 'title', '')), '')),
      version_label = coalesce(version_label, nullif(trim(coalesce(raw ->> 'version', '')), '')),
      effective_date = coalesce(effective_date, case when raw ->> 'effective_date' ~ '^\d{4}-\d{2}-\d{2}$' then (raw ->> 'effective_date')::date end),
      owner = coalesce(owner, nullif(trim(coalesce(raw ->> 'owner', '')), '')),
      exceptions = v_ex, state = case when cardinality(v_ex) = 0 then 'ready' else 'exception' end
    where id = i.id;
  end loop;

  select jsonb_build_object(
    'items', count(*),
    'ready', count(*) filter (where state = 'ready'),
    'exceptions', count(*) filter (where state = 'exception'),
    'excluded', count(*) filter (where state = 'excluded'),
    'by_type', coalesce((select jsonb_object_agg(k, n) from (select coalesce(artifact_num, 'unmapped') k, count(*) n from import_items where batch_id = b.id and state <> 'excluded' group by 1) x), '{}'),
    'unmapped', coalesce((select jsonb_object_agg(k, n) from (select e k, count(*) n from import_items, unnest(exceptions) e where batch_id = b.id and e like 'Unmapped%' group by 1) x), '{}'),
    'missing_metadata', count(*) filter (where 'Missing title' = any (exceptions)),
    'duplicates', count(*) filter (where exists (select 1 from unnest(exceptions) e where e like 'Duplicate%')),
    'conflicts', count(*) filter (where exists (select 1 from unnest(exceptions) e where e like 'Conflict%')),
    'unverified', count(*) filter (where exists (select 1 from unnest(exceptions) e where e like 'File%'))
  ) into v_report from import_items where batch_id = b.id;
  update import_batches set status = 'dry_run', dry_run_report = v_report, dry_run_at = now(), reconciliation = null, reconciled_at = null where id = b.id;
  perform set_config('app.import_flow', 'off', true);
  return v_report;
end;
$$;
revoke all on function run_import_dry_run(uuid) from public, anon;
grant execute on function run_import_dry_run(uuid) to authenticated;

------------------------------------------------------------------------------
-- 4. Reconciliation (MIG-05) and signed acceptance + filing (MIG-06/07)
------------------------------------------------------------------------------
create or replace function reconcile_import(p_batch uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  b import_batches;
  v jsonb;
begin
  b := import_batch_for(p_batch);
  if b.status <> 'dry_run' then raise exception 'Run the dry run first (it must be current)'; end if;
  if exists (select 1 from import_items where batch_id = b.id and state in ('pending', 'exception')) then
    raise exception 'Resolve every exception (fix, re-map or exclude with a reason) before reconciling';
  end if;
  select jsonb_build_object(
    'source_items', count(*),
    'excluded', count(*) filter (where state = 'excluded'),
    'excluded_reasons', coalesce((select jsonb_agg(jsonb_build_object('source', source_path, 'reason', exclusion_reason)) from import_items where batch_id = b.id and state = 'excluded'), '[]'),
    'to_import', count(*) filter (where state = 'ready'),
    'hash_verified', count(*) filter (where state = 'ready' and verification = 'verified' and server_hash is not null),
    'declared_hash_checked', count(*) filter (where state = 'ready' and declared_hash is not null and declared_hash = server_hash),
    'metadata_complete', count(*) filter (where state = 'ready' and artifact_num is not null and target_status is not null and coalesce(title, '') <> ''),
    'differences', count(*) filter (where state = 'ready' and (verification <> 'verified' or (declared_hash is not null and declared_hash <> server_hash)))
  ) into v from import_items where batch_id = b.id;
  if (v ->> 'differences')::int > 0 or (v ->> 'to_import')::int <> (v ->> 'hash_verified')::int then
    raise exception 'Reconciliation found differences; run the dry run again';
  end if;
  if (v ->> 'source_items')::int <> (v ->> 'excluded')::int + (v ->> 'to_import')::int then
    raise exception 'Every source item must be either imported or excluded';
  end if;
  perform set_config('app.import_flow', 'on', true);
  update import_batches set status = 'reconciled', reconciliation = v, reconciled_at = now() where id = b.id;
  perform set_config('app.import_flow', 'off', true);
  return v;
end;
$$;
revoke all on function reconcile_import(uuid) from public, anon;
grant execute on function reconcile_import(uuid) to authenticated;

create or replace function accept_import(p_batch uuid, p_reauth uuid) returns integer
language plpgsql security definer set search_path = public as $$
declare
  b import_batches;
  s studies;
  i import_items;
  v_sig uuid;
  v_signer text;
  v_doc uuid;
  v_n integer := 0;
  v_name text;
begin
  b := import_batch_for(p_batch);
  if b.status <> 'reconciled' then raise exception 'Reconcile the batch before accepting it'; end if;
  select * into s from studies where id = b.study_id;
  v_sig := sign_study_event(s, 'import_acceptance', 'Import reconciled and accepted', p_reauth, 'import_acceptance');
  select signer_email into v_signer from signature_events where id = v_sig;
  perform set_config('app.import_flow', 'on', true);
  perform set_config('app.qc_workflow', 'on', true);   -- the signed acceptance is the approval of imported Final records
  for i in select * from import_items where batch_id = b.id and state = 'ready' order by created_at loop
    select artifact_name into v_name from tmf_config where org_id = b.org_id and study_id = s.study_id and type = 'artifact' and artifact_num = i.artifact_num limit 1;
    insert into documents (org_id, study_id, user_id, status, artifact_num, artifact_name, custom_file_name, version, effective_date, owner,
      file_path, file_name, file_type, file_size, file_hash, study_country_id, study_site_id, approved_by, approved_at, signature_reason, provenance, import_item_id)
    values (b.org_id, s.study_id, auth.uid(), case when i.target_status = 'Final' then 'Approved' else 'Draft' end, i.artifact_num, v_name, i.title, i.version_label,
      i.effective_date::text, i.owner, i.file_path, i.file_name, i.file_type, i.file_size_bytes, i.server_hash, i.study_country_id, i.study_site_id,
      case when i.target_status = 'Final' then v_signer end, case when i.target_status = 'Final' then now()::text end,
      case when i.target_status = 'Final' then 'Imported: Import reconciled and accepted' end,
      jsonb_build_object('source_system', b.source_system, 'source_id', i.source_id, 'source_path', i.source_path, 'batch_id', b.id, 'batch', b.name,
                         'original_created', i.raw ->> 'created_date', 'original_status', i.raw ->> 'status', 'original_version', i.raw ->> 'version', 'original_type', i.raw ->> 'document_type'),
      i.id)
    returning id into v_doc;
    update import_items set state = 'imported', document_id = v_doc where id = i.id;
    v_n := v_n + 1;
  end loop;
  update import_batches set status = 'filed', accepted_by = auth.uid(), accepted_at = now(), signature_event_id = v_sig, filed_count = v_n where id = b.id;
  perform set_config('app.qc_workflow', 'off', true);
  perform set_config('app.import_flow', 'off', true);
  insert into audit_trail (user_id, org_id, action, study_id, field_changed, new_value, signature_reason)
  values (auth.uid(), b.org_id, 'Import accepted and filed (electronic signature)', s.study_id, 'import_batch:' || b.id,
          format('%s document(s) from %s', v_n, b.source_system), b.name);
  return v_n;
end;
$$;
revoke all on function accept_import(uuid, uuid) from public, anon;
grant execute on function accept_import(uuid, uuid) to authenticated;

-- Manual item changes (re-map, exclude with justification, re-include) are audited; the bulk updates
-- made inside the dry run and acceptance (app.import_flow) are summarised by those steps instead.
drop trigger if exists import_items_audit on import_items;
create trigger import_items_audit after update on import_items for each row
  when (coalesce(current_setting('app.import_flow', true), '') <> 'on' and auth.uid() is not null) execute function structure_audit();
