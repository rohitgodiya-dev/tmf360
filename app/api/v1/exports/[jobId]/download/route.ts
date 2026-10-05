import { writeAudit } from "@/lib/api/audit";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError, idParam } from "@/lib/api/db";
import { gone, handle, invalidRequest, notFound } from "@/lib/api/http";
import { serviceClient } from "@/lib/api/service";

const LINK_SECONDS = 300;

// A short-lived link to a finished export (EXP-04). Only someone who can see the job (RLS) gets one,
// only until the job expires, and every download is audited.
export const POST = handle(async (req: Request, { params }: { params: Promise<{ jobId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "view_document");
  const id = idParam((await params).jobId);
  const { data: job, error } = await ctx.db.from("export_jobs").select("id, kind, status, file_path, file_hash, expires_at, study_id, studies(study_id)").eq("id", id).maybeSingle();
  if (error) throw dbError(error);
  if (!job) throw notFound();
  if (job.status !== "done" || !job.file_path) throw invalidRequest("This export is not ready");
  if (!job.expires_at || Date.parse(job.expires_at) <= Date.now()) throw gone("This export has expired. Start a new one.");
  const studyCode = (job.studies as unknown as { study_id: string } | null)?.study_id ?? "study";
  const { data: signed } = await serviceClient().storage.from("exports").createSignedUrl(job.file_path, LINK_SECONDS, {
    download: `${studyCode.replace(/[^\w.-]/g, "_")}-${job.kind}-${job.id.slice(0, 8)}.zip`,
  });
  if (!signed) throw notFound("The export file could not be found");
  await writeAudit(ctx, { action: "Export downloaded", studyId: studyCode, field: `export_job:${job.id}`, newValue: `${job.kind} sha256 ${job.file_hash}` });
  return Response.json({ url: signed.signedUrl, expires_in: LINK_SECONDS, sha256: job.file_hash });
});
