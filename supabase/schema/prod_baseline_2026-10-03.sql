-- Production schema snapshot (structure only, no data), generated from catalogs.
create extension if not exists pgcrypto with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;

create sequence if not exists public.audit_trail_seq;

create table if not exists public.admin_users (
  id uuid default gen_random_uuid() not null,
  email text not null,
  full_name text,
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  last_login timestamp with time zone
);

create table if not exists public.ae_reports (
  id uuid default gen_random_uuid() not null,
  site_id uuid,
  study_id uuid,
  org_id uuid,
  participant_id uuid,
  ae_number text,
  description text,
  onset_date date,
  severity text,
  relatedness text,
  outcome text,
  is_serious boolean default false,
  sae_category text,
  status text default 'Open'::text,
  reported_by uuid,
  report_date date,
  resolved_date date,
  narrative text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists public.audit_trail (
  id uuid default gen_random_uuid() not null,
  user_id uuid,
  user_email text,
  action text not null,
  document_id uuid,
  study_id text,
  field_changed text,
  old_value text,
  new_value text,
  ip_address text,
  signature_reason text,
  created_at timestamp without time zone default now(),
  document_name text,
  sequence_no bigint,
  prev_hash text,
  record_hash text,
  org_id uuid
);

create table if not exists public.conversation_members (
  id uuid default gen_random_uuid() not null,
  conversation_id uuid,
  user_id uuid,
  email text not null,
  full_name text default ''::text,
  joined_at timestamp without time zone default now()
);

create table if not exists public.conversations (
  id uuid default gen_random_uuid() not null,
  study_id text not null,
  name text default ''::text,
  is_group boolean default false,
  created_by uuid,
  created_at timestamp without time zone default now(),
  updated_at timestamp without time zone default now()
);

create table if not exists public.demo_requests (
  id uuid default gen_random_uuid() not null,
  full_name text,
  email text,
  organisation text,
  role text,
  trial_phase text,
  team_size text,
  message text,
  selected_date text,
  selected_time text,
  status text default 'Pending'::text,
  notes text,
  created_at timestamp with time zone default now(),
  confirmed_at timestamp with time zone,
  confirmed_by text
);

create table if not exists public.document_metadata_versions (
  id uuid default gen_random_uuid() not null,
  document_id uuid,
  org_id uuid,
  study_id text,
  version_no integer default 1 not null,
  snapshot jsonb not null,
  change_reason text,
  changed_by_id uuid,
  changed_by_email text,
  changed_at timestamp with time zone default now()
);

create table if not exists public.document_queries (
  id uuid default gen_random_uuid() not null,
  org_id uuid,
  study_id text,
  document_id uuid,
  artifact_num text,
  artifact_name text,
  zone text,
  query_type text default 'Question'::text,
  priority text default 'Medium'::text,
  query_text text,
  raised_by uuid,
  raised_by_email text,
  owner_email text,
  status text default 'Open'::text,
  replies text,
  due_date date,
  closed_by text,
  closed_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

create table if not exists public.document_validations (
  id uuid default gen_random_uuid() not null,
  org_id text not null,
  study_id text not null,
  document_id text,
  document_name text,
  artifact_num text,
  zone text,
  identity_checks jsonb default '[]'::jsonb,
  quality_checks jsonb default '[]'::jsonb,
  consistency_checks jsonb default '[]'::jsonb,
  overall_result text,
  audit_narrative text,
  validated_by text,
  validated_at timestamp with time zone default now(),
  override_reason text,
  hash text
);

create table if not exists public.documents (
  id uuid default gen_random_uuid() not null,
  study_id text not null,
  user_id uuid,
  artifact_num text,
  artifact_name text,
  zone text,
  version text,
  status text,
  owner text,
  effective_date text,
  expiry_date text,
  file_path text,
  file_name text,
  file_type text,
  file_size bigint,
  created_at timestamp without time zone default now(),
  comments text default ''::text,
  custom_file_name text default ''::text,
  approved_by text default ''::text,
  approved_at text default ''::text,
  signature_reason text default ''::text,
  submission_reason text default ''::text,
  rejection_reason text default ''::text,
  rejected_by text default ''::text,
  rejected_at text default ''::text,
  appeal_reason text default ''::text,
  quality_score integer default 100,
  quality_flags text default ''::text,
  org_id uuid,
  archived_by text,
  archived_at timestamp with time zone,
  archive_reason text,
  pre_archive_status text,
  file_hash text,
  file_size_bytes bigint,
  deleted_at timestamp with time zone,
  deleted_by text,
  deleted_by_id uuid,
  deletion_reason text,
  pre_deletion_status text
);

create table if not exists public.expected_documents (
  id uuid default gen_random_uuid() not null,
  org_id text not null,
  study_id text not null,
  artifact_num text,
  artifact_name text,
  zone text,
  trigger_event text,
  due_date text,
  status text default 'Pending'::text,
  priority text default 'Medium'::text,
  basis text,
  created_at timestamp with time zone default now(),
  is_active boolean default true
);

create table if not exists public.inspection_questions (
  id uuid default gen_random_uuid() not null,
  org_id text not null,
  question_text text not null,
  category text default 'General'::text,
  severity text default 'Critical'::text,
  is_active boolean default true,
  is_default boolean default false,
  sort_order integer default 0,
  created_at timestamp with time zone default now()
);

create table if not exists public.instrument_items (
  id uuid default gen_random_uuid() not null,
  instrument_version_id uuid,
  item_order integer default 0 not null,
  item_type text not null,
  label_en text not null,
  label_es text,
  required boolean default true,
  min_value numeric,
  max_value numeric,
  options_json jsonb,
  branching_rules_json jsonb,
  created_at timestamp with time zone default now()
);

create table if not exists public.instrument_versions (
  id uuid default gen_random_uuid() not null,
  instrument_id uuid,
  version_label text default '1.0'::text not null,
  published_at timestamp with time zone,
  published_by uuid,
  created_at timestamp with time zone default now()
);

create table if not exists public.instruments (
  id uuid default gen_random_uuid() not null,
  org_id uuid,
  name text not null,
  category text,
  description text,
  created_by uuid,
  created_at timestamp with time zone default now()
);

create table if not exists public.invitations (
  id uuid default gen_random_uuid() not null,
  organization_id uuid,
  email text not null,
  role text not null,
  invited_by uuid,
  token text default (gen_random_uuid())::text,
  accepted boolean default false,
  created_at timestamp without time zone default now(),
  expires_at timestamp without time zone default (now() + '7 days'::interval)
);

create table if not exists public.ip_accountability (
  id uuid default gen_random_uuid() not null,
  site_id uuid,
  org_id uuid,
  participant_id uuid,
  action_type text,
  quantity numeric,
  unit text,
  lot_number text,
  expiry_date date,
  dispensed_by uuid,
  returned_by uuid,
  action_date date,
  notes text,
  created_at timestamp with time zone default now()
);

create table if not exists public.ip_inventory (
  id uuid default gen_random_uuid() not null,
  site_id uuid,
  org_id uuid,
  item_name text not null,
  lot_number text,
  quantity_on_site numeric default 0,
  quantity_pending numeric default 0,
  expiry_date date,
  storage_condition text,
  status text default 'Active'::text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  study_id uuid
);

create table if not exists public.isf_audit_trail (
  id uuid default gen_random_uuid() not null,
  org_id uuid,
  site_id uuid,
  document_id uuid,
  action text not null,
  actor_id uuid,
  actor_email text,
  previous_value text,
  new_value text,
  ip_address text,
  created_at timestamp with time zone default now(),
  study_id uuid,
  signature_reason text
);

create table if not exists public.isf_config (
  id uuid default gen_random_uuid() not null,
  site_id uuid,
  org_id uuid,
  isf_name text default 'Investigator Site File'::text,
  effective_date date,
  pi_name text,
  irb_number text,
  study_id uuid,
  created_at timestamp with time zone default now()
);

create table if not exists public.isf_documents (
  id uuid default gen_random_uuid() not null,
  org_id uuid,
  site_id uuid,
  study_id uuid,
  title text not null,
  doc_number text,
  zone text,
  section text,
  artifact_num text,
  artifact_name text,
  version text default '1.0'::text,
  status text default 'Draft'::text,
  file_url text,
  file_name text,
  file_size bigint,
  uploaded_by uuid,
  approved_by uuid,
  approved_at timestamp with time zone,
  effective_date date,
  expiry_date date,
  comments text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  uploaded_by_email text,
  archived_by text,
  archived_at timestamp with time zone,
  archive_reason text,
  pre_archive_status text,
  approved_by_email text,
  file_path text
);

create table if not exists public.isf_queries (
  id uuid default gen_random_uuid() not null,
  org_id uuid,
  site_id uuid,
  study_id uuid,
  query_number text,
  description text not null,
  raised_by uuid,
  raised_by_name text,
  assigned_to uuid,
  assigned_to_name text,
  status text default 'Open'::text,
  priority text default 'Medium'::text,
  document_id uuid,
  response text,
  resolved_at timestamp with time zone,
  due_date date,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists public.isf_tickets (
  id uuid default gen_random_uuid() not null,
  org_id uuid,
  site_id uuid,
  study_id uuid,
  created_by uuid,
  created_by_email text,
  title text,
  description text,
  priority text default 'Medium'::text,
  status text default 'Open'::text,
  replies text,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

create table if not exists public.message_attachments (
  id uuid default gen_random_uuid() not null,
  message_id uuid,
  file_name text not null,
  file_path text not null,
  file_type text default ''::text,
  file_size bigint default 0,
  created_at timestamp without time zone default now()
);

create table if not exists public.messages (
  id uuid default gen_random_uuid() not null,
  conversation_id uuid,
  sender_id uuid,
  sender_email text not null,
  sender_name text default ''::text,
  content text default ''::text,
  has_attachment boolean default false,
  created_at timestamp without time zone default now()
);

create table if not exists public.monitoring_action_items (
  id uuid default gen_random_uuid() not null,
  visit_id uuid,
  site_id uuid,
  org_id uuid,
  description text not null,
  priority text default 'Medium'::text,
  due_date date,
  assigned_to uuid,
  status text default 'Open'::text,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  study_id uuid
);

create table if not exists public.monitoring_visits (
  id uuid default gen_random_uuid() not null,
  site_id uuid,
  study_id uuid,
  org_id uuid,
  visit_type text,
  scheduled_date date,
  actual_date date,
  cra_name text,
  cra_email text,
  status text default 'Scheduled'::text,
  report_url text,
  notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists public.notification_log (
  id uuid default gen_random_uuid() not null,
  document_id uuid,
  org_id text,
  threshold_days integer,
  sent_at timestamp with time zone default now()
);

create table if not exists public.notification_preferences (
  id uuid default gen_random_uuid() not null,
  user_id uuid,
  org_id text,
  report_frequency text default 'Off'::text,
  expiry_window integer default 30,
  last_report_sent timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists public.organizations (
  id uuid default gen_random_uuid() not null,
  name text not null,
  created_by uuid,
  created_at timestamp without time zone default now(),
  type text default ''::text,
  code text default ''::text,
  country text default ''::text,
  timezone text default ''::text,
  language text default 'English (US)'::text,
  product_type text default ''::text,
  regulatory_regions text default ''::text,
  trial_phases text default ''::text,
  therapeutic_areas text default ''::text,
  tmf_reference_model text default 'DIA TMF Reference Model v3.3.1'::text,
  retention_period text default '15 years'::text,
  team_size text default ''::text
);

create table if not exists public.participant_activities (
  id uuid default gen_random_uuid() not null,
  participant_id uuid,
  study_id uuid,
  instrument_version_id uuid,
  activity_type text default 'diary'::text,
  window_start timestamp with time zone,
  window_end timestamp with time zone,
  status text default 'scheduled'::text,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

create table if not exists public.participant_journey_stages (
  id uuid default gen_random_uuid() not null,
  participant_id uuid,
  stage text not null,
  entered_at timestamp with time zone default now(),
  expected_duration_days integer,
  notes text
);

create table if not exists public.participant_notifications (
  id uuid default gen_random_uuid() not null,
  participant_id uuid,
  trigger_type text,
  channel text,
  sent_at timestamp with time zone,
  delivered_at timestamp with time zone,
  opened_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

create table if not exists public.participant_preferences (
  id uuid default gen_random_uuid() not null,
  participant_id uuid,
  language text default 'en'::text,
  contact_channel text default 'email'::text,
  reminder_time text default '09:00'::text,
  timezone text default 'America/Chicago'::text,
  text_size text default 'medium'::text,
  high_contrast boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists public.participant_response_corrections (
  id uuid default gen_random_uuid() not null,
  original_response_id uuid,
  corrected_payload jsonb not null,
  reason text not null,
  actor_id uuid,
  actor_type text default 'coordinator'::text,
  review_state text default 'pending'::text,
  created_at timestamp with time zone default now()
);

create table if not exists public.participant_responses (
  id uuid default gen_random_uuid() not null,
  participant_id uuid,
  activity_id uuid,
  instrument_version_id uuid,
  payload jsonb not null,
  entered_at_device timestamp with time zone not null,
  received_at_server timestamp with time zone default now(),
  device_timezone text,
  timezone_offset integer,
  sync_delay_seconds integer,
  clock_integrity_status text default 'trusted'::text,
  window_evaluation_result text,
  submitted_offline boolean default false,
  created_at timestamp with time zone default now()
);

create table if not exists public.participants (
  id uuid default gen_random_uuid() not null,
  org_id uuid,
  study_id uuid,
  participant_code text not null,
  full_name text,
  email text,
  phone text,
  status text default 'screening'::text,
  language_preference text default 'en'::text,
  enrolled_at timestamp with time zone,
  withdrawn_at timestamp with time zone,
  withdrawal_reason text,
  created_by uuid,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  site_id uuid
);

create table if not exists public.payment_milestones (
  id uuid default gen_random_uuid() not null,
  site_id uuid,
  study_id uuid,
  org_id uuid,
  milestone_name text not null,
  amount numeric,
  currency text default 'USD'::text,
  due_date date,
  invoice_date date,
  paid_date date,
  status text default 'Pending'::text,
  notes text,
  created_at timestamp with time zone default now()
);

create table if not exists public.protocol_deviations (
  id uuid default gen_random_uuid() not null,
  site_id uuid,
  study_id uuid,
  org_id uuid,
  participant_id uuid,
  deviation_number text,
  description text,
  deviation_date date,
  category text,
  severity text,
  capa_required boolean default false,
  capa_description text,
  status text default 'Open'::text,
  reported_by uuid,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists public.research360_queries (
  id uuid default gen_random_uuid() not null,
  org_id uuid not null,
  study_id text,
  user_id uuid not null,
  user_email text,
  query_text text not null,
  mode text not null,
  response_summary text,
  sources jsonb default '[]'::jsonb,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.research360_saved (
  id uuid default gen_random_uuid() not null,
  org_id uuid not null,
  study_id text,
  user_id uuid not null,
  user_email text,
  query_id uuid,
  title text not null,
  authors text,
  journal text,
  pub_year text,
  doi text,
  url text,
  source_api text,
  is_peer_reviewed boolean,
  abstract text,
  notes text,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.signup_tokens (
  id uuid default gen_random_uuid() not null,
  token text not null,
  org_name text,
  email text,
  created_at timestamp with time zone default now(),
  expires_at timestamp with time zone not null,
  used_at timestamp with time zone,
  created_by text
);

create table if not exists public.site360_demo_requests (
  id uuid default gen_random_uuid() not null,
  name text not null,
  role text,
  site_name text,
  institution text,
  country text,
  email text not null,
  phone text,
  message text,
  studies_count text,
  selected_date text,
  selected_time text,
  status text default 'pending'::text,
  created_at timestamp with time zone default now(),
  notes text,
  confirmed_at timestamp with time zone,
  confirmed_by text
);

create table if not exists public.site360_invites (
  id uuid default gen_random_uuid() not null,
  org_id uuid not null,
  site_id uuid not null,
  email text not null,
  full_name text,
  role text not null,
  token text not null,
  status text default 'pending'::text not null,
  created_by text,
  created_at timestamp with time zone default now(),
  accepted_at timestamp with time zone
);

create table if not exists public.site360_signup_tokens (
  id uuid default gen_random_uuid() not null,
  email text not null,
  token text default encode(gen_random_bytes(32), 'hex'::text) not null,
  demo_request_id uuid,
  site_name text,
  used boolean default false,
  created_by text,
  expires_at timestamp with time zone default (now() + '7 days'::interval),
  created_at timestamp with time zone default now()
);

create table if not exists public.site360_support_tickets (
  id uuid default gen_random_uuid() not null,
  org_id uuid,
  site_id uuid,
  created_by_email text,
  title text,
  description text,
  priority text default 'Medium'::text,
  status text default 'Open'::text,
  replies text,
  created_at timestamp with time zone default now(),
  resolved_at timestamp with time zone
);

create table if not exists public.site_activation_items (
  id uuid default gen_random_uuid() not null,
  site_id uuid,
  org_id uuid,
  category text,
  item_name text not null,
  status text default 'Pending'::text,
  completed_at timestamp with time zone,
  completed_by uuid,
  notes text,
  created_at timestamp with time zone default now(),
  reviewer_initials text default ''::text,
  study_id uuid
);

create table if not exists public.site_members (
  id uuid default gen_random_uuid() not null,
  site_id uuid,
  user_id uuid,
  org_id uuid,
  role text default 'CRC'::text,
  is_active boolean default true,
  joined_at timestamp with time zone default now(),
  full_name text,
  email text
);

create table if not exists public.site_studies (
  id uuid default gen_random_uuid() not null,
  site_id uuid,
  study_id uuid,
  org_id uuid,
  status text default 'Active'::text,
  activation_date date,
  created_by uuid,
  created_at timestamp with time zone default now()
);

create table if not exists public.site_tasks (
  id uuid default gen_random_uuid() not null,
  site_id uuid,
  org_id uuid,
  title text not null,
  description text,
  priority text default 'Medium'::text,
  due_date date,
  assigned_to uuid,
  assigned_to_name text,
  status text default 'Open'::text,
  linked_panel text,
  created_by uuid,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  study_id uuid
);

create table if not exists public.sites (
  id uuid default gen_random_uuid() not null,
  org_id uuid,
  study_id uuid,
  site_name text not null,
  site_code text,
  country text,
  city text,
  pi_name text,
  pi_email text,
  status text default 'active'::text,
  activation_date date,
  created_by uuid,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists public.staff_delegations (
  id uuid default gen_random_uuid() not null,
  site_id uuid,
  org_id uuid,
  staff_user_id uuid,
  staff_name text,
  role text,
  delegated_tasks jsonb,
  effective_date date,
  expiry_date date,
  signed_by_pi boolean default false,
  signed_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

create table if not exists public.staff_qualifications (
  id uuid default gen_random_uuid() not null,
  site_id uuid,
  org_id uuid,
  staff_user_id uuid,
  staff_name text,
  qualification_type text,
  document_name text,
  file_url text,
  issue_date date,
  expiry_date date,
  status text default 'Active'::text,
  created_at timestamp with time zone default now()
);

create table if not exists public.studies (
  id uuid default gen_random_uuid() not null,
  user_id uuid,
  study_id text not null,
  protocol text,
  phase text,
  status text,
  sponsor text,
  created_at timestamp without time zone default now(),
  org_id uuid
);

create table if not exists public.study_access_grants (
  id uuid default gen_random_uuid() not null,
  org_id uuid,
  study_id text not null,
  user_id uuid not null,
  granted_by uuid,
  granted_at timestamp with time zone default now(),
  is_active boolean default true
);

create table if not exists public.study_checklist (
  id uuid default gen_random_uuid() not null,
  org_id text not null,
  study_id text not null,
  item_name text,
  artifact_ref text,
  zone text,
  reason text,
  severity text,
  status text default 'Missing'::text,
  generated_at timestamp with time zone default now(),
  is_active boolean default true
);

create table if not exists public.study_identity (
  id uuid default gen_random_uuid() not null,
  org_id text not null,
  study_id text not null,
  protocol_number text,
  sponsor_name text,
  study_title text,
  phase text,
  imp_name text,
  indication text,
  sites jsonb default '[]'::jsonb,
  countries jsonb default '[]'::jsonb,
  primary_endpoint text,
  study_duration text,
  irb_names jsonb default '[]'::jsonb,
  key_milestones jsonb default '[]'::jsonb,
  expected_documents jsonb default '[]'::jsonb,
  extracted_at timestamp with time zone default now(),
  source_vault_doc_id text,
  is_active boolean default true
);

create table if not exists public.study_instrument_config (
  id uuid default gen_random_uuid() not null,
  study_id uuid,
  instrument_version_id uuid,
  frequency text default 'daily'::text,
  window_days integer default 1,
  attestation_required boolean default false,
  active boolean default true,
  configured_by uuid,
  created_at timestamp with time zone default now()
);

create table if not exists public.study_members (
  id uuid default gen_random_uuid() not null,
  org_id text not null,
  study_id text not null,
  user_id text not null,
  email text,
  full_name text,
  role text,
  added_by text,
  added_at timestamp with time zone default now(),
  is_active boolean default true
);

create table if not exists public.study_vault (
  id uuid default gen_random_uuid() not null,
  org_id text not null,
  study_id text not null,
  file_name text,
  custom_name text,
  document_type text,
  file_path text,
  file_size integer,
  extracted_text text,
  uploaded_by text,
  uploaded_at timestamp with time zone default now(),
  is_active boolean default true
);

create table if not exists public.support_tickets (
  id uuid default gen_random_uuid() not null,
  org_id uuid not null,
  created_by uuid not null,
  created_by_email text not null,
  title text not null,
  description text not null,
  priority text default 'Medium'::text not null,
  status text default 'Open'::text not null,
  replies text,
  created_at timestamp with time zone default now(),
  resolved_at timestamp with time zone,
  study_id text
);

create table if not exists public.tmf_config (
  id uuid default gen_random_uuid() not null,
  org_id uuid not null,
  study_id text not null,
  type text not null,
  zone_num text not null,
  zone_name text,
  section_num text,
  section_name text,
  artifact_num text,
  artifact_name text,
  classification text default 'Core'::text,
  iso_ref text default ''::text,
  parent_artifact_num text,
  is_enabled boolean default true,
  is_locked boolean default false,
  disabled_reason text,
  disabled_by text,
  disabled_at timestamp with time zone,
  is_custom boolean default false,
  created_by text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists public.trinity_chats (
  id uuid default gen_random_uuid() not null,
  org_id text not null,
  study_id text not null,
  user_id text not null,
  title text,
  messages jsonb default '[]'::jsonb,
  is_pinned boolean default false,
  document_id text,
  document_name text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  is_active boolean default true
);

create table if not exists public.trinity_findings (
  id uuid default gen_random_uuid() not null,
  org_id text not null,
  study_id text not null,
  finding_type text,
  severity text,
  title text,
  detail text,
  source_doc text,
  artifact_ref text,
  status text default 'Open'::text,
  created_at timestamp with time zone default now(),
  resolved_at timestamp with time zone,
  resolved_by text
);

create table if not exists public.trinity_memory (
  id uuid default gen_random_uuid() not null,
  org_id text not null,
  study_id text not null,
  user_id text not null,
  memory_text text not null,
  source_chat_id uuid,
  created_at timestamp with time zone default now(),
  is_active boolean default true
);

create table if not exists public.trinity_suggestions (
  id uuid default gen_random_uuid() not null,
  org_id text not null,
  study_id text not null,
  action_text text not null,
  reason text,
  urgency text default 'Medium'::text,
  generated_at timestamp with time zone default now(),
  is_active boolean default true
);

create table if not exists public.user_roles (
  id uuid default gen_random_uuid() not null,
  user_id uuid,
  email text,
  role text default 'uploader'::text,
  created_at timestamp without time zone default now(),
  organization_id uuid default gen_random_uuid(),
  full_name text default ''::text,
  is_active boolean default true,
  invited_by uuid,
  invited_at timestamp without time zone default now(),
  notifications_enabled boolean default true,
  can_upload_download boolean default true,
  can_download boolean default true,
  org_id uuid,
  can_delete boolean default true
);

alter table public.admin_users add constraint admin_users_email_key UNIQUE (email);

alter table public.admin_users add constraint admin_users_pkey PRIMARY KEY (id);

alter table public.ae_reports add constraint ae_reports_pkey PRIMARY KEY (id);

alter table public.audit_trail add constraint audit_trail_pkey PRIMARY KEY (id);

alter table public.conversation_members add constraint conversation_members_conversation_id_user_id_key UNIQUE (conversation_id, user_id);

alter table public.conversation_members add constraint conversation_members_pkey PRIMARY KEY (id);

alter table public.conversations add constraint conversations_pkey PRIMARY KEY (id);

alter table public.demo_requests add constraint demo_requests_pkey PRIMARY KEY (id);

alter table public.document_metadata_versions add constraint document_metadata_versions_pkey PRIMARY KEY (id);

alter table public.document_metadata_versions add constraint uq_doc_version UNIQUE (document_id, version_no);

alter table public.document_queries add constraint document_queries_pkey PRIMARY KEY (id);

alter table public.document_validations add constraint document_validations_pkey PRIMARY KEY (id);

alter table public.documents add constraint documents_pkey PRIMARY KEY (id);

alter table public.expected_documents add constraint expected_documents_pkey PRIMARY KEY (id);

alter table public.inspection_questions add constraint inspection_questions_pkey PRIMARY KEY (id);

alter table public.instrument_items add constraint instrument_items_pkey PRIMARY KEY (id);

alter table public.instrument_versions add constraint instrument_versions_pkey PRIMARY KEY (id);

alter table public.instruments add constraint instruments_pkey PRIMARY KEY (id);

alter table public.invitations add constraint invitations_pkey PRIMARY KEY (id);

alter table public.invitations add constraint invitations_token_key UNIQUE (token);

alter table public.ip_accountability add constraint ip_accountability_pkey PRIMARY KEY (id);

alter table public.ip_inventory add constraint ip_inventory_pkey PRIMARY KEY (id);

alter table public.isf_audit_trail add constraint isf_audit_trail_pkey PRIMARY KEY (id);

alter table public.isf_config add constraint isf_config_pkey PRIMARY KEY (id);

alter table public.isf_documents add constraint isf_documents_pkey PRIMARY KEY (id);

alter table public.isf_queries add constraint isf_queries_pkey PRIMARY KEY (id);

alter table public.isf_tickets add constraint isf_tickets_pkey PRIMARY KEY (id);

alter table public.message_attachments add constraint message_attachments_pkey PRIMARY KEY (id);

alter table public.messages add constraint messages_pkey PRIMARY KEY (id);

alter table public.monitoring_action_items add constraint monitoring_action_items_pkey PRIMARY KEY (id);

alter table public.monitoring_visits add constraint monitoring_visits_pkey PRIMARY KEY (id);

alter table public.notification_log add constraint notification_log_document_id_threshold_days_key UNIQUE (document_id, threshold_days);

alter table public.notification_log add constraint notification_log_pkey PRIMARY KEY (id);

alter table public.notification_preferences add constraint notification_preferences_pkey PRIMARY KEY (id);

alter table public.notification_preferences add constraint notification_preferences_user_id_key UNIQUE (user_id);

alter table public.organizations add constraint organizations_pkey PRIMARY KEY (id);

alter table public.participant_activities add constraint participant_activities_pkey PRIMARY KEY (id);

alter table public.participant_journey_stages add constraint participant_journey_stages_pkey PRIMARY KEY (id);

alter table public.participant_notifications add constraint participant_notifications_pkey PRIMARY KEY (id);

alter table public.participant_preferences add constraint participant_preferences_participant_id_key UNIQUE (participant_id);

alter table public.participant_preferences add constraint participant_preferences_pkey PRIMARY KEY (id);

alter table public.participant_response_corrections add constraint participant_response_corrections_pkey PRIMARY KEY (id);

alter table public.participant_responses add constraint participant_responses_pkey PRIMARY KEY (id);

alter table public.participants add constraint participants_pkey PRIMARY KEY (id);

alter table public.payment_milestones add constraint payment_milestones_pkey PRIMARY KEY (id);

alter table public.protocol_deviations add constraint protocol_deviations_pkey PRIMARY KEY (id);

alter table public.research360_queries add constraint research360_queries_mode_check CHECK ((mode = ANY (ARRAY['regulatory'::text, 'publication'::text])));

alter table public.research360_queries add constraint research360_queries_pkey PRIMARY KEY (id);

alter table public.research360_saved add constraint research360_saved_pkey PRIMARY KEY (id);

alter table public.signup_tokens add constraint signup_tokens_pkey PRIMARY KEY (id);

alter table public.signup_tokens add constraint signup_tokens_token_key UNIQUE (token);

alter table public.site360_demo_requests add constraint site360_demo_requests_pkey PRIMARY KEY (id);

alter table public.site360_invites add constraint site360_invites_pkey PRIMARY KEY (id);

alter table public.site360_invites add constraint site360_invites_token_key UNIQUE (token);

alter table public.site360_signup_tokens add constraint site360_signup_tokens_pkey PRIMARY KEY (id);

alter table public.site360_signup_tokens add constraint site360_signup_tokens_token_key UNIQUE (token);

alter table public.site360_support_tickets add constraint site360_support_tickets_pkey PRIMARY KEY (id);

alter table public.site_activation_items add constraint site_activation_items_pkey PRIMARY KEY (id);

alter table public.site_members add constraint site_members_pkey PRIMARY KEY (id);

alter table public.site_studies add constraint site_studies_pkey PRIMARY KEY (id);

alter table public.site_studies add constraint site_studies_site_id_study_id_key UNIQUE (site_id, study_id);

alter table public.site_tasks add constraint site_tasks_pkey PRIMARY KEY (id);

alter table public.sites add constraint sites_pkey PRIMARY KEY (id);

alter table public.staff_delegations add constraint staff_delegations_pkey PRIMARY KEY (id);

alter table public.staff_qualifications add constraint staff_qualifications_pkey PRIMARY KEY (id);

alter table public.studies add constraint studies_pkey PRIMARY KEY (id);

alter table public.study_access_grants add constraint study_access_grants_org_id_study_id_user_id_key UNIQUE (org_id, study_id, user_id);

alter table public.study_access_grants add constraint study_access_grants_pkey PRIMARY KEY (id);

alter table public.study_checklist add constraint study_checklist_pkey PRIMARY KEY (id);

alter table public.study_identity add constraint study_identity_pkey PRIMARY KEY (id);

alter table public.study_instrument_config add constraint study_instrument_config_pkey PRIMARY KEY (id);

alter table public.study_members add constraint study_members_pkey PRIMARY KEY (id);

alter table public.study_members add constraint study_members_study_id_user_id_key UNIQUE (study_id, user_id);

alter table public.study_vault add constraint study_vault_pkey PRIMARY KEY (id);

alter table public.support_tickets add constraint support_tickets_pkey PRIMARY KEY (id);

alter table public.tmf_config add constraint tmf_config_classification_check CHECK ((classification = ANY (ARRAY['Core'::text, 'Recommended'::text, 'Optional'::text])));

alter table public.tmf_config add constraint tmf_config_pkey PRIMARY KEY (id);

alter table public.tmf_config add constraint tmf_config_type_check CHECK ((type = ANY (ARRAY['zone'::text, 'artifact'::text, 'sub_artifact'::text])));

alter table public.trinity_chats add constraint trinity_chats_pkey PRIMARY KEY (id);

alter table public.trinity_findings add constraint trinity_findings_pkey PRIMARY KEY (id);

alter table public.trinity_memory add constraint trinity_memory_pkey PRIMARY KEY (id);

alter table public.trinity_suggestions add constraint trinity_suggestions_pkey PRIMARY KEY (id);

alter table public.user_roles add constraint user_roles_email_unique UNIQUE (email);

alter table public.user_roles add constraint user_roles_pkey PRIMARY KEY (id);

alter table public.user_roles add constraint user_roles_user_id_unique UNIQUE (user_id);

alter table public.user_roles add constraint valid_role CHECK ((role = ANY (ARRAY['System Administrator'::text, 'Sponsor Admin'::text, 'TMF Lead'::text, 'Clinical Trial Manager'::text, 'Clinical Trial Associate'::text, 'CRA'::text, 'Regulatory'::text, 'Quality Assurance'::text, 'Medical Monitor'::text, 'Site Coordinator'::text, 'Investigator'::text, 'Auditor'::text, 'Inspector'::text])));

alter table public.ae_reports add constraint ae_reports_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id);

alter table public.ae_reports add constraint ae_reports_participant_id_fkey FOREIGN KEY (participant_id) REFERENCES participants(id);

alter table public.ae_reports add constraint ae_reports_site_id_fkey FOREIGN KEY (site_id) REFERENCES sites(id);

alter table public.ae_reports add constraint ae_reports_study_id_fkey FOREIGN KEY (study_id) REFERENCES studies(id);

alter table public.audit_trail add constraint audit_trail_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);

alter table public.conversation_members add constraint conversation_members_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE;

alter table public.conversation_members add constraint conversation_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);

alter table public.conversations add constraint conversations_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);

alter table public.document_metadata_versions add constraint document_metadata_versions_document_id_fkey FOREIGN KEY (document_id) REFERENCES documents(id);

alter table public.document_metadata_versions add constraint document_metadata_versions_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id);

alter table public.document_queries add constraint document_queries_document_id_fkey FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE;

alter table public.documents add constraint documents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);

alter table public.instrument_items add constraint instrument_items_instrument_version_id_fkey FOREIGN KEY (instrument_version_id) REFERENCES instrument_versions(id);

alter table public.instrument_versions add constraint instrument_versions_instrument_id_fkey FOREIGN KEY (instrument_id) REFERENCES instruments(id);

alter table public.instruments add constraint instruments_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id);

alter table public.invitations add constraint invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES auth.users(id);

alter table public.invitations add constraint invitations_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id);

alter table public.ip_accountability add constraint ip_accountability_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id);

alter table public.ip_accountability add constraint ip_accountability_participant_id_fkey FOREIGN KEY (participant_id) REFERENCES participants(id);

alter table public.ip_accountability add constraint ip_accountability_site_id_fkey FOREIGN KEY (site_id) REFERENCES sites(id);

alter table public.ip_inventory add constraint ip_inventory_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id);

alter table public.ip_inventory add constraint ip_inventory_site_id_fkey FOREIGN KEY (site_id) REFERENCES sites(id);

alter table public.ip_inventory add constraint ip_inventory_study_id_fkey FOREIGN KEY (study_id) REFERENCES studies(id);

alter table public.isf_audit_trail add constraint isf_audit_trail_document_id_fkey FOREIGN KEY (document_id) REFERENCES isf_documents(id);

alter table public.isf_audit_trail add constraint isf_audit_trail_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id);

alter table public.isf_audit_trail add constraint isf_audit_trail_site_id_fkey FOREIGN KEY (site_id) REFERENCES sites(id);

alter table public.isf_audit_trail add constraint isf_audit_trail_study_id_fkey FOREIGN KEY (study_id) REFERENCES studies(id);

alter table public.isf_config add constraint isf_config_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id);

alter table public.isf_config add constraint isf_config_site_id_fkey FOREIGN KEY (site_id) REFERENCES sites(id);

alter table public.isf_config add constraint isf_config_study_id_fkey FOREIGN KEY (study_id) REFERENCES studies(id);

alter table public.isf_documents add constraint isf_documents_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id);

alter table public.isf_documents add constraint isf_documents_site_id_fkey FOREIGN KEY (site_id) REFERENCES sites(id);

alter table public.isf_documents add constraint isf_documents_study_id_fkey FOREIGN KEY (study_id) REFERENCES studies(id);

alter table public.isf_queries add constraint isf_queries_document_id_fkey FOREIGN KEY (document_id) REFERENCES isf_documents(id);

alter table public.isf_queries add constraint isf_queries_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id);

alter table public.isf_queries add constraint isf_queries_site_id_fkey FOREIGN KEY (site_id) REFERENCES sites(id);

alter table public.isf_queries add constraint isf_queries_study_id_fkey FOREIGN KEY (study_id) REFERENCES studies(id);

alter table public.isf_tickets add constraint isf_tickets_site_id_fkey FOREIGN KEY (site_id) REFERENCES sites(id);

alter table public.isf_tickets add constraint isf_tickets_study_id_fkey FOREIGN KEY (study_id) REFERENCES studies(id);

alter table public.message_attachments add constraint message_attachments_message_id_fkey FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE;

alter table public.messages add constraint messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE;

alter table public.messages add constraint messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id);

alter table public.monitoring_action_items add constraint monitoring_action_items_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id);

alter table public.monitoring_action_items add constraint monitoring_action_items_site_id_fkey FOREIGN KEY (site_id) REFERENCES sites(id);

alter table public.monitoring_action_items add constraint monitoring_action_items_study_id_fkey FOREIGN KEY (study_id) REFERENCES studies(id);

alter table public.monitoring_action_items add constraint monitoring_action_items_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES monitoring_visits(id);

alter table public.monitoring_visits add constraint monitoring_visits_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id);

alter table public.monitoring_visits add constraint monitoring_visits_site_id_fkey FOREIGN KEY (site_id) REFERENCES sites(id);

alter table public.monitoring_visits add constraint monitoring_visits_study_id_fkey FOREIGN KEY (study_id) REFERENCES studies(id);

alter table public.notification_preferences add constraint notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);

alter table public.organizations add constraint organizations_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);

alter table public.participant_activities add constraint participant_activities_instrument_version_id_fkey FOREIGN KEY (instrument_version_id) REFERENCES instrument_versions(id);

alter table public.participant_activities add constraint participant_activities_participant_id_fkey FOREIGN KEY (participant_id) REFERENCES participants(id);

alter table public.participant_activities add constraint participant_activities_study_id_fkey FOREIGN KEY (study_id) REFERENCES studies(id);

alter table public.participant_journey_stages add constraint participant_journey_stages_participant_id_fkey FOREIGN KEY (participant_id) REFERENCES participants(id);

alter table public.participant_notifications add constraint participant_notifications_participant_id_fkey FOREIGN KEY (participant_id) REFERENCES participants(id);

alter table public.participant_preferences add constraint participant_preferences_participant_id_fkey FOREIGN KEY (participant_id) REFERENCES participants(id);

alter table public.participant_response_corrections add constraint participant_response_corrections_original_response_id_fkey FOREIGN KEY (original_response_id) REFERENCES participant_responses(id);

alter table public.participant_responses add constraint participant_responses_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES participant_activities(id);

alter table public.participant_responses add constraint participant_responses_instrument_version_id_fkey FOREIGN KEY (instrument_version_id) REFERENCES instrument_versions(id);

alter table public.participant_responses add constraint participant_responses_participant_id_fkey FOREIGN KEY (participant_id) REFERENCES participants(id);

alter table public.participants add constraint participants_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id);

alter table public.participants add constraint participants_site_id_fkey FOREIGN KEY (site_id) REFERENCES sites(id);

alter table public.participants add constraint participants_study_id_fkey FOREIGN KEY (study_id) REFERENCES studies(id);

alter table public.payment_milestones add constraint payment_milestones_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id);

alter table public.payment_milestones add constraint payment_milestones_site_id_fkey FOREIGN KEY (site_id) REFERENCES sites(id);

alter table public.payment_milestones add constraint payment_milestones_study_id_fkey FOREIGN KEY (study_id) REFERENCES studies(id);

alter table public.protocol_deviations add constraint protocol_deviations_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id);

alter table public.protocol_deviations add constraint protocol_deviations_participant_id_fkey FOREIGN KEY (participant_id) REFERENCES participants(id);

alter table public.protocol_deviations add constraint protocol_deviations_site_id_fkey FOREIGN KEY (site_id) REFERENCES sites(id);

alter table public.protocol_deviations add constraint protocol_deviations_study_id_fkey FOREIGN KEY (study_id) REFERENCES studies(id);

alter table public.research360_saved add constraint research360_saved_query_id_fkey FOREIGN KEY (query_id) REFERENCES research360_queries(id) ON DELETE SET NULL;

alter table public.site360_invites add constraint site360_invites_site_id_fkey FOREIGN KEY (site_id) REFERENCES sites(id);

alter table public.site360_support_tickets add constraint site360_support_tickets_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id);

alter table public.site360_support_tickets add constraint site360_support_tickets_site_id_fkey FOREIGN KEY (site_id) REFERENCES sites(id);

alter table public.site_activation_items add constraint site_activation_items_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id);

alter table public.site_activation_items add constraint site_activation_items_site_id_fkey FOREIGN KEY (site_id) REFERENCES sites(id);

alter table public.site_activation_items add constraint site_activation_items_study_id_fkey FOREIGN KEY (study_id) REFERENCES studies(id);

alter table public.site_members add constraint site_members_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id);

alter table public.site_members add constraint site_members_site_id_fkey FOREIGN KEY (site_id) REFERENCES sites(id);

alter table public.site_studies add constraint site_studies_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id);

alter table public.site_studies add constraint site_studies_site_id_fkey FOREIGN KEY (site_id) REFERENCES sites(id);

alter table public.site_studies add constraint site_studies_study_id_fkey FOREIGN KEY (study_id) REFERENCES studies(id);

alter table public.site_tasks add constraint site_tasks_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id);

alter table public.site_tasks add constraint site_tasks_site_id_fkey FOREIGN KEY (site_id) REFERENCES sites(id);

alter table public.site_tasks add constraint site_tasks_study_id_fkey FOREIGN KEY (study_id) REFERENCES studies(id);

alter table public.sites add constraint sites_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id);

alter table public.sites add constraint sites_study_id_fkey FOREIGN KEY (study_id) REFERENCES studies(id);

alter table public.staff_delegations add constraint staff_delegations_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id);

alter table public.staff_delegations add constraint staff_delegations_site_id_fkey FOREIGN KEY (site_id) REFERENCES sites(id);

alter table public.staff_qualifications add constraint staff_qualifications_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id);

alter table public.staff_qualifications add constraint staff_qualifications_site_id_fkey FOREIGN KEY (site_id) REFERENCES sites(id);

alter table public.studies add constraint studies_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);

alter table public.study_access_grants add constraint study_access_grants_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id);

alter table public.study_instrument_config add constraint study_instrument_config_instrument_version_id_fkey FOREIGN KEY (instrument_version_id) REFERENCES instrument_versions(id);

alter table public.study_instrument_config add constraint study_instrument_config_study_id_fkey FOREIGN KEY (study_id) REFERENCES studies(id);

alter table public.user_roles add constraint user_roles_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES auth.users(id);

alter table public.user_roles add constraint user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);

CREATE INDEX document_metadata_versions_document_id_version_no_idx ON public.document_metadata_versions USING btree (document_id, version_no);

CREATE INDEX idx_documents_deleted_at ON public.documents USING btree (org_id, deleted_at) WHERE (deleted_at IS NOT NULL);

CREATE INDEX idx_documents_file_hash ON public.documents USING btree (org_id, study_id, file_hash) WHERE (file_hash IS NOT NULL);

CREATE INDEX idx_research360_queries_org_study ON public.research360_queries USING btree (org_id, study_id);

CREATE INDEX idx_research360_saved_org_study ON public.research360_saved USING btree (org_id, study_id);

CREATE OR REPLACE FUNCTION public.can_access_isf_file(p_name text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select auth.uid() is not null and exists (
    select 1
    from sites s
    join user_roles ur on ur.org_id = s.org_id
    where s.id::text = split_part(p_name, '/', 1)
      and ur.user_id = auth.uid()
      and ur.is_active = true
  );
$function$
;

CREATE OR REPLACE FUNCTION public.can_access_study(p_user_id uuid, p_study_id text, p_org_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_role text;
begin
  select role into v_role from user_roles
  where user_id = p_user_id and org_id = p_org_id and is_active = true
  limit 1;

  if v_role is null then
    return false;
  end if;

  if v_role in ('System Administrator','Sponsor Admin','TMF Lead') then
    return true;
  end if;

  return exists (
    select 1 from study_access_grants g
    where g.user_id = p_user_id
      and g.study_id = p_study_id
      and g.org_id = p_org_id
      and g.is_active = true
  ) or exists (
    select 1 from study_members m
    where m.user_id::text = p_user_id::text
      and m.study_id::text = p_study_id
      and m.org_id::text = p_org_id::text
      and coalesce(m.is_active, true)
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.can_read_document_file(p_name text, p_owner uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_org uuid;
  v_top text := split_part(p_name, '/', 1);
begin
  if v_uid is null then
    return false;
  end if;

  select ur.org_id into v_org
  from user_roles ur
  where ur.user_id = v_uid and ur.is_active = true
  limit 1;

  -- A record file: same access as the document itself (org + study).
  if exists (select 1 from documents d where d.file_path = p_name) then
    return exists (
      select 1 from documents d
      where d.file_path = p_name
        and d.org_id = v_org
        and can_access_study(v_uid, d.study_id, d.org_id)
    );
  end if;

  if v_top = 'vault' then
    return split_part(p_name, '/', 2) = v_org::text
       and can_access_study(v_uid, split_part(p_name, '/', 3), v_org);
  end if;

  if v_top = 'messages' then
    -- The uploader always keeps access (covers conversations with no study).
    return p_owner = v_uid or exists (
      select 1
      from conversations c
      join studies s on s.study_id::text = c.study_id::text and s.org_id = v_org
      where c.id::text = split_part(p_name, '/', 2)
        and can_access_study(v_uid, c.study_id::text, v_org)
    );
  end if;

  -- Uploaded but not yet attached to a document (e.g. while the add-document form is open).
  return p_owner = v_uid;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.can_write_document_file(p_name text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_org uuid;
  v_top text := split_part(p_name, '/', 1);
begin
  if v_uid is null then
    return false;
  end if;

  select ur.org_id into v_org
  from user_roles ur
  where ur.user_id = v_uid and ur.is_active = true
  limit 1;

  if v_top = 'vault' then
    return split_part(p_name, '/', 2) = v_org::text;
  end if;
  if v_top = 'messages' then
    return v_org is not null;
  end if;
  return v_top = v_org::text or v_top = v_uid::text;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.compute_audit_hash()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_my_org_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  select org_id from user_roles where user_id = auth.uid() and org_id is not null limit 1;
$function$
;

CREATE OR REPLACE FUNCTION public.prevent_audit_modification()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  raise exception 'audit_trail is append-only: % is not allowed', tg_op;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.site360_can_access_study(p_org_id uuid, p_study_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  select exists (
    select 1 from user_roles ur
    where ur.user_id = auth.uid()
      and ur.org_id = p_org_id
      and ur.role in ('Site Coordinator','PI')
  )
  or exists (
    select 1 from study_members sm
    where sm.user_id = auth.uid()::text
      and sm.study_id = p_study_id::text
      and sm.org_id = p_org_id::text
  );
$function$
;

CREATE OR REPLACE FUNCTION public.verify_audit_chain(p_org_id uuid)
 RETURNS TABLE(row_sequence_no bigint, is_valid boolean, expected_prev_hash text, actual_prev_hash text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

alter table public.admin_users enable row level security;

alter table public.ae_reports enable row level security;

alter table public.audit_trail enable row level security;

alter table public.conversation_members enable row level security;

alter table public.conversations enable row level security;

alter table public.demo_requests enable row level security;

alter table public.document_metadata_versions enable row level security;

alter table public.document_queries enable row level security;

alter table public.document_validations enable row level security;

alter table public.documents enable row level security;

alter table public.expected_documents enable row level security;

alter table public.inspection_questions enable row level security;

alter table public.instrument_items enable row level security;

alter table public.instrument_versions enable row level security;

alter table public.instruments enable row level security;

alter table public.invitations enable row level security;

alter table public.ip_accountability enable row level security;

alter table public.ip_inventory enable row level security;

alter table public.isf_audit_trail enable row level security;

alter table public.isf_config enable row level security;

alter table public.isf_documents enable row level security;

alter table public.isf_queries enable row level security;

alter table public.isf_tickets enable row level security;

alter table public.message_attachments enable row level security;

alter table public.messages enable row level security;

alter table public.monitoring_action_items enable row level security;

alter table public.monitoring_visits enable row level security;

alter table public.notification_log enable row level security;

alter table public.notification_preferences enable row level security;

alter table public.organizations enable row level security;

alter table public.participant_activities enable row level security;

alter table public.participant_journey_stages enable row level security;

alter table public.participant_notifications enable row level security;

alter table public.participant_preferences enable row level security;

alter table public.participant_response_corrections enable row level security;

alter table public.participant_responses enable row level security;

alter table public.participants enable row level security;

alter table public.payment_milestones enable row level security;

alter table public.protocol_deviations enable row level security;

alter table public.research360_queries enable row level security;

alter table public.research360_saved enable row level security;

alter table public.signup_tokens enable row level security;

alter table public.site360_demo_requests enable row level security;

alter table public.site360_invites enable row level security;

alter table public.site360_signup_tokens enable row level security;

alter table public.site360_support_tickets enable row level security;

alter table public.site_activation_items enable row level security;

alter table public.site_members enable row level security;

alter table public.site_studies enable row level security;

alter table public.site_tasks enable row level security;

alter table public.sites enable row level security;

alter table public.staff_delegations enable row level security;

alter table public.staff_qualifications enable row level security;

alter table public.studies enable row level security;

alter table public.study_access_grants enable row level security;

alter table public.study_checklist enable row level security;

alter table public.study_identity enable row level security;

alter table public.study_instrument_config enable row level security;

alter table public.study_members enable row level security;

alter table public.study_vault enable row level security;

alter table public.support_tickets enable row level security;

alter table public.tmf_config enable row level security;

alter table public.trinity_chats enable row level security;

alter table public.trinity_findings enable row level security;

alter table public.trinity_memory enable row level security;

alter table public.trinity_suggestions enable row level security;

alter table public.user_roles enable row level security;

create policy "admin users can read own record" on public.admin_users as permissive for select to public using ((email = auth.email()));

create policy "org isolation" on public.ae_reports as permissive for all to public using ((org_id = ( SELECT user_roles.org_id
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.is_active = true))
 LIMIT 1)));

create policy "site360 study access" on public.ae_reports as permissive for all to public using (site360_can_access_study(org_id, study_id)) with check (site360_can_access_study(org_id, study_id));

create policy "audit insert own" on public.audit_trail as permissive for insert to authenticated with check ((auth.uid() = user_id));

create policy "audit read own" on public.audit_trail as permissive for select to authenticated using ((auth.uid() = user_id));

create policy "Users can add conversation members" on public.conversation_members as permissive for insert to public with check ((auth.uid() IS NOT NULL));

create policy "Users can view conversation members" on public.conversation_members as permissive for select to public using ((auth.uid() IS NOT NULL));

create policy "Users can create conversations" on public.conversations as permissive for insert to public with check ((auth.uid() IS NOT NULL));

create policy "Users can update conversations" on public.conversations as permissive for update to public using ((auth.uid() IS NOT NULL));

create policy "Users can view conversations they are in" on public.conversations as permissive for select to public using ((auth.uid() IS NOT NULL));

create policy "authenticated can read demo requests" on public.demo_requests as permissive for select to authenticated using (true);

create policy "authenticated can update demo requests" on public.demo_requests as permissive for update to authenticated using (true);

create policy "authenticated users can read demo requests" on public.demo_requests as permissive for select to public using ((auth.role() = 'authenticated'::text));

create policy "authenticated users can update demo requests" on public.demo_requests as permissive for update to public using ((auth.role() = 'authenticated'::text));

create policy "public can insert demo requests" on public.demo_requests as permissive for insert to anon, authenticated with check (true);

create policy "org isolation" on public.document_metadata_versions as permissive for all to public using ((org_id = ( SELECT user_roles.org_id
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.is_active = true))
 LIMIT 1)));

create policy "org members can access queries" on public.document_queries as permissive for all to public using ((org_id = ( SELECT user_roles.org_id
   FROM user_roles
  WHERE (user_roles.user_id = auth.uid())
 LIMIT 1)));

create policy "org members can manage validations" on public.document_validations as permissive for all to public using (true);

create policy "Users insert org documents" on public.documents as permissive for insert to public with check ((org_id IN ( SELECT user_roles.org_id
   FROM user_roles
  WHERE (user_roles.user_id = auth.uid()))));

create policy "documents study insert" on public.documents as permissive for insert to public with check (((org_id = ( SELECT user_roles.org_id
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.is_active = true))
 LIMIT 1)) AND can_access_study(auth.uid(), study_id, org_id)));

create policy "documents study read" on public.documents as permissive for select to public using (((org_id = ( SELECT user_roles.org_id
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.is_active = true))
 LIMIT 1)) AND can_access_study(auth.uid(), study_id, org_id)));

create policy "documents study update" on public.documents as permissive for update to public using (((org_id = ( SELECT user_roles.org_id
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.is_active = true))
 LIMIT 1)) AND can_access_study(auth.uid(), study_id, org_id))) with check (((org_id = ( SELECT user_roles.org_id
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.is_active = true))
 LIMIT 1)) AND can_access_study(auth.uid(), study_id, org_id)));

create policy "org members can manage expected documents" on public.expected_documents as permissive for all to public using (true);

create policy "org members can manage inspection questions" on public.inspection_questions as permissive for all to public using (true);

create policy "org isolation" on public.instruments as permissive for all to public using ((org_id = ( SELECT user_roles.org_id
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.is_active = true))
 LIMIT 1)));

create policy "Users see own invitations" on public.invitations as permissive for all to public using ((auth.uid() = invited_by));

create policy "org isolation" on public.ip_accountability as permissive for all to public using ((org_id = ( SELECT user_roles.org_id
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.is_active = true))
 LIMIT 1)));

create policy "org isolation" on public.ip_inventory as permissive for all to public using ((org_id = ( SELECT user_roles.org_id
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.is_active = true))
 LIMIT 1)));

create policy "site360 study access" on public.ip_inventory as permissive for all to public using (site360_can_access_study(org_id, study_id)) with check (site360_can_access_study(org_id, study_id));

create policy "org isolation" on public.isf_audit_trail as permissive for all to public using ((org_id = ( SELECT user_roles.org_id
   FROM user_roles
  WHERE (user_roles.user_id = auth.uid())
 LIMIT 1)));

create policy "site360 study access" on public.isf_audit_trail as permissive for all to public using (site360_can_access_study(org_id, study_id)) with check (site360_can_access_study(org_id, study_id));

create policy "org isolation" on public.isf_config as permissive for all to public using ((org_id = ( SELECT user_roles.org_id
   FROM user_roles
  WHERE (user_roles.user_id = auth.uid())
 LIMIT 1)));

create policy "site360 study access" on public.isf_config as permissive for all to public using (site360_can_access_study(org_id, study_id)) with check (site360_can_access_study(org_id, study_id));

create policy "org isolation" on public.isf_documents as permissive for all to public using ((org_id = ( SELECT user_roles.org_id
   FROM user_roles
  WHERE (user_roles.user_id = auth.uid())
 LIMIT 1)));

create policy "site360 study access" on public.isf_documents as permissive for all to public using (site360_can_access_study(org_id, study_id)) with check (site360_can_access_study(org_id, study_id));

create policy "org isolation" on public.isf_queries as permissive for all to public using ((org_id = ( SELECT user_roles.org_id
   FROM user_roles
  WHERE (user_roles.user_id = auth.uid())
 LIMIT 1)));

create policy "site360 study access" on public.isf_queries as permissive for all to public using (site360_can_access_study(org_id, study_id)) with check (site360_can_access_study(org_id, study_id));

create policy "org members can insert isf_tickets" on public.isf_tickets as permissive for insert to public with check (((org_id)::text IN ( SELECT (user_roles.org_id)::text AS org_id
   FROM user_roles
  WHERE (user_roles.user_id = auth.uid()))));

create policy "org members can update isf_tickets" on public.isf_tickets as permissive for update to public using (((org_id)::text IN ( SELECT (user_roles.org_id)::text AS org_id
   FROM user_roles
  WHERE (user_roles.user_id = auth.uid()))));

create policy "org members can view isf_tickets" on public.isf_tickets as permissive for select to public using (((org_id)::text IN ( SELECT (user_roles.org_id)::text AS org_id
   FROM user_roles
  WHERE (user_roles.user_id = auth.uid()))));

create policy "site360 study access" on public.isf_tickets as permissive for all to public using (site360_can_access_study(org_id, study_id)) with check (site360_can_access_study(org_id, study_id));

create policy "Users can add attachments" on public.message_attachments as permissive for insert to public with check ((auth.uid() IS NOT NULL));

create policy "Users can view attachments" on public.message_attachments as permissive for select to public using ((auth.uid() IS NOT NULL));

create policy "Users can send messages" on public.messages as permissive for insert to public with check ((auth.uid() = sender_id));

create policy "Users can view messages" on public.messages as permissive for select to public using ((auth.uid() IS NOT NULL));

create policy "org isolation" on public.monitoring_action_items as permissive for all to public using ((org_id = ( SELECT user_roles.org_id
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.is_active = true))
 LIMIT 1)));

create policy "site360 study access" on public.monitoring_action_items as permissive for all to public using (site360_can_access_study(org_id, study_id)) with check (site360_can_access_study(org_id, study_id));

create policy "org isolation" on public.monitoring_visits as permissive for all to public using ((org_id = ( SELECT user_roles.org_id
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.is_active = true))
 LIMIT 1)));

create policy "site360 study access" on public.monitoring_visits as permissive for all to public using (site360_can_access_study(org_id, study_id)) with check (site360_can_access_study(org_id, study_id));

create policy "Users see own org" on public.organizations as permissive for all to public using ((auth.uid() = created_by));

create policy "participant self access" on public.participant_activities as permissive for all to public using ((participant_id = ( SELECT participants.id
   FROM participants
  WHERE (participants.email = (( SELECT users.email
           FROM auth.users
          WHERE (users.id = auth.uid())))::text)
 LIMIT 1)));

create policy "participant self access" on public.participant_preferences as permissive for all to public using ((participant_id = ( SELECT participants.id
   FROM participants
  WHERE (participants.email = (( SELECT users.email
           FROM auth.users
          WHERE (users.id = auth.uid())))::text)
 LIMIT 1)));

create policy "participant self access" on public.participant_responses as permissive for all to public using ((participant_id = ( SELECT participants.id
   FROM participants
  WHERE (participants.email = (( SELECT users.email
           FROM auth.users
          WHERE (users.id = auth.uid())))::text)
 LIMIT 1)));

create policy "org isolation" on public.participants as permissive for all to public using ((org_id = ( SELECT user_roles.org_id
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.is_active = true))
 LIMIT 1)));

create policy "site360 study access" on public.participants as permissive for all to public using (site360_can_access_study(org_id, study_id)) with check (site360_can_access_study(org_id, study_id));

create policy "org isolation" on public.payment_milestones as permissive for all to public using ((org_id = ( SELECT user_roles.org_id
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.is_active = true))
 LIMIT 1)));

create policy "site360 study access" on public.payment_milestones as permissive for all to public using (site360_can_access_study(org_id, study_id)) with check (site360_can_access_study(org_id, study_id));

create policy "org isolation" on public.protocol_deviations as permissive for all to public using ((org_id = ( SELECT user_roles.org_id
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.is_active = true))
 LIMIT 1)));

create policy "site360 study access" on public.protocol_deviations as permissive for all to public using (site360_can_access_study(org_id, study_id)) with check (site360_can_access_study(org_id, study_id));

create policy "org members can insert research queries for their org" on public.research360_queries as permissive for insert to public with check ((org_id IN ( SELECT user_roles.org_id
   FROM user_roles
  WHERE (user_roles.user_id = auth.uid()))));

create policy "org members can read their org's research queries" on public.research360_queries as permissive for select to public using ((org_id IN ( SELECT user_roles.org_id
   FROM user_roles
  WHERE (user_roles.user_id = auth.uid()))));

create policy "org members can delete their own saved research" on public.research360_saved as permissive for delete to public using ((user_id = auth.uid()));

create policy "org members can insert saved research for their org" on public.research360_saved as permissive for insert to public with check ((org_id IN ( SELECT user_roles.org_id
   FROM user_roles
  WHERE (user_roles.user_id = auth.uid()))));

create policy "org members can read their org's saved research" on public.research360_saved as permissive for select to public using ((org_id IN ( SELECT user_roles.org_id
   FROM user_roles
  WHERE (user_roles.user_id = auth.uid()))));

create policy "anyone can read signup tokens" on public.signup_tokens as permissive for select to public using (true);

create policy "anyone can update signup tokens" on public.signup_tokens as permissive for update to public using (true);

create policy "admin read" on public.site360_demo_requests as permissive for select to public using ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'System Administrator'::text)))));

create policy "admins can update all site360_demo_requests" on public.site360_demo_requests as permissive for update to public using ((EXISTS ( SELECT 1
   FROM admin_users au
  WHERE ((au.email = (auth.jwt() ->> 'email'::text)) AND (au.is_active = true)))));

create policy "admins can view all site360_demo_requests" on public.site360_demo_requests as permissive for select to public using ((EXISTS ( SELECT 1
   FROM admin_users au
  WHERE ((au.email = (auth.jwt() ->> 'email'::text)) AND (au.is_active = true)))));

create policy "anyone can submit a site360 demo request" on public.site360_demo_requests as permissive for insert to public with check (true);

create policy "public insert" on public.site360_demo_requests as permissive for insert to public with check (true);

create policy "admins can update all site360_signup_tokens" on public.site360_signup_tokens as permissive for update to public using ((EXISTS ( SELECT 1
   FROM admin_users au
  WHERE ((au.email = (auth.jwt() ->> 'email'::text)) AND (au.is_active = true)))));

create policy "admins can view all site360_signup_tokens" on public.site360_signup_tokens as permissive for select to public using ((EXISTS ( SELECT 1
   FROM admin_users au
  WHERE ((au.email = (auth.jwt() ->> 'email'::text)) AND (au.is_active = true)))));

create policy "system admin only" on public.site360_signup_tokens as permissive for all to public using ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'System Administrator'::text) AND (user_roles.is_active = true)))));

create policy "admins can update all site360_support_tickets" on public.site360_support_tickets as permissive for update to public using ((EXISTS ( SELECT 1
   FROM admin_users au
  WHERE ((au.email = (auth.jwt() ->> 'email'::text)) AND (au.is_active = true)))));

create policy "admins can view all site360_support_tickets" on public.site360_support_tickets as permissive for select to public using ((EXISTS ( SELECT 1
   FROM admin_users au
  WHERE ((au.email = (auth.jwt() ->> 'email'::text)) AND (au.is_active = true)))));

create policy "org members can insert site360_support_tickets" on public.site360_support_tickets as permissive for insert to public with check ((org_id IN ( SELECT user_roles.org_id
   FROM user_roles
  WHERE (user_roles.user_id = auth.uid()))));

create policy "org members can view their own site360_support_tickets" on public.site360_support_tickets as permissive for select to public using ((org_id IN ( SELECT user_roles.org_id
   FROM user_roles
  WHERE (user_roles.user_id = auth.uid()))));

create policy "org isolation" on public.site_activation_items as permissive for all to public using ((org_id = ( SELECT user_roles.org_id
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.is_active = true))
 LIMIT 1)));

create policy "site360 study access" on public.site_activation_items as permissive for all to public using (site360_can_access_study(org_id, study_id)) with check (site360_can_access_study(org_id, study_id));

create policy "org isolation" on public.site_members as permissive for all to public using ((org_id = ( SELECT user_roles.org_id
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.is_active = true))
 LIMIT 1)));

create policy "org isolation" on public.site_studies as permissive for all to public using ((org_id = ( SELECT user_roles.org_id
   FROM user_roles
  WHERE (user_roles.user_id = auth.uid())
 LIMIT 1)));

create policy "site360 study access" on public.site_studies as permissive for all to public using (site360_can_access_study(org_id, study_id)) with check (site360_can_access_study(org_id, study_id));

create policy "org isolation" on public.site_tasks as permissive for all to public using ((org_id = ( SELECT user_roles.org_id
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.is_active = true))
 LIMIT 1)));

create policy "site360 study access" on public.site_tasks as permissive for all to public using (site360_can_access_study(org_id, study_id)) with check (site360_can_access_study(org_id, study_id));

create policy "admins can view all sites" on public.sites as permissive for select to public using ((EXISTS ( SELECT 1
   FROM admin_users au
  WHERE ((au.email = (auth.jwt() ->> 'email'::text)) AND (au.is_active = true)))));

create policy "org isolation" on public.sites as permissive for all to public using ((org_id IN ( SELECT user_roles.org_id
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.is_active = true)))));

create policy "org isolation" on public.staff_delegations as permissive for all to public using ((org_id = ( SELECT user_roles.org_id
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.is_active = true))
 LIMIT 1)));

create policy "org isolation" on public.staff_qualifications as permissive for all to public using ((org_id = ( SELECT user_roles.org_id
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.is_active = true))
 LIMIT 1)));

create policy "Users insert org studies" on public.studies as permissive for insert to public with check ((org_id IN ( SELECT user_roles.org_id
   FROM user_roles
  WHERE (user_roles.user_id = auth.uid()))));

create policy "Users see org studies" on public.studies as permissive for select to public using ((org_id IN ( SELECT user_roles.org_id
   FROM user_roles
  WHERE (user_roles.user_id = auth.uid()))));

create policy "Users update org studies" on public.studies as permissive for update to public using ((org_id IN ( SELECT user_roles.org_id
   FROM user_roles
  WHERE (user_roles.user_id = auth.uid()))));

create policy "org isolation" on public.study_access_grants as permissive for all to public using ((org_id = ( SELECT user_roles.org_id
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.is_active = true))
 LIMIT 1)));

create policy "org members can manage checklist" on public.study_checklist as permissive for all to public using (true);

create policy "org members can manage study identity" on public.study_identity as permissive for all to public using (true);

create policy "admins can manage study members" on public.study_members as permissive for all to public using (((NOT (EXISTS ( SELECT 1
   FROM organizations o
  WHERE (((o.id)::text = study_members.org_id) AND (o.type = 'Site'::text))))) OR (EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE (((ur.user_id)::text = (auth.uid())::text) AND ((ur.org_id)::text = study_members.org_id) AND (ur.role = ANY (ARRAY['Site Coordinator'::text, 'PI'::text]))))))) with check (((NOT (EXISTS ( SELECT 1
   FROM organizations o
  WHERE (((o.id)::text = study_members.org_id) AND (o.type = 'Site'::text))))) OR (EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE (((ur.user_id)::text = (auth.uid())::text) AND ((ur.org_id)::text = study_members.org_id) AND (ur.role = ANY (ARRAY['Site Coordinator'::text, 'PI'::text])))))));

create policy "org members can view study members" on public.study_members as permissive for select to public using (true);

create policy "org members can manage vault" on public.study_vault as permissive for all to public using (true);

create policy "Admins can update tickets" on public.support_tickets as permissive for update to public using ((org_id = ( SELECT user_roles.org_id
   FROM user_roles
  WHERE (user_roles.user_id = auth.uid())
 LIMIT 1)));

create policy "Users can insert own tickets" on public.support_tickets as permissive for insert to public with check ((org_id = ( SELECT user_roles.org_id
   FROM user_roles
  WHERE (user_roles.user_id = auth.uid())
 LIMIT 1)));

create policy "Users can view own org tickets" on public.support_tickets as permissive for select to public using ((org_id = ( SELECT user_roles.org_id
   FROM user_roles
  WHERE (user_roles.user_id = auth.uid())
 LIMIT 1)));

create policy "Org members can manage their TMF config" on public.tmf_config as permissive for all to public using (((org_id)::text = ( SELECT (user_roles.org_id)::text AS org_id
   FROM user_roles
  WHERE (user_roles.user_id = auth.uid())
 LIMIT 1)));

create policy "users can manage own trinity chats" on public.trinity_chats as permissive for all to public using (true);

create policy "org members can manage findings" on public.trinity_findings as permissive for all to public using (true);

create policy "users can manage trinity memory" on public.trinity_memory as permissive for all to public using (true);

create policy "users can manage trinity suggestions" on public.trinity_suggestions as permissive for all to public using (true);

create policy "Admins can update user_roles" on public.user_roles as permissive for update to public using ((EXISTS ( SELECT 1
   FROM user_roles user_roles_1
  WHERE ((user_roles_1.user_id = auth.uid()) AND (user_roles_1.role = ANY (ARRAY['System Administrator'::text, 'Sponsor Admin'::text, 'TMF Lead'::text]))))));

create policy "Users can manage own role" on public.user_roles as permissive for all to public using ((auth.uid() = user_id)) with check ((auth.uid() = user_id));

create policy "Users see only own org members" on public.user_roles as permissive for select to public using (((org_id IS NOT NULL) AND (org_id = get_my_org_id())));

create policy "documents bucket overwrite" on storage.objects as permissive for update to authenticated using (((bucket_id = 'Documents'::text) AND can_write_document_file(name))) with check (((bucket_id = 'Documents'::text) AND can_write_document_file(name)));

create policy "documents bucket read" on storage.objects as permissive for select to authenticated using (((bucket_id = 'Documents'::text) AND can_read_document_file(name, owner)));

create policy "documents bucket upload" on storage.objects as permissive for insert to authenticated with check (((bucket_id = 'Documents'::text) AND can_write_document_file(name)));

create policy "isf bucket overwrite" on storage.objects as permissive for update to authenticated using (((bucket_id = 'isf-documents'::text) AND can_access_isf_file(name))) with check (((bucket_id = 'isf-documents'::text) AND can_access_isf_file(name)));

create policy "isf bucket read" on storage.objects as permissive for select to authenticated using (((bucket_id = 'isf-documents'::text) AND can_access_isf_file(name)));

create policy "isf bucket upload" on storage.objects as permissive for insert to authenticated with check (((bucket_id = 'isf-documents'::text) AND can_access_isf_file(name)));

CREATE TRIGGER audit_trail_append_only BEFORE DELETE OR UPDATE ON public.audit_trail FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();

CREATE TRIGGER audit_trail_hash_chain BEFORE INSERT ON public.audit_trail FOR EACH ROW EXECUTE FUNCTION compute_audit_hash();

CREATE TRIGGER audit_trail_no_truncate BEFORE TRUNCATE ON public.audit_trail FOR EACH STATEMENT EXECUTE FUNCTION prevent_audit_modification();

revoke DELETE on public.audit_trail from anon;

revoke TRUNCATE on public.audit_trail from anon;

revoke UPDATE on public.audit_trail from anon;

revoke DELETE on public.audit_trail from authenticated;

revoke TRUNCATE on public.audit_trail from authenticated;

revoke UPDATE on public.audit_trail from authenticated;

revoke DELETE on public.documents from anon;

revoke DELETE on public.documents from authenticated;

insert into storage.buckets (id, name, public) values ('Documents', 'Documents', false) on conflict (id) do update set public = excluded.public;

insert into storage.buckets (id, name, public) values ('isf-documents', 'isf-documents', false) on conflict (id) do update set public = excluded.public;

insert into storage.buckets (id, name, public) values ('participant-resources', 'participant-resources', false) on conflict (id) do update set public = excluded.public;
