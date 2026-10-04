-- Part 5b — Document Intake duplicate checks (Baseline M05 Staging Area; Montrium §5).
--
-- Each received file is compared, on the server, with the study's live TMF documents
-- (not deleted, not Archived):
--   * same SHA-256 as a Final (Approved) document         → blocked: it can't be filed
--   * same SHA-256 as any other document, or the same file name → warning: file only after review
-- The result is stored on the intake item when it is received and checked again when it
-- is filed (a matching document may have been approved in between). Users can't change it.
-- Independent of Part 6: file_intake_item() is not changed; the filing check is a trigger.

alter table intake_items
  add column if not exists duplicate_status text not null default 'none'
    check (duplicate_status in ('none', 'warning', 'blocked')),
  add column if not exists duplicate_of uuid references documents(id),
  add column if not exists duplicate_reason text;

-- Strongest match first. Internal: called only from the trigger below and this migration.
create or replace function intake_duplicate_match(p_study uuid, p_hash text, p_name text, p_exclude uuid default null)
returns table (status text, document_id uuid, reason text)
language sql stable security definer set search_path = public as $$
  with live as (
    select d.id, d.status, d.file_hash, d.file_name, d.created_at,
           coalesce(nullif(trim(d.custom_file_name), ''), d.file_name, d.artifact_name, 'a document') as label
    from documents d join studies s on s.org_id = d.org_id and s.study_id = d.study_id
    where s.id = p_study and d.deleted_at is null and coalesce(d.status, '') <> 'Archived'
      and (p_exclude is null or d.id <> p_exclude)
  ), m as (
    select 1 as rank, 'blocked' as status, id, format('This exact file is already Final in the TMF as "%s"', label) as reason, created_at
      from live where file_hash = p_hash and status = 'Approved'
    union all
    select 2, 'warning', id, format('This exact file is already in the TMF as "%s" (%s)', label, coalesce(status, 'no status')), created_at
      from live where file_hash = p_hash and status is distinct from 'Approved'
    union all
    select 3, 'warning', id, format('A document with the same file name is already in the TMF: "%s" (%s)', label, coalesce(status, 'no status')), created_at
      from live where lower(trim(file_name)) = lower(trim(p_name))
  )
  select m.status, m.id, m.reason from m order by rank, created_at desc limit 1;
$$;
revoke all on function intake_duplicate_match(uuid, text, text, uuid) from public, anon, authenticated;

create or replace function intake_items_duplicates() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_filing boolean := tg_op = 'UPDATE' and new.status = 'filed' and old.status is distinct from 'filed';
  m record;
begin
  if tg_op = 'UPDATE' and not v_filing then
    if auth.uid() is not null and (new.duplicate_status, new.duplicate_of, new.duplicate_reason)
        is distinct from (old.duplicate_status, old.duplicate_of, old.duplicate_reason) then
      raise exception 'Only the server can record duplicate checks';
    end if;
    return new;
  end if;

  -- On receipt, and again at filing (excluding the document being created from this item).
  select * into m from intake_duplicate_match(new.study_id, new.file_hash, new.file_name,
                                              case when v_filing then new.filed_document_id end);
  if v_filing and m.status = 'blocked' then
    raise exception '% — it cannot be filed again. Reject this intake item.', m.reason;
  end if;
  new.duplicate_status := coalesce(m.status, 'none');
  new.duplicate_of := m.document_id;
  new.duplicate_reason := m.reason;
  return new;
end;
$$;

-- Runs after intake_items_a_guard and the shared before-insert/update triggers.
drop trigger if exists intake_items_c_duplicates on intake_items;
create trigger intake_items_c_duplicates before insert or update on intake_items
  for each row execute function intake_items_duplicates();

-- Check items already waiting in intake.
update intake_items i
set (duplicate_status, duplicate_of, duplicate_reason) =
    (select coalesce(m.status, 'none'), m.document_id, m.reason
     from (select 1) one left join lateral intake_duplicate_match(i.study_id, i.file_hash, i.file_name) m on true)
where i.status in ('received', 'indexed');
