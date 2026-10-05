# Part 9 — Consistency engine + continuous readiness (plan)

Source: eTMF Development Plan v0.2 Baseline — Section 13.1 (Rule → Finding), M19 TMF Health & Inspection
Readiness (HLT-01..08). Written 2026-10-04.

## Decisions
| # | Decision |
|---|---|
| D16 | Rules are code-implemented SQL evaluators with a stable code and version (13.1: no admin rule builder). Each finding stores the rule version that produced it. |
| D17 | **Continuous**: any change to documents, placeholders, QC tasks, milestones or sites marks the study "dirty"; the Health page re-evaluates a dirty study when opened; a daily cron re-evaluates every study and stores a snapshot for trends; "Run assessment" forces it. |
| D18 | Priority (HLT-08) = criticality × severity × overdue × scope, every factor stored and shown: criticality Core 3 / Recommended 2 / other 1; severity high 3 / medium 2 / low 1; overdue 1 + min(days, 90)/30; scope = min(records affected, 5). |
| D19 | A finding is open until its condition clears (then resolved automatically) or someone accepts it with a reason; findings can be assigned to a person. Evaluation itself is not written to the audit trail (derived data); human actions are. |
| D20 | Health dimensions side by side (HLT-02): Completeness, Timeliness, Quality, Risk, Open issues. Thresholds per organisation (defaults in code); every amber/red states its cause. |

## Rules v1
| Code | Dimension | Severity | Fires when |
|---|---|---|---|
| RUL-EXPIRED-DOC | Quality | high | a current Final document's expiry date has passed |
| RUL-EXPIRING-SOON | Timeliness | low | it expires within 30 days |
| RUL-MISSING-OVERDUE | Completeness | high | an expected artifact is past its due date |
| RUL-SITE-ACTIVE-MISSING | Consistency | high | a site is active (ongoing) while it still has open expected artifacts |
| RUL-UNVERIFIED-FILE | Quality | high | a Final document's current file is not integrity-verified |
| RUL-QC-OVERDUE | Timeliness | medium | a QC task is past due |
| RUL-INCOMPLETE-RECORD | Completeness | medium | a record has had no file for over 14 days |
| RUL-DATE-ORDER | Consistency | medium | effective date is after expiry date |
| RUL-DUPLICATE-FINAL | Consistency | medium | two current Final documents have the same file |
| RUL-REVISION-STALLED | Timeliness | medium | a revision started over 30 days ago is still Draft |
| RUL-QC-REJECTION-PATTERN | Quality | medium | 3+ QC rejections for the same reason in 90 days |
| RUL-STALE-DRAFT | Timeliness | low | a Draft with a file has not been submitted for 30 days |
| RUL-FUTURE-EFFECTIVE | Consistency | low | a Final document's effective date is in the future |

## Build
- 9a: `rules`, `findings`, `study_health_state`, `health_thresholds`, `health_snapshots`; `evaluate_study()`; dirty triggers;
  API: assessment, findings (assign / accept), health indicators with drill-down by country and site, trend; daily cron.
- 9b: "TMF Health & Readiness" panel (replaces the old client-side Inspection readiness panel): five dimensions,
  indicators with status and cause, by-site drill-down, trend, findings list with factors, assign / accept, CSV export.
