import { z } from "zod";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { idParam, isoDate, loadStudy, reason, rowVersion, updateVersioned } from "@/lib/api/db";
import { checkValues, customValues, ruleFor } from "@/lib/api/fields";
import { handle, parseBody } from "@/lib/api/http";

// Index an intake item (choose its artifact and metadata) or reject it with a reason.
const patchSchema = z.object({
  row_version: rowVersion,
  artifact_num: z.string().trim().min(1).max(20).nullish(),
  title: z.string().trim().max(300).nullish(),
  version_label: z.string().trim().max(50).nullish(),
  effective_date: isoDate.nullish(),
  owner: z.string().trim().max(200).nullish(),
  notes: z.string().trim().max(4000).nullish(),
  // TMF level: a site (its country follows), a country, or neither for study level.
  study_country_id: z.string().uuid().nullish(),
  study_site_id: z.string().uuid().nullish(),
  suggestion: z.record(z.string(), z.unknown()).nullish(),
  // Type-specific fields of the chosen artifact (Part 22, RM-06).
  custom_metadata: customValues.optional(),
  reject: reason.optional(),
}).strict();

type Params = { params: Promise<{ studyId: string; itemId: string }> };

export const PATCH = handle(async (req: Request, { params }: Params) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "upload_document");
  const p = await params;
  const study = await loadStudy(ctx, p.studyId);
  const id = idParam(p.itemId);
  const { row_version, reject, ...fields } = await parseBody(req, patchSchema);

  const patch: Record<string, unknown> = reject
    ? { status: "rejected", rejected_reason: reject, change_reason: reject }
    : { ...fields };
  if (!reject && fields.artifact_num !== undefined) patch.status = fields.artifact_num ? "indexed" : "received";
  if (!reject && fields.custom_metadata) {
    let artifact = fields.artifact_num;
    if (artifact === undefined) {
      const { data } = await ctx.db.from("intake_items").select("artifact_num").eq("id", id).maybeSingle();
      artifact = data?.artifact_num ?? null;
    }
    patch.custom_metadata = checkValues(await ruleFor(ctx, artifact), fields.custom_metadata);
  }

  const item = await updateVersioned(ctx, "intake_items", { id, study_id: study.id }, row_version, patch);
  return Response.json(item);
});
