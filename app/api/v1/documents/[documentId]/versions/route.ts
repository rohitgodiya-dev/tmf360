import { requireUser } from "@/lib/api/auth";
import { dbError, idParam } from "@/lib/api/db";
import { handle, notFound } from "@/lib/api/http";
import { people } from "@/lib/api/qc";

const RATIONALE: Record<string, string> = { metadata_update: "Metadata update", content_and_metadata_update: "Content and metadata update", filing_error: "Filing error", other: "Other" };

// Version history (OPS-06): every file version, every metadata snapshot (the values before each
// change), and the revision requests, newest first. Older files open through the access route
// with their version number.
export const GET = handle(async (req: Request, { params }: { params: Promise<{ documentId: string }> }) => {
  const ctx = await requireUser(req);
  const id = idParam((await params).documentId);
  const { data: doc, error } = await ctx.db.from("documents").select("id, version, status").eq("id", id).maybeSingle();
  if (error) throw dbError(error);
  if (!doc) throw notFound();
  const [files, meta, revisions] = await Promise.all([
    ctx.db.from("document_file_versions").select("version_no, file_name, file_type, file_size_bytes, file_hash, verification_status, uploaded_by, created_at").eq("document_id", id).order("version_no", { ascending: false }),
    ctx.db.from("document_metadata_versions").select("version_no, snapshot, change_reason, changed_by_email, changed_at").eq("document_id", id).order("version_no", { ascending: false }),
    ctx.db.from("revision_requests").select("rationale, description, proposed_revision, process, changes, requested_by, requested_at").eq("document_id", id).order("requested_at", { ascending: false }),
  ]);
  for (const r of [files, meta, revisions]) if (r.error) throw dbError(r.error);
  const who = await people(ctx);
  const latest = files.data?.[0]?.version_no;
  return Response.json({
    current_revision: doc.version, status: doc.status,
    files: (files.data ?? []).map((f) => ({ ...f, current: f.version_no === latest, uploaded_by: f.uploaded_by ? who.get(f.uploaded_by)?.name ?? "Former member" : null })),
    metadata: meta.data ?? [],
    revisions: (revisions.data ?? []).map((r) => ({ ...r, rationale: RATIONALE[r.rationale] ?? r.rationale, requested_by: who.get(r.requested_by)?.name ?? "Former member" })),
  });
});
