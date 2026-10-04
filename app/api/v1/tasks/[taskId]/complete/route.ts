import { z } from "zod";
import { requireUser } from "@/lib/api/auth";
import { dbError, idParam } from "@/lib/api/db";
import { forbidden, handle, notFound, parseBody } from "@/lib/api/http";
import { canWork, password, reauthenticate } from "@/lib/api/qc";

const schema = z.object({
  outcome: z.enum(["accept", "reject"]),
  reason_codes: z.array(z.string().max(40)).max(20).default([]),
  comment: z.string().trim().max(2000).default(""),
  password,
}).strict().refine((b) => b.outcome === "accept" || (b.reason_codes.length > 0 && b.comment.length > 0), {
  message: "A rejection needs at least one reason and a comment", path: ["reason_codes"],
});

// Confirm & Close a QC task (QC-02/03, SIG-02): re-checks the password, then the database
// records the decision, the attestation/signature and the document's new status together.
export const POST = handle(async (req: Request, { params }: { params: Promise<{ taskId: string }> }) => {
  const ctx = await requireUser(req);
  const id = idParam((await params).taskId);
  const body = await parseBody(req, schema);

  const { data: task, error } = await ctx.db.from("document_tasks")
    .select("id, document_id, status, assignee_role, assignee_user").eq("id", id).maybeSingle();
  if (error) throw dbError(error);
  if (!task) throw notFound();
  if (!canWork(ctx, task)) throw forbidden(task.status === "open" ? "This task is assigned to someone else" : `This task is already ${task.status}`);

  const proof = await reauthenticate(ctx, body.password, "qc_decision", task.document_id);
  const { data, error: rpcErr } = await ctx.db.rpc("complete_qc_task", {
    p_task: id, p_outcome: body.outcome, p_reason_codes: body.reason_codes, p_comment: body.comment, p_reauth: proof,
  });
  if (rpcErr) throw dbError(rpcErr);
  return Response.json(data);
});
