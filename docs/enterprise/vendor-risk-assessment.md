# Vendor (subprocessor) risk assessment (DRAFT)

Trial360 OS relies on the providers below. For each, the owner confirms the items marked *verify* from the provider's
current documentation (trust centre, DPA, BAA) and records the date checked. Re-assess yearly and when a provider or plan changes.

| Provider | Service | Data it holds or sees | Key risks | Controls in Trial360 | To verify and file |
|---|---|---|---|---|---|
| Supabase | Postgres database, auth, file storage | All TMF records, files, audit trail, user accounts | Breach, data loss, region, provider staff access | RLS on every table, study-level access, private storage buckets, hash-chained audit trail, file hashes (Pillars 1–6), IQ check each release | SOC 2 report; DPA signed; BAA available on our plan and signed (*verify*); data region; backup retention and point-in-time recovery on our plan |
| Vercel | Hosting of the web app and API | Requests and responses in transit; logs | Outage, misconfiguration, log exposure | No secrets in client code; service-role key only on the server; security headers | SOC 2 report; DPA; log retention; region |
| Resend | Transactional email | Recipient addresses, notification text (no documents) | Misdelivery, phishing look-alikes | Emails contain no document content; links require sign-in; invitation tokens single-use and hashed | DPA; sending-domain authentication (SPF, DKIM, DMARC) |
| Anthropic | AI recommendations (Part 12, opt-in per organisation) | Document text sent for classification/extraction when the feature is on | Data use, retention | Off by default per capability; server-side only; every output recorded with provenance; inspectors never use AI | Commercial terms on data use and retention; DPA; whether a BAA is needed if PHI could be sent |
| GitHub | Source code | Code only (no client data) | Code tampering | Protected main branch, pushes deploy only after build and tests | Account 2FA; branch protection |

## Decision
Each provider is accepted when its row is verified and filed. An unverified row is an open risk in the validation
summary and must be closed before the first regulated client goes live.
