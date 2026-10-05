-- Part 12a — AI as recommendations (M17 AI-01..07). Plan: docs/part12-plan.md (D38–D42).
--
-- * ai_settings: each AI capability behind its own switch per organisation (AI-07). Without a row,
--   classification is on (it existed before) and every other capability is off.
-- * ai_recommendations: every AI output is stored as a recommendation record (AI-06) with model and
--   version, prompt version, configuration, confidence, evidence pointers (page, text span, field),
--   and the user's decision (accepted / modified / rejected / noted) with its time. Written only by
--   the server (service role) after it has called the model, so a record can't be forged by a user.
-- * AI never finalises or rejects a document: recommendations only fill suggestions and flags; a
--   person files, approves or rejects through the normal workflow.

create table if not exists ai_settings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  feature text not null check (feature in ('classification', 'metadata_extraction', 'pre_qc_checks', 'duplicate_detection', 'summary')),
  enabled boolean not null,
  change_reason text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_by uuid,
  updated_at timestamptz,
  row_version integer not null default 1,
  unique (org_id, feature)
);
alter table ai_settings enable row level security;
drop policy if exists "org members read" on ai_settings;
drop policy if exists "admins add" on ai_settings;
drop policy if exists "admins change" on ai_settings;
create policy "org members read" on ai_settings for select using (org_id in (select org_id from user_roles where user_id = auth.uid() and is_active));
create policy "admins add" on ai_settings for insert with check (has_org_permission(org_id, 'manage_roles') and length(trim(coalesce(change_reason, ''))) >= 3);
create policy "admins change" on ai_settings for update using (has_org_permission(org_id, 'manage_roles'))
  with check (has_org_permission(org_id, 'manage_roles') and length(trim(coalesce(change_reason, ''))) >= 3);
revoke delete, truncate on ai_settings from anon, authenticated;
drop trigger if exists ai_settings_before_insert on ai_settings;
create trigger ai_settings_before_insert before insert on ai_settings for each row execute function structure_before_insert();
drop trigger if exists ai_settings_before_update on ai_settings;
create trigger ai_settings_before_update before update on ai_settings for each row execute function structure_before_update();
drop trigger if exists ai_settings_audit on ai_settings;
create trigger ai_settings_audit after insert or update on ai_settings for each row execute function structure_audit();

-- Is a capability on for this organisation?
create or replace function ai_feature_enabled(p_org uuid, p_feature text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select enabled from ai_settings where org_id = p_org and feature = p_feature), p_feature = 'classification')
$$;
grant execute on function ai_feature_enabled(uuid, text) to authenticated;

create table if not exists ai_recommendations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  study_id uuid not null references studies(id),
  feature text not null check (feature in ('classification', 'metadata_extraction', 'pre_qc_checks', 'duplicate_detection', 'summary')),
  intake_item_id uuid references intake_items(id),
  document_id uuid references documents(id),
  file_hash text,
  model text not null,
  model_version text not null,
  prompt_version text not null,
  config jsonb not null default '{}'::jsonb,
  confidence numeric check (confidence is null or confidence between 0 and 100),
  output jsonb not null,
  evidence jsonb not null default '[]'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'modified', 'rejected', 'noted')),
  final_value jsonb,
  decision_note text,
  decided_by uuid,
  decided_at timestamptz,
  requested_by uuid not null,
  created_at timestamptz not null default now(),
  check (intake_item_id is not null or document_id is not null)
);
create index if not exists ai_recommendations_intake on ai_recommendations (intake_item_id, created_at);
create index if not exists ai_recommendations_document on ai_recommendations (document_id, created_at);
create index if not exists ai_recommendations_study on ai_recommendations (study_id, created_at desc);

alter table ai_recommendations enable row level security;
revoke insert, update, delete, truncate on ai_recommendations from anon, authenticated;
drop policy if exists "study members read recommendations" on ai_recommendations;
create policy "study members read recommendations" on ai_recommendations for select
  using (org_id in (select org_id from user_roles where user_id = auth.uid() and is_active) and can_access_study_id(study_id));

-- Only the decision fields may ever change, once, after creation.
create or replace function ai_recommendations_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'DELETE' then raise exception 'AI recommendations are kept as evidence and cannot be deleted'; end if;
  if (to_jsonb(new) - array['status', 'final_value', 'decision_note', 'decided_by', 'decided_at'])
     is distinct from (to_jsonb(old) - array['status', 'final_value', 'decision_note', 'decided_by', 'decided_at']) then
    raise exception 'An AI recommendation''s content cannot change';
  end if;
  if old.status in ('rejected', 'modified', 'noted') or (old.status = 'accepted' and new.status <> 'modified') then
    raise exception 'This recommendation has already been decided';
  end if;
  new.decided_at := now();
  return new;
end;
$$;
drop trigger if exists ai_recommendations_guard on ai_recommendations;
create trigger ai_recommendations_guard before update or delete on ai_recommendations for each row execute function ai_recommendations_guard();

-- A person's decision on a recommendation (AI-06): accepted as is, modified (with the final value)
-- or rejected (with an optional note). Audited.
create or replace function decide_ai_recommendation(p_id uuid, p_decision text, p_final jsonb, p_note text) returns void
language plpgsql security definer set search_path = public as $$
declare
  r ai_recommendations;
  v_code text;
begin
  select * into r from ai_recommendations where id = p_id for update;
  if not found or not can_access_study_id(r.study_id)
     or not exists (select 1 from user_roles where user_id = auth.uid() and org_id = r.org_id and is_active) then
    raise exception 'Not found' using errcode = '42501';
  end if;
  if p_decision not in ('accepted', 'modified', 'rejected') then raise exception 'Choose accept, modify or reject'; end if;
  update ai_recommendations set status = p_decision, final_value = coalesce(p_final, case when p_decision = 'accepted' then r.output end),
    decision_note = nullif(trim(coalesce(p_note, '')), ''), decided_by = auth.uid() where id = r.id;
  select study_id into v_code from studies where id = r.study_id;
  insert into audit_trail (user_id, org_id, action, study_id, document_id, field_changed, new_value, signature_reason)
  values (auth.uid(), r.org_id, 'AI recommendation ' || p_decision, v_code, r.document_id, 'ai_recommendation:' || r.id,
          r.feature || ' (' || r.model_version || ', ' || r.prompt_version || ')', nullif(trim(coalesce(p_note, '')), ''));
end;
$$;
revoke all on function decide_ai_recommendation(uuid, text, jsonb, text) from public, anon;
grant execute on function decide_ai_recommendation(uuid, text, jsonb, text) to authenticated;

-- At filing, settles the intake item's open recommendations against what the person actually filed:
-- classification/metadata become accepted (same values) or modified (different); flags are noted.
create or replace function settle_ai_recommendations(p_intake uuid) returns integer
language plpgsql security definer set search_path = public as $$
declare
  i intake_items;
  d documents;
  r ai_recommendations;
  v_final jsonb;
  v_same boolean;
  v_n integer := 0;
  k text;
begin
  select * into i from intake_items where id = p_intake;
  if not found or not can_access_study_id(i.study_id) then raise exception 'Not found' using errcode = '42501'; end if;
  select * into d from documents where id = i.filed_document_id;
  if not found then return 0; end if;
  for r in select * from ai_recommendations where intake_item_id = p_intake and status in ('pending', 'accepted') for update loop
    if r.feature = 'classification' then
      v_final := jsonb_build_object('artifact_num', d.artifact_num);
      v_same := (r.output -> 'suggestions' -> 0 ->> 'artifact_num') = d.artifact_num;
    elsif r.feature = 'metadata_extraction' then
      v_final := jsonb_build_object('title', i.title, 'version_label', i.version_label, 'effective_date', i.effective_date, 'owner', i.owner,
                                    'study_site_id', i.study_site_id, 'study_country_id', i.study_country_id);
      v_same := true;
      for k in select jsonb_object_keys(r.output -> 'fields') loop
        if v_final ? k and (r.output -> 'fields' -> k ->> 'value') is not null
           and (r.output -> 'fields' -> k ->> 'value') is distinct from (v_final ->> k) then v_same := false; end if;
      end loop;
    else
      if r.status = 'pending' then
        update ai_recommendations set status = 'noted', decided_by = auth.uid(), decision_note = 'Filed after review' where id = r.id;
        v_n := v_n + 1;
      end if;
      continue;
    end if;
    update ai_recommendations set status = case when v_same then 'accepted' else 'modified' end, final_value = v_final, decided_by = auth.uid(),
      decision_note = 'Settled at filing' where id = r.id and (r.status = 'pending' or not v_same);
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;
revoke all on function settle_ai_recommendations(uuid) from public, anon;
grant execute on function settle_ai_recommendations(uuid) to authenticated;
