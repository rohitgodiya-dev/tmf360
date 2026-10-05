---
name: trial360-context
description: Trial360 OS platform context — agents, live URLs, database tables by agent, foundation pillars, build roadmap and pending work. Load at the start of every session in this repo.
---

# Trial360 OS — Context Skill

Load this at the start of every session.

## Platform Architecture
Trial360 OS has 14 agents:
TMF360, Site360, CTMS360, CDM360, Budget360, Connect360, Consent360,
Docu360, Vendor360, TrialFinder360, Research360, Smart360, Regulatory360, Secure360

## What Is Actually Live
| URL | Status |
|---|---|
| trial360os.com | Live — main landing |
| trial360os.com/platform | Live — TMF360 dashboard |
| trial360os.com/site360/home | Live — Site360 landing |
| trial360os.com/site360/login | Live — Site360 login |
| trial360os.com/site360 | Live — Site360 dashboard (needs rebuild to match TMF360) |
| trial360os.com/site360/isf | Live — Full ISF page (redirects to login when signed out) |
| trial360os.com/site360/book-demo | Live — Site360 demo booking |
| trial360os.com/site360/admin | Live — Site360 admin |
| trial360os.com/site360/signup | Live — Site360 signup wizard |
| trial360os.com/participant360 | Live — Participant360 portal |
| trial360os.com/participant360/login | Live — Participant login |
| trial360os.com/participant360/diary | Live — Diary flow |
| trial360os.com/book-demo | Live — TMF360 demo booking |
| trial360os.com/admin | Live — TMF360 admin |

The apex domain redirects to https://www.trial360os.com.

## Database Tables by Agent

### Shared (all agents)
organizations, user_roles, studies, participants, auth.users

### TMF360
documents, audit_trail, demo_requests, signup_tokens, tmf_config,
expected_documents, conversations, messages, support_tickets, invitations (legacy, unused),
user_invitations, trinity_chats, trinity_findings, trinity_memory, trinity_suggestions,
research360_queries, research360_saved, document_queries, document_validations,
inspection_questions, notification_preferences, notification_log,
study_checklist, study_identity, study_vault, admin_users,
document_metadata_versions, study_access_grants, study_members, role_permissions,
document_file_versions (Part 4b),
intake_items (Part 5 — **Document Intake**, the plan's "Staging Area"),
parties, persons, study_parties, study_countries, study_sites, contact_roles (Part 2b),
milestone_types, milestones (Part 2c), taxonomy tables (Part 3),
navigator_items view (Part 6), qc_reasons, file_plan_steps, workflow_settings, document_tasks,
qc_decisions, signature_events, reauth_proofs (Part 7), plan_template_items, placeholders (Part 8a),
deletion_requests, revision_requests (Part 8b), rules, findings, study_health_state, health_thresholds,
health_snapshots (Part 9).
expected_documents is legacy and closed to users — use placeholders.

Naming rule: the plan's "Staging Area" is called **Document Intake** in TMF360.
There is no `staged_documents` table — do not create one; extend `intake_items`.

### Site360
sites, site_members, site_studies, site_activation_items, staff_delegations,
staff_qualifications, ip_accountability, ip_inventory, ae_reports,
protocol_deviations, monitoring_visits, monitoring_action_items,
payment_milestones, site_tasks, site360_demo_requests, site360_signup_tokens

### ISF
isf_documents, isf_audit_trail (hash-chained, append-only), isf_queries,
isf_config (per-site details), isf_artifact_config (per-artifact settings)

### Participant360
instruments, instrument_versions, instrument_items, study_instrument_config,
participant_activities, participant_responses, participant_response_corrections,
participant_notifications, participant_journey_stages, participant_preferences

### Secure360 (tables designed, not built yet)
qms_documents, change_orders, training_assignments, training_quiz_questions,
suppliers, study_qms_links

## Foundation Pillars — All Complete (re-verified on prod + dev 2026-10-04)
- Pillar 1: Hash-chained audit trail (trigger: audit_trail_hash_chain, plus append_only / no_truncate)
- Pillar 2: File hash + duplicate detection (column: file_hash on documents)
- Pillar 3: Metadata versioning (table: document_metadata_versions, constraint uq_doc_version)
- Pillar 4: Soft delete + recycle bin (columns: deleted_at, deletion_reason on documents)
- Pillar 5: Study-level RLS (function: can_access_study — checks study_access_grants AND study_members)
- Pillar 6: Server timestamps (server-stamped lifecycle times and actors)

## Build Roadmap (Parts 1–13)
1 Urgent fixes · 2 Core foundation · 3 Taxonomy engine · 4 Records, files, versions, access ·
5 Document Intake · 6 Navigator + viewer · 7 Workflow, tasks, QC, signatures ·
8 Placeholders/completeness + post-filing ops · 9 Consistency engine + continuous readiness ·
10 Sponsor–site link · 11 Inspection Mode, reports, archive/retention, risk ·
12 AI recommendations + migration/import · 13 Validation pack + pilot

Done: Parts 1–7 (Part 6 Navigator + pdf.js viewer; Part 7 QC workflow live 2026-10-04 — see docs/part7-plan.md).
Part 8a live 2026-10-04: eTMF plan (plan_template_items), placeholders (expected artifacts) with
auto-fulfilment, completeness = Final ÷ all five statuses; Incomplete = record with no file.
Part 8b live 2026-10-04: post-filing ops. Deletes/restores only via delete_document /
restore_document (coded reason; 180-day restore); Final docs need a deletion_requests row approved
by someone else with an e-signature; reclassify_document; request_revision (file as Final with
attestation, or collaboration → Draft → POST /documents/:id/file → QC); metadata snapshots taken by
the database (documents_snapshot_metadata). Final metadata can't be edited by writing the row.
Part 9 live 2026-10-04: rules engine (rules, findings, evaluate_study) + TMF Health & Readiness panel
(5 dimensions, thresholds, site drill-down, prioritized findings with factors, daily cron /api/cron/health
for snapshots). Studies are marked dirty by triggers and re-evaluated when Health opens. Add a rule =
new branch in evaluate_study + row in rules (bump version). Next: Part 10 (Sponsor–site link).

Part 7 rules: a document reaches Under Review only via submit_for_qc() and Approved only via
complete_qc_task() (trigger documents_workflow_guard). QC decisions need a password re-check in the
API (lib/api/qc.ts reauthenticate → single-use reauth_proofs row) and write append-only
signature_events + qc_decisions. Never write documents.status/approved_*/rejected_* from the browser.

## Pending Work — In Priority Order

### CRITICAL — confirmed done 2026-10-04
1. ~~3 SQL fixes~~ — audit_trail.org_id, can_access_study checks study_members, uq_doc_version: all present on prod and dev.

### TMF360 UPDATES (from Montrium teardown + dev plan) → mapped to roadmap parts
2. ~~Staging Area~~ — built as Document Intake (Part 5). Gaps still open: file-name duplicate warning, Blocked/Warning badges in the queue.
3. ~~Embedded PDF viewer~~ — done in Part 6c (pdf.js, logged download/print)
4. Explainable risk scoring — weighted factors (Part 11)
5. ~~Placeholder + completeness formula (PLC-06)~~ — done in Part 8a
6. ~~Two-stage QC (Inbound + Post-Approval)~~ — done in Part 7
7. Process-zone permissions (None/Read-only/Contribute/Unblinded per zone 01-11)
8. Inspector group + view (Final documents only) (Part 11)
9. ~~File Plan workflow engine~~ — done in Part 7 (QC steps; Collaboration step not built)
10. ZIP export in Reference Model folder structure (Part 11)
11. Signpost records
12. Typed artifact linking (no 15-link cap)
13. AI metadata extraction (feeds indexing form) (Part 12)
14. Retention + legal hold (Part 11)

### SITE360
15. Rebuild app/site360/page.tsx to match TMF360 exactly
16. Add Study feature inside Site360 Studies panel

### OTHER AGENTS
17. Participant360 — wire diary tab
18. Secure360 — Phase 1 build
19. Platform nav — add Site360 link

## Supabase Import Paths
- app/platform/page.tsx → ../../lib/supabase
- app/site360/page.tsx → ../../lib/supabase
- app/site360/isf/page.tsx → ../../../lib/supabase (on disk the folder is `ISF`; `git add app/site360/isf/page.tsx` lowercase)
- app/site360/book-demo/page.tsx → ../../../lib/supabase
- app/site360/login/page.tsx → ../../../lib/supabase
- app/site360/signup/page.tsx → ../../../lib/supabase
- app/participant360/page.tsx → ../../lib/supabase

New TMF360 server work goes through `/api/v1/*` route handlers (lib/api: bearer-token auth as the user, zod, error model, audit) — see docs/api-conventions.md.
