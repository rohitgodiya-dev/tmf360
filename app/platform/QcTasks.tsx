"use client";
// Study Tasks (Part 7, WFL-05/07) and the QC task screen (QC-01..03): metadata | viewer | task
// panel with Accept/Reject, coded reasons, "what happens next", and password re-entry that
// records an attestation or electronic signature. All writes go through /api/v1.
import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api/client";
import DocumentViewer from "./DocumentViewer";

type TaskListRow = {
  id: string; document_id: string; doc_ref: string; title: string; artifact_num: string | null; task_type: string; cycle: number;
  assignee: string; created_at: string; created_by: string; due_at: string; status: string; outcome: string | null;
  completed_at: string | null; completed_by: string | null; overdue: boolean; can_work: boolean;
};
type Step = {
  id: string; step: string; cycle: number; status: string; assignee: string; created_at: string; due_at: string; overdue: boolean;
  completed_at: string | null; completed_by: string | null; cancel_reason: string | null;
  decision: { outcome: string; reasons: string[]; comment: string | null } | null;
  signature: { kind: string; meaning: string; signer: string; email: string; signed_at: string; file_hash: string | null } | null;
};
type TaskDetail = {
  task: { id: string; step: string; cycle: number; status: string; outcome: string | null; assignee: string; due_at: string; created_at: string; overdue: boolean };
  document: Record<string, string | null> & { id: string; title: string; status: string; has_file: boolean };
  file_version: { version_no: number; file_name: string; file_hash: string | null } | null;
  reasons: { code: string; label: string }[];
  control: "attestation" | "signature";
  can_work: boolean; can_reject: boolean; can_reassign: boolean;
  reassign_to: { people: { user_id: string; name: string; role: string }[]; roles: string[] };
  history: Step[];
};

const C = {
  orange: "#F97316", orangeLight: "#FFF7ED", text: "#111827", textSec: "#374151", textMuted: "#6B7280",
  border: "#E5EDF6", bg: "#F8FAFC", bgCard: "#FFFFFF", green: "#065F46", greenLight: "#ECFDF5",
  red: "#991B1B", redLight: "#FEF2F2", blue: "#1D4ED8", blueLight: "#EFF6FF", amber: "#92400E", amberLight: "#FFFBEB",
};
const btn = (bg: string, color: string): React.CSSProperties => ({ fontSize: "12px", fontWeight: 600, padding: "7px 12px", background: bg, color, border: `0.5px solid ${C.border}`, borderRadius: "8px", cursor: "pointer" });
const inputStyle: React.CSSProperties = { width: "100%", fontSize: "12px", padding: "7px 9px", border: `0.5px solid ${C.border}`, borderRadius: "8px", fontFamily: "inherit", boxSizing: "border-box", background: C.bgCard };
const card: React.CSSProperties = { background: C.bgCard, border: `0.5px solid ${C.border}`, borderRadius: "12px" };
const badge = (text: string, color: string, bg: string) => (
  <span style={{ fontSize: "10px", fontWeight: 600, padding: "2px 8px", borderRadius: "20px", color, background: bg, whiteSpace: "nowrap" }}>{text}</span>
);
const fmt = (s: string | null) => (s ? new Date(s).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—");
const fmtDay = (s: string | null) => (s ? new Date(s).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—");

function statusBadge(t: { status: string; outcome: string | null; overdue: boolean }) {
  if (t.status === "open") return t.overdue ? badge("Overdue", C.red, C.redLight) : badge("Open", C.blue, C.blueLight);
  if (t.status === "cancelled") return badge("Cancelled", C.textMuted, C.bg);
  return t.outcome === "accept" ? badge("Accepted", C.green, C.greenLight) : badge("Rejected", C.amber, C.amberLight);
}

function csvCell(v: unknown) {
  const s = v == null ? "" : String(v);
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;   // no formula injection in spreadsheets
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export default function QcTasks({ study, canDownload, initialTaskId, onChanged }: {
  study: { id: string; study_id: string }; canDownload: boolean; initialTaskId?: string | null; onChanged: () => void;
}) {
  const [scope, setScope] = useState<"mine" | "open" | "closed">("mine");
  const [rows, setRows] = useState<TaskListRow[] | null>(null);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState<string | null>(initialTaskId ?? null);
  const [reloads, setReloads] = useState(0);
  const [notice, setNotice] = useState("");

  useEffect(() => { if (initialTaskId) setOpenId(initialTaskId); }, [initialTaskId]);

  useEffect(() => {
    let cancelled = false;
    const q = scope === "mine" ? "scope=mine" : scope === "open" ? "scope=all&status=open" : "scope=all&status=closed";
    apiFetch<{ data: TaskListRow[] }>(`/studies/${study.id}/tasks?${q}`)
      .then((r) => { if (!cancelled) { setRows(r.data); setError(""); } })
      .catch((e) => { if (!cancelled) setError((e as Error).message); });
    return () => { cancelled = true; };
  }, [study.id, scope, reloads]);

  function exportCsv() {
    if (!rows?.length) return;
    const head = ["Document ID", "Title", "Artifact", "Task Type", "Cycle", "Assignee", "Created", "Created By", "Due", "Status", "Completed", "Completed By"];
    const lines = rows.map((r) => [r.doc_ref, r.title, r.artifact_num, r.task_type, r.cycle, r.assignee, r.created_at, r.created_by, r.due_at,
      r.status === "open" ? (r.overdue ? "Overdue" : "Open") : r.status === "completed" ? (r.outcome === "accept" ? "Accepted" : "Rejected") : "Cancelled",
      r.completed_at, r.completed_by].map(csvCell).join(","));
    const url = URL.createObjectURL(new Blob([[head.join(","), ...lines].join("\n")], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = `${study.study_id.replace(/[^\w.-]/g, "_")}-qc-tasks.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  if (openId) {
    return <TaskScreen taskId={openId} canDownload={canDownload}
      onBack={() => { setOpenId(null); setReloads((n) => n + 1); }}
      onDone={(msg) => { setNotice(msg); setOpenId(null); setReloads((n) => n + 1); onChanged(); }} />;
  }

  const overdue = rows?.filter((r) => r.overdue).length ?? 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "8px", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 700, color: C.text }}>Study Tasks — {study.study_id}</h1>
          <p style={{ fontSize: "12px", color: C.textMuted, marginTop: "2px" }}>QC tasks created from the File Plan when documents are submitted. Open a task to review the document and record your decision.</p>
        </div>
        <button onClick={exportCsv} disabled={!rows?.length} style={{ ...btn(C.bgCard, C.textSec), opacity: rows?.length ? 1 : 0.5 }}><i className="ti ti-download" /> Export</button>
      </div>

      {notice && <div role="status" style={{ fontSize: "12px", padding: "8px 12px", borderRadius: "8px", background: C.greenLight, color: C.green }}>{notice}</div>}

      <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", border: `0.5px solid ${C.border}`, borderRadius: "8px", overflow: "hidden" }}>
          {([["mine", "My active tasks"], ["open", "All open"], ["closed", "Closed"]] as const).map(([k, label]) => (
            <button key={k} onClick={() => { setScope(k); setRows(null); }} style={{ fontSize: "12px", padding: "7px 12px", border: "none", cursor: "pointer",
              background: scope === k ? C.orangeLight : C.bgCard, color: scope === k ? C.orange : C.textSec, fontWeight: scope === k ? 600 : 400 }}>{label}</button>
          ))}
        </div>
        {overdue > 0 && badge(`${overdue} overdue`, C.red, C.redLight)}
        <button onClick={() => { setRows(null); setReloads((n) => n + 1); }} aria-label="Refresh tasks" style={{ ...btn(C.bgCard, C.textSec), marginLeft: "auto" }}><i className="ti ti-refresh" /> Refresh</button>
      </div>

      {error && <div style={{ fontSize: "12px", padding: "8px 10px", borderRadius: "8px", background: C.redLight, color: C.red }}>{error}</div>}

      <div style={{ ...card, overflowX: "auto" }}>
        <table style={{ width: "100%", fontSize: "12px", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `0.5px solid ${C.border}`, background: C.bg }}>
              {["Document ID", "Title", "Task Type", "Assignee", "Created", "Created By", "Due", "Status", ""].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: "9px 12px", fontSize: "11px", fontWeight: 600, color: C.textSec, whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!rows ? (
              <tr><td colSpan={9} style={{ padding: "2rem", textAlign: "center", color: C.textMuted }}>Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={9} style={{ padding: "2.5rem 1rem", textAlign: "center", color: C.textMuted }}>
                <i className="ti ti-checklist" style={{ fontSize: "28px", display: "block", marginBottom: "6px" }} />
                {scope === "mine" ? "No QC tasks waiting for you. Tasks appear here when documents you can review are submitted for QC." : "No tasks here."}
              </td></tr>
            ) : rows.map((r) => (
              <tr key={r.id} style={{ borderBottom: `0.5px solid ${C.bg}`, background: r.overdue ? "#FFF8F8" : "transparent" }}>
                <td style={{ padding: "8px 12px", fontFamily: "monospace", fontSize: "11px", color: C.textMuted }}>{r.doc_ref}</td>
                <td style={{ padding: "8px 12px", color: C.text, maxWidth: "260px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.title}>{r.title}</td>
                <td style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>{r.task_type}{r.cycle > 1 ? <span style={{ color: C.textMuted }}> · round {r.cycle}</span> : null}</td>
                <td style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>{r.assignee}</td>
                <td style={{ padding: "8px 12px", whiteSpace: "nowrap", color: C.textMuted }}>{fmtDay(r.created_at)}</td>
                <td style={{ padding: "8px 12px", whiteSpace: "nowrap", color: C.textMuted }}>{r.created_by}</td>
                <td style={{ padding: "8px 12px", whiteSpace: "nowrap", color: r.overdue ? C.red : C.textSec, fontWeight: r.overdue ? 600 : 400 }}>{fmtDay(r.due_at)}</td>
                <td style={{ padding: "8px 12px" }}>{statusBadge(r)}</td>
                <td style={{ padding: "8px 12px", textAlign: "right" }}>
                  <button onClick={() => setOpenId(r.id)} style={btn(r.can_work ? C.orange : C.bgCard, r.can_work ? "#fff" : C.textSec)}>{r.can_work ? "Review" : "Open"}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TaskScreen({ taskId, canDownload, onBack, onDone }: { taskId: string; canDownload: boolean; onBack: () => void; onDone: (msg: string) => void }) {
  const [d, setD] = useState<TaskDetail | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"details" | "history">("details");
  const [outcome, setOutcome] = useState<"accept" | "reject" | null>(null);
  const [codes, setCodes] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [reassigning, setReassigning] = useState(false);
  const [target, setTarget] = useState("");
  const [why, setWhy] = useState("");

  useEffect(() => {
    let cancelled = false;
    apiFetch<TaskDetail>(`/tasks/${taskId}`).then((r) => { if (!cancelled) setD(r); }).catch((e) => { if (!cancelled) setError((e as Error).message); });
    return () => { cancelled = true; };
  }, [taskId]);

  if (!d) return <div style={{ fontSize: "12px", color: error ? C.red : C.textMuted }}>{error || "Loading task…"}</div>;

  const doc = d.document;
  const meaning = outcome === "reject" ? "Reviewed and rejected" : "Reviewed and accepted";
  const controlName = d.control === "signature" ? "electronic signature" : "attestation";
  const rejectInvalid = outcome === "reject" && (codes.length === 0 || !comment.trim());
  const ready = !!outcome && !rejectInvalid && password.length > 0 && !saving;

  async function confirm() {
    if (!ready || !d) return;
    setSaving(true); setError("");
    try {
      const r = await apiFetch<{ document_status: string; next_task_id: string | null }>(`/tasks/${taskId}/complete`, {
        method: "POST", body: JSON.stringify({ outcome, reason_codes: outcome === "reject" ? codes : [], comment: comment.trim(), password }),
      });
      setPassword("");
      onDone(outcome === "reject"
        ? `“${doc.title}” was rejected and returned to its owner as Draft.`
        : r.document_status === "Approved" ? `“${doc.title}” passed QC and is now Approved.` : `“${doc.title}” passed ${d.task.step}; the next QC step has been assigned.`);
    } catch (e) {
      setPassword("");
      setError((e as Error).message);
    }
    setSaving(false);
  }

  async function reassign() {
    if (!target || why.trim().length < 3) return;
    setSaving(true); setError("");
    try {
      const [kind, value] = target.split(":");
      await apiFetch(`/tasks/${taskId}/reassign`, { method: "POST", body: JSON.stringify(kind === "user" ? { user_id: value, reason: why.trim() } : { role: value, reason: why.trim() }) });
      onDone(`Task reassigned to ${kind === "user" ? d!.reassign_to.people.find((p) => p.user_id === value)?.name : value}.`);
    } catch (e) { setError((e as Error).message); }
    setSaving(false);
  }

  const meta: [string, unknown][] = [
    ["Status", doc.status], ["Artifact", `${doc.artifact_num ?? ""} · ${doc.artifact_name ?? ""}`], ["Version", doc.version], ["Owner", doc.owner],
    ["Effective", doc.effective_date], ["Expiry", doc.expiry_date], ["File", d.file_version ? `v${d.file_version.version_no} · ${d.file_version.file_name}` : doc.file_name],
    ["File hash", d.file_version?.file_hash ? `${d.file_version.file_hash.slice(0, 16)}…` : null], ["Filed", fmt(doc.created_at)],
    ["Submitted with", doc.submission_reason],
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
        <button onClick={onBack} style={btn(C.bgCard, C.textSec)}><i className="ti ti-arrow-left" /> Study Tasks</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "16px", fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.task.step}: {doc.title}</div>
          <div style={{ fontSize: "11px", color: C.textMuted }}>Assigned to {d.task.assignee} · due {fmtDay(d.task.due_at)}{d.task.cycle > 1 ? ` · round ${d.task.cycle}` : ""}</div>
        </div>
        {statusBadge(d.task)}
      </div>

      {/* Three panes (QC-01): metadata | viewer | task panel */}
      <div style={{ display: "flex", gap: "10px", alignItems: "stretch", flexWrap: "wrap" }}>
        <aside style={{ ...card, flex: "0 0 230px", maxWidth: "100%", padding: "14px", alignSelf: "flex-start" }}>
          <div style={{ fontSize: "11px", fontWeight: 600, color: C.textSec, marginBottom: "8px", textTransform: "uppercase", letterSpacing: ".04em" }}>Metadata</div>
          <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "5px 10px", fontSize: "11px", margin: 0 }}>
            {meta.filter(([, v]) => v != null && v !== "").map(([k, v]) => (
              <div key={k} style={{ display: "contents" }}>
                <dt style={{ color: C.textMuted }}>{k}</dt>
                <dd style={{ margin: 0, color: C.text, wordBreak: "break-word" }}>{String(v)}</dd>
              </div>
            ))}
          </dl>
          <div style={{ fontSize: "10px", color: C.textMuted, marginTop: "10px", lineHeight: 1.5 }}>
            Metadata wrong? Reject with “Incorrectly Indexed” and say what to change; the owner corrects it and resubmits.
          </div>
        </aside>

        <section style={{ flex: "1 1 420px", minWidth: 0, height: "calc(100vh - 190px)", minHeight: "460px" }}>
          {doc.has_file
            ? <DocumentViewer inline documentId={doc.id} canDownload={canDownload} onClose={() => {}} />
            : <div style={{ ...card, height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", color: C.textMuted }}>This record has no file.</div>}
        </section>

        <aside style={{ ...card, flex: "0 0 330px", maxWidth: "100%", display: "flex", flexDirection: "column", overflow: "hidden", alignSelf: "flex-start" }}>
          <div style={{ display: "flex", borderBottom: `0.5px solid ${C.border}` }}>
            {([["details", "Details"], ["history", `History & comments (${d.history.length})`]] as const).map(([k, label]) => (
              <button key={k} onClick={() => setTab(k)} style={{ flex: 1, fontSize: "11px", fontWeight: 600, padding: "9px", border: "none", cursor: "pointer",
                background: tab === k ? C.bgCard : C.bg, color: tab === k ? C.orange : C.textMuted, borderBottom: tab === k ? `2px solid ${C.orange}` : "2px solid transparent" }}>{label}</button>
            ))}
          </div>

          <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: "12px", maxHeight: "calc(100vh - 230px)", overflowY: "auto" }}>
            {tab === "history" ? <History steps={d.history} /> : d.task.status !== "open" ? (
              <div style={{ fontSize: "12px", color: C.textSec }}>This task is {d.task.status}. See History for the decision.</div>
            ) : !d.can_work ? (
              <div style={{ fontSize: "12px", color: C.textSec, background: C.bg, borderRadius: "8px", padding: "10px" }}>
                This task is assigned to <b>{d.task.assignee}</b>. You can follow it here; only the assignee can record the decision.
              </div>
            ) : (
              <>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 600, color: C.textSec, marginBottom: "6px" }}>Outcome</div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button aria-pressed={outcome === "accept"} onClick={() => setOutcome("accept")} style={{ ...btn(outcome === "accept" ? C.greenLight : C.bgCard, outcome === "accept" ? C.green : C.textSec), flex: 1, borderColor: outcome === "accept" ? C.green : C.border }}>
                      <i className="ti ti-check" /> Accept
                    </button>
                    {d.can_reject && (
                      <button aria-pressed={outcome === "reject"} onClick={() => setOutcome("reject")} style={{ ...btn(outcome === "reject" ? C.redLight : C.bgCard, outcome === "reject" ? C.red : C.textSec), flex: 1, borderColor: outcome === "reject" ? C.red : C.border }}>
                        <i className="ti ti-x" /> Reject
                      </button>
                    )}
                  </div>
                </div>

                {outcome === "reject" && (
                  <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
                    <legend style={{ fontSize: "11px", fontWeight: 600, color: C.textSec, marginBottom: "6px" }}>Reasons (choose at least one)</legend>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px 8px" }}>
                      {d.reasons.map((r) => (
                        <label key={r.code} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: C.textSec, cursor: "pointer" }}>
                          <input type="checkbox" checked={codes.includes(r.code)} onChange={(e) => setCodes((c) => e.target.checked ? [...c, r.code] : c.filter((x) => x !== r.code))} />
                          {r.label}
                        </label>
                      ))}
                    </div>
                    {codes.length === 0 && <div style={{ fontSize: "10px", color: C.red, marginTop: "4px" }}>Choose at least one reason.</div>}
                  </fieldset>
                )}

                {outcome && (
                  <label style={{ fontSize: "11px", fontWeight: 600, color: C.textSec }}>
                    Comment{outcome === "reject" ? " (required)" : " (optional)"}
                    <textarea value={comment} onChange={(e) => setComment(e.target.value.slice(0, 2000))} rows={3}
                      placeholder={outcome === "reject" ? "What must the owner fix?" : "Anything the owner should know"}
                      style={{ ...inputStyle, marginTop: "4px", resize: "vertical", fontWeight: 400 }} />
                    <span style={{ display: "block", textAlign: "right", fontSize: "10px", color: C.textMuted, fontWeight: 400 }}>{comment.length}/2000</span>
                    {outcome === "reject" && !comment.trim() && <span style={{ display: "block", fontSize: "10px", color: C.red, fontWeight: 400 }}>Add a comment for the owner.</span>}
                  </label>
                )}

                {outcome && (
                  <>
                    {/* QC-03: what happens next, before Confirm & Close */}
                    <div style={{ fontSize: "11px", color: C.textSec, background: C.bg, borderRadius: "8px", padding: "9px 10px", lineHeight: 1.5 }}>
                      <b>What happens next: </b>
                      {outcome === "accept"
                        ? "the document moves to the next QC step in its File Plan, or becomes Approved (Final) if this is the last step. The file can no longer be replaced once it is Approved."
                        : "the document goes back to its owner as Draft with your reasons and comment. When they resubmit, QC starts again at Inbound QC."}
                    </div>
                    <div style={{ fontSize: "11px", color: C.textSec, border: `0.5px solid ${C.border}`, borderRadius: "8px", padding: "9px 10px", lineHeight: 1.5 }}>
                      Your password confirms this as an <b>{controlName}</b>: “{meaning}”, with your name and the server’s date and time,
                      linked to {d.file_version ? `file version v${d.file_version.version_no}` : "this record"}.
                      <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") confirm(); }} aria-label="Password" placeholder="Your password"
                        style={{ ...inputStyle, marginTop: "6px" }} />
                    </div>
                    <button onClick={confirm} disabled={!ready} style={{ ...btn(C.orange, "#fff"), border: "none", padding: "10px", opacity: ready ? 1 : 0.5 }}>
                      {saving ? "Saving…" : "Confirm & Close"}
                    </button>
                  </>
                )}
              </>
            )}

            {error && <div role="alert" style={{ fontSize: "12px", padding: "8px 10px", borderRadius: "8px", background: C.redLight, color: C.red }}>{error}</div>}

            {tab === "details" && d.can_reassign && (
              <div style={{ borderTop: `0.5px solid ${C.border}`, paddingTop: "10px" }}>
                {!reassigning ? (
                  <button onClick={() => setReassigning(true)} style={{ ...btn(C.bgCard, C.textSec), width: "100%" }}><i className="ti ti-user-share" /> Reassign</button>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <select value={target} onChange={(e) => setTarget(e.target.value)} aria-label="Reassign to" style={inputStyle}>
                      <option value="">Choose a person or role…</option>
                      <optgroup label="People">{d.reassign_to.people.map((p) => <option key={p.user_id} value={`user:${p.user_id}`}>{p.name} ({p.role})</option>)}</optgroup>
                      <optgroup label="Roles">{d.reassign_to.roles.map((r) => <option key={r} value={`role:${r}`}>Anyone with role {r}</option>)}</optgroup>
                    </select>
                    <input value={why} onChange={(e) => setWhy(e.target.value)} placeholder="Reason (recorded in the audit trail)" aria-label="Reason for reassigning" style={inputStyle} />
                    <div style={{ fontSize: "10px", color: C.textMuted }}>What happens next: the task moves to the new assignee with the same due date.</div>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button onClick={() => setReassigning(false)} style={{ ...btn(C.bgCard, C.textSec), flex: 1 }}>Cancel</button>
                      <button onClick={reassign} disabled={!target || why.trim().length < 3 || saving} style={{ ...btn(C.orange, "#fff"), flex: 1, border: "none", opacity: target && why.trim().length >= 3 ? 1 : 0.5 }}>Reassign</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

/** Timeline (WFL-04) with each decision's signature manifestation (SIG-02). Also used by the Navigator. */
export function History({ steps }: { steps: Step[] }) {
  if (!steps.length) return <div style={{ fontSize: "11px", color: C.textMuted }}>Not submitted for QC yet.</div>;
  return (
    <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
      {steps.map((s) => (
        <li key={s.id} style={{ borderLeft: `2px solid ${s.status === "open" ? C.blue : s.decision?.outcome === "reject" ? C.red : s.status === "cancelled" ? C.border : C.green}`, paddingLeft: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: C.text }}>{s.step}{s.cycle > 1 ? ` · round ${s.cycle}` : ""}</span>
            {statusBadge({ status: s.status, outcome: s.decision?.outcome ?? null, overdue: s.overdue })}
          </div>
          <div style={{ fontSize: "11px", color: C.textMuted }}>Assigned to {s.assignee} · created {fmt(s.created_at)} · due {fmtDay(s.due_at)}</div>
          {s.cancel_reason && <div style={{ fontSize: "11px", color: C.textSec }}>Cancelled: {s.cancel_reason}</div>}
          {s.decision && (
            <div style={{ fontSize: "11px", color: C.textSec, marginTop: "3px" }}>
              {s.decision.reasons.length > 0 && <div>Reasons: {s.decision.reasons.join(", ")}</div>}
              {s.decision.comment && <div>“{s.decision.comment}”</div>}
            </div>
          )}
          {s.signature && (
            <div style={{ fontSize: "10px", color: C.textSec, background: C.bg, borderRadius: "6px", padding: "5px 7px", marginTop: "4px" }}>
              <i className="ti ti-signature" /> {s.signature.signer} · {s.signature.meaning} · {fmt(s.signature.signed_at)}
              <span style={{ color: C.textMuted }}> ({s.signature.kind === "signature" ? "electronic signature" : "attestation"})</span>
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}
