"use client";
// QC settings (Part 7): attestation vs electronic signature for QC decisions (Section 5, D1),
// the coded rejection reasons (QC-02, Appendix B) and the File Plan (WFL-01). Every change
// needs a reason and is audited by the database.
import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api/client";

type Reason = { id: string; code: string; label: string; weight: number; is_active: boolean; row_version: number };
type PlanStep = { artifact_num: string | null; position: number; step_type: "inbound_qc" | "post_approval_qc"; assignee_role: string | null; duration_days: number };
type Config = { reasons: Reason[]; file_plan: PlanStep[]; control: "attestation" | "signature"; approver_roles: string[]; can_edit: boolean };
type Draft = { artifact: string; steps: { step_type: PlanStep["step_type"]; assignee_role: string | null; duration_days: number }[] };

const C = {
  orange: "#F97316", orangeLight: "#FFF7ED", text: "#111827", textSec: "#374151", textMuted: "#6B7280",
  border: "#E5EDF6", bg: "#F8FAFC", bgCard: "#FFFFFF", green: "#065F46", greenLight: "#ECFDF5", red: "#991B1B", redLight: "#FEF2F2",
};
const card: React.CSSProperties = { background: C.bgCard, border: `0.5px solid ${C.border}`, borderRadius: "12px", padding: "16px 18px" };
const btn = (bg: string, color: string): React.CSSProperties => ({ fontSize: "12px", fontWeight: 600, padding: "6px 12px", background: bg, color, border: `0.5px solid ${C.border}`, borderRadius: "8px", cursor: "pointer" });
const inputStyle: React.CSSProperties = { fontSize: "12px", padding: "6px 8px", border: `0.5px solid ${C.border}`, borderRadius: "8px", fontFamily: "inherit", boxSizing: "border-box", background: C.bgCard };
const STEP_LABEL = { inbound_qc: "Inbound QC", post_approval_qc: "Post-Approval QC" } as const;
const DEFAULT_STEPS: Draft["steps"] = [{ step_type: "inbound_qc", assignee_role: null, duration_days: 5 }];

export default function QcSettings() {
  const [cfg, setCfg] = useState<Config | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reloads, setReloads] = useState(0);
  const [why, setWhy] = useState("");
  const [busy, setBusy] = useState(false);
  const [plan, setPlan] = useState<Draft | null>(null);
  const [newReason, setNewReason] = useState("");

  useEffect(() => {
    apiFetch<Config>("/qc-config").then(setCfg).catch((e) => setError((e as Error).message));
  }, [reloads]);

  if (!cfg) return <div style={{ fontSize: "12px", color: error ? C.red : C.textMuted }}>{error || "Loading QC settings…"}</div>;

  const reasonOk = why.trim().length >= 3;
  async function run(label: string, fn: () => Promise<unknown>) {
    if (!reasonOk) { setError("Give a reason for the change first (at least 3 characters)."); return; }
    setBusy(true); setError(""); setNotice("");
    try { await fn(); setNotice(label); setWhy(""); setPlan(null); setNewReason(""); setReloads((n) => n + 1); }
    catch (e) { setError((e as Error).message); }
    setBusy(false);
  }

  const plans = new Map<string, PlanStep[]>();
  for (const s of cfg.file_plan) plans.set(s.artifact_num ?? "", [...(plans.get(s.artifact_num ?? "") ?? []), s]);
  const defaultPlan = plans.get("") ?? null;
  const editPlan = (artifact: string) => setPlan({
    artifact, steps: (plans.get(artifact) ?? (artifact ? defaultPlan : null) ?? DEFAULT_STEPS).map((s) => ({ step_type: s.step_type, assignee_role: s.assignee_role, duration_days: s.duration_days })),
  });
  const planLine = (steps: { step_type: PlanStep["step_type"]; assignee_role: string | null; duration_days: number }[]) =>
    steps.map((s) => `${STEP_LABEL[s.step_type]} (${s.assignee_role ?? "any approver"}, ${s.duration_days} d)`).join(" → ") + " → Approved";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div>
        <h2 style={{ fontSize: "16px", fontWeight: 700, color: C.text }}>Quality control</h2>
        <p style={{ fontSize: "12px", color: C.textMuted, marginTop: "2px" }}>
          How submitted documents are reviewed before they become Final. {cfg.can_edit ? "Changes apply to documents submitted from now on." : "Only System Administrators, Sponsor Admins, TMF Leads and QA can change these settings."}
        </p>
      </div>

      {cfg.can_edit && (
        <label style={{ ...card, display: "flex", flexDirection: "column", gap: "4px", fontSize: "11px", fontWeight: 600, color: C.textSec }}>
          Reason for any change below (required, recorded in the audit trail)
          <input value={why} onChange={(e) => setWhy(e.target.value)} placeholder="e.g. QA decision QD-12" style={{ ...inputStyle, fontWeight: 400 }} />
        </label>
      )}
      {notice && <div role="status" style={{ fontSize: "12px", padding: "8px 12px", borderRadius: "8px", background: C.greenLight, color: C.green }}>{notice}</div>}
      {error && <div role="alert" style={{ fontSize: "12px", padding: "8px 12px", borderRadius: "8px", background: C.redLight, color: C.red }}>{error}</div>}

      {/* Control */}
      <div style={card}>
        <div style={{ fontSize: "13px", fontWeight: 600, color: C.text, marginBottom: "6px" }}>QC decisions are confirmed as</div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {(["attestation", "signature"] as const).map((k) => (
            <button key={k} disabled={!cfg.can_edit || busy || cfg.control === k}
              onClick={() => run(`QC decisions are now confirmed as ${k === "signature" ? "electronic signatures" : "attestations"}.`, () => apiFetch("/qc-config", { method: "PUT", body: JSON.stringify({ control: k, reason: why.trim() }) }))}
              style={{ ...btn(cfg.control === k ? C.orangeLight : C.bgCard, cfg.control === k ? C.orange : C.textSec), borderColor: cfg.control === k ? C.orange : C.border, flex: "1 1 220px", textAlign: "left", padding: "10px 12px", cursor: cfg.can_edit && cfg.control !== k ? "pointer" : "default" }}>
              {k === "attestation" ? "Attestation (default)" : "Electronic signature"}
              <div style={{ fontSize: "11px", fontWeight: 400, color: C.textMuted, marginTop: "2px" }}>
                {k === "attestation" ? "Password re-entry and a recorded confirmation. Recommended by the plan for QC." : "Password re-entry with a signature manifestation (name, date/time, meaning) under 21 CFR 11.50."}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* File Plan */}
      <div style={card}>
        <div style={{ fontSize: "13px", fontWeight: 600, color: C.text }}>File Plan</div>
        <div style={{ fontSize: "11px", color: C.textMuted, margin: "2px 0 8px" }}>The QC steps a document goes through after it is submitted. An artifact without its own plan uses the default.</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {[["", defaultPlan] as const, ...[...plans.entries()].filter(([a]) => a).sort()].map(([artifact, steps]) => (
            <div key={artifact || "default"} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", padding: "8px 10px", background: C.bg, borderRadius: "8px", flexWrap: "wrap" }}>
              <span style={{ fontWeight: 600, color: C.text, minWidth: "110px" }}>{artifact || "Default"}</span>
              <span style={{ flex: 1, color: C.textSec }}>{planLine(steps ?? DEFAULT_STEPS)}{!steps && <span style={{ color: C.textMuted }}> (built-in)</span>}</span>
              {cfg.can_edit && <button onClick={() => editPlan(artifact)} style={btn(C.bgCard, C.textSec)}>Edit</button>}
            </div>
          ))}
        </div>
        {cfg.can_edit && !plan && <button onClick={() => setPlan({ artifact: "", steps: (defaultPlan ?? DEFAULT_STEPS).map((s) => ({ ...s })) })} style={{ ...btn(C.bgCard, C.textSec), marginTop: "8px" }}>+ Plan for one artifact</button>}

        {plan && (
          <div style={{ marginTop: "10px", border: `0.5px solid ${C.border}`, borderRadius: "10px", padding: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
            <label style={{ fontSize: "11px", fontWeight: 600, color: C.textSec }}>Artifact number (leave empty for the default plan)
              <input value={plan.artifact} onChange={(e) => setPlan({ ...plan, artifact: e.target.value.trim() })} placeholder="e.g. 05.02.07" style={{ ...inputStyle, display: "block", marginTop: "4px", width: "160px", fontWeight: 400 }} />
              {plan.artifact && !/^\d{2}\.\d{2}\.\d{2}$/.test(plan.artifact) && <span style={{ fontSize: "10px", color: C.red, fontWeight: 400 }}>Use the form 01.01.01</span>}
            </label>
            {plan.steps.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontSize: "11px", color: C.textMuted, width: "18px" }}>{i + 1}.</span>
                <select value={s.step_type} disabled={i === 0} aria-label={`Step ${i + 1} type`} onChange={(e) => setPlan({ ...plan, steps: plan.steps.map((x, j) => j === i ? { ...x, step_type: e.target.value as PlanStep["step_type"] } : x) })} style={inputStyle}>
                  <option value="inbound_qc">Inbound QC</option><option value="post_approval_qc">Post-Approval QC</option>
                </select>
                <select value={s.assignee_role ?? ""} aria-label={`Step ${i + 1} reviewer`} onChange={(e) => setPlan({ ...plan, steps: plan.steps.map((x, j) => j === i ? { ...x, assignee_role: e.target.value || null } : x) })} style={inputStyle}>
                  <option value="">Any approver</option>
                  {cfg.approver_roles.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <input type="number" min={1} max={365} value={s.duration_days} aria-label={`Step ${i + 1} days`} onChange={(e) => setPlan({ ...plan, steps: plan.steps.map((x, j) => j === i ? { ...x, duration_days: Math.max(1, Math.min(365, Number(e.target.value) || 1)) } : x) })} style={{ ...inputStyle, width: "70px" }} />
                <span style={{ fontSize: "11px", color: C.textMuted }}>days</span>
                {i > 0 && <button aria-label={`Remove step ${i + 1}`} onClick={() => setPlan({ ...plan, steps: plan.steps.filter((_, j) => j !== i) })} style={btn(C.bgCard, C.textMuted)}><i className="ti ti-x" /></button>}
              </div>
            ))}
            {plan.steps.length < 4 && <button onClick={() => setPlan({ ...plan, steps: [...plan.steps, { step_type: "post_approval_qc", assignee_role: null, duration_days: 5 }] })} style={{ ...btn(C.bgCard, C.textSec), alignSelf: "flex-start" }}>+ Add step</button>}
            <div style={{ fontSize: "11px", color: C.textSec, background: C.bg, borderRadius: "8px", padding: "8px 10px" }}>
              <b>What happens next:</b> documents {plan.artifact ? `for artifact ${plan.artifact}` : "without their own plan"} submitted from now on go {planLine(plan.steps)}. Tasks already open are not changed.
            </div>
            <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
              <button onClick={() => setPlan(null)} style={btn(C.bgCard, C.textSec)}>Cancel</button>
              <button disabled={busy || !reasonOk || (!!plan.artifact && !/^\d{2}\.\d{2}\.\d{2}$/.test(plan.artifact))}
                onClick={() => run(`File Plan saved for ${plan.artifact || "the default"}.`, () => apiFetch("/qc-config/file-plan", { method: "PUT", body: JSON.stringify({ artifact_num: plan.artifact || null, steps: plan.steps, reason: why.trim() }) }))}
                style={{ ...btn(C.orange, "#fff"), border: "none", opacity: reasonOk ? 1 : 0.5 }}>Save File Plan</button>
            </div>
            {!reasonOk && <div style={{ fontSize: "10px", color: C.red, textAlign: "right" }}>Enter a reason for the change at the top first.</div>}
          </div>
        )}
      </div>

      {/* Reasons */}
      <div style={card}>
        <div style={{ fontSize: "13px", fontWeight: 600, color: C.text }}>Rejection reasons</div>
        <div style={{ fontSize: "11px", color: C.textMuted, margin: "2px 0 8px" }}>A reviewer chooses at least one when rejecting. Retired reasons stay on past decisions.</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: "6px" }}>
          {cfg.reasons.map((r) => (
            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", padding: "6px 8px", borderRadius: "8px", background: r.is_active ? C.bg : C.bgCard, border: `0.5px solid ${C.border}`, color: r.is_active ? C.textSec : C.textMuted }}>
              <span style={{ flex: 1, textDecoration: r.is_active ? "none" : "line-through" }}>{r.label}</span>
              <span style={{ fontSize: "10px", color: C.textMuted }} title="Risk weight (Part 11)">×{Number(r.weight)}</span>
              {cfg.can_edit && (
                <button disabled={busy} onClick={() => run(`${r.label} ${r.is_active ? "retired" : "restored"}.`, () => apiFetch(`/qc-config/reasons/${r.id}`, { method: "PATCH", body: JSON.stringify({ is_active: !r.is_active, row_version: r.row_version, reason: why.trim() }) }))}
                  style={{ ...btn(C.bgCard, C.textMuted), padding: "2px 7px", fontSize: "10px" }}>{r.is_active ? "Retire" : "Restore"}</button>
              )}
            </div>
          ))}
        </div>
        {cfg.can_edit && (
          <div style={{ display: "flex", gap: "6px", marginTop: "8px", flexWrap: "wrap" }}>
            <input value={newReason} onChange={(e) => setNewReason(e.target.value)} placeholder="New reason, e.g. Wrong Language" aria-label="New reason" style={{ ...inputStyle, flex: "1 1 220px" }} />
            <button disabled={busy || newReason.trim().length < 2} onClick={() => run(`${newReason.trim()} added.`, () => apiFetch("/qc-config/reasons", { method: "POST", body: JSON.stringify({ label: newReason.trim(), reason: why.trim() }) }))}
              style={{ ...btn(C.bgCard, C.textSec), opacity: newReason.trim().length >= 2 ? 1 : 0.5 }}>+ Add reason</button>
          </div>
        )}
      </div>
    </div>
  );
}
