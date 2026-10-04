import { requireUser } from "@/lib/api/auth";
import { dbError, idParam } from "@/lib/api/db";
import { handle, notFound } from "@/lib/api/http";
import { TASK_LABEL, assigneeLabel, canWork, docTitle, people, timeline } from "@/lib/api/qc";
import { hasPermission, PERMISSIONS, type Role } from "@/lib/permissions";

// Everything the QC task screen needs (QC-01): the task, its document's metadata, the coded
// reasons, who it can be reassigned to, whether decisions are attestations or signatures, and history.
export const GET = handle(async (req: Request, { params }: { params: Promise<{ taskId: string }> }) => {
  const ctx = await requireUser(req);
  const id = idParam((await params).taskId);
  const { data: task, error } = await ctx.db.from("document_tasks")
    .select("id, document_id, task_type, position, cycle, assignee_role, assignee_user, due_at, status, outcome, created_at, file_version_id")
    .eq("id", id).maybeSingle();
  if (error) throw dbError(error);
  if (!task) throw notFound();

  const [docRes, reasonsRes, settingsRes, versionRes] = await Promise.all([
    ctx.db.from("documents").select("id, study_id, status, artifact_num, artifact_name, custom_file_name, version, owner, effective_date, expiry_date, file_name, file_type, file_path, submission_reason, rejection_reason, created_at")
      .eq("id", task.document_id).maybeSingle(),
    ctx.db.from("qc_reasons").select("code, label, category").eq("org_id", ctx.orgId).eq("is_active", true).order("sort_order"),
    ctx.db.from("workflow_settings").select("qc_control").eq("org_id", ctx.orgId).maybeSingle(),
    task.file_version_id
      ? ctx.db.from("document_file_versions").select("version_no, file_name, file_hash").eq("id", task.file_version_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  for (const r of [docRes, reasonsRes, settingsRes, versionRes]) if (r.error) throw dbError(r.error);
  if (!docRes.data) throw notFound();
  const doc = docRes.data;
  const who = await people(ctx);
  const approvers = [...who.values()].filter((p) => hasPermission(p.role as Role, "approve_document"));

  return Response.json({
    task: {
      id: task.id, step: TASK_LABEL[task.task_type] ?? task.task_type, cycle: task.cycle, status: task.status, outcome: task.outcome,
      assignee: assigneeLabel(task, who), due_at: task.due_at, created_at: task.created_at,
      overdue: task.status === "open" && Date.parse(task.due_at) < Date.now(),
    },
    document: { ...doc, title: docTitle(doc), has_file: !!doc.file_path, file_path: undefined },
    file_version: versionRes.data,
    reasons: reasonsRes.data ?? [],
    control: settingsRes.data?.qc_control ?? "attestation",
    can_work: canWork(ctx, task),
    can_reject: canWork(ctx, task) && hasPermission(ctx.role, "reject_document"),
    can_reassign: task.status === "open" && hasPermission(ctx.role, "approve_document"),
    reassign_to: {
      people: approvers.map((p) => ({ user_id: p.user_id, name: p.name, role: p.role })),
      roles: PERMISSIONS.approve_document,
    },
    history: await timeline(ctx, task.document_id, who),
  });
});
