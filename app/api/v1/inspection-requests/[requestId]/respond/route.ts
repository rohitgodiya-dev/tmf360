import { z } from "zod";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError, idParam } from "@/lib/api/db";
import { handle, parseBody } from "@/lib/api/http";

const schema = z.object({
  response: z.string().trim().min(2, "Write a response").max(4000),
  document_id: z.string().uuid().optional(),
  extend_scope: z.boolean().default(false),
  close: z.boolean().default(false),
}).strict();

// The study team answers an inspector request (INS-07); an attached document can extend the scope.
export const POST = handle(async (req: Request, { params }: { params: Promise<{ requestId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "upload_document");
  const id = idParam((await params).requestId);
  const body = await parseBody(req, schema);
  const { error } = await ctx.db.rpc("respond_inspection_request", {
    p_request: id, p_response: body.response, p_document: body.document_id ?? null, p_extend_scope: body.extend_scope, p_close: body.close,
  });
  if (error) throw dbError(error);
  return Response.json({ ok: true });
});
