import { z } from "zod";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { inBackground } from "@/lib/api/background";
import { dbError, loadStudy } from "@/lib/api/db";
import { jobView, runZipExport, type ExportJob } from "@/lib/api/exporter";
import { handle, parseBody } from "@/lib/api/http";

// Building a package downloads every file, so allow the platform's long duration (EXP-04).
export const maxDuration = 300;

const schema = z.object({ scope: z.enum(["final", "current"]).default("final") }).strict();

// The study's export jobs: the caller's own, or all of them for those who may see the audit trail.
export const GET = handle(async (req: Request, { params }: { params: Promise<{ studyId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "view_document");
  const study = await loadStudy(ctx, (await params).studyId);
  const { data, error } = await ctx.db.from("export_jobs").select("*").eq("study_id", study.id).order("created_at", { ascending: false }).limit(50);
  if (error) throw dbError(error);
  return Response.json({ data: await jobView(ctx, (data ?? []) as ExportJob[]) });
});

// EXP-03: ZIP of the study's documents in taxonomy folders with a metadata spreadsheet, built as a
// background job; the requester is emailed when it is ready (EXP-04).
export const POST = handle(async (req: Request, { params }: { params: Promise<{ studyId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "view_document");
  const study = await loadStudy(ctx, (await params).studyId);
  const { scope } = await parseBody(req, schema);
  const { data: id, error } = await ctx.db.rpc("create_export_job", {
    p_study: study.id, p_kind: "zip", p_options: { scope, label: scope === "final" ? "Final documents" : "All current documents" },
  });
  if (error) throw dbError(error);
  const { data: job, error: jErr } = await ctx.db.from("export_jobs").select("*").eq("id", id).single();
  if (jErr) throw dbError(jErr);
  await inBackground(() => runZipExport(ctx, job as ExportJob));
  return Response.json({ id, status: "queued" }, { status: 202 });
});
