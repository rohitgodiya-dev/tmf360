# TMF360 API v1 conventions

New server logic goes in route handlers under `app/api/v1/`. The browser calls them with
`apiFetch` from `lib/api/client.ts`; it does not write to new tables directly.

## Request handling

```ts
import { requireUser, requirePermission } from "@/lib/api/auth";
import { handle, parseBody, notFound } from "@/lib/api/http";
import { writeAudit } from "@/lib/api/audit";

export const POST = handle(async (req: Request) => {
  const ctx = await requireUser(req);            // 401 / 403 handled for you
  requirePermission(ctx, "edit_study");         // role check (lib/permissions.ts)
  const body = await parseBody(req, schema);    // zod schema; 400 with field details
  const { data, error } = await ctx.db.from("...").insert([...]).select().single();
  if (error) throw error;                       // becomes a generic 500, never leaks SQL
  await writeAudit(ctx, { action: "...", reason: body.reason });
  return Response.json(data, { status: 201 });
});
```

## Rules

| Rule | Why |
|---|---|
| Query through `ctx.db`, which acts as the signed-in user. Never use a service-role key in a request path. | Row-level security stays the final gatekeeper (AZB). |
| API checks (`requirePermission`) are added on top of RLS, never instead of it. | Defence in depth. |
| Errors are `{ error: { code, message, details? } }` with codes `unauthenticated`, `forbidden`, `not_found`, `invalid_request`, `conflict`, `internal`. | One error model for every client (Plan §13). |
| Return `not_found` for records the user may not see; never a distinct "forbidden". | Do not reveal that a record exists (AZB-07). |
| Every change to GxP data is audited. The study-structure and directory tables (Part 2b) audit themselves with database triggers (before/after values, `change_reason`); don't also call `writeAudit` for them. Elsewhere call `writeAudit`; if it fails, the request fails. | REG-01. |
| `org_id`, `created_*`, `updated_*` and `row_version` are set by the database. Clients never send them. | Tenancy cannot be chosen by the client. |
| Updates send the `row_version` the client last saw (`updateVersioned`); a mismatch returns 409. | No silent overwrites. |
| Role permissions live in `lib/permissions.ts` **and** the `role_permissions` table; change both in the same migration (a test checks they match). | RLS and the API enforce the same matrix. |
| No hard deletes. Use soft-delete columns. | DI-06. |
| Route params are a Promise in this Next.js version: `const { id } = await ctx.params`. | Next.js 16. |

## Tests

- `npm test` runs unit tests (`tests/unit`).
- `npm run test:integration` runs against the **dev** Supabase project only (`tests/integration`,
  credentials in git-ignored `.env.dev`; the setup refuses any other project).
- Every new endpoint gets integration tests for: no token (401), another org (404/empty), and the happy path.
- Security tests must use real data. An empty table or bucket makes "cannot see it" pass vacuously.

## Taxonomy (TMF Reference Model)

- `lib/taxonomy/tmf-rm-<version>.json` is the single source of the model in code; the `taxonomy_*` tables hold the same data (read-only for users). A test fails if they differ.
- Key on the artifact's permanent **unique ID** (`taxonomy_artifacts.unique_id` / `taxonomy_artifact_id`), not the artifact number — numbers can change between model versions.
- Changing the model = new JSON + migration generated with `node scripts/generate-taxonomy-migration.mjs` (change control). Never edit taxonomy rows by hand.
- Per-study settings live in `tmf_config` (seeded by `seed_study_tmf_config`); disable rather than delete, with a reason — changes are audited.
