"use client";
// Amendment tracker (Part 19): register a Final protocol or protocol amendment as a protocol version; every
// selected, qualified or active site must then acknowledge it (and re-consent participants when required).
// Overdue sites — past the effective date or the re-consent deadline — are highlighted.
import { useEffect, useState } from "react";
import { ApiClientError, apiFetch } from "../../lib/api/client";

type SiteAck = {
  id: string; study_site_id: string; status: string; acknowledged_at: string | null; acknowledged_by_email: string | null; acknowledgement_note: string | null;
  reconsent_count: number; reconsent_completed: boolean; overdue: boolean; reconsent_overdue: boolean; can_act: boolean;
  site: { site_number: string; display_name: string; status: string; country: { country_code: string } | null } | null;
};
type Amendment = {
  id: string; amendment_number: string; protocol_version: string; effective_date: string; reconsent_required: boolean; reconsent_deadline: string | null;
  notes: string | null; created_at: string; created_by_email: string | null;
  document: { id: string; custom_file_name: string | null; file_name: string | null; artifact_num: string; artifact_name: string; version: string | null } | null;
  sites: SiteAck[]; counts: { total: number; acknowledged: number; overdue: number; reconsent_completed: number };
};
type Doc = { id: string; custom_file_name: string | null; file_name: string | null; artifact_num: string; artifact_name: string; version: string | null; approved_at: string | null };
type Data = { amendments: Amendment[]; unregistered: Doc[]; can_register: boolean };

const C = {
  orange: "#F97316", orangeLight: "#FFF7ED", text: "#111827", textSec: "#374151", textMuted: "#6B7280",
  border: "#E5EDF6", bg: "#F8FAFC", bgCard: "#FFFFFF", greenDark: "#065F46", greenLight: "#ECFDF5",
  amberDark: "#92400E", amberLight: "#FFFBEB", redDark: "#991B1B", redLight: "#FEF2F2", gray: "#4B5563", grayLight: "#F3F4F6",
};
const card: React.CSSProperties = { background: C.bgCard, border: `0.5px solid ${C.border}`, borderRadius: "12px", padding: "14px 16px" };
const btn = (bg: string, color: string): React.CSSProperties => ({ fontSize: "12px", fontWeight: 600, padding: "6px 12px", background: bg, color, border: `0.5px solid ${C.border}`, borderRadius: "8px", cursor: "pointer" });
const input: React.CSSProperties = { width: "100%", fontSize: "13px", padding: "8px 10px", border: `0.5px solid ${C.border}`, borderRadius: "8px", fontFamily: "inherit", boxSizing: "border-box", background: C.bgCard };
const th: React.CSSProperties = { textAlign: "left", padding: "8px 10px", fontSize: "11px", fontWeight: 600, color: C.textSec, whiteSpace: "nowrap" };
const td: React.CSSProperties = { padding: "8px 10px", fontSize: "12px", color: C.text, borderTop: `0.5px solid ${C.border}`, verticalAlign: "top" };
const pill = (text: string, fg: string, bg: string) => <span style={{ fontSize: "10px", fontWeight: 600, padding: "3px 9px", borderRadius: "20px", color: fg, background: bg, whiteSpace: "nowrap" }}>{text}</span>;
const docName = (d: { custom_file_name: string | null; file_name: string | null; artifact_name: string } | null) => d ? (d.custom_file_name || d.file_name || d.artifact_name) : "—";
const errText = (e: unknown) => (e instanceof ApiClientError ? e.message : "Something went wrong. Try again.");

function Modal({ title, onClose, onSave, saving, canSave, saveLabel, next, children }: {
  title: string; onClose: () => void; onSave: () => void; saving: boolean; canSave: boolean; saveLabel: string; next: string; children: React.ReactNode;
}) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div role="dialog" aria-label={title} style={{ background: C.bgCard, borderRadius: "14px", padding: "24px", width: "100%", maxWidth: "520px", maxHeight: "85vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
          <div style={{ fontSize: "15px", fontWeight: 600, color: C.text }}>{title}</div>
          <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: C.textMuted }}>×</button>
        </div>
        {children}
        <div style={{ fontSize: "11px", color: C.textMuted, background: C.bg, borderRadius: "8px", padding: "8px 10px", marginTop: "6px" }}>What happens next: {next}</div>
        <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
          <button onClick={onClose} style={{ flex: 1, padding: "10px", border: `0.5px solid ${C.border}`, borderRadius: "8px", background: C.bgCard, cursor: "pointer", fontSize: "13px" }}>Cancel</button>
          <button onClick={onSave} disabled={saving || !canSave} style={{ flex: 2, padding: "10px", background: C.orange, color: "#fff", border: "none", borderRadius: "8px", cursor: saving || !canSave ? "default" : "pointer", fontSize: "13px", fontWeight: 600, opacity: saving || !canSave ? 0.6 : 1 }}>{saving ? "Saving..." : saveLabel}</button>
        </div>
      </div>
    </div>
  );
}
const Field = ({ label, error, children }: { label: string; error?: string | null; children: React.ReactNode }) => (
  <div style={{ marginBottom: "12px" }}>
    <label style={{ fontSize: "11px", fontWeight: 600, color: C.textSec, display: "block", marginBottom: "5px" }}>{label}</label>
    {children}
    {error && <div style={{ fontSize: "11px", color: C.redDark, marginTop: "4px" }}>{error}</div>}
  </div>
);

export default function AmendmentTracker({ study, onOpenDocument }: { study: { id: string; study_id: string }; onOpenDocument?: (id: string) => void }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloads, setReloads] = useState(0);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [modal, setModal] = useState<null | { kind: "register"; doc: Doc } | { kind: "ack" | "reconsent"; a: Amendment; s: SiteAck }>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch<Data>(`/studies/${study.id}/amendments`)
      .then((d) => { if (!cancelled) { setData(d); setError(null); } })
      .catch((e) => { if (!cancelled) setError(errText(e)); });
    return () => { cancelled = true; };
  }, [study.id, reloads]);
  const done = (msg: string) => { setModal(null); setNotice(msg); setReloads((n) => n + 1); };

  if (error) return <div style={{ padding: "1.25rem" }}><div role="alert" style={{ ...card, background: C.redLight, color: C.redDark, fontSize: "12px" }}>{error}</div></div>;
  if (!data) return <div style={{ padding: "1.25rem", fontSize: "12px", color: C.textMuted }}>Loading protocol amendments…</div>;

  return (
    <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "14px" }}>
      <div>
        <div style={{ fontSize: "16px", fontWeight: 600, color: C.text }}>Amendment tracker</div>
        <div style={{ fontSize: "12px", color: C.textMuted }}>Protocol versions of study {study.study_id}, and which sites have acknowledged them and re-consented participants.</div>
      </div>
      {notice && <div role="status" style={{ ...card, background: C.greenLight, color: C.greenDark, fontSize: "12px" }}>{notice}</div>}

      {data.unregistered.length > 0 && (
        <div style={{ ...card, background: C.orangeLight }}>
          <div style={{ fontSize: "13px", fontWeight: 600, color: C.text, marginBottom: "6px" }}><i className="ti ti-file-alert" /> Approved protocol documents not yet registered as a protocol version</div>
          {data.unregistered.map((d) => (
            <div key={d.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 0", borderTop: `0.5px solid ${C.border}` }}>
              <div style={{ flex: 1, fontSize: "12px" }}><b>{docName(d)}</b> <span style={{ color: C.textMuted }}>{d.artifact_num} {d.artifact_name}{d.version ? ` · v${d.version}` : ""}</span></div>
              {data.can_register
                ? <button style={btn(C.orange, "#fff")} onClick={() => setModal({ kind: "register", doc: d })}>Is this an amendment? Register</button>
                : <span style={{ fontSize: "11px", color: C.textMuted }}>A study manager registers it</span>}
            </div>
          ))}
        </div>
      )}

      {data.amendments.length === 0 ? (
        <div style={{ ...card, textAlign: "center", padding: "2.5rem 1rem" }}>
          <i className="ti ti-file-diff" style={{ fontSize: "32px", color: C.textMuted }} />
          <div style={{ fontSize: "13px", fontWeight: 600, color: C.text, marginTop: "8px" }}>No protocol amendments registered yet.</div>
          <div style={{ fontSize: "12px", color: C.textMuted }}>When a Protocol (02.01.02) or Protocol Amendment (02.01.04) is approved, register it here to send it to every site.</div>
        </div>
      ) : data.amendments.map((a) => (
        <div key={a.id} style={{ ...card, padding: 0 }}>
          <button onClick={() => setOpen((o) => ({ ...o, [a.id]: !o[a.id] }))} aria-expanded={!!open[a.id]}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: "10px", padding: "12px 14px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}>
            <i className={`ti ti-chevron-${open[a.id] ? "down" : "right"}`} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "13px", fontWeight: 600, color: C.text }}>Amendment {a.amendment_number} · protocol v{a.protocol_version}</div>
              <div style={{ fontSize: "11px", color: C.textMuted }}>Effective {a.effective_date}{a.reconsent_required ? ` · re-consent by ${a.reconsent_deadline}` : " · no re-consent"} · {docName(a.document)}</div>
            </div>
            {pill(`${a.counts.acknowledged}/${a.counts.total} acknowledged`, a.counts.acknowledged === a.counts.total ? C.greenDark : C.gray, a.counts.acknowledged === a.counts.total ? C.greenLight : C.grayLight)}
            {a.counts.overdue > 0 && pill(`${a.counts.overdue} overdue`, C.redDark, C.redLight)}
            {a.reconsent_required && pill(`${a.counts.reconsent_completed}/${a.counts.total} re-consented`, C.amberDark, C.amberLight)}
          </button>
          {open[a.id] && (
            <div style={{ overflowX: "auto", borderTop: `0.5px solid ${C.border}` }}>
              {a.document && onOpenDocument && <div style={{ padding: "8px 14px" }}><button style={btn(C.bgCard, C.textSec)} onClick={() => onOpenDocument(a.document!.id)}><i className="ti ti-file-text" /> Open protocol document</button></div>}
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr style={{ background: C.bg }}>{["Site", "Country", "Acknowledged", "Date", "Re-consented", "Status", ""].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {a.sites.map((s) => (
                    <tr key={s.id} style={{ background: s.overdue || s.reconsent_overdue ? C.redLight : undefined }}>
                      <td style={td}><b>{s.site?.site_number}</b> — {s.site?.display_name}</td>
                      <td style={td}>{s.site?.country?.country_code ?? "—"}</td>
                      <td style={td}>{s.status === "acknowledged" ? <>Yes<div style={{ fontSize: "11px", color: C.textMuted }}>{s.acknowledged_by_email}</div></> : "No"}</td>
                      <td style={td}>{s.acknowledged_at ? new Date(s.acknowledged_at).toLocaleDateString() : "—"}</td>
                      <td style={td}>{a.reconsent_required ? `${s.reconsent_count}${s.reconsent_completed ? " (complete)" : ""}` : "n/a"}</td>
                      <td style={td}>
                        {s.overdue ? pill("Overdue", C.redDark, C.redLight) : s.status === "acknowledged" ? pill("Acknowledged", C.greenDark, C.greenLight) : pill("Pending", C.gray, C.grayLight)}
                        {s.reconsent_overdue && <div style={{ marginTop: "4px" }}>{pill("Re-consent overdue", C.redDark, C.redLight)}</div>}
                      </td>
                      <td style={{ ...td, whiteSpace: "nowrap" }}>
                        {s.can_act && s.status !== "acknowledged" && <button style={btn(C.orange, "#fff")} onClick={() => setModal({ kind: "ack", a, s })}>Acknowledge</button>}{" "}
                        {s.can_act && a.reconsent_required && !s.reconsent_completed && <button style={btn(C.bgCard, C.textSec)} onClick={() => setModal({ kind: "reconsent", a, s })}>Re-consent</button>}
                      </td>
                    </tr>
                  ))}
                  {a.sites.length === 0 && <tr><td style={{ ...td, color: C.textMuted }} colSpan={7}>No selected, qualified or active sites when this was registered.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}

      {modal?.kind === "register" && <Register study={study} doc={modal.doc} onClose={() => setModal(null)} onDone={done} />}
      {modal?.kind === "ack" && <Acknowledge a={modal.a} s={modal.s} onClose={() => setModal(null)} onDone={done} />}
      {modal?.kind === "reconsent" && <Reconsent a={modal.a} s={modal.s} onClose={() => setModal(null)} onDone={done} />}
    </div>
  );
}

function Register({ study, doc, onClose, onDone }: { study: { id: string }; doc: Doc; onClose: () => void; onDone: (m: string) => void }) {
  const [number, setNumber] = useState("");
  const [version, setVersion] = useState(doc.version ?? "");
  const [effective, setEffective] = useState("");
  const [reconsent, setReconsent] = useState(false);
  const [deadline, setDeadline] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const deadlineErr = reconsent && !deadline ? "Give the re-consent deadline" : reconsent && effective && deadline < effective ? "Cannot be before the effective date" : null;
  const can = !!number.trim() && !!version.trim() && !!effective && !deadlineErr;
  async function save() {
    setSaving(true); setErr(null);
    try {
      const r = await apiFetch<{ sites: number; notified: number }>(`/studies/${study.id}/amendments`, { method: "POST", body: JSON.stringify({
        document_id: doc.id, amendment_number: number.trim(), protocol_version: version.trim(), effective_date: effective,
        reconsent_required: reconsent, reconsent_deadline: reconsent ? deadline : null, notes: notes.trim() || null }) });
      onDone(`Amendment ${number.trim()} registered: ${r.sites} site(s) must acknowledge; ${r.notified} site contact(s) emailed.`);
    } catch (e) { setErr(errText(e)); } finally { setSaving(false); }
  }
  return (
    <Modal title="Register protocol amendment" onClose={onClose} onSave={save} saving={saving} canSave={can} saveLabel="Register and notify sites"
      next="every site that is selected, qualified or active gets an acknowledgement task, and the site contacts on record are emailed. Sites still pending after the effective date show as overdue.">
      <div style={{ fontSize: "12px", color: C.textSec, marginBottom: "10px" }}>{docName(doc)} · {doc.artifact_num} {doc.artifact_name}</div>
      <div style={{ display: "flex", gap: "8px" }}>
        <div style={{ flex: 1 }}><Field label="Amendment number"><input value={number} onChange={(e) => setNumber(e.target.value)} maxLength={50} style={input} placeholder="e.g. 3" /></Field></div>
        <div style={{ flex: 1 }}><Field label="Protocol version"><input value={version} onChange={(e) => setVersion(e.target.value)} maxLength={50} style={input} placeholder="e.g. 4.0" /></Field></div>
      </div>
      <Field label="Effective date"><input type="date" value={effective} onChange={(e) => setEffective(e.target.value)} style={input} /></Field>
      <label style={{ display: "flex", gap: "6px", alignItems: "center", fontSize: "12px", color: C.text, marginBottom: "10px" }}>
        <input type="checkbox" checked={reconsent} onChange={(e) => setReconsent(e.target.checked)} /> Participants must be re-consented
      </label>
      {reconsent && <Field label="Re-consent deadline" error={deadline || effective ? deadlineErr : null}><input type="date" value={deadline} min={effective || undefined} onChange={(e) => setDeadline(e.target.value)} style={input} /></Field>}
      <Field label="Notes (optional)" error={err}><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={2000} style={{ ...input, resize: "vertical" }} /></Field>
    </Modal>
  );
}

function Acknowledge({ a, s, onClose, onDone }: { a: Amendment; s: SiteAck; onClose: () => void; onDone: (m: string) => void }) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function save() {
    setSaving(true); setErr(null);
    try { await apiFetch(`/amendment-acks/${s.id}`, { method: "POST", body: JSON.stringify({ action: "acknowledge", note: note.trim() || undefined }) }); onDone(`Site ${s.site?.site_number} acknowledged amendment ${a.amendment_number}.`); }
    catch (e) { setErr(errText(e)); } finally { setSaving(false); }
  }
  return (
    <Modal title={`Acknowledge amendment ${a.amendment_number} — site ${s.site?.site_number}`} onClose={onClose} onSave={save} saving={saving} canSave saveLabel="Acknowledge"
      next="the acknowledgement is recorded with your name and the server time, and kept in the audit trail. It cannot be withdrawn.">
      <Field label="Note (optional)" error={err}><textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={2000} style={{ ...input, resize: "vertical" }} placeholder="e.g. Filed in the ISF; staff trained" /></Field>
    </Modal>
  );
}

function Reconsent({ a, s, onClose, onDone }: { a: Amendment; s: SiteAck; onClose: () => void; onDone: (m: string) => void }) {
  const [count, setCount] = useState(String(s.reconsent_count));
  const [completed, setCompleted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const ok = /^\d+$/.test(count);
  async function save() {
    setSaving(true); setErr(null);
    try { await apiFetch(`/amendment-acks/${s.id}`, { method: "POST", body: JSON.stringify({ action: "reconsent", count: Number(count), completed }) }); onDone(`Re-consent progress recorded for site ${s.site?.site_number}.`); }
    catch (e) { setErr(errText(e)); } finally { setSaving(false); }
  }
  return (
    <Modal title={`Re-consent — site ${s.site?.site_number}`} onClose={onClose} onSave={save} saving={saving} canSave={ok} saveLabel="Save"
      next={`the count replaces the previous one (both stay in the audit trail). Deadline: ${a.reconsent_deadline}.`}>
      <Field label="Participants re-consented so far" error={ok ? err : "Use a whole number"}><input value={count} onChange={(e) => setCount(e.target.value)} inputMode="numeric" style={input} /></Field>
      <label style={{ display: "flex", gap: "6px", alignItems: "center", fontSize: "12px", color: C.text }}>
        <input type="checkbox" checked={completed} onChange={(e) => setCompleted(e.target.checked)} /> All participants who need it are re-consented
      </label>
    </Modal>
  );
}
