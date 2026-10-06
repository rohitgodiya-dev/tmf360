# Incident response procedure (DRAFT)

Applies to security incidents, personal-data breaches and service outages of Trial360 OS. Owner: system owner
(Rohit Godiya). Review yearly and after every Critical incident.

## Roles
- **Incident lead** — the system owner, or a named deputy when unavailable. Decides severity, coordinates, communicates.
- **Responders** — whoever is needed to investigate and fix (engineering, provider support).
- **Client contacts** — named in each contract; receive notifications.

## Severity
| Level | Examples |
|---|---|
| Critical | Service down; data exposed to the wrong organisation; audit chain broken; credentials or keys leaked |
| Major | A GxP function broken (filing, QC, signatures, exports) with a workaround; suspected but unconfirmed exposure |
| Minor | Degraded performance; cosmetic faults |

## Steps
1. **Detect and record** — open an incident record (date/time UTC, reporter, symptoms) in the ticket system.
2. **Assess** — set the severity within 30 minutes. Personal data involved? Which organisations and studies?
3. **Contain** — e.g. revoke sessions or keys, disable the affected feature, block the route, pause cron jobs.
   Never delete data or audit records to contain an incident; preserve evidence (logs, audit trail extracts).
4. **Notify** — Critical: affected clients within 4 hours of detection. Personal-data breach: clients (as processor)
   without undue delay so they can meet GDPR's 72-hour and HIPAA's notification duties; follow each DPA/BAA.
5. **Fix and verify** — change under change control (docs/validation/change-control.md, emergency route if needed);
   re-run the IQ check and the affected OQ tests; verify the audit chain (`verify_audit_chain`).
6. **Close** — root cause, impact (organisations, records, time window), corrective and preventive actions (CAPA),
   client report for Critical/Major. Keep the record for the life of the service.

## Evidence to keep
Incident record, timeline, communications sent, logs and audit-trail extracts, fix commits, test results, CAPA status.

## Contacts to fill in
| Party | Contact |
|---|---|
| Hosting (Vercel) support | *fill in* |
| Database (Supabase) support | *fill in* |
| Email (Resend) support | *fill in* |
| Counsel | *fill in* |
| Insurer (cyber) | *fill in* |
