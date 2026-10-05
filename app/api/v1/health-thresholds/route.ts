import { z } from "zod";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError, reason } from "@/lib/api/db";
import { INDICATORS } from "@/lib/api/health";
import { handle, invalidRequest, parseBody } from "@/lib/api/http";
import { PERMISSIONS } from "@/lib/permissions";

// Health indicator thresholds for the organisation (HLT-04): the defaults, any overrides, and who may edit.
export const GET = handle(async (req: Request) => {
  const ctx = await requireUser(req);
  const { data, error } = await ctx.db.from("health_thresholds").select("indicator, amber, red").eq("org_id", ctx.orgId);
  if (error) throw dbError(error);
  const custom = new Map((data ?? []).map((t) => [t.indicator, t]));
  return Response.json({
    can_edit: (PERMISSIONS.run_quality_checks as readonly string[]).includes(ctx.role),
    indicators: Object.entries(INDICATORS).map(([key, d]) => ({
      key, label: d.label, unit: d.unit, direction: d.direction, default_amber: d.amber, default_red: d.red,
      amber: Number(custom.get(key)?.amber ?? d.amber), red: Number(custom.get(key)?.red ?? d.red), custom: custom.has(key),
    })),
  });
});

const schema = z.object({ indicator: z.string(), amber: z.number(), red: z.number(), reason }).strict();

export const PUT = handle(async (req: Request) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "run_quality_checks");
  const body = await parseBody(req, schema);
  const d = INDICATORS[body.indicator];
  if (!d) throw invalidRequest("Unknown indicator");
  if (d.direction === "higher_better" ? body.red > body.amber : body.red < body.amber) {
    throw invalidRequest(d.direction === "higher_better" ? "Red must be at or below amber for this indicator" : "Red must be at or above amber for this indicator");
  }
  const { data: existing } = await ctx.db.from("health_thresholds").select("id").eq("org_id", ctx.orgId).eq("indicator", body.indicator).maybeSingle();
  const res = existing
    ? await ctx.db.from("health_thresholds").update({ amber: body.amber, red: body.red, change_reason: body.reason }).eq("id", existing.id).select("indicator, amber, red").single()
    : await ctx.db.from("health_thresholds").insert([{ org_id: ctx.orgId, indicator: body.indicator, amber: body.amber, red: body.red, change_reason: body.reason }]).select("indicator, amber, red").single();
  if (res.error) throw dbError(res.error);
  return Response.json(res.data);
});
