---
paths:
  - "app/**/*.tsx"
  - "app/api/**/*.ts"
  - "lib/**/*.ts"
  - "supabase/migrations/**/*.sql"
---

# GxP compliance (TMF360)

DO
- New server logic goes in `/api/v1` route handlers (lib/api: requireUser, parseBody, dbError). The browser calls them with `apiFetch`.
- Soft delete only: `delete_document()` / `restore_document()` (coded reason, 180-day restore). Final documents: deletion request + e-signature.
- Server timestamps only: database `now()` / Pillar 6 stamps. Never send `created_at`, `approved_at`, `deleted_at` from the client.
- Status changes only through the workflow functions: `submit_for_qc`, `complete_qc_task`, `return_for_rework`, `reclassify_document`, `request_revision`. A database guard rejects anything else.
- Audit: the database audits table changes (`structure_audit`) and the workflow functions write their own entries; in routes use `writeAudit` (a failed audit fails the request).
- New files go through Document Intake (server re-hash) or `POST /documents/:id/file`; never a direct `documents` insert.
- Every new table: RLS on, org isolation, `can_access_study_id` for study data.
- Signatures/attestations: password re-check in the API (`reauthenticate`) → single-use `reauth_proofs` row → the database function consumes it.

DO NOT
- Hard delete GxP rows (documents, audit_trail, signature_events, qc_decisions, file/metadata versions, isf_*).
- Use the service-role client to read user data or from browser code.
- Write `documents.status`, `approved_*`, `rejected_*`, `deleted_at` from the browser.
- Run a PROD dry-run that writes to audited tables (the audit sequence would gap).
