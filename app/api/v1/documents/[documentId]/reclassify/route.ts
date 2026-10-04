import { z } from "zod";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError, idParam, reason } from "@/lib/api/db";
import { handle, invalidRequest, notFound, parseBody } from "@/lib/api/http";
import { reauthenticate } from "@/lib/api/qc";

const schema = z.object({
  artifact_num: z.string().regex(/^\d{2}\.\d{2}\.\d{2}$/, "Use an artifact number like 01.01.01"),
  study_country_id: z.string().uuid().nullable().default(null),
  study_site_id: z.string().uuid().nullable().default(null),
  reason,
  password: z.string().max(200).optional(),
}).strict();

// Reclassify a document (OPS-04): new artifact and/or level, with a reason. Open QC tasks are
// cancelled (a document in QC returns to Draft). A Final document also needs the user's
// password: the change is recorded as an attestation ("Reclassified, with reason").
export const POST = handle(async (req: Request, { params }: { params: Promise<{ documentId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "upload_document");
  const id = idParam((await params).documentId);
  const body = await parseBody(req, schema);
  const { data: doc, error } = await ctx.db.from("documents").select("id, status").eq("id", id).is("deleted_at", null).maybeSingle();
  if (error) throw dbError(error);
  if (!doc) throw notFound();
  const final = doc.status === "Approved" || doc.status === "Archived";
  if (final && !body.password) throw invalidRequest("Enter your password to reclassify a Final document");
  const proof = final ? await reauthenticate(ctx, body.password!, "reclassify", id) : null;
  const { data, error: rpcErr } = await ctx.db.rpc("reclassify_document", {
    p_document: id, p_artifact: body.artifact_num, p_country: body.study_country_id, p_site: body.study_site_id, p_reason: body.reason, p_reauth: proof,
  });
  if (rpcErr) throw dbError(rpcErr);
  return Response.json({ id, status: data });
});
