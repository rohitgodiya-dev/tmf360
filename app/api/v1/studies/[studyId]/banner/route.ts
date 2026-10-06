import { requireUser } from "@/lib/api/auth";
import { dbError, loadStudy } from "@/lib/api/db";
import { handle } from "@/lib/api/http";

// What every study member must see on every panel (Part 18): read-only (closed/archived) and inspection in progress.
export const GET = handle(async (req: Request, { params }: { params: Promise<{ studyId: string }> }) => {
  const ctx = await requireUser(req);
  const study = await loadStudy(ctx, (await params).studyId);
  const { data, error } = await ctx.db.rpc("study_banner_state", { p_study: study.id });
  if (error) throw dbError(error);
  return Response.json(data);
});
