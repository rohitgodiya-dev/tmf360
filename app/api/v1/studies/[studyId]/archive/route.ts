import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError, loadStudy } from "@/lib/api/db";
import { jobView, type ExportJob } from "@/lib/api/exporter";
import { handle } from "@/lib/api/http";
import { people } from "@/lib/api/qc";
import { effectiveRetention, type Policy } from "@/lib/api/retention";
import { hasPermission } from "@/lib/permissions";

// Archive & retention overview for one study (RET-01..05): close-out state, the retention policy in
// force and its period, legal holds, and the archive/transfer packages with their signatures.
export const GET = handle(async (req: Request, { params }: { params: Promise<{ studyId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "view_study");
  const ref = await loadStudy(ctx, (await params).studyId);
  const [study, policies, holds, jobs, sigs] = await Promise.all([
    ctx.db.from("studies").select("id, study_id, protocol, closed_at, closed_by, close_reason, marketing_authorisation_date").eq("id", ref.id).single(),
    ctx.db.from("retention_policies").select("id, study_id, start_trigger, years, start_date, notes, row_version").or(`study_id.is.null,study_id.eq.${ref.id}`).eq("org_id", ref.org_id),
    ctx.db.from("legal_holds").select("*").eq("org_id", ref.org_id).or(`study_id.is.null,study_id.eq.${ref.id}`).order("placed_at", { ascending: false }),
    ctx.db.from("export_jobs").select("*").eq("study_id", ref.id).in("kind", ["archive", "transfer"]).order("created_at", { ascending: false }),
    ctx.db.from("signature_events").select("id, action, meaning, signer_name, signed_at, export_job_id").eq("study_id", ref.id).order("signed_at", { ascending: false }),
  ]);
  for (const r of [study, policies, holds, jobs, sigs]) if (r.error) throw dbError(r.error);
  const all = (policies.data ?? []) as Policy[];
  const studyPolicy = all.find((p) => p.study_id === ref.id) ?? null;
  const orgPolicy = all.find((p) => p.study_id === null) ?? null;
  const who = await people(ctx);
  const name = (id: string | null) => (id ? who.get(id)?.name ?? "Former member" : null);
  const docIds = (holds.data ?? []).map((h) => h.document_id).filter(Boolean) as string[];
  const { data: docs } = docIds.length ? await ctx.db.from("documents").select("id, artifact_num, artifact_name, custom_file_name").in("id", docIds) : { data: [] };
  const title = new Map((docs ?? []).map((d) => [d.id, `${(d.custom_file_name || "").trim() || d.artifact_name} (${d.artifact_num})`]));
  const sigByJob = new Map((sigs.data ?? []).filter((s) => s.export_job_id).map((s) => [s.export_job_id, s]));

  return Response.json({
    study: { ...study.data, closed_by_name: name(study.data!.closed_by) },
    retention: { ...effectiveRetention(studyPolicy, orgPolicy, study.data!), study_policy: studyPolicy, org_policy: orgPolicy },
    holds: (holds.data ?? []).map((h) => ({ ...h, placed_by_name: name(h.placed_by), released_by_name: name(h.released_by), document_title: h.document_id ? title.get(h.document_id) ?? null : null })),
    packages: (await jobView(ctx, (jobs.data ?? []) as ExportJob[])).map((j) => ({ ...j, signature: sigByJob.get(j.id) ?? null })),
    lifecycle_signatures: (sigs.data ?? []).filter((s) => !s.export_job_id),
    can: {
      close: hasPermission(ctx.role, "invite_users"),
      retention: hasPermission(ctx.role, "invite_users"),
      hold: hasPermission(ctx.role, "run_quality_checks"),
      package: hasPermission(ctx.role, "invite_users") && hasPermission(ctx.role, "view_audit_trail"),
    },
  });
});
