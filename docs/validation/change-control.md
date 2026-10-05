# Change control (draft)

Applies to code, database migrations and validated configuration. Validated configuration covers taxonomy
packages, the file plan, QC reasons, health thresholds, risk weights, AI switches and models, retention
policies and the signature/attestation matrix.

## Code and database changes
1. **Plan:** `docs/partN-plan.md` lists what changes and why. Decisions are numbered (D-nn).
2. **Build on DEV first:** migrations are applied to the DEV project; integration and e2e tests are added or updated.
   Each new guard gets a mutation check.
3. **Verify:** `npm run build` with zero type errors, the pre-commit checks, the full integration suite, and the
   affected e2e scripts.
4. **Production database:**
   - Dry run inside `begin … rollback`. It must not write audited rows, so the audit sequence is unchanged.
   - Apply.
   - Verify (object counts, IQ subset).
5. **Release:** one squashed commit per part, with a message that lists requirements, decisions and tests.
   Pushing `main` deploys. Then confirm the deploy (probe a new route for 401) and run the page health check.
6. **Record:** the commit is the change record. Material changes are re-run through OQ.

## Configuration changes
Every validated setting change needs a reason and is written to the audit trail by the database. The Feature
Management report lists them for review. A change that alters system behaviour needs a short impact
assessment before it is made in production and a check after. Examples:
- switching on an AI capability or changing `TMF_AI_MODEL`
- changing risk weights
- changing the taxonomy

## Emergency changes
These may be released before review if production is impaired. They are reviewed within 5 working days, with
the same evidence as a normal change.
