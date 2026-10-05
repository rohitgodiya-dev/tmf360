# Part 11: Inspection Mode, reports, archive/retention, risk

Baseline: M19 Inspection Mode (INS-01..09), M13 Reporting (RPT-02..05), M16 Export (EXP-02..04),
Section 6 Retention (RET-01..06), M14 Risk/oversight (RSK-01..05, OVS-01..04).
Shipped in four sub-parts, each with its own migration, tests and deploy.

| Sub-part | Scope | Migration |
|---|---|---|
| 11a | Inspection Mode: sessions, scope, inspector portal, request queue, activity log | 20261022000001 |
| 11b | Excel reports, Navigator Excel export, ZIP export as background job | 20261023000001 |
| 11c | Retention policy, legal hold, study close-out, archive/transfer package | 20261024000001 |
| 11d | Weighted risk factors, explainable artifact risk + roll-ups, oversight activities | 20261025000001 |

## Decisions (taken autonomously; the user said "complete building other parts")

**D27: Inspectors have no TMF360 account.** The study team creates an inspection session. It has a
secret link and a separate 8-character access code, both shown once and stored only as SHA-256.
The inspector opens `/inspect`, enters the code, and every call goes to `/api/v1/inspect/*`, which checks
the session each time: it must be within its start/end window, not revoked, and not locked after
10 wrong codes. Reads go through security-definer functions (`inspection_documents`, `inspection_document`).
Those functions are the one place where scope is enforced. Inspectors never get a database session,
so read-only (INS-03) holds by construction: there are no write endpoints except requests and the activity log.
This also satisfies the rule that inspector access always goes through a session and expires (no standing accounts).

**D28: Download modes (INS-06):**
- `view_only` (default): no download or print.
- `watermark`: PDF downloads and prints are stamped on every page with the inspector name,
  server date/time and session ID (pdf-lib, server side). Non-PDF files can't be downloaded in this mode.
- `original`: the stored file, unchanged.

Every download and print is logged.

**D29: AI in Inspection Mode (INS-05).** The inspector portal has no AI features at all. The session's
`ai_enabled` flag is stored for the record and stays false. Enabling AI is a later option.

**D30: Scope (INS-02).** Each session covers one study. It can be narrowed by any of:
- countries
- sites
- taxonomy nodes (zone `01`, section `01.01` or artifact `01.01.01`, matched as prefixes)
- record statuses (default Final = `Approved`)

The study team chooses whether version history and the audit trail are included. Deleted and
archived records are never in scope. A request answered with a document adds that one document
to the scope (`extra_document_ids`).

**D31: Activity log (INS-08).** These events go into `inspection_activity`, which is append-only:
- login and failed code
- search
- document view
- page view time (seconds per page)
- download and print
- request

The log is exportable as an Excel inspection log. The study team's live view (INS-09) polls every 15 s
and shows recent activity and open requests.

**D32: Excel output.** A small in-repo SpreadsheetML writer built on jszip (already a dependency).
Cells that start with `= + - @` are prefixed so they stay text. Reports (RPT-03) are generated as the
signed-in user, so RLS applies, and each one is audited.

**D33: Exports as jobs (EXP-04).** Exports are stored in `export_jobs`. Each job is processed after the
response with `after()` (maxDuration 300 s) and the ZIP goes to a private `exports` bucket. Downloads
use 5-minute signed links, and a job expires after 7 days. The requester gets an email when the job
is done (link to the app, never to the file). Taxonomy folders come from the study's taxonomy version.

**D34: No purge.** Project Rule 9 (soft delete only) wins over RET-06. Records past retention are reported,
never removed. A purge would be a later, change-controlled feature. A legal hold blocks deletion
requests and soft deletes of covered records. Placing or releasing a hold is audited.

**D35: Close-out (RET-03).** Closing a study needs an e-signature (meaning "Study TMF closed"). It:
- cancels open QC tasks with the reason
- takes a final health snapshot
- makes the study read-only: triggers block changes to its documents, intake, expected artifacts,
  tasks and structure

Reopening needs an e-signature too.

**D36: Archive / transfer (RET-04/05).** The archive package is an export job of kind `archive`, approved
with an e-signature (meaning "Archive package approved"). It contains:
- every file version in taxonomy folders
- metadata, audit trail, signatures and QC decisions as Excel
- `manifest.json` with SHA-256 of every file

A transfer is the same package with a recipient and a signed transfer record. Files keep their original
format (PDF/A conversion is not attempted). The manifest records this.

**D37: Risk (RSK/OVS).** Per-organisation factor weights (0 to 5, 0 disables) in three categories:
- Completeness: missing artifact
- Quality: one factor per QC reason
- Timeliness: late indexing and late processing, with thresholds of 5 and 30 days

Artifact risk = Σ(weight × events) × artifact impact (Core 3 / Recommended 2 / other 1, as in Part 9).
Scores roll up by zone, country, site and owner. Every score is shown with its contributing factors and
counts (OVS-03). Oversight activities (OVS-04) are tracked with status, due date and assignees.
Completing one needs an e-signature (meaning "Oversight review completed").
