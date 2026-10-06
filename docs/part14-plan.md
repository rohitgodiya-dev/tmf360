# Part 14: Remaining Baseline gaps

The user asked for the main "Not built" items from `docs/validation/coverage-notes.csv` (2026-10-05).

| Sub-part | Gap | Baseline IDs | Migration |
|---|---|---|---|
| 14a | Full-text search inside documents | NAV-09 | 20261029000001 |
| 14b | Document links and signposts | LNK-01..03, SGN-01..02, STG-07, VWR-05 | 20261030000001 |
| 14c | Bulk indexing | IDX-02, STG-09 | 20261031000001 |
| 14d | Two-factor login (TOTP) and SSO sign-in | PLT-01 | 20261101000001 |
| 14e | Intake email per study + sender allow-list | STG-02, STG-03 | 20261102000001 |
| 14f | Taxonomy version mappings and guided study migration | RM-04, RM-05 | 20261103000001 |
| 14g | Per-zone content permissions and blinded documents | USR-05, USR-06, REG-07 | 20261104000001 |
| 14h | TMF RM Exchange Mechanism export/import | MIG-09 | 20261105000001 |

## Decisions

**D49 (14a): Text index.** Text is extracted on the server from the current file of every document and
stored in `document_text`, with a `tsvector`. This uses pdf.js for PDFs, plain text for .txt/.csv, and
document.xml for .docx. Search runs through a security-definer function. That function returns only
documents the caller can read, and the scope rules are the same as for the documents table. Scanned
PDFs without a text layer are reported as "no text", not indexed by OCR.

**D50 (14d): Two-factor login and SSO.** Two-factor login uses Supabase Auth TOTP. Users enrol in My
profile, and an organisation can require it. When it is required, the API accepts only sessions at
assurance level AAL2. SSO sign-in uses `signInWithSSO` by email domain. It works once the
organisation's identity provider is registered in Supabase (Pro plan) — an owner action.

**D51 (14e): Intake email.** Each study gets an address `<alias>@<inbound domain>`. A signed webhook from
the mail provider delivers each message to `/api/inbound/email`. Attachments become intake items with
sender, subject and received date. Unknown senders are refused, and the refusal is logged; replies need
an outbound email. Routing the domain's mail to the provider is an owner action.

**D52 (14g): Content permissions.** A grant gives a user a level on a zone of a study:

| Level | Read | Contribute | Blinded documents |
|---|---|---|---|
| None | No | No | No |
| Read-only | Yes | No | No |
| Contribute | Yes | Yes | No |
| Unblinded Contribute | Yes | Yes | Yes |

A study with no grants keeps today's behaviour, so nothing changes until grants are added. Blinded
documents are hidden from anyone without Unblinded Contribute. Granting Unblinded Contribute needs a
second approver and is audited. The rules are enforced in the documents RLS helper, so every channel
inherits them.
