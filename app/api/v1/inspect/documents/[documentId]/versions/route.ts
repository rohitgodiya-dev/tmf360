import { idParam } from "@/lib/api/db";
import { handle, notFound } from "@/lib/api/http";
import { logActivity, requireInspector, scopedDocument } from "@/lib/api/inspect";
import { serviceClient } from "@/lib/api/service";

// Version history (INS-02, when the session includes it): every file version with its hash and the
// signature manifestations linked to it (name, server time, meaning — SIG-02).
export const GET = handle(async (req: Request, { params }: { params: Promise<{ documentId: string }> }) => {
  const s = await requireInspector(req);
  if (!s.include_versions) throw notFound();
  const d = await scopedDocument(s, idParam((await params).documentId));
  const db = serviceClient();
  const [versions, sigs] = await Promise.all([
    db.from("document_file_versions").select("id, version_no, file_name, file_type, file_hash, created_at, verification_status").eq("document_id", d.id).order("version_no", { ascending: false }),
    db.from("signature_events").select("file_version_id, kind, meaning, signer_name, signed_at").eq("document_id", d.id).order("signed_at"),
  ]);
  if (versions.error) throw new Error(versions.error.message);
  if (sigs.error) throw new Error(sigs.error.message);
  await logActivity(s, "versions_view", d.id);
  return Response.json({
    data: (versions.data ?? []).map((v) => ({
      version_no: v.version_no, file_name: v.file_name, file_type: v.file_type, file_hash: v.file_hash, created_at: v.created_at,
      verification_status: v.verification_status,
      signatures: (sigs.data ?? []).filter((x) => x.file_version_id === v.id)
        .map((x) => ({ kind: x.kind, meaning: x.meaning, signer_name: x.signer_name, signed_at: x.signed_at })),
    })),
  });
});
