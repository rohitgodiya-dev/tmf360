import { z } from "zod";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { idParam, isoDate, loadStudy, reason, rowVersion, updateVersioned } from "@/lib/api/db";
import { handle, parseBody } from "@/lib/api/http";

// Contacts are ended, not deleted, so the history of who held a role stays intact.
const patchSchema = z.object({
  row_version: rowVersion,
  end_date: isoDate,
  change_reason: reason,
});

type Params = { params: Promise<{ studyId: string; contactId: string }> };

export const PATCH = handle(async (req: Request, { params }: Params) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "edit_study");
  const p = await params;
  const study = await loadStudy(ctx, p.studyId);
  const id = idParam(p.contactId);
  const { row_version, ...patch } = await parseBody(req, patchSchema);
  const contact = await updateVersioned(ctx, "contact_roles", { id, study_id: study.id }, row_version, patch);
  return Response.json(contact);
});
