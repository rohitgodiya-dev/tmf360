# Part 13: Validation pack + pilot

Baseline: section 17 (Validation and testing strategy), Phase 4 "Validation and pilot", REG-08 (system validated
for intended use, change control), REG-11 (backup and restore), REG-14 (access across every channel), and
CCP certified copies.

| Sub-part | Scope |
|---|---|
| 13a | Validation tooling: traceability matrix, IQ check, OQ run report, PQ reference study, authorization-boundary persona tests |
| 13b | Certified copies (migration 20261028000001) |
| 13c | Validation and pilot documents: validation plan, IQ/OQ/PQ protocol, change control, pilot plan, SOP outlines |

## Decisions (taken autonomously; the user said "complete building other parts")

**D46: Validation evidence is generated from the code base, not written by hand.**
- `scripts/traceability.mjs` traces each Baseline requirement ID to the design, code and tests that cite it.
  Reviewed notes (`docs/validation/coverage-notes.csv`) record what is built, partial, not built or a process
  item, with the evidence.
- `scripts/iq-check.sql` verifies an environment's database objects.
- `scripts/oq-run.mjs` runs the suites and writes the dated OQ report.
- The PQ reference study (`tests/integration/reference-study.test.ts`) checks computed values against
  hand-calculated ones.

**D47: Certified copies.** A certification belongs to one file version.
- **Who may certify:** the document owner, or a role that may approve documents.
- **Recorded with it:** the source description and location, plus the source hash for electronic duplicates;
  the method; and four confirmed checks (page count, legibility, completeness, unaltered).
- **Signature:** an electronic signature with the meaning "Certified as a true copy of the original", bound to
  the file hash.

The `documents.certified_copy` mark can only be set by the signed function. A newer file version is shown
as not certified.

**D48: What only people can do.** Software cannot complete these:
- formal signatures on the validation plan and summary
- SOP approval
- training records
- the backup restore test (REG-11)
- a penetration test
- choosing the pilot partner and study (decision D-08)

The documents in `docs/validation/` are drafts with those steps marked as owner actions.
