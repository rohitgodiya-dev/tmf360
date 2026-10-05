import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError } from "@/lib/api/db";
import { handle } from "@/lib/api/http";
import { loadBatch } from "@/lib/api/imports";

// MIG-05: source vs target counts and server hashes, item by item; every difference must be explained
// (fixed or excluded with a reason) before the batch can be accepted.
export const POST = handle(async (req: Request, { params }: { params: Promise<{ batchId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "invite_users");
  const b = await loadBatch(ctx, (await params).batchId);
  const { data, error } = await ctx.db.rpc("reconcile_import", { p_batch: b.id });
  if (error) throw dbError(error);
  return Response.json({ reconciliation: data });
});
