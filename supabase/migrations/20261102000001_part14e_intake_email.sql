-- Part 14e — Intake email per study and sender allow-list (STG-02, STG-03). Plan: docs/part14-plan.md (D51).
--
-- * study_intake_addresses: one address alias per study (<alias>@<inbound domain>), on or off.
-- * intake_allowed_senders: who may send documents to a study's address (an exact email or a whole
--   domain). Everyone else is refused.
-- * intake_email_log: every message received (accepted or refused, with the reason and how many
--   attachments became intake items). Append-only.
-- * intake_items gets its source (upload / email / signpost) and the sender, subject and received date.
-- Messages arrive at /api/inbound/email from the mail provider with an HMAC signature; the server stores
-- the attachments and creates intake items (service role) — they are then indexed and filed as usual.

alter table intake_items add column if not exists source text not null default 'upload' check (source in ('upload', 'email', 'signpost'));
alter table intake_items add column if not exists email_from text;
alter table intake_items add column if not exists email_subject text;
alter table intake_items add column if not exists email_received_at timestamptz;

create table if not exists study_intake_addresses (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  study_id uuid not null unique references studies(id),
  alias text not null unique check (alias ~ '^[a-z0-9][a-z0-9-]{2,40}$'),
  enabled boolean not null default true,
  change_reason text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_by uuid,
  updated_at timestamptz,
  row_version integer not null default 1
);

create table if not exists intake_allowed_senders (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  study_id uuid not null references studies(id),
  sender text not null check (sender ~ '^([^@\s]+@)?[a-z0-9.-]+\.[a-z]{2,}$'),
  removed_at timestamptz,
  change_reason text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_by uuid,
  updated_at timestamptz,
  row_version integer not null default 1
);
create unique index if not exists intake_allowed_senders_one on intake_allowed_senders (study_id, lower(sender)) where removed_at is null;

create table if not exists intake_email_log (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  study_id uuid not null references studies(id),
  message_id text,
  sender text not null,
  subject text,
  received_at timestamptz not null default now(),
  status text not null check (status in ('accepted', 'refused')),
  reason text,
  attachments integer not null default 0,
  items_created integer not null default 0
);
create unique index if not exists intake_email_log_message on intake_email_log (study_id, message_id) where message_id is not null;
drop trigger if exists intake_email_log_append_only on intake_email_log;
create trigger intake_email_log_append_only before update or delete on intake_email_log for each row execute function append_only();

do $$
declare t text;
begin
  foreach t in array array['study_intake_addresses', 'intake_allowed_senders'] loop
    execute format('alter table %I enable row level security', t);
    execute format('revoke delete, truncate on %I from anon, authenticated', t);
    execute format('drop policy if exists "study members read" on %I', t);
    execute format('drop policy if exists "leads add" on %I', t);
    execute format('drop policy if exists "leads change" on %I', t);
    execute format($p$create policy "study members read" on %I for select using (org_id in (select org_id from user_roles where user_id = auth.uid() and is_active) and can_access_study_id(study_id))$p$, t);
    execute format($p$create policy "leads add" on %I for insert with check (has_org_permission(org_id, 'invite_users') and can_access_study_id(study_id))$p$, t);
    execute format($p$create policy "leads change" on %I for update using (has_org_permission(org_id, 'invite_users') and can_access_study_id(study_id)) with check (has_org_permission(org_id, 'invite_users') and can_access_study_id(study_id))$p$, t);
    execute format('drop trigger if exists %I on %I', t || '_before_insert', t);
    execute format('create trigger %I before insert on %I for each row execute function structure_before_insert()', t || '_before_insert', t);
    execute format('drop trigger if exists %I on %I', t || '_before_update', t);
    execute format('create trigger %I before update on %I for each row execute function structure_before_update()', t || '_before_update', t);
    execute format('drop trigger if exists %I on %I', t || '_audit', t);
    execute format('create trigger %I after insert or update on %I for each row execute function structure_audit()', t || '_audit', t);
  end loop;
end $$;

alter table intake_email_log enable row level security;
revoke insert, update, delete, truncate on intake_email_log from anon, authenticated;
drop policy if exists "study members read" on intake_email_log;
create policy "study members read" on intake_email_log for select using (org_id in (select org_id from user_roles where user_id = auth.uid() and is_active) and can_access_study_id(study_id));

-- Users can't forge the email origin of an intake item.
create or replace function intake_source_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;
  if tg_op = 'INSERT' then
    new.source := 'upload'; new.email_from := null; new.email_subject := null; new.email_received_at := null;
  elsif (new.source, new.email_from, new.email_subject, new.email_received_at) is distinct from (old.source, old.email_from, old.email_subject, old.email_received_at) then
    raise exception 'The source of an intake item cannot be changed';
  end if;
  return new;
end;
$$;
drop trigger if exists intake_source_guard on intake_items;
create trigger intake_source_guard before insert or update on intake_items for each row execute function intake_source_guard();
