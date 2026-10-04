# Part 7 — Workflow, tasks, QC and signatures (plan)

Source: eTMF Development Plan v0.2 Baseline — M09 (WFL-01..07), M10 (QC-01..06), M20 (SIG-01..05, CCP-01..07),
Section 5 signature/attestation matrix, Appendix B (QC reasons). Written 2026-10-04, before any code.

## Decisions taken (review these)

| # | Decision | Why |
|---|---|---|
| D1 | QC approval is an **attestation** (re-enter password + fixed meaning "Reviewed and accepted"), configurable per org to a full **electronic signature**. | Section 5 matrix default. |
| D2 | The direct **Approve** button goes away. A document becomes Approved only when its last QC stage is accepted. Owners get **Submit for QC** instead. | QC-04 "owners cannot override routing"; same reasoning as closing the intake bypass in Part 5b. |
| D3 | Re-authentication is done server-side: the API checks the signer's password against Supabase Auth for the **signed-in user's own email**, then writes the attestation/signature event in the same request. No client timestamps. | REG-15/17, 21 CFR 11.200; rule 10. |
| D4 | Signature/attestation events are append-only and linked to the **document_file_versions** row (the exact file version reviewed). | CCP-01, REG-17 (cannot be excised or copied). |
| D5 | QC groups for v1 = **roles** (any active user whose role has `approve_document`, or a named role per stage). Named user groups can follow later. | Smallest thing that satisfies WFL-01 assignee rule + QC-04 routing. |
| D6 | The 14 Quality reasons from Appendix B are seeded per org and editable (Timeliness factors are KPIs, not reject reasons). | QC-02 business rule. |
| D7 | Fixed default File Plan first (Inbound QC only; Post-Approval QC optional per artifact), configurable plans in the same tables. | Appendix C: WFL-05 fixed in phase 2 slice, configurable later. |

## 7a — Database (DEV first, then PROD dry-run + apply)

- `file_plans` (org, artifact_num or null = default, is_active) + `file_plan_steps` (plan, position, step_type
  `collaboration | inbound_qc | post_approval_qc`, assignee_type `user | role`, assignee_value, duration_days).
- `document_tasks`: document, file_version, step_type, assignee_user / assignee_role, due_at (server: now + duration),
  status `open | completed | cancelled`, outcome, completed_by, completed_at, cancel_reason. Soft-delete columns, RLS via
  `can_access_study`.
- `qc_reasons` (org, code, label, category, weight, is_active) — seeded with the 14 Appendix B quality reasons.
- `qc_decisions` (append-only): task, outcome `accept | reject`, reason_codes[], comment (required on reject).
- `signature_events` (append-only, hash-chained like audit_trail): kind `attestation | signature`, meaning,
  signer id/name/email, document, file_version, task, auth_method, server signed_at.
- RPCs (security definer, permission-checked):
  - `submit_for_qc(document)` → Draft → Under Review, creates the first QC task from the File Plan.
  - `complete_qc_task(task, outcome, reasons, comment, signature_event)` → accept: next stage or Approved;
    reject: back to Draft with reasons, open tasks cancelled; resubmission restarts at Inbound QC (QC-05).
  - First group member to complete closes the task for the group; others' outcomes are kept (WFL-06).
- Trigger: `documents.status` cannot become Approved except through `complete_qc_task` (closes D2 at DB level).

## 7b — API routes (`/api/v1`)
- `GET /studies/[id]/tasks` (mine by default, filters, export) · `POST /tasks/[id]/reassign`
- `POST /documents/[id]/submit` · `POST /tasks/[id]/complete` (password + outcome; does re-auth, writes signature event)
- `GET /documents/[id]/timeline` (WFL-03/04: steps, users, dates, metadata snapshot)
- `GET/PUT /file-plans` (TMF Configuration) · `GET/PUT /qc-reasons`

## 7c — UI (inline styles, page-builder conventions)
- **Study Tasks** panel in TMF nav (WFL-05), overdue highlighted (WFL-07).
- **QC task screen**: three panes — editable metadata | `DocumentViewer` | Details/Comments + Accept/Reject
  (multi-select reasons + comment) + "What happens next" + password re-entry → Confirm & Close (QC-01..03).
- Navigator metadata panel: Timeline tab; Submit for QC replaces Approve.
- TMF Configuration: File Plan editor + QC reasons list.
- Overdue notifications through the existing notifications cron + Resend.

## 7d — Ship
Unit + integration (`tests/integration/qc-workflow.test.ts`) + e2e (`tests/e2e/qc.mjs`), pre-commit check,
PROD dry-run in `begin…rollback`, apply, verify pillars, push, live smoke.

## Existing data on PROD
Already-Approved documents stay Approved (no retroactive QC). Documents currently "Under Review" get an Inbound QC
task created by the migration so they are not stranded.
