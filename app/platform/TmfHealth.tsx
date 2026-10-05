"use client";
// TMF Health & Inspection Readiness (Part 9, M19). Five dimensions side by side — never one merged score
// (HLT-02); every amber/red states its cause; drill-down by country and site (HLT-04); prioritized
// findings with their factors shown (HLT-05/08); trend from daily snapshots (HLT-06). Always current:
// the server re-runs the rules when anything changed since the last evaluation.
import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api/client";

type Indicator = { key: string; label: string; value: number | null; unit: string; status: "green" | "amber" | "red" | "none"; cause: string | null; rule: string };
type Scope = { id: string; level: "study" | "country" | "site"; label: string; completeness: number | null; missing: number; expected: number; expired: number; overdue_tasks: number; open_findings: number; high_priority: number };
type Health = {
  evaluated_at: string | null;
  dimensions: { key: string; label: string; indicators: Indicator[] }[];
  scopes: Scope[];
  rejection_reasons: Record<string, number>;
  trend: { taken_on: string; indicators: Record<string, number | null> }[];
};
type Finding = {
  id: string; rule_code: string; rule_version: number; rule_name: string; dimension: string; severity: string; why: string; suggested_action: string;
  explanation: string; where: string; artifact_num: string | null; document_id: string | null; placeholder_id: string | null; task_id: string | null;
  study_site_id: string | null; priority: number;
  factors: { criticality: number; severity: number; overdue: number; overdue_days: number; scope: number; scope_count: number };
  status: string; first_seen_at: string; resolved_at: string | null; accepted_by: string | null; accepted_reason: string | null;
  assigned_to: string | null; assigned_to_name: string | null;
};

const C = {
  orange: "#F97316", orangeLight: "#FFF7ED", text: "#111827", textSec: "#374151", textMuted: "#6B7280",
  border: "#E5EDF6", bg: "#F8FAFC", bgCard: "#FFFFFF", green: "#10B981", greenDark: "#065F46", greenLight: "#ECFDF5",
  amber: "#F59E0B", amberDark: "#92400E", amberLight: "#FFFBEB", red: "#EF4444", redDark: "#991B1B", redLight: "#FEF2F2", none: "#D1D5DB",
};
const card: React.CSSProperties = { background: C.bgCard, border: `0.5px solid ${C.border}`, borderRadius: "12px", padding: "14px 16px" };
const btn = (bg: string, color: string): React.CSSProperties => ({ fontSize: "12px", fontWeight: 600, padding: "6px 12px", background: bg, color, border: `0.5px solid ${C.border}`, borderRadius: "8px", cursor: "pointer" });
const input: React.CSSProperties = { fontSize: "12px", padding: "6px 8px", border: `0.5px solid ${C.border}`, borderRadius: "8px", fontFamily: "inherit", boxSizing: "border-box", background: C.bgCard };
const DOT = { green: C.green, amber: C.amber, red: C.red, none: C.none };
const fmtVal = (i: Indicator) => (i.value == null ? "—" : `${Math.round(i.value * 10) / 10}${i.unit}`);
const pct = (n: number | null) => (n == null ? "—" : `${Math.round(n)}%`);
const band = (p: number) => (p >= 12 ? { label: "High", fg: C.redDark, bg: C.redLight } : p >= 4 ? { label: "Medium", fg: C.amberDark, bg: C.amberLight } : { label: "Low", fg: C.textSec, bg: C.bg });

function csvCell(v: unknown) {
  const s = v == null ? "" : String(v);
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** A tiny trend line for one indicator across the daily snapshots. */
function Spark({ values, color }: { values: (number | null)[]; color: string }) {
  const pts = values.map((v, i) => [i, v] as const).filter((p): p is readonly [number, number] => p[1] != null);
  if (pts.length < 2) return <span style={{ fontSize: "10px", color: C.textMuted }}>Trend appears after two daily snapshots</span>;
  const max = Math.max(...pts.map((p) => p[1]), 1), min = Math.min(...pts.map((p) => p[1]), 0), w = 160, h = 32;
  const xy = pts.map(([i, v]) => `${(i / (values.length - 1)) * w},${h - ((v - min) / (max - min || 1)) * h}`).join(" ");
  return <svg width={w} height={h} role="img" aria-label="trend"><polyline points={xy} fill="none" stroke={color} strokeWidth="2" /></svg>;
}

export default function TmfHealth({ study, canAccept, canAssign, onOpenDocument }: {
  study: { id: string; study_id: string }; canAccept: boolean; canAssign: boolean; onOpenDocument: (documentId: string) => void;
}) {
  const [health, setHealth] = useState<Health | null>(null);
  const [findings, setFindings] = useState<Finding[] | null>(null);
  const [people, setPeople] = useState<{ user_id: string; name: string; role: string }[]>([]);
  const [tab, setTab] = useState<"open" | "accepted" | "resolved">("open");
  const [siteFilter, setSiteFilter] = useState<Scope | null>(null);
  const [reloads, setReloads] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch<Health>(`/studies/${study.id}/health`).then((h) => { if (!cancelled) setHealth(h); }).catch((e) => { if (!cancelled) setError((e as Error).message); });
    return () => { cancelled = true; };
  }, [study.id, reloads]);

  useEffect(() => {
    if (!health) return;   // findings are listed after the health call has brought them up to date
    let cancelled = false;
    const q = new URLSearchParams({ status: tab, ...(siteFilter ? { [siteFilter.level]: siteFilter.id } : {}) });
    apiFetch<{ data: Finding[]; people: { user_id: string; name: string; role: string }[] }>(`/studies/${study.id}/findings?${q}`)
      .then((r) => { if (!cancelled) { setFindings(r.data); setPeople(r.people); } })
      .catch((e) => { if (!cancelled) setError((e as Error).message); });
    return () => { cancelled = true; };
  }, [study.id, health, tab, siteFilter]);

  async function assess() {
    setBusy(true); setError(""); setNotice("");
    try {
      const r = await apiFetch<{ open_findings: number }>(`/studies/${study.id}/health/assessment`, { method: "POST" });
      setNotice(`Assessment complete: ${r.open_findings} open finding${r.open_findings === 1 ? "" : "s"}.`);
      setFindings(null); setReloads((n) => n + 1);
    } catch (e) { setError((e as Error).message); }
    setBusy(false);
  }
  async function act(fn: () => Promise<unknown>, msg: string) {
    setBusy(true); setError("");
    try { await fn(); setNotice(msg); setAccepting(null); setReason(""); setFindings(null); setReloads((n) => n + 1); }
    catch (e) { setError((e as Error).message); }
    setBusy(false);
  }
  function exportCsv() {
    if (!findings?.length) return;
    const head = ["Priority", "Band", "Rule", "Rule version", "Dimension", "Where", "Artifact", "What", "Why it matters", "Suggested action", "Criticality", "Severity", "Overdue factor", "Overdue days", "Scope", "Status", "Assigned to", "First seen"];
    const lines = findings.map((f) => [f.priority, band(f.priority).label, f.rule_name, f.rule_version, f.dimension, f.where, f.artifact_num, f.explanation, f.why, f.suggested_action,
      f.factors.criticality, f.factors.severity, f.factors.overdue, f.factors.overdue_days, f.factors.scope, f.status, f.assigned_to_name, f.first_seen_at].map(csvCell).join(","));
    const url = URL.createObjectURL(new Blob([[head.join(","), ...lines].join("\n")], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = `${study.study_id.replace(/[^\w.-]/g, "_")}-readiness-findings.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  if (!health) return <div style={{ fontSize: "12px", color: error ? C.redDark : C.textMuted }}>{error || "Checking the TMF…"}</div>;
  const trend = (key: string) => health.trend.map((t) => t.indicators[key] ?? null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "8px", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 700, color: C.text }}>TMF Health & Readiness — {study.study_id}</h1>
          <p style={{ fontSize: "12px", color: C.textMuted, marginTop: "2px" }}>
            Checked against {health.dimensions.reduce((n, d) => n + d.indicators.length, 0)} indicators and the readiness rules
            {health.evaluated_at ? `, last at ${new Date(health.evaluated_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}` : ""}. Re-checked automatically whenever the TMF changes.
          </p>
        </div>
        <button onClick={assess} disabled={busy} style={btn(C.orange, "#fff")}><i className="ti ti-player-play" /> {busy ? "Running…" : "Run readiness assessment"}</button>
      </div>
      {notice && <div role="status" style={{ fontSize: "12px", padding: "8px 12px", borderRadius: "8px", background: C.greenLight, color: C.greenDark }}>{notice}</div>}
      {error && <div role="alert" style={{ fontSize: "12px", padding: "8px 12px", borderRadius: "8px", background: C.redLight, color: C.redDark }}>{error}</div>}

      {/* Five dimensions side by side (HLT-02) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "10px" }}>
        {health.dimensions.map((d) => {
          const worst = d.indicators.some((i) => i.status === "red") ? "red" : d.indicators.some((i) => i.status === "amber") ? "amber" : "green";
          return (
            <div key={d.key} style={{ ...card, borderTop: `3px solid ${DOT[worst]}` }}>
              <div style={{ fontSize: "13px", fontWeight: 700, color: C.text, marginBottom: "8px" }}>{d.label}</div>
              {d.indicators.map((i) => (
                <div key={i.key} style={{ padding: "5px 0", borderTop: `0.5px solid ${C.bg}` }} title={i.rule}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span aria-label={i.status} style={{ width: "8px", height: "8px", borderRadius: "50%", background: DOT[i.status], flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: "11px", color: C.textSec }}>{i.label}</span>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: C.text }}>{fmtVal(i)}</span>
                  </div>
                  {i.cause && <div style={{ fontSize: "10px", color: i.status === "red" ? C.redDark : C.amberDark, marginLeft: "14px" }}>{i.cause}</div>}
                </div>
              ))}
              {d.key === "quality" && Object.keys(health.rejection_reasons).length > 0 && (
                <div style={{ fontSize: "10px", color: C.textMuted, marginTop: "4px" }}>
                  Rejections by reason: {Object.entries(health.rejection_reasons).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k.replace(/_/g, " ")} ${v}`).join(" · ")}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Trend (HLT-06) and drill-down (HLT-04) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "10px" }}>
        <div style={card}>
          <div style={{ fontSize: "13px", fontWeight: 700, color: C.text, marginBottom: "8px" }}>Trend (daily)</div>
          {[["completeness", "Completeness", C.green], ["open_findings", "Open findings", C.orange], ["overdue_tasks", "Overdue QC tasks", C.red]].map(([k, label, color]) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "4px 0" }}>
              <span style={{ fontSize: "11px", color: C.textSec, width: "120px" }}>{label}</span>
              <Spark values={trend(k)} color={color} />
            </div>
          ))}
        </div>
        <div style={{ ...card, padding: 0, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
            <thead><tr style={{ background: C.bg, borderBottom: `0.5px solid ${C.border}` }}>
              {["Study / country / site", "Complete", "Missing", "Expected", "Expired", "Overdue QC", "Findings", "High"].map((h) => <th key={h} style={{ textAlign: h.startsWith("Study") ? "left" : "right", padding: "8px 10px", color: C.textSec, fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {health.scopes.map((s) => {
                const on = siteFilter?.id === s.id;
                return (
                  <tr key={s.id} style={{ borderBottom: `0.5px solid ${C.bg}`, background: on ? C.orangeLight : "transparent" }}>
                    <td style={{ padding: "6px 10px", paddingLeft: `${10 + (s.level === "country" ? 12 : s.level === "site" ? 24 : 0)}px`, fontWeight: s.level === "study" ? 700 : 400 }}>
                      {s.level === "study" ? s.label : (
                        <button onClick={() => { setSiteFilter(on ? null : s); setFindings(null); }} title="Show this scope's findings"
                          style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer", color: on ? C.orange : C.text, fontSize: "11px", textAlign: "left" }}>{s.label}</button>
                      )}
                    </td>
                    {[pct(s.completeness), s.missing, s.expected, s.expired, s.overdue_tasks, s.open_findings, s.high_priority].map((v, i) => (
                      <td key={i} style={{ padding: "6px 10px", textAlign: "right", color: (i === 6 || i === 3) && Number(v) > 0 ? C.redDark : C.textSec, fontWeight: (i === 6 || i === 3) && Number(v) > 0 ? 700 : 400 }}>{v}</td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Prioritized findings (HLT-05/08) */}
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "10px" }}>
          <div style={{ fontSize: "13px", fontWeight: 700, color: C.text, flex: 1 }}>
            Findings{siteFilter ? ` — ${siteFilter.label}` : ""} {siteFilter && <button onClick={() => { setSiteFilter(null); setFindings(null); }} style={{ ...btn(C.bgCard, C.textMuted), padding: "2px 8px", fontSize: "10px" }}>Show all</button>}
          </div>
          <div style={{ display: "flex", border: `0.5px solid ${C.border}`, borderRadius: "8px", overflow: "hidden" }}>
            {(["open", "accepted", "resolved"] as const).map((k) => (
              <button key={k} onClick={() => { setTab(k); setFindings(null); }} style={{ fontSize: "11px", padding: "6px 12px", border: "none", cursor: "pointer", textTransform: "capitalize",
                background: tab === k ? C.orangeLight : C.bgCard, color: tab === k ? C.orange : C.textSec, fontWeight: tab === k ? 600 : 400 }}>{k}</button>
            ))}
          </div>
          <button onClick={exportCsv} disabled={!findings?.length} style={{ ...btn(C.bgCard, C.textSec), opacity: findings?.length ? 1 : 0.5 }}><i className="ti ti-download" /> Export report</button>
        </div>
        <div style={{ fontSize: "10px", color: C.textMuted, marginBottom: "8px" }}>
          Priority = record criticality (Core 3, Recommended 2, other 1) × rule severity (high 3, medium 2, low 1) × overdue (1 + days/30, up to 4) × scope (records affected, up to 5). High is 12 or more.
        </div>
        {!findings ? <div style={{ fontSize: "12px", color: C.textMuted }}>Loading…</div>
          : findings.length === 0 ? (
            <div style={{ fontSize: "12px", color: C.textMuted, textAlign: "center", padding: "1.5rem" }}>
              <i className="ti ti-circle-check" style={{ fontSize: "26px", color: C.green, display: "block", marginBottom: "4px" }} />
              {tab === "open" ? "No open findings. The readiness rules found nothing to fix." : `No ${tab} findings.`}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {findings.map((f) => {
                const b = band(f.priority);
                const open = expanded === f.id;
                return (
                  <div key={f.id} style={{ border: `0.5px solid ${C.border}`, borderRadius: "10px", padding: "10px 12px", display: "flex", flexDirection: "column", gap: "5px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "20px", background: b.bg, color: b.fg }}>{b.label} · {f.priority}</span>
                      <span style={{ fontSize: "12px", fontWeight: 600, color: C.text }}>{f.rule_name}</span>
                      <span style={{ fontSize: "10px", color: C.textMuted, textTransform: "capitalize" }}>{f.dimension} · {f.where}</span>
                      <span style={{ flex: 1 }} />
                      {f.assigned_to_name && <span style={{ fontSize: "10px", color: C.textSec }}><i className="ti ti-user" /> {f.assigned_to_name}</span>}
                    </div>
                    <div style={{ fontSize: "12px", color: C.textSec }}>{f.explanation}</div>
                    <div style={{ fontSize: "11px", color: C.textMuted }}>
                      Factors: criticality {f.factors.criticality} × severity {f.factors.severity} × overdue {f.factors.overdue}{f.factors.overdue_days ? ` (${f.factors.overdue_days} d)` : ""} × scope {f.factors.scope}{f.factors.scope_count > 1 ? ` (${f.factors.scope_count} records)` : ""}
                      {" · "}<button onClick={() => setExpanded(open ? null : f.id)} style={{ border: "none", background: "transparent", padding: 0, color: C.orange, cursor: "pointer", fontSize: "11px" }}>{open ? "Less" : "Why it matters"}</button>
                    </div>
                    {open && (
                      <div style={{ fontSize: "11px", color: C.textSec, background: C.bg, borderRadius: "8px", padding: "8px 10px", lineHeight: 1.5 }}>
                        <b>Why it matters:</b> {f.why}<br /><b>Suggested action:</b> {f.suggested_action}<br />
                        <span style={{ color: C.textMuted }}>Rule {f.rule_code} v{f.rule_version} · first seen {new Date(f.first_seen_at).toLocaleDateString()}</span>
                      </div>
                    )}
                    {f.status === "accepted" && <div style={{ fontSize: "11px", color: C.textSec }}>Accepted by {f.accepted_by}: “{f.accepted_reason}”</div>}
                    {f.status === "open" && (
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                        {f.document_id && <button onClick={() => onOpenDocument(f.document_id!)} style={btn(C.bgCard, C.textSec)}><i className="ti ti-file-text" /> Open document</button>}
                        {canAssign && (
                          <select aria-label="Assign to" value={f.assigned_to ?? ""} disabled={busy} style={{ ...input, width: "auto" }}
                            onChange={(e) => act(() => apiFetch(`/findings/${f.id}/assign`, { method: "POST", body: JSON.stringify({ user_id: e.target.value || null }) }), e.target.value ? "Finding assigned." : "Finding unassigned.")}>
                            <option value="">Unassigned</option>
                            {people.map((p) => <option key={p.user_id} value={p.user_id}>{p.name} ({p.role})</option>)}
                          </select>
                        )}
                        {canAccept && accepting !== f.id && <button onClick={() => { setAccepting(f.id); setReason(""); }} style={btn(C.bgCard, C.textSec)}>Accept with reason</button>}
                        {accepting === f.id && (
                          <>
                            <input autoFocus value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why this is acceptable (recorded in the audit trail)" aria-label="Reason for accepting" style={{ ...input, flex: "1 1 260px" }} />
                            <button onClick={() => setAccepting(null)} style={btn(C.bgCard, C.textSec)}>Cancel</button>
                            <button disabled={reason.trim().length < 3 || busy} onClick={() => act(() => apiFetch(`/findings/${f.id}/accept`, { method: "POST", body: JSON.stringify({ reason: reason.trim() }) }), "Finding accepted.")}
                              style={{ ...btn(C.orange, "#fff"), opacity: reason.trim().length >= 3 ? 1 : 0.5 }}>Accept</button>
                            <span style={{ fontSize: "10px", color: C.textMuted, width: "100%" }}>What happens next: the finding moves to Accepted with your reason. If the condition later clears, it resolves by itself.</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
      </div>
    </div>
  );
}
