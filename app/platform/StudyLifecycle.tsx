"use client";
// Study lifecycle (Part 18): where the study is (Planning → Startup → Active → Closeout → Closed → Archived), the
// next allowed steps with what each does, close-out checks, and the full history. Closing and archiving are signed.
import { useEffect, useState } from "react";
import { ApiClientError, apiFetch } from "../../lib/api/client";

type Next = { to: string; signed: boolean; meaning: string | null; what_happens: string; direction: "forward" | "back" };
type Checks = { completeness: number | null; missing: number; open_tasks: number; open_findings: number; high_priority_findings: number; active_sites: number; legal_holds: number; warnings: string[] };
type Event = { id: string; from_status: string | null; to_status: string; reason: string; performed_by_email: string | null; performed_at: string; signature_event_id: string | null };
type Data = { status: string; stages: string[]; closed_at: string | null; archived_at: string | null; next: Next[]; checks: Checks | null; history: Event[] };

const C = {
  orange: "#F97316", orangeLight: "#FFF7ED", text: "#111827", textSec: "#374151", textMuted: "#6B7280",
  border: "#E5EDF6", bg: "#F8FAFC", bgCard: "#FFFFFF", greenDark: "#065F46", greenLight: "#ECFDF5", green: "#10B981",
  amberDark: "#92400E", amberLight: "#FFFBEB", redDark: "#991B1B", redLight: "#FEF2F2", gray: "#9CA3AF",
};
const card: React.CSSProperties = { background: C.bgCard, border: `0.5px solid ${C.border}`, borderRadius: "12px", padding: "14px 16px" };
const btn = (bg: string, color: string): React.CSSProperties => ({ fontSize: "12px", fontWeight: 600, padding: "7px 14px", background: bg, color, border: `0.5px solid ${C.border}`, borderRadius: "8px", cursor: "pointer" });
const input: React.CSSProperties = { width: "100%", fontSize: "13px", padding: "8px 10px", border: `0.5px solid ${C.border}`, borderRadius: "8px", fontFamily: "inherit", boxSizing: "border-box", background: C.bgCard };
const th: React.CSSProperties = { textAlign: "left", padding: "8px 10px", fontSize: "11px", fontWeight: 600, color: C.textSec };
const td: React.CSSProperties = { padding: "8px 10px", fontSize: "12px", color: C.text, borderTop: `0.5px solid ${C.border}`, verticalAlign: "top" };
const LABEL: Record<string, string> = { Planning: "Planning", Startup: "Start-up", Active: "Active", Closeout: "Close-out", Closed: "Closed", Archived: "Archived" };
const errText = (e: unknown) => (e instanceof ApiClientError ? e.message : "Something went wrong. Try again.");

export default function StudyLifecycle({ study, canManage, onChanged }: { study: { id: string; study_id: string }; canManage: boolean; onChanged?: () => void }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloads, setReloads] = useState(0);
  const [step, setStep] = useState<Next | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch<Data>(`/studies/${study.id}/lifecycle`)
      .then((d) => { if (!cancelled) { setData(d); setError(null); } })
      .catch((e) => { if (!cancelled) setError(errText(e)); });
    return () => { cancelled = true; };
  }, [study.id, reloads]);

  if (error) return <div style={{ padding: "1.25rem" }}><div role="alert" style={{ ...card, background: C.redLight, color: C.redDark, fontSize: "12px" }}>{error}</div></div>;
  if (!data) return <div style={{ padding: "1.25rem", fontSize: "12px", color: C.textMuted }}>Loading the study lifecycle…</div>;
  const idx = data.stages.indexOf(data.status);

  return (
    <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "14px" }}>
      <div>
        <div style={{ fontSize: "16px", fontWeight: 600, color: C.text }}>Study lifecycle</div>
        <div style={{ fontSize: "12px", color: C.textMuted }}>Study {study.study_id} moves one step at a time. Closing and archiving are electronically signed; an archived study can never change again.</div>
      </div>
      {notice && <div role="status" style={{ ...card, background: C.greenLight, color: C.greenDark, fontSize: "12px" }}>{notice}</div>}

      <div style={{ ...card, display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }} aria-label="Lifecycle timeline">
        {data.stages.map((s, i) => (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: i === idx ? 700 : 500,
              background: i === idx ? C.orange : i < idx ? C.greenLight : C.bg, color: i === idx ? "#fff" : i < idx ? C.greenDark : C.textMuted, border: `0.5px solid ${i === idx ? C.orange : C.border}` }}
              aria-current={i === idx ? "step" : undefined}>
              {i < idx && <i className="ti ti-check" />}{LABEL[s]}
            </div>
            {i < data.stages.length - 1 && <i className="ti ti-chevron-right" style={{ color: C.gray }} />}
          </div>
        ))}
      </div>

      {data.checks && (
        <div style={card}>
          <div style={{ fontSize: "13px", fontWeight: 600, color: C.text, marginBottom: "8px" }}>Close-out readiness</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "8px", marginBottom: data.checks.warnings.length ? "10px" : 0 }}>
            {[["Completeness", data.checks.completeness == null ? "—" : `${data.checks.completeness}%`], ["Missing documents", data.checks.missing], ["Open QC tasks", data.checks.open_tasks],
              ["High-priority findings", data.checks.high_priority_findings], ["Active sites", data.checks.active_sites], ["Legal holds", data.checks.legal_holds]].map(([k, v]) => (
              <div key={k as string}><div style={{ fontSize: "11px", color: C.textMuted }}>{k}</div><div style={{ fontSize: "16px", fontWeight: 600, color: C.text }}>{v}</div></div>
            ))}
          </div>
          {data.checks.warnings.map((w) => <div key={w} style={{ fontSize: "12px", color: C.amberDark, background: C.amberLight, borderRadius: "8px", padding: "6px 10px", marginTop: "4px" }}><i className="ti ti-alert-triangle" /> {w}</div>)}
        </div>
      )}

      <div style={card}>
        <div style={{ fontSize: "13px", fontWeight: 600, color: C.text, marginBottom: "8px" }}>Next step</div>
        {data.next.length === 0 ? (
          <div style={{ fontSize: "12px", color: C.textMuted }}>Archived is the final state. The study stays read-only and available for inspection and retention.</div>
        ) : !canManage ? (
          <div style={{ fontSize: "12px", color: C.textMuted }}>Administrators and TMF leads change the study status.</div>
        ) : (
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {data.next.map((n) => (
              <button key={n.to} style={n.direction === "forward" ? btn(C.orange, "#fff") : btn(C.bgCard, C.textSec)} onClick={() => setStep(n)}>
                {n.direction === "forward" ? <>Advance to {LABEL[n.to]}</> : <>Back to {LABEL[n.to]}</>}{n.signed && <> <i className="ti ti-signature" /></>}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ ...card, padding: 0, overflowX: "auto" }}>
        <div style={{ padding: "12px 14px", fontSize: "13px", fontWeight: 600, color: C.text }}>History</div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr style={{ background: C.bg }}>{["When", "From", "To", "Reason", "By", "Signed"].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>
            {data.history.map((e) => (
              <tr key={e.id}>
                <td style={td}>{new Date(e.performed_at).toLocaleString()}</td>
                <td style={td}>{e.from_status ? LABEL[e.from_status] ?? e.from_status : "—"}</td>
                <td style={td}><b>{LABEL[e.to_status] ?? e.to_status}</b></td>
                <td style={td}>{e.reason}</td>
                <td style={td}>{e.performed_by_email ?? "—"}</td>
                <td style={td}>{e.signature_event_id ? <i className="ti ti-signature" aria-label="Signed" /> : ""}</td>
              </tr>
            ))}
            {data.history.length === 0 && <tr><td style={{ ...td, color: C.textMuted }} colSpan={6}>No status changes recorded yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {step && <Transition study={study} step={step} warnings={data.checks?.warnings ?? []} onClose={() => setStep(null)}
        onDone={(msg) => { setStep(null); setNotice(msg); setReloads((n) => n + 1); onChanged?.(); }} />}
    </div>
  );
}

function Transition({ study, step, warnings, onClose, onDone }: {
  study: { id: string }; step: Next; warnings: string[]; onClose: () => void; onDone: (msg: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [password, setPassword] = useState("");
  const [ack, setAck] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const needsAck = (step.to === "Closeout" || step.to === "Closed") && warnings.length > 0;
  const [confirmArchive, setConfirmArchive] = useState("");
  const archiveOk = step.to !== "Archived" || confirmArchive.trim().toUpperCase() === "ARCHIVE";
  const can = reason.trim().length >= 3 && (!step.signed || password.length > 0) && (!needsAck || ack) && archiveOk;

  async function save() {
    setSaving(true); setErr(null);
    try {
      await apiFetch(`/studies/${study.id}/lifecycle`, { method: "POST", body: JSON.stringify({
        to: step.to, reason: reason.trim(), acknowledge_warnings: ack, ...(step.signed ? { password } : {}) }) });
      onDone(`The study is now ${LABEL[step.to]}.`);
    } catch (e) { setErr(errText(e)); setPassword(""); } finally { setSaving(false); }
  }
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div role="dialog" aria-label={`Move to ${LABEL[step.to]}`} style={{ background: C.bgCard, borderRadius: "14px", padding: "24px", width: "100%", maxWidth: "520px", maxHeight: "85vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
          <div style={{ fontSize: "15px", fontWeight: 600, color: C.text }}>Move to {LABEL[step.to]}</div>
          <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: C.textMuted }}>×</button>
        </div>
        <div style={{ fontSize: "12px", color: C.textSec, background: C.bg, borderRadius: "8px", padding: "8px 10px", marginBottom: "12px" }}>What happens next: {step.what_happens}</div>
        {needsAck && (
          <div style={{ marginBottom: "12px" }}>
            {warnings.map((w) => <div key={w} style={{ fontSize: "12px", color: C.amberDark, background: C.amberLight, borderRadius: "8px", padding: "6px 10px", marginBottom: "4px" }}>{w}</div>)}
            <label style={{ display: "flex", gap: "6px", alignItems: "center", fontSize: "12px", color: C.text, marginTop: "6px" }}>
              <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} /> I have reviewed these warnings; they are kept with this step.
            </label>
          </div>
        )}
        <label style={{ fontSize: "11px", fontWeight: 600, color: C.textSec, display: "block", marginBottom: "5px" }}>Reason</label>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={2000} style={{ ...input, resize: "vertical" }} />
        {reason && reason.trim().length < 3 && <div style={{ fontSize: "11px", color: C.redDark }}>Give a reason of at least 3 characters</div>}
        {step.to === "Archived" && (
          <div style={{ marginTop: "12px" }}>
            <label style={{ fontSize: "11px", fontWeight: 600, color: C.textSec, display: "block", marginBottom: "5px" }}>Type ARCHIVE to confirm this cannot be undone</label>
            <input value={confirmArchive} onChange={(e) => setConfirmArchive(e.target.value)} style={input} />
          </div>
        )}
        {step.signed && (
          <div style={{ marginTop: "12px" }}>
            <label style={{ fontSize: "11px", fontWeight: 600, color: C.textSec, display: "block", marginBottom: "5px" }}>Password — you are signing &quot;{step.meaning}&quot;</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" style={input} />
          </div>
        )}
        {err && <div role="alert" style={{ fontSize: "12px", color: C.redDark, marginTop: "8px" }}>{err}</div>}
        <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
          <button onClick={onClose} style={{ flex: 1, padding: "10px", border: `0.5px solid ${C.border}`, borderRadius: "8px", background: C.bgCard, cursor: "pointer", fontSize: "13px" }}>Cancel</button>
          <button onClick={save} disabled={!can || saving} style={{ flex: 2, padding: "10px", background: C.orange, color: "#fff", border: "none", borderRadius: "8px", cursor: can && !saving ? "pointer" : "default", fontSize: "13px", fontWeight: 600, opacity: can && !saving ? 1 : 0.6 }}>
            {saving ? "Saving..." : step.signed ? `Sign and move to ${LABEL[step.to]}` : `Move to ${LABEL[step.to]}`}
          </button>
        </div>
      </div>
    </div>
  );
}
