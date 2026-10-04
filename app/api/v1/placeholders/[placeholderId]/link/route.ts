import { z } from "zod";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError, idParam, reason } from "@/lib/api/db";
import { handle, parseBody } from "@/lib/api/http";

const schema = z.object({ document_id: z.string().uuid().nullable(), reason }).strict();

// Manual fulfilment override (PLC-05): link a filed document to the placeholder, or unlink
// (document_id null). Audited with the reason by the database.
export const POST = handle(async (req: Request, { params }: { params: Promise<{ placeholderId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "edit_study");
  const id = idParam((await params).placeholderId);
  const body = await parseBody(req, schema);
  const { error } = await ctx.db.rpc("link_placeholder", { p_placeholder: id, p_document: body.document_id, p_reason: body.reason });
  if (error) throw dbError(error);
  return Response.json({ id, document_id: body.document_id, status: body.document_id ? "fulfilled" : "open" });
});
