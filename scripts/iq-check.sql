-- Installation qualification (IQ): confirms that an environment has every database object the released
-- TMF360 version depends on, with row-level security on, guard triggers present and storage private.
-- Run read-only against the target:  npx supabase db query --linked -f scripts/iq-check.sql
-- Every row must say PASS; record the output in the IQ report (docs/validation/iq-oq-pq-protocol.md).
with expected_tables(name) as (values
  ('documents'), ('audit_trail'), ('document_file_versions'), ('document_metadata_versions'), ('intake_items'),
  ('taxonomy_versions'), ('taxonomy_artifacts'), ('tmf_config'), ('study_countries'), ('study_sites'), ('milestones'),
  ('document_tasks'), ('qc_decisions'), ('signature_events'), ('reauth_proofs'), ('placeholders'), ('deletion_requests'),
  ('revision_requests'), ('rules'), ('findings'), ('health_snapshots'), ('inspection_sessions'), ('inspection_session_secrets'),
  ('inspection_requests'), ('inspection_activity'), ('export_jobs'), ('retention_policies'), ('legal_holds'),
  ('risk_settings'), ('risk_factor_weights'), ('oversight_activities'), ('ai_settings'), ('ai_recommendations'),
  ('import_batches'), ('import_items'), ('import_mappings'), ('certified_copies')
),
expected_functions(name) as (values
  ('compute_audit_hash'), ('verify_audit_chain'), ('can_access_study_id'), ('has_org_permission'), ('file_intake_item'),
  ('submit_for_qc'), ('complete_qc_task'), ('delete_document'), ('restore_document'), ('decide_deletion'), ('reclassify_document'),
  ('request_revision'), ('evaluate_study'), ('inspection_auth'), ('inspection_in_scope'), ('inspection_documents'),
  ('create_export_job'), ('close_study'), ('reopen_study'), ('place_legal_hold'), ('release_legal_hold'), ('create_archive_job'),
  ('risk_events'), ('complete_oversight'), ('ai_feature_enabled'), ('settle_ai_recommendations'), ('run_import_dry_run'),
  ('reconcile_import'), ('accept_import'), ('certify_document')
),
expected_triggers(name, tbl) as (values
  ('audit_trail_hash_chain', 'audit_trail'), ('documents_workflow_guard', 'documents'), ('documents_x_post_filing_guard', 'documents'),
  ('documents_legal_hold_guard', 'documents'), ('aa_closed_study_guard', 'documents'), ('documents_certified_guard', 'documents'),
  ('zz_access_audit', 'user_roles'), ('inspection_activity_append_only', 'inspection_activity'), ('ai_recommendations_guard', 'ai_recommendations'),
  ('import_items_zz_guard', 'import_items'), ('import_batches_zz_guard', 'import_batches'), ('certified_copies_append_only', 'certified_copies'),
  ('studies_lifecycle_guard', 'studies')
)
select 'table ' || e.name as item, case when c.oid is not null then 'PASS' else 'FAIL: missing' end as result
from expected_tables e left join pg_class c on c.relname = e.name and c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
union all
select 'RLS on ' || e.name, case when c.relrowsecurity then 'PASS' else 'FAIL: row-level security off' end
from expected_tables e join pg_class c on c.relname = e.name and c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
union all
select 'function ' || e.name, case when exists (select 1 from pg_proc p where p.proname = e.name and p.pronamespace = 'public'::regnamespace) then 'PASS' else 'FAIL: missing' end
from expected_functions e
union all
select 'trigger ' || e.name || ' on ' || e.tbl, case when exists (select 1 from pg_trigger t join pg_class c on c.oid = t.tgrelid where t.tgname = e.name and c.relname = e.tbl and not t.tgisinternal) then 'PASS' else 'FAIL: missing' end
from expected_triggers e
union all
select 'storage bucket ' || b, case when exists (select 1 from storage.buckets where id = b and not public) then 'PASS' else 'FAIL: missing or public' end
from (values ('Documents'), ('exports')) v(b)
union all
select 'secrets table has no user policies', case when not exists (select 1 from pg_policies where tablename in ('inspection_session_secrets', 'reauth_proofs')) then 'PASS' else 'FAIL: policy present' end
union all
select 'audit chain valid (all organisations)', case when not exists (
  select 1 from organizations o where exists (select 1 from audit_trail a where a.org_id = o.id) and (select coalesce(bool_and(v.is_valid), true) from verify_audit_chain(o.id) v) is not true
) then 'PASS' else 'FAIL: broken chain' end
order by 1;
