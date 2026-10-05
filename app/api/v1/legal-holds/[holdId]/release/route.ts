import { z } from "zod";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError, idParam, reason } from "@/lib/api/db";
import { handle, parseBody } from "@/lib/api/http";

const schema = z.object({ reason }).strict();

// Releases a legal hold with a reason (RET-02); the hold row and the audit trail keep the history.
export const POST = handle(async (req: Request, { params }: { params: Promise<{ holdId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "run_quality_checks");
  const id = idParam((await params).holdId);
  const body = await parseBody(req, schema);
  const { error } = await ctx.db.rpc("release_legal_hold", { p_hold: id, p_reason: body.reason });
  if (error) throw dbError(error);
  return Response.json({ ok: true });
});
