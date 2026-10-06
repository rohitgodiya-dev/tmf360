import { z } from "zod";
import { requirePermission, requireUser, type RequestContext } from "@/lib/api/auth";
import { TEMPLATES, commitImport, templateCsv, validateSites, validateStudies, type Kind } from "@/lib/api/bulkimport";
import { handle, invalidRequest, notFound, parseBody } from "@/lib/api/http";

type Params = { params: Promise<{ kind: string }> };
const kindOf = async (params: Params["params"]): Promise<Kind> => {
  const k = (await params).kind;
  if (k !== "studies" && k !== "sites") throw notFound();
  return k;
};
const authorise = (ctx: RequestContext, kind: Kind) => {
  if (kind === "studies") { requirePermission(ctx, "create_study"); requirePermission(ctx, "invite_users"); }
  else { requirePermission(ctx, "edit_study"); requirePermission(ctx, "manage_directory"); }
};

// The CSV template: column headers and one example row (Part 20).
export const GET = handle(async (req: Request, { params }: Params) => {
  const ctx = await requireUser(req);
  const kind = await kindOf(params);
  authorise(ctx, kind);
  return new Response(templateCsv(kind), { headers: {
    "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="trial360-${kind}-template.csv"`,
  } });
});

const schema = z.object({
  rows: z.array(z.record(z.string(), z.string().max(5000))).min(1, "The file has no data rows").max(1000),
  commit: z.boolean().default(false),
});

// Dry run (commit: false) validates every row and reports errors by line; commit: true imports all rows or none,
// and only when the dry run is clean.
export const POST = handle(async (req: Request, { params }: Params) => {
  const ctx = await requireUser(req);
  const kind = await kindOf(params);
  authorise(ctx, kind);
  const body = await parseBody(req, schema);
  const v = kind === "studies" ? await validateStudies(ctx, body.rows) : await validateSites(ctx, body.rows);
  const result = { kind, columns: TEMPLATES[kind].columns, valid: v.errors.length === 0, row_count: v.rows.length, ...v };
  if (!body.commit) return Response.json(result);
  if (v.errors.length) throw invalidRequest("Fix the errors in the file before importing", { errors: v.errors });
  const imported = await commitImport(ctx, kind, v.rows);
  return Response.json({ ...result, imported }, { status: 201 });
});
