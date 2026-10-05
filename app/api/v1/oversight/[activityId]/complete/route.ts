import { z } from "zod";
import { requireUser } from "@/lib/api/auth";
import { dbError, idParam } from "@/lib/api/db";
import { handle, parseBody } from "@/lib/api/http";
import { password, reauthenticate } from "@/lib/api/qc";

const schema = z.object({ outcome: z.string().trim().min(3).max(4000), password }).strict();

// Completes an oversight activity with an electronic signature ("Oversight review completed").
// An assignee or a quality lead may complete it; the database checks which.
export const POST = handle(async (req: Request, { params }: { params: Promise<{ activityId: string }> }) => {
  const ctx = await requireUser(req);
  const id = idParam((await params).activityId);
  const body = await parseBody(req, schema);
  const proof = await reauthenticate(ctx, body.password, "oversight_review", null);
  const { error } = await ctx.db.rpc("complete_oversight", { p_activity: id, p_outcome: body.outcome, p_reauth: proof });
  if (error) throw dbError(error);
  return Response.json({ ok: true });
});
