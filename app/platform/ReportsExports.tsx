"use client";
// Reports & exports (Part 11b): Excel reports for a date range (M13 RPT-02/03) and ZIP exports of the
// study's documents in taxonomy folders, built in the background (M16 EXP-02/04).
import { useCallback, useEffect, useState } from "react";
import { apiFetch, authHeaders } from "../../lib/api/client";

const C = { primary: "#F97316", primaryLight: "#FFF7ED", text: "#111827", textSec: "#374151", textTert: "#6B7280", border: "#E5E7EB", bg: "#FFFFFF", bgSec: "#F9FAFB", danger: "#991B1B", dangerBg: "#FEF2F2", ok: "#065F46", okBg: "#ECFDF5", warn: "#92400E", warnBg: "#FEF3C7" };
const btn: React.CSSProperties = { fontSize: "12px", padding: "6px 12px", borderRadius: "7px", border: `0.5px solid ${C.border}`, background: C.bg, color: C.textSec, cursor: "pointer" };
const primary: React.CSSProperties = { ...btn, background: C.primary, color: "#fff", border: "none", fontWeight: 600 };
const card: React.CSSProperties = { background: C.bg, border: `0.5px solid ${C.border}`, borderRadius: "12px", padding: "14px 16px" };
const input: React.CSSProperties = { fontSize: "12px", padding: "6px 8px", border: `0.5px solid ${C.border}`, borderRadius: "7px" };

type Report = { key: string; title: string; description: string; allowed: boolean };
type Job = { id: string; kind: string; status: string; options: { label?: string; recipient?: string }; file_count: number | null; file_size: number | null; file_hash: string | null;
  error: string | null; created_at: string; finished_at: string | null; expires_at: string | null; expired: boolean; requested_by_name: string };

const fmt = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
const isoDay = (offsetDays: number) => new Date(Date.now() + offsetDays * 86400000).toISOString().slice(0, 10);
const KIND: Record<string, string> = { zip: "ZIP export", archive: "Archive package", transfer: "Transfer package" };
const STATUS: Record<string, [string, string, string]> = {
  queued: [C.warn, C.warnBg, "Queued"], running: [C.warn, C.warnBg, "Building…"], done: [C.ok, C.okBg, "Ready"], failed: [C.danger, C.dangerBg, "Failed"],
};

async function saveFile(res: Response, fallback: string) {
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error?.message ?? res.statusText);
  const name = /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ?? fallback;
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export default function ReportsExports({ study }: { study: { id: string; study_id: string } }) {
  const [reports, setReports] = useState<Report[] | null>(null);
  const [from, setFrom] = useState(isoDay(-90));
  const [to, setTo] = useState(isoDay(0));
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [scope, setScope] = useState<"final" | "current">("final");

  useEffect(() => {
    apiFetch<{ data: Report[] }>(`/studies/${study.id}/reports`).then((r) => setReports(r.data)).catch((e) => setError((e as Error).message));
  }, [study.id]);

  const loadJobs = useCallback(() => {
    apiFetch<{ data: Job[] }>(`/studies/${study.id}/exports`).then((r) => setJobs(r.data)).catch((e) => setError((e as Error).message));
  }, [study.id]);
  useEffect(() => { loadJobs(); }, [loadJobs]);
  // Poll while something is being built.
  const building = jobs?.some((j) => j.status === "queued" || j.status === "running");
  useEffect(() => {
    if (!building) return;
    const t = setInterval(loadJobs, 4000);
    return () => clearInterval(t);
  }, [building, loadJobs]);

  async function runReport(r: Report) {
    setBusy(r.key); setError(""); setNotice("");
    try {
      const res = await fetch(`/api/v1/studies/${study.id}/reports/${r.key}?from=${from}&to=${to}`, { headers: await authHeaders() });
      await saveFile(res, `${study.study_id}-${r.key}.xlsx`);
    } catch (e) { setError((e as Error).message); }
    setBusy("");
  }

  async function startExport() {
    setBusy("export"); setError(""); setNotice("");
    try {
      await apiFetch(`/studies/${study.id}/exports`, { method: "POST", body: JSON.stringify({ scope }) });
      setNotice("Export started. It is built in the background; you will also get an email when it is ready.");
      loadJobs();
    } catch (e) { setError((e as Error).message); }
    setBusy("");
  }

  async function download(j: Job) {
    setBusy(j.id); setError("");
    try {
      const r = await apiFetch<{ url: string }>(`/exports/${j.id}/download`, { method: "POST" });
      window.location.assign(r.url);
    } catch (e) { setError((e as Error).message); }
    setBusy("");
  }

  const rangeOk = from <= to;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <div>
        <h1 style={{ fontSize: "20px", fontWeight: 700, color: C.text, margin: 0 }}>Reports &amp; exports · {study.study_id}</h1>
        <p style={{ fontSize: "12px", color: C.textTert, margin: "2px 0 0" }}>Excel reports for a date range, and ZIP exports of the TMF in its taxonomy folder structure. Every report and download is recorded in the audit trail.</p>
      </div>
      {error && <div role="alert" style={{ fontSize: "12px", color: C.danger, background: C.dangerBg, borderRadius: "8px", padding: "8px 12px" }}>{error}</div>}
      {notice && <div style={{ fontSize: "12px", color: C.ok, background: C.okBg, borderRadius: "8px", padding: "8px 12px" }}>{notice}</div>}

      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "12px" }}>
          <div style={{ fontSize: "14px", fontWeight: 700, flex: 1 }}>Reports</div>
          <label style={{ fontSize: "12px", color: C.textSec }}>From <input aria-label="From" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} style={input} /></label>
          <label style={{ fontSize: "12px", color: C.textSec }}>To <input aria-label="To" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} style={input} /></label>
        </div>
        {!rangeOk && <div style={{ fontSize: "12px", color: C.danger, marginBottom: "8px" }}>The start date must be on or before the end date.</div>}
        {!reports && !error && <div style={{ fontSize: "12px", color: C.textTert }}>Loading…</div>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "10px" }}>
          {reports?.map((r) => (
            <div key={r.key} style={{ border: `0.5px solid ${C.border}`, borderRadius: "10px", padding: "12px", display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ fontSize: "13px", fontWeight: 600, color: C.text }}>{r.title}</div>
              <div style={{ fontSize: "11px", color: C.textTert, flex: 1 }}>{r.description}</div>
              {r.allowed
                ? <button onClick={() => runReport(r)} disabled={!!busy || !rangeOk} style={{ ...btn, alignSelf: "flex-start", opacity: busy || !rangeOk ? 0.6 : 1 }}>
                    <i className="ti ti-file-spreadsheet" /> {busy === r.key ? "Generating…" : `Download ${r.title} (Excel)`}
                  </button>
                : <div style={{ fontSize: "11px", color: C.textTert }}>Your role can&apos;t run this report.</div>}
            </div>
          ))}
        </div>
      </div>

      <div style={card}>
        <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "6px" }}>Export documents (ZIP)</div>
        <div style={{ fontSize: "12px", color: C.textSec, marginBottom: "10px" }}>
          Folders follow the study&apos;s taxonomy (zone / section / artifact). A metadata spreadsheet lists every file with its SHA-256.
        </div>
        <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", alignItems: "center", fontSize: "12px", color: C.textSec }}>
          <label style={{ display: "flex", gap: "4px", alignItems: "center" }}><input type="radio" name="scope" checked={scope === "final"} onChange={() => setScope("final")} /> Final documents</label>
          <label style={{ display: "flex", gap: "4px", alignItems: "center" }}><input type="radio" name="scope" checked={scope === "current"} onChange={() => setScope("current")} /> All current documents (any status)</label>
          <button onClick={startExport} disabled={!!busy} style={{ ...primary, opacity: busy ? 0.6 : 1 }}><i className="ti ti-file-zip" /> {busy === "export" ? "Starting…" : "Start export"}</button>
        </div>
        <div style={{ fontSize: "11px", color: C.textTert, marginTop: "6px" }}>What happens next: the package is built in the background (only documents you can see). The download link works for 7 days; each download is recorded.</div>

        <div style={{ marginTop: "14px", display: "flex", flexDirection: "column", gap: "6px" }}>
          {jobs?.length === 0 && <div style={{ fontSize: "12px", color: C.textTert }}>No exports yet.</div>}
          {jobs?.map((j) => {
            const [fg, bg, label] = j.expired ? [C.textTert, C.bgSec, "Expired"] : STATUS[j.status] ?? [C.textTert, C.bgSec, j.status];
            return (
              <div key={j.id} style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", border: `0.5px solid ${C.border}`, borderRadius: "8px", padding: "8px 10px" }}>
                <div style={{ flex: 1, minWidth: "220px" }}>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: C.text }}>{KIND[j.kind] ?? j.kind} · {j.options.label ?? ""}</div>
                  <div style={{ fontSize: "11px", color: C.textTert }}>
                    {j.requested_by_name} · {fmt(j.created_at)}
                    {j.status === "done" && ` · ${j.file_count} files · ${Math.max(1, Math.round((j.file_size ?? 0) / 1024))} KB`}
                    {j.status === "done" && j.expires_at && !j.expired && ` · available until ${fmt(j.expires_at)}`}
                  </div>
                  {j.status === "failed" && <div style={{ fontSize: "11px", color: C.danger }}>{j.error}</div>}
                </div>
                <span style={{ fontSize: "11px", padding: "2px 10px", borderRadius: "10px", background: bg, color: fg, fontWeight: 600 }}>{label}</span>
                {j.status === "done" && !j.expired && <button onClick={() => download(j)} disabled={!!busy} style={btn}><i className="ti ti-download" /> Download</button>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
