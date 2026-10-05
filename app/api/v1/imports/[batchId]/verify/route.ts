import { requirePermission, requireUser } from "@/lib/api/auth";
import { handle, invalidRequest } from "@/lib/api/http";
import { loadBatch, verifyItems } from "@/lib/api/imports";

export const maxDuration = 300;

// Server re-hash of up to 100 pending staged files per call; the page repeats until none remain.
export const POST = handle(async (req: Request, { params }: { params: Promise<{ batchId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "invite_users");
  const b = await loadBatch(ctx, (await params).batchId);
  if (b.status === "filed" || b.status === "cancelled") throw invalidRequest(`This batch is ${b.status}`);
  return Response.json(await verifyItems(b));
});
