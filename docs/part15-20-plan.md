# Parts 15–20 — Enterprise readiness (Enterprise Development Plan v1.0)

Review of the plan against the built system: `docs/enterprise-plan-review.md`. This document records the
requirements (ENT-xx, added to `docs/validation/requirements.csv`), the design decisions (D53–D65) and where each
part is implemented and tested.

## Requirements

| ID | Requirement | Part |
|---|---|---|
| ENT-01 | Countries come from an ISO 3166-1 reference list with region and clinical-trial regulator; study countries and site organisations must use a listed code. | 15 |
| ENT-02 | Site institutions record city, address and institution type; each study site records target and actual enrollment; every change is audited. | 15 |
| ENT-03 | Sites, active sites, enrollment, completeness and key dates roll up from site to country to study, respecting each user's access. | 15 |
| ENT-04 | Indexes support 10–20 studies × 20–40 sites per organisation (documents, audit trail, configuration, membership, structure). | 15 |
| ENT-05 | Sponsor Admins, TMF Leads and administrators see all studies side by side (completeness, risk, health, findings, enrollment) with country and site rollups, filters, drill-through and Excel export. | 16 |
| ENT-06 | CRO staff get access to named studies only, for a CRO organisation, with a scope and an optional end date; access can be revoked; expired or revoked access stops at once. | 17 |
| ENT-07 | Study memberships are visible only within the organisation and changed only by user managers; they are never deleted in sponsor organisations. | 17 |
| ENT-08 | The study list shows a user only the studies they can access. | 17 |
| ENT-09 | Studies follow Planning → Startup → Active → Closeout → Closed → Archived one step at a time; closing and archiving are electronically signed; Archived is final; every step is kept with its reason. | 18 |
| ENT-10 | Every panel shows when the study is read-only (closed or archived) and when an inspection is in progress. | 18 |
| ENT-11 | Registering a Final protocol (02.01.02) or amendment (02.01.04) sends an acknowledgement task to every selected, qualified or active site; sites acknowledge and record re-consent; overdue sites are highlighted. | 19 |
| ENT-12 | Studies and sites can be imported from CSV with a template, a row-by-row dry run and an all-or-nothing import. | 20 |
| ENT-13 | A study code is unique within an organisation. | 20 |

## Decisions

- **D53** Sites stay `parties` (`party_type = 'site'`); the plan's changes to Site360 `sites` would break agent isolation (Rule 2).
- **D54** Regulatory, activation and first-patient-in dates are milestones, not columns. Part 15 adds `COUNTRY_FIRST_PATIENT_IN` and `SITE_FIRST_PATIENT_IN`.
- **D55** Rollups are `security_invoker` views (`study_country_summary`, `structure_completeness`) so RLS decides what is counted.
- **D56** The portfolio reuses `health_snapshots` (no `portfolio_snapshots` table). Health is shown as counts of red/amber indicators, never one merged score (HLT-02). Risk follows completeness thresholds.
- **D57** CRO access lives on `study_members` (CRO party, end date), not a second access table. Scopes map to roles that never see all studies: Monitor → CRA, Data Manager → Clinical Trial Associate, Project Manager → Clinical Trial Manager, Regulatory → Regulatory. The plan's "Full Access" is not offered: the only roles with all-study access would see every study, not one.
- **D58** Security fix: `study_members` was readable by every signed-in user and writable by any user in sponsor organisations. Now read within the organisation, written with `invite_users`, never deleted in sponsor organisations. Site organisations keep their site-manager rule.
- **D59** In sponsor organisations, `studies` SELECT is limited to studies the user can access (or created). Study record edits need `edit_study`.
- **D60** Closing requires Close-out. `close_study`/`reopen_study` (Part 11c) remain: reopen returns to Close-out with a signature and is refused once Archived. Archive is signed (`study_archive`).
- **D61** Close-out warnings (completeness below 90%, open QC tasks, high-priority findings, active sites) must be acknowledged and are stored with the step.
- **D62** Inspectors keep the Part 11a model (no account, secret link and code). Part 18 adds only the team-wide "inspection in progress" banner.
- **D63** The amendment cascade triggers on 02.01.02 and 02.01.04 (the plan's 01.02.01 is Trial Team Details). Registration is a deliberate step after QC approval, offered in the tracker for every unregistered Final protocol document.
- **D64** Site acknowledgement by a study manager or a current contact at that site (person email = user email).
- **D65** CSV import validates in the API (dry run) and commits through `security invoker` functions in one transaction, so RLS and the structure audit triggers apply.

## Implementation and verification

| Part | Migration | API | UI | Tests |
|---|---|---|---|---|
| 15 | 20261106000001_part15_hierarchy_scale | /countries, /studies/:id/hierarchy, parties, sites | CountriesSites.tsx | integration/hierarchy, e2e/hierarchy |
| 16 | 20261107000001_part16_portfolio | /portfolio | Portfolio.tsx | integration/portfolio, e2e/portfolio |
| 17 | 20261108000001_part17_cro_access | /studies/:id/cro-access, /study-members/:id, invitations | CroAccess.tsx | integration/cro-access, e2e/cro-access |
| 18 | 20261109000001_part18_study_lifecycle | /studies/:id/lifecycle, /studies/:id/banner | StudyLifecycle.tsx, StudyBanner.tsx | integration/lifecycle, integration/retention-archive, e2e/lifecycle |
| 19 | 20261110000001_part19_protocol_amendments | /studies/:id/amendments, /amendment-acks/:id | AmendmentTracker.tsx | integration/amendments, e2e/amendments |
| 20 | 20261111000001_part20_bulk_import | /bulk-import/:kind | BulkImport.tsx | unit/csv, integration/bulk-import, e2e/bulk-import |

## Release

Apply to PROD after the Part 14 migrations (20261029 … 20261105), in order, each first as a dry run (`begin; … rollback;`)
that writes nothing to audited tables. Part 20 checks PROD for duplicate study codes first and stops if any exist.
