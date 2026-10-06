import { z } from "zod";
import { writeAudit } from "@/lib/api/audit";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError, idParam, reason } from "@/lib/api/db";
import { checkValues, customValues, ruleFor } from "@/lib/api/fields";
import { conflict, handle, notFound, parseBody } from "@/lib/api/http";

type Params = { params: Promise<{ documentId: string }> };

// The document's type-specific fields: the artifact's field definitions, the values, and what is still missing.
export const GET = handle(async (req: Request, { params }: Params) => {
  const ctx = await requireUser(req);
  const id = idParam((await params).documentId);
  const { data: d, error } = await ctx.db.from("documents")
    .select("id, org_id, artifact_num, status, custom_file_name, version, effective_date, expiry_date, owner, study_country_id, study_site_id, custom_metadata")
    .eq("id", id).is("deleted_at", null).maybeSingle();
  if (error) throw dbError(error);
  if (!d) throw notFound();
  const rule = await ruleFor(ctx, d.artifact_num);
  const { data: gaps, error: gErr } = await ctx.db.rpc("metadata_gaps", { p_org: d.org_id, p_artifact: d.artifact_num, p_values: {
    title: d.custom_file_name, version: d.version, effective_date: d.effective_date, expiry_date: d.expiry_date, owner: d.owner,
    country: d.study_country_id, site: d.study_site_id, custom: d.custom_metadata } });
  if (gErr) throw dbError(gErr);
  return Response.json({ rule, values: d.custom_metadata ?? {}, missing: gaps ?? [], editable: !["Approved", "Archived", "Under Review"].includes(d.status) });
});

const schema = z.object({ custom_metadata: customValues, reason }).strict();

// Sets the type-specific values of a Draft document (Final documents change only through a revision request).
export const PUT = handle(async (req: Request, { params }: Params) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "upload_document");
  const id = idParam((await params).documentId);
  const body = await parseBody(req, schema);
  const { data: d, error } = await ctx.db.from("documents").select("id, study_id, artifact_num, status, custom_metadata, custom_file_name, file_name")
    .eq("id", id).is("deleted_at", null).maybeSingle();
  if (error) throw dbError(error);
  if (!d) throw notFound();
  if (["Approved", "Archived", "Under Review"].includes(d.status)) throw conflict("Fields of a document in QC or Final change only through a revision request");
  const values = checkValues(await ruleFor(ctx, d.artifact_num), body.custom_metadata);
  const { data: updated, error: uErr } = await ctx.db.from("documents").update({ custom_metadata: values }).eq("id", id).select("id, custom_metadata").maybeSingle();
  if (uErr) throw dbError(uErr);
  if (!updated) throw notFound();
  await writeAudit(ctx, { action: "Document fields changed", studyId: d.study_id, documentId: d.id, documentName: d.custom_file_name || d.file_name,
    field: "custom_metadata", oldValue: JSON.stringify(d.custom_metadata ?? {}), newValue: JSON.stringify(values), reason: body.reason });
  return Response.json(updated);
});
