"use client";
// Viewer side panel (Part 22): reviewer notes pinned to the page (VWR-03) and the document type's extra fields
// (RM-06). Notes are never deleted — the author or a reviewer resolves them. Field values change only on drafts.
import { useEffect, useState } from "react";
import { ApiClientError, apiFetch } from "../../lib/api/client";

export type Annotation = {
  id: string; page: number; x: number; y: number; body: string; status: "open" | "resolved";
  created_by: string; created_by_email: string | null; created_at: string;
  resolved_by_email: string | null; resolved_at: string | null; resolution_note: string | null;
};
type CustomField = { key: string; label: string; type: "text" | "date" | "number" | "select"; options?: string[]; required?: boolean };
type Fields = { rule: { required_fields: string[]; custom_fields: CustomField[] } | null; values: Record<string, string>; missing: string[]; editable: boolean };

const C = { primary: "#F97316", text: "#111827", textSec: "#374151", textTert: "#6B7280", border: "#E5E7EB", bg: "#FFFFFF", bgSec: "#F9FAFB",
  danger: "#991B1B", dangerBg: "#FEF2F2", success: "#065F46", successBg: "#ECFDF5" };
const tool: React.CSSProperties = { fontSize: "12px", padding: "5px 9px", background: C.bg, color: C.textSec, border: `0.5px solid ${C.border}`, borderRadius: "6px", cursor: "pointer" };
const input: React.CSSProperties = { width: "100%", fontSize: "12px", padding: "6px 8px", border: `0.5px solid ${C.border}`, borderRadius: "6px", boxSizing: "border-box", fontFamily: "inherit" };
const errText = (e: unknown) => (e instanceof ApiClientError ? e.message : "Something went wrong. Try again.");

export default function DocumentSidePanel({ documentId, tab, onTab, page, canPin, notes, onNotes, addMode, onAddMode, pin, onPin, onDirty, onGoTo }: {
  documentId: string; tab: "notes" | "fields"; onTab: (t: "notes" | "fields" | null) => void; page: number; canPin: boolean;
  notes: Annotation[]; onNotes: (n: Annotation[]) => void; addMode: boolean; onAddMode: (b: boolean) => void;
  pin: { page: number; x: number; y: number } | null; onPin: (p: { page: number; x: number; y: number } | null) => void;
  onDirty: (d: boolean) => void; onGoTo: (page: number) => void;
}) {
  const [canAnnotate, setCanAnnotate] = useState(false);
  const [me, setMe] = useState("");
  const [text, setText] = useState("");
  const [resolving, setResolving] = useState<{ id: string; note: string } | null>(null);
  const [showResolved, setShowResolved] = useState(false);
  const [fields, setFields] = useState<Fields | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [reloads, setReloads] = useState(0);

  useEffect(() => {
    let cancelled = false;
    apiFetch<{ data: Annotation[]; can_annotate: boolean; me: string }>(`/documents/${documentId}/annotations`)
      .then((r) => { if (!cancelled) { onNotes(r.data); setCanAnnotate(r.can_annotate); setMe(r.me); } }).catch(() => undefined);
    apiFetch<Fields>(`/documents/${documentId}/fields`)
      .then((f) => { if (!cancelled) { setFields(f); setDraft(f.values ?? {}); } }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [documentId, reloads, onNotes]);

  const fieldsDirty = !!fields && JSON.stringify(draft) !== JSON.stringify(fields.values ?? {});
  useEffect(() => { onDirty(text.trim().length > 0 || fieldsDirty || !!resolving?.note.trim()); }, [text, fieldsDirty, resolving, onDirty]);

  async function act(fn: () => Promise<void>, ok: string) {
    setBusy(true); setMsg(null);
    try { await fn(); setMsg({ ok: true, text: ok }); setReloads((n) => n + 1); } catch (e) { setMsg({ ok: false, text: errText(e) }); } finally { setBusy(false); }
  }
  const addNote = () => act(async () => {
    const at = pin ?? { page, x: 0.5, y: 0.05 };
    await apiFetch(`/documents/${documentId}/annotations`, { method: "POST", body: JSON.stringify({ page: at.page, x: at.x, y: at.y, body: text.trim() }) });
    setText(""); onPin(null);
  }, "Note added.");
  const resolve = (id: string, note: string) => act(async () => {
    await apiFetch(`/annotations/${id}/resolve`, { method: "POST", body: JSON.stringify(note.trim() ? { note: note.trim() } : {}) });
    setResolving(null);
  }, "Note resolved.");
  const saveFields = () => act(async () => {
    await apiFetch(`/documents/${documentId}/fields`, { method: "PUT", body: JSON.stringify({ custom_metadata: draft, reason: reason.trim() }) });
    setReason("");
  }, "Fields saved.");

  const open = notes.filter((n) => n.status === "open");
  const resolved = notes.filter((n) => n.status === "resolved");

  return (
    <aside aria-label="Notes and fields" style={{ width: "300px", flexShrink: 0, background: C.bg, borderLeft: `0.5px solid ${C.border}`, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ display: "flex", gap: "4px", padding: "8px 10px", borderBottom: `0.5px solid ${C.border}` }}>
        {(["notes", "fields"] as const).map((t) => (
          <button key={t} onClick={() => onTab(t)} style={{ ...tool, flex: 1, ...(tab === t ? { background: "#FFF7ED", color: C.primary, fontWeight: 600 } : {}) }}>{t === "notes" ? `Notes (${open.length})` : "Fields"}</button>
        ))}
        <button aria-label="Close panel" onClick={() => onTab(null)} style={tool}><i className="ti ti-x" /></button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "10px" }}>
        {msg && <div role="status" style={{ fontSize: "11px", padding: "6px 8px", borderRadius: "6px", marginBottom: "8px", background: msg.ok ? C.successBg : C.dangerBg, color: msg.ok ? C.success : C.danger }}>{msg.text}</div>}

        {tab === "notes" && (
          <>
            {canAnnotate ? (
              <div style={{ marginBottom: "12px" }}>
                <textarea aria-label="New note" value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={2000} placeholder="Note for the author or other reviewers" style={{ ...input, resize: "vertical" }} />
                <div style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: "6px", flexWrap: "wrap" }}>
                  {canPin && <button onClick={() => onAddMode(!addMode)} style={{ ...tool, ...(addMode ? { background: "#EFF6FF", color: "#1D4ED8" } : {}) }}><i className="ti ti-pin" /> {pin ? `Pinned on page ${pin.page}` : "Pin to page"}</button>}
                  {pin && <button onClick={() => onPin(null)} style={tool}>Unpin</button>}
                  <button disabled={busy || !text.trim()} onClick={addNote} style={{ ...tool, background: C.primary, color: "#fff", border: "none", opacity: busy || !text.trim() ? 0.5 : 1 }}>Add note</button>
                </div>
                <div style={{ fontSize: "10px", color: C.textTert, marginTop: "4px" }}>Notes never change the file. They stay with this file version and are recorded in the audit trail{pin ? "" : `; without a pin the note goes at the top of page ${page}`}.</div>
              </div>
            ) : <div style={{ fontSize: "11px", color: C.textTert, marginBottom: "10px" }}>Reviewers add notes; you can read them.</div>}

            {open.length === 0 && <div style={{ fontSize: "12px", color: C.textTert }}>No open notes.</div>}
            {open.map((n, i) => (
              <div key={n.id} style={{ border: `0.5px solid ${C.border}`, borderRadius: "8px", padding: "8px", marginBottom: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: C.textTert }}>
                  <span style={{ background: C.primary, color: "#fff", borderRadius: "8px", padding: "0 6px", fontWeight: 700 }}>{i + 1}</span>
                  <button onClick={() => onGoTo(n.page)} style={{ background: "none", border: "none", color: "#1D4ED8", cursor: "pointer", padding: 0, fontSize: "11px" }}>page {n.page}</button>
                  <span style={{ marginLeft: "auto" }}>{new Date(n.created_at).toLocaleDateString()}</span>
                </div>
                <div style={{ fontSize: "12px", color: C.text, margin: "4px 0", whiteSpace: "pre-wrap" }}>{n.body}</div>
                <div style={{ fontSize: "10px", color: C.textTert }}>{n.created_by_email}</div>
                {(canAnnotate || n.created_by === me) && (resolving?.id === n.id ? (
                  <div style={{ marginTop: "6px" }}>
                    <input aria-label="Resolution note" value={resolving.note} onChange={(e) => setResolving({ id: n.id, note: e.target.value })} maxLength={2000} placeholder="How it was addressed (optional)" style={input} />
                    <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
                      <button onClick={() => setResolving(null)} style={tool}>Cancel</button>
                      <button disabled={busy} onClick={() => resolve(n.id, resolving.note)} style={{ ...tool, background: C.success, color: "#fff", border: "none" }}>Resolve</button>
                    </div>
                  </div>
                ) : <button onClick={() => setResolving({ id: n.id, note: "" })} style={{ ...tool, marginTop: "6px" }}><i className="ti ti-check" /> Resolve</button>)}
              </div>
            ))}
            {resolved.length > 0 && (
              <>
                <button onClick={() => setShowResolved((s) => !s)} style={{ ...tool, width: "100%", marginTop: "4px" }}>{showResolved ? "Hide" : "Show"} {resolved.length} resolved</button>
                {showResolved && resolved.map((n) => (
                  <div key={n.id} style={{ borderLeft: `2px solid ${C.success}`, padding: "4px 8px", margin: "8px 0", fontSize: "11px", color: C.textSec }}>
                    <div style={{ textDecoration: "line-through" }}>{n.body}</div>
                    <div style={{ color: C.textTert }}>Resolved by {n.resolved_by_email}{n.resolution_note ? `: ${n.resolution_note}` : ""}</div>
                  </div>
                ))}
              </>
            )}
          </>
        )}

        {tab === "fields" && fields && (
          <>
            {fields.missing.length > 0 && <div style={{ fontSize: "11px", color: C.danger, background: C.dangerBg, borderRadius: "6px", padding: "6px 8px", marginBottom: "8px" }}>Required before QC: {fields.missing.join(", ")}</div>}
            {!fields.rule || fields.rule.custom_fields.length === 0 ? (
              <div style={{ fontSize: "12px", color: C.textTert }}>This document type has no extra fields.{fields.rule?.required_fields.length ? " Its required standard fields are listed above when missing." : ""}</div>
            ) : (
              <>
                {fields.rule.custom_fields.map((f) => (
                  <label key={f.key} style={{ display: "block", fontSize: "11px", color: C.textSec, marginBottom: "8px" }}>{f.label}{f.required && <span style={{ color: C.danger }}> *</span>}
                    {f.type === "select" ? (
                      <select aria-label={f.label} disabled={!fields.editable} value={draft[f.key] ?? ""} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} style={input}>
                        <option value="">—</option>{(f.options ?? []).map((o) => <option key={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input aria-label={f.label} disabled={!fields.editable} type={f.type === "date" ? "date" : "text"} value={draft[f.key] ?? ""} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} style={input} />
                    )}
                  </label>
                ))}
                {fields.editable ? (
                  <>
                    <input aria-label="Reason for change" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={2000} placeholder="Reason for the change" style={input} />
                    <div style={{ fontSize: "10px", color: C.textTert, margin: "4px 0 6px" }}>What happens next: the values are saved on this draft; the previous values are kept in the metadata history and the audit trail.</div>
                    <button disabled={busy || !fieldsDirty || reason.trim().length < 3} onClick={saveFields} style={{ ...tool, background: C.primary, color: "#fff", border: "none", opacity: busy || !fieldsDirty || reason.trim().length < 3 ? 0.5 : 1 }}>Save fields</button>
                  </>
                ) : <div style={{ fontSize: "11px", color: C.textTert }}>In QC or Final: values change only through a revision request.</div>}
              </>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
