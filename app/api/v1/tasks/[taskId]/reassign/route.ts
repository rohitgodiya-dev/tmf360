import { z } from "zod";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError, idParam, reason } from "@/lib/api/db";
import { handle, parseBody } from "@/lib/api/http";
import { ROLES } from "@/lib/permissions";

const schema = z.object({
  user_id: z.string().uuid().nullable().default(null),
  role: z.enum(ROLES).nullable().default(null),
  reason,
}).strict().refine((b) => (b.user_id === null) !== (b.role === null), { message: "Choose either a person or a role" });

// Reassign an open QC task (WFL-05). The database checks the new assignee can approve and audits the change.
export const POST = handle(async (req: Request, { params }: { params: Promise<{ taskId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "approve_document");
  const id = idParam((await params).taskId);
  const body = await parseBody(req, schema);
  const { error } = await ctx.db.rpc("reassign_qc_task", { p_task: id, p_user: body.user_id, p_role: body.role, p_reason: body.reason });
  if (error) throw dbError(error);
  return Response.json({ id, assignee_user: body.user_id, assignee_role: body.role });
});
