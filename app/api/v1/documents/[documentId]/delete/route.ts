import { z } from "zod";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError, idParam } from "@/lib/api/db";
import { handle, parseBody } from "@/lib/api/http";

const deletionCode = z.enum(["incorrectly_indexed", "not_tmf_relevant", "other"]);
const schema = z.object({ code: deletionCode, comment: z.string().trim().min(3, "Add a comment explaining the deletion").max(2000) }).strict();

// Moves a document that is not Final to the Recycle Bin (OPS-01): coded reason + comment. The
// database checks the permission, refuses Final documents (they need a deletion request),
// stamps who and when, and audits it.
export const POST = handle(async (req: Request, { params }: { params: Promise<{ documentId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "delete_document");
  const id = idParam((await params).documentId);
  const body = await parseBody(req, schema);
  const { error } = await ctx.db.rpc("delete_document", { p_document: id, p_code: body.code, p_comment: body.comment });
  if (error) throw dbError(error);
  return Response.json({ id, status: "Deleted" });
});
