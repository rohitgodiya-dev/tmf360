import { idParam } from "@/lib/api/db";
import { handle } from "@/lib/api/http";
import { logActivity, requireInspector, scopedDocument } from "@/lib/api/inspect";

// One in-scope document's metadata for the viewer; opening it is logged as a view (INS-08).
export const GET = handle(async (req: Request, { params }: { params: Promise<{ documentId: string }> }) => {
  const s = await requireInspector(req);
  const d = await scopedDocument(s, idParam((await params).documentId));
  await logActivity(s, "view", d.id, { artifact_num: d.artifact_num });
  return Response.json({
    id: d.id, status: d.status === "Approved" ? "Final" : d.status, artifact_num: d.artifact_num, artifact_name: d.artifact_name,
    custom_file_name: d.custom_file_name, file_name: d.file_name, file_type: d.file_type, version: d.version,
    effective_date: d.effective_date, expiry_date: d.expiry_date, has_file: !!d.file_path,
  });
});
