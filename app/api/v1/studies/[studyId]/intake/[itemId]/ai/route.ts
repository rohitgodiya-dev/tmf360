import { z } from "zod";
import { classify, extractMetadata, findDuplicates, loadIntake, preQc } from "@/lib/api/ai";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError, idParam, loadStudy } from "@/lib/api/db";
import { handle, parseBody } from "@/lib/api/http";

export const maxDuration = 120;
type Params = { params: Promise<{ studyId: string; itemId: string }> };
const schema = z.object({ feature: z.enum(["classification", "metadata_extraction", "pre_qc_checks", "duplicate_detection"]) }).strict();

// The intake item's AI recommendations (AI-06), newest first.
export const GET = handle(async (req: Request, { params }: Params) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "upload_document");
  const p = await params;
  const study = await loadStudy(ctx, p.studyId);
  const { data, error } = await ctx.db.from("ai_recommendations").select("*").eq("study_id", study.id).eq("intake_item_id", idParam(p.itemId))
    .order("created_at", { ascending: false });
  if (error) throw dbError(error);
  return Response.json({ data: data ?? [] });
});

// Runs one AI capability on the intake item and stores the result as a recommendation (M17).
export const POST = handle(async (req: Request, { params }: Params) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "upload_document");
  const p = await params;
  const study = await loadStudy(ctx, p.studyId);
  const { feature } = await parseBody(req, schema);
  const item = await loadIntake(ctx, study, idParam(p.itemId));
  const run = { classification: classify, metadata_extraction: extractMetadata, pre_qc_checks: preQc, duplicate_detection: findDuplicates }[feature];
  return Response.json(await run(ctx, study, item), { status: 201 });
});
