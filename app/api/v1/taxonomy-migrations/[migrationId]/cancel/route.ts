import { z } from "zod";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError, idParam, reason } from "@/lib/api/db";
import { handle, parseBody } from "@/lib/api/http";

const schema = z.object({ reason }).strict();

// Cancels a planned taxonomy migration (audited with the reason).
export const POST = handle(async (req: Request, { params }: { params: Promise<{ migrationId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "invite_users");
  const id = idParam((await params).migrationId);
  const { reason: why } = await parseBody(req, schema);
  const { error } = await ctx.db.rpc("cancel_taxonomy_migration", { p_migration: id, p_reason: why });
  if (error) throw dbError(error);
  return Response.json({ ok: true });
});
