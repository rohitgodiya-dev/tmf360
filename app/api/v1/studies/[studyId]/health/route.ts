import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError, loadStudy } from "@/lib/api/db";
import { studyHealth } from "@/lib/api/health";
import { handle } from "@/lib/api/http";

const MAX_AGE_MS = 24 * 3600 * 1000;

// TMF Health & Inspection Readiness (HLT-01..06). Continuous: if anything changed since the last
// evaluation (or it is over a day old) the rules run again first, so the page is always current.
export const GET = handle(async (req: Request, { params }: { params: Promise<{ studyId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "view_document");
  const study = await loadStudy(ctx, (await params).studyId);

  const { data: state, error } = await ctx.db.from("study_health_state").select("dirty_at, evaluated_at").eq("study_id", study.id).maybeSingle();
  if (error) throw dbError(error);
  const stale = !state?.evaluated_at || Date.parse(state.dirty_at) > Date.parse(state.evaluated_at) || Date.now() - Date.parse(state.evaluated_at) > MAX_AGE_MS;
  if (stale) {
    const { error: eErr } = await ctx.db.rpc("evaluate_study", { p_study: study.id });
    if (eErr) throw dbError(eErr);
  }

  const [health, trend, evaluated] = await Promise.all([
    studyHealth(ctx.db, study),
    ctx.db.from("health_snapshots").select("taken_on, indicators").eq("study_id", study.id).order("taken_on", { ascending: false }).limit(90),
    ctx.db.from("study_health_state").select("evaluated_at").eq("study_id", study.id).maybeSingle(),
  ]);
  if (trend.error) throw dbError(trend.error);
  return Response.json({ ...health, evaluated_at: evaluated.data?.evaluated_at ?? null, trend: (trend.data ?? []).reverse() });
});
