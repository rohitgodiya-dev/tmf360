// Part 11b — Reports (M13 RPT-03/04). Each report is built as the signed-in user (RLS applies),
// for one study and a date range, and comes out as an Excel workbook. Grouping by taxonomy uses the
// taxonomy version each record is classified under, never fixed zone or section codes.
import type { RequestContext } from "./auth";
import type { StudyRef } from "./db";
import { dbError } from "./db";
import { people } from "./qc";
import type { Cell, Sheet } from "../xlsx";

export const REPORTS = {
  "document-activities": { title: "Document Activities", description: "Every audited action on the study's documents: who, what, when, old and new values, reason." },
  "user-management": { title: "User Management Audit Trail", description: "Roles added, changed or removed, users invited or deactivated, study membership and access grants (organisation-wide)." },
  timeliness: { title: "Timeliness", description: "Intake-to-filing and filing-to-Final durations against the thresholds, plus expiry tracking." },
  rejected: { title: "Rejected", description: "QC rejections with their reasons, reviewer, comment and signature." },
  "study-management": { title: "Study Management", description: "Changes to the study's countries, sites, contacts, milestones, parties and expected documents." },
  "feature-management": { title: "Feature Management", description: "Configuration changes: TMF configuration, file plan, QC reasons, health thresholds, plan template, inspection sessions, risk and retention settings." },
} as const;
export type ReportKey = keyof typeof REPORTS;

/** Audit-trail reports need view_audit_trail; timeliness and rejections are document views. */
export const reportPermission = (key: ReportKey) =>
  (key === "timeliness" || key === "rejected" ? "view_document" : "view_audit_trail") as "view_document" | "view_audit_trail";

/** Timeliness thresholds (RSK-05 defaults); Part 11d makes them configurable per organisation. */
export const THRESHOLDS = { indexing_days: 5, processing_days: 30 };

const MAX_ROWS = 50000;
type Range = { from: string; to: string };   // ISO dates, inclusive
const endOf = (to: string) => new Date(Date.parse(`${to}T00:00:00Z`) + 86400000).toISOString();
const startOf = (from: string) => `${from}T00:00:00Z`;

type AuditRow = { created_at: string; user_email: string | null; action: string; document_id: string | null; document_name: string | null;
  study_id: string | null; field_changed: string | null; old_value: string | null; new_value: string | null; signature_reason: string | null; sequence_no: number | null };
const AUDIT_COLS = "created_at, user_email, action, document_id, document_name, study_id, field_changed, old_value, new_value, signature_reason, sequence_no";

/** Zone and section names for every taxonomy version, keyed "<version>|<num>". */
async function taxonomyNames(ctx: RequestContext) {
  const [zones, sections] = await Promise.all([
    ctx.db.from("taxonomy_zones").select("version_id, zone_num, name"),
    ctx.db.from("taxonomy_sections").select("version_id, section_num, name"),
  ]);
  if (zones.error) throw dbError(zones.error);
  if (sections.error) throw dbError(sections.error);
  return {
    zone: new Map((zones.data ?? []).map((z) => [`${z.version_id}|${z.zone_num}`, z.name as string])),
    section: new Map((sections.data ?? []).map((s) => [`${s.version_id}|${s.section_num}`, s.name as string])),
  };
}

type DocInfo = { id: string; artifact_num: string | null; artifact_name: string | null; custom_file_name: string | null; status: string | null;
  study_country_id: string | null; study_site_id: string | null; created_at: string; approved_at: string | null; effective_date: string | null; expiry_date: string | null;
  owner: string | null; file_name: string | null; version: string | null; file_hash: string | null; file_path: string | null;
  taxonomy_artifacts: { version_id: string; zone_num: string; section_num: string } | null };
export const DOC_COLS = "id, artifact_num, artifact_name, custom_file_name, status, study_country_id, study_site_id, created_at, approved_at, effective_date, expiry_date, owner, file_name, version, file_hash, file_path, taxonomy_artifacts(version_id, zone_num, section_num)";

/** Taxonomy placement of a document: zone and section number + name from its own taxonomy version. */
export async function placement(ctx: RequestContext) {
  const names = await taxonomyNames(ctx);
  return (d: Pick<DocInfo, "artifact_num" | "taxonomy_artifacts">) => {
    const t = d.taxonomy_artifacts;
    const zone = t?.zone_num ?? d.artifact_num?.split(".")[0] ?? "";
    const section = t?.section_num ?? (d.artifact_num?.split(".").slice(0, 2).join(".") ?? "");
    return {
      zone, zone_name: t ? names.zone.get(`${t.version_id}|${t.zone_num}`) ?? "" : "",
      section, section_name: t ? names.section.get(`${t.version_id}|${t.section_num}`) ?? "" : "",
    };
  };
}

async function studyDocs(ctx: RequestContext, study: StudyRef): Promise<DocInfo[]> {
  const { data, error } = await ctx.db.from("documents").select(DOC_COLS)
    .eq("org_id", study.org_id).eq("study_id", study.study_id).limit(MAX_ROWS);
  if (error) throw dbError(error);
  return (data ?? []) as unknown as DocInfo[];
}

async function audit(ctx: RequestContext, range: Range, filter: (q: any) => any): Promise<AuditRow[]> { // eslint-disable-line @typescript-eslint/no-explicit-any
  const q = ctx.db.from("audit_trail").select(AUDIT_COLS).gte("created_at", startOf(range.from)).lt("created_at", endOf(range.to));
  const { data, error } = await filter(q).order("created_at").order("sequence_no").limit(MAX_ROWS);
  if (error) throw dbError(error);
  return (data ?? []) as AuditRow[];
}

const auditSheet = (name: string, rows: AuditRow[], extra?: (r: AuditRow) => Cell[], extraCols: string[] = []): Sheet => ({
  name,
  columns: ["Time (UTC)", "User", "Action", ...extraCols, "Field / record", "Old value", "New value", "Reason", "Audit sequence"],
  rows: rows.map((r) => [new Date(r.created_at), r.user_email ?? "System", r.action, ...(extra?.(r) ?? []), r.field_changed, r.old_value, r.new_value, r.signature_reason, r.sequence_no]),
});

const days = (a: string | null | undefined, b: string | null | undefined) => {
  if (!a || !b) return null;
  const ms = Date.parse(b) - Date.parse(a);
  return Number.isFinite(ms) ? Math.round((ms / 86400000) * 10) / 10 : null;
};
const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round(((s[m - 1] + s[m]) / 2) * 10) / 10;
};

const summary = (title: string, study: StudyRef, range: Range, rows: [string, Cell][]): Sheet => ({
  name: "Summary",
  columns: ["Item", "Value"],
  rows: [["Report", title], ["Study", study.study_id], ["From", range.from], ["To", range.to], ["Generated (UTC)", new Date()], ...rows],
});

const USER_ACTIONS = ["User role added", "User role changed", "User role removed", "User deactivated", "User reactivated", "Study member added", "Study member changed",
  "Study member deactivated", "Study member removed", "Study access granted", "Study access revoked", "Study access removed", "User invited", "Invitation accepted",
  "Password reset by administrator", "Signature re-authentication failed"];
const STUDY_TABLES = ["study_countries", "study_sites", "study_parties", "contact_roles", "milestones", "placeholders"];
const FEATURE_TABLES = ["tmf_config", "workflow_settings", "file_plan_steps", "qc_reasons", "health_thresholds", "plan_template_items", "inspection_sessions", "risk_factor_settings", "retention_policies", "legal_holds"];
const FEATURE_ACTIONS = ["TMF config disabled", "TMF config enabled", "TMF config name edited", "TMF config reset to DIA standard", "Custom zone added", "Custom artifact added", "Custom sub-artifact added", "TMF artifact locked", "TMF artifact unlocked"];
const likeAny = (prefixes: string[]) => prefixes.map((t) => `action.like.${t}.*`).join(",");

export async function buildReport(ctx: RequestContext, study: StudyRef, key: ReportKey, range: Range): Promise<Sheet[]> {
  const title = REPORTS[key].title;
  if (key === "document-activities") {
    const [rows, docs, place] = await Promise.all([
      audit(ctx, range, (q) => q.eq("org_id", study.org_id).eq("study_id", study.study_id).not("document_id", "is", null)),
      studyDocs(ctx, study), placement(ctx),
    ]);
    const doc = new Map(docs.map((d) => [d.id, d]));
    const byAction = new Map<string, number>();
    for (const r of rows) byAction.set(r.action, (byAction.get(r.action) ?? 0) + 1);
    return [
      summary(title, study, range, [["Activities", rows.length], ...[...byAction.entries()].sort((a, b) => b[1] - a[1]).map(([a, n]) => [a, n] as [string, Cell])]),
      auditSheet("Activities", rows, (r) => {
        const d = r.document_id ? doc.get(r.document_id) : undefined;
        const p = d ? place(d) : null;
        return [r.document_name ?? (d ? (d.custom_file_name || "").trim() || d.artifact_name : ""), d?.artifact_num ?? "", p ? `${p.zone} ${p.zone_name}`.trim() : "", p ? `${p.section} ${p.section_name}`.trim() : ""];
      }, ["Document", "Artifact", "Zone", "Section"]),
    ];
  }
  if (key === "user-management") {
    const rows = await audit(ctx, range, (q) => q.eq("org_id", study.org_id).in("action", USER_ACTIONS));
    return [summary(title, study, range, [["Scope", "Organisation-wide (user accounts are not study-specific)"], ["Changes", rows.length]]),
      auditSheet("User management", rows, (r) => [r.study_id ?? ""], ["Study"])];
  }
  if (key === "study-management") {
    const rows = await audit(ctx, range, (q) => q.eq("org_id", study.org_id).eq("study_id", study.study_id).or(likeAny(STUDY_TABLES)));
    return [summary(title, study, range, [["Changes", rows.length]]), auditSheet("Study changes", rows)];
  }
  if (key === "feature-management") {
    const rows = await audit(ctx, range, (q) => q.eq("org_id", study.org_id).or(`${likeAny(FEATURE_TABLES)},action.in.(${FEATURE_ACTIONS.map((a) => `"${a}"`).join(",")})`));
    return [summary(title, study, range, [["Scope", "Organisation-wide settings and this study's configuration"], ["Changes", rows.length]]),
      auditSheet("Configuration changes", rows, (r) => [r.study_id ?? "All studies"], ["Study"])];
  }
  if (key === "rejected") {
    const docs = await studyDocs(ctx, study);
    const ids = docs.map((d) => d.id);
    const doc = new Map(docs.map((d) => [d.id, d]));
    const [decisions, reasons, who, place] = await Promise.all([
      ids.length ? ctx.db.from("qc_decisions").select("document_id, outcome, reason_codes, comment, decided_by, decided_at, signature_event_id")
        .eq("outcome", "reject").in("document_id", ids).gte("decided_at", startOf(range.from)).lt("decided_at", endOf(range.to)).order("decided_at").limit(MAX_ROWS)
        : Promise.resolve({ data: [], error: null }),
      ctx.db.from("qc_reasons").select("code, label").eq("org_id", study.org_id),
      people(ctx), placement(ctx),
    ]);
    if (decisions.error) throw dbError(decisions.error);
    if (reasons.error) throw dbError(reasons.error);
    const label = new Map((reasons.data ?? []).map((r) => [r.code, r.label as string]));
    const byReason = new Map<string, number>();
    const rows = (decisions.data ?? []).map((q) => {
      const d = doc.get(q.document_id)!;
      const p = place(d);
      const rs = (q.reason_codes as string[]).map((c) => label.get(c) ?? c);
      for (const r of rs) byReason.set(r, (byReason.get(r) ?? 0) + 1);
      return [new Date(q.decided_at), (d.custom_file_name || "").trim() || d.artifact_name, d.artifact_num, `${p.zone} ${p.zone_name}`.trim(), `${p.section} ${p.section_name}`.trim(),
        rs.join("; "), q.comment, who.get(q.decided_by)?.name ?? "Former member", q.signature_event_id ? "Signed (password re-entered)" : ""] as Cell[];
    });
    return [
      summary(title, study, range, [["Rejections", rows.length], ...[...byReason.entries()].sort((a, b) => b[1] - a[1]).map(([r, n]) => [`Reason: ${r}`, n] as [string, Cell])]),
      { name: "Rejections", columns: ["Rejected (UTC)", "Document", "Artifact", "Zone", "Section", "Reasons", "Comment", "Reviewer", "Signature"], rows },
    ];
  }
  // Timeliness (RPT-04): intake → filed (indexing), filed → Final (processing), expiry.
  const docs = (await studyDocs(ctx, study)).filter((d) => d.status !== "Deleted");
  const ids = docs.map((d) => d.id);
  const [intake, place, thresholds] = await Promise.all([
    ids.length ? ctx.db.from("intake_items").select("filed_document_id, created_at").in("filed_document_id", ids) : Promise.resolve({ data: [], error: null }),
    placement(ctx), timelinessThresholds(ctx, study.org_id),
  ]);
  if (intake.error) throw dbError(intake.error);
  const received = new Map((intake.data ?? []).map((i) => [i.filed_document_id as string, i.created_at as string]));
  const inRange = docs.filter((d) => d.created_at >= startOf(range.from).slice(0, 10) && d.created_at < endOf(range.to));
  const idx: number[] = [], proc: number[] = [];
  let idxOver = 0, procOver = 0;
  const rows = inRange.map((d) => {
    const filed = d.created_at.endsWith("Z") || d.created_at.includes("+") ? d.created_at : `${d.created_at}Z`;
    const rec = received.get(d.id) ?? null;
    const fin = d.status === "Approved" && d.approved_at ? d.approved_at : null;
    const iDays = days(rec, filed);
    const pDays = days(filed, fin ?? (d.status === "Approved" ? null : new Date().toISOString()));
    if (iDays != null) { idx.push(iDays); if (iDays > thresholds.indexing_days) idxOver++; }
    if (pDays != null && fin) { proc.push(pDays); }
    if (pDays != null && pDays > thresholds.processing_days) procOver++;
    const p = place(d);
    return [(d.custom_file_name || "").trim() || d.artifact_name, d.artifact_num, `${p.zone} ${p.zone_name}`.trim(), `${p.section} ${p.section_name}`.trim(), d.status === "Approved" ? "Final" : d.status,
      rec ? new Date(rec) : "", new Date(filed), fin ? new Date(fin) : "", iDays, iDays != null && iDays > thresholds.indexing_days ? "Over" : "",
      pDays, fin ? "" : "Open", pDays != null && pDays > thresholds.processing_days ? "Over" : ""] as Cell[];
  });
  const today = new Date().toISOString().slice(0, 10);
  const in90 = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
  const expiry = docs.filter((d) => d.status === "Approved" && d.expiry_date && /^\d{4}-\d{2}-\d{2}$/.test(d.expiry_date) && d.expiry_date <= in90)
    .sort((a, b) => a.expiry_date!.localeCompare(b.expiry_date!))
    .map((d) => [(d.custom_file_name || "").trim() || d.artifact_name, d.artifact_num, d.owner, d.expiry_date, d.expiry_date! < today ? "Expired" : "Expires within 90 days",
      days(`${today}T00:00:00Z`, `${d.expiry_date}T00:00:00Z`)] as Cell[]);
  return [
    summary(title, study, range, [
      ["Indexing threshold (days)", thresholds.indexing_days], ["Processing threshold (days)", thresholds.processing_days],
      ["Documents filed in range", inRange.length], ["Median intake → filed (days)", median(idx)], ["Over indexing threshold", idxOver],
      ["Median filed → Final (days)", median(proc)], ["Over processing threshold (incl. still open)", procOver],
      ["Expired or expiring within 90 days", expiry.length],
    ]),
    { name: "Durations", columns: ["Document", "Artifact", "Zone", "Section", "Status", "Received in intake (UTC)", "Filed (UTC)", "Final (UTC)",
      "Intake → filed (days)", "Indexing", "Filed → Final or today (days)", "Still open", "Processing"], rows },
    { name: "Expiry", columns: ["Document", "Artifact", "Owner", "Expiry date", "State", "Days from today"], rows: expiry },
  ];
}

/** Indexing/processing thresholds: the organisation's risk settings when present (Part 11d), else the defaults. */
export async function timelinessThresholds(ctx: RequestContext, orgId: string) {
  const { data } = await ctx.db.from("risk_settings").select("indexing_days, processing_days").eq("org_id", orgId).maybeSingle();
  return { indexing_days: Number(data?.indexing_days ?? THRESHOLDS.indexing_days), processing_days: Number(data?.processing_days ?? THRESHOLDS.processing_days) };
}
