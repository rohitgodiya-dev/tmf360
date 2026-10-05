import { z } from "zod";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError, idParam, reason } from "@/lib/api/db";
import { handle, parseBody } from "@/lib/api/http";

const schema = z.object({ reason }).strict();

// Accept an open finding with a reason (e.g. justified deviation). It stays visible as accepted and
// resolves by itself if the condition clears. Audited by the database.
export const POST = handle(async (req: Request, { params }: { params: Promise<{ findingId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "run_quality_checks");
  const id = idParam((await params).findingId);
  const body = await parseBody(req, schema);
  const { error } = await ctx.db.rpc("accept_finding", { p_finding: id, p_reason: body.reason });
  if (error) throw dbError(error);
  return Response.json({ id, status: "accepted" });
});
