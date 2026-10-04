import { z } from "zod";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError, reason } from "@/lib/api/db";
import { handle, parseBody } from "@/lib/api/http";
import { PERMISSIONS } from "@/lib/permissions";

// QC configuration for the organisation: coded reasons (QC-02), File Plan (WFL-01) and whether
// QC decisions are attestations or electronic signatures (Section 5, D1). Changes are audited
// by the database (before/after values with the reason).
export const GET = handle(async (req: Request) => {
  const ctx = await requireUser(req);
  const [reasons, steps, settings] = await Promise.all([
    ctx.db.from("qc_reasons").select("id, code, label, category, weight, sort_order, is_active, row_version").eq("org_id", ctx.orgId).order("sort_order"),
    ctx.db.from("file_plan_steps").select("artifact_num, position, step_type, assignee_role, duration_days").eq("org_id", ctx.orgId).eq("is_active", true).order("position"),
    ctx.db.from("workflow_settings").select("qc_control").eq("org_id", ctx.orgId).maybeSingle(),
  ]);
  for (const r of [reasons, steps, settings]) if (r.error) throw dbError(r.error);
  return Response.json({
    reasons: reasons.data ?? [],
    file_plan: steps.data ?? [],
    control: settings.data?.qc_control ?? "attestation",
    approver_roles: PERMISSIONS.approve_document,
    can_edit: (PERMISSIONS.run_quality_checks as readonly string[]).includes(ctx.role),
  });
});

const controlSchema = z.object({ control: z.enum(["attestation", "signature"]), reason }).strict();

export const PUT = handle(async (req: Request) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "run_quality_checks");
  const body = await parseBody(req, controlSchema);
  const { data: existing, error } = await ctx.db.from("workflow_settings").select("id").eq("org_id", ctx.orgId).maybeSingle();
  if (error) throw dbError(error);
  const res = existing
    ? await ctx.db.from("workflow_settings").update({ qc_control: body.control, change_reason: body.reason }).eq("id", existing.id).select("qc_control").single()
    : await ctx.db.from("workflow_settings").insert([{ org_id: ctx.orgId, qc_control: body.control, change_reason: body.reason }]).select("qc_control").single();
  if (res.error) throw dbError(res.error);
  return Response.json({ control: res.data.qc_control });
});
