# eTMF Exchange Mechanism Standard (eTMF-EMS) — reference copies

Used by Part 14h (MIG-09) to build and validate TMF exchange packages.

| File | Source | Retrieved |
|---|---|---|
| TmfReferenceModelExchange.xsd | https://github.com/TmfRef/exchange-framework (branch `develop`) | 2026-10-05 |
| example.xml | same repository | 2026-10-05 |

Specification text: eTMF-EMS Specification v1.0 (https://tmfrefmodel.com/ems). Later revisions (v1.0.1,
v1.0.2) are listed there; check them for changes before claiming conformance to a specific revision.

Notes on how TMF360 applies it:
- `INTEGRITY` uses the Subresource Integrity form `sha256-<base64>` (spec 5.3.3). The XSD has no
  `CHKSUMSTD` element, so the algorithm is carried in the INTEGRITY prefix. On import, `sha256/384/512`
  with base64 or hex digests are accepted.
- The XSD requires `AUDITEVENT` (the spec text marks it optional); exports always include it.
- Dates are `DD-MON-YYYY`; timestamps are UTC ISO 8601 with `+00:00`.
- Integration tests validate generated `exchange.xml` against this XSD.
