-- Pillar 1 — Hash-chained audit trail
-- Matches the live database as of 2026-10-02.
--
-- Rows written before this migration have no sequence_no or org_id and sit
-- outside the chain. digest() comes from pgcrypto in the "extensions" schema,
-- which is on Supabase's default search_path.

create extension if not exists pgcrypto with schema extensions;

alter table audit_trail
  add column if not exists sequence_no bigint,
  add column if not exists prev_hash text,
  add column if not exists record_hash text;

-- Fix applied 2026-10-02: the trigger reads NEW.org_id, and without this
-- column every audit insert failed with: record "new" has no field "org_id".
alter table audit_trail
  add column if not exists org_id uuid;

create sequence if not exists audit_trail_seq;

create or replace function compute_audit_hash()
returns trigger
language plpgsql
security definer
as $$
declare
  prev_record_hash text;
  content_str text;
  v_org_id uuid;
begin
  -- Get org_id from user if not set on the row
  if NEW.org_id is null then
    select org_id into v_org_id
    from user_roles
    where user_id = NEW.user_id and is_active = true
    limit 1;
    NEW.org_id := v_org_id;
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

drop trigger if exists audit_trail_hash_chain on audit_trail;
create trigger audit_trail_hash_chain
  before insert on audit_trail
  for each row execute function compute_audit_hash();

-- Usage: select * from verify_audit_chain('<org uuid>') where not is_valid;
create or replace function verify_audit_chain(p_org_id uuid)
returns table(row_sequence_no bigint, is_valid boolean, expected_prev_hash text, actual_prev_hash text)
language plpgsql
security definer
as $$
declare
  prev_hash text := 'GENESIS';
  prev_seq bigint := null;
  rec record;
  recomputed_hash text;
  content_str text;
begin
  for rec in
    select * from audit_trail
    where org_id = p_org_id
    order by sequence_no asc
  loop
    content_str := concat(
      rec.sequence_no::text,
      rec.prev_hash,
      coalesce(rec.user_id::text,''),
      coalesce(rec.action,''),
      coalesce(rec.document_id::text,''),
      coalesce(rec.study_id,''),
      coalesce(rec.old_value,''),
      coalesce(rec.new_value,''),
      rec.created_at::text
    );
    recomputed_hash := encode(digest(content_str, 'sha256'), 'hex');

    return query select
      rec.sequence_no as row_sequence_no,
      (rec.prev_hash = prev_hash and rec.record_hash = recomputed_hash) as is_valid,
      prev_hash as expected_prev_hash,
      rec.prev_hash as actual_prev_hash;

    prev_hash := rec.record_hash;
    prev_seq := rec.sequence_no;
  end loop;
end;
$$;
