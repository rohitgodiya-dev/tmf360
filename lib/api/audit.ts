// Audit writes for /api/v1 (REG-01). Unlike the legacy client-side logAudit,
// a failed audit write fails the request: an action that cannot be audited
// must not be reported as done.
import type { RequestContext } from "./auth";

export type AuditEntry = {
  action: string;
  studyId?: string | null;
  documentId?: string | null;
  documentName?: string | null;
  field?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  reason?: string | null;
};

export async function writeAudit(ctx: RequestContext, entry: AuditEntry) {
  const { error } = await ctx.db.from("audit_trail").insert([{
    user_id: ctx.user.id,
    user_email: ctx.user.email,
    org_id: ctx.orgId,
    action: entry.action,
    study_id: entry.studyId ?? null,
    document_id: entry.documentId ?? null,
    document_name: entry.documentName ?? null,
    field_changed: entry.field ?? null,
    old_value: entry.oldValue ?? null,
    new_value: entry.newValue ?? null,
    signature_reason: entry.reason ?? null,
  }]);
  if (error) throw new Error(`Audit write failed: ${error.message}`);
}
