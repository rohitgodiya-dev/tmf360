import { requireUser } from "@/lib/api/auth";
import { dbError, loadStudy } from "@/lib/api/db";
import { handle, invalidRequest } from "@/lib/api/http";
import { TASK_LABEL, assigneeLabel, canWork, docTitle, people, type TaskRow } from "@/lib/api/qc";

const TASK_COLUMNS = "id, document_id, study_id, task_type, position, cycle, assignee_role, assignee_user, due_at, status, outcome, completed_by, completed_at, cancel_reason, created_at, created_by";

// Study Tasks list (WFL-05/07). ?scope=mine (default: open tasks I can act on) | all; ?status=open|closed|all.
export const GET = handle(async (req: Request, { params }: { params: Promise<{ studyId: string }> }) => {
  const ctx = await requireUser(req);
  const study = await loadStudy(ctx, (await params).studyId);
  const url = new URL(req.url);
  const scope = url.searchParams.get("scope") ?? "mine";
  const status = url.searchParams.get("status") ?? "open";
  if (!["mine", "all"].includes(scope) || !["open", "closed", "all"].includes(status)) throw invalidRequest("Unknown scope or status");

  let q = ctx.db.from("document_tasks").select(TASK_COLUMNS).eq("study_id", study.id);
  if (status === "open" || scope === "mine") q = q.eq("status", "open");
  else if (status === "closed") q = q.neq("status", "open");
  const { data, error } = await q.order("due_at", { ascending: true }).limit(500);
  if (error) throw dbError(error);
  let tasks = (data ?? []) as TaskRow[];
  if (scope === "mine") tasks = tasks.filter((t) => canWork(ctx, t));

  const ids = [...new Set(tasks.map((t) => t.document_id))];
  const { data: docs, error: dErr } = ids.length
    ? await ctx.db.from("documents").select("id, custom_file_name, artifact_name, artifact_num, status").in("id", ids)
    : { data: [], error: null };
  if (dErr) throw dbError(dErr);
  const docById = new Map((docs ?? []).map((d) => [d.id, d]));
  const who = await people(ctx);
  const now = Date.now();

  return Response.json({
    data: tasks.filter((t) => docById.has(t.document_id)).map((t) => {
      const d = docById.get(t.document_id)!;
      return {
        id: t.id, document_id: t.document_id, doc_ref: t.document_id.slice(0, 8).toUpperCase(), title: docTitle(d),
        artifact_num: d.artifact_num, task_type: TASK_LABEL[t.task_type] ?? t.task_type, cycle: t.cycle,
        assignee: assigneeLabel(t, who), created_at: t.created_at, created_by: t.created_by ? who.get(t.created_by)?.name ?? "Former member" : "System",
        due_at: t.due_at, status: t.status, outcome: t.outcome, completed_at: t.completed_at,
        completed_by: t.completed_by ? who.get(t.completed_by)?.name ?? "Former member" : null,
        overdue: t.status === "open" && Date.parse(t.due_at) < now, can_work: canWork(ctx, t),
      };
    }),
  });
});
