import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError, loadStudy } from "@/lib/api/db";
import { handle } from "@/lib/api/http";

// Apply the organisation's eTMF plan to this study (PLC-02): creates the placeholders the plan
// asks for now, and catches up items whose milestone is already achieved. Safe to repeat.
export const POST = handle(async (req: Request, { params }: { params: Promise<{ studyId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "edit_study");
  const study = await loadStudy(ctx, (await params).studyId);
  const { data, error } = await ctx.db.rpc("apply_plan", { p_study: study.id });
  if (error) throw dbError(error);
  return Response.json({ created: data ?? 0 });
});
