import { writeAudit } from "@/lib/api/audit";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError, loadStudy } from "@/lib/api/db";
import { handle } from "@/lib/api/http";

// "Run Inspection Readiness Assessment" (HLT-05): runs every rule now and returns the counts.
// The findings themselves are listed by GET /studies/:id/findings.
export const POST = handle(async (req: Request, { params }: { params: Promise<{ studyId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "view_document");
  const study = await loadStudy(ctx, (await params).studyId);
  const { data: open, error } = await ctx.db.rpc("evaluate_study", { p_study: study.id });
  if (error) throw dbError(error);
  await writeAudit(ctx, { action: "Inspection readiness assessment run", studyId: study.study_id, field: "findings", newValue: `${open} open` });
  return Response.json({ open_findings: open, evaluated_at: new Date().toISOString() });
});
