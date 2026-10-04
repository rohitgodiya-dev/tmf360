-- Trial360 OS — Foundation Pillar Verification
-- Run after any schema change:
--   PROD: npx supabase db query --linked -f scripts/verify-pillars.sql
--   DEV:  npx supabase db query --linked --project-ref ikjusswwskrkjwxovgza -f scripts/verify-pillars.sql
-- All values must be 1.

select
  (select count(*) from information_schema.columns where table_schema='public' and table_name='audit_trail' and column_name='org_id') as p1_org_id,
  (select count(*) from information_schema.columns where table_schema='public' and table_name='audit_trail' and column_name='record_hash') as p1_hash,
  (select count(*) from information_schema.triggers where trigger_name='audit_trail_hash_chain') as p1_trigger,
  (select count(*) from information_schema.columns where table_schema='public' and table_name='documents' and column_name='file_hash') as p2_file_hash,
  (select count(*) from information_schema.columns where table_schema='public' and table_name='documents' and column_name='file_size_bytes') as p2_size,
  (select count(*) from information_schema.tables where table_schema='public' and table_name='document_metadata_versions') as p3_table,
  (select count(*) from information_schema.table_constraints where table_name='document_metadata_versions' and constraint_name='uq_doc_version') as p3_constraint,
  (select count(*) from information_schema.columns where table_schema='public' and table_name='documents' and column_name='deleted_at') as p4_soft_delete,
  (select count(*) from information_schema.columns where table_schema='public' and table_name='documents' and column_name='deletion_reason') as p4_reason,
  (select count(*) from information_schema.tables where table_schema='public' and table_name='study_access_grants') as p5_grants,
  (select count(*) from information_schema.routines where routine_schema='public' and routine_name='can_access_study') as p5_function,
  (select count(*) from information_schema.routines where routine_schema='public' and routine_name='verify_audit_chain') as p5_verify;

-- Audit chain trigger test — DEV ONLY.
-- audit_trail.sequence_no comes from nextval('audit_trail_seq'); a rolled-back insert
-- on PROD still consumes a sequence number and leaves a gap in the hash chain.
-- Run separately on dev:
--
-- begin;
-- insert into audit_trail (user_id, action, study_id, field_changed, old_value, new_value)
-- select ur.user_id, 'PILLAR_TEST', 'T003', 'test', 'old', 'new'
-- from user_roles ur join auth.users u on u.id = ur.user_id where ur.is_active limit 1
-- returning org_id, sequence_no, prev_hash, record_hash;
-- rollback;
--
-- Expected: org_id filled, sequence_no set, prev_hash=GENESIS or hash, record_hash=64 chars
