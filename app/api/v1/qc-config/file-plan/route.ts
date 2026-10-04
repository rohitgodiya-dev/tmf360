import { z } from "zod";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError, reason } from "@/lib/api/db";
import { handle, parseBody } from "@/lib/api/http";
import { PERMISSIONS } from "@/lib/permissions";

const step = z.object({
  step_type: z.enum(["inbound_qc", "post_approval_qc"]),
  assignee_role: z.enum(PERMISSIONS.approve_document).nullable().default(null),
  duration_days: z.number().int().min(1).max(365),
}).strict();
const schema = z.object({
  artifact_num: z.string().trim().regex(/^\d{2}\.\d{2}\.\d{2}$/, "Use an artifact number like 01.01.01").nullable(),
  steps: z.array(step).min(1, "A File Plan needs at least one QC step").max(10),
  reason,
}).strict().refine((b) => b.steps[0].step_type === "inbound_qc", { message: "The first step must be Inbound QC", path: ["steps"] });

// Replaces the File Plan for one artifact, or the organisation default (artifact_num null).
// Applies to documents submitted from now on; tasks already open keep their assignee.
export const PUT = handle(async (req: Request) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "run_quality_checks");
  const body = await parseBody(req, schema);
  const { error } = await ctx.db.rpc("set_file_plan", { p_artifact: body.artifact_num, p_steps: body.steps, p_reason: body.reason });
  if (error) throw dbError(error);
  return Response.json({ artifact_num: body.artifact_num, steps: body.steps });
});
