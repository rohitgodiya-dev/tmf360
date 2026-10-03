-- Part 2c — milestones (Domain Model v1 "Milestone"; STU-06; feeds placeholders in Part 8)
--
-- milestone_types  reference list; each type applies to one level and may be
--                  completed automatically by a site status (completed_by_site_status)
-- milestones       one per type per study / country / site, with planned and actual
--                  dates; same guarantees as the Part 2b tables (tenant set by the
--                  database, RLS, no deletes, row_version, trigger-written audit)
--
-- A site status change (or a site created with a status) marks the matching site
-- milestone achieved with today's date and source 'site_status' (STU-06).

create table if not exists milestone_types (
  code text primary key,
  label text not null,
  applies_to text not null check (applies_to in ('study', 'country', 'site')),
  completed_by_site_status text
    check (completed_by_site_status in ('identified', 'selected', 'qualified', 'ongoing', 'closed', 'deactivated')),
  sort_order integer not null,
  status text not null default 'active' check (status in ('active', 'retired')),
  check (completed_by_site_status is null or applies_to = 'site')
);

alter table milestone_types enable row level security;
drop policy if exists "milestone types readable" on milestone_types;
create policy "milestone types readable" on milestone_types for select to authenticated using (true);
revoke insert, update, delete, truncate on milestone_types from anon, authenticated;

insert into milestone_types (code, label, applies_to, completed_by_site_status, sort_order) values
  ('PROTOCOL_FINAL',          'Protocol finalised',          'study',   null,        10),
  ('FIRST_PATIENT_IN',        'First patient in',            'study',   null,        20),
  ('LAST_PATIENT_LAST_VISIT', 'Last patient last visit',     'study',   null,        30),
  ('DATABASE_LOCK',           'Database lock',               'study',   null,        40),
  ('STUDY_CLOSE_OUT',         'Study close-out',             'study',   null,        50),
  ('COUNTRY_SUBMISSION',      'Regulatory submission',       'country', null,        10),
  ('COUNTRY_APPROVAL',        'Regulatory approval',         'country', null,        20),
  ('COUNTRY_CLOSE_OUT',       'Country close-out',           'country', null,        30),
  ('SITE_SELECTED',           'Site selected',               'site',    'selected',  10),
  ('SITE_QUALIFIED',          'Site qualified',              'site',    'qualified', 20),
  ('SITE_ACTIVATED',          'Site activated',              'site',    'ongoing',   30),
  ('SITE_CLOSED',             'Site closed',                 'site',    'closed',    40)
on conflict (code) do nothing;

create table if not exists milestones (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  study_id uuid not null references studies(id),
  scope_type text not null check (scope_type in ('study', 'country', 'site')),
  scope_id uuid not null,
  milestone_type text not null references milestone_types(code),
  planned_date date,
  actual_date date,
  status text not null default 'planned' check (status in ('planned', 'achieved', 'missed', 'not_applicable')),
  source text not null default 'manual' check (source in ('manual', 'site_status', 'integration')),
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz,
  updated_by uuid,
  row_version integer not null default 1,
  change_reason text,
  unique (scope_type, scope_id, milestone_type),
  -- An achieved milestone has an actual date, and only an achieved one does.
  check ((status = 'achieved') = (actual_date is not null))
);
create index if not exists milestones_study on milestones (study_id);

-- The type must apply to the scope level, and the scope must belong to the study.
create or replace function milestone_scope_check()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from milestone_types t where t.code = new.milestone_type and t.applies_to = new.scope_type
  ) then
    raise exception 'Milestone type % does not apply at % level', new.milestone_type, new.scope_type;
  end if;
  if not (
    (new.scope_type = 'study' and new.scope_id = new.study_id)
    or (new.scope_type = 'country' and exists (select 1 from study_countries c where c.id = new.scope_id and c.study_id = new.study_id))
    or (new.scope_type = 'site' and exists (select 1 from study_sites s where s.id = new.scope_id and s.study_id = new.study_id))
  ) then
    raise exception 'Milestone scope % % does not belong to study %', new.scope_type, new.scope_id, new.study_id;
  end if;
  if tg_op = 'UPDATE' and (new.scope_type, new.scope_id, new.milestone_type) is distinct from (old.scope_type, old.scope_id, old.milestone_type) then
    raise exception 'A milestone''s type and scope cannot be changed';
  end if;
  return new;
end;
$$;

-- STU-06: a site status completes the site milestone tied to it.
create or replace function complete_site_milestones()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  t record;
  v_reason text;
begin
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then
    return new;
  end if;
  v_reason := format('Completed by site %s status change to %s', new.site_number, new.status);
  for t in select code from milestone_types where completed_by_site_status = new.status and status = 'active' loop
    update milestones
      set status = 'achieved', actual_date = current_date, source = 'site_status', change_reason = v_reason
      where scope_type = 'site' and scope_id = new.id and milestone_type = t.code
        and status in ('planned', 'missed');
    if not found and not exists (
      select 1 from milestones where scope_type = 'site' and scope_id = new.id and milestone_type = t.code
    ) then
      insert into milestones (study_id, scope_type, scope_id, milestone_type, status, actual_date, source, change_reason)
      values (new.study_id, 'site', new.id, t.code, 'achieved', current_date, 'site_status', v_reason);
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists milestones_before_insert on milestones;
create trigger milestones_before_insert before insert on milestones for each row execute function structure_before_insert();
drop trigger if exists milestones_before_update on milestones;
create trigger milestones_before_update before update on milestones for each row execute function structure_before_update();
-- Named to sort after milestones_before_*, so org_id is already set when it runs.
drop trigger if exists milestones_scope on milestones;
create trigger milestones_scope before insert or update on milestones for each row execute function milestone_scope_check();
drop trigger if exists milestones_audit on milestones;
create trigger milestones_audit after insert or update on milestones for each row execute function structure_audit();

drop trigger if exists study_sites_complete_milestones on study_sites;
create trigger study_sites_complete_milestones
  after insert or update of status on study_sites
  for each row execute function complete_site_milestones();

alter table milestones enable row level security;
revoke delete, truncate on milestones from anon, authenticated;
revoke all on milestones from anon;

drop policy if exists "milestones read" on milestones;
create policy "milestones read" on milestones for select to authenticated using (can_access_study_id(study_id));
drop policy if exists "milestones write" on milestones;
create policy "milestones write" on milestones for insert to authenticated
  with check (can_access_study_id(study_id) and user_has_permission('edit_study'));
drop policy if exists "milestones update" on milestones;
create policy "milestones update" on milestones for update to authenticated
  using (can_access_study_id(study_id) and user_has_permission('edit_study'))
  with check (can_access_study_id(study_id));
