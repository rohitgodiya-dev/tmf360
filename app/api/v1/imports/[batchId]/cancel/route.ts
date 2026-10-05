import { z } from "zod";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError, reason } from "@/lib/api/db";
import { handle, invalidRequest, parseBody } from "@/lib/api/http";
import { loadBatch } from "@/lib/api/imports";

const schema = z.object({ reason }).strict();

// Abandons a batch that was never accepted; its staged items stay as the record of what was tried.
export const POST = handle(async (req: Request, { params }: { params: Promise<{ batchId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "invite_users");
  const b = await loadBatch(ctx, (await params).batchId);
  if (b.status === "filed" || b.status === "cancelled") throw invalidRequest(`This batch is already ${b.status}`);
  const { reason: why } = await parseBody(req, schema);
  const { error } = await ctx.db.from("import_batches").update({ status: "cancelled", cancel_reason: why, change_reason: why }).eq("id", b.id);
  if (error) throw dbError(error);
  return Response.json({ ok: true });
});
