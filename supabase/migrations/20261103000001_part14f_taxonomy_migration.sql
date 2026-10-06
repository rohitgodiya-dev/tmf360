-- Part 14f — Taxonomy version pinning, version mappings and guided study migration (RM-04, RM-05).
-- Plan: docs/part14-plan.md. Baseline business rule: changing a study's taxonomy version never alters filed
-- records; it creates a mapped view and an audit entry. Retired record types stay readable.
--
-- * studies.taxonomy_version_id: each study is pinned to one taxonomy version (existing studies: the
--   active version at the time of this migration).
-- * taxonomy_version_mappings: published with a taxonomy package (loaded by the platform, not by users):
--   from-artifact → to-artifact with kind one_to_one / split (several rows) / merge / retired.
-- * study_taxonomy_migrations: one guided migration of a study to a target version: impact report,
--   per-document decisions for splits, then execution with an electronic signature "Mapping approved".
-- * document_taxonomy_map: the mapped view — each document's record type in the study's (new) version.
--   documents themselves are not changed.

alter table studies add column if not exists taxonomy_version_id uuid references taxonomy_versions(id);
-- One-time pinning of existing studies (closed studies included: the lifecycle flag allows this system update).
select set_config('app.study_lifecycle', 'on', false);
update studies set taxonomy_version_id = (select id from taxonomy_versions where status = 'active' order by loaded_at limit 1)
  where taxonomy_version_id is null and exists (select 1 from taxonomy_versions where status = 'active');
select set_config('app.study_lifecycle', 'off', false);

create table if not exists taxonomy_version_mappings (
  id uuid primary key default gen_random_uuid(),
  from_version_id uuid not null references taxonomy_versions(id),
  to_version_id uuid not null references taxonomy_versions(id),
  from_artifact_id uuid not null references taxonomy_artifacts(id),
  to_artifact_id uuid references taxonomy_artifacts(id),
  kind text not null check (kind in ('one_to_one', 'split', 'merge', 'retired')),
  note text,
  check ((kind = 'retired') = (to_artifact_id is null)),
  check (from_version_id <> to_version_id)
);
create unique index if not exists taxonomy_version_mappings_one on taxonomy_version_mappings (from_artifact_id, to_version_id, coalesce(to_artifact_id, '00000000-0000-0000-0000-000000000000'::uuid));
alter table taxonomy_version_mappings enable row level security;
drop policy if exists "readable" on taxonomy_version_mappings;
create policy "readable" on taxonomy_version_mappings for select to authenticated using (true);
revoke insert, update, delete, truncate on taxonomy_version_mappings from anon, authenticated;

create table if not exists study_taxonomy_migrations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  study_id uuid not null references studies(id),
  from_version_id uuid not null references taxonomy_versions(id),
  to_version_id uuid not null references taxonomy_versions(id),
  status text not null default 'planned' check (status in ('planned', 'executed', 'cancelled')),
  impact jsonb,
  decisions jsonb not null default '{}'::jsonb,
  signature_event_id uuid references signature_events(id),
  executed_by uuid,
  executed_at timestamptz,
  cancel_reason text,
  change_reason text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_by uuid,
  updated_at timestamptz,
  row_version integer not null default 1
);
create unique index if not exists study_taxonomy_migrations_open on study_taxonomy_migrations (study_id) where status = 'planned';

create table if not exists document_taxonomy_map (
  document_id uuid not null references documents(id),
  migration_id uuid not null references study_taxonomy_migrations(id),
  org_id uuid not null references organizations(id),
  study_id uuid not null references studies(id),
  version_id uuid not null references taxonomy_versions(id),
  from_artifact_id uuid references taxonomy_artifacts(id),
  to_artifact_id uuid references taxonomy_artifacts(id),
  outcome text not null check (outcome in ('mapped', 'chosen', 'retired', 'unchanged')),
  created_at timestamptz not null default now(),
  primary key (document_id, version_id)
);
drop trigger if exists document_taxonomy_map_append_only on document_taxonomy_map;
create trigger document_taxonomy_map_append_only before update or delete on document_taxonomy_map for each row execute function append_only();

alter table study_taxonomy_migrations enable row level security;
alter table document_taxonomy_map enable row level security;
revoke insert, update, delete, truncate on study_taxonomy_migrations, document_taxonomy_map from anon, authenticated;
drop policy if exists "study members read" on study_taxonomy_migrations;
create policy "study members read" on study_taxonomy_migrations for select using (org_id in (select org_id from user_roles where user_id = auth.uid() and is_active) and can_access_study_id(study_id));
drop policy if exists "readable with the document" on document_taxonomy_map;
create policy "readable with the document" on document_taxonomy_map for select using (exists (select 1 from documents d where d.id = document_id));
drop trigger if exists study_taxonomy_migrations_before_insert on study_taxonomy_migrations;
create trigger study_taxonomy_migrations_before_insert before insert on study_taxonomy_migrations for each row execute function structure_before_insert();
drop trigger if exists study_taxonomy_migrations_before_update on study_taxonomy_migrations;
create trigger study_taxonomy_migrations_before_update before update on study_taxonomy_migrations for each row execute function structure_before_update();
drop trigger if exists study_taxonomy_migrations_audit on study_taxonomy_migrations;
create trigger study_taxonomy_migrations_audit after insert or update on study_taxonomy_migrations for each row execute function structure_audit();

-- The study's taxonomy version changes only through a signed migration.
create or replace function studies_taxonomy_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if auth.uid() is not null and coalesce(current_setting('app.taxonomy_migration', true), '') <> 'on'
     and new.taxonomy_version_id is distinct from old.taxonomy_version_id then
    raise exception 'Change a study''s taxonomy version with a signed taxonomy migration';
  end if;
  return new;
end;
$$;
drop trigger if exists studies_taxonomy_guard on studies;
create trigger studies_taxonomy_guard before update on studies for each row execute function studies_taxonomy_guard();

-- Each live document's current record type in the study's pinned version: the mapped one if the study was
-- migrated, otherwise its own classification.
create or replace function study_document_types(p_study uuid)
returns table (document_id uuid, artifact_id uuid, artifact_num text, artifact_name text, version_id uuid)
language sql stable security definer set search_path = public as $$
  select d.id, coalesce(m.to_artifact_id, ta.id), coalesce(mt.artifact_num, ta.artifact_num, d.artifact_num), coalesce(mt.name, ta.name, d.artifact_name),
         coalesce(m.version_id, ta.version_id)
  from studies s
  join documents d on d.org_id = s.org_id and d.study_id = s.study_id and d.deleted_at is null
  left join taxonomy_artifacts ta on ta.id = d.taxonomy_artifact_id
  left join document_taxonomy_map m on m.document_id = d.id and m.version_id = s.taxonomy_version_id
  left join taxonomy_artifacts mt on mt.id = m.to_artifact_id
  where s.id = p_study
$$;
revoke all on function study_document_types(uuid) from public, anon;

-- Impact report (RM-05): what happens to each document if the study moves to p_to.
create or replace function taxonomy_migration_impact(p_study uuid, p_to uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  s studies;
  v jsonb;
begin
  select * into s from studies where id = p_study;
  if not found or not can_access_study_id(s.id) then raise exception 'Not found' using errcode = '42501'; end if;
  with docs as (select * from study_document_types(p_study)),
  m as (
    select dd.document_id, dd.artifact_id, dd.artifact_num, count(mp.id) filter (where mp.kind <> 'retired') as targets,
           bool_or(mp.kind = 'retired') as retired, bool_or(mp.kind = 'split') as split,
           (array_agg(mp.to_artifact_id) filter (where mp.kind <> 'retired'))[1] as only_target,
           jsonb_agg(jsonb_build_object('artifact_id', ta.id, 'artifact_num', ta.artifact_num, 'name', ta.name)) filter (where mp.kind <> 'retired') as options
    from docs dd
    left join taxonomy_version_mappings mp on mp.from_artifact_id = dd.artifact_id and mp.to_version_id = p_to
    left join taxonomy_artifacts ta on ta.id = mp.to_artifact_id
    group by dd.document_id, dd.artifact_id, dd.artifact_num
  )
  select jsonb_build_object(
    'documents', count(*),
    'mapped', count(*) filter (where targets = 1 and not coalesce(split, false)),
    'needs_choice', count(*) filter (where targets > 1 or coalesce(split, false) and targets >= 1),
    'retired', count(*) filter (where coalesce(retired, false) and targets = 0),
    'unmapped', count(*) filter (where targets = 0 and not coalesce(retired, false)),
    'choices', coalesce(jsonb_agg(jsonb_build_object('document_id', document_id, 'artifact_num', artifact_num, 'options', options))
                 filter (where targets > 1 or coalesce(split, false) and targets >= 1), '[]'::jsonb),
    'unmapped_documents', coalesce(jsonb_agg(jsonb_build_object('document_id', document_id, 'artifact_num', artifact_num))
                 filter (where targets = 0 and not coalesce(retired, false)), '[]'::jsonb)
  ) into v from m;
  return v;
end;
$$;
revoke all on function taxonomy_migration_impact(uuid, uuid) from public, anon;
grant execute on function taxonomy_migration_impact(uuid, uuid) to authenticated;

-- Plans a migration and records its impact report.
create or replace function plan_taxonomy_migration(p_study uuid, p_to uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  s studies;
  v_id uuid;
begin
  select * into s from studies where id = p_study;
  if not found or not can_access_study_id(s.id) then raise exception 'Not found' using errcode = '42501'; end if;
  if not has_org_permission(s.org_id, 'invite_users') then raise exception 'Your role does not allow taxonomy migrations' using errcode = '42501'; end if;
  if s.taxonomy_version_id is null then raise exception 'This study is not pinned to a taxonomy version'; end if;
  if p_to = s.taxonomy_version_id then raise exception 'The study already uses this version'; end if;
  if not exists (select 1 from taxonomy_version_mappings where from_version_id = s.taxonomy_version_id and to_version_id = p_to) then
    raise exception 'No published mapping from the study''s version to that version';
  end if;
  insert into study_taxonomy_migrations (study_id, from_version_id, to_version_id, impact, change_reason)
  values (s.id, s.taxonomy_version_id, p_to, taxonomy_migration_impact(s.id, p_to), 'Planned') returning id into v_id;
  return v_id;
end;
$$;
revoke all on function plan_taxonomy_migration(uuid, uuid) from public, anon;
grant execute on function plan_taxonomy_migration(uuid, uuid) to authenticated;

-- Executes a planned migration with an electronic signature ("Mapping approved"): every document gets its
-- mapped record type in the new version (choices required for splits), the study is pinned to the new
-- version, and the audit trail records it. Filed records are not changed.
create or replace function execute_taxonomy_migration(p_migration uuid, p_decisions jsonb, p_reauth uuid) returns integer
language plpgsql security definer set search_path = public as $$
declare
  mg study_taxonomy_migrations;
  s studies;
  v_impact jsonb;
  c jsonb;
  v_choice uuid;
  v_sig uuid;
  v_n integer := 0;
begin
  select * into mg from study_taxonomy_migrations where id = p_migration for update;
  if not found or not can_access_study_id(mg.study_id) then raise exception 'Not found' using errcode = '42501'; end if;
  if not has_org_permission(mg.org_id, 'invite_users') then raise exception 'Your role does not allow taxonomy migrations' using errcode = '42501'; end if;
  if mg.status <> 'planned' then raise exception 'This migration is already %', mg.status; end if;
  select * into s from studies where id = mg.study_id for update;
  if s.taxonomy_version_id is distinct from mg.from_version_id then raise exception 'The study''s version changed since this migration was planned'; end if;
  v_impact := taxonomy_migration_impact(s.id, mg.to_version_id);   -- re-check against the current documents
  if (v_impact ->> 'unmapped')::int > 0 then raise exception '% document(s) have no mapping to the new version', v_impact ->> 'unmapped'; end if;
  for c in select * from jsonb_array_elements(v_impact -> 'choices') loop
    v_choice := nullif(p_decisions ->> (c ->> 'document_id'), '')::uuid;
    if v_choice is null or not exists (select 1 from jsonb_array_elements(c -> 'options') o where (o ->> 'artifact_id')::uuid = v_choice) then
      raise exception 'Choose the new record type for every split document (missing for %)', c ->> 'artifact_num';
    end if;
  end loop;

  v_sig := sign_study_event(s, 'taxonomy_migration', 'Mapping approved', p_reauth, 'taxonomy_migration');
  insert into document_taxonomy_map (document_id, migration_id, org_id, study_id, version_id, from_artifact_id, to_artifact_id, outcome)
  select dt.document_id, mg.id, mg.org_id, s.id, mg.to_version_id, dt.artifact_id,
         case when ch.v is not null then ch.v::uuid else mp.to_artifact_id end,
         case when ch.v is not null then 'chosen' when mp.kind = 'retired' then 'retired' else 'mapped' end
  from study_document_types(s.id) dt
  left join lateral (select p_decisions ->> dt.document_id::text as v) ch on true
  left join lateral (select m2.to_artifact_id, m2.kind from taxonomy_version_mappings m2
                     where m2.from_artifact_id = dt.artifact_id and m2.to_version_id = mg.to_version_id
                     order by (m2.kind = 'retired') limit 1) mp on true;
  get diagnostics v_n = row_count;

  perform set_config('app.taxonomy_migration', 'on', true);
  update studies set taxonomy_version_id = mg.to_version_id where id = s.id;
  perform set_config('app.taxonomy_migration', 'off', true);
  update study_taxonomy_migrations set status = 'executed', decisions = coalesce(p_decisions, '{}'::jsonb), impact = v_impact, signature_event_id = v_sig,
    executed_by = auth.uid(), executed_at = now(), change_reason = 'Executed (Mapping approved)' where id = mg.id;
  insert into audit_trail (user_id, org_id, action, study_id, field_changed, old_value, new_value, signature_reason)
  values (auth.uid(), mg.org_id, 'Taxonomy version migrated (electronic signature)', s.study_id, 'studies.taxonomy_version_id',
          mg.from_version_id::text, mg.to_version_id::text, format('%s document(s) mapped; filed records unchanged', v_n));
  return v_n;
end;
$$;
revoke all on function execute_taxonomy_migration(uuid, jsonb, uuid) from public, anon;
grant execute on function execute_taxonomy_migration(uuid, jsonb, uuid) to authenticated;

-- New studies are pinned to the active taxonomy version when created (RM-04).
create or replace function studies_pin_taxonomy() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.taxonomy_version_id is null then
    new.taxonomy_version_id := (select id from taxonomy_versions where status = 'active' order by loaded_at limit 1);
  end if;
  return new;
end;
$$;
drop trigger if exists studies_pin_taxonomy on studies;
create trigger studies_pin_taxonomy before insert on studies for each row execute function studies_pin_taxonomy();

create or replace function cancel_taxonomy_migration(p_migration uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare mg study_taxonomy_migrations;
begin
  select * into mg from study_taxonomy_migrations where id = p_migration for update;
  if not found or not can_access_study_id(mg.study_id) then raise exception 'Not found' using errcode = '42501'; end if;
  if not has_org_permission(mg.org_id, 'invite_users') then raise exception 'Your role does not allow taxonomy migrations' using errcode = '42501'; end if;
  if mg.status <> 'planned' then raise exception 'This migration is already %', mg.status; end if;
  if length(trim(coalesce(p_reason, ''))) < 3 then raise exception 'Give a reason'; end if;
  update study_taxonomy_migrations set status = 'cancelled', cancel_reason = trim(p_reason), change_reason = trim(p_reason) where id = mg.id;
end;
$$;
revoke all on function cancel_taxonomy_migration(uuid, text) from public, anon;
grant execute on function cancel_taxonomy_migration(uuid, text) to authenticated;
