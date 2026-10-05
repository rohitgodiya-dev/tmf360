import { z } from "zod";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError, reason } from "@/lib/api/db";
import { handle, parseBody } from "@/lib/api/http";
import { riskSettings } from "@/lib/api/risk";

const schema = z.object({
  indexing_days: z.number().int().min(1).max(365),
  processing_days: z.number().int().min(1).max(365),
  weights: z.array(z.object({
    factor: z.string().regex(/^(missing_artifact|late_indexing|late_processing|qc:[a-z0-9_]{1,60})$/),
    weight: z.number().min(0).max(5).refine((w) => w === 0 || w >= 0.1, "Use 0 (off) or 0.1 to 5.0").refine((w) => Math.round(w * 10) === w * 10, "One decimal place"),
  })).max(100),
  reason,
}).strict();

export const GET = handle(async (req: Request) => {
  const ctx = await requireUser(req);
  return Response.json(await riskSettings(ctx, ctx.orgId));
});

// RSK-02/05: factor weights (0 disables) and timeliness thresholds for the organisation. Only rows
// that change are written; the database audits each with the reason.
export const PUT = handle(async (req: Request) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "run_quality_checks");
  const body = await parseBody(req, schema);
  const current = await riskSettings(ctx, ctx.orgId);

  const { data: existing } = await ctx.db.from("risk_settings").select("id, indexing_days, processing_days").eq("org_id", ctx.orgId).maybeSingle();
  if (!existing || existing.indexing_days !== body.indexing_days || existing.processing_days !== body.processing_days) {
    const row = { indexing_days: body.indexing_days, processing_days: body.processing_days, change_reason: body.reason };
    const { error } = existing
      ? await ctx.db.from("risk_settings").update(row).eq("id", existing.id)
      : await ctx.db.from("risk_settings").insert([{ ...row, org_id: ctx.orgId }]);
    if (error) throw dbError(error);
  }
  const before = new Map(current.factors.map((f) => [f.factor, f]));
  for (const w of body.weights) {
    const f = before.get(w.factor);
    if (!f || f.weight === w.weight) continue;
    const { error } = f.configured
      ? await ctx.db.from("risk_factor_weights").update({ weight: w.weight, change_reason: body.reason }).eq("org_id", ctx.orgId).eq("factor", w.factor)
      : await ctx.db.from("risk_factor_weights").insert([{ org_id: ctx.orgId, factor: w.factor, weight: w.weight, change_reason: body.reason }]);
    if (error) throw dbError(error);
  }
  return Response.json(await riskSettings(ctx, ctx.orgId));
});
