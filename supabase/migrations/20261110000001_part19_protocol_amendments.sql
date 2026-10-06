-- Part 19 — protocol amendment cascade (docs/enterprise-plan-review.md) (ENT-11)
--
-- * protocol_amendments: a Final protocol (02.01.02) or protocol amendment (02.01.04) document registered as a
--   protocol version with its effective date and re-consent requirement. Registering cascades one acknowledgement
--   row to every site of the study that is selected, qualified or active.
-- * amendment_site_acknowledgements: each site acknowledges the amendment and records re-consent progress.
-- Writes only through the functions below (permission-checked, server-stamped, audited); the tables are read
-- by anyone with access to the study, and a closed study is read-only.

create table if not exists protocol_amendments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  study_id uuid not null references studies(id),
  document_id uuid not null references documents(id),
  amendment_number text not null check (length(trim(amendment_number)) between 1 and 50),
  protocol_version text not null check (length(trim(protocol_version)) between 1 and 50),
  effective_date date not null,
  reconsent_required boolean not null default false,
  reconsent_deadline date,
  status text not null default 'active' check (status in ('active', 'withdrawn')),
  notes text check (notes is null or length(notes) <= 2000),
  created_at timestamptz not null default now(),
  created_by uuid,
  created_by_email text,
  check (not reconsent_required or reconsent_deadline is not null)
);
create unique index if not exists protocol_amendments_number on protocol_amendments (study_id, lower(amendment_number));
create unique index if not exists protocol_amendments_document on protocol_amendments (document_id);

create table if not exists amendment_site_acknowledgements (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  study_id uuid not null references studies(id),
  amendment_id uuid not null references protocol_amendments(id),
  study_site_id uuid not null references study_sites(id),
  status text not null default 'pending' check (status in ('pending', 'acknowledged')),
  acknowledged_by uuid,
  acknowledged_by_email text,
  acknowledged_at timestamptz,
  acknowledgement_note text check (acknowledgement_note is null or length(acknowledgement_note) <= 2000),
  reconsent_count integer not null default 0 check (reconsent_count >= 0),
  reconsent_completed boolean not null default false,
  reconsent_completed_at timestamptz,
  updated_at timestamptz,
  updated_by uuid,
  unique (amendment_id, study_site_id)
);
create index if not exists amendment_acks_study on amendment_site_acknowledgements (study_id, status);

alter table protocol_amendments enable row level security;
alter table amendment_site_acknowledgements enable row level security;
revoke insert, update, delete, truncate on protocol_amendments, amendment_site_acknowledgements from anon, authenticated;
drop policy if exists "amendments readable" on protocol_amendments;
create policy "amendments readable" on protocol_amendments for select to authenticated using (can_access_study_id(study_id));
drop policy if exists "amendment acks readable" on amendment_site_acknowledgements;
create policy "amendment acks readable" on amendment_site_acknowledgements for select to authenticated using (can_access_study_id(study_id));

-- A closed study is read-only (Part 11c guard).
drop trigger if exists aa_closed_study_guard on protocol_amendments;
create trigger aa_closed_study_guard before insert or update or delete on protocol_amendments for each row execute function closed_study_guard();
drop trigger if exists aa_closed_study_guard on amendment_site_acknowledgements;
create trigger aa_closed_study_guard before insert or update or delete on amendment_site_acknowledgements for each row execute function closed_study_guard();

-- Can the current user act for this site? Study editors always; otherwise a person recorded as a current
-- contact at the site (PI, coordinator, …) whose email is the user's.
create or replace function can_act_for_site(p_site uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from study_sites ss where ss.id = p_site and can_access_study_id(ss.study_id))
     and (user_has_permission('edit_study') or exists (
       select 1 from contact_roles cr join persons p on p.id = cr.person_id
       where cr.scope_type = 'site' and cr.scope_id = p_site
         and (cr.end_date is null or cr.end_date >= current_date)
         and lower(p.email) = lower(coalesce(jwt_email(), ''))));
$$;
revoke all on function can_act_for_site(uuid) from public, anon;
grant execute on function can_act_for_site(uuid) to authenticated;

create or replace function register_amendment(p_document uuid, p_number text, p_version text, p_effective date,
  p_reconsent boolean, p_reconsent_deadline date, p_notes text default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  d documents;
  s studies;
  v_id uuid;
  v_sites integer;
begin
  select * into d from documents where id = p_document and deleted_at is null;
  if not found then raise exception 'Not found' using errcode = '42501'; end if;
  select * into s from studies where org_id = d.org_id and study_id = d.study_id order by created_at limit 1;
  if s.id is null or not can_access_study_id(s.id) then raise exception 'Not found' using errcode = '42501'; end if;
  if not has_org_permission(s.org_id, 'edit_study') then raise exception 'Your role does not allow registering protocol amendments' using errcode = '42501'; end if;
  if d.artifact_num not in ('02.01.02', '02.01.04') then raise exception 'Only a Protocol (02.01.02) or Protocol Amendment (02.01.04) document can be registered'; end if;
  if d.status not in ('Approved', 'Archived') then raise exception 'The protocol document must be Final (approved) before it is registered'; end if;
  if length(trim(coalesce(p_number, ''))) = 0 or length(trim(coalesce(p_version, ''))) = 0 then raise exception 'Give the amendment number and protocol version'; end if;
  if p_effective is null then raise exception 'Give the effective date'; end if;
  if p_reconsent and p_reconsent_deadline is null then raise exception 'Give the re-consent deadline'; end if;
  if p_reconsent and p_reconsent_deadline < p_effective then raise exception 'The re-consent deadline cannot be before the effective date'; end if;

  insert into protocol_amendments (org_id, study_id, document_id, amendment_number, protocol_version, effective_date,
    reconsent_required, reconsent_deadline, notes, created_by, created_by_email)
  values (s.org_id, s.id, d.id, trim(p_number), trim(p_version), p_effective, coalesce(p_reconsent, false),
    case when p_reconsent then p_reconsent_deadline end, nullif(trim(coalesce(p_notes, '')), ''), auth.uid(), coalesce(jwt_email(), 'system'))
  returning id into v_id;

  -- The cascade: every site that is selected, qualified or active must acknowledge.
  insert into amendment_site_acknowledgements (org_id, study_id, amendment_id, study_site_id)
  select s.org_id, s.id, v_id, ss.id from study_sites ss
  where ss.study_id = s.id and ss.status in ('selected', 'qualified', 'ongoing');
  get diagnostics v_sites = row_count;

  insert into audit_trail (user_id, user_email, org_id, action, study_id, document_id, field_changed, new_value)
  values (auth.uid(), coalesce(jwt_email(), 'system'), s.org_id, 'Protocol amendment registered', s.study_id, d.id, 'protocol_amendments:' || v_id,
    format('Amendment %s, protocol version %s, effective %s%s; %s site(s) to acknowledge', trim(p_number), trim(p_version), p_effective,
      case when p_reconsent then ', re-consent by ' || p_reconsent_deadline else '' end, v_sites));
  return v_id;
end;
$$;
revoke all on function register_amendment(uuid, text, text, date, boolean, date, text) from public, anon;
grant execute on function register_amendment(uuid, text, text, date, boolean, date, text) to authenticated;

create or replace function acknowledge_amendment(p_ack uuid, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
declare a amendment_site_acknowledgements;
begin
  select * into a from amendment_site_acknowledgements where id = p_ack for update;
  if not found or not can_access_study_id(a.study_id) then raise exception 'Not found' using errcode = '42501'; end if;
  if not can_act_for_site(a.study_site_id) then raise exception 'Only the site team or a study manager can acknowledge for this site' using errcode = '42501'; end if;
  if a.status = 'acknowledged' then raise exception 'This site has already acknowledged the amendment'; end if;
  update amendment_site_acknowledgements set status = 'acknowledged', acknowledged_by = auth.uid(), acknowledged_by_email = coalesce(jwt_email(), 'system'),
    acknowledged_at = now(), acknowledgement_note = nullif(trim(coalesce(p_note, '')), ''), updated_at = now(), updated_by = auth.uid()
  where id = a.id;
  insert into audit_trail (user_id, user_email, org_id, action, study_id, field_changed, new_value, signature_reason)
  select auth.uid(), coalesce(jwt_email(), 'system'), a.org_id, 'Protocol amendment acknowledged', s.study_id, 'amendment_site_acknowledgements:' || a.id,
    'site ' || ss.site_number || ', amendment ' || pa.amendment_number, nullif(trim(coalesce(p_note, '')), '')
  from studies s, study_sites ss, protocol_amendments pa where s.id = a.study_id and ss.id = a.study_site_id and pa.id = a.amendment_id;
end;
$$;
revoke all on function acknowledge_amendment(uuid, text) from public, anon;
grant execute on function acknowledge_amendment(uuid, text) to authenticated;

create or replace function record_reconsent(p_ack uuid, p_count integer, p_completed boolean) returns void
language plpgsql security definer set search_path = public as $$
declare
  a amendment_site_acknowledgements;
  v_required boolean;
begin
  select * into a from amendment_site_acknowledgements where id = p_ack for update;
  if not found or not can_access_study_id(a.study_id) then raise exception 'Not found' using errcode = '42501'; end if;
  if not can_act_for_site(a.study_site_id) then raise exception 'Only the site team or a study manager can record re-consent for this site' using errcode = '42501'; end if;
  select reconsent_required into v_required from protocol_amendments where id = a.amendment_id;
  if not v_required then raise exception 'This amendment does not require re-consent'; end if;
  if p_count is null or p_count < 0 then raise exception 'Give the number of participants re-consented'; end if;
  update amendment_site_acknowledgements set reconsent_count = p_count, reconsent_completed = coalesce(p_completed, false),
    reconsent_completed_at = case when coalesce(p_completed, false) then coalesce(reconsent_completed_at, now()) end,
    updated_at = now(), updated_by = auth.uid()
  where id = a.id;
  insert into audit_trail (user_id, user_email, org_id, action, study_id, field_changed, old_value, new_value)
  select auth.uid(), coalesce(jwt_email(), 'system'), a.org_id, 'Re-consent progress recorded', s.study_id, 'amendment_site_acknowledgements:' || a.id,
    a.reconsent_count || case when a.reconsent_completed then ' (complete)' else '' end,
    p_count || case when coalesce(p_completed, false) then ' (complete)' else '' end
  from studies s where s.id = a.study_id;
end;
$$;
revoke all on function record_reconsent(uuid, integer, boolean) from public, anon;
grant execute on function record_reconsent(uuid, integer, boolean) to authenticated;
