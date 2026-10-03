import { z } from "zod";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { idParam, loadStudy, reason, rowVersion, updateVersioned } from "@/lib/api/db";
import { handle, parseBody } from "@/lib/api/http";
import { COUNTRY_STATUSES } from "@/lib/api/structure";

// Country status changes are audited with a mandatory reason (STU-03).
const patchSchema = z.object({
  row_version: rowVersion,
  status: z.enum(COUNTRY_STATUSES),
  change_reason: reason,
});

type Params = { params: Promise<{ studyId: string; countryId: string }> };

export const PATCH = handle(async (req: Request, { params }: Params) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "edit_study");
  const p = await params;
  const study = await loadStudy(ctx, p.studyId);
  const id = idParam(p.countryId);
  const { row_version, ...patch } = await parseBody(req, patchSchema);
  const country = await updateVersioned(ctx, "study_countries", { id, study_id: study.id }, row_version, patch);
  return Response.json(country);
});
