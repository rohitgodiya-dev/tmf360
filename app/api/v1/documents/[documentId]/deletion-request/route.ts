import { z } from "zod";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError, idParam } from "@/lib/api/db";
import { handle, parseBody } from "@/lib/api/http";

const schema = z.object({
  code: z.enum(["incorrectly_indexed", "not_tmf_relevant", "other"]),
  comment: z.string().trim().min(3, "Add a comment explaining the deletion").max(2000),
}).strict();

// Request deletion of a Final document (OPS-02). Another administrator approves it with an
// electronic signature in the Recycle Bin's "Deletion requests".
export const POST = handle(async (req: Request, { params }: { params: Promise<{ documentId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "upload_document");
  const id = idParam((await params).documentId);
  const body = await parseBody(req, schema);
  const { data, error } = await ctx.db.rpc("request_deletion", { p_document: id, p_code: body.code, p_comment: body.comment });
  if (error) throw dbError(error);
  return Response.json({ id: data, document_id: id, status: "pending" }, { status: 201 });
});
