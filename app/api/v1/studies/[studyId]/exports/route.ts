import { z } from "zod";
import { requirePermission, requireUser } from "@/lib/api/auth";
import { inBackground } from "@/lib/api/background";
import { dbError, loadStudy } from "@/lib/api/db";
import { runEmsExport, type EmsOptions } from "@/lib/api/ems";
import { jobView, runZipExport, type ExportJob } from "@/lib/api/exporter";
import { handle, parseBody } from "@/lib/api/http";

// Building a package downloads every file, so allow the platform's long duration (EXP-04).
export const maxDuration = 300;

const schema = z.discriminatedUnion("format", [
  z.object({ format: z.literal("zip"), scope: z.enum(["final", "current"]).default("final") }).strict(),
  // MIG-09: TMF Reference Model Exchange Mechanism Standard package (exchange.xml + files).
  z.object({
    format: z.literal("ems"),
    scope: z.enum(["final", "current"]).default("final"),
    specification_id: z.string().trim().min(1, "Give the exchange agreement ID").max(200),
    event_id: z.string().trim().max(200).optional(),
    include_superseded: z.boolean().default(false),
  }).strict(),
]);

// The study's export jobs: the caller's own, or all of them for those who may see the audit trail.
export const GET = handle(async (req: Request, { params }: { params: Promise<{ studyId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "view_document");
  const study = await loadStudy(ctx, (await params).studyId);
  const { data, error } = await ctx.db.from("export_jobs").select("*").eq("study_id", study.id).order("created_at", { ascending: false }).limit(50);
  if (error) throw dbError(error);
  return Response.json({ data: await jobView(ctx, (data ?? []) as ExportJob[]) });
});

// EXP-02: ZIP of the study's documents in taxonomy folders with a metadata spreadsheet, built as a
// background job; the requester is emailed when it is ready (EXP-04).
export const POST = handle(async (req: Request, { params }: { params: Promise<{ studyId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "view_document");
  const study = await loadStudy(ctx, (await params).studyId);
  const raw: unknown = await req.json().catch(() => ({}));
  const body = await parseBody(new Request(req.url, { method: "POST", body: JSON.stringify({ format: "zip", ...(raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {}) }) }), schema);
  const label = body.format === "ems" ? `TMF exchange (${body.specification_id})` : body.scope === "final" ? "Final documents" : "All current documents";
  // Exchange packages are for TMF Leads and administrators (the database checks this too).
  if (body.format === "ems") requirePermission(ctx, "invite_users");
  const { format, ...options } = body;
  const { data: id, error } = await ctx.db.rpc("create_export_job", { p_study: study.id, p_kind: format, p_options: { ...options, label } });
  if (error) throw dbError(error);
  const { data: job, error: jErr } = await ctx.db.from("export_jobs").select("*").eq("id", id).single();
  if (jErr) throw dbError(jErr);
  if (format === "ems") await inBackground(() => runEmsExport(ctx, job as ExportJob & { options: EmsOptions }));
  else await inBackground(() => runZipExport(ctx, job as ExportJob));
  return Response.json({ id, status: "queued" }, { status: 202 });
});
