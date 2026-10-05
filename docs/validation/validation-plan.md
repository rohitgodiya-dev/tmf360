# TMF360 validation plan (draft for QA review)

| | |
|---|---|
| System | TMF360 (Trial360 OS): electronic Trial Master File |
| Version under validation | The `main` commit recorded in the OQ report |
| Intended use | Filing, quality control, oversight, inspection access, archive and migration of TMF records for clinical trials. Records are GxP, subject to 21 CFR Part 11, EU Annex 11 and ICH E6(R3). |
| Approach | Risk-based (GAMP 5, 2nd ed.; CSA principles). Category 4/5: configured product with custom code. |
| Status | **Draft.** Needs approval by the system owner and QA before execution. |

## 1. Scope

**In scope**: the TMF360 modules built in Parts 1–13. The requirement baseline is the eTMF Development
Plan v0.2 (201 requirement IDs, `docs/validation/requirements.csv`). Each requirement's coverage is in
`traceability-matrix.md`: built, partial, not built (with reason) or process.

**Out of scope**: Site360 / ISF (separate system; Part 10 sponsor–site exchange is on hold), Participant360,
and the other Trial360 agents.

## 2. Roles

| Role | Responsibility |
|---|---|
| System owner | Approves the plan and the summary, and accepts residual risks |
| QA / validation lead | Reviews protocols and evidence, and signs the validation summary |
| Developers | Maintain tests and traceability, run IQ/OQ, and fix deviations |
| Pilot users | Execute PQ scenarios and the user acceptance test in the pilot |

## 3. Deliverables

| Deliverable | Where | Status |
|---|---|---|
| User requirements (URS) | Baseline v0.2 + `requirements.csv` | Available |
| Design (FS/DS) | `docs/part1..13-plan.md`, migrations, `docs/api-conventions.md` | Available |
| Traceability matrix | `traceability-matrix.md/.csv` (generated) | Available; reviewed notes in `coverage-notes.csv` |
| Risk assessment | Section 5 below | Draft |
| IQ | `scripts/iq-check.sql` per environment | Automated; record each run |
| OQ | `scripts/oq-run.mjs` → `oq-report-<date>.md`; e2e scripts in `tests/e2e` | Automated; review and sign |
| PQ | Reference study test + the pilot scenarios in `iq-oq-pq-protocol.md` | Automated part done; pilot part pending |
| Authorization boundary tests | `tests/integration/authorization-boundaries.test.ts` + per-module tests | Automated |
| Change control | `change-control.md` | Draft |
| SOPs and training | `sop-outlines.md` | Outlines; owner action |
| Validation summary | To be written after the pilot | Owner action |

## 4. Test strategy

- Every release is gated by the unit, integration (DEV database) and end-to-end suites. A release does not
  ship if any test fails. Each module's tests include a mutation check, where the guard is removed and the
  tests must fail.
- Data integrity checks run in the suite and in IQ: the audit hash chain is verified, and file hashes are
  verified at intake, filing and import.
- Authorization boundary (negative) tests run every release for these personas:
  - removed user
  - user without study access
  - other organisation
  - inspector session
  - roles without the permission
- PQ uses the synthetic reference study (3 countries, 10 sites, 1,980 records) with hand-calculated
  completeness, tile counts, health indicators and risk. The reference migration (Baseline: 10,000 documents
  with deliberate defects) is scaled down in the migration tests; the full-size run is a pilot activity.
- AI: every capability is off by default except classification. Model and prompt versions are recorded per
  recommendation. Evaluating each model version on held-out data is an owner action before any AI capability
  is switched on in production.

## 5. Risk assessment (summary)

| Risk | Control | Evidence |
|---|---|---|
| Unauthorised access to records | RLS on every table; security-definer functions with access checks; persona tests | authorization-boundaries, security-baseline, inspection tests |
| Altered or lost audit trail | Append-only, hash-chained trail; IQ verifies the chain | IQ check, security-baseline tests |
| Status changed outside the workflow | Database guards (workflow, post-filing, closed study, legal hold, certified copy) | qc-workflow, post-filing, retention-archive, certified-copies tests |
| Wrong or forged signature | Password re-check → single-use proof → signature bound to file hash | qc-api, retention-archive, certified-copies, migration-import tests |
| Data lost in migration | Server re-hash, reconciliation, signed acceptance, provenance | migration-import tests, e2e migration |
| AI error taken as fact | Suggestions only; decisions recorded; switches per organisation | ai-recommendations tests |
| Infrastructure failure | Supabase managed backups and PITR; Vercel deployments | **Owner action:** restore test (REG-11) |

## 6. Deviations and acceptance

Deviations found in OQ or PQ are logged with root cause and fix, and retested. The system is accepted when:
- IQ passes in production
- OQ passes with no open critical deviations
- the PQ reference study matches
- the pilot user acceptance test is signed
- every "Not built" requirement is either accepted as out of scope for the release, or scheduled
