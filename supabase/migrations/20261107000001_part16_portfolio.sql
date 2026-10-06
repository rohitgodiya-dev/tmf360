-- Part 16 — sponsor portfolio dashboard (docs/enterprise-plan-review.md) (ENT-05)
-- The portfolio is computed by the API from existing tables and views (studies, study_country_summary,
-- structure_completeness, findings, health_snapshots); it needs only a permission. Mirrors lib/permissions.ts.
insert into role_permissions (role, permission)
select r, 'view_portfolio' from unnest(array['System Administrator', 'Sponsor Admin', 'TMF Lead']) as r
on conflict do nothing;
