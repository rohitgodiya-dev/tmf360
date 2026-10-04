import { requirePermission, requireUser } from "@/lib/api/auth";
import { loadStudy } from "@/lib/api/db";
import { handle, parseBody } from "@/lib/api/http";
import { querySchema, runNavigatorQuery } from "@/lib/api/navigator";

// Navigator grid (M04): one page of documents and missing artifacts, plus the five tile counts.
// POST because the filter set (chips, rules, sort) is structured; it changes nothing.
export const POST = handle(async (req: Request, { params }: { params: Promise<{ studyId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "view_document");
  const study = await loadStudy(ctx, (await params).studyId);
  const query = await parseBody(req, querySchema);
  return Response.json(await runNavigatorQuery(ctx.db, study, query));
});
