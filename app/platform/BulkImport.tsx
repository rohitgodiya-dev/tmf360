"use client";
// Bulk import (Part 20): studies and sites from CSV. Download the template, choose a file, review the dry run
// (every row checked, errors listed by line), then import — all rows or none.
import { useState } from "react";
import { ApiClientError, apiFetch, authHeaders } from "../../lib/api/client";
import { csvRecords } from "../../lib/csv";

type Kind = "studies" | "sites";
type RowError = { line: number; field: string; message: string };
type Result = { kind: Kind; columns: string[]; valid: boolean; row_count: number; rows: Record<string, string>[]; errors: RowError[]; warnings: string[]; summary: string[]; imported?: number };

const C = {
  orange: "#F97316", orangeLight: "#FFF7ED", text: "#111827", textSec: "#374151", textMuted: "#6B7280",
  border: "#E5EDF6", bg: "#F8FAFC", bgCard: "#FFFFFF", greenDark: "#065F46", greenLight: "#ECFDF5",
  amberDark: "#92400E", amberLight: "#FFFBEB", redDark: "#991B1B", redLight: "#FEF2F2",
};
const card: React.CSSProperties = { background: C.bgCard, border: `0.5px solid ${C.border}`, borderRadius: "12px", padding: "14px 16px" };
const btn = (bg: string, color: string): React.CSSProperties => ({ fontSize: "12px", fontWeight: 600, padding: "7px 14px", background: bg, color, border: `0.5px solid ${C.border}`, borderRadius: "8px", cursor: "pointer" });
const th: React.CSSProperties = { textAlign: "left", padding: "6px 8px", fontSize: "11px", fontWeight: 600, color: C.textSec, whiteSpace: "nowrap" };
const td: React.CSSProperties = { padding: "6px 8px", fontSize: "12px", color: C.text, borderTop: `0.5px solid ${C.border}`, whiteSpace: "nowrap" };
const INFO: Record<Kind, { title: string; help: string; next: string }> = {
  studies: { title: "Import studies", help: "Required: study_id, protocol, phase (I, II, III, IV or Obs). Optional: sponsor, status (Planning, Startup or Active), therapeutic_area.",
    next: "all studies are created at once (or none if anything fails), each starting in its status, and the import is recorded in the audit trail." },
  sites: { title: "Import sites", help: "Required: site_name, site_code, country_code (ISO, e.g. US), study_id (an existing study). Optional: city, pi_name, pi_email.",
    next: "each site is added to its study in Identified status; the country is added to the study if needed, the institution is reused or added to the directory, and the PI is recorded. All rows or none." },
};

export default function BulkImport({ canStudies, canSites, onImported }: { canStudies: boolean; canSites: boolean; onImported?: () => void }) {
  return (
    <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "14px" }}>
      <div>
        <div style={{ fontSize: "16px", fontWeight: 600, color: C.text }}>Bulk import</div>
        <div style={{ fontSize: "12px", color: C.textMuted }}>Load studies and sites from CSV. Every row is checked before anything is imported.</div>
      </div>
      {canStudies && <Section kind="studies" onImported={onImported} />}
      {canSites && <Section kind="sites" onImported={onImported} />}
      {!canStudies && !canSites && <div style={{ ...card, fontSize: "12px", color: C.textMuted }}>Bulk import is available to administrators and TMF leads.</div>}
    </div>
  );
}

function Section({ kind, onImported }: { kind: Kind; onImported?: () => void }) {
  const [file, setFile] = useState<string | null>(null);
  const [rows, setRows] = useState<Record<string, string>[] | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [log, setLog] = useState<string | null>(null);
  const info = INFO[kind];

  async function downloadTemplate() {
    const res = await fetch(`/api/v1/bulk-import/${kind}`, { headers: await authHeaders() });
    if (!res.ok) { setErr("Could not download the template"); return; }
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement("a");
    a.href = url; a.download = `trial360-${kind}-template.csv`; a.click();
    URL.revokeObjectURL(url);
  }
  async function choose(f: File | undefined) {
    setResult(null); setErr(null); setLog(null); setRows(null);
    if (!f) return;
    if (f.size > 2_000_000) { setErr("The file is larger than 2 MB"); return; }
    setFile(f.name);
    const parsed = csvRecords(await f.text()).records;
    if (!parsed.length) { setErr("The file has no data rows"); return; }
    setRows(parsed);
    await send(parsed, false);
  }
  async function send(data: Record<string, string>[], commit: boolean) {
    setBusy(true); setErr(null);
    try {
      const r = await apiFetch<Result>(`/bulk-import/${kind}`, { method: "POST", body: JSON.stringify({ rows: data, commit }) });
      setResult(r);
      if (commit) {
        setLog(`Imported ${r.imported} ${kind} from ${file} at ${new Date().toLocaleString()}.`);
        setRows(null); setResult(null); onImported?.();
      }
    } catch (e) { setErr(e instanceof ApiClientError ? e.message : "Something went wrong. Try again."); } finally { setBusy(false); }
  }

  const errorsByLine = new Map<number, RowError[]>();
  for (const e of result?.errors ?? []) errorsByLine.set(e.line, [...(errorsByLine.get(e.line) ?? []), e]);
  const invalidRows = new Set((result?.errors ?? []).filter((e) => e.line > 1).map((e) => e.line)).size;

  return (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "6px" }}>
        <div style={{ flex: 1, fontSize: "13px", fontWeight: 600, color: C.text }}>{info.title}</div>
        <button style={btn(C.bgCard, C.textSec)} onClick={downloadTemplate}><i className="ti ti-download" /> Template</button>
        <label style={{ ...btn(C.orange, "#fff"), display: "inline-flex", alignItems: "center", gap: "4px" }}>
          <i className="ti ti-file-upload" /> Choose CSV
          <input aria-label={`Choose ${kind} CSV`} type="file" accept=".csv,text/csv" style={{ display: "none" }} onChange={(e) => { void choose(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
      </div>
      <div style={{ fontSize: "11px", color: C.textMuted, marginBottom: "8px" }}>{info.help}</div>
      {busy && <div style={{ fontSize: "12px", color: C.textMuted }}>Checking…</div>}
      {err && <div role="alert" style={{ fontSize: "12px", color: C.redDark, background: C.redLight, borderRadius: "8px", padding: "6px 10px", marginBottom: "8px" }}>{err}</div>}
      {log && <div role="status" style={{ fontSize: "12px", color: C.greenDark, background: C.greenLight, borderRadius: "8px", padding: "6px 10px" }}>{log}</div>}

      {result && rows && (
        <>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", margin: "6px 0" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: C.greenDark, background: C.greenLight, borderRadius: "20px", padding: "3px 10px" }}>{result.row_count - invalidRows} valid</span>
            <span style={{ fontSize: "12px", fontWeight: 600, color: invalidRows ? C.redDark : C.textMuted, background: invalidRows ? C.redLight : C.bg, borderRadius: "20px", padding: "3px 10px" }}>{invalidRows} with errors</span>
            <span style={{ fontSize: "12px", color: C.textMuted }}>{file}</span>
          </div>
          {result.warnings.map((w) => <div key={w} style={{ fontSize: "12px", color: C.amberDark, background: C.amberLight, borderRadius: "8px", padding: "6px 10px", marginBottom: "4px" }}>{w}</div>)}
          {(errorsByLine.get(1) ?? []).map((e) => <div key={e.field} style={{ fontSize: "12px", color: C.redDark }}>{e.message}</div>)}
          <div style={{ maxHeight: "320px", overflow: "auto", border: `0.5px solid ${C.border}`, borderRadius: "8px", margin: "8px 0" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr style={{ background: C.bg, position: "sticky", top: 0 }}><th style={th}>Line</th>{result.columns.map((c) => <th key={c} style={th}>{c}</th>)}<th style={th}>Problems</th></tr></thead>
              <tbody>
                {result.rows.map((r, i) => {
                  const errs = errorsByLine.get(i + 2) ?? [];
                  return (
                    <tr key={i} style={{ background: errs.length ? C.redLight : undefined }}>
                      <td style={td}>{i + 2}</td>
                      {result.columns.map((c) => <td key={c} style={{ ...td, color: errs.some((e) => e.field === c) ? C.redDark : C.text, fontWeight: errs.some((e) => e.field === c) ? 600 : 400 }}>{r[c]}</td>)}
                      <td style={{ ...td, whiteSpace: "normal", color: C.redDark, minWidth: "220px" }}>{errs.map((e) => `${e.field}: ${e.message}`).join("; ")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {result.valid && (
            <>
              <div style={{ fontSize: "11px", color: C.textMuted, background: C.bg, borderRadius: "8px", padding: "8px 10px", marginBottom: "8px" }}>
                {result.summary.join(" · ")}. What happens next: {info.next}
              </div>
              <button style={btn(C.orange, "#fff")} disabled={busy} onClick={() => void send(rows, true)}>Import {result.row_count} {kind}</button>
            </>
          )}
          {!result.valid && <div style={{ fontSize: "12px", color: C.textSec }}>Fix the rows marked in red in your file and choose it again. Nothing has been imported.</div>}
        </>
      )}
    </div>
  );
}
