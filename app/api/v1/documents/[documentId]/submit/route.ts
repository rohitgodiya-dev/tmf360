import { z } from "zod";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError, idParam } from "@/lib/api/db";
import { handle, parseBody } from "@/lib/api/http";

const schema = z.object({ comment: z.string().trim().max(2000).optional() }).strict();

// Submit for QC (WFL-03): Draft → Under Review and the first File Plan task. The database
// checks the permission again, writes the audit entry and picks the reviewer (QC-04).
export const POST = handle(async (req: Request, { params }: { params: Promise<{ documentId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "submit_document");
  const id = idParam((await params).documentId);
  const body = await parseBody(req, schema);
  const { data: taskId, error } = await ctx.db.rpc("submit_for_qc", { p_document: id, p_comment: body.comment ?? null });
  if (error) throw dbError(error);
  return Response.json({ id, status: "Under Review", task_id: taskId });
});
