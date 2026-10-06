"use client";
// Sponsor portfolio (Part 16): all studies side by side with completeness, risk, health and findings; lagging
// countries and sites most at risk across the portfolio; filters; drill-through to a study; Excel export.
// Health is shown as counts of red/amber indicators from the latest daily snapshot — never one merged score.
import { useEffect, useMemo, useState } from "react";
import { ApiClientError, apiFetch, authHeaders } from "../../lib/api/client";

type Status = "green" | "amber" | "red" | "none";
type Study = {
  id: string; study_id: string; protocol: string | null; phase: string | null; status: string | null; sponsor: string | null;
  closed: boolean; cros: string[]; country_codes: string[]; countries: number; sites_total: number; sites_active: number;
  target_enrollment: number; actual_enrollment: number; completeness: number | null; missing: number; risk: Status;
  open_findings: number; high_priority_findings: number; critical_missing: number | null; health: { red: number; amber: number; as_of: string | null };
};
type Country = { country_code: string; country_name: string; region: string; studies: number; sites_total: number; sites_active: number; actual_enrollment: number; target_enrollment: number; lowest_completeness: number | null; lowest_study: string | null };
type Site = { study_id: string; study_code: string; study_site_id: string; site_number: string; display_name: string; country_code: string; status: string; completeness: number | null; missing: number; high_priority_findings: number; open_findings: number };
type Portfolio = {
  totals: { studies: number; sites_active: number; sites_total: number; completeness: number | null; missing: number; critical_missing: number; high_priority_findings: number };
  thresholds: { amber: number; red: number };
  studies: Study[]; countries: Country[]; sites_at_risk: Site[];
};

const C = {
  orange: "#F97316", orangeLight: "#FFF7ED", text: "#111827", textSec: "#374151", textMuted: "#6B7280",
  border: "#E5EDF6", bg: "#F8FAFC", bgCard: "#FFFFFF", greenDark: "#065F46", greenLight: "#ECFDF5",
  amberDark: "#92400E", amberLight: "#FFFBEB", redDark: "#991B1B", redLight: "#FEF2F2", gray: "#4B5563", grayLight: "#F3F4F6",
};
const card: React.CSSProperties = { background: C.bgCard, border: `0.5px solid ${C.border}`, borderRadius: "12px", padding: "14px 16px" };
const btn = (bg: string, color: string): React.CSSProperties => ({ fontSize: "12px", fontWeight: 600, padding: "6px 12px", background: bg, color, border: `0.5px solid ${C.border}`, borderRadius: "8px", cursor: "pointer" });
const select: React.CSSProperties = { fontSize: "12px", padding: "6px 8px", border: `0.5px solid ${C.border}`, borderRadius: "8px", background: C.bgCard, fontFamily: "inherit" };
const th: React.CSSProperties = { textAlign: "left", padding: "8px 10px", fontSize: "11px", fontWeight: 600, color: C.textSec, whiteSpace: "nowrap" };
const td: React.CSSProperties = { padding: "8px 10px", fontSize: "12px", color: C.text, borderTop: `0.5px solid ${C.border}`, verticalAlign: "top" };
const RISK: Record<Status, { label: string; fg: string; bg: string }> = {
  green: { label: "Green", fg: C.greenDark, bg: C.greenLight }, amber: { label: "Amber", fg: C.amberDark, bg: C.amberLight },
  red: { label: "Red", fg: C.redDark, bg: C.redLight }, none: { label: "No data", fg: C.gray, bg: C.grayLight },
};
const badge = (s: Status) => <span style={{ fontSize: "10px", fontWeight: 600, padding: "3px 9px", borderRadius: "20px", color: RISK[s].fg, background: RISK[s].bg, whiteSpace: "nowrap" }}>{RISK[s].label}</span>;
const pct = (n: number | null) => (n == null ? "—" : `${Math.round(n)}%`);

export default function Portfolio({ onOpenStudy }: { onOpenStudy: (studyCode: string) => void }) {
  const [data, setData] = useState<Portfolio | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState("");
  const [risk, setRisk] = useState("");
  const [country, setCountry] = useState("");
  const [cro, setCro] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch<Portfolio>("/portfolio")
      .then((p) => { if (!cancelled) setData(p); })
      .catch((e) => { if (!cancelled) setError(e instanceof ApiClientError ? e.message : "Could not load the portfolio."); });
    return () => { cancelled = true; };
  }, []);

  const phases = useMemo(() => [...new Set((data?.studies ?? []).map((s) => s.phase).filter((x): x is string => !!x))].sort(), [data]);
  const cros = useMemo(() => [...new Set((data?.studies ?? []).flatMap((s) => s.cros))].sort(), [data]);
  const studies = useMemo(() => (data?.studies ?? []).filter((s) =>
    (!phase || s.phase === phase) && (!risk || s.risk === risk) && (!country || s.country_codes.includes(country)) && (!cro || s.cros.includes(cro))), [data, phase, risk, country, cro]);
  const shown = new Set(studies.map((s) => s.study_id));
  const filtered = !!(phase || risk || country || cro);

  async function exportXlsx() {
    setExporting(true); setExportMsg(null);
    try {
      const res = await fetch("/api/v1/portfolio?format=xlsx", { headers: await authHeaders() });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error?.message ?? "Export failed");
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url; a.download = `portfolio-${new Date().toISOString().slice(0, 10)}.xlsx`; a.click();
      URL.revokeObjectURL(url);
      setExportMsg("Portfolio downloaded. The export is recorded in the audit trail.");
    } catch (e) { setExportMsg((e as Error).message); } finally { setExporting(false); }
  }

  if (error) return <div style={{ padding: "1.25rem" }}><div role="alert" style={{ ...card, background: C.redLight, color: C.redDark, fontSize: "12px" }}>{error}</div></div>;
  if (!data) return <div style={{ padding: "1.25rem", fontSize: "12px", color: C.textMuted }}>Loading the portfolio…</div>;
  const t = data.totals;

  return (
    <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "16px", fontWeight: 600, color: C.text }}>Portfolio</div>
          <div style={{ fontSize: "12px", color: C.textMuted }}>All studies side by side. Risk follows completeness: green at {data.thresholds.amber}% or more, red below {data.thresholds.red}%.</div>
        </div>
        <button style={btn(C.bgCard, C.textSec)} onClick={exportXlsx} disabled={exporting || !data.studies.length}><i className="ti ti-file-spreadsheet" /> {exporting ? "Preparing…" : "Export to Excel"}</button>
      </div>
      {exportMsg && <div role="status" style={{ fontSize: "12px", color: C.textSec }}>{exportMsg}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "10px" }}>
        {[
          ["Studies", String(t.studies)],
          ["Active sites", `${t.sites_active} of ${t.sites_total}`],
          ["Overall completeness", pct(t.completeness)],
          ["Critical documents missing", String(t.critical_missing)],
          ["High-priority findings", String(t.high_priority_findings)],
        ].map(([k, v]) => (
          <div key={k} style={card}><div style={{ fontSize: "11px", color: C.textMuted }}>{k}</div><div style={{ fontSize: "20px", fontWeight: 600, color: C.text }}>{v}</div></div>
        ))}
      </div>

      {data.studies.length === 0 ? (
        <div style={{ ...card, textAlign: "center", padding: "2.5rem 1rem" }}>
          <i className="ti ti-briefcase" style={{ fontSize: "32px", color: C.textMuted }} />
          <div style={{ fontSize: "13px", fontWeight: 600, color: C.text, marginTop: "8px" }}>No studies found. Add your first study to get started.</div>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
            <select aria-label="Filter by phase" value={phase} onChange={(e) => setPhase(e.target.value)} style={select}><option value="">All phases</option>{phases.map((p) => <option key={p}>{p}</option>)}</select>
            <select aria-label="Filter by risk" value={risk} onChange={(e) => setRisk(e.target.value)} style={select}><option value="">All risk ratings</option>{(["red", "amber", "green", "none"] as Status[]).map((r) => <option key={r} value={r}>{RISK[r].label}</option>)}</select>
            <select aria-label="Filter by country" value={country} onChange={(e) => setCountry(e.target.value)} style={select}><option value="">All countries</option>{data.countries.map((c) => <option key={c.country_code} value={c.country_code}>{c.country_name}</option>)}</select>
            {cros.length > 0 && <select aria-label="Filter by CRO" value={cro} onChange={(e) => setCro(e.target.value)} style={select}><option value="">All CROs</option>{cros.map((c) => <option key={c}>{c}</option>)}</select>}
            {filtered && <button style={btn(C.bgCard, C.textSec)} onClick={() => { setPhase(""); setRisk(""); setCountry(""); setCro(""); }}>Clear filters</button>}
            <span style={{ fontSize: "11px", color: C.textMuted }}>{studies.length} of {data.studies.length} studies</span>
          </div>

          <div style={{ ...card, padding: 0, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr style={{ background: C.bg }}>{["Study", "Phase", "Countries", "Sites active", "Enrolled", "Completeness", "Risk", "Health", "Critical missing", "Findings", ""].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>
                {studies.map((s) => (
                  <tr key={s.id} style={{ cursor: "pointer" }} onClick={() => onOpenStudy(s.study_id)} title="Open this study's dashboard">
                    <td style={td}><b>{s.study_id}</b>{s.closed && <span style={{ fontSize: "10px", color: C.textMuted }}> · closed</span>}<div style={{ fontSize: "11px", color: C.textMuted, maxWidth: "260px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.protocol ?? ""}</div></td>
                    <td style={td}>{s.phase ?? "—"}</td>
                    <td style={td}>{s.countries}{s.country_codes.length > 0 && <div style={{ fontSize: "11px", color: C.textMuted }}>{s.country_codes.slice(0, 6).join(" ")}{s.country_codes.length > 6 ? " …" : ""}</div>}</td>
                    <td style={td}>{s.sites_active} / {s.sites_total}</td>
                    <td style={td}>{s.actual_enrollment}{s.target_enrollment ? ` / ${s.target_enrollment}` : ""}</td>
                    <td style={{ ...td, fontWeight: 600, color: RISK[s.risk].fg }}>{pct(s.completeness)}{s.missing > 0 && <div style={{ fontSize: "11px", fontWeight: 400, color: C.textMuted }}>{s.missing} missing</div>}</td>
                    <td style={td}>{badge(s.risk)}</td>
                    <td style={td}>{s.health.as_of ? <>
                      {s.health.red > 0 && <span style={{ color: C.redDark, fontWeight: 600 }}>{s.health.red} red </span>}
                      {s.health.amber > 0 && <span style={{ color: C.amberDark, fontWeight: 600 }}>{s.health.amber} amber</span>}
                      {s.health.red === 0 && s.health.amber === 0 && <span style={{ color: C.greenDark }}>All green</span>}
                      <div style={{ fontSize: "10px", color: C.textMuted }}>as of {s.health.as_of}</div></> : <span style={{ color: C.textMuted }}>No snapshot yet</span>}</td>
                    <td style={td}>{s.critical_missing ?? "—"}</td>
                    <td style={td}>{s.open_findings}{s.high_priority_findings > 0 && <span style={{ color: C.redDark }}> · {s.high_priority_findings} high</span>}</td>
                    <td style={td}><i className="ti ti-chevron-right" aria-hidden /></td>
                  </tr>
                ))}
                {studies.length === 0 && <tr><td style={{ ...td, color: C.textMuted }} colSpan={11}>No studies match these filters.</td></tr>}
              </tbody>
            </table>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: "14px" }}>
            <div style={{ ...card, padding: 0, overflowX: "auto" }}>
              <div style={{ padding: "12px 14px", fontSize: "13px", fontWeight: 600, color: C.text }}>Countries — lowest completeness first</div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr style={{ background: C.bg }}>{["Country", "Studies", "Sites active", "Enrolled", "Lowest completeness"].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {data.countries.map((c) => (
                    <tr key={c.country_code}>
                      <td style={td}><b>{c.country_name}</b><div style={{ fontSize: "11px", color: C.textMuted }}>{c.region}</div></td>
                      <td style={td}>{c.studies}</td>
                      <td style={td}>{c.sites_active} / {c.sites_total}</td>
                      <td style={td}>{c.actual_enrollment}{c.target_enrollment ? ` / ${c.target_enrollment}` : ""}</td>
                      <td style={td}>{pct(c.lowest_completeness)}{c.lowest_study && <span style={{ color: C.textMuted }}> ({c.lowest_study})</span>}</td>
                    </tr>
                  ))}
                  {data.countries.length === 0 && <tr><td style={{ ...td, color: C.textMuted }} colSpan={5}>No countries added to any study yet.</td></tr>}
                </tbody>
              </table>
            </div>
            <div style={{ ...card, padding: 0, overflowX: "auto" }}>
              <div style={{ padding: "12px 14px", fontSize: "13px", fontWeight: 600, color: C.text }}>Sites most at risk</div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr style={{ background: C.bg }}>{["Study", "Site", "Country", "Completeness", "Missing", "High-priority findings"].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {data.sites_at_risk.filter((s) => !filtered || shown.has(s.study_code)).map((s) => (
                    <tr key={s.study_site_id} style={{ cursor: "pointer" }} onClick={() => onOpenStudy(s.study_code)}>
                      <td style={td}>{s.study_code}</td>
                      <td style={td}><b>{s.site_number}</b> — {s.display_name}</td>
                      <td style={td}>{s.country_code}</td>
                      <td style={td}>{pct(s.completeness)}</td>
                      <td style={td}>{s.missing}</td>
                      <td style={{ ...td, color: s.high_priority_findings ? C.redDark : C.text }}>{s.high_priority_findings}</td>
                    </tr>
                  ))}
                  {data.sites_at_risk.length === 0 && <tr><td style={{ ...td, color: C.textMuted }} colSpan={6}>No sites need attention.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
