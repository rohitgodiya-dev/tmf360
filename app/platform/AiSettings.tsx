"use client";
// AI assistance settings and log (Part 12a, M17 AI-06/07): each capability switched on or off for the
// organisation, with a reason; and the study's log of AI recommendations with the decisions taken.
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../lib/api/client";

const C = { primary: "#F97316", text: "#111827", textSec: "#374151", textTert: "#6B7280", border: "#E5E7EB", bg: "#FFFFFF", bgSec: "#F9FAFB", danger: "#991B1B", dangerBg: "#FEF2F2", ok: "#065F46", okBg: "#ECFDF5", ai: "#5B21B6", aiBg: "#F5F3FF" };
const btn: React.CSSProperties = { fontSize: "12px", padding: "6px 12px", borderRadius: "7px", border: `0.5px solid ${C.border}`, background: C.bg, color: C.textSec, cursor: "pointer" };
const card: React.CSSProperties = { background: C.bg, border: `0.5px solid ${C.border}`, borderRadius: "12px", padding: "14px 16px" };
const input: React.CSSProperties = { fontSize: "12px", padding: "7px 9px", border: `0.5px solid ${C.border}`, borderRadius: "7px", width: "100%", boxSizing: "border-box" };

type Feature = { feature: string; label: string; description: string; enabled: boolean; configured: boolean };
type Log = { summary: { total: number; by_status: Record<string, number>; acceptance_rate: number | null };
  data: { id: string; feature: string; model_version: string; prompt_version: string; confidence: number | null; status: string; created_at: string; requested_by_name: string; decided_by_name: string | null; decision_note: string | null }[] };

const FEATURE_LABEL: Record<string, string> = { classification: "Classification", metadata_extraction: "Metadata", pre_qc_checks: "Pre-QC", duplicate_detection: "Duplicates", summary: "Summary" };

export default function AiSettings({ study, canManage, canViewLog }: { study: { id: string; study_id: string } | null; canManage: boolean; canViewLog: boolean }) {
  const [features, setFeatures] = useState<Feature[] | null>(null);
  const [model, setModel] = useState("");
  const [log, setLog] = useState<Log | null>(null);
  const [changing, setChanging] = useState<Feature | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(() => {
    apiFetch<{ model: string; features: Feature[] }>("/ai-settings").then((r) => { setFeatures(r.features); setModel(r.model); }).catch((e) => setError((e as Error).message));
    if (study && canViewLog) apiFetch<Log>(`/studies/${study.id}/ai-recommendations`).then(setLog).catch(() => setLog(null));
  }, [study, canViewLog]);
  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!changing) return;
    setBusy(true); setError("");
    try {
      await apiFetch("/ai-settings", { method: "PUT", body: JSON.stringify({ feature: changing.feature, enabled: !changing.enabled, reason: reason.trim() }) });
      setNotice(`${changing.label} switched ${changing.enabled ? "off" : "on"}.`);
      setChanging(null); setReason("");
      load();
    } catch (e) { setError((e as Error).message); }
    setBusy(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <div>
        <h1 style={{ fontSize: "20px", fontWeight: 700, color: C.text, margin: 0 }}>AI assistance</h1>
        <p style={{ fontSize: "12px", color: C.textTert, margin: "2px 0 0" }}>
          AI only suggests and flags. It never files, approves or rejects a document, and everything works with all of it switched off.
          Every suggestion is kept with its model, prompt version, confidence, evidence and the decision people made.
        </p>
      </div>
      {error && <div role="alert" style={{ fontSize: "12px", color: C.danger, background: C.dangerBg, borderRadius: "8px", padding: "8px 12px" }}>{error}</div>}
      {notice && <div style={{ fontSize: "12px", color: C.ok, background: C.okBg, borderRadius: "8px", padding: "8px 12px" }}>{notice}</div>}

      <div style={card}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "8px" }}>
          <div style={{ fontSize: "14px", fontWeight: 700, flex: 1 }}>Capabilities for your organisation</div>
          {model && <span style={{ fontSize: "11px", color: C.textTert }}>Model: {model}</span>}
        </div>
        {!features && <div style={{ fontSize: "12px", color: C.textTert }}>Loading…</div>}
        {features?.map((f) => (
          <div key={f.feature} style={{ borderTop: `0.5px solid ${C.bgSec}`, padding: "8px 0" }}>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "13px", fontWeight: 600, color: C.text }}>{f.label}</div>
                <div style={{ fontSize: "11px", color: C.textTert }}>{f.description}</div>
              </div>
              <span style={{ fontSize: "11px", padding: "2px 10px", borderRadius: "10px", fontWeight: 600, ...(f.enabled ? { background: C.aiBg, color: C.ai } : { background: C.bgSec, color: C.textTert }) }}>{f.enabled ? "On" : "Off"}</span>
              {canManage && changing?.feature !== f.feature && <button onClick={() => { setChanging(f); setReason(""); }} style={btn}>Switch {f.enabled ? "off" : "on"}</button>}
            </div>
            {changing?.feature === f.feature && (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "8px", background: C.bgSec, borderRadius: "8px", padding: "8px" }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: C.textSec }}>Reason *<input value={reason} onChange={(e) => setReason(e.target.value)} style={input} /></label>
                <div style={{ fontSize: "11px", color: C.textTert }}>What happens next: {f.enabled ? "people no longer see this capability; past recommendations stay in the log." : "people in your organisation can use this capability; each use is recorded."} The change and reason go into the audit trail.</div>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button disabled={busy || reason.trim().length < 3} onClick={save} style={{ ...btn, background: C.primary, color: "#fff", border: "none", opacity: busy || reason.trim().length < 3 ? 0.6 : 1 }}>Switch {f.enabled ? "off" : "on"}</button>
                  <button onClick={() => setChanging(null)} style={btn}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {study && canViewLog && log && (
        <div style={card}>
          <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "6px" }}>Recommendation log · {study.study_id}</div>
          <div style={{ fontSize: "12px", color: C.textSec, marginBottom: "8px" }}>
            {log.summary.total} recommendation{log.summary.total === 1 ? "" : "s"} · {Object.entries(log.summary.by_status).filter(([, n]) => n).map(([s, n]) => `${n} ${s}`).join(" · ") || "none yet"}
            {log.summary.acceptance_rate != null && ` · ${log.summary.acceptance_rate}% accepted unchanged`}
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
              <thead><tr style={{ textAlign: "left", color: C.textTert, background: C.bgSec }}>
                {["When", "Capability", "Model / prompt", "Confidence", "Requested by", "Decision", "Decided by"].map((h) => <th key={h} style={{ padding: "6px 8px", fontWeight: 600 }}>{h}</th>)}
              </tr></thead>
              <tbody>{log.data.map((r) => (
                <tr key={r.id} style={{ borderTop: `0.5px solid ${C.border}` }}>
                  <td style={{ padding: "6px 8px", whiteSpace: "nowrap" }}>{new Date(r.created_at).toLocaleString()}</td>
                  <td style={{ padding: "6px 8px" }}>{FEATURE_LABEL[r.feature] ?? r.feature}</td>
                  <td style={{ padding: "6px 8px", color: C.textTert }}>{r.model_version} · {r.prompt_version}</td>
                  <td style={{ padding: "6px 8px" }}>{r.confidence != null ? `${r.confidence}%` : ""}</td>
                  <td style={{ padding: "6px 8px" }}>{r.requested_by_name}</td>
                  <td style={{ padding: "6px 8px" }}>{r.status}{r.decision_note ? ` (${r.decision_note})` : ""}</td>
                  <td style={{ padding: "6px 8px" }}>{r.decided_by_name ?? ""}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
