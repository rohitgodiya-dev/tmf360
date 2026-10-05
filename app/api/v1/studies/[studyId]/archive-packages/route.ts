import { z } from "zod";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { inBackground } from "@/lib/api/background";
import { dbError, loadStudy, reason } from "@/lib/api/db";
import { runArchiveExport, type ExportJob } from "@/lib/api/exporter";
import { handle, parseBody } from "@/lib/api/http";
import { password, reauthenticate } from "@/lib/api/qc";

export const maxDuration = 300;

const schema = z.object({
  kind: z.enum(["archive", "transfer"]),
  recipient: z.string().trim().max(300).optional(),
  reason,
  password,
}).strict();

// End-of-study archive or transfer package (RET-04/05), approved with an electronic signature
// ("Archive package approved") and built in the background: every file version, metadata and its
// history, audit trail, signatures, QC decisions and a manifest of SHA-256 hashes.
export const POST = handle(async (req: Request, { params }: { params: Promise<{ studyId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "invite_users");
  requirePermission(ctx, "view_audit_trail");
  const study = await loadStudy(ctx, (await params).studyId);
  const body = await parseBody(req, schema);
  const proof = await reauthenticate(ctx, body.password, "archive_approval", null);
  const { data: id, error } = await ctx.db.rpc("create_archive_job", {
    p_study: study.id, p_kind: body.kind, p_recipient: body.recipient ?? null, p_reason: body.reason, p_reauth: proof,
  });
  if (error) throw dbError(error);
  const { data: job, error: jErr } = await ctx.db.from("export_jobs").select("*").eq("id", id).single();
  if (jErr) throw dbError(jErr);
  await inBackground(() => runArchiveExport(ctx, job as ExportJob));
  return Response.json({ id, status: "queued" }, { status: 202 });
});
