import { z } from "zod";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { idParam, isoDate, loadStudy, reason, rowVersion, updateVersioned } from "@/lib/api/db";
import { handle, parseBody } from "@/lib/api/http";

// Re-planning only needs the new date. Recording an actual date or changing the
// status is an audited fact about the trial, so it needs a reason.
const patchSchema = z
  .object({
    row_version: rowVersion,
    planned_date: isoDate.nullish(),
    actual_date: isoDate.nullish(),
    status: z.enum(["planned", "achieved", "missed", "not_applicable"]).optional(),
    change_reason: reason.optional(),
  })
  .refine((b) => (b.status === undefined && b.actual_date === undefined) || b.change_reason, {
    message: "A reason is required to record an actual date or change the status",
    path: ["change_reason"],
  })
  .refine((b) => !(b.status === "achieved" && !b.actual_date), {
    message: "An achieved milestone needs an actual date",
    path: ["actual_date"],
  })
  .refine((b) => !(b.actual_date && b.status && b.status !== "achieved"), {
    message: "Only an achieved milestone has an actual date",
    path: ["status"],
  });

type Params = { params: Promise<{ studyId: string; milestoneId: string }> };

export const PATCH = handle(async (req: Request, { params }: Params) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "edit_study");
  const p = await params;
  const study = await loadStudy(ctx, p.studyId);
  const id = idParam(p.milestoneId);
  const { row_version, ...body } = await parseBody(req, patchSchema);

  const patch: Record<string, unknown> = { ...body };
  if (body.actual_date) patch.status = "achieved";
  else if (body.status && body.status !== "achieved") patch.actual_date = null;
  if (patch.status !== undefined) patch.source = "manual";

  const milestone = await updateVersioned(ctx, "milestones", { id, study_id: study.id }, row_version, patch);
  return Response.json(milestone);
});
