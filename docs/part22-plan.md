# Part 22 — Required fields per document type, unsaved-changes guard, reviewer annotations

Baseline gaps closed: **RM-06** (per-record-type required and type-specific fields), **IDX-08** (unsaved-changes
guard), **VWR-03** (reviewer annotations). Migration `20261112000001_part22_fields_annotations`.

## Decisions

- **D66 Field rules are per organisation and artifact.** `artifact_field_rules` lists required standard fields
  (title, version, effective date, expiry date, owner, country, site) and up to 20 extra fields (text, date, number,
  list; each optionally required). Edited in TMF Configuration by administrators and TMF leads with a reason; audited.
- **D67 Enforced in the database at the two gates.** `file_intake_item()` refuses an intake item with gaps, and the
  `documents_required_fields_guard` trigger refuses the move to Under Review (any channel). `metadata_gaps()` is the
  single rule. Documents already in QC or Final are not changed by a new rule.
- **D68 Extra values live in `custom_metadata` (jsonb)** on intake items and documents, copied at filing. Final
  documents freeze them (post-filing guard) and every change is snapshotted with the other metadata (Pillar 3).
  Draft values are edited in the viewer's Fields tab with a reason (audited).
- **D69 Unsaved-changes guard** (`lib/unsaved.ts`): forms register while dirty; the browser warns on close/reload,
  and switching panels asks "Keep editing / Discard and leave". Used by Document Intake, field rules and the viewer.
- **D70 Annotations are notes, not file changes.** `document_annotations` pins a note to page + relative x/y of the
  file version it was made on. Reviewers (review_document) add notes; the author or a reviewer resolves them; nothing
  is deleted; both actions are audited. Visibility follows the documents read policy (study access, zone permissions,
  blinding). Inspection Mode does not show annotations.

## Verification
- `tests/integration/fields-annotations.test.ts` (rules, value types, filing and submit gates, snapshots, annotations
  visibility, no direct writes, resolve, audit).
- `tests/e2e/fields-annotations.mjs` (rule from TMF Configuration, intake enforcement, unsaved guard, filing, pinned
  note in the viewer, resolve, Fields tab).

## Also fixed
Document Intake reloaded the list after an upload and overwrote edits the user had already started (race). A reload
now keeps a draft unless the item changed on the server.
