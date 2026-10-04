"use client";
// eTMF plan (Part 8a, PLC-01): which artifacts each study is expected to hold, at which level,
// how many, and which milestone creates them. Changes need a reason and are audited.
import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api/client";

type Item = { id: string; artifact_num: string; level: string; quantity: number; trigger_milestone: string | null; due_offset_days: number; instructions: string | null; responsible_org: string | null; responsible_dept: string | null; is_active: boolean; row_version: number };
type Plan = { items: Item[]; milestone_types: { code: string; label: string; applies_to: string }[]; can_edit: boolean };

const C = { orange: "#F97316", text: "#111827", textSec: "#374151", textMuted: "#6B7280", border: "#E5EDF6", bg: "#F8FAFC", bgCard: "#FFFFFF", green: "#065F46", greenLight: "#ECFDF5", red: "#991B1B", redLight: "#FEF2F2" };
const card: React.CSSProperties = { background: C.bgCard, border: `0.5px solid ${C.border}`, borderRadius: "12px", padding: "16px 18px" };
const btn = (bg: string, color: string): React.CSSProperties => ({ fontSize: "12px", fontWeight: 600, padding: "6px 12px", background: bg, color, border: `0.5px solid ${C.border}`, borderRadius: "8px", cursor: "pointer" });
const input: React.CSSProperties = { fontSize: "12px", padding: "6px 8px", border: `0.5px solid ${C.border}`, borderRadius: "8px", fontFamily: "inherit", boxSizing: "border-box", background: C.bgCard, width: "100%" };
const BLANK = { artifact_num: "", level: "study", quantity: 1, trigger_milestone: "", due_offset_days: 30, instructions: "", responsible_org: "", responsible_dept: "" };

export default function PlanSettings() {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [form, setForm] = useState<typeof BLANK | null>(null);
  const [why, setWhy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [reloads, setReloads] = useState(0);

  useEffect(() => { apiFetch<Plan>("/plan-template").then(setPlan).catch((e) => setError((e as Error).message)); }, [reloads]);
  if (!plan) return <div style={{ fontSize: "12px", color: error ? C.red : C.textMuted }}>{error || "Loading eTMF plan…"}</div>;

  const label = (code: string | null) => (code ? plan.milestone_types.find((m) => m.code === code)?.label ?? code : "When the plan is applied");
  const reasonOk = why.trim().length >= 3;
  async function run(msg: string, fn: () => Promise<unknown>) {
    if (!reasonOk) { setError("Give a reason for the change first (at least 3 characters)."); return; }
    setBusy(true); setError(""); setNotice("");
    try { await fn(); setNotice(msg); setForm(null); setWhy(""); setReloads((n) => n + 1); }
    catch (e) { setError((e as Error).message); }
    setBusy(false);
  }
  const formValid = !!form && /^\d{2}\.\d{2}\.\d{2}$/.test(form.artifact_num);
  const active = plan.items.filter((i) => i.is_active);
  const retired = plan.items.filter((i) => !i.is_active);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div>
        <h2 style={{ fontSize: "16px", fontWeight: 700, color: C.text }}>eTMF plan</h2>
        <p style={{ fontSize: "12px", color: C.textMuted, marginTop: "2px" }}>
          The documents every study is expected to hold. Each line creates expected artifacts (placeholders) when its milestone is achieved, or when you click Apply eTMF plan in the Navigator. Completeness is measured against them.
        </p>
      </div>
      {plan.can_edit && (
        <label style={{ ...card, display: "flex", flexDirection: "column", gap: "4px", fontSize: "11px", fontWeight: 600, color: C.textSec }}>
          Reason for any change below (required, recorded in the audit trail)
          <input value={why} onChange={(e) => setWhy(e.target.value)} placeholder="e.g. TMF plan v2 approved" style={{ ...input, fontWeight: 400 }} />
        </label>
      )}
      {notice && <div role="status" style={{ fontSize: "12px", padding: "8px 12px", borderRadius: "8px", background: C.greenLight, color: C.green }}>{notice}</div>}
      {error && <div role="alert" style={{ fontSize: "12px", padding: "8px 12px", borderRadius: "8px", background: C.redLight, color: C.red }}>{error}</div>}

      <div style={{ ...card, padding: 0, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
          <thead><tr style={{ background: C.bg, borderBottom: `0.5px solid ${C.border}` }}>
            {["Artifact", "Level", "How many", "Created when", "Due", "Responsible", ""].map((h) => <th key={h} style={{ textAlign: "left", padding: "9px 12px", fontSize: "11px", color: C.textSec, fontWeight: 600 }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {active.length === 0 && <tr><td colSpan={7} style={{ padding: "1.5rem", textAlign: "center", color: C.textMuted }}>No plan yet. Until there is one, every enabled artifact without a document counts as Missing.</td></tr>}
            {[...active, ...retired].map((i) => (
              <tr key={i.id} style={{ borderBottom: `0.5px solid ${C.bg}`, color: i.is_active ? C.textSec : C.textMuted }}>
                <td style={{ padding: "8px 12px", fontFamily: "monospace", textDecoration: i.is_active ? "none" : "line-through" }}>{i.artifact_num}</td>
                <td style={{ padding: "8px 12px", textTransform: "capitalize" }}>{i.level}</td>
                <td style={{ padding: "8px 12px" }}>{i.quantity}</td>
                <td style={{ padding: "8px 12px" }}>{label(i.trigger_milestone)}</td>
                <td style={{ padding: "8px 12px" }}>{i.due_offset_days} days later</td>
                <td style={{ padding: "8px 12px" }}>{[i.responsible_org, i.responsible_dept].filter(Boolean).join(" · ") || "—"}</td>
                <td style={{ padding: "8px 12px", textAlign: "right" }}>
                  {plan.can_edit && <button disabled={busy} onClick={() => run(`${i.artifact_num} ${i.is_active ? "removed from" : "restored to"} the plan.`, () => apiFetch(`/plan-template/${i.id}`, { method: "PATCH", body: JSON.stringify({ is_active: !i.is_active, row_version: i.row_version, reason: why.trim() }) }))}
                    style={{ ...btn(C.bgCard, C.textMuted), padding: "3px 8px", fontSize: "11px" }}>{i.is_active ? "Retire" : "Restore"}</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {plan.can_edit && !form && <button onClick={() => setForm({ ...BLANK })} style={{ ...btn(C.bgCard, C.textSec), alignSelf: "flex-start" }}>+ Add to plan</button>}
      {form && (
        <div style={{ ...card, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "8px" }}>
          <label style={{ fontSize: "11px", color: C.textSec }}>Artifact number
            <input value={form.artifact_num} onChange={(e) => setForm({ ...form, artifact_num: e.target.value.trim() })} placeholder="e.g. 05.02.07" style={input} />
            {form.artifact_num && !formValid && <span style={{ fontSize: "10px", color: C.red }}>Use the form 01.01.01</span>}
          </label>
          <label style={{ fontSize: "11px", color: C.textSec }}>Level
            <select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value, trigger_milestone: "" })} style={input}>
              <option value="study">Study</option><option value="country">Each country</option><option value="site">Each site</option>
            </select>
          </label>
          <label style={{ fontSize: "11px", color: C.textSec }}>How many<input type="number" min={1} max={50} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Math.max(1, Math.min(50, Number(e.target.value) || 1)) })} style={input} /></label>
          <label style={{ fontSize: "11px", color: C.textSec }}>Created when
            <select value={form.trigger_milestone} onChange={(e) => setForm({ ...form, trigger_milestone: e.target.value })} style={input}>
              <option value="">The plan is applied</option>
              {plan.milestone_types.filter((m) => m.applies_to === form.level).map((m) => <option key={m.code} value={m.code}>{m.label} is achieved</option>)}
            </select>
          </label>
          <label style={{ fontSize: "11px", color: C.textSec }}>Due (days after)<input type="number" min={0} max={3650} value={form.due_offset_days} onChange={(e) => setForm({ ...form, due_offset_days: Math.max(0, Math.min(3650, Number(e.target.value) || 0)) })} style={input} /></label>
          <label style={{ fontSize: "11px", color: C.textSec }}>Responsible organisation<input value={form.responsible_org} onChange={(e) => setForm({ ...form, responsible_org: e.target.value })} style={input} /></label>
          <label style={{ fontSize: "11px", color: C.textSec }}>Department<input value={form.responsible_dept} onChange={(e) => setForm({ ...form, responsible_dept: e.target.value })} style={input} /></label>
          <label style={{ fontSize: "11px", color: C.textSec, gridColumn: "1 / -1" }}>Instructions<textarea rows={2} value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} style={{ ...input, resize: "vertical" }} /></label>
          <div style={{ gridColumn: "1 / -1", fontSize: "11px", color: C.textSec, background: C.bg, borderRadius: "8px", padding: "8px 10px" }}>
            <b>What happens next:</b> {form.quantity} expected {form.artifact_num || "artifact"} per {form.level} will be created {form.trigger_milestone ? `when “${label(form.trigger_milestone)}” is achieved` : "the next time the plan is applied to a study"}, due {form.due_offset_days} days later. Existing placeholders are not changed.
          </div>
          <div style={{ gridColumn: "1 / -1", display: "flex", gap: "6px", justifyContent: "flex-end" }}>
            <button onClick={() => setForm(null)} style={btn(C.bgCard, C.textSec)}>Cancel</button>
            <button disabled={busy || !formValid || !reasonOk} style={{ ...btn(C.orange, "#fff"), border: "none", opacity: formValid && reasonOk ? 1 : 0.5 }}
              onClick={() => run(`${form.artifact_num} added to the plan.`, () => apiFetch("/plan-template", { method: "POST", body: JSON.stringify({
                ...form, trigger_milestone: form.trigger_milestone || null, reason: why.trim(),
              }) }))}>Add to plan</button>
          </div>
          {!reasonOk && <div style={{ gridColumn: "1 / -1", fontSize: "10px", color: C.red, textAlign: "right" }}>Enter a reason for the change at the top first.</div>}
        </div>
      )}
    </div>
  );
}
