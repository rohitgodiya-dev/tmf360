import { z } from "zod";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError, idParam, reason } from "@/lib/api/db";
import { handle, parseBody } from "@/lib/api/http";

const schema = z.object({ reason }).strict();

// Revokes a live zone grant (audited with the reason).
export const POST = handle(async (req: Request, { params }: { params: Promise<{ grantId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "manage_roles");
  const id = idParam((await params).grantId);
  const { reason: why } = await parseBody(req, schema);
  const { error } = await ctx.db.rpc("revoke_zone_permission", { p_grant: id, p_reason: why });
  if (error) throw dbError(error);
  return Response.json({ ok: true });
});
