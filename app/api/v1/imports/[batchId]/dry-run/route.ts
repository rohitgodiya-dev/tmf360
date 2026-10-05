import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError } from "@/lib/api/db";
import { handle } from "@/lib/api/http";
import { loadBatch } from "@/lib/api/imports";

// MIG-03/04: applies the mappings and produces the pre-import report; failing items enter the
// exception queue with their reasons. Nothing is filed.
export const POST = handle(async (req: Request, { params }: { params: Promise<{ batchId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "invite_users");
  const b = await loadBatch(ctx, (await params).batchId);
  const { data, error } = await ctx.db.rpc("run_import_dry_run", { p_batch: b.id });
  if (error) throw dbError(error);
  return Response.json({ report: data });
});
