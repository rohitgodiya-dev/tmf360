# Part 12: AI as recommendations + migration/import

Baseline: M17 AI assistance (AI-01..07) and M18 Migration and interoperability (MIG-01..10).

| Sub-part | Scope | Migration |
|---|---|---|
| 12a | AI capabilities behind per-organisation switches, every output a recommendation record | 20261026000001 |
| 12b | Migration: isolated import batches, mapping workspace, dry run, exceptions, reconciliation, signed acceptance, provenance | 20261027000001 |

## Decisions (taken autonomously; the user said "complete building other parts")

**D38: Server-side AI only.** The browser no longer sends PDFs to an AI route. `/api/v1/.../intake/:id/ai`
reads the stored file as the user, calls the model and stores the result with the service role.
Users can read recommendations but cannot write or alter them; a trigger makes their content
immutable and blocks deletion.

**D39: Switches (AI-07).** Five capabilities, each with its own switch:
- classification
- metadata extraction
- pre-QC checks
- duplicate detection
- summary

Classification defaults to on, because it existed before. The others default to off. Only roles with
`manage_roles` change a switch, with a reason (audited). With everything off, the full workflow still
works (business rule).

**D40: Provenance (AI-06).** Each recommendation stores:
- model and model version (from the API response) and prompt version
- configuration
- confidence
- evidence pointers (page plus quote, or field)
- the decision: accepted, modified, rejected or noted, with who and when

Decisions are taken explicitly (Dismiss) or settled automatically at filing. Settlement compares the
AI suggestion with what the person actually filed. A suggestion filed as given is "accepted"; a
different value is "modified"; a flag that was not dismissed is "noted".

**D41: Model.** The model is `claude-opus-5-5` (override with `TMF_AI_MODEL`), using structured outputs (zod schema) at
low effort. Classification may only return record types that exist in the study's taxonomy
configuration; anything else is discarded. Dates that are not ISO are dropped, never guessed.
Refusals and unusable answers surface as a message. AI never blocks filing.

**D42: Duplicate detection without a model.** Duplicates are found from the text: pdf.js extracts the
text and word 5-shingles are compared by Jaccard similarity (threshold 0.6). The comparison covers up
to 25 Final documents of the same record type. This makes the result deterministic and free, and
`model_version` records the method.

**D43 (12b): Staging inside TMF360, never in the live TMF.** Import files are uploaded to a staging path
and registered as `import_items` of an `import_batch`. Nothing becomes a document until the batch
has been dry-run and reconciled (every file re-hashed by the server against its declared hash), and
the batch is accepted with an electronic signature ("Import reconciled and accepted"). Filing then
goes through a database function using the same rules as normal filing: taxonomy checks, metadata
snapshot, file versions and duplicate checks. Imported records keep their source system, source ID,
original dates and version as provenance.

**D44 (12b): Mapping.** Source values (document type, status, site, country, owner) are mapped to
target values (artifact number, TMF status, study site/country) in `import_mappings`. Mappings belong
to the organisation and are reused across batches.

**D45 (12b): Scope cuts.** Two items are recorded as not built:
- TMF RM Exchange Mechanism Standard import/export
- a separate public system-to-system API

Both are Should-level, and the standard needs a counterpart to validate against. The existing
`/api/v1` intake API (bearer token, server re-hash) is the documented route for system ingestion.
