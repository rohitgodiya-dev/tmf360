import { writeAudit } from "@/lib/api/audit";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError, idParam } from "@/lib/api/db";
import { handle, notFound } from "@/lib/api/http";
import { ACTIVITY_LABEL, activityDetail, docTitles } from "@/lib/api/inspection-team";
import { people } from "@/lib/api/qc";
import { buildXlsx, xlsxResponse } from "@/lib/xlsx";

// The complete inspection log (INS-08) as Excel: session details, every activity, every request.
export const GET = handle(async (req: Request, { params }: { params: Promise<{ sessionId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "view_audit_trail");
  const id = idParam((await params).sessionId);
  const { data: s, error } = await ctx.db.from("inspection_sessions").select("*").eq("id", id).maybeSingle();
  if (error) throw dbError(error);
  if (!s) throw notFound();
  const [activity, requests, study] = await Promise.all([
    ctx.db.from("inspection_activity").select("kind, document_id, detail, at").eq("session_id", id).order("at").limit(50000),
    ctx.db.from("inspection_requests").select("*").eq("session_id", id).order("created_at"),
    ctx.db.from("studies").select("study_id").eq("id", s.study_id).maybeSingle(),
  ]);
  if (activity.error) throw dbError(activity.error);
  if (requests.error) throw dbError(requests.error);
  const title = await docTitles(ctx, [...(activity.data ?? []).map((a) => a.document_id), ...(requests.data ?? []).flatMap((r) => [r.document_id, r.response_document_id])]);
  const who = await people(ctx);
  const name = (u: string | null) => (u ? who.get(u)?.name ?? "Former member" : "");
  const studyCode = study.data?.study_id ?? "study";

  const bytes = await buildXlsx([
    { name: "Session", columns: ["Field", "Value"], rows: [
      ["Study", studyCode], ["Session ID", s.id], ["Inspector", s.inspector_name], ["Inspector email", s.inspector_email],
      ["Organisation", s.inspector_org], ["Purpose", s.purpose], ["Starts", new Date(s.starts_at)], ["Ends", new Date(s.ends_at)],
      ["Statuses in scope", (s.scope_statuses as string[]).map((x) => (x === "Approved" ? "Final" : x)).join(", ")],
      ["Taxonomy nodes", (s.scope_nodes as string[]).join(", ") || "All"],
      ["Countries", s.scope_countries.length ? `${s.scope_countries.length} selected` : "All"],
      ["Sites", s.scope_sites.length ? `${s.scope_sites.length} selected` : "All"],
      ["Version history included", s.include_versions], ["Audit trail included", s.include_audit],
      ["Download mode", s.download_mode], ["AI features", s.ai_enabled ? "On" : "Off"],
      ["Created by", name(s.created_by)], ["Created", new Date(s.created_at)],
      ["Ended early", s.revoked_at ? `${new Date(s.revoked_at).toISOString()} (${s.revoke_reason})` : "No"],
    ] },
    { name: "Activity", columns: ["Time (UTC)", "Activity", "Document", "Detail"], rows: (activity.data ?? []).map((a) => [
      new Date(a.at), ACTIVITY_LABEL[a.kind] ?? a.kind, a.document_id ? title.get(a.document_id) ?? "" : "", activityDetail(a.kind, a.detail ?? {}),
    ]) },
    { name: "Requests", columns: ["Requested (UTC)", "Type", "Subject", "Detail", "Document", "Status", "Response", "Responded by", "Responded (UTC)", "Attached document", "Scope extended"],
      rows: (requests.data ?? []).map((r) => [
        new Date(r.created_at), r.kind.replace(/_/g, " "), r.subject, r.detail, r.document_id ? title.get(r.document_id) ?? "" : "", r.status, r.response,
        name(r.responded_by), r.responded_at ? new Date(r.responded_at) : "", r.response_document_id ? title.get(r.response_document_id) ?? "" : "", r.scope_extended,
      ]) },
  ]);
  await writeAudit(ctx, { action: "Inspection log exported", studyId: study.data?.study_id ?? null, field: `inspection_session:${s.id}`, newValue: `${activity.data?.length ?? 0} activities` });
  return xlsxResponse(bytes, `inspection-log-${studyCode}-${s.id.slice(0, 8)}.xlsx`);
});
