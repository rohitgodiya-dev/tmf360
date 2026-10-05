import { requirePermission, requireUser } from "@/lib/api/auth";
import { dbError, loadStudy } from "@/lib/api/db";
import { handle, invalidRequest } from "@/lib/api/http";
import { people } from "@/lib/api/qc";

// Prioritized findings (HLT-05/08): what, where, why it matters (explanation), suggested action, and the
// priority with every factor that produced it. ?status=open (default) | accepted | resolved;
// optional ?site= / ?country= / ?rule= to drill down.
export const GET = handle(async (req: Request, { params }: { params: Promise<{ studyId: string }> }) => {
  const ctx = await requireUser(req);
  requirePermission(ctx, "view_document");
  const study = await loadStudy(ctx, (await params).studyId);
  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? "open";
  if (!["open", "accepted", "resolved"].includes(status)) throw invalidRequest("Unknown status");

  let q = ctx.db.from("findings").select("*").eq("study_id", study.id).eq("status", status);
  for (const [param, col] of [["site", "study_site_id"], ["country", "study_country_id"], ["rule", "rule_code"]] as const) {
    const v = url.searchParams.get(param);
    if (v) q = q.eq(col, v);
  }
  const [findings, rules, sites, countries] = await Promise.all([
    q.order("priority", { ascending: false }).order("first_seen_at").limit(500),
    ctx.db.from("rules").select("code, version, name, dimension, severity, description, suggested_action"),
    ctx.db.from("study_sites").select("id, site_number, display_name").eq("study_id", study.id),
    ctx.db.from("study_countries").select("id, country_code").eq("study_id", study.id),
  ]);
  for (const r of [findings, rules, sites, countries]) if (r.error) throw dbError(r.error);
  const rule = new Map((rules.data ?? []).map((r) => [r.code, r]));
  const site = new Map((sites.data ?? []).map((s) => [s.id, `${s.site_number} — ${s.display_name}`]));
  const country = new Map((countries.data ?? []).map((c) => [c.id, c.country_code]));
  const who = await people(ctx);
  const name = (id: string | null) => (id ? who.get(id)?.name ?? "Former member" : null);

  return Response.json({
    data: (findings.data ?? []).map((f) => {
      const r = rule.get(f.rule_code);
      return {
        id: f.id, rule_code: f.rule_code, rule_version: f.rule_version, rule_name: r?.name ?? f.rule_code,
        dimension: r?.dimension, severity: r?.severity, why: r?.description, suggested_action: r?.suggested_action,
        explanation: f.explanation, where: f.study_site_id ? `Site ${site.get(f.study_site_id) ?? ""}` : f.study_country_id ? `Country ${country.get(f.study_country_id) ?? ""}` : "Study",
        artifact_num: f.artifact_num, document_id: f.document_id, placeholder_id: f.placeholder_id, task_id: f.task_id,
        study_site_id: f.study_site_id, study_country_id: f.study_country_id,
        priority: Number(f.priority),
        factors: { criticality: Number(f.criticality), severity: Number(f.severity_weight), overdue: Number(f.overdue_factor), overdue_days: f.overdue_days, scope: Number(f.scope_factor), scope_count: f.scope_count },
        status: f.status, first_seen_at: f.first_seen_at, last_seen_at: f.last_seen_at, resolved_at: f.resolved_at,
        accepted_by: name(f.accepted_by), accepted_reason: f.accepted_reason, assigned_to: f.assigned_to, assigned_to_name: name(f.assigned_to),
      };
    }),
    people: [...who.values()].map((p) => ({ user_id: p.user_id, name: p.name, role: p.role })),
  });
});
