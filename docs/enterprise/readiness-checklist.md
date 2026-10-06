# Enterprise readiness checklist (owner actions)

Code items of the Enterprise Development Plan v1.0 are Parts 15–20 (docs/part15-20-plan.md). The items below need
the system owner, counsel or a provider and cannot be done in code. Tick and date each one.

Checklist reviewed and accepted by the owner on 2026-10-06; billing (Stripe) deferred.

| # | Item | Who | Status | Notes |
|---|---|---|---|---|
| 1 | Release Parts 14–20 to production (dry runs, migrations, IQ check, deploy) | Owner + Claude | ✅ 2026-10-06 | IQ 146/146 PASS on PROD; commits d8b3111, 8017e61 |
| 2 | Sign the validation plan, IQ/OQ/PQ protocol and reports (docs/validation) | Owner + client QA | ⬜ | Traceability now includes ENT-01..13 |
| 3 | Restore drill from backup, recorded | Owner | ⬜ | Required by PQ and the SLA |
| 4 | SLA reviewed and finalised (docs/enterprise/sla.md) | Owner + counsel | ⬜ | Check provider SLAs first |
| 5 | Supabase BAA: confirm availability on our plan and sign | Owner | ⬜ | Before any US PHI |
| 6 | Trial360 BAA template | Counsel | ⬜ | |
| 7 | DPA template with subprocessor list (GDPR) | Counsel | ⬜ | Use vendor-risk-assessment.md |
| 8 | Privacy policy published on trial360os.com | Owner + counsel | ⬜ | |
| 9 | Vendor risk assessment rows verified and filed | Owner | ⬜ | docs/enterprise/vendor-risk-assessment.md |
| 10 | Incident response contacts filled in, procedure approved | Owner | ⬜ | docs/enterprise/incident-response.md |
| 11 | SOC 2 gap assessment (e.g. Vanta) | Owner | ⬜ | Use controls in this repo as evidence |
| 12 | Status page with uptime monitoring | Owner | ⬜ | Needed to measure the SLA |
| 13 | Third-party penetration test | Owner + tester | ⬜ | Scope: app, API, inspection portal |
| 14 | Security training record for everyone with access | Owner | ⬜ | |
| 15 | Billing (Stripe) — pricing and plans decided | Owner | Deferred | Set up later (owner decision 2026-10-06); not needed for the first client |
| 16 | First client onboarding plan (bulk import, CRO access, training) | Owner | ⬜ | Parts 17 and 20 support this |
