import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError, idParam } from "@/lib/api/db";
import { handle, notFound } from "@/lib/api/http";
import { docTitles } from "@/lib/api/inspection-team";
import { people } from "@/lib/api/qc";

// One session for the study team: the request queue (INS-07) and recent activity, which is the live
// "inspection in progress" view (INS-09) that the page polls.
export const GET = handle(async (req: Request, { params }: { params: Promise<{ sessionId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "view_audit_trail");
  const id = idParam((await params).sessionId);
  const { data: s, error } = await ctx.db.from("inspection_sessions").select("*").eq("id", id).maybeSingle();
  if (error) throw dbError(error);
  if (!s) throw notFound();
  const [requests, activity] = await Promise.all([
    ctx.db.from("inspection_requests").select("*").eq("session_id", id).order("created_at", { ascending: false }),
    ctx.db.from("inspection_activity").select("id, kind, document_id, detail, at").eq("session_id", id).order("at", { ascending: false }).limit(100),
  ]);
  if (requests.error) throw dbError(requests.error);
  if (activity.error) throw dbError(activity.error);
  const title = await docTitles(ctx, [...(activity.data ?? []).map((a) => a.document_id), ...(requests.data ?? []).flatMap((r) => [r.document_id, r.response_document_id])]);
  const who = await people(ctx);
  const viewing = (activity.data ?? []).find((a) => a.kind === "view" || a.kind === "page_view");
  return Response.json({
    session: s,
    now_viewing: viewing && Date.now() - Date.parse(viewing.at) < 10 * 60000
      ? { document_id: viewing.document_id, title: title.get(viewing.document_id) ?? null, at: viewing.at } : null,
    requests: (requests.data ?? []).map((r) => ({
      ...r, document_title: r.document_id ? title.get(r.document_id) ?? null : null,
      response_document_title: r.response_document_id ? title.get(r.response_document_id) ?? null : null,
      responded_by_name: r.responded_by ? who.get(r.responded_by)?.name ?? "Former member" : null,
    })),
    activity: (activity.data ?? []).map((a) => ({ ...a, document_title: a.document_id ? title.get(a.document_id) ?? null : null })),
  });
});
