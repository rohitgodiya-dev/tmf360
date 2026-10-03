import { z } from "zod";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { idParam, loadStudy, reason, rowVersion, updateVersioned } from "@/lib/api/db";
import { handle, parseBody } from "@/lib/api/http";
import { SITE_STATUSES } from "@/lib/api/structure";

// Sites are never removed; "deactivated" takes them out of use (STU-02 business rule).
// A status change needs a reason, recorded in the audit trail (STU-04).
const patchSchema = z
  .object({
    row_version: rowVersion,
    status: z.enum(SITE_STATUSES).optional(),
    display_name: z.string().trim().min(1).max(300).optional(),
    change_reason: reason.optional(),
  })
  .refine((b) => !b.status || b.change_reason, {
    message: "A reason is required to change the site status",
    path: ["change_reason"],
  });

type Params = { params: Promise<{ studyId: string; siteId: string }> };

export const PATCH = handle(async (req: Request, { params }: Params) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "edit_study");
  const p = await params;
  const study = await loadStudy(ctx, p.studyId);
  const id = idParam(p.siteId);
  const { row_version, ...patch } = await parseBody(req, patchSchema);
  const site = await updateVersioned(ctx, "study_sites", { id, study_id: study.id }, row_version, patch);
  return Response.json(site);
});
