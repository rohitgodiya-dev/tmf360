-- Site360 ISF audit trail: hash chain, server time and actor, append-only (as audit_trail).
--
-- isf_audit_trail had two "ALL" policies, so any member of the site organisation could
-- update or delete audit entries, and actor, time and organisation came from the browser.
--
-- * Each organisation's entries form a SHA-256 chain (sequence_no, prev_hash, record_hash),
--   checked by verify_isf_audit_chain(org_id). Existing entries are chained in time order.
-- * With a user session, created_at is the server's now(), actor_id/actor_email come from
--   the JWT, and the organisation must be one the user belongs to.
-- * Users can read and add entries only. Updates are never allowed; deletes only without a
--   user session (service role: retention jobs, test cleanup).

alter table isf_audit_trail add column if not exists sequence_no bigint;
alter table isf_audit_trail add column if not exists prev_hash text;
alter table isf_audit_trail add column if not exists record_hash text;
create sequence if not exists isf_audit_trail_seq;
create index if not exists isf_audit_trail_org_seq on isf_audit_trail (org_id, sequence_no);

-- The content each record_hash covers. Used by the trigger, the backfill and the verifier.
create or replace function isf_audit_content(r isf_audit_trail) returns text
language sql stable set search_path = public as $$
  select concat_ws('|',
    r.sequence_no::text, r.prev_hash, r.org_id::text, coalesce(r.site_id::text, ''),
    coalesce(r.study_id::text, ''), coalesce(r.document_id::text, ''), coalesce(r.actor_id::text, ''),
    coalesce(r.actor_email, ''), coalesce(r.action, ''), coalesce(r.previous_value, ''),
    coalesce(r.new_value, ''), coalesce(r.signature_reason, ''), r.created_at::text)
$$;

-- Chain the existing entries, oldest first, per organisation.
do $$
declare
  r isf_audit_trail;
  v_prev text;
  v_org uuid;
begin
  for r in select * from isf_audit_trail where sequence_no is null order by org_id, created_at, id loop
    if v_org is distinct from r.org_id then
      v_org := r.org_id;
      select record_hash into v_prev from isf_audit_trail
        where org_id = r.org_id and sequence_no is not null order by sequence_no desc limit 1;
    end if;
    r.sequence_no := nextval('isf_audit_trail_seq');
    r.prev_hash := coalesce(v_prev, 'GENESIS');
    r.record_hash := encode(extensions.digest(isf_audit_content(r), 'sha256'), 'hex');
    update isf_audit_trail set sequence_no = r.sequence_no, prev_hash = r.prev_hash, record_hash = r.record_hash
      where id = r.id;
    v_prev := r.record_hash;
  end loop;
end;
$$;

alter table isf_audit_trail alter column sequence_no set not null;
alter table isf_audit_trail alter column prev_hash set not null;
alter table isf_audit_trail alter column record_hash set not null;
alter table isf_audit_trail alter column org_id set not null;

create or replace function isf_audit_chain() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_uid uuid := auth.uid();
begin
  new.created_at := now();
  if v_uid is not null then
    new.actor_id := v_uid;
    new.actor_email := coalesce(jwt_email(), new.actor_email);
    if not exists (select 1 from user_roles where user_id = v_uid and org_id = new.org_id and is_active) then
      raise exception 'isf_audit_trail: not a member of organisation %', new.org_id using errcode = '42501';
    end if;
  end if;

  -- Serialise appends per organisation so the chain can't fork.
  perform pg_advisory_xact_lock(hashtext('isf_audit:' || new.org_id::text));
  select record_hash into new.prev_hash from isf_audit_trail
    where org_id = new.org_id order by sequence_no desc limit 1;
  new.prev_hash := coalesce(new.prev_hash, 'GENESIS');
  new.sequence_no := nextval('isf_audit_trail_seq');
  new.record_hash := encode(digest(isf_audit_content(new), 'sha256'), 'hex');
  return new;
end;
$$;

drop trigger if exists isf_audit_chain on isf_audit_trail;
create trigger isf_audit_chain before insert on isf_audit_trail
  for each row execute function isf_audit_chain();

create or replace function isf_audit_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'DELETE' and auth.uid() is null then return old; end if;
  raise exception 'isf_audit_trail is append-only: % is not allowed', tg_op;
end;
$$;

drop trigger if exists isf_audit_append_only on isf_audit_trail;
create trigger isf_audit_append_only before update or delete on isf_audit_trail
  for each row execute function isf_audit_guard();

drop policy if exists "org isolation" on isf_audit_trail;
drop policy if exists "site360 study access" on isf_audit_trail;
drop policy if exists "site members read isf audit" on isf_audit_trail;
drop policy if exists "site members add isf audit" on isf_audit_trail;
create policy "site members read isf audit" on isf_audit_trail for select
  using (org_id in (select org_id from user_roles where user_id = auth.uid() and is_active));
create policy "site members add isf audit" on isf_audit_trail for insert
  with check (org_id in (select org_id from user_roles where user_id = auth.uid() and is_active));

-- One row per entry; is_valid is false where the chain is broken or an entry was altered.
create or replace function verify_isf_audit_chain(p_org_id uuid)
returns table (row_sequence_no bigint, is_valid boolean)
language plpgsql stable security definer set search_path = public, extensions as $$
declare
  v_prev text := 'GENESIS';
  r isf_audit_trail;
begin
  if auth.uid() is not null and not exists (
    select 1 from user_roles where user_id = auth.uid() and org_id = p_org_id and is_active
  ) then
    raise exception 'not a member of organisation %', p_org_id using errcode = '42501';
  end if;
  for r in select * from isf_audit_trail where org_id = p_org_id order by sequence_no loop
    row_sequence_no := r.sequence_no;
    is_valid := r.prev_hash = v_prev
      and r.record_hash = encode(digest(isf_audit_content(r), 'sha256'), 'hex');
    return next;
    v_prev := r.record_hash;
  end loop;
end;
$$;
