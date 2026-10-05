# Traceability matrix

Generated 2026-10-05 by `node scripts/traceability.mjs` from the requirement IDs of the eTMF Development Plan v0.2 Baseline
(`docs/validation/requirements.csv`, 201 IDs). A requirement is traced where design documents, code and tests cite its ID.

| Status | Count |
|---|---|
| Verified by test | 119 |
| Implemented (no test cites it) | 51 |
| Designed only | 7 |
| Not traced | 24 |

"Not traced" means no file cites the ID. Either the requirement is out of the built scope (see the part plans) or the
code that covers it does not name it yet. Each one needs a decision in the validation summary.

| ID | Status | Reviewed coverage | Design | Implementation | Tests |
|---|---|---|---|---|---|
| AI-01 | Verified by test |  | docs/part12-plan.md | lib/api/ai.ts<br>mig/20261026000001_part12a_ai_recommendations.sql | tests/integration/ai-recommendations.test.ts |
| AI-02 | Verified by test |  | docs/part12-plan.md | lib/api/ai.ts<br>mig/20261026000001_part12a_ai_recommendations.sql | tests/integration/ai-recommendations.test.ts |
| AI-03 | Verified by test |  | docs/part12-plan.md | lib/api/ai.ts<br>mig/20261026000001_part12a_ai_recommendations.sql | tests/integration/ai-recommendations.test.ts |
| AI-04 | Verified by test |  | docs/part12-plan.md | lib/api/ai.ts<br>lib/api/pdftext.ts<br>mig/20261026000001_part12a_ai_recommendations.sql | tests/integration/ai-recommendations.test.ts |
| AI-05 | Verified by test |  | docs/part12-plan.md | api/documents/[documentId]/summary/route.ts<br>app/platform/DocumentViewer.tsx<br>lib/api/ai.ts<br>mig/20261026000001_part12a_ai_recommendations.sql | tests/integration/ai-recommendations.test.ts |
| AI-06 | Verified by test |  | docs/part12-plan.md | api/ai-recommendations/[recId]/decision/route.ts<br>api/studies/[studyId]/ai-recommendations/route.ts<br>api/studies/[studyId]/intake/[itemId]/ai/route.ts<br>api/studies/[studyId]/intake/[itemId]/file/route.ts<br>+3 more | tests/integration/ai-recommendations.test.ts |
| AI-07 | Verified by test |  | docs/part12-plan.md | api/ai-settings/route.ts<br>lib/api/ai.ts<br>mig/20261026000001_part12a_ai_recommendations.sql | tests/integration/ai-recommendations.test.ts |
| AZB-01 | Verified by test |  |  | mig/20261015000001_part6_navigator.sql | tests/integration/authorization-boundaries.test.ts |
| AZB-02 | Verified by test |  |  |  | tests/integration/authorization-boundaries.test.ts |
| AZB-03 | Verified by test |  |  | api/notifications/route.ts | tests/integration/authorization-boundaries.test.ts |
| AZB-04 | Verified by test |  |  | api/studies/[studyId]/navigator/export/route.ts | tests/integration/authorization-boundaries.test.ts |
| AZB-05 | Verified by test |  |  |  | tests/integration/authorization-boundaries.test.ts |
| AZB-06 | Verified by test |  |  | api/documents/[documentId]/access/route.ts<br>lib/files.ts<br>mig/20261003000001_part1_security_fixes.sql | tests/integration/authorization-boundaries.test.ts |
| AZB-07 | Verified by test |  | docs/api-conventions.md | lib/api/db.ts<br>lib/api/http.ts | tests/integration/authorization-boundaries.test.ts |
| AZB-08 | Verified by test |  |  |  | tests/integration/authorization-boundaries.test.ts |
| AZB-09 | Verified by test |  |  |  | tests/integration/authorization-boundaries.test.ts |
| AZB-10 | Verified by test |  |  |  | tests/integration/authorization-boundaries.test.ts |
| AZB-11 | Verified by test |  |  |  | tests/integration/authorization-boundaries.test.ts |
| AZB-12 | Verified by test |  |  |  | tests/integration/authorization-boundaries.test.ts |
| CCP-01 | Implemented (no test cites it) |  | docs/part7-plan.md | mig/20261017000001_part7_qc_workflow.sql |  |
| CCP-02 | Implemented (no test cites it) |  | docs/part7-plan.md | mig/20261017000001_part7_qc_workflow.sql |  |
| CCP-03 | Verified by test | **See 13b**: Certified copy linked to its source (Part 13b) | docs/part7-plan.md | mig/20261028000001_part13b_certified_copies.sql | tests/integration/certified-copies.test.ts |
| CCP-04 | Verified by test | **See 13b**: Who may certify is controlled per study (Part 13b) | docs/part7-plan.md | mig/20261028000001_part13b_certified_copies.sql | tests/integration/certified-copies.test.ts |
| CCP-05 | Verified by test | **See 13b**: Certification method and verification recorded (Part 13b) | docs/part7-plan.md | mig/20261028000001_part13b_certified_copies.sql | tests/integration/certified-copies.test.ts |
| CCP-06 | Verified by test | **See 13b**: Certification signature bound to the file hash (Part 13b) | docs/part7-plan.md | mig/20261028000001_part13b_certified_copies.sql | tests/integration/certified-copies.test.ts |
| CCP-07 | Designed only | **Review**: Text for this ID needs confirming against the Baseline PDF during validation | docs/part7-plan.md |  |  |
| DI-01 | Verified by test | **Built**: Immutable originals: files stored once by SHA-256 (content-addressed path); overwrite policies dropped (Part 4a/4b) |  | mig/20261003000001_part1_security_fixes.sql | tests/integration/document-intake.test.ts<br>tests/integration/file-versions.test.ts |
| DI-02 | Verified by test | **Built**: Versions not overwrites: document_file_versions records every file change; earlier versions retrievable (Part 4b; OPS-06) |  |  | tests/integration/file-versions.test.ts<br>tests/integration/post-filing.test.ts |
| DI-03 | Verified by test | **Built**: Metadata corrections versioned: document_metadata_versions with user time reason (Pillar 3; Part 8b snapshots) |  |  | tests/integration/post-filing.test.ts<br>tests/integration/server-timestamps.test.ts |
| DI-04 | Not traced | **Not built**: Derived files (renditions / OCR / signpost PDF) are not generated; originals are the only stored objects |  |  |  |
| DI-05 | Verified by test | **Built**: Reason required for reclassification revision deletion and Final metadata corrections (Part 8b; permission changes audited by triggers Part 11b) |  |  | tests/integration/post-filing.test.ts |
| DI-06 | Verified by test | **Built (no purge)**: Soft delete only with 180-day restore; legal hold blocks deletion; purge deliberately not provided (D34 / Project Rule 9) | docs/api-conventions.md | app/platform/page.tsx<br>mig/20261003000001_part1_security_fixes.sql<br>mig/20261004000001_part2b_study_structure.sql | tests/integration/post-filing.test.ts<br>tests/integration/retention-archive.test.ts |
| DI-07 | Verified by test | **Partial**: Integrity verification on demand (verify-file) and every Final file checked by rule RUL-UNVERIFIED-FILE; no separate scheduled re-hash job yet |  |  | tests/integration/file-versions.test.ts<br>tests/integration/health.test.ts |
| DI-08 | Verified by test | **Built**: Tamper-evident audit: append-only and hash-chained audit_trail (Pillar 1) with verify_audit_chain |  | mig/20261003000001_part1_security_fixes.sql | tests/integration/security-baseline.test.ts<br>tests/integration/server-timestamps.test.ts |
| DI-09 | Verified by test | **Built**: Contemporaneous capture: server-stamped receipt / filing / approval times (Pillar 6) |  |  | tests/integration/server-timestamps.test.ts |
| DI-10 | Verified by test | **Built**: AI suggestions stored separately as ai_recommendations with provenance; only confirmed values become metadata (Part 12a) |  |  | tests/integration/ai-recommendations.test.ts |
| EXP-01 | Verified by test | **Built**: Navigator grid export to Excel (Part 11b). Note: Part 11b migration comments cite EXP-02 for this | docs/part11-plan.md | api/studies/[studyId]/navigator/export/route.ts | tests/integration/reports-exports.test.ts |
| EXP-02 | Verified by test |  | docs/part11-plan.md | api/studies/[studyId]/exports/route.ts<br>app/platform/ReportsExports.tsx<br>lib/api/exporter.ts<br>mig/20261023000001_part11b_reports_exports.sql | tests/integration/reports-exports.test.ts |
| EXP-03 | Implemented (no test cites it) |  | docs/part11-plan.md | lib/api/exporter.ts<br>mig/20261023000001_part11b_reports_exports.sql |  |
| EXP-04 | Implemented (no test cites it) |  | docs/part11-plan.md | app/api/cron/health/route.ts<br>api/exports/[jobId]/download/route.ts<br>api/studies/[studyId]/exports/route.ts<br>lib/api/background.ts<br>+3 more |  |
| HLT-01 | Implemented (no test cites it) |  | docs/part9-plan.md | api/studies/[studyId]/health/route.ts<br>lib/api/health.ts<br>mig/20261020000001_part9_health_rules.sql |  |
| HLT-02 | Implemented (no test cites it) |  | docs/part9-plan.md | api/studies/[studyId]/health/route.ts<br>app/platform/TmfHealth.tsx<br>lib/api/health.ts<br>mig/20261020000001_part9_health_rules.sql |  |
| HLT-03 | Implemented (no test cites it) |  | docs/part9-plan.md | api/studies/[studyId]/health/route.ts<br>lib/api/health.ts<br>mig/20261020000001_part9_health_rules.sql |  |
| HLT-04 | Verified by test |  | docs/part9-plan.md | api/health-thresholds/route.ts<br>api/studies/[studyId]/health/route.ts<br>app/platform/TmfHealth.tsx<br>lib/api/health.ts<br>+1 more | tests/integration/reference-study.test.ts |
| HLT-05 | Implemented (no test cites it) |  | docs/part9-plan.md | api/studies/[studyId]/findings/route.ts<br>api/studies/[studyId]/health/assessment/route.ts<br>api/studies/[studyId]/health/route.ts<br>app/platform/TmfHealth.tsx<br>+2 more |  |
| HLT-06 | Implemented (no test cites it) |  | docs/part9-plan.md | app/api/cron/health/route.ts<br>api/studies/[studyId]/health/route.ts<br>app/platform/TmfHealth.tsx<br>lib/api/health.ts<br>+1 more |  |
| HLT-07 | Implemented (no test cites it) |  | docs/part9-plan.md | mig/20261020000001_part9_health_rules.sql |  |
| HLT-08 | Implemented (no test cites it) |  | docs/part9-plan.md | mig/20261020000001_part9_health_rules.sql |  |
| IDX-01 | Verified by test | **Partial**: Indexing form per intake item; preview is in the viewer rather than side by side |  |  | tests/e2e/intake.mjs |
| IDX-02 | Not traced | **Not built**: Bulk indexing dialog |  |  |  |
| IDX-03 | Verified by test | **Built**: Choosing the artifact fixes its taxonomy position and TMF level (Part 3 / Part 5) |  |  | tests/integration/document-intake.test.ts<br>tests/integration/taxonomy.test.ts |
| IDX-04 | Verified by test | **Partial**: Title / version / effective date / owner / country-site; author / receipt date / certified-copy flag / long comments not on the intake form |  |  | tests/integration/document-intake.test.ts |
| IDX-05 | Not traced | **Not built**: Auto-generated sponsor-study-site-artifact-sequence document ID |  |  |  |
| IDX-06 | Not traced | **Not built**: Suggested title patterns |  |  |  |
| IDX-07 | Verified by test | **Partial**: Save and File to TMF; no Define Timeline step |  |  | tests/e2e/intake.mjs |
| IDX-08 | Not traced | **Not built**: Unsaved-changes guard |  |  |  |
| IDX-09 | Verified by test | **Built**: AI-suggested type and metadata shown as suggestions the person applies (Part 12a) |  |  | tests/e2e/ai.mjs<br>tests/integration/ai-recommendations.test.ts |
| INS-01 | Verified by test |  | docs/part11-plan.md | api/inspect/session/route.ts<br>api/studies/[studyId]/inspections/route.ts<br>app/inspect/InspectApp.tsx<br>app/platform/InspectionMode.tsx<br>+1 more | tests/integration/inspection.test.ts |
| INS-02 | Verified by test |  | docs/part11-plan.md | api/inspect/documents/[documentId]/versions/route.ts<br>api/inspect/documents/route.ts<br>app/inspect/InspectApp.tsx<br>mig/20261022000001_part11a_inspection.sql | tests/integration/inspection.test.ts |
| INS-03 | Verified by test |  | docs/part11-plan.md | app/inspect/InspectApp.tsx<br>mig/20261022000001_part11a_inspection.sql | tests/integration/inspection.test.ts |
| INS-04 | Verified by test |  | docs/part11-plan.md | api/inspect/documents/[documentId]/audit/route.ts<br>app/inspect/InspectApp.tsx<br>mig/20261022000001_part11a_inspection.sql | tests/integration/inspection.test.ts |
| INS-05 | Verified by test |  | docs/part11-plan.md | app/inspect/InspectApp.tsx<br>mig/20261022000001_part11a_inspection.sql | tests/integration/inspection.test.ts |
| INS-06 | Verified by test |  | docs/part11-plan.md | api/inspect/documents/[documentId]/file/route.ts<br>app/inspect/InspectApp.tsx<br>lib/api/inspect.ts<br>mig/20261022000001_part11a_inspection.sql | tests/integration/inspection.test.ts |
| INS-07 | Verified by test |  | docs/part11-plan.md | api/inspect/requests/route.ts<br>api/inspection-requests/[requestId]/respond/route.ts<br>api/inspections/[sessionId]/route.ts<br>app/inspect/InspectApp.tsx<br>+2 more | tests/integration/inspection.test.ts |
| INS-08 | Verified by test |  | docs/part11-plan.md | api/inspect/activity/route.ts<br>api/inspect/documents/[documentId]/route.ts<br>api/inspect/documents/route.ts<br>api/inspections/[sessionId]/log/route.ts<br>+4 more | tests/integration/inspection.test.ts |
| INS-09 | Verified by test |  | docs/part11-plan.md | api/inspections/[sessionId]/route.ts<br>app/inspect/InspectApp.tsx<br>app/platform/InspectionMode.tsx<br>mig/20261022000001_part11a_inspection.sql | tests/integration/inspection.test.ts |
| LNK-01 | Not traced | **Not built**: Document links |  |  |  |
| LNK-02 | Not traced | **Not built**: Typed links |  |  |  |
| LNK-03 | Not traced | **Not built**: Link batch reporting |  |  |  |
| MIG-01 | Verified by test |  | docs/part12-plan.md | api/imports/[batchId]/items/route.ts<br>api/studies/[studyId]/imports/route.ts<br>mig/20261027000001_part12b_migration_import.sql | tests/integration/migration-import.test.ts |
| MIG-02 | Verified by test |  | docs/part12-plan.md | api/import-mappings/route.ts<br>mig/20261027000001_part12b_migration_import.sql | tests/integration/migration-import.test.ts |
| MIG-03 | Verified by test |  | docs/part12-plan.md | api/imports/[batchId]/dry-run/route.ts<br>mig/20261027000001_part12b_migration_import.sql | tests/integration/migration-import.test.ts |
| MIG-04 | Verified by test |  | docs/part12-plan.md | api/import-items/[itemId]/route.ts<br>mig/20261027000001_part12b_migration_import.sql | tests/integration/migration-import.test.ts |
| MIG-05 | Verified by test |  | docs/part12-plan.md | api/imports/[batchId]/reconcile/route.ts<br>lib/api/imports.ts<br>mig/20261027000001_part12b_migration_import.sql | tests/integration/migration-import.test.ts |
| MIG-06 | Verified by test |  | docs/part12-plan.md | api/imports/[batchId]/accept/route.ts<br>mig/20261027000001_part12b_migration_import.sql | tests/integration/migration-import.test.ts |
| MIG-07 | Verified by test |  | docs/part12-plan.md | mig/20261027000001_part12b_migration_import.sql | tests/integration/migration-import.test.ts |
| MIG-08 | Verified by test |  | docs/part12-plan.md | mig/20261027000001_part12b_migration_import.sql | tests/integration/migration-import.test.ts |
| MIG-09 | Designed only | **Not built**: Standards-based exchange (TMF RM Exchange Mechanism) - D45 | docs/part12-plan.md |  |  |
| MIG-10 | Verified by test | **Partial**: Documented API for system ingestion: /api/v1 intake endpoints (bearer token / server re-hash); no separate public API product - D45 | docs/part12-plan.md |  | tests/integration/document-intake.test.ts |
| NAV-01 | Implemented (no test cites it) |  |  | api/studies/[studyId]/navigator/tree/route.ts<br>app/platform/Navigator.tsx<br>lib/api/navigator.ts<br>mig/20261015000001_part6_navigator.sql |  |
| NAV-02 | Implemented (no test cites it) |  |  | app/platform/Navigator.tsx |  |
| NAV-03 | Verified by test |  |  | app/platform/Navigator.tsx<br>lib/api/navigator.ts | tests/integration/reference-study.test.ts |
| NAV-04 | Implemented (no test cites it) |  |  | app/platform/Navigator.tsx<br>mig/20261015000001_part6_navigator.sql |  |
| NAV-05 | Implemented (no test cites it) |  |  | app/platform/Navigator.tsx<br>lib/api/navigator.ts<br>mig/20261015000001_part6_navigator.sql |  |
| NAV-06 | Implemented (no test cites it) |  |  | app/platform/Navigator.tsx |  |
| NAV-07 | Verified by test | **Built**: Filters: TMF level and current/historical index (Part 6) |  |  | tests/integration/navigator.test.ts |
| NAV-08 | Implemented (no test cites it) |  |  | api/documents/[documentId]/route.ts<br>api/studies/[studyId]/navigator/export/route.ts<br>app/platform/Navigator.tsx |  |
| NAV-09 | Verified by test | **Partial**: Title search; full-text search of document content not built |  |  | tests/integration/navigator.test.ts |
| OPS-01 | Verified by test |  |  | api/documents/[documentId]/delete/route.ts<br>app/platform/DocumentActions.tsx<br>mig/20261019000001_part8b_post_filing.sql | tests/integration/post-filing.test.ts |
| OPS-02 | Verified by test |  |  | api/deletion-requests/[requestId]/decide/route.ts<br>api/documents/[documentId]/deletion-request/route.ts<br>api/studies/[studyId]/deletion-requests/route.ts<br>app/platform/DocumentActions.tsx<br>+1 more | tests/integration/post-filing.test.ts |
| OPS-03 | Verified by test |  |  | api/documents/[documentId]/restore/route.ts<br>mig/20261019000001_part8b_post_filing.sql | tests/integration/post-filing.test.ts |
| OPS-04 | Verified by test |  |  | api/documents/[documentId]/reclassify/route.ts<br>app/platform/DocumentActions.tsx<br>mig/20261019000001_part8b_post_filing.sql | tests/integration/post-filing.test.ts |
| OPS-05 | Verified by test |  |  | api/documents/[documentId]/revision/route.ts<br>app/platform/DocumentActions.tsx<br>mig/20261019000001_part8b_post_filing.sql | tests/integration/post-filing.test.ts |
| OPS-06 | Verified by test |  |  | api/documents/[documentId]/access/route.ts<br>api/documents/[documentId]/file/route.ts<br>api/documents/[documentId]/versions/route.ts<br>app/platform/DocumentActions.tsx<br>+1 more | tests/integration/post-filing.test.ts |
| OVS-01 | Verified by test |  | docs/part11-plan.md | api/studies/[studyId]/risk/route.ts<br>app/platform/RiskOversight.tsx<br>lib/api/risk.ts<br>mig/20261025000001_part11d_risk_oversight.sql | tests/integration/risk-oversight.test.ts |
| OVS-02 | Verified by test |  | docs/part11-plan.md | api/studies/[studyId]/risk/route.ts<br>app/platform/RiskOversight.tsx<br>lib/api/risk.ts<br>mig/20261025000001_part11d_risk_oversight.sql | tests/integration/risk-oversight.test.ts |
| OVS-03 | Verified by test |  | docs/part11-plan.md | api/studies/[studyId]/risk/route.ts<br>app/platform/RiskOversight.tsx<br>lib/api/risk.ts<br>mig/20261025000001_part11d_risk_oversight.sql | tests/integration/reference-study.test.ts<br>tests/integration/risk-oversight.test.ts |
| OVS-04 | Verified by test |  | docs/part11-plan.md | api/studies/[studyId]/oversight/route.ts<br>app/platform/RiskOversight.tsx<br>mig/20261025000001_part11d_risk_oversight.sql | tests/integration/risk-oversight.test.ts |
| PLC-01 | Implemented (no test cites it) |  |  | api/plan-template/route.ts<br>app/platform/PlanSettings.tsx<br>mig/20261018000001_part8a_placeholders.sql |  |
| PLC-02 | Implemented (no test cites it) |  |  | api/studies/[studyId]/apply-plan/route.ts<br>api/studies/[studyId]/placeholders/route.ts<br>app/platform/Placeholders.tsx<br>mig/20261018000001_part8a_placeholders.sql |  |
| PLC-03 | Implemented (no test cites it) |  |  | mig/20261018000001_part8a_placeholders.sql |  |
| PLC-04 | Implemented (no test cites it) |  |  | mig/20261018000001_part8a_placeholders.sql |  |
| PLC-05 | Implemented (no test cites it) |  |  | api/placeholders/[placeholderId]/link/route.ts<br>api/placeholders/[placeholderId]/route.ts<br>app/platform/Placeholders.tsx<br>mig/20261018000001_part8a_placeholders.sql |  |
| PLC-06 | Verified by test |  |  | app/platform/Navigator.tsx<br>app/platform/Placeholders.tsx<br>lib/api/navigator.ts<br>mig/20261018000001_part8a_placeholders.sql | tests/integration/reference-study.test.ts |
| PLC-07 | Implemented (no test cites it) |  |  | api/studies/[studyId]/expected-artifacts/route.ts<br>app/platform/Placeholders.tsx<br>mig/20261018000001_part8a_placeholders.sql |  |
| PLT-01 | Not traced | **Not built**: SSO (SAML/OIDC) and MFA: Supabase local accounts only |  |  |  |
| PLT-02 | Verified by test | **Built**: Platform home with modules; TMF360 is the eTMF module |  |  | tests/e2e/smoke.mjs |
| PLT-03 | Verified by test | **Built**: Header with study selector and settings on every TMF360 screen |  |  | tests/e2e/smoke.mjs |
| PLT-04 | Verified by test | **Partial**: Async jobs (exports / archive packages) show status in the panel and email on completion; no global activity feed |  |  | tests/integration/reports-exports.test.ts |
| PLT-05 | Not traced | **Not built**: Training / Production environment flag per user |  |  |  |
| PLT-06 | Verified by test | **Partial**: Re-authentication (password) for every signature and attestation; idle session timeout not configured |  |  | tests/integration/qc-api.test.ts |
| QC-01 | Implemented (no test cites it) |  | docs/part7-plan.md | api/tasks/[taskId]/route.ts<br>app/platform/QcTasks.tsx<br>mig/20261017000001_part7_qc_workflow.sql |  |
| QC-02 | Implemented (no test cites it) |  | docs/part7-plan.md | api/qc-config/reasons/[reasonId]/route.ts<br>api/qc-config/route.ts<br>api/tasks/[taskId]/complete/route.ts<br>app/platform/QcSettings.tsx<br>+2 more |  |
| QC-03 | Implemented (no test cites it) |  | docs/part7-plan.md | app/platform/QcTasks.tsx<br>mig/20261017000001_part7_qc_workflow.sql |  |
| QC-04 | Implemented (no test cites it) |  | docs/part7-plan.md | api/documents/[documentId]/submit/route.ts<br>mig/20261017000001_part7_qc_workflow.sql |  |
| QC-05 | Implemented (no test cites it) |  | docs/part7-plan.md | mig/20261017000001_part7_qc_workflow.sql |  |
| QC-06 | Verified by test | **Built**: AI pre-QC flags shown on the intake item before filing; flags recorded as recommendations (Part 12a) | docs/part7-plan.md |  | tests/integration/ai-recommendations.test.ts |
| REG-01 | Implemented (no test cites it) |  | docs/api-conventions.md | lib/api/audit.ts<br>mig/20261003000001_part1_security_fixes.sql<br>mig/20261004000001_part2b_study_structure.sql<br>mig/20261008000001_part3_taxonomy.sql<br>+1 more |  |
| REG-02 | Verified by test |  |  |  | tests/integration/reports-exports.test.ts |
| REG-03 | Verified by test | **Built**: Unique user identification and authority checks (RLS + permissions; no shared accounts) |  |  | tests/integration/authorization-boundaries.test.ts<br>tests/integration/security-baseline.test.ts |
| REG-04 | Verified by test | **Built**: Records retained and protected for the retention period; legal hold (Part 11c) |  |  | tests/integration/retention-archive.test.ts |
| REG-05 | Verified by test | **Built**: TMF available to inspectors through time-boxed read-only Inspection Mode (Part 11a) |  |  | tests/e2e/inspection.mjs<br>tests/integration/inspection.test.ts |
| REG-06 | Verified by test | **See CCP**: Certified copies (Part 13b certified copies) |  | api/documents/[documentId]/certify/route.ts<br>app/platform/DocumentActions.tsx<br>mig/20261028000001_part13b_certified_copies.sql | tests/integration/certified-copies.test.ts |
| REG-07 | Not traced | **Not built**: Blinded / confidential restriction and unblinding (see USR-06) |  |  |  |
| REG-08 | Designed only | **Process**: Validation and change control: this validation pack (validation plan / IQ / OQ / PQ / traceability) and change-control procedure | docs/validation/validation-plan.md |  |  |
| REG-09 | Designed only | **Partial**: Access control and minimisation by RLS; regional hosting and GDPR processes are organisational | docs/validation/validation-plan.md |  |  |
| REG-10 | Verified by test | **Built**: Server time stamps (UTC with time zone) from the database clock (Pillar 6) |  |  | tests/integration/server-timestamps.test.ts |
| REG-11 | Designed only | **Process**: Backup and restore: Supabase managed backups; restore test is a pilot activity in the validation plan | docs/validation/validation-plan.md |  |  |
| REG-12 | Verified by test | **Built**: Migrated records keep content / meaning / metadata with reconciliation evidence (Part 12b) |  |  | tests/integration/migration-import.test.ts |
| REG-13 | Verified by test | **Built**: AI outputs traceable / reviewed by a person / under change control (model and prompt version recorded) (Part 12a) |  |  | tests/integration/ai-recommendations.test.ts |
| REG-14 | Verified by test | **Built**: Access restrictions hold across channels (authorization-boundary persona tests) |  |  | tests/integration/authorization-boundaries.test.ts |
| REG-15 | Designed only |  | docs/part7-plan.md |  |  |
| REG-16 | Not traced | **Review**: Text for this ID needs confirming against the Baseline PDF during validation |  |  |  |
| REG-17 | Designed only |  | docs/part7-plan.md |  |  |
| RET-01 | Verified by test |  | docs/part11-plan.md | api/retention-default/route.ts<br>api/studies/[studyId]/archive/route.ts<br>api/studies/[studyId]/retention/route.ts<br>app/platform/ArchiveRetention.tsx<br>+2 more | tests/e2e/archive.mjs<br>tests/integration/retention-archive.test.ts |
| RET-02 | Verified by test |  | docs/part11-plan.md | api/legal-holds/[holdId]/release/route.ts<br>api/legal-holds/route.ts<br>api/studies/[studyId]/archive/route.ts<br>app/platform/ArchiveRetention.tsx<br>+1 more | tests/integration/retention-archive.test.ts |
| RET-03 | Verified by test |  | docs/part11-plan.md | api/studies/[studyId]/archive/route.ts<br>api/studies/[studyId]/close/route.ts<br>app/platform/ArchiveRetention.tsx<br>mig/20261024000001_part11c_retention_archive.sql | tests/integration/retention-archive.test.ts |
| RET-04 | Verified by test |  | docs/part11-plan.md | api/studies/[studyId]/archive-packages/route.ts<br>api/studies/[studyId]/archive/route.ts<br>app/platform/ArchiveRetention.tsx<br>lib/api/exporter.ts<br>+1 more | tests/integration/retention-archive.test.ts |
| RET-05 | Implemented (no test cites it) |  | docs/part11-plan.md | api/studies/[studyId]/archive/route.ts<br>mig/20261024000001_part11c_retention_archive.sql |  |
| RET-06 | Implemented (no test cites it) |  | docs/part11-plan.md | mig/20261024000001_part11c_retention_archive.sql |  |
| RM-01 | Verified by test | **Partial**: Stable internal record-type IDs (taxonomy_artifact_id) exist; much application data still keys on artifact number |  |  | tests/integration/taxonomy.test.ts |
| RM-02 | Verified by test | **Built**: Taxonomy model: versions / zones / sections / artifacts / sub-artifacts (Part 3) |  |  | tests/integration/taxonomy.test.ts |
| RM-03 | Verified by test | **Built**: TMF Reference Model v3.3.1 loaded as the first taxonomy package (Part 3) |  |  | tests/integration/taxonomy.test.ts |
| RM-04 | Verified by test | **Partial**: Each document links to its taxonomy version through taxonomy_artifact_id; per-study version pinning not enforced |  |  | tests/integration/taxonomy.test.ts |
| RM-05 | Not traced | **Not built**: Taxonomy version mappings and guided study migration |  |  |  |
| RM-06 | Not traced | **Not built**: Per-record-type required and type-specific fields |  |  |  |
| RM-07 | Verified by test | **Partial**: Organisation-specific types: custom artifacts in TMF configuration and import mappings (Part 12b) |  |  | tests/integration/migration-import.test.ts |
| RM-08 | Verified by test | **Built**: Risk impact per record type from the Core / Recommended classification used by health (Part 9) and risk (Part 11d) |  |  | tests/integration/health.test.ts<br>tests/integration/risk-oversight.test.ts |
| RPT-01 | Verified by test | **Built**: Immutable audit trail; user-management and access changes audited by triggers (Part 11b). Note: Part 11b migration comments cite RPT-02 for this | docs/part11-plan.md |  | tests/integration/reports-exports.test.ts<br>tests/integration/security-baseline.test.ts |
| RPT-02 | Verified by test |  | docs/part11-plan.md | api/studies/[studyId]/reports/[report]/route.ts<br>api/studies/[studyId]/reports/route.ts<br>app/platform/ReportsExports.tsx<br>lib/api/reports.ts<br>+1 more | tests/integration/reports-exports.test.ts |
| RPT-03 | Verified by test |  | docs/part11-plan.md | lib/api/reports.ts<br>mig/20261023000001_part11b_reports_exports.sql | tests/integration/reports-exports.test.ts |
| RPT-04 | Implemented (no test cites it) |  |  | mig/20261023000001_part11b_reports_exports.sql |  |
| RPT-05 | Implemented (no test cites it) |  |  | mig/20261023000001_part11b_reports_exports.sql |  |
| RSK-01 | Verified by test |  | docs/part11-plan.md | lib/api/risk.ts<br>mig/20261025000001_part11d_risk_oversight.sql | tests/integration/reference-study.test.ts<br>tests/integration/risk-oversight.test.ts |
| RSK-02 | Verified by test |  | docs/part11-plan.md | api/risk-settings/route.ts<br>app/platform/RiskOversight.tsx<br>lib/api/risk.ts<br>mig/20261025000001_part11d_risk_oversight.sql | tests/integration/risk-oversight.test.ts |
| RSK-03 | Verified by test |  | docs/part11-plan.md | lib/api/risk.ts<br>mig/20261025000001_part11d_risk_oversight.sql | tests/integration/risk-oversight.test.ts |
| RSK-04 | Verified by test |  | docs/part11-plan.md | lib/api/risk.ts<br>mig/20261025000001_part11d_risk_oversight.sql | tests/integration/risk-oversight.test.ts |
| RSK-05 | Verified by test |  | docs/part11-plan.md | lib/api/reports.ts<br>lib/api/risk.ts<br>mig/20261025000001_part11d_risk_oversight.sql | tests/integration/risk-oversight.test.ts |
| SGN-01 | Not traced | **Not built**: Signposts |  |  |  |
| SGN-02 | Not traced | **Not built**: Signposts |  |  |  |
| SIG-01 | Implemented (no test cites it) |  | docs/part7-plan.md | mig/20261017000001_part7_qc_workflow.sql |  |
| SIG-02 | Implemented (no test cites it) |  | docs/part7-plan.md | api/inspect/documents/[documentId]/versions/route.ts<br>api/tasks/[taskId]/complete/route.ts<br>app/platform/QcTasks.tsx<br>lib/api/qc.ts<br>+1 more |  |
| SIG-03 | Implemented (no test cites it) |  | docs/part7-plan.md | mig/20261017000001_part7_qc_workflow.sql |  |
| SIG-04 | Implemented (no test cites it) |  | docs/part7-plan.md | mig/20261004000001_part2b_study_structure.sql<br>mig/20261017000001_part7_qc_workflow.sql |  |
| SIG-05 | Implemented (no test cites it) |  | docs/part7-plan.md | mig/20261017000001_part7_qc_workflow.sql |  |
| STG-01 | Verified by test | **Built**: Drag-and-drop and file-picker upload into Document Intake (the plan's Staging Area; Part 5) |  |  | tests/e2e/intake.mjs<br>tests/integration/document-intake.test.ts |
| STG-02 | Not traced | **Not built**: Per-study intake email address |  |  |  |
| STG-03 | Not traced | **Not built**: Sender allow-list for intake email |  |  |  |
| STG-04 | Verified by test | **Built**: Each received file reported Uploaded / Warning (possible duplicate) / Blocked (Part 5b duplicate_status) |  |  | tests/integration/document-intake.test.ts |
| STG-05 | Verified by test | **Built**: Duplicate detection by file name and hash (Part 5b) and by text similarity (Part 12a AI-04) |  |  | tests/integration/ai-recommendations.test.ts<br>tests/integration/document-intake.test.ts |
| STG-06 | Not traced | **Not built**: Add from template (no Document Template Center) |  |  |  |
| STG-07 | Not traced | **Not built**: Signposts (see SGN-01/02) |  |  |  |
| STG-08 | Verified by test | **Partial**: Intake list shows file / received / artifact / owner / country-site; not every listed column |  |  | tests/e2e/intake.mjs |
| STG-09 | Not traced | **Not built**: Bulk Edit Properties / bulk delete / export from intake |  |  |  |
| STU-01 | Verified by test | **Built**: Create studies (existing study form; Part 2 structure) |  |  | tests/integration/study-structure.test.ts |
| STU-02 | Implemented (no test cites it) |  |  | api/studies/[studyId]/sites/[siteId]/route.ts<br>mig/20261004000001_part2b_study_structure.sql |  |
| STU-03 | Implemented (no test cites it) |  |  | api/studies/[studyId]/countries/[countryId]/route.ts<br>lib/api/structure.ts<br>mig/20261004000001_part2b_study_structure.sql |  |
| STU-04 | Implemented (no test cites it) |  |  | api/studies/[studyId]/sites/[siteId]/route.ts |  |
| STU-05 | Verified by test | **Built**: Lifecycle statuses for countries and sites; site status drives site milestones (Part 2b/2c); study close-out (Part 11c) |  |  | tests/integration/milestones.test.ts<br>tests/integration/retention-archive.test.ts |
| STU-06 | Verified by test |  |  | mig/20261005000001_part2c_milestones.sql | tests/integration/milestones.test.ts |
| STU-07 | Implemented (no test cites it) |  |  | mig/20261004000001_part2b_study_structure.sql |  |
| USR-01 | Verified by test | **Built**: Roles and permissions (lib/permissions.ts kept in sync with role_permissions by test) |  |  | tests/integration/security-baseline.test.ts |
| USR-02 | Verified by test | **Built**: User management: invite by email / edit / deactivate (Part 1c invitations) |  |  | tests/integration/account-security.test.ts |
| USR-03 | Verified by test | **Partial**: Application-level admin roles exist; no separate Super User read-only-across-studies group |  |  | tests/integration/security-baseline.test.ts |
| USR-04 | Verified by test | **Partial**: QC routing by role (Part 7) and Inspector only through Inspection Mode sessions (Part 11a); no Trial Administrator group as such |  |  | tests/integration/inspection.test.ts<br>tests/integration/qc-workflow.test.ts |
| USR-05 | Not traced | **Not built**: Content permission per taxonomy node (None / Read-only / Contribute / Unblinded) - process-zone permissions are pending |  |  |  |
| USR-06 | Not traced | **Not built**: Blinded documents and unblinded access |  |  |  |
| USR-07 | Implemented (no test cites it) |  |  | mig/20261004000001_part2b_study_structure.sql |  |
| USR-08 | Verified by test | **Partial**: Study-level access restriction (study members / access grants); site-level restriction not built |  |  | tests/integration/authorization-boundaries.test.ts |
| VWR-01 | Verified by test | **Built**: pdf.js viewer with thumbnails page navigation zoom rotate (Part 6c); Office formats download only |  |  | tests/e2e/navigator.mjs |
| VWR-02 | Implemented (no test cites it) |  |  | api/documents/[documentId]/access/route.ts<br>app/platform/DocumentViewer.tsx |  |
| VWR-03 | Not traced | **Not built**: Reviewer annotations |  |  |  |
| VWR-04 | Verified by test | **Built**: AI summary in the viewer when switched on (Part 12a) |  |  | tests/integration/ai-recommendations.test.ts |
| VWR-05 | Verified by test | **Partial**: Loading states built; signpost placeholder not (no signposts) |  |  | tests/e2e/navigator.mjs |
| WFL-01 | Implemented (no test cites it) |  | docs/part7-plan.md | api/qc-config/route.ts<br>app/platform/QcSettings.tsx<br>mig/20261017000001_part7_qc_workflow.sql |  |
| WFL-02 | Implemented (no test cites it) |  | docs/part7-plan.md | mig/20261017000001_part7_qc_workflow.sql |  |
| WFL-03 | Implemented (no test cites it) |  | docs/part7-plan.md | api/documents/[documentId]/submit/route.ts<br>api/documents/[documentId]/timeline/route.ts<br>lib/api/qc.ts<br>mig/20261017000001_part7_qc_workflow.sql |  |
| WFL-04 | Implemented (no test cites it) |  | docs/part7-plan.md | app/platform/QcTasks.tsx<br>mig/20261017000001_part7_qc_workflow.sql |  |
| WFL-05 | Implemented (no test cites it) |  | docs/part7-plan.md | api/studies/[studyId]/tasks/route.ts<br>api/tasks/[taskId]/reassign/route.ts<br>app/platform/QcTasks.tsx<br>mig/20261017000001_part7_qc_workflow.sql |  |
| WFL-06 | Implemented (no test cites it) |  | docs/part7-plan.md | mig/20261017000001_part7_qc_workflow.sql |  |
| WFL-07 | Implemented (no test cites it) |  | docs/part7-plan.md | mig/20261017000001_part7_qc_workflow.sql |  |

Coverage summary of reviewed notes: See 13b 4 · Review 2 · Built 34 · Not built 24 · Built (no purge) 1 · Partial 17 · See CCP 1 · Process 2.
