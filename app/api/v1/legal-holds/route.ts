import { z } from "zod";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError } from "@/lib/api/db";
import { handle, parseBody } from "@/lib/api/http";

const schema = z.object({
  scope: z.enum(["tenant", "study", "document"]),
  study_id: z.string().uuid().optional(),
  document_id: z.string().uuid().optional(),
  reason: z.string().trim().min(3).max(2000),
  reference: z.string().trim().max(200).optional(),
}).strict().refine((b) => (b.scope !== "study" || !!b.study_id) && (b.scope !== "document" || !!b.document_id), { message: "Choose what the hold covers" });

// Places a legal hold (RET-02) on the whole organisation, a study or one document. Held documents
// cannot be deleted. Audited by the database function.
export const POST = handle(async (req: Request) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "run_quality_checks");
  const b = await parseBody(req, schema);
  const { data: id, error } = await ctx.db.rpc("place_legal_hold", {
    p_scope: b.scope, p_study: b.study_id ?? null, p_document: b.document_id ?? null, p_reason: b.reason, p_reference: b.reference ?? null,
  });
  if (error) throw dbError(error);
  return Response.json({ id }, { status: 201 });
});
