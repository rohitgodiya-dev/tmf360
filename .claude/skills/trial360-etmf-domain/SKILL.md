---
name: trial360-etmf-domain
description: eTMF domain knowledge for TMF360 — DIA TMF Reference Model zones, ISF zones, document states, PLC-06 completeness formula, risk scoring weights, Document Intake (staging) and QC rules, process-zone permissions, Montrium comparison. Load when working on TMF360 panels, artifact lists, gap analysis, ISF, or compliance scoring.
---

# Trial360 OS — eTMF Domain Knowledge Skill

Load when working on TMF360 panels, artifact lists, gap analysis, ISF, or compliance scoring.
Requirement IDs (REG, DI, AZB, M01–M20, PLC, USR…) come from the eTMF Platform Development Plan v0.2 Baseline.

## DIA TMF Reference Model v3.3.1
11 zones:
Zone 01: Trial Management
Zone 02: Central Trial Documents
Zone 03: Regulatory
Zone 04: IRB/IEC and other Approvals
Zone 05: Site Management
Zone 06: IP and Trial Supplies
Zone 07: Safety Reporting
Zone 08: Central and Local Testing
Zone 09: Third Parties
Zone 10: Data Management
Zone 11: Statistics

## ISF Zones (site-level only)
Zone 05: Site Management
Zone 06: IP Management
Zone 07: Site Operations
Zone 08: Subject Data

## Document States (from dev plan)
Staged (in Document Intake) → Incomplete (filed in TMF) → Final
Final → Under Revision → Final
Any → Deleted (recoverable 180 days) → Purged

## Completeness Formula (PLC-06) — Montrium verified
Completeness = Final ÷ (Missing + Expected + Incomplete + Under Revision + Final)
- Approved = Final
- Archived = excluded
- Not-yet-due expected = excluded

## Document Classifications
- Core: Required — gaps are red, block inspection readiness
- Recommended: Best practice — gaps are amber
- Conditional: Required only when applicable

## Risk Scoring Model (Montrium verified weights)
Category: Completeness
- Missing Artifact: weight 3.0

Category: Quality (QC rejection reasons)
- Content: 2.0
- Not eTMF Appropriate: 2.0
- Unsigned: 2.0
- Incorrectly Indexed: 2.0
- Illegible: 3.0
- Multiple Documents in One: 1.0
- Missing Pages: 1.0
- Other: 1.0
- Missing Dates: 1.0
- Expired Document: 0.5
- Duplicate Document: 0.5
- Blank Pages: 0.25
- Formatting Issues: 0.25
- Incorrect Pagination: 0.25

Category: Timeliness
- Indexing Timeliness (>5 days intake to indexing): weight 2.0
- Processing Timeliness (>30 days indexing to final): weight 1.0

Roll-up: Artifact score = sum of (weight × risk events) × artifact type impact
Roll-ups by: zone, country, site, owner

## Document Intake Rules (the plan's "Staging Area" — M05 + Montrium §5)
In TMF360 this is called **Document Intake** (table `intake_items`: received → indexed → filed/rejected).
- All documents land in Document Intake first — NEVER direct to TMF
- File hash match on Final document = BLOCKED
- File name match = WARNING (requires review)
- Text similarity match = WARNING
- Intake items visible only to Contributors and Inbound QC members

## QC Rules (M10 + Montrium §8)
Two stages:
1. Inbound QC — first review after filing, 7 day default duration
2. Post-Approval QC — second stage for Final, 7 day default duration
- Reject requires at least one coded reason + comment
- "What happens next" shown before every outcome
- Rejected documents return to owner with reasons
- Resubmission restarts QC from beginning
- AI pre-QC flags shown to reviewer before decision

## Inspection Readiness Score — Dimensions
1. Core document completeness (weight 60%)
2. Recommended document completeness (weight 20%)
3. Approval rate (weight 10%)
4. Expiry status (weight 10%)

## Process-Zone Permissions (USR-04 + Montrium §16)
Per user, per study, per zone (01-11):
- None: cannot read or contribute
- Read-only: can read, can be assigned as reviewer
- Contribute: read, add, edit, delete incomplete as owner
- Unblinded Contribute: read/add/edit blinded documents (requires second approver)

## Montrium Competitive Reference
TMF360 must match or exceed Montrium eTMF Connect.

WHERE TMF360 MUST BE BETTER THAN MONTRIUM:
- File hash duplicate detection (Montrium has name-match only — TMF360 already has SHA-256)
- Trinity AI pre-QC checks before human review (Montrium QC is 100% manual)
- Trinity auto-classification with confidence score (Montrium requires manual selection)
- Typed artifact links with no cap (Montrium caps at 15)
- Risk and oversight included as standard (Montrium sells it as a paid add-on)
- AI metadata extraction feeds indexing form (Montrium AI only summarizes)

WHERE TMF360 MUST MATCH MONTRIUM:
- Document Intake (upload → intake → index → TMF) — built in Part 5
- Embedded PDF viewer (not opens-in-new-tab)
- Bulk indexing (50 docs at once)
- Two-stage QC (Inbound + Post-Approval)
- Placeholder engine with milestone rules
- Process-zone permissions
- Inspector group (Final documents only)
- File Plan workflow engine
- ZIP export in Reference Model folder structure
- Signpost records
- Completeness formula: Final ÷ (Missing + Expected + Incomplete + Under Revision + Final)

## Key Regulatory References
- ICH E6(R3) 5.0: Sponsor responsibilities
- ICH E6(R3) 4.0: Investigator responsibilities
- 21 CFR Part 11: Electronic records and signatures
- 21 CFR Part 312: IND regulations
- ISO 14155:2020: Medical device clinical investigations
- GAMP 5: Risk-based approach to CSV
