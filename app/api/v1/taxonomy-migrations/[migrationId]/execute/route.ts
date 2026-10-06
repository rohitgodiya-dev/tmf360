import { z } from "zod";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError, idParam } from "@/lib/api/db";
import { handle, parseBody } from "@/lib/api/http";
import { password, reauthenticate } from "@/lib/api/qc";

const schema = z.object({
  // For each split document: the record type chosen in the new version.
  decisions: z.record(z.string().uuid(), z.string().uuid()).default({}),
  password,
}).strict();

// RM-05: executes a planned migration with the electronic signature "Mapping approved". Filed records are
// not changed; each document gets its mapped record type in the new version and the study is re-pinned.
export const POST = handle(async (req: Request, { params }: { params: Promise<{ migrationId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "invite_users");
  const id = idParam((await params).migrationId);
  const b = await parseBody(req, schema);
  const proof = await reauthenticate(ctx, b.password, "taxonomy_migration", null);
  const { data, error } = await ctx.db.rpc("execute_taxonomy_migration", { p_migration: id, p_decisions: b.decisions, p_reauth: proof });
  if (error) throw dbError(error);
  return Response.json({ mapped: data });
});
