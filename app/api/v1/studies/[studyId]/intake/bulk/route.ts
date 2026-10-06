import { z } from "zod";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { inBackground } from "@/lib/api/background";
import { dbError, isoDate, loadStudy, reason } from "@/lib/api/db";
import { handle, parseBody } from "@/lib/api/http";
import { indexDocuments } from "@/lib/api/textindex";

// Bulk indexing (IDX-02) and selection actions (STG-09) on Document Intake. Each item is processed on
// its own through the same rules as one-by-one indexing and filing; the response reports every item.
const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("set"),
    item_ids: z.array(z.string().uuid()).min(1).max(200),
    // "Edit common metadata": only the fields given are applied to every selected item.
    set: z.object({
      artifact_num: z.string().regex(/^\d\d\.\d\d\.\d\d$/).optional(),
      study_country_id: z.string().uuid().nullable().optional(),
      study_site_id: z.string().uuid().nullable().optional(),
      version_label: z.string().trim().max(50).optional(),
      effective_date: isoDate.optional(),
      owner: z.string().trim().max(200).optional(),
    }).strict().refine((s) => Object.keys(s).length > 0, "Choose at least one field to apply"),
  }).strict(),
  z.object({ action: z.literal("file"), item_ids: z.array(z.string().uuid()).min(1).max(200) }).strict(),
  z.object({ action: z.literal("reject"), item_ids: z.array(z.string().uuid()).min(1).max(200), reason }).strict(),
]);

export const POST = handle(async (req: Request, { params }: { params: Promise<{ studyId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "upload_document");
  const study = await loadStudy(ctx, (await params).studyId);
  const body = await parseBody(req, schema);
  const { data: items, error } = await ctx.db.from("intake_items").select("id, file_name, status").eq("study_id", study.id).in("id", body.item_ids);
  if (error) throw dbError(error);
  const known = new Map((items ?? []).map((i) => [i.id, i]));
  const results: { id: string; file_name: string | null; ok: boolean; reason?: string; document_id?: string }[] = [];
  const filed: string[] = [];

  for (const id of body.item_ids) {
    const it = known.get(id);
    if (!it) { results.push({ id, file_name: null, ok: false, reason: "Not found" }); continue; }
    if (it.status === "filed" || it.status === "rejected") { results.push({ id, file_name: it.file_name, ok: false, reason: `Already ${it.status}` }); continue; }
    if (body.action === "set") {
      const patch: Record<string, unknown> = { ...body.set };
      if (body.set.artifact_num) patch.status = "indexed";
      const { error: uErr } = await ctx.db.from("intake_items").update(patch).eq("id", id);
      results.push(uErr ? { id, file_name: it.file_name, ok: false, reason: dbError(uErr).message } : { id, file_name: it.file_name, ok: true });
    } else if (body.action === "reject") {
      const { error: uErr } = await ctx.db.from("intake_items").update({ status: "rejected", rejected_reason: body.reason, change_reason: body.reason }).eq("id", id);
      results.push(uErr ? { id, file_name: it.file_name, ok: false, reason: dbError(uErr).message } : { id, file_name: it.file_name, ok: true });
    } else {
      const { data: docId, error: fErr } = await ctx.db.rpc("file_intake_item", { p_item_id: id });
      if (fErr) { results.push({ id, file_name: it.file_name, ok: false, reason: dbError(fErr).message }); continue; }
      await ctx.db.rpc("settle_ai_recommendations", { p_intake: id });
      filed.push(docId as string);
      results.push({ id, file_name: it.file_name, ok: true, document_id: docId as string });
    }
  }
  if (filed.length) await inBackground(() => indexDocuments(filed));
  const done = results.filter((r) => r.ok).length;
  return Response.json({ done, failed: results.length - done, results });
});
