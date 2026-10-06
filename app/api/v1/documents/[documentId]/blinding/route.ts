import { z } from "zod";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError, idParam, reason } from "@/lib/api/db";
import { handle, parseBody } from "@/lib/api/http";

const schema = z.object({ blinded: z.boolean(), reason }).strict();

// REG-07: marks a document blinded (visible only with Unblinded Contribute on its zone) or unblinded.
// Only a user with Unblinded Contribute on the zone can change it; audited with the reason.
export const POST = handle(async (req: Request, { params }: { params: Promise<{ documentId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "view_document");
  const id = idParam((await params).documentId);
  const b = await parseBody(req, schema);
  const { error } = await ctx.db.rpc("set_document_blinding", { p_document: id, p_blinded: b.blinded, p_reason: b.reason });
  if (error) throw dbError(error);
  return Response.json({ blinded: b.blinded });
});
