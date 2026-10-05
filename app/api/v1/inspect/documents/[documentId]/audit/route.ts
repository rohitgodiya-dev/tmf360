import { idParam } from "@/lib/api/db";
import { handle, notFound } from "@/lib/api/http";
import { logActivity, requireInspector, scopedDocument } from "@/lib/api/inspect";
import { serviceClient } from "@/lib/api/service";

// The document's audit trail (INS-04, when the session includes it): who, what, when, old and new
// values and reason, oldest first.
export const GET = handle(async (req: Request, { params }: { params: Promise<{ documentId: string }> }) => {
  const s = await requireInspector(req);
  if (!s.include_audit) throw notFound();
  const d = await scopedDocument(s, idParam((await params).documentId));
  const { data, error } = await serviceClient().from("audit_trail")
    .select("created_at, user_email, action, field_changed, old_value, new_value, signature_reason, sequence_no")
    .eq("document_id", d.id).eq("org_id", d.org_id).order("created_at").limit(2000);
  if (error) throw new Error(error.message);
  await logActivity(s, "audit_view", d.id);
  return Response.json({ data: data ?? [] });
});
