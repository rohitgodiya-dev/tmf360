"use client";
// Risk & oversight (Part 11d, M14): explainable artifact risk with roll-ups (OVS-01..03), factor
// weights and thresholds (RSK-02/05), and the oversight activity list with signed completion (OVS-04).
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../lib/api/client";

const C = { primary: "#F97316", primaryLight: "#FFF7ED", text: "#111827", textSec: "#374151", textTert: "#6B7280", border: "#E5E7EB", bg: "#FFFFFF", bgSec: "#F9FAFB", danger: "#991B1B", dangerBg: "#FEF2F2", ok: "#065F46", okBg: "#ECFDF5", warn: "#92400E", warnBg: "#FEF3C7" };
const btn: React.CSSProperties = { fontSize: "12px", padding: "6px 12px", borderRadius: "7px", border: `0.5px solid ${C.border}`, background: C.bg, color: C.textSec, cursor: "pointer" };
const primary: React.CSSProperties = { ...btn, background: C.primary, color: "#fff", border: "none", fontWeight: 600 };
const card: React.CSSProperties = { background: C.bg, border: `0.5px solid ${C.border}`, borderRadius: "12px", padding: "14px 16px" };
const input: React.CSSProperties = { fontSize: "12px", padding: "7px 9px", border: `0.5px solid ${C.border}`, borderRadius: "7px", width: "100%", boxSizing: "border-box" };
const label: React.CSSProperties = { fontSize: "11px", fontWeight: 600, color: C.textSec, display: "flex", flexDirection: "column", gap: "4px" };

type Contribution = { factor: string; label: string; count: number; weight: number; points: number };
type Factor = { factor: string; category: string; label: string; weight: number; default_weight: number; configured: boolean };
type Artifact = { key: string; artifact_num: string; artifact_name: string; location: string; owner: string | null; impact: number; score: number; factors: Contribution[]; explanation: string;
  events: { factor: string; detail: string; days: number }[] };
type Node = { key: string; label: string; score: number; artifacts: number; factors: Contribution[] };
type Risk = { thresholds: { indexing_days: number; processing_days: number }; factors: Factor[]; total: number; explanation: string[]; artifacts: Artifact[];
  rollups: Record<"zone" | "section" | "country" | "site" | "owner", Node[]> };
type Activity = { id: string; ref: string; title: string; activity_type: string; rationale: string; status: string; due_date: string | null; created_at: string; created_by_name: string;
  assignee_names: string[]; assignees: string[]; overdue: boolean; outcome: string | null; completed_by_name: string | null; completed_at: string | null; cancel_reason: string | null;
  signature: { meaning: string; signer_name: string; signed_at: string } | null };
type Person = { user_id: string; name: string; role: string };

const fmt = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
const CAT: Record<string, string> = { completeness: "Completeness", quality: "Quality", timeliness: "Timeliness" };
const TYPES: Record<string, string> = { tmf_review: "TMF review", risk_review: "Risk review", qc_review: "QC review", site_review: "Site review", vendor_oversight: "Vendor oversight", other: "Other" };
const STATUS: Record<string, [string, string, string]> = { open: [C.warn, C.warnBg, "Open"], in_review: ["#1E40AF", "#DBEAFE", "In review"], completed: [C.ok, C.okBg, "Completed"], cancelled: [C.textTert, C.bgSec, "Cancelled"] };

export default function RiskOversight({ study, canConfigure, currentUserId }: { study: { id: string; study_id: string }; canConfigure: boolean; currentUserId: string }) {
  const [risk, setRisk] = useState<Risk | null>(null);
  const [tab, setTab] = useState<"artifact" | keyof Risk["rollups"]>("artifact");
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(() => {
    apiFetch<Risk>(`/studies/${study.id}/risk`).then(setRisk).catch((e) => setError((e as Error).message));
  }, [study.id]);
  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: "20px", fontWeight: 700, color: C.text, margin: 0 }}>Risk &amp; oversight · {study.study_id}</h1>
          <p style={{ fontSize: "12px", color: C.textTert, margin: "2px 0 0" }}>Where the TMF is most likely to fail inspection, with the reasons for every score, and the oversight work planned against it.</p>
        </div>
        {canConfigure && !editing && risk && <button onClick={() => setEditing(true)} style={btn}><i className="ti ti-adjustments" /> Weights &amp; thresholds</button>}
      </div>
      {error && <div role="alert" style={{ fontSize: "12px", color: C.danger, background: C.dangerBg, borderRadius: "8px", padding: "8px 12px" }}>{error}</div>}
      {notice && <div style={{ fontSize: "12px", color: C.ok, background: C.okBg, borderRadius: "8px", padding: "8px 12px" }}>{notice}</div>}
      {!risk && !error && <div style={{ fontSize: "12px", color: C.textTert }}>Calculating risk…</div>}

      {editing && risk && <WeightsForm risk={risk} onCancel={() => setEditing(false)} onSaved={() => { setEditing(false); setNotice("Weights and thresholds saved."); load(); }} onError={(e) => setError((e as Error).message)} />}

      {risk && (
        <>
          <div style={card}>
            <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
              <div style={{ fontSize: "14px", fontWeight: 700 }}>Study risk</div>
              <div style={{ fontSize: "22px", fontWeight: 800, color: risk.total > 0 ? C.primary : C.ok }}>{risk.total}</div>
              <div style={{ fontSize: "11px", color: C.textTert }}>sum of artifact scores</div>
            </div>
            <ul style={{ margin: "8px 0 0", paddingLeft: "18px", fontSize: "12px", color: C.textSec, lineHeight: 1.7 }}>
              {risk.explanation.map((e) => <li key={e}>{e}</li>)}
            </ul>
          </div>

          <div style={card}>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "10px" }}>
              {([["artifact", "By artifact"], ["zone", "By zone"], ["section", "By section"], ["country", "By country"], ["site", "By site"], ["owner", "By owner"]] as const).map(([k, l]) => (
                <button key={k} onClick={() => setTab(k)} style={{ ...btn, background: tab === k ? C.primaryLight : C.bg, color: tab === k ? C.primary : C.textSec, fontWeight: tab === k ? 600 : 400 }}>{l}</button>
              ))}
            </div>
            {risk.artifacts.length === 0 && <div style={{ fontSize: "12px", color: C.ok }}>No risk events: nothing missing, rejected or late.</div>}
            {tab === "artifact" ? risk.artifacts.slice(0, 100).map((a) => (
              <div key={a.key} style={{ borderTop: `0.5px solid ${C.bgSec}`, padding: "8px 0" }}>
                <button onClick={() => setOpenKey(openKey === a.key ? null : a.key)} style={{ display: "flex", gap: "10px", alignItems: "center", width: "100%", background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}>
                  <span style={{ minWidth: "48px", fontSize: "14px", fontWeight: 800, color: C.primary }}>{a.score}</span>
                  <span style={{ flex: 1, fontSize: "12px", color: C.text }}><strong style={{ fontFamily: "monospace" }}>{a.artifact_num}</strong> {a.artifact_name} · {a.location}{a.owner ? ` · ${a.owner}` : ""}</span>
                  <i className={`ti ti-chevron-${openKey === a.key ? "up" : "down"}`} style={{ color: C.textTert }} />
                </button>
                <div style={{ fontSize: "11px", color: C.textTert, marginLeft: "58px" }}>{a.explanation}</div>
                {openKey === a.key && (
                  <ul style={{ margin: "6px 0 0 58px", paddingLeft: "16px", fontSize: "11px", color: C.textSec }}>
                    {a.events.map((e, i) => <li key={i}>{e.detail}</li>)}
                  </ul>
                )}
              </div>
            )) : risk.rollups[tab].map((n) => (
              <div key={n.key} style={{ display: "flex", gap: "10px", borderTop: `0.5px solid ${C.bgSec}`, padding: "8px 0", alignItems: "baseline" }}>
                <span style={{ minWidth: "48px", fontSize: "14px", fontWeight: 800, color: C.primary }}>{n.score}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: C.text }}>{n.label} <span style={{ fontWeight: 400, color: C.textTert }}>· {n.artifacts} artifact{n.artifacts === 1 ? "" : "s"} at risk</span></div>
                  <div style={{ fontSize: "11px", color: C.textTert }}>{n.factors.map((c) => `${c.count} × ${c.label}`).join(" · ")}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <Oversight study={study} canManage={canConfigure} currentUserId={currentUserId} />
    </div>
  );
}

function WeightsForm({ risk, onCancel, onSaved, onError }: { risk: Risk; onCancel: () => void; onSaved: () => void; onError: (e: unknown) => void }) {
  const [weights, setWeights] = useState<Record<string, string>>(Object.fromEntries(risk.factors.map((f) => [f.factor, String(f.weight)])));
  const [idx, setIdx] = useState(String(risk.thresholds.indexing_days));
  const [proc, setProc] = useState(String(risk.thresholds.processing_days));
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const bad = Object.entries(weights).find(([, v]) => { const n = Number(v); return v === "" || Number.isNaN(n) || n < 0 || n > 5 || (n > 0 && n < 0.1) || Math.round(n * 10) !== n * 10; });
  const days = (v: string) => Number.isInteger(Number(v)) && Number(v) >= 1 && Number(v) <= 365;
  const valid = !bad && days(idx) && days(proc) && reason.trim().length >= 3;

  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    try {
      await apiFetch(`/risk-settings`, { method: "PUT", body: JSON.stringify({ indexing_days: Number(idx), processing_days: Number(proc), reason: reason.trim(),
        weights: Object.entries(weights).map(([factor, w]) => ({ factor, weight: Number(w) })) }) });
      onSaved();
    } catch (err) { onError(err); }
    setBusy(false);
  }

  return (
    <form onSubmit={save} style={{ ...card, display: "flex", flexDirection: "column", gap: "10px" }}>
      <div style={{ fontSize: "14px", fontWeight: 700 }}>Risk weights and thresholds (organisation-wide)</div>
      <div style={{ fontSize: "12px", color: C.textSec }}>Weights from 0.1 to 5.0; 0 switches a factor off.</div>
      {["completeness", "quality", "timeliness"].map((cat) => (
        <div key={cat}>
          <div style={{ fontSize: "12px", fontWeight: 700, color: C.text, marginBottom: "4px" }}>{CAT[cat]}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "6px" }}>
            {risk.factors.filter((f) => f.category === cat).map((f) => (
              <label key={f.factor} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: C.textSec }}>
                <input aria-label={`Weight ${f.label}`} type="number" min={0} max={5} step={0.1} value={weights[f.factor]} onChange={(e) => setWeights({ ...weights, [f.factor]: e.target.value })} style={{ ...input, width: "70px" }} />
                {f.label}
              </label>
            ))}
          </div>
        </div>
      ))}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <label style={{ ...label, width: "200px" }}>Indexing threshold (days)<input type="number" min={1} max={365} value={idx} onChange={(e) => setIdx(e.target.value)} style={input} /></label>
        <label style={{ ...label, width: "200px" }}>Processing threshold (days)<input type="number" min={1} max={365} value={proc} onChange={(e) => setProc(e.target.value)} style={input} /></label>
      </div>
      {bad && <div style={{ fontSize: "12px", color: C.danger }}>Weights must be 0 or between 0.1 and 5.0, with one decimal place.</div>}
      <label style={label}>Reason for the change *<input value={reason} onChange={(e) => setReason(e.target.value)} style={input} /></label>
      <div style={{ fontSize: "11px", color: C.textTert }}>What happens next: risk scores for every study are recalculated with these settings; each change and your reason go into the audit trail.</div>
      <div style={{ display: "flex", gap: "8px" }}>
        <button type="submit" disabled={!valid || busy} style={{ ...primary, opacity: !valid || busy ? 0.6 : 1 }}>Save</button>
        <button type="button" onClick={onCancel} style={btn}>Cancel</button>
      </div>
    </form>
  );
}

function Oversight({ study, canManage, currentUserId }: { study: { id: string }; canManage: boolean; currentUserId: string }) {
  const [list, setList] = useState<Activity[] | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [creating, setCreating] = useState(false);
  const [f, setF] = useState({ title: "", activity_type: "tmf_review", rationale: "", due_date: "", assignees: [] as string[] });
  const [action, setAction] = useState<{ id: string; kind: "complete" | "cancel" | "in_review" } | null>(null);
  const [text, setText] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    apiFetch<{ data: Activity[]; people: Person[] }>(`/studies/${study.id}/oversight`).then((r) => { setList(r.data); setPeople(r.people); }).catch((e) => setError((e as Error).message));
  }, [study.id]);
  useEffect(() => { load(); }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      await apiFetch(`/studies/${study.id}/oversight`, { method: "POST", body: JSON.stringify({ ...f, title: f.title.trim(), rationale: f.rationale.trim(), due_date: f.due_date || null }) });
      setCreating(false); setF({ title: "", activity_type: "tmf_review", rationale: "", due_date: "", assignees: [] });
      load();
    } catch (err) { setError((err as Error).message); }
    setBusy(false);
  }
  async function act() {
    if (!action) return;
    setBusy(true); setError("");
    try {
      if (action.kind === "complete") await apiFetch(`/oversight/${action.id}/complete`, { method: "POST", body: JSON.stringify({ outcome: text.trim(), password: pw }) });
      else await apiFetch(`/oversight/${action.id}/status`, { method: "POST", body: JSON.stringify({ status: action.kind === "cancel" ? "cancelled" : "in_review", reason: text.trim() }) });
      setAction(null); setText(""); setPw("");
      load();
    } catch (err) { setError((err as Error).message); }
    setBusy(false);
  }

  const createOk = f.title.trim().length >= 3 && f.rationale.trim().length >= 3;
  return (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
        <div style={{ fontSize: "14px", fontWeight: 700, flex: 1 }}>Oversight activities</div>
        {canManage && !creating && <button onClick={() => setCreating(true)} style={btn}><i className="ti ti-plus" /> New activity</button>}
      </div>
      {error && <div role="alert" style={{ fontSize: "12px", color: C.danger, marginBottom: "8px" }}>{error}</div>}
      {creating && (
        <form onSubmit={create} style={{ display: "flex", flexDirection: "column", gap: "8px", background: C.bgSec, borderRadius: "8px", padding: "10px", marginBottom: "10px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "8px" }}>
            <label style={label}>Title *<input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} style={input} /></label>
            <label style={label}>Type<select value={f.activity_type} onChange={(e) => setF({ ...f, activity_type: e.target.value })} style={input}>{Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
            <label style={label}>Due<input type="date" value={f.due_date} onChange={(e) => setF({ ...f, due_date: e.target.value })} style={input} /></label>
          </div>
          <label style={label}>Rationale *<textarea value={f.rationale} onChange={(e) => setF({ ...f, rationale: e.target.value })} rows={2} style={{ ...input, resize: "vertical" }} /></label>
          <div style={{ fontSize: "11px", fontWeight: 600, color: C.textSec }}>Assignees</div>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", fontSize: "12px", color: C.textSec }}>
            {people.map((p) => (
              <label key={p.user_id} style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                <input type="checkbox" checked={f.assignees.includes(p.user_id)} onChange={() => setF({ ...f, assignees: f.assignees.includes(p.user_id) ? f.assignees.filter((x) => x !== p.user_id) : [...f.assignees, p.user_id] })} /> {p.name} <span style={{ color: C.textTert }}>({p.role})</span>
              </label>
            ))}
          </div>
          <div style={{ fontSize: "11px", color: C.textTert }}>What happens next: the activity gets the next OVS number and appears in this list for its assignees. Creating it is audited.</div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button type="submit" disabled={!createOk || busy} style={{ ...primary, opacity: !createOk || busy ? 0.6 : 1 }}>Create activity</button>
            <button type="button" onClick={() => setCreating(false)} style={btn}>Cancel</button>
          </div>
        </form>
      )}
      {!list && <div style={{ fontSize: "12px", color: C.textTert }}>Loading…</div>}
      {list?.length === 0 && <div style={{ fontSize: "12px", color: C.textTert }}>No oversight activities yet.</div>}
      {list?.map((a) => {
        const [fg, bg, l] = STATUS[a.status] ?? [C.textTert, C.bgSec, a.status];
        const live = a.status === "open" || a.status === "in_review";
        const canComplete = live && (canManage || a.assignees.includes(currentUserId));
        return (
          <div key={a.id} style={{ border: `0.5px solid ${C.border}`, borderRadius: "8px", padding: "10px 12px", marginTop: "6px" }}>
            <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontFamily: "monospace", fontSize: "11px", color: C.textTert }}>{a.ref}</span>
              <strong style={{ fontSize: "12px", flex: 1 }}>{a.title}</strong>
              {a.overdue && <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "10px", background: C.dangerBg, color: C.danger }}>Overdue</span>}
              <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "10px", background: bg, color: fg, fontWeight: 600 }}>{l}</span>
            </div>
            <div style={{ fontSize: "11px", color: C.textTert }}>{TYPES[a.activity_type]} · created {fmt(a.created_at)} by {a.created_by_name}{a.due_date ? ` · due ${a.due_date}` : ""}{a.assignee_names.length ? ` · ${a.assignee_names.join(", ")}` : ""}</div>
            <div style={{ fontSize: "12px", color: C.textSec, marginTop: "4px" }}>{a.rationale}</div>
            {a.outcome && <div style={{ fontSize: "12px", marginTop: "6px", background: C.bgSec, borderRadius: "6px", padding: "6px 8px" }}><strong>Outcome:</strong> {a.outcome}{a.signature && <div style={{ fontSize: "11px", color: C.textTert }}><i className="ti ti-signature" /> {a.signature.meaning}: {a.signature.signer_name}, {fmt(a.signature.signed_at)}</div>}</div>}
            {a.cancel_reason && <div style={{ fontSize: "11px", color: C.textTert, marginTop: "4px" }}>Cancelled: {a.cancel_reason}</div>}
            {live && action?.id !== a.id && (
              <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
                {canComplete && <button onClick={() => { setAction({ id: a.id, kind: "complete" }); setText(""); setPw(""); }} style={btn}><i className="ti ti-signature" /> Complete</button>}
                {canManage && a.status === "open" && <button onClick={() => { setAction({ id: a.id, kind: "in_review" }); setText(""); }} style={btn}>Start review</button>}
                {canManage && <button onClick={() => { setAction({ id: a.id, kind: "cancel" }); setText(""); }} style={btn}>Cancel activity</button>}
              </div>
            )}
            {action?.id === a.id && (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "8px", background: C.bgSec, borderRadius: "8px", padding: "8px" }}>
                <label style={label}>{action.kind === "complete" ? "Outcome of the review *" : "Reason *"}<input value={text} onChange={(e) => setText(e.target.value)} style={input} /></label>
                {action.kind === "complete" && <label style={label}>Your password (electronic signature) *<input type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} style={input} /></label>}
                <div style={{ fontSize: "11px", color: C.textTert }}>What happens next: {action.kind === "complete" ? "your signature (meaning \"Oversight review completed\") and the outcome are recorded; the activity can no longer change." : action.kind === "cancel" ? "the activity is cancelled for good, with your reason in the audit trail." : "the activity moves to In review."}</div>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button disabled={busy || text.trim().length < 3 || (action.kind === "complete" && !pw)} onClick={act} style={{ ...primary, opacity: busy || text.trim().length < 3 ? 0.6 : 1 }}>
                    {action.kind === "complete" ? "Sign and complete" : action.kind === "cancel" ? "Cancel activity" : "Start review"}
                  </button>
                  <button onClick={() => setAction(null)} style={btn}>Back</button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
