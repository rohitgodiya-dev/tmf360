-- Part 1 close-out
--
-- 1. Remove "temp public read" on sites: anyone without a login could read every
--    site (including PI names and emails). All readers are covered by other rules:
--    Site360 pages (org isolation), the Site360 admin portal ("admins can view all
--    sites"), and the invite APIs (service role).
-- 2. Backfill org_id on the three T003 documents that had none, so they are
--    visible again. The uploader's org owns study T003. Each correction is
--    recorded in the audit trail. Documents of the deleted study "tinv" are left
--    untouched (no study to show them under; one has no known uploader).

drop policy if exists "temp public read" on sites;

with fixed as (
  update documents d
  set org_id = ur.org_id
  from user_roles ur
  where d.org_id is null
    and d.study_id = 'T003'
    and ur.user_id = d.user_id
    and ur.is_active = true
    and exists (select 1 from studies s where s.study_id = d.study_id and s.org_id = ur.org_id)
  returning d.id, d.study_id, d.org_id, coalesce(d.custom_file_name, d.file_name, d.artifact_name) as name
)
insert into audit_trail (user_id, user_email, org_id, action, document_id, study_id,
                         field_changed, old_value, new_value, signature_reason, document_name)
select null, 'system: Part 1 migration', org_id, 'Data correction: organisation assigned', id, study_id,
       'org_id', null, org_id::text,
       'Document had no organisation and was invisible to all users; assigned the uploader''s organisation, which owns the study.',
       name
from fixed;
