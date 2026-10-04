import { z } from "zod";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError, reason } from "@/lib/api/db";
import { handle, parseBody } from "@/lib/api/http";

const schema = z.object({
  label: z.string().trim().min(2).max(80),
  weight: z.number().min(0).max(5).default(1),
  reason,
}).strict();

// Adds an organisation-specific QC reason; the code is derived from the label.
export const POST = handle(async (req: Request) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "run_quality_checks");
  const body = await parseBody(req, schema);
  const code = body.label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40) || "reason";
  const { data: last } = await ctx.db.from("qc_reasons").select("sort_order").eq("org_id", ctx.orgId).order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const { data, error } = await ctx.db.from("qc_reasons").insert([{
    org_id: ctx.orgId, code, label: body.label, weight: body.weight, sort_order: (last?.sort_order ?? 0) + 1, change_reason: body.reason,
  }]).select("id, code, label, category, weight, sort_order, is_active, row_version").single();
  if (error) throw dbError(error);
  return Response.json(data, { status: 201 });
});
