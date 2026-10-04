import { z } from "zod";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError, idParam, reason } from "@/lib/api/db";
import { handle, parseBody } from "@/lib/api/http";

const schema = z.object({ reason }).strict();

// Returns a Draft or Under Review document to its owner for rework (e.g. a flag raised in
// Trinity). Any open QC task is cancelled with the reason; the database audits it.
export const POST = handle(async (req: Request, { params }: { params: Promise<{ documentId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "reject_document");
  const id = idParam((await params).documentId);
  const body = await parseBody(req, schema);
  const { error } = await ctx.db.rpc("return_for_rework", { p_document: id, p_reason: body.reason });
  if (error) throw dbError(error);
  return Response.json({ id, status: "Draft" });
});
