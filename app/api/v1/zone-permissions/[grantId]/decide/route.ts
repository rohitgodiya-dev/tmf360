import { z } from "zod";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError, idParam, reason } from "@/lib/api/db";
import { handle, parseBody } from "@/lib/api/http";

const schema = z.object({ approve: z.boolean(), reason }).strict();

// USR-06: a second person approves or rejects a pending Unblinded Contribute grant (audited).
export const POST = handle(async (req: Request, { params }: { params: Promise<{ grantId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "manage_roles");
  const id = idParam((await params).grantId);
  const b = await parseBody(req, schema);
  const { error } = await ctx.db.rpc("decide_zone_permission", { p_grant: id, p_approve: b.approve, p_reason: b.reason });
  if (error) throw dbError(error);
  return Response.json({ ok: true });
});
