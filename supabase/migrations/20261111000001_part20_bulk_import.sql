-- Part 20 — bulk import of studies and sites from CSV (docs/enterprise-plan-review.md) (ENT-12, ENT-13)
--
-- The API validates every row first (dry run) and reports row-level errors; committing calls one of the
-- functions below, which import all rows or none (one transaction). They run with the caller's own rights
-- (security invoker), so row-level security and the structure triggers (org, created_by, audit) all apply.
-- * studies: study codes become unique per organisation (documents join studies by code); therapeutic_area added.

do $$ begin
  if exists (select 1 from studies group by org_id, study_id having count(*) > 1) then
    raise exception 'Duplicate study codes exist in an organisation; resolve them before this migration';
  end if;
end $$;
create unique index if not exists studies_org_code on studies (org_id, study_id);

alter table studies add column if not exists therapeutic_area text check (therapeutic_area is null or length(therapeutic_area) <= 200);

create or replace function import_studies(p_rows jsonb) returns integer
language plpgsql security invoker set search_path = public as $$
declare
  r jsonb;
  v_org uuid := current_org_id();
  n integer := 0;
begin
  if v_org is null or not user_has_permission('create_study') or not user_has_permission('invite_users') then
    raise exception 'Your role does not allow importing studies' using errcode = '42501';
  end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 or jsonb_array_length(p_rows) > 500 then
    raise exception 'Import between 1 and 500 studies at a time';
  end if;
  for r in select * from jsonb_array_elements(p_rows) loop
    insert into studies (org_id, user_id, study_id, protocol, phase, sponsor, status, therapeutic_area)
    values (v_org, auth.uid(), r ->> 'study_id', r ->> 'protocol', r ->> 'phase', nullif(r ->> 'sponsor', ''),
            coalesce(nullif(r ->> 'status', ''), 'Planning'), nullif(r ->> 'therapeutic_area', ''));
    n := n + 1;
  end loop;
  insert into audit_trail (user_id, user_email, org_id, action, field_changed, new_value)
  values (auth.uid(), coalesce(jwt_email(), 'system'), v_org, 'Studies imported', 'studies',
          n || ' studies: ' || (select string_agg(x ->> 'study_id', ', ') from jsonb_array_elements(p_rows) x));
  return n;
end;
$$;
revoke all on function import_studies(jsonb) from public, anon;
grant execute on function import_studies(jsonb) to authenticated;

create or replace function import_sites(p_rows jsonb) returns integer
language plpgsql security invoker set search_path = public as $$
declare
  r jsonb;
  v_org uuid := current_org_id();
  s studies;
  v_party uuid;
  v_country uuid;
  v_site uuid;
  v_person uuid;
  v_name text;
  n integer := 0;
begin
  if v_org is null or not user_has_permission('edit_study') or not user_has_permission('manage_directory') then
    raise exception 'Your role does not allow importing sites' using errcode = '42501';
  end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 or jsonb_array_length(p_rows) > 1000 then
    raise exception 'Import between 1 and 1000 sites at a time';
  end if;
  for r in select * from jsonb_array_elements(p_rows) loop
    select * into s from studies where org_id = v_org and study_id = r ->> 'study_id';
    if s.id is null or not can_access_study_id(s.id) then raise exception 'Study % not found', r ->> 'study_id'; end if;

    -- The institution: reuse a site organisation with the same name, or add it to the directory.
    select id into v_party from parties where org_id = v_org and party_type = 'site' and lower(name) = lower(r ->> 'site_name');
    if v_party is null then
      insert into parties (party_type, name, country_code, city)
      values ('site', r ->> 'site_name', r ->> 'country_code', nullif(r ->> 'city', '')) returning id into v_party;
    end if;

    select id into v_country from study_countries where study_id = s.id and country_code = r ->> 'country_code';
    if v_country is null then
      insert into study_countries (study_id, country_code) values (s.id, r ->> 'country_code') returning id into v_country;
    end if;

    insert into study_sites (study_id, study_country_id, site_number, site_party_id, display_name, status, change_reason)
    values (s.id, v_country, r ->> 'site_code', v_party, r ->> 'site_name', 'identified', 'Bulk import')
    returning id into v_site;

    -- The principal investigator, as a person in the directory with the PI role at this site.
    v_name := nullif(trim(coalesce(r ->> 'pi_name', '')), '');
    if v_name is not null then
      v_person := null;
      if nullif(r ->> 'pi_email', '') is not null then
        select id into v_person from persons where org_id = v_org and lower(email) = lower(r ->> 'pi_email');
      end if;
      if v_person is null then
        insert into persons (given_name, family_name, email)
        values (case when position(' ' in v_name) > 0 then regexp_replace(v_name, '\s+\S+$', '') else v_name end,
                case when position(' ' in v_name) > 0 then regexp_replace(v_name, '^.*\s', '') else v_name end,
                nullif(lower(r ->> 'pi_email'), ''))
        returning id into v_person;
      end if;
      insert into contact_roles (study_id, person_id, scope_type, scope_id, role_code, change_reason)
      values (s.id, v_person, 'site', v_site, 'PI', 'Bulk import');
    end if;
    n := n + 1;
  end loop;
  insert into audit_trail (user_id, user_email, org_id, action, field_changed, new_value)
  values (auth.uid(), coalesce(jwt_email(), 'system'), v_org, 'Sites imported', 'study_sites', n || ' sites');
  return n;
end;
$$;
revoke all on function import_sites(jsonb) from public, anon;
grant execute on function import_sites(jsonb) to authenticated;
