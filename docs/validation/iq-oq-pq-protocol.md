# IQ / OQ / PQ protocol (draft for QA review)

## IQ — installation qualification (each environment, each release)

| Step | Command / action | Acceptance |
|---|---|---|
| IQ-1 | Record the deployed commit (`git rev-parse --short HEAD`) and the Vercel deployment URL | Matches the release |
| IQ-2 | `npx supabase db query --linked -f scripts/iq-check.sql` (PROD) and `--project-ref <dev>` (DEV) | Every row PASS (121 checks at Part 13) |
| IQ-3 | `node scripts/page-health-check.js` | All pages respond 200 |
| IQ-4 | Probe a protected API route without a token (e.g. `POST /api/v1/legal-holds`) | 401 |
| IQ-5 | Confirm environment variables are set in Vercel: Supabase URL/keys, `RESEND_API_KEY`, `EMAIL_FROM`, `CRON_SECRET`, `ANTHROPIC_API_KEY` (only if AI is switched on) | Present (owner checks the Vercel dashboard) |

## OQ — operational qualification (DEV, each release)

| Step | Command / action | Acceptance |
|---|---|---|
| OQ-1 | `node scripts/traceability.mjs` | Matrix generated; changes since the last release reviewed |
| OQ-2 | `node scripts/oq-run.mjs` → `oq-report-<date>.md` | PASS (0 failed) |
| OQ-3 | Run each `tests/e2e/*.mjs` against `next dev -p 3100` with .env.dev | Each prints ALL PASSED (or ALL CHECKS PASSED) |
| OQ-4 | Review mutation checks recorded in each part's release notes | Present for every guard |

## PQ — performance qualification

**Automated (DEV):** `tests/integration/reference-study.test.ts`. It compares the hand-calculated Navigator
tiles, completeness (65.7 %), site and country drill-down (64.9 %), health indicators and risk events.

**Pilot scenarios** (production, pilot study, executed by pilot users; record evidence and sign):

| PQ | Scenario | Expected result |
|---|---|---|
| PQ-1 | File 20 documents through Document Intake (mixed types, sites) | Every file verified; filed as Draft at the right level |
| PQ-2 | QC: accept 15, reject 5 with coded reasons; resubmit and accept | Signatures recorded; rejection reasons in the Rejected report |
| PQ-3 | Apply the eTMF plan; check completeness against a manual count | Navigator tiles and completeness match the manual count |
| PQ-4 | Delete a Draft; request and approve deletion of a Final (second person) | Recycle Bin; signature on the approval; audit entries |
| PQ-5 | Run every report for the pilot period | Excel files open; figures match the Navigator |
| PQ-6 | ZIP export of Final documents | Folder structure by taxonomy; metadata hashes match |
| PQ-7 | Inspection session with a mock inspector: view, search, request, watermark download | Scope respected; activity log complete; access ends on revoke |
| PQ-8 | Legal hold on the study; attempt deletion | Blocked; hold and release audited |
| PQ-9 | Migrate a real legacy batch (at least 200 documents, including deliberate defects) | Exceptions caught; reconciliation at 100 % by hash; signed acceptance; provenance on each record |
| PQ-10 | Certify a scanned original as a true copy | Signature bound to the file hash; shown in version history and inspection |
| PQ-11 | Close the study, build the archive package, reopen | Read-only while closed; package manifest hashes verify |
| PQ-12 | Backup restore drill (REG-11): restore a Supabase backup to a scratch project and run IQ-2 there | IQ passes on the restored copy; record recovery time |
| PQ-13 | Authorization: pilot users with different roles and studies attempt access outside their scope | Refused everywhere |

Signatures: executed by ________ date ______ · reviewed by QA ________ date ______
