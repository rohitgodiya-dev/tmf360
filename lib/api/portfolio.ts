// Sponsor portfolio (Part 16): every study the caller can see, side by side, with country and site rollups.
// Completeness and open findings are live; the health dimensions come from the latest daily snapshot (HLT-06)
// and are shown as counts of red/amber indicators, never merged into one score (HLT-02). Runs as the caller.
import type { SupabaseClient } from "@supabase/supabase-js";
import { dbError } from "./db";
import { INDICATORS, judge } from "./health";
import type { Cell, Sheet } from "../xlsx";

type Status = "green" | "amber" | "red" | "none";
export type PortfolioStudy = {
  id: string; study_id: string; protocol: string | null; phase: string | null; status: string | null; sponsor: string | null;
  closed: boolean; cros: string[]; country_codes: string[];
  countries: number; sites_total: number; sites_active: number; target_enrollment: number; actual_enrollment: number;
  completeness: number | null; missing: number; risk: Status;
  open_findings: number; high_priority_findings: number;
  critical_missing: number | null; health: { red: number; amber: number; as_of: string | null };
};
export type PortfolioCountry = {
  country_code: string; country_name: string; region: string; studies: number; sites_total: number; sites_active: number;
  actual_enrollment: number; target_enrollment: number; lowest_completeness: number | null; lowest_study: string | null;
};
export type PortfolioSite = {
  study_id: string; study_code: string; study_site_id: string; site_number: string; display_name: string; country_code: string;
  status: string; completeness: number | null; missing: number; high_priority_findings: number; open_findings: number;
};
export type Portfolio = {
  totals: { studies: number; sites_active: number; sites_total: number; completeness: number | null; missing: number; critical_missing: number; high_priority_findings: number };
  thresholds: { amber: number; red: number };
  studies: PortfolioStudy[];
  countries: PortfolioCountry[];
  sites_at_risk: PortfolioSite[];
};

type Comp = { study_code: string; study_country_id: string | null; study_site_id: string | null; final_count: number; missing_count: number; total_count: number };
type Finding = { study_id: string; study_site_id: string | null; priority: number };

async function all<T>(q: (from: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < 100000; from += 1000) {
    const { data, error } = await q(from);
    if (error) throw dbError(error as never);
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}
const pct = (final: number, total: number) => (total ? Math.round((final / total) * 1000) / 10 : null);
const sum = (rows: Comp[]) => rows.reduce((a, r) => ({ f: a.f + r.final_count, m: a.m + r.missing_count, t: a.t + r.total_count }), { f: 0, m: 0, t: 0 });

export async function portfolio(db: SupabaseClient, orgId: string): Promise<Portfolio> {
  const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const [studies, countries, sites, parties, thresholds] = await Promise.all([
    db.from("studies").select("id, study_id, protocol, phase, status, sponsor, closed_at").eq("org_id", orgId).order("study_id"),
    db.from("study_country_summary").select("*").eq("org_id", orgId),
    db.from("study_sites").select("id, study_id, study_country_id, site_number, display_name, status").eq("org_id", orgId),
    db.from("study_parties").select("study_id, role, party:parties(name)").eq("org_id", orgId).eq("role", "cro"),
    db.from("health_thresholds").select("indicator, amber, red").eq("org_id", orgId),
  ]);
  for (const r of [studies, countries, sites, parties, thresholds]) if (r.error) throw dbError(r.error);
  const [comp, findings, snaps] = await Promise.all([
    all<Comp>((f) => db.from("structure_completeness").select("study_code, study_country_id, study_site_id, final_count, missing_count, total_count").eq("org_id", orgId).range(f, f + 999)),
    all<Finding>((f) => db.from("findings").select("study_id, study_site_id, priority").eq("org_id", orgId).eq("status", "open").range(f, f + 999)),
    all<{ study_id: string; taken_on: string; indicators: Record<string, number | null> }>((f) =>
      db.from("health_snapshots").select("study_id, taken_on, indicators").eq("org_id", orgId).gte("taken_on", since).order("taken_on", { ascending: false }).range(f, f + 999)),
  ]);

  const custom = new Map((thresholds.data ?? []).map((t) => [t.indicator, { amber: Number(t.amber), red: Number(t.red) }]));
  const th = (k: string) => custom.get(k) ?? { amber: INDICATORS[k].amber, red: INDICATORS[k].red };
  const latest = new Map<string, (typeof snaps)[number]>();
  for (const s of snaps) if (!latest.has(s.study_id)) latest.set(s.study_id, s);
  const cros = new Map<string, string[]>();
  for (const p of (parties.data ?? []) as unknown as { study_id: string; party: { name: string } | null }[]) {
    if (p.party) cros.set(p.study_id, [...(cros.get(p.study_id) ?? []), p.party.name]);
  }
  const countryRows = countries.data ?? [];
  const siteRows = sites.data ?? [];

  const out: PortfolioStudy[] = (studies.data ?? []).map((s) => {
    const sc = countryRows.filter((c) => c.study_id === s.id);
    const c = sum(comp.filter((r) => r.study_code === s.study_id));
    const fs = findings.filter((f) => f.study_id === s.id);
    const snap = latest.get(s.id);
    let red = 0, amber = 0;
    if (snap) for (const k of Object.keys(INDICATORS)) {
      const st = judge(k, snap.indicators[k] ?? null, th(k)).status;
      if (st === "red") red++; else if (st === "amber") amber++;
    }
    const completeness = pct(c.f, c.t);
    return {
      id: s.id, study_id: s.study_id, protocol: s.protocol, phase: s.phase, status: s.status, sponsor: s.sponsor,
      closed: !!s.closed_at, cros: cros.get(s.id) ?? [], country_codes: sc.map((x) => x.country_code).sort(),
      countries: sc.length,
      sites_total: sc.reduce((n, x) => n + x.sites_total, 0), sites_active: sc.reduce((n, x) => n + x.sites_active, 0),
      target_enrollment: sc.reduce((n, x) => n + x.target_enrollment, 0), actual_enrollment: sc.reduce((n, x) => n + x.actual_enrollment, 0),
      completeness, missing: c.m, risk: judge("completeness", completeness, th("completeness")).status,
      open_findings: fs.length, high_priority_findings: fs.filter((f) => Number(f.priority) >= 12).length,
      critical_missing: snap?.indicators.critical_missing ?? null,
      health: { red, amber, as_of: snap?.taken_on ?? null },
    };
  });
  const studyById = new Map(out.map((s) => [s.id, s]));

  // Countries across studies: where the portfolio is lagging.
  const byCountry = new Map<string, PortfolioCountry>();
  for (const c of countryRows) {
    const study = studyById.get(c.study_id);
    if (!study) continue;
    const cc = sum(comp.filter((r) => r.study_country_id === c.study_country_id));
    const p = pct(cc.f, cc.t);
    const cur = byCountry.get(c.country_code) ?? { country_code: c.country_code, country_name: c.country_name, region: c.region, studies: 0,
      sites_total: 0, sites_active: 0, actual_enrollment: 0, target_enrollment: 0, lowest_completeness: null, lowest_study: null };
    cur.studies++; cur.sites_total += c.sites_total; cur.sites_active += c.sites_active;
    cur.actual_enrollment += c.actual_enrollment; cur.target_enrollment += c.target_enrollment;
    if (p != null && (cur.lowest_completeness == null || p < cur.lowest_completeness)) { cur.lowest_completeness = p; cur.lowest_study = study.study_id; }
    byCountry.set(c.country_code, cur);
  }

  // Sites most at risk: high-priority findings first, then lowest completeness. Active or qualifying sites only.
  const countryCode = new Map(countryRows.map((c) => [c.study_country_id, c.country_code]));
  const sitesAtRisk: PortfolioSite[] = siteRows
    .filter((s) => studyById.has(s.study_id) && !["closed", "deactivated"].includes(s.status))
    .map((s) => {
      const c = sum(comp.filter((r) => r.study_site_id === s.id));
      const fs = findings.filter((f) => f.study_site_id === s.id);
      return { study_id: s.study_id, study_code: studyById.get(s.study_id)!.study_id, study_site_id: s.id, site_number: s.site_number,
        display_name: s.display_name, country_code: countryCode.get(s.study_country_id) ?? "", status: s.status,
        completeness: pct(c.f, c.t), missing: c.m, high_priority_findings: fs.filter((f) => Number(f.priority) >= 12).length, open_findings: fs.length };
    })
    .filter((s) => s.high_priority_findings > 0 || s.missing > 0 || (s.completeness != null && s.completeness < th("completeness").amber))
    .sort((a, b) => b.high_priority_findings - a.high_priority_findings || (a.completeness ?? 101) - (b.completeness ?? 101) || b.missing - a.missing)
    .slice(0, 20);

  const codes = new Set(out.map((s) => s.study_id));
  const all_ = sum(comp.filter((r) => codes.has(r.study_code)));
  return {
    totals: {
      studies: out.length,
      sites_active: out.reduce((n, s) => n + s.sites_active, 0), sites_total: out.reduce((n, s) => n + s.sites_total, 0),
      completeness: pct(all_.f, all_.t), missing: all_.m,
      critical_missing: out.reduce((n, s) => n + (s.critical_missing ?? 0), 0),
      high_priority_findings: out.reduce((n, s) => n + s.high_priority_findings, 0),
    },
    thresholds: th("completeness"),
    studies: out,
    countries: [...byCountry.values()].sort((a, b) => (a.lowest_completeness ?? 101) - (b.lowest_completeness ?? 101) || a.country_name.localeCompare(b.country_name)),
    sites_at_risk: sitesAtRisk,
  };
}

const RISK_LABEL: Record<Status, string> = { green: "Green", amber: "Amber", red: "Red", none: "No data" };

export function portfolioSheets(p: Portfolio): Sheet[] {
  const studies: Cell[][] = p.studies.map((s) => [
    s.study_id, s.protocol, s.phase, s.status, s.sponsor, s.cros.join(", "), s.countries, s.country_codes.join(" "),
    s.sites_active, s.sites_total, s.actual_enrollment, s.target_enrollment, s.completeness, s.missing, s.critical_missing,
    RISK_LABEL[s.risk], s.health.red, s.health.amber, s.health.as_of, s.open_findings, s.high_priority_findings,
  ]);
  return [
    { name: "Studies", columns: ["Study", "Protocol", "Phase", "Status", "Sponsor", "CROs", "Countries", "Country codes", "Sites active", "Sites total",
      "Enrolled", "Target", "Completeness %", "Missing", "Critical missing", "Risk", "Health red", "Health amber", "Health as of", "Open findings", "High-priority findings"], rows: studies },
    { name: "Countries", columns: ["Country", "Code", "Region", "Studies", "Sites active", "Sites total", "Enrolled", "Target", "Lowest completeness %", "Lowest study"],
      rows: p.countries.map((c) => [c.country_name, c.country_code, c.region, c.studies, c.sites_active, c.sites_total, c.actual_enrollment, c.target_enrollment, c.lowest_completeness, c.lowest_study]) },
    { name: "Sites at risk", columns: ["Study", "Site", "Name", "Country", "Status", "Completeness %", "Missing", "High-priority findings", "Open findings"],
      rows: p.sites_at_risk.map((s) => [s.study_code, s.site_number, s.display_name, s.country_code, s.status, s.completeness, s.missing, s.high_priority_findings, s.open_findings]) },
  ];
}
