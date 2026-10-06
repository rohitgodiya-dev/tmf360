"use client";
// CRO access (Part 17): who from which CRO can see this study, with what scope and until when. Grant access to an
// existing team member or invite someone new; revoke or change the end date (both need a reason and are audited).
import { useEffect, useState } from "react";
import { ApiClientError, apiFetch } from "../../lib/api/client";

type Status = "active" | "expired" | "revoked";
type Member = {
  id: string; email: string; full_name: string | null; role: string; scope: string | null; status: Status;
  expires_at: string | null; added_at: string | null; added_by: string | null; deactivated_at: string | null; deactivation_reason: string | null;
  party: { name: string } | null;
};
type Invitation = { id: string; email: string; full_name: string | null; role: string; scope: string | null; cro_name: string | null; access_expires_at: string | null; expires_at: string };
type Scope = { key: string; label: string; role: string };
type Data = { members: Member[]; invitations: Invitation[]; cros: { id: string; name: string }[]; scopes: Scope[] };

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
const STATUS: Record<Status, { label: string; fg: string; bg: string }> = {
  active: { label: "Active", fg: C.greenDark, bg: C.greenLight }, expired: { label: "Expired", fg: C.amberDark, bg: C.amberLight }, revoked: { label: "Revoked", fg: C.gray, bg: C.grayLight },
};
const day = (iso: string | null) => (iso ? iso.slice(0, 10) : "—");
const today = () => new Date().toISOString().slice(0, 10);
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
const Field = ({ label, error, hint, children }: { label: string; error?: string | null; hint?: string; children: React.ReactNode }) => (
  <div style={{ marginBottom: "12px" }}>
    <label style={{ fontSize: "11px", fontWeight: 600, color: C.textSec, display: "block", marginBottom: "5px" }}>{label}</label>
    {children}
    {hint && !error && <div style={{ fontSize: "11px", color: C.textMuted, marginTop: "4px" }}>{hint}</div>}
    {error && <div style={{ fontSize: "11px", color: C.redDark, marginTop: "4px" }}>{error}</div>}
  </div>
);

export default function CroAccess({ study }: { study: { id: string; study_id: string } }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloads, setReloads] = useState(0);
  const [modal, setModal] = useState<null | { kind: "grant" } | { kind: "revoke" | "expiry"; member: Member }>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch<Data>(`/studies/${study.id}/cro-access`)
      .then((d) => { if (!cancelled) { setData(d); setError(null); } })
      .catch((e) => { if (!cancelled) setError(errText(e)); });
    return () => { cancelled = true; };
  }, [study.id, reloads]);
  const done = (msg: string) => { setModal(null); setNotice(msg); setReloads((n) => n + 1); };
  const scopeLabel = (k: string | null, role: string) => data?.scopes.find((s) => s.key === k)?.label ?? role;

  return (
    <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "16px", fontWeight: 600, color: C.text }}>CRO access</div>
          <div style={{ fontSize: "12px", color: C.textMuted }}>CRO staff see study {study.study_id} only, with the scope you choose, until their end date.</div>
        </div>
        <button style={btn(C.orange, "#fff")} onClick={() => setModal({ kind: "grant" })} disabled={!data}><i className="ti ti-user-plus" /> Give CRO access</button>
      </div>
      {notice && <div role="status" style={{ ...card, background: C.greenLight, color: C.greenDark, fontSize: "12px" }}>{notice}</div>}
      {error && <div role="alert" style={{ ...card, background: C.redLight, color: C.redDark, fontSize: "12px" }}>{error}</div>}
      {!data && !error && <div style={{ fontSize: "12px", color: C.textMuted }}>Loading CRO access…</div>}

      {data && (
        <div style={{ ...card, padding: 0, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ background: C.bg }}>{["Person", "CRO", "Scope", "Status", "Access until", "Granted", ""].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
            <tbody>
              {data.members.map((m) => (
                <tr key={m.id}>
                  <td style={td}><b>{m.full_name || m.email}</b><div style={{ fontSize: "11px", color: C.textMuted }}>{m.email}</div></td>
                  <td style={td}>{m.party?.name ?? "—"}</td>
                  <td style={td}>{scopeLabel(m.scope, m.role)}<div style={{ fontSize: "11px", color: C.textMuted }}>{m.role}</div></td>
                  <td style={td}>
                    <span style={{ fontSize: "10px", fontWeight: 600, padding: "3px 9px", borderRadius: "20px", color: STATUS[m.status].fg, background: STATUS[m.status].bg }}>{STATUS[m.status].label}</span>
                    {m.status === "revoked" && m.deactivation_reason && <div style={{ fontSize: "11px", color: C.textMuted, marginTop: "4px" }}>{m.deactivation_reason}</div>}
                  </td>
                  <td style={td}>{m.expires_at ? day(m.expires_at) : "No end date"}</td>
                  <td style={td}>{day(m.added_at)}<div style={{ fontSize: "11px", color: C.textMuted }}>{m.added_by ?? ""}</div></td>
                  <td style={{ ...td, whiteSpace: "nowrap" }}>
                    <button style={btn(C.bgCard, C.textSec)} onClick={() => setModal({ kind: "expiry", member: m })}>{m.status === "active" ? "End date" : "Restore"}</button>{" "}
                    {m.status === "active" && <button style={btn(C.bgCard, C.redDark)} onClick={() => setModal({ kind: "revoke", member: m })}>Revoke</button>}
                  </td>
                </tr>
              ))}
              {data.invitations.map((i) => (
                <tr key={i.id}>
                  <td style={td}><b>{i.full_name || i.email}</b><div style={{ fontSize: "11px", color: C.textMuted }}>{i.email}</div></td>
                  <td style={td}>{i.cro_name ?? "—"}</td>
                  <td style={td}>{scopeLabel(i.scope, i.role)}</td>
                  <td style={td}><span style={{ fontSize: "10px", fontWeight: 600, padding: "3px 9px", borderRadius: "20px", color: C.amberDark, background: C.amberLight }}>Invited</span>
                    <div style={{ fontSize: "11px", color: C.textMuted, marginTop: "4px" }}>link valid until {day(i.expires_at)}</div></td>
                  <td style={td}>{i.access_expires_at ? day(i.access_expires_at) : "No end date"}</td>
                  <td style={td}>—</td><td style={td} />
                </tr>
              ))}
              {data.members.length === 0 && data.invitations.length === 0 && (
                <tr><td style={{ ...td, textAlign: "center", color: C.textMuted, padding: "2rem" }} colSpan={7}>No CRO has access to this study yet. Give CRO access to invite a monitor, data manager or project manager.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modal?.kind === "grant" && data && <Grant study={study} data={data} onClose={() => setModal(null)} onDone={done} />}
      {(modal?.kind === "revoke" || modal?.kind === "expiry") && <Change kind={modal.kind} member={modal.member} onClose={() => setModal(null)} onDone={done} />}
    </div>
  );
}

function Grant({ study, data, onClose, onDone }: { study: { id: string; study_id: string }; data: Data; onClose: () => void; onDone: (msg: string) => void }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [croId, setCroId] = useState(data.cros[0]?.id ?? "__new");
  const [croName, setCroName] = useState("");
  const [scope, setScope] = useState(data.scopes[0]?.key ?? "monitor");
  const [until, setUntil] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  const untilOk = !until || until > today();
  const croOk = croId !== "__new" || croName.trim().length > 0;

  async function save() {
    setSaving(true); setErr(null);
    try {
      const r = await apiFetch<{ kind: string; emailed?: boolean; inviteUrl?: string; note?: string | null }>(`/studies/${study.id}/cro-access`, {
        method: "POST", body: JSON.stringify({
          email: email.trim(), full_name: name.trim(), scope, expires_on: until || null,
          ...(croId === "__new" ? { cro_name: croName.trim() } : { cro_party_id: croId }),
        }),
      });
      if (r.kind === "invitation" && !r.emailed && r.inviteUrl) { setLink(r.inviteUrl); return; }
      onDone(r.kind === "member" ? `Access granted to ${email.trim()}.${r.note ? ` ${r.note}` : ""}` : `Invitation sent to ${email.trim()}.`);
    } catch (e) { setErr(errText(e)); } finally { setSaving(false); }
  }

  if (link) {
    return (
      <Modal title="Invitation created" onClose={() => onDone(`Invitation created for ${email.trim()}.`)} onSave={() => onDone(`Invitation created for ${email.trim()}.`)} saving={false} canSave saveLabel="Done"
        next="the person sets their own password with this single-use link and then sees only this study.">
        <div style={{ fontSize: "12px", color: C.textSec, marginBottom: "8px" }}>Email delivery is not set up, so pass this link on securely:</div>
        <input readOnly value={link} style={input} onFocus={(e) => e.currentTarget.select()} aria-label="Invitation link" />
      </Modal>
    );
  }
  return (
    <Modal title="Give CRO access" onClose={onClose} onSave={save} saving={saving} canSave={emailOk && untilOk && croOk} saveLabel="Give access"
      next={`someone already in your organisation gets access to ${study.study_id} straight away; anyone else receives an invitation and sees only this study once they set their password. Access ends automatically on the end date.`}>
      <Field label="Email" error={email && !emailOk ? "Enter a valid email address" : null}><input value={email} onChange={(e) => setEmail(e.target.value)} style={input} placeholder="name@cro.com" /></Field>
      <Field label="Full name (for new people)"><input value={name} onChange={(e) => setName(e.target.value)} maxLength={200} style={input} /></Field>
      <Field label="CRO">
        <select value={croId} onChange={(e) => setCroId(e.target.value)} style={input}>
          {data.cros.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          <option value="__new">New CRO…</option>
        </select>
      </Field>
      {croId === "__new" && <Field label="New CRO name" error={croOk ? null : "Give the CRO's name"}><input value={croName} onChange={(e) => setCroName(e.target.value)} maxLength={300} style={input} placeholder="e.g. Parexel" /></Field>}
      <Field label="Access scope" hint={`Gives the ${data.scopes.find((s) => s.key === scope)?.role} role. Existing members keep their current role.`}>
        <select value={scope} onChange={(e) => setScope(e.target.value)} style={input}>
          {data.scopes.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </Field>
      <Field label="Access until (optional)" error={untilOk ? null : "Choose a date after today"}><input type="date" value={until} min={today()} onChange={(e) => setUntil(e.target.value)} style={input} /></Field>
      {err && <div role="alert" style={{ fontSize: "12px", color: C.redDark }}>{err}</div>}
    </Modal>
  );
}

function Change({ kind, member, onClose, onDone }: { kind: "revoke" | "expiry"; member: Member; onClose: () => void; onDone: (msg: string) => void }) {
  const [until, setUntil] = useState(member.expires_at && member.status === "active" ? day(member.expires_at) : "");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const untilOk = !until || until > today();
  async function save() {
    setSaving(true); setErr(null);
    try {
      await apiFetch(`/study-members/${member.id}`, { method: "PATCH", body: JSON.stringify(
        kind === "revoke" ? { action: "revoke", reason: reason.trim() } : { action: "set_expiry", expires_on: until || null, reason: reason.trim() }) });
      onDone(kind === "revoke" ? `Access revoked for ${member.email}.` : `Access updated for ${member.email}.`);
    } catch (e) { setErr(errText(e)); } finally { setSaving(false); }
  }
  return (
    <Modal title={kind === "revoke" ? `Revoke access — ${member.email}` : `${member.status === "active" ? "Change end date" : "Restore access"} — ${member.email}`}
      onClose={onClose} onSave={save} saving={saving} canSave={reason.trim().length >= 3 && untilOk} saveLabel={kind === "revoke" ? "Revoke access" : "Save"}
      next={kind === "revoke" ? "the person loses access to this study at once. The membership and your reason stay in the audit trail." : "access runs until the new date (or without end). The change and your reason are recorded in the audit trail."}>
      {kind === "expiry" && <Field label="Access until" hint="Leave empty for no end date" error={untilOk ? null : "Choose a date after today"}><input type="date" value={until} min={today()} onChange={(e) => setUntil(e.target.value)} style={input} /></Field>}
      <Field label="Reason" error={reason && reason.trim().length < 3 ? "Give a reason of at least 3 characters" : null}>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={2000} rows={3} style={{ ...input, resize: "vertical" }} />
      </Field>
      {err && <div role="alert" style={{ fontSize: "12px", color: C.redDark }}>{err}</div>}
    </Modal>
  );
}
