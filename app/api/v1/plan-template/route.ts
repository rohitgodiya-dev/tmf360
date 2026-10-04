import { z } from "zod";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError, reason } from "@/lib/api/db";
import { handle, parseBody } from "@/lib/api/http";
import { PERMISSIONS } from "@/lib/permissions";

const COLUMNS = "id, artifact_num, level, quantity, trigger_milestone, due_offset_days, instructions, responsible_org, responsible_dept, is_active, row_version";

// The organisation's eTMF plan (PLC-01): expected artifacts by level and quantity, each created
// when its milestone is achieved (or when the plan is applied to a study, if it has none).
export const GET = handle(async (req: Request) => {
  const ctx = await requireUser(req);
  const [items, milestones] = await Promise.all([
    ctx.db.from("plan_template_items").select(COLUMNS).eq("org_id", ctx.orgId).order("artifact_num"),
    ctx.db.from("milestone_types").select("code, label, applies_to").eq("status", "active").order("sort_order"),
  ]);
  for (const r of [items, milestones]) if (r.error) throw dbError(r.error);
  return Response.json({
    items: items.data ?? [], milestone_types: milestones.data ?? [],
    can_edit: (PERMISSIONS.run_quality_checks as readonly string[]).includes(ctx.role),
  });
});

const text = (max: number) => z.string().trim().max(max).optional().transform((v) => v || null);
const schema = z.object({
  artifact_num: z.string().regex(/^\d{2}\.\d{2}\.\d{2}$/, "Use an artifact number like 01.01.01"),
  level: z.enum(["study", "country", "site"]),
  quantity: z.number().int().min(1).max(50).default(1),
  trigger_milestone: z.string().max(60).nullable().default(null),
  due_offset_days: z.number().int().min(0).max(3650).default(30),
  instructions: text(4000), responsible_org: text(200), responsible_dept: text(200),
  reason,
}).strict();

export const POST = handle(async (req: Request) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "run_quality_checks");
  const { reason: why, ...item } = await parseBody(req, schema);
  const { data, error } = await ctx.db.from("plan_template_items").insert([{ ...item, org_id: ctx.orgId, change_reason: why }]).select(COLUMNS).single();
  if (error) throw dbError(error);
  return Response.json(data, { status: 201 });
});
