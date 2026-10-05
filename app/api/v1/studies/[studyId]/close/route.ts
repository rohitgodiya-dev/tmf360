import { z } from "zod";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError, loadStudy, reason } from "@/lib/api/db";
import { studyHealth } from "@/lib/api/health";
import { handle, parseBody } from "@/lib/api/http";
import { password, reauthenticate } from "@/lib/api/qc";
import { serviceClient } from "@/lib/api/service";

const schema = z.object({ reason, password }).strict();

// Study close-out (RET-03): electronic signature "Study TMF closed"; open QC tasks are cancelled with
// the reason and the study becomes read-only. A final health snapshot is taken for the record.
export const POST = handle(async (req: Request, { params }: { params: Promise<{ studyId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "invite_users");
  const study = await loadStudy(ctx, (await params).studyId);
  const body = await parseBody(req, schema);
  const proof = await reauthenticate(ctx, body.password, "study_closeout", null);
  const { data: cancelled, error } = await ctx.db.rpc("close_study", { p_study: study.id, p_reason: body.reason, p_reauth: proof });
  if (error) throw dbError(error);

  // Final health and readiness snapshot (derived data, written like the daily job does).
  const svc = serviceClient();
  await svc.rpc("evaluate_study", { p_study: study.id });
  const health = await studyHealth(svc, study);
  await svc.from("health_snapshots").upsert([{ org_id: study.org_id, study_id: study.id, taken_on: new Date().toISOString().slice(0, 10), indicators: health.values }],
    { onConflict: "study_id,taken_on" });
  return Response.json({ closed: true, tasks_cancelled: cancelled, final_health: health.values });
});
