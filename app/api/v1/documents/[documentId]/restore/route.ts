import { z } from "zod";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError, idParam, reason } from "@/lib/api/db";
import { handle, parseBody } from "@/lib/api/http";

const schema = z.object({ reason }).strict();

// Restores a document from the Recycle Bin within 180 days of deletion (OPS-03). A document that
// was in QC comes back as Draft.
export const POST = handle(async (req: Request, { params }: { params: Promise<{ documentId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "delete_document");
  const id = idParam((await params).documentId);
  const body = await parseBody(req, schema);
  const { data, error } = await ctx.db.rpc("restore_document", { p_document: id, p_reason: body.reason });
  if (error) throw dbError(error);
  return Response.json({ id, status: data });
});
