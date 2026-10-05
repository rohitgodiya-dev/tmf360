import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError, loadStudy } from "@/lib/api/db";
import { handle } from "@/lib/api/http";
import { people } from "@/lib/api/qc";

// The study's AI recommendation log (AI-06): what each capability suggested, with which model and
// prompt version, and what people decided. For oversight of AI use.
export const GET = handle(async (req: Request, { params }: { params: Promise<{ studyId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "view_audit_trail");
  const study = await loadStudy(ctx, (await params).studyId);
  const { data, error } = await ctx.db.from("ai_recommendations")
    .select("id, feature, intake_item_id, document_id, model, model_version, prompt_version, confidence, status, decision_note, requested_by, decided_by, decided_at, created_at")
    .eq("study_id", study.id).order("created_at", { ascending: false }).limit(500);
  if (error) throw dbError(error);
  const who = await people(ctx);
  const name = (u: string | null) => (u ? who.get(u)?.name ?? "Former member" : null);
  const rows = data ?? [];
  const decided = rows.filter((r) => r.status !== "pending");
  return Response.json({
    summary: {
      total: rows.length,
      by_status: Object.fromEntries(["pending", "accepted", "modified", "rejected", "noted"].map((s) => [s, rows.filter((r) => r.status === s).length])),
      acceptance_rate: decided.length ? Math.round((rows.filter((r) => r.status === "accepted").length / decided.length) * 100) : null,
    },
    data: rows.map((r) => ({ ...r, requested_by_name: name(r.requested_by), decided_by_name: name(r.decided_by) })),
  });
});
