import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError, idParam, loadStudy } from "@/lib/api/db";
import { handle, notFound } from "@/lib/api/http";
import { inBackground } from "@/lib/api/background";
import { indexDocuments } from "@/lib/api/textindex";

type Params = { params: Promise<{ studyId: string; itemId: string }> };

// Files a verified, indexed intake item into the TMF as a Draft document (one transaction, audited).
export const POST = handle(async (req: Request, { params }: Params) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "upload_document");
  const p = await params;
  const study = await loadStudy(ctx, p.studyId);
  const id = idParam(p.itemId);

  const { data: item, error } = await ctx.db.from("intake_items").select("id").eq("id", id).eq("study_id", study.id).maybeSingle();
  if (error) throw dbError(error);
  if (!item) throw notFound();

  const { data: documentId, error: fileErr } = await ctx.db.rpc("file_intake_item", { p_item_id: id });
  if (fileErr) throw dbError(fileErr);
  // AI-06: record what the person actually filed against the item's AI recommendations. AI is never
  // in the critical path, so a failure here does not undo or fail the filing.
  const { error: settleErr } = await ctx.db.rpc("settle_ai_recommendations", { p_intake: id });
  if (settleErr) console.error("Could not settle AI recommendations:", settleErr.message);
  await inBackground(() => indexDocuments([documentId as string]));   // full-text index (NAV-09)
  return Response.json({ document_id: documentId }, { status: 201 });
});
