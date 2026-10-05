// Part 11d — explainable risk scoring (M14 RSK-01..05, OVS-01..03).
// Artifact risk = Σ (factor weight × risk events) × artifact impact (Core 3, Recommended 2, other 1).
// Every score is returned with the factors and counts that produced it; no score stands alone.
import type { RequestContext } from "./auth";
import { dbError, type StudyRef } from "./db";
import { placement } from "./reports";

export const BASE_FACTORS = {
  missing_artifact: { category: "completeness", label: "Missing artifact", default: 3 },
  late_indexing: { category: "timeliness", label: "Late indexing", default: 1 },
  late_processing: { category: "timeliness", label: "Late processing", default: 1 },
} as const;
export const QC_DEFAULT_WEIGHT = 1;

type Event = { factor: string; category: string; artifact_num: string | null; artifact_name: string | null; document_id: string | null; placeholder_id: string | null;
  intake_id: string | null; study_country_id: string | null; study_site_id: string | null; owner: string | null; days: number; detail: string };
export type Factor = { factor: string; category: string; label: string; weight: number; default_weight: number; configured: boolean };
type Contribution = { factor: string; label: string; count: number; weight: number; points: number };
type Node = { key: string; label: string; score: number; artifacts: number; factors: Contribution[] };

const round1 = (n: number) => Math.round(n * 10) / 10;
const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export async function riskSettings(ctx: RequestContext, orgId: string) {
  const [settings, weights, reasons] = await Promise.all([
    ctx.db.from("risk_settings").select("indexing_days, processing_days").eq("org_id", orgId).maybeSingle(),
    ctx.db.from("risk_factor_weights").select("factor, weight").eq("org_id", orgId),
    ctx.db.from("qc_reasons").select("code, label, is_active").eq("org_id", orgId),
  ]);
  for (const r of [settings, weights, reasons]) if (r.error) throw dbError(r.error);
  const set = new Map((weights.data ?? []).map((w) => [w.factor as string, Number(w.weight)]));
  const thresholds = { indexing_days: settings.data?.indexing_days ?? 5, processing_days: settings.data?.processing_days ?? 30 };
  const factors: Factor[] = [
    ...Object.entries(BASE_FACTORS).map(([k, f]) => ({
      factor: k, category: f.category, default_weight: f.default, weight: set.get(k) ?? f.default, configured: set.has(k),
      label: k === "late_indexing" ? `${f.label} (over ${thresholds.indexing_days} days)` : k === "late_processing" ? `${f.label} (over ${thresholds.processing_days} days)` : f.label,
    })),
    ...(reasons.data ?? []).map((r) => ({
      factor: `qc:${r.code}`, category: "quality", label: `QC: ${r.label}`, default_weight: QC_DEFAULT_WEIGHT,
      weight: set.get(`qc:${r.code}`) ?? QC_DEFAULT_WEIGHT, configured: set.has(`qc:${r.code}`),
    })),
  ];
  return { thresholds, factors };
}

export async function riskModel(ctx: RequestContext, study: StudyRef) {
  const [{ thresholds, factors }, events, config, sites, countries, place] = await Promise.all([
    riskSettings(ctx, study.org_id),
    ctx.db.rpc("risk_events", { p_study: study.id }),
    ctx.db.from("tmf_config").select("artifact_num, classification").eq("org_id", study.org_id).eq("study_id", study.study_id).eq("type", "artifact"),
    ctx.db.from("study_sites").select("id, site_number, display_name").eq("study_id", study.id),
    ctx.db.from("study_countries").select("id, country_code").eq("study_id", study.id),
    placement(ctx),
  ]);
  for (const r of [events, config, sites, countries]) if (r.error) throw dbError(r.error);
  const evs = (events.data ?? []) as Event[];
  const factor = new Map(factors.map((f) => [f.factor, f]));
  const impactOf = new Map((config.data ?? []).map((c) => [c.artifact_num as string, c.classification === "Core" ? 3 : c.classification === "Recommended" ? 2 : 1]));
  const site = new Map((sites.data ?? []).map((s) => [s.id, `${s.site_number} ${s.display_name}`]));
  const country = new Map((countries.data ?? []).map((c) => [c.id, c.country_code as string]));

  // Artifact instances: the same artifact at a different location is scored separately.
  type Inst = { key: string; artifact_num: string; artifact_name: string; country: string | null; site: string | null; owner: string | null;
    zone: string; section: string; impact: number; counts: Map<string, number>; events: Event[] };
  const insts = new Map<string, Inst>();
  for (const e of evs) {
    const f = factor.get(e.factor);
    if (!f || f.weight === 0) continue;   // 0 disables a factor (RSK-02)
    const art = e.artifact_num ?? "Unclassified";
    const key = `${art}|${e.study_site_id ?? ""}|${e.study_country_id ?? ""}`;
    let i = insts.get(key);
    if (!i) {
      const p = place({ artifact_num: e.artifact_num, taxonomy_artifacts: null });
      i = { key, artifact_num: art, artifact_name: e.artifact_name ?? "", owner: e.owner,
        country: e.study_country_id ? country.get(e.study_country_id) ?? null : null, site: e.study_site_id ? site.get(e.study_site_id) ?? null : null,
        zone: p.zone, section: p.section, impact: impactOf.get(art) ?? 1, counts: new Map(), events: [] };
      insts.set(key, i);
    }
    i.counts.set(e.factor, (i.counts.get(e.factor) ?? 0) + 1);
    i.events.push(e);
  }
  const contributions = (counts: Map<string, number>) => [...counts.entries()].map(([k, n]) => {
    const f = factor.get(k)!;
    return { factor: k, label: f.label, count: n, weight: f.weight, points: round1(f.weight * n) };
  }).sort((a, b) => b.points - a.points);

  const artifacts = [...insts.values()].map((i) => {
    const factors = contributions(i.counts);
    const raw = factors.reduce((s, c) => s + c.points, 0);
    return {
      key: i.key, artifact_num: i.artifact_num, artifact_name: i.artifact_name, location: i.site ? `Site ${i.site}` : i.country ? `Country ${i.country}` : "Study",
      country: i.country, site: i.site, owner: i.owner, zone: i.zone, section: i.section, impact: i.impact, score: round1(raw * i.impact),
      factors, explanation: `${factors.map((c) => `${c.count} × ${c.label} (weight ${c.weight})`).join(" + ")}, × impact ${i.impact}${i.impact === 3 ? " (Core)" : i.impact === 2 ? " (Recommended)" : ""}`,
      events: i.events.map((e) => ({ factor: e.factor, detail: e.detail, document_id: e.document_id, placeholder_id: e.placeholder_id, days: e.days })),
    };
  }).sort((a, b) => b.score - a.score);

  const roll = (keyOf: (a: (typeof artifacts)[number]) => string | null, labelOf: (k: string) => string): Node[] => {
    const m = new Map<string, { score: number; artifacts: number; counts: Map<string, number> }>();
    for (const a of artifacts) {
      const k = keyOf(a) ?? "-";
      const n = m.get(k) ?? { score: 0, artifacts: 0, counts: new Map() };
      n.score += a.score; n.artifacts++;
      for (const c of a.factors) n.counts.set(c.factor, (n.counts.get(c.factor) ?? 0) + c.count);
      m.set(k, n);
    }
    return [...m.entries()].map(([k, n]) => ({ key: k, label: labelOf(k), score: round1(n.score), artifacts: n.artifacts, factors: contributions(n.counts) }))
      .sort((a, b) => b.score - a.score);
  };

  // OVS-03: the study-level explanation in words, with counts.
  const missing = evs.filter((e) => e.factor === "missing_artifact");
  const critical = missing.filter((e) => (impactOf.get(e.artifact_num ?? "") ?? 1) === 3).length;
  const rejections = evs.filter((e) => e.factor.startsWith("qc:"));
  const topReason = [...rejections.reduce((m, e) => m.set(e.factor, (m.get(e.factor) ?? 0) + 1), new Map<string, number>()).entries()].sort((a, b) => b[1] - a[1])[0];
  const lateIdx = evs.filter((e) => e.factor === "late_indexing");
  const lateProc = evs.filter((e) => e.factor === "late_processing");
  const explanation = [
    `${missing.length} expected artifact${missing.length === 1 ? "" : "s"} missing (${critical} Core), ${missing.filter((e) => e.days > 0).length} overdue`,
    `${rejections.length} QC rejection reason${rejections.length === 1 ? "" : "s"}${topReason ? `, most often "${factor.get(topReason[0])?.label.replace(/^QC: /, "")}" (${topReason[1]})` : ""}`,
    `${lateIdx.length} document${lateIdx.length === 1 ? "" : "s"} indexed late${lateIdx.length ? `, median ${median(lateIdx.map((e) => e.days))} days from intake to filing` : ""}`,
    `${lateProc.length} document${lateProc.length === 1 ? "" : "s"} late to Final${lateProc.length ? `, median ${median(lateProc.map((e) => e.days))} days` : ""}`,
  ];

  return {
    thresholds, factors,
    total: round1(artifacts.reduce((s, a) => s + a.score, 0)),
    explanation,
    artifacts,
    rollups: {
      zone: roll((a) => a.zone, (k) => `Zone ${k}`),
      section: roll((a) => a.section, (k) => `Section ${k}`),
      country: roll((a) => a.country, (k) => (k === "-" ? "Study level" : k)),
      site: roll((a) => a.site, (k) => (k === "-" ? "Not site-specific" : `Site ${k}`)),
      owner: roll((a) => a.owner, (k) => (k === "-" ? "No owner" : k)),
    },
  };
}
