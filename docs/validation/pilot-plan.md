# Pilot plan (draft; partner and study to be chosen: decision D-08)

| | |
|---|---|
| Goal | Run one real study's TMF in TMF360 production for 8 weeks, including a migration, and sign the user acceptance test |
| Partner | **Owner action:** choose a sponsor or CRO with an active study and a legacy TMF to migrate |
| Users | TMF lead, 2 CTAs/CRAs, 1 QA reviewer, 1 site contact (read), 1 mock inspector |
| Environment | Production (trial360os.com), a dedicated organisation for the pilot |

## Weeks
1. **Set-up:**
   - Create the organisation, users and roles, and the study structure (countries, sites, contacts, milestones).
   - Set the retention policy.
   - Decide the AI switches; keep them off unless evaluated.
2. **Migration:**
   - Build the mapping table with the partner.
   - Import in batches.
   - Reconcile to 100 % by hash, then sign acceptance (PQ-9).
3–6. **Live use:**
   - Daily filing through Document Intake.
   - QC with both stages.
   - Expected documents from the eTMF plan.
   - Weekly TMF Health review and oversight activities.
   - Monthly reports.
7. **Mock inspection:** an inspection session with the scope agreed in advance, a request queue, and the
   activity log export (PQ-7).
8. **Close-out:**
   - Archive package rehearsal on a copy study (PQ-11).
   - Restore drill (PQ-12).
   - User acceptance test sign-off.
   - Write the validation summary.

## Success measures
- 100 % of migrated documents reconciled by hash, every exception resolved or justified
- Completeness and health figures match manual counts
- No unresolved critical deviations
- Users complete their tasks without workarounds (survey and observed sessions)

## Known gaps to agree with the partner before start (from `coverage-notes.csv`)
- Not built: intake email, signposts, document links, bulk indexing, blinded documents and per-zone
  permissions, SSO/MFA, taxonomy version migration.
- Agree for each gap: either the pilot does not need it, or there is a workaround.
