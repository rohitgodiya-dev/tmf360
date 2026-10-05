import { z } from "zod";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError, idParam } from "@/lib/api/db";
import { handle, notFound, parseBody } from "@/lib/api/http";

const schema = z.object({
  status: z.enum(["open", "in_review", "cancelled"]),
  reason: z.string().trim().min(3).max(2000),
}).strict();

// Moves an oversight activity to review, back to open, or cancels it (with a reason). Completion
// has its own signed endpoint. Audited by the database with the reason.
export const POST = handle(async (req: Request, { params }: { params: Promise<{ activityId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "run_quality_checks");
  const id = idParam((await params).activityId);
  const body = await parseBody(req, schema);
  const { data, error } = await ctx.db.from("oversight_activities").update({
    status: body.status, change_reason: body.reason, cancel_reason: body.status === "cancelled" ? body.reason : null,
  }).eq("id", id).select("id, status").maybeSingle();
  if (error) throw dbError(error);
  if (!data) throw notFound();
  return Response.json(data);
});
