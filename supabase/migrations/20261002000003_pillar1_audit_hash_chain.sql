-- Pillar 1 — Hash-chained audit trail
--
-- Changes from the original draft:
--  * audit_trail.org_id is added if missing, and filled from user_roles when the
--    client doesn't send it. The app's existing audit inserts never set org_id, so
--    with the original trigger every row would have started its own chain ('GENESIS').
--  * Inserts are serialized per org with an advisory lock; otherwise two concurrent
--    inserts can both link to the same predecessor and fork the chain.
--  * pgcrypto lives in the "extensions" schema on Supabase, so digest() is
--    schema-qualified and the functions pin search_path.
--  * created_at is hashed in a fixed UTC format (timestamptz::text depends on the
--    session's TimeZone, so re-verifying from another session could falsely fail).
--  * Fields are joined with a separator so values can't be shifted between columns
--    without changing the hash; user_email, field_changed, signature_reason and
--    document_name are now covered too.
--  * verify_audit_chain also recomputes each record_hash, so edits to row content
--    are detected — not just broken links. The original version also failed to run:
--    its "prev_hash" variable and "sequence_no" output column clashed with
--    audit_trail column names ("column reference is ambiguous").
--  * Rows written before this migration have no sequence_no and are outside the chain.

create extension if not exists pgcrypto with schema extensions;

alter table audit_trail
  add column if not exists org_id uuid,
  add column if not exists sequence_no bigint,
  add column if not exists prev_hash text,
  add column if not exists record_hash text;

create sequence if not exists audit_trail_seq;

-- The exact string that is hashed for each row. Shared by the trigger and the verifier.
create or replace function audit_record_content(r audit_trail)
returns text
language sql
stable
set search_path = public
as $$
  select concat_ws('|',
    r.sequence_no::text,
    r.prev_hash,
    coalesce(r.org_id::text, ''),
    coalesce(r.user_id::text, ''),
    coalesce(r.user_email, ''),
    coalesce(r.action, ''),
    coalesce(r.document_id::text, ''),
    coalesce(r.document_name, ''),
    coalesce(r.study_id::text, ''),
    coalesce(r.field_changed, ''),
    coalesce(r.old_value, ''),
    coalesce(r.new_value, ''),
    coalesce(r.signature_reason, ''),
    to_char(r.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
  );
$$;

create or replace function compute_audit_hash()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_prev_hash text;
begin
  if NEW.org_id is null then
    select ur.org_id into NEW.org_id
    from user_roles ur
    where ur.user_id = NEW.user_id and ur.is_active = true
    limit 1;
  end if;

  NEW.created_at := coalesce(NEW.created_at, now());

  -- Held until the transaction commits, so the next insert for this org sees this row.
  perform pg_advisory_xact_lock(hashtext('audit_trail:' || coalesce(NEW.org_id::text, '')));

  select a.record_hash into v_prev_hash
  from audit_trail a
  where a.org_id is not distinct from NEW.org_id
    and a.sequence_no is not null
  order by a.sequence_no desc
  limit 1;

  NEW.sequence_no := nextval('audit_trail_seq');
  NEW.prev_hash := coalesce(v_prev_hash, 'GENESIS');
  NEW.record_hash := encode(extensions.digest(audit_record_content(NEW), 'sha256'), 'hex');

  return NEW;
end;
$$;

drop trigger if exists audit_trail_hash_chain on audit_trail;
create trigger audit_trail_hash_chain
  before insert on audit_trail
  for each row execute function compute_audit_hash();

-- Usage: select * from verify_audit_chain('<org uuid>') where not is_valid;
-- Runs as the caller (no security definer), so RLS limits it to rows the caller can see.
drop function if exists verify_audit_chain(uuid);
create function verify_audit_chain(p_org_id uuid)
returns table(
  sequence_no bigint,
  is_valid boolean,
  link_valid boolean,
  hash_valid boolean,
  expected_prev_hash text,
  actual_prev_hash text
)
language plpgsql
stable
set search_path = public, extensions
as $$
declare
  v_expected text := 'GENESIS';
  r audit_trail;
begin
  for r in
    select * from audit_trail a
    where a.org_id = p_org_id and a.sequence_no is not null
    order by a.sequence_no asc
  loop
    sequence_no := r.sequence_no;
    expected_prev_hash := v_expected;
    actual_prev_hash := r.prev_hash;
    link_valid := r.prev_hash is not distinct from v_expected;
    hash_valid := r.record_hash is not distinct from
      encode(extensions.digest(audit_record_content(r), 'sha256'), 'hex');
    is_valid := link_valid and hash_valid;
    return next;
    v_expected := r.record_hash;
  end loop;
end;
$$;
