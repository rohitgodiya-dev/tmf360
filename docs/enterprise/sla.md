# Trial360 OS — Service Level Agreement (DRAFT for owner and counsel review)

Status: draft, not in force. Figures marked *verify* depend on our providers' current terms and must be checked
before this is offered to a client.

## 1. Service
Trial360 OS hosted at https://www.trial360os.com: TMF360 (eTMF), the Inspection portal and the APIs they use.

## 2. Availability
| Term | Commitment |
|---|---|
| Monthly availability | 99.5% of minutes in a calendar month, excluding the exclusions in section 6 |
| Measurement | External uptime checks every minute against the sign-in page and an authenticated API health check, published on the status page |
| Service credit | 5% of the monthly fee for each full 0.5% below the commitment, up to 25%; requested within 30 days |

The commitment must not exceed what our hosting (Vercel) and database (Supabase) plans support. *Verify the current
plan SLAs before signing.*

## 3. Support response
| Severity | Definition | First response | Updates |
|---|---|---|---|
| Critical | Service down or data inaccessible for all users of a client | < 4 hours, 24×7 | Every 4 hours until resolved |
| Major | A function is broken and a workaround exists | < 24 hours (business days) | Daily |
| Minor | Cosmetic or low-impact issue, question | < 72 hours (business days) | On resolution |

Support channel: the in-app Ticket panel or the support email address in the contract.

## 4. Maintenance
Planned maintenance is announced at least 72 hours ahead by email and on the status page and is scheduled outside
the client's main working hours where possible. Emergency security fixes may be applied without notice; they are
reported afterwards.

## 5. Data protection and continuity
| Item | Commitment |
|---|---|
| Backups | Daily database backups kept by the database provider (*verify retention on the current plan*); files in private storage |
| Restore | Restore procedure tested at least once a year (restore drill, docs/validation) |
| Retention | Records kept per the study's retention policy (TMF360 Archive & retention); nothing is purged by TMF360 |
| Audit trail | Hash-chained, append-only; verified by the IQ check at each release |

## 6. Exclusions
- Planned maintenance announced as in section 4.
- Outages of third-party services we depend on outside our control (hosting, database, email delivery, AI provider),
  and force majeure. *Counsel to confirm wording: clients may not accept excluding our own hosting providers.*
- Issues caused by the client's configuration, network or users, or by use against the documentation.
- Features marked beta or preview.

## 7. Incidents
Handled under the incident response procedure (docs/enterprise/incident-response.md). Clients are told about a
Critical incident within 4 hours of detection and about a personal-data breach within the time their DPA/BAA requires.
