---
name: trial360-compliance
description: Trial360 OS pre-commit compliance checklist — 21 CFR Part 11, data integrity, RLS, agent isolation and code quality checks, plus the pre-commit script. Run before committing any code.
---

# Trial360 OS — Compliance Rules Skill

Run every check before committing any code.

## 21 CFR Part 11 Checks
- [ ] No API route accepts client-supplied timestamps for system events
- [ ] All timestamps use database default now() or server-side new Date()
- [ ] logAudit called after every: document create, update, approve, delete, archive
- [ ] logAudit errors are caught — silent audit failures are a compliance violation
- [ ] No hard deletes — all deletes set deleted_at + deletion_reason

## Data Integrity Checks
- [ ] File uploads compute SHA-256 hash before storing (server re-hash via verify-file / intake verify)
- [ ] Duplicate hash check runs before every upload
- [ ] Approved documents require deletion_reason to delete
- [ ] Metadata changes call saveMetadataVersion before the update
- [ ] Received documents are held in Document Intake (intake_items) — never go direct to TMF
- [ ] Every AI output stored with model version, confidence and user's accept/override decision

## RLS Checks
- [ ] Every new table has: alter table X enable row level security
- [ ] Every new table has an org_id isolation policy
- [ ] No Supabase query uses service role key from client-side code
- [ ] Process-zone permissions enforced at query level not just UI level

## Agent Isolation Checks
- [ ] TMF360 code never reads from: site360_demo_requests, sites, site_members
- [ ] Site360 code never reads from: demo_requests, documents
- [ ] ISF code never reads from: documents (use isf_documents)
- [ ] Participant360 code never reads from: user_roles directly

## Code Quality Checks
- [ ] No Tailwind className in any inline-style page (Tabler `ti ti-*` icon classes allowed)
- [ ] No hardcoded hex colors in JSX (must use C.* tokens)
- [ ] No window.confirm() or window.alert() — use styled modals
- [ ] No console.log() in production code
- [ ] TypeScript compiles with zero errors: npm run build

## Pre-Commit Script
```bash
bash scripts/pre-commit-check.sh
```
All must pass before pushing.
