import { z } from "zod";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { idParam, reason, rowVersion, updateVersioned } from "@/lib/api/db";
import { handle, parseBody } from "@/lib/api/http";

const schema = z.object({
  quantity: z.number().int().min(1).max(50).optional(),
  due_offset_days: z.number().int().min(0).max(3650).optional(),
  instructions: z.string().trim().max(4000).nullable().optional(),
  responsible_org: z.string().trim().max(200).nullable().optional(),
  responsible_dept: z.string().trim().max(200).nullable().optional(),
  is_active: z.boolean().optional(),
  row_version: rowVersion, reason,
}).strict();

// Edit or retire a plan item. Placeholders already created are not changed.
export const PATCH = handle(async (req: Request, { params }: { params: Promise<{ itemId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "run_quality_checks");
  const id = idParam((await params).itemId);
  const { row_version, reason: why, ...patch } = await parseBody(req, schema);
  return Response.json(await updateVersioned(ctx, "plan_template_items", { id }, row_version, { ...patch, change_reason: why }));
});
