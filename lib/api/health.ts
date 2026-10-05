// TMF Health & Inspection Readiness (Part 9, M19 HLT-01..06): indicators grouped by dimension, shown side
// by side and never merged into one score; every indicator has a stated status rule and every amber/red
// states its cause. Works with a user client (RLS applies) or the service client (daily job).
import type { SupabaseClient } from "@supabase/supabase-js";
import { completeness, TILES } from "./navigator";

export type Status = "green" | "amber" | "red";
export type Indicator = { key: string; label: string; value: number | null; unit: string; status: Status | "none"; cause: string | null; rule: string };
export type Dimension = { key: string; label: string; indicators: Indicator[] };
type Direction = "higher_better" | "lower_better";

/** Indicator definitions with default thresholds (amber/red); organisations override them in health_thresholds. */
export const INDICATORS: Record<string, { label: string; dimension: string; unit: string; direction: Direction; amber: number; red: number }> = {
  completeness: { label: "Completeness", dimension: "completeness", unit: "%", direction: "higher_better", amber: 80, red: 60 },
  critical_missing: { label: "Critical expected records missing", dimension: "completeness", unit: "", direction: "lower_better", amber: 0, red: 5 },
  overdue_placeholders: { label: "Overdue expected artifacts", dimension: "completeness", unit: "", direction: "lower_better", amber: 0, red: 5 },
  filing_delay_median: { label: "Filing delay (median)", dimension: "timeliness", unit: " days", direction: "lower_better", amber: 14, red: 30 },
  filing_delay_over: { label: "Filed later than 30 days", dimension: "timeliness", unit: "%", direction: "lower_better", amber: 10, red: 25 },
  overdue_tasks: { label: "Overdue QC tasks", dimension: "timeliness", unit: "", direction: "lower_better", amber: 0, red: 5 },
  qc_rejection_rate: { label: "QC rejection rate (90 days)", dimension: "quality", unit: "%", direction: "lower_better", amber: 10, red: 25 },
  expired_records: { label: "Expired records", dimension: "quality", unit: "", direction: "lower_better", amber: 0, red: 3 },
  unverified_files: { label: "Final files not integrity-verified", dimension: "quality", unit: "", direction: "lower_better", amber: 0, red: 2 },
  high_priority_findings: { label: "High-priority findings (priority 12+)", dimension: "risk", unit: "", direction: "lower_better", amber: 0, red: 3 },
  open_findings: { label: "Open findings", dimension: "open_issues", unit: "", direction: "lower_better", amber: 5, red: 20 },
  open_queries: { label: "Open queries", dimension: "open_issues", unit: "", direction: "lower_better", amber: 3, red: 10 },
  metadata_issues: { label: "Unresolved metadata issues", dimension: "open_issues", unit: "", direction: "lower_better", amber: 0, red: 3 },
};
export const DIMENSIONS: { key: string; label: string }[] = [
  { key: "completeness", label: "Completeness" }, { key: "timeliness", label: "Timeliness" }, { key: "quality", label: "Quality" },
  { key: "risk", label: "Risk" }, { key: "open_issues", label: "Open issues" },
];
const METADATA_RULES = ["RUL-DATE-ORDER", "RUL-FUTURE-EFFECTIVE", "RUL-DUPLICATE-FINAL"];

export function judge(key: string, value: number | null, t: { amber: number; red: number }): Pick<Indicator, "status" | "cause" | "rule"> {
  const d = INDICATORS[key];
  const fmt = (n: number) => `${Math.round(n * 10) / 10}${d.unit}`;
  const rule = d.direction === "higher_better"
    ? `Green at ${fmt(t.amber)} or more; amber below ${fmt(t.amber)}; red below ${fmt(t.red)}`
    : `Green at ${fmt(t.amber)} or less; amber above ${fmt(t.amber)}; red above ${fmt(t.red)}`;
  if (value == null) return { status: "none", cause: null, rule };
  if (d.direction === "higher_better") {
    if (value < t.red) return { status: "red", cause: `${d.label} is ${fmt(value)}, below the red threshold of ${fmt(t.red)}.`, rule };
    if (value < t.amber) return { status: "amber", cause: `${d.label} is ${fmt(value)}, below the target of ${fmt(t.amber)}.`, rule };
    return { status: "green", cause: null, rule };
  }
  if (value > t.red) return { status: "red", cause: `${d.label} is ${fmt(value)}, above the red threshold of ${fmt(t.red)}.`, rule };
  if (value > t.amber) return { status: "amber", cause: `${d.label} is ${fmt(value)}, above the target of ${fmt(t.amber)}.`, rule };
  return { status: "green", cause: null, rule };
}

type Study = { id: string; study_id: string; org_id: string };
type NavRow = { nav_status: string; artifact_num: string | null; study_country_id: string | null; study_site_id: string | null };
type FindingRow = { rule_code: string; priority: number; study_country_id: string | null; study_site_id: string | null };

async function all<T>(q: (from: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < 50000; from += 1000) {
    const { data, error } = await q(from);
    if (error) throw error;
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export async function studyHealth(db: SupabaseClient, study: Study) {
  const since90 = new Date(Date.now() - 90 * 86400000).toISOString();
  const since180 = new Date(Date.now() - 180 * 86400000).toISOString();
  const [nav, findings, core, docs, decisions, queries, thresholds] = await Promise.all([
    all<NavRow>((f) => db.from("navigator_items").select("nav_status, artifact_num, study_country_id, study_site_id")
      .eq("org_id", study.org_id).eq("study_code", study.study_id).eq("is_historical", false).range(f, f + 999)),
    all<FindingRow>((f) => db.from("findings").select("rule_code, priority, study_country_id, study_site_id").eq("study_id", study.id).eq("status", "open").range(f, f + 999)),
    db.from("tmf_config").select("artifact_num").eq("org_id", study.org_id).eq("study_id", study.study_id).eq("type", "artifact").eq("classification", "Core"),
    db.from("documents").select("created_at, effective_date").eq("org_id", study.org_id).eq("study_id", study.study_id).is("deleted_at", null).gte("created_at", since180),
    db.from("qc_decisions").select("outcome, reason_codes, document_tasks!inner(study_id)").eq("document_tasks.study_id", study.id).gte("decided_at", since90),
    db.from("document_queries").select("id", { count: "exact", head: true }).eq("org_id", study.org_id).eq("study_id", study.study_id).eq("status", "Open"),
    db.from("health_thresholds").select("indicator, amber, red").eq("org_id", study.org_id),
  ]);
  for (const r of [core, docs, decisions, thresholds]) if (r.error) throw r.error;
  const coreSet = new Set((core.data ?? []).map((a) => a.artifact_num));
  const custom = new Map((thresholds.data ?? []).map((t) => [t.indicator, { amber: Number(t.amber), red: Number(t.red) }]));

  const counts = (rows: NavRow[]) => Object.fromEntries(TILES.map((t) => [t, rows.filter((r) => r.nav_status === t).length])) as Record<string, number>;
  const countFindings = (rows: FindingRow[], code: string) => rows.filter((f) => f.rule_code === code).length;

  const delays = (docs.data ?? []).map((d) => {
    const eff = /^\d{4}-\d{2}-\d{2}$/.test(d.effective_date ?? "") ? Date.parse(d.effective_date) : NaN;
    return Number.isNaN(eff) ? null : Math.max(0, Math.floor((Date.parse(d.created_at) - eff) / 86400000));
  }).filter((x): x is number => x != null);
  const decided = decisions.data ?? [];
  const rejected = decided.filter((d) => d.outcome === "reject");
  const byReason = new Map<string, number>();
  for (const r of rejected) for (const c of r.reason_codes as string[]) byReason.set(c, (byReason.get(c) ?? 0) + 1);

  const values: Record<string, number | null> = {
    completeness: completeness(counts(nav)),
    critical_missing: nav.filter((r) => r.nav_status === "Missing" && r.artifact_num && coreSet.has(r.artifact_num)).length,
    overdue_placeholders: countFindings(findings, "RUL-MISSING-OVERDUE"),
    filing_delay_median: median(delays),
    filing_delay_over: delays.length ? Math.round((delays.filter((d) => d > 30).length / delays.length) * 1000) / 10 : null,
    overdue_tasks: countFindings(findings, "RUL-QC-OVERDUE"),
    qc_rejection_rate: decided.length ? Math.round((rejected.length / decided.length) * 1000) / 10 : null,
    expired_records: countFindings(findings, "RUL-EXPIRED-DOC"),
    unverified_files: countFindings(findings, "RUL-UNVERIFIED-FILE"),
    high_priority_findings: findings.filter((f) => Number(f.priority) >= 12).length,
    open_findings: findings.length,
    open_queries: queries.error ? null : queries.count ?? 0,
    metadata_issues: findings.filter((f) => METADATA_RULES.includes(f.rule_code)).length,
  };

  const dimensions: Dimension[] = DIMENSIONS.map((dim) => ({
    ...dim,
    indicators: Object.entries(INDICATORS).filter(([, d]) => d.dimension === dim.key).map(([key, d]) => {
      const t = custom.get(key) ?? { amber: d.amber, red: d.red };
      return { key, label: d.label, value: values[key], unit: d.unit, ...judge(key, values[key], t) };
    }),
  }));

  // Drill-down (HLT-04): the same indicators per country and site.
  const [countries, sites] = await Promise.all([
    db.from("study_countries").select("id, country_code").eq("study_id", study.id).order("country_code"),
    db.from("study_sites").select("id, study_country_id, site_number, display_name, status").eq("study_id", study.id).order("site_number"),
  ]);
  const scopeRow = (label: string, level: string, id: string, navRows: NavRow[], fRows: FindingRow[]) => ({
    id, level, label,
    completeness: completeness(counts(navRows)),
    missing: navRows.filter((r) => r.nav_status === "Missing").length,
    expected: navRows.filter((r) => r.nav_status === "Expected").length,
    expired: countFindings(fRows, "RUL-EXPIRED-DOC"),
    overdue_tasks: countFindings(fRows, "RUL-QC-OVERDUE"),
    open_findings: fRows.length,
    high_priority: fRows.filter((f) => Number(f.priority) >= 12).length,
  });
  const scopes = [
    scopeRow(study.study_id, "study", study.id, nav, findings),
    ...(countries.data ?? []).flatMap((c) => [
      scopeRow(c.country_code, "country", c.id, nav.filter((r) => r.study_country_id === c.id), findings.filter((f) => f.study_country_id === c.id)),
      ...(sites.data ?? []).filter((s) => s.study_country_id === c.id).map((s) =>
        scopeRow(`${s.site_number} — ${s.display_name}${s.status === "ongoing" ? " (active)" : ""}`, "site", s.id,
          nav.filter((r) => r.study_site_id === s.id), findings.filter((f) => f.study_site_id === s.id))),
    ]),
  ];

  return { dimensions, values, scopes, rejection_reasons: Object.fromEntries(byReason) };
}
