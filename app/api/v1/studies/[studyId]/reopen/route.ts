import { z } from "zod";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError, loadStudy, reason } from "@/lib/api/db";
import { handle, parseBody } from "@/lib/api/http";
import { password, reauthenticate } from "@/lib/api/qc";

const schema = z.object({ reason, password }).strict();

// Reopens a closed study (electronic signature "Study TMF reopened"); audited with the reason.
export const POST = handle(async (req: Request, { params }: { params: Promise<{ studyId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "invite_users");
  const study = await loadStudy(ctx, (await params).studyId);
  const body = await parseBody(req, schema);
  const proof = await reauthenticate(ctx, body.password, "study_reopen", null);
  const { error } = await ctx.db.rpc("reopen_study", { p_study: study.id, p_reason: body.reason, p_reauth: proof });
  if (error) throw dbError(error);
  return Response.json({ reopened: true });
});
