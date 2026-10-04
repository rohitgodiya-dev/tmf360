import { z } from "zod";
import { writeAudit } from "@/lib/api/audit";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError, idParam } from "@/lib/api/db";
import { handle, notFound, parseBody } from "@/lib/api/http";

// How long an issued link works. Long enough for the viewer to start loading, short enough
// that a copied link is useless (AZB-06: no long-lived file URLs).
const LINK_SECONDS = 60;

const schema = z.object({ purpose: z.enum(["view", "download", "print"]) }).strict();

// Issues a short-lived link to a document's current file (M07). The caller must be able to
// read the document; storage then checks its own policies when the link is signed (as the
// user, never the service role). Downloads and prints are audited (VWR-02).
export const POST = handle(async (req: Request, { params }: { params: Promise<{ documentId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "view_document");
  const id = idParam((await params).documentId);
  const { purpose } = await parseBody(req, schema);

  const { data: doc, error } = await ctx.db.from("documents")
    .select("id, study_id, file_path, file_name, file_type, custom_file_name, artifact_name")
    .eq("id", id).is("deleted_at", null).maybeSingle();
  if (error) throw dbError(error);
  if (!doc) throw notFound();
  if (!doc.file_path) throw notFound("This document has no file in the TMF");

  const name = (doc.custom_file_name || doc.file_name || "document").trim();
  const ext = doc.file_name?.match(/\.[^.]+$/)?.[0] ?? "";
  const downloadName = name.toLowerCase().endsWith(ext.toLowerCase()) ? name : name + ext;

  const { data: signed, error: sErr } = await ctx.db.storage.from("Documents")
    .createSignedUrl(doc.file_path, LINK_SECONDS, purpose === "download" ? { download: downloadName } : undefined);
  if (sErr || !signed) throw notFound("The file could not be found in storage");

  if (purpose !== "view") {
    await writeAudit(ctx, {
      action: purpose === "download" ? "Document downloaded" : "Document printed",
      studyId: doc.study_id, documentId: doc.id, documentName: name, field: "file", newValue: doc.file_name,
    });
  }
  return Response.json({ url: signed.signedUrl, expires_in: LINK_SECONDS, file_name: downloadName, file_type: doc.file_type });
});
