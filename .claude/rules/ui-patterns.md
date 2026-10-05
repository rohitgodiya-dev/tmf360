---
paths:
  - "app/**/*.tsx"
---

# UI rules (details: .claude/skills/trial360-page-builder)

DO
- Inline styles only (`style={{ }}`); Tabler icons `ti ti-*` are the only className allowed.
- Colour tokens from a local `C` object at the top of the component.
- A "What happens next:" line before every consequential action; a reason field where the action is audited.
- Loading, empty and error states on every panel. Inline validation; disable the submit button until valid.
- New TMF360 panels as their own component files in `app/platform/` (page.tsx is already very large).

DO NOT
- `window.confirm()` / `alert()` / `prompt()` — build the confirmation into the page.
- `console.log` in shipped code.
- Untyped state.
