# Enterprise Development Plan v1.0 — review against the built system (2026-10-06)

The plan (October 2026, 11 items) was written against an older, simpler schema. Parts 1–14 have since
built most of it in a stronger form. This review says, item by item, what already works, what the plan
gets wrong for this codebase, and what is left. The remaining work is Parts 15–21.

## Corrections to the plan's SQL (apply to every item)

| Plan assumes | Actual system | Consequence |
|---|---|---|
| `study_countries.study_id` / `study_sites.study_id` are text codes | They are `uuid` FKs to `studies.id` (Part 2b); `documents.study_id` is the text code | Every new table keys on `studies.id` |
| RLS policy `org_id = (select org_id from user_roles … limit 1)` | Standard is `current_org_id()` + `can_access_study_id()` + `structure_before_insert/update` + `structure_audit` triggers | New tables use the house template, not the plan's policy |
| Sites master = Site360 `sites` table, linked from `study_sites` | TMF360 sites are `parties` (`party_type = 'site'`); `sites` belongs to Site360 | Rule 2 (agent isolation): **never** alter or join Site360 `sites` from TMF360 |
| `study_sites.site_status` (Startup/Active/…) | `study_sites.status` (identified → selected → qualified → ongoing → closed / deactivated), driven by milestones | Reuse; no second status column |
| Regulatory submission/approval dates, activation/close-out dates as columns | Already milestones (`COUNTRY_SUBMISSION`, `COUNTRY_APPROVAL`, `SITE_ACTIVATED`, `SITE_CLOSED`, …) with planned/actual dates | Reuse milestones; don't duplicate dates |
| PI / CRA name + email columns on sites | `persons` + `contact_roles` (PI, CRA, …) scoped to study/country/site | Reuse |
| Protocol artifact `01.02.01` | Reference Model: Protocol `02.01.02`, Protocol Amendment `02.01.04` (`01.02.01` is Trial Team Details) | Cascade triggers on 02.01.02 / 02.01.04 |
| Inspector = new user role with timed logins | Part 11a Inspection Mode: no account, secret link + access code, scope enforced in the database, everything logged, request queue | Already better than the plan; only the team-wide banner is missing |
| `portfolio_snapshots` table | `health_snapshots` (daily cron) + `study_health_state` (Part 9) | Portfolio reads those; no new snapshot table |
| Client-side CSV insert into `studies` | All new server logic goes through `/api/v1` (validated, permission-checked, audited) | Import runs server-side with dry run |
| Document lock column `studies.is_locked` | Closed studies are read-only via guard triggers (Part 11c, flag `app.study_lifecycle`) | Lifecycle builds on close_study / archive |

## Item by item

| # | Plan item | Already works | Still to build | Part |
|---|---|---|---|---|
| 1 | Study / country / site hierarchy | study_countries, study_sites, parties, persons, contact_roles, milestones, Study structure page (Part 2b–2d); health drill-down by site (Part 9) | Country reference table (name, region, regulator); site master details (city, address, institution type); enrollment target/actual; country first-patient-in milestone; country/site rollup views; Countries & sites overview panel in /platform | **15** |
| 4 (§4) | Performance indexes | navigator, audit (org, study, time), file hash, deleted_at | documents status/zone/expiry, audit by document, tmf_config, user_roles, study_members, study_sites/countries lookups | **15** |
| 2 | Sponsor portfolio dashboard | Per-study health, risk, completeness (Parts 8a, 9, 11d); Excel writer (lib/xlsx.ts) | Portfolio panel: cross-study table, KPI cards, filters, country/site rollups, drill-through, Excel export | **16** |
| 3 | CRO multi-study access | study_members + can_access_study (Pillar 5); CRO parties (Part 2b) | CRO organisation, access scope and expiry on study membership; expired access denied by can_access_study; Invite CRO / revoke per study; study switcher shows accessible studies only | **17** |
| 4 | Study lifecycle | Signed close_study / reopen_study, read-only guards, archive packages (Part 11c) | Planning → Startup → Active → Closeout → Closed → Archived state machine, enforced in the database; signed transitions; history; completeness warning; read-only banner on every panel | **18** |
| 6 | Inspector group | Inspection Mode (Part 11a): timed sessions, Final-only scope, request queue, activity log, read-only portal | "Inspection in progress" banner for the study team on every panel | **18** |
| 5 | Protocol amendment cascade | QC approval workflow (Part 7), study tasks, notifications | protocol_amendments + per-site acknowledgements, created when a protocol/amendment is approved; tracker panel; overdue highlighting; re-consent tracking; notifications | **19** |
| 10 | Bulk CSV import (studies + sites) | Document migration batches (Part 12b) — documents only | Studies CSV and sites CSV: templates, server-side validation, dry run, import log | **20** |
| 7 | IQ/OQ/PQ validation package | Part 13: validation plan, IQ/OQ/PQ protocol, traceability, iq-check.sql, oq-run.mjs, OQ report | Extend traceability and OQ for Parts 14–20; owner signatures | **21** |
| 8, 9, 11 | SOC 2, HIPAA BAA, SLA | Pillars 1–6 controls; SOP outlines | Drafts: SLA, incident response, change management, vendor risk assessment, PHI handling, BAA/DPA/privacy checklists for counsel | **21** (drafts only) |
| — | Staging Area, PDF viewer, two-stage QC | Done: Document Intake (Part 5), pdf.js viewer (6c), QC workflow (7) | — | — |
| — | Stripe billing | Not built | Needs pricing/plan decisions first — not scheduled | — |

Owner-only actions (no code): sign the validation documents, verify the Supabase BAA, engage counsel
(BAA, DPA, privacy policy), Vanta gap assessment, Statuspage.io account, third-party pen test.

## Parts

Prerequisite: release Part 14a–h to PROD (migrations 20261029 … 20261105), because new migrations come after it.

| Part | Scope | SQL | UI |
|---|---|---|---|
| 15 | Hierarchy and scale | countries, site details on parties, enrollment, country FPI milestone, rollup views, indexes | Countries & sites panel; new fields on Study structure page |
| 16 | Sponsor portfolio dashboard | portfolio_summary() function (access-checked) | Portfolio panel (Sponsor Admin, TMF Lead, System Administrator) |
| 17 | CRO study-scoped access | study_members: cro party, access scope, expiry; can_access_study honours expiry | Study access section: invite CRO user, revoke; switcher filtered |
| 18 | Study lifecycle + banners | lifecycle_status, study_lifecycle_events, signed transition function | Lifecycle panel; read-only and inspection banners |
| 19 | Protocol amendment cascade | protocol_amendments, amendment_site_acknowledgements, trigger on approval | Amendment tracker panel |
| 20 | Bulk CSV import | import functions (dry run + commit) | Admin: study and site CSV import |
| 21 | Enterprise readiness pack | — | Docs: traceability/OQ refresh, SLA, incident response, change management, vendor risk, PHI handling, legal checklists |

Each part follows the usual cycle: plan → SQL on DEV → API + tests → UI → build → local checkpoint
commits; PROD migration and push only when the part is complete.
