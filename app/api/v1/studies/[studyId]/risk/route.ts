import { requirePermission, requireUser } from "@/lib/api/auth";
import { loadStudy } from "@/lib/api/db";
import { handle } from "@/lib/api/http";
import { riskModel } from "@/lib/api/risk";

// Explainable risk for a study (OVS-01..03): artifact scores with every contributing factor and
// count, roll-ups by zone, section, country, site and owner, and the study explanation in words.
export const GET = handle(async (req: Request, { params }: { params: Promise<{ studyId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "view_gap_analysis");
  const study = await loadStudy(ctx, (await params).studyId);
  return Response.json(await riskModel(ctx, study));
});
