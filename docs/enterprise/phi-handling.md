# Handling of protected health information (PHI) and personal data (DRAFT)

## Where personal data can appear
A TMF is mostly regulatory and administrative. Personal data appears in:
- Staff and investigator details (names, emails, CVs, training records) — personal data under GDPR.
- Informed consent forms, subject identification logs, SAE reports and source-like documents that a site or sponsor
  files by mistake or by design — may contain PHI (HIPAA) or special-category health data (GDPR).

## Rules
1. **Minimise** — the TMF should hold pseudonymised subject data (subject numbers), not names. QC reviewers return
   documents that identify subjects. Recommended: add a "Contains identifiable subject data" reason in QC settings
   (QC reasons are configured per organisation; none is built in for this today).
2. **Access** — study-level access (Pillar 5), per-zone permissions and blinding (Part 14g), CRO access limited to named
   studies with end dates (Part 17). Inspectors see only the Final documents in their session scope.
3. **Logging** — every view, download and print is logged; the audit trail is hash-chained and append-only.
4. **No copies outside the system** — exports are time-limited, logged, and kept in private storage.
5. **AI** — keep AI capabilities off for organisations or studies whose documents may contain PHI unless the AI
   provider's terms (and a BAA where required) cover it.
6. **Email** — notifications never include document content.
7. **Retention** — records are kept per the study retention policy; nothing is purged automatically.
8. **Incidents** — any suspected exposure follows docs/enterprise/incident-response.md.

## Before a client stores PHI
- [ ] BAA signed with the client (US) and with every subprocessor that stores PHI (database provider: *verify*).
- [ ] DPA signed (EU/UK clients), with subprocessors listed (docs/enterprise/vendor-risk-assessment.md).
- [ ] Client informed which document types may contain PHI and how QC handles them.
- [ ] AI settings reviewed for the client's organisation.
