import { z } from "zod";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError, idParam, reason } from "@/lib/api/db";
import { handle, parseBody } from "@/lib/api/http";

const schema = z.object({
  action: z.enum(["revoke", "set_end"]),
  ends_at: z.string().datetime({ offset: true }).optional(),
  reason,
}).strict();

// Ends a session now, or moves its end time (which also unlocks it). Audited by the database.
export const POST = handle(async (req: Request, { params }: { params: Promise<{ sessionId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "invite_users");
  const id = idParam((await params).sessionId);
  const body = await parseBody(req, schema);
  const { error } = await ctx.db.rpc("change_inspection_session", { p_session: id, p_action: body.action, p_ends_at: body.ends_at ?? null, p_reason: body.reason });
  if (error) throw dbError(error);
  return Response.json({ ok: true });
});
