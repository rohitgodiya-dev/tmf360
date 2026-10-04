import { z } from "zod";
import { writeAudit } from "@/lib/api/audit";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError, idParam, reason } from "@/lib/api/db";
import { handle, notFound, parseBody } from "@/lib/api/http";

const schema = z.object({ reason }).strict();

// Moves a document to the Recycle Bin (soft delete, DI-06) with a reason. The database
// requires delete_document as well and stamps who and when (Pillar 6, Part 4a).
export const POST = handle(async (req: Request, { params }: { params: Promise<{ documentId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "delete_document");
  const id = idParam((await params).documentId);
  const body = await parseBody(req, schema);

  const { data: doc, error } = await ctx.db.from("documents")
    .select("id, study_id, status, custom_file_name, artifact_name").eq("id", id).is("deleted_at", null).maybeSingle();
  if (error) throw dbError(error);
  if (!doc) throw notFound();

  const { data: updated, error: uErr } = await ctx.db.from("documents").update({
    deleted_at: new Date().toISOString(), deletion_reason: body.reason, pre_deletion_status: doc.status, status: "Deleted",
  }).eq("id", id).is("deleted_at", null).select("id").maybeSingle();
  if (uErr) throw dbError(uErr);
  if (!updated) throw notFound();

  await writeAudit(ctx, {
    action: "Document deleted", studyId: doc.study_id, documentId: doc.id,
    documentName: doc.custom_file_name || doc.artifact_name, field: "status", oldValue: doc.status, newValue: "Deleted", reason: body.reason,
  });
  return Response.json({ id, status: "Deleted" });
});
