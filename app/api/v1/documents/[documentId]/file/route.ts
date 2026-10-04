import { z } from "zod";
import { writeAudit } from "@/lib/api/audit";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError, idParam } from "@/lib/api/db";
import { hashStoredFile } from "@/lib/api/files";
import { handle, invalidRequest, notFound, parseBody } from "@/lib/api/http";
import { serviceClient } from "@/lib/api/service";

const schema = z.object({
  file_path: z.string().min(1).max(500),
  file_name: z.string().trim().min(1).max(300),
  file_type: z.string().max(200).nullish(),
  file_size_bytes: z.number().int().nonnegative().nullish(),
  file_hash: z.string().regex(/^[0-9a-f]{64}$/, "file_hash must be a lowercase SHA-256 hex digest"),
}).strict();

// New file version for a Draft document (e.g. after a revision request started collaboration).
// The browser stores the file at <org>/<study>/<sha256>.<ext>; the server re-hashes it and only
// accepts matching bytes. The previous file stays in the version history (Part 4b, OPS-06).
export const POST = handle(async (req: Request, { params }: { params: Promise<{ documentId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "upload_document");
  const id = idParam((await params).documentId);
  const body = await parseBody(req, schema);

  const { data: doc, error } = await ctx.db.from("documents")
    .select("id, org_id, study_id, status, file_hash, file_name, custom_file_name, artifact_name").eq("id", id).is("deleted_at", null).maybeSingle();
  if (error) throw dbError(error);
  if (!doc) throw notFound();
  if (doc.status !== "Draft") throw invalidRequest("A new file can only be added to a Draft document. For a Final document, start a revision first.");
  if (doc.file_hash === body.file_hash) throw invalidRequest("This is the same file the document already has");

  const prefix = `${doc.org_id}/${doc.study_id}/${body.file_hash}.`;
  if (!body.file_path.startsWith(prefix) || body.file_path.slice(prefix.length).includes("/")) {
    throw invalidRequest("Files must be stored at <organisation>/<study>/<sha256>.<extension>");
  }
  const hash = await hashStoredFile(body.file_path);
  if (!hash) throw invalidRequest("The file was not found in storage. Upload it again.");
  if (hash !== body.file_hash) throw invalidRequest("The stored file does not match its checksum. Upload it again.");

  const { error: uErr } = await ctx.db.from("documents").update({
    file_path: body.file_path, file_name: body.file_name, file_type: body.file_type ?? null,
    file_size_bytes: body.file_size_bytes ?? null, file_size: body.file_size_bytes ?? null, file_hash: body.file_hash,
  }).eq("id", id);
  if (uErr) throw dbError(uErr);

  // Authorised above; only the server records the integrity check on the new version.
  const svc = serviceClient();
  const { data: version } = await svc.from("document_file_versions").select("id, version_no")
    .eq("document_id", id).eq("file_hash", body.file_hash).order("version_no", { ascending: false }).limit(1).maybeSingle();
  if (version) {
    const { error: vErr } = await svc.from("document_file_versions")
      .update({ verification_status: "verified", verified_hash: hash, verified_at: new Date().toISOString() }).eq("id", version.id);
    if (vErr) throw dbError(vErr);
  }
  await writeAudit(ctx, {
    action: "New file version added", studyId: doc.study_id, documentId: id, documentName: (doc.custom_file_name || "").trim() || doc.artifact_name,
    field: "file", oldValue: doc.file_name, newValue: body.file_name,
  });
  return Response.json({ id, version_no: version?.version_no ?? null, verification_status: "verified" });
});
