import { z } from "zod";
import { requireUser } from "@/lib/api/auth";
import { dbError, idParam } from "@/lib/api/db";
import { handle, parseBody } from "@/lib/api/http";

const schema = z.object({ user_id: z.string().uuid().nullable() }).strict();

// Assign an open finding to a member of the organisation (or unassign with null). Audited.
export const POST = handle(async (req: Request, { params }: { params: Promise<{ findingId: string }> }) => {
  const ctx = await requireUser(req);
  const id = idParam((await params).findingId);
  const body = await parseBody(req, schema);
  const { error } = await ctx.db.rpc("assign_finding", { p_finding: id, p_user: body.user_id });
  if (error) throw dbError(error);
  return Response.json({ id, assigned_to: body.user_id });
});
