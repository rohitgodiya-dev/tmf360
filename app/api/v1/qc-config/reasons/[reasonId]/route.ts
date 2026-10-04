import { z } from "zod";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { idParam, reason, rowVersion, updateVersioned } from "@/lib/api/db";
import { handle, parseBody } from "@/lib/api/http";

const schema = z.object({
  label: z.string().trim().min(2).max(80).optional(),
  weight: z.number().min(0).max(5).optional(),
  is_active: z.boolean().optional(),
  row_version: rowVersion,
  reason,
}).strict();

// Edit or retire a coded QC reason (QC-02: configurable per tenant). Retired, never deleted:
// past decisions keep pointing at their codes.
export const PATCH = handle(async (req: Request, { params }: { params: Promise<{ reasonId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "run_quality_checks");
  const id = idParam((await params).reasonId);
  const { row_version, reason: why, ...patch } = await parseBody(req, schema);
  const row = await updateVersioned(ctx, "qc_reasons", { id }, row_version, { ...patch, change_reason: why });
  return Response.json(row);
});
