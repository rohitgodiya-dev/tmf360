-- Part 14b — Document links and signposts (LNK-01..03, SGN-01..02). Plan: docs/part14-plan.md.
--
-- * document_links: typed links between two documents of the same study (amends, approves, supersedes,
--   translates, relates to), shown in both directions. Removing a link is a soft remove with a reason.
--   Readable only when both documents are readable.
-- * Signposts: a record for a document held elsewhere. It is filed like any artifact (so it is matched to
--   expected documents and counted in completeness), carries the required reference (URL or location),
--   and its file is a generated placeholder PDF saying where the original is. The signpost status is
--   irreversible and set only by mark_signpost().

create table if not exists document_links (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  study_id uuid not null references studies(id),
  from_document_id uuid not null references documents(id),
  to_document_id uuid not null references documents(id),
  link_type text not null check (link_type in ('amends', 'approves', 'supersedes', 'translates', 'relates_to')),
  note text check (note is null or length(note) <= 1000),
  removed_at timestamptz,
  removed_by uuid,
  remove_reason text,
  change_reason text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_by uuid,
  updated_at timestamptz,
  row_version integer not null default 1,
  check (from_document_id <> to_document_id),
  check (removed_at is null or length(trim(coalesce(remove_reason, ''))) >= 3)
);
create unique index if not exists document_links_active on document_links (from_document_id, to_document_id, link_type) where removed_at is null;
create index if not exists document_links_to on document_links (to_document_id);

alter table document_links enable row level security;
revoke delete, truncate on document_links from anon, authenticated;
drop policy if exists "readable with both documents" on document_links;
drop policy if exists "contributors add links" on document_links;
drop policy if exists "contributors remove links" on document_links;
create policy "readable with both documents" on document_links for select
  using (exists (select 1 from documents d where d.id = from_document_id) and exists (select 1 from documents d where d.id = to_document_id));
create policy "contributors add links" on document_links for insert
  with check (has_org_permission(org_id, 'upload_document') and can_access_study_id(study_id)
              and exists (select 1 from documents d where d.id = from_document_id) and exists (select 1 from documents d where d.id = to_document_id));
create policy "contributors remove links" on document_links for update
  using (has_org_permission(org_id, 'upload_document') and can_access_study_id(study_id))
  with check (has_org_permission(org_id, 'upload_document') and can_access_study_id(study_id));

-- Both documents must belong to the link's study, be live, and a link can only ever be removed.
create or replace function document_links_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_code text;
begin
  select study_id into v_code from studies where id = new.study_id;
  if tg_op = 'INSERT' then
    if not exists (select 1 from documents d where d.id = new.from_document_id and d.org_id = new.org_id and d.study_id = v_code and d.deleted_at is null)
       or not exists (select 1 from documents d where d.id = new.to_document_id and d.org_id = new.org_id and d.study_id = v_code and d.deleted_at is null) then
      raise exception 'Both documents must be live documents of this study';
    end if;
    if new.removed_at is not null then raise exception 'A new link cannot be removed already'; end if;
  else
    if (new.from_document_id, new.to_document_id, new.link_type) is distinct from (old.from_document_id, old.to_document_id, old.link_type) then
      raise exception 'A link cannot be changed; remove it and add a new one';
    end if;
    if old.removed_at is not null then raise exception 'This link is already removed'; end if;
    if new.removed_at is not null then new.removed_at := now(); new.removed_by := auth.uid(); new.change_reason := new.remove_reason; end if;
  end if;
  return new;
end;
$$;
drop trigger if exists document_links_before_insert on document_links;
create trigger document_links_before_insert before insert on document_links for each row execute function structure_before_insert();
drop trigger if exists document_links_before_update on document_links;
create trigger document_links_before_update before update on document_links for each row execute function structure_before_update();
drop trigger if exists document_links_zz_guard on document_links;
create trigger document_links_zz_guard before insert or update on document_links for each row execute function document_links_guard();
drop trigger if exists document_links_audit on document_links;
create trigger document_links_audit after insert or update on document_links for each row execute function structure_audit();

------------------------------------------------------------------------------
-- Signposts
------------------------------------------------------------------------------
alter table documents add column if not exists signpost boolean not null default false;
alter table documents add column if not exists signpost_reference text;

create or replace function documents_signpost_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if coalesce(current_setting('app.signpost', true), '') = 'on' then return new; end if;
  if tg_op = 'INSERT' and (new.signpost or new.signpost_reference is not null) and auth.uid() is not null then
    raise exception 'Create signposts with Add signpost';
  end if;
  if tg_op = 'UPDATE' and (new.signpost is distinct from old.signpost or new.signpost_reference is distinct from old.signpost_reference) and auth.uid() is not null then
    raise exception 'A signpost''s status and reference cannot be changed';
  end if;
  if tg_op = 'UPDATE' and old.signpost and not new.signpost then
    raise exception 'Signpost status is irreversible';
  end if;
  return new;
end;
$$;
drop trigger if exists documents_signpost_guard on documents;
create trigger documents_signpost_guard before insert or update on documents for each row execute function documents_signpost_guard();

-- The server tags the intake item that carries a generated signpost page (service role only); filing that
-- item through file_signpost() creates the signpost in one transaction. No other record can become one.
alter table intake_items add column if not exists signpost_reference text;
create or replace function intake_signpost_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;
  if tg_op = 'INSERT' then new.signpost_reference := null;
  elsif new.signpost_reference is distinct from old.signpost_reference then raise exception 'Signposts are created with Add signpost';
  end if;
  return new;
end;
$$;
drop trigger if exists intake_signpost_guard on intake_items;
create trigger intake_signpost_guard before insert or update on intake_items for each row execute function intake_signpost_guard();

drop function if exists mark_signpost(uuid, text);
create or replace function file_signpost(p_item uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  i intake_items;
  v_doc uuid;
  d documents;
begin
  select * into i from intake_items where id = p_item;
  if not found or not can_access_study_id(i.study_id) or i.created_by is distinct from auth.uid() then raise exception 'Not found' using errcode = '42501'; end if;
  if i.signpost_reference is null then raise exception 'This intake item is not a signpost'; end if;
  v_doc := file_intake_item(p_item);
  select * into d from documents where id = v_doc;
  perform set_config('app.signpost', 'on', true);
  update documents set signpost = true, signpost_reference = i.signpost_reference where id = v_doc;
  perform set_config('app.signpost', 'off', true);
  insert into audit_trail (user_id, org_id, action, study_id, document_id, document_name, field_changed, new_value)
  values (auth.uid(), d.org_id, 'Signpost created', d.study_id, d.id, coalesce(nullif(trim(d.custom_file_name), ''), d.artifact_name), 'signpost_reference', i.signpost_reference);
  return v_doc;
end;
$$;
revoke all on function file_signpost(uuid) from public, anon;
grant execute on function file_signpost(uuid) to authenticated;
