"use client";
// Post-filing operations (Part 8b, M11): delete with a coded reason or request deletion of a Final
// document, reclassify, revision request, upload a new file to a Draft, version history, and the
// deletion-request queue. Every write goes through /api/v1; the database enforces the rules.
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { apiFetch } from "../../lib/api/client";

type TreeNode = { id: string; label: string; field: string | null; value: string | null; children: TreeNode[] };
export type ActionDoc = { id: string; status: string; artifact_num: string; study_country_id?: string | null; study_site_id?: string | null; version?: string | null; custom_file_name?: string | null; owner?: string | null; effective_date?: string | null; expiry_date?: string | null };

const C = {
  primary: "#F97316", primaryLight: "#FFEDD5", text: "#111827", textSec: "#374151", textTert: "#6B7280",
  border: "#E5E7EB", bg: "#FFFFFF", bgSec: "#F9FAFB", danger: "#991B1B", dangerBg: "#FEF2F2", green: "#065F46", greenBg: "#ECFDF5",
};
const btn = (bg: string, color: string): React.CSSProperties => ({ fontSize: "11px", fontWeight: 600, padding: "6px 12px", background: bg, color, border: `0.5px solid ${C.border}`, borderRadius: "6px", cursor: "pointer" });
const input: React.CSSProperties = { fontSize: "12px", padding: "6px 8px", border: `0.5px solid ${C.border}`, borderRadius: "6px", background: C.bg, boxSizing: "border-box", width: "100%", fontFamily: "inherit" };
const label: React.CSSProperties = { fontSize: "11px", color: C.textSec, display: "flex", flexDirection: "column", gap: "3px" };
const note: React.CSSProperties = { fontSize: "11px", color: C.textSec, background: C.bgSec, borderRadius: "8px", padding: "8px 10px", lineHeight: 1.5 };
const errBox: React.CSSProperties = { fontSize: "11px", color: C.danger, background: C.dangerBg, borderRadius: "8px", padding: "7px 9px" };

export const isFinal = (status: string) => status === "Approved" || status === "Archived";
const CODES = [["incorrectly_indexed", "Incorrectly Indexed"], ["not_tmf_relevant", "Not TMF Relevant"], ["other", "Other"]] as const;

function Buttons({ busy, ok, label: text, danger, onCancel, onGo }: { busy: boolean; ok: boolean; label: string; danger?: boolean; onCancel: () => void; onGo: () => void }) {
  return (
    <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
      <button onClick={onCancel} style={btn(C.bgSec, C.textSec)}>Cancel</button>
      <button disabled={!ok || busy} onClick={onGo} style={{ ...btn(danger ? C.danger : C.primary, "#fff"), opacity: ok && !busy ? 1 : 0.5 }}>{busy ? "Working…" : text}</button>
    </div>
  );
}

/** OPS-01/02: delete a document that is not Final, or request deletion of a Final one. */
export function DeleteForm({ doc, onDone, onCancel }: { doc: ActionDoc; onDone: (msg: string) => void; onCancel: () => void }) {
  const [code, setCode] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const final = isFinal(doc.status);
  const ok = !!code && comment.trim().length >= 3;
  async function go() {
    setBusy(true); setError("");
    try {
      await apiFetch(`/documents/${doc.id}/${final ? "deletion-request" : "delete"}`, { method: "POST", body: JSON.stringify({ code, comment: comment.trim() }) });
      onDone(final ? "Deletion requested. Another administrator approves it with an electronic signature in the Recycle Bin." : "Moved to the Recycle Bin.");
    } catch (e) { setError((e as Error).message); }
    setBusy(false);
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
      <div style={{ fontSize: "12px", fontWeight: 700, color: C.text }}>{final ? "Request deletion" : "Delete"}</div>
      <label style={label}>Reason (required)
        <select value={code} onChange={(e) => setCode(e.target.value)} style={input}>
          <option value="">Choose a reason…</option>{CODES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </label>
      <label style={label}>Comment (required)<textarea rows={2} value={comment} onChange={(e) => setComment(e.target.value.slice(0, 2000))} style={{ ...input, resize: "vertical" }} /></label>
      <div style={note}><b>What happens next:</b> {final
        ? "this Final document stays in the TMF until a different administrator approves the request with an electronic signature. It then moves to the Recycle Bin."
        : "the document moves to the Recycle Bin with your reason in the audit trail. It can be restored for 180 days. Any open QC task is cancelled."}</div>
      {error && <div role="alert" style={errBox}>{error}</div>}
      <Buttons busy={busy} ok={ok} danger label={final ? "Request deletion" : "Move to Recycle Bin"} onCancel={onCancel} onGo={go} />
    </div>
  );
}

/** OPS-04: change the artifact and/or level. Final documents need the user's password. */
export function ReclassifyForm({ doc, tree, onDone, onCancel }: { doc: ActionDoc; tree: { my_trial: TreeNode; taxonomy: { nodes: TreeNode[] } }; onDone: (msg: string) => void; onCancel: () => void }) {
  const artifacts = tree.taxonomy.nodes.flatMap((z) => z.children.flatMap((s) => s.children)).filter((a) => a.field === "artifact");
  const countries = tree.my_trial.children;
  const sites = countries.flatMap((c) => c.children.map((s) => ({ ...s, country: c.label })));
  const [artifact, setArtifact] = useState(doc.artifact_num);
  const [scope, setScope] = useState(doc.study_site_id ? `site:${doc.study_site_id}` : doc.study_country_id ? `country:${doc.study_country_id}` : "study");
  const [reason, setReason] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const final = isFinal(doc.status);
  const ok = reason.trim().length >= 3 && (!final || password.length > 0);
  async function go() {
    setBusy(true); setError("");
    const [kind, id] = scope.split(":");
    try {
      const r = await apiFetch<{ status: string }>(`/documents/${doc.id}/reclassify`, { method: "POST", body: JSON.stringify({
        artifact_num: artifact, study_country_id: kind === "country" ? id : null, study_site_id: kind === "site" ? id : null, reason: reason.trim(), password: final ? password : undefined,
      }) });
      onDone(`Reclassified${r.status !== doc.status ? `; the document is now ${r.status}` : ""}.`);
    } catch (e) { setError((e as Error).message); setPassword(""); }
    setBusy(false);
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
      <div style={{ fontSize: "12px", fontWeight: 700, color: C.text }}>Reclassify</div>
      <label style={label}>Artifact<select value={artifact} onChange={(e) => setArtifact(e.target.value)} style={input}>{artifacts.map((a) => <option key={a.value!} value={a.value!}>{a.label}</option>)}</select></label>
      <label style={label}>TMF level
        <select value={scope} onChange={(e) => setScope(e.target.value)} style={input}>
          <option value="study">Study</option>
          {countries.map((c) => <option key={c.value!} value={`country:${c.value}`}>Country — {c.label}</option>)}
          {sites.map((s) => <option key={s.value!} value={`site:${s.value}`}>Site — {s.label} ({s.country})</option>)}
        </select>
      </label>
      <label style={label}>Reason (required)<input value={reason} onChange={(e) => setReason(e.target.value)} style={input} /></label>
      <div style={note}><b>What happens next:</b> the document moves to the new artifact and level, keeping its ID. {doc.status === "Under Review" ? "Its open QC task is cancelled and it returns to Draft, so submit it again. " : ""}Expected artifacts are re-matched.{final ? " As a Final document, the change is recorded as an attestation (“Reclassified, with reason”)." : ""}</div>
      {final && <label style={label}>Your password<input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} style={input} /></label>}
      {error && <div role="alert" style={errBox}>{error}</div>}
      <Buttons busy={busy} ok={ok} label="Reclassify" onCancel={onCancel} onGo={go} />
    </div>
  );
}

/** OPS-05: revision request on a Final document. */
export function RevisionForm({ doc, onDone, onCancel }: { doc: ActionDoc; onDone: (msg: string) => void; onCancel: () => void }) {
  const [rationale, setRationale] = useState("metadata_update");
  const [process, setProcess] = useState<"file_as_final" | "collaboration">("file_as_final");
  const [description, setDescription] = useState("");
  const [revision, setRevision] = useState("");
  const [changes, setChanges] = useState({ custom_file_name: doc.custom_file_name ?? "", owner: doc.owner ?? "", effective_date: doc.effective_date ?? "", expiry_date: doc.expiry_date ?? "" });
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const content = rationale === "content_and_metadata_update";
  const proc = content ? "collaboration" : process;
  const ok = description.trim().length >= 3 && (proc === "collaboration" || password.length > 0);
  async function go() {
    setBusy(true); setError("");
    const diff = Object.fromEntries(Object.entries(changes).filter(([k, v]) => v && v !== (doc[k as keyof ActionDoc] ?? "")));
    try {
      await apiFetch(`/documents/${doc.id}/revision`, { method: "POST", body: JSON.stringify({
        rationale, description: description.trim(), proposed_revision: revision.trim() || undefined, process: proc,
        changes: proc === "file_as_final" ? diff : {}, password: proc === "file_as_final" ? password : undefined,
      }) });
      onDone(proc === "file_as_final" ? "Revision filed as Final." : "Revision started: the document is Draft again. Upload the new file, then submit it for QC.");
    } catch (e) { setError((e as Error).message); setPassword(""); }
    setBusy(false);
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
      <div style={{ fontSize: "12px", fontWeight: 700, color: C.text }}>Revision request</div>
      <label style={label}>Rationale
        <select value={rationale} onChange={(e) => setRationale(e.target.value)} style={input}>
          <option value="metadata_update">Metadata update</option><option value="content_and_metadata_update">Content and metadata update</option>
          <option value="filing_error">Filing error</option><option value="other">Other</option>
        </select>
      </label>
      <label style={label}>Description (required)<textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value.slice(0, 4000))} style={{ ...input, resize: "vertical" }} /></label>
      <label style={label}>Proposed revision number<input value={revision} onChange={(e) => setRevision(e.target.value)} placeholder={doc.version ? `now ${doc.version}` : "e.g. 2.0"} style={input} /></label>
      <fieldset style={{ border: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "3px" }}>
        <legend style={{ fontSize: "11px", color: C.textSec, marginBottom: "3px" }}>Process</legend>
        <label style={{ fontSize: "11px", color: content ? C.textTert : C.textSec, display: "flex", gap: "5px" }}><input type="radio" disabled={content} checked={proc === "file_as_final"} onChange={() => setProcess("file_as_final")} /> File as Final (metadata only)</label>
        <label style={{ fontSize: "11px", color: C.textSec, display: "flex", gap: "5px" }}><input type="radio" checked={proc === "collaboration"} onChange={() => setProcess("collaboration")} /> Start collaboration (new file, then QC)</label>
      </fieldset>
      {proc === "file_as_final" && (
        <>
          <label style={label}>Title<input value={changes.custom_file_name} onChange={(e) => setChanges({ ...changes, custom_file_name: e.target.value })} style={input} /></label>
          <label style={label}>Owner<input value={changes.owner} onChange={(e) => setChanges({ ...changes, owner: e.target.value })} style={input} /></label>
          <div style={{ display: "flex", gap: "6px" }}>
            <label style={{ ...label, flex: 1 }}>Effective<input type="date" value={changes.effective_date} onChange={(e) => setChanges({ ...changes, effective_date: e.target.value })} style={input} /></label>
            <label style={{ ...label, flex: 1 }}>Expiry<input type="date" value={changes.expiry_date} onChange={(e) => setChanges({ ...changes, expiry_date: e.target.value })} style={input} /></label>
          </div>
        </>
      )}
      <div style={note}><b>What happens next:</b> {proc === "file_as_final"
        ? "the changes apply at once and the document stays Final. Your password records an attestation (“Revision approved”); the previous values stay in the version history."
        : "the document returns to Draft with the proposed revision number. Upload the new file and submit it for QC; it becomes Final again once QC accepts it. The current file stays in the version history."}</div>
      {proc === "file_as_final" && <label style={label}>Your password<input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} style={input} /></label>}
      {error && <div role="alert" style={errBox}>{error}</div>}
      <Buttons busy={busy} ok={ok} label={proc === "file_as_final" ? "File as Final" : "Start collaboration"} onCancel={onCancel} onGo={go} />
    </div>
  );
}

async function sha256Hex(file: File) {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** New file for a Draft document: stored by hash, re-checked by the server, kept as a new version. */
export function NewFileForm({ doc, orgId, studyCode, onDone, onCancel }: { doc: ActionDoc; orgId: string; studyCode: string; onDone: (msg: string) => void; onCancel: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function go() {
    if (!file) return;
    setBusy(true); setError("");
    try {
      const hash = await sha256Hex(file);
      const ext = (file.name.split(".").pop() || "bin").toLowerCase();
      const path = `${orgId}/${studyCode}/${hash}.${ext}`;
      const { error: upErr } = await supabase.storage.from("Documents").upload(path, file);
      if (upErr && String((upErr as { statusCode?: unknown }).statusCode) !== "409" && !/already exists|duplicate/i.test(upErr.message)) throw new Error(upErr.message);
      const r = await apiFetch<{ version_no: number }>(`/documents/${doc.id}/file`, { method: "POST", body: JSON.stringify({ file_path: path, file_name: file.name, file_type: file.type || null, file_size_bytes: file.size, file_hash: hash }) });
      onDone(`New file added as version ${r.version_no} and verified. Submit the document for QC when it is ready.`);
    } catch (e) { setError((e as Error).message); }
    setBusy(false);
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
      <div style={{ fontSize: "12px", fontWeight: 700, color: C.text }}>Upload a new file</div>
      <input type="file" aria-label="New file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} style={{ fontSize: "11px" }} />
      <div style={note}><b>What happens next:</b> the server checks the file&apos;s checksum and adds it as the document&apos;s next version. The current file stays in the version history.</div>
      {error && <div role="alert" style={errBox}>{error}</div>}
      <Buttons busy={busy} ok={!!file} label="Upload" onCancel={onCancel} onGo={go} />
    </div>
  );
}

type Versions = {
  current_revision: string | null;
  files: { version_no: number; file_name: string; file_hash: string | null; verification_status: string; uploaded_by: string | null; created_at: string; current: boolean }[];
  metadata: { version_no: number; snapshot: Record<string, unknown>; change_reason: string | null; changed_by_email: string | null; changed_at: string }[];
  revisions: { rationale: string; description: string; proposed_revision: string | null; process: string; requested_by: string; requested_at: string }[];
};

/** OPS-06: every file version (older ones open in a new tab through a logged link) and metadata change. */
export function VersionHistory({ documentId, canDownload }: { documentId: string; canDownload: boolean }) {
  const [v, setV] = useState<Versions | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { apiFetch<Versions>(`/documents/${documentId}/versions`).then(setV).catch((e) => setError((e as Error).message)); }, [documentId]);
  async function open(version_no: number, purpose: "view" | "download") {
    try {
      const r = await apiFetch<{ url: string }>(`/documents/${documentId}/access`, { method: "POST", body: JSON.stringify({ purpose, version_no }) });
      if (purpose === "download") window.location.assign(r.url); else window.open(r.url, "_blank", "noopener");
    } catch (e) { setError((e as Error).message); }
  }
  if (!v) return <div style={{ fontSize: "10px", color: error ? C.danger : C.textTert }}>{error || "Loading…"}</div>;
  const fmt = (s: string) => new Date(s).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {v.files.map((f) => (
        <div key={f.version_no} style={{ fontSize: "10px", color: C.textSec, borderTop: `0.5px solid #F3F4F6`, paddingTop: "4px", display: "flex", gap: "6px", alignItems: "center" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <b>v{f.version_no}</b>{f.current ? " (current)" : ""} · {f.file_name} · {f.verification_status}
            <div style={{ color: C.textTert }}>{fmt(f.created_at)}{f.uploaded_by ? ` · ${f.uploaded_by}` : ""}</div>
          </div>
          {!f.current && <button onClick={() => open(f.version_no, "view")} style={{ ...btn(C.bg, C.textSec), padding: "2px 7px", fontSize: "10px" }}>Open</button>}
          {!f.current && canDownload && <button onClick={() => open(f.version_no, "download")} aria-label={`Download version ${f.version_no}`} style={{ ...btn(C.bg, C.textSec), padding: "2px 7px", fontSize: "10px" }}><i className="ti ti-download" /></button>}
        </div>
      ))}
      {v.revisions.map((r, i) => (
        <div key={`r${i}`} style={{ fontSize: "10px", color: C.textSec, background: C.bgSec, borderRadius: "6px", padding: "5px 7px" }}>
          <b>Revision</b> · {r.rationale}{r.proposed_revision ? ` → ${r.proposed_revision}` : ""} · {r.process === "file_as_final" ? "filed as Final" : "collaboration"}<br />
          “{r.description}” — {r.requested_by}, {fmt(r.requested_at)}
        </div>
      ))}
      {v.metadata.length > 0 && (
        <details>
          <summary style={{ fontSize: "10px", color: C.textTert, cursor: "pointer" }}>{v.metadata.length} earlier metadata version{v.metadata.length > 1 ? "s" : ""}</summary>
          {v.metadata.map((m) => (
            <div key={m.version_no} style={{ fontSize: "10px", color: C.textSec, borderTop: `0.5px solid #F3F4F6`, padding: "4px 0" }}>
              Before change {m.version_no} ({m.change_reason ?? "change"}, {m.changed_by_email ?? "system"}, {fmt(m.changed_at)}):
              <div style={{ color: C.textTert, fontFamily: "monospace", wordBreak: "break-word" }}>
                {["artifact_num", "custom_file_name", "version", "owner", "effective_date", "expiry_date"].filter((k) => m.snapshot[k] != null && m.snapshot[k] !== "").map((k) => `${k}=${String(m.snapshot[k])}`).join(" · ")}
              </div>
            </div>
          ))}
        </details>
      )}
    </div>
  );
}

type DeletionRequest = { id: string; title: string; artifact_num: string | null; reason: string; comment: string; status: string; requested_by_name: string | null; requested_at: string; decided_by_name: string | null; decision_comment: string | null; can_decide: boolean; can_withdraw: boolean };

/** OPS-02: deletion requests for Final documents, approved with an electronic signature. */
export function DeletionRequests({ studyId, onChanged }: { studyId: string; onChanged: () => void }) {
  const [rows, setRows] = useState<DeletionRequest[] | null>(null);
  const [active, setActive] = useState<{ id: string; mode: "approved" | "rejected" } | null>(null);
  const [comment, setComment] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reloads, setReloads] = useState(0);
  useEffect(() => { apiFetch<{ data: DeletionRequest[] }>(`/studies/${studyId}/deletion-requests`).then((r) => setRows(r.data)).catch((e) => setError((e as Error).message)); }, [studyId, reloads]);
  async function decide(id: string, decision: string) {
    setBusy(true); setError("");
    try {
      await apiFetch(`/deletion-requests/${id}/decide`, { method: "POST", body: JSON.stringify({ decision, comment: comment.trim(), password: decision === "approved" ? password : undefined }) });
      setActive(null); setComment(""); setPassword(""); setReloads((n) => n + 1); onChanged();
    } catch (e) { setError((e as Error).message); setPassword(""); }
    setBusy(false);
  }
  const pending = rows?.filter((r) => r.status === "pending") ?? [];
  const recent = rows?.filter((r) => r.status !== "pending").slice(0, 10) ?? [];
  if (!rows) return <div style={{ fontSize: "12px", color: error ? C.danger : C.textTert }}>{error || "Loading deletion requests…"}</div>;
  return (
    <div style={{ background: C.bg, border: `0.5px solid ${C.border}`, borderRadius: "12px", padding: "14px 16px", display: "flex", flexDirection: "column", gap: "8px" }}>
      <div style={{ fontSize: "13px", fontWeight: 700, color: C.text }}>Deletion requests for Final documents {pending.length > 0 && <span style={{ fontSize: "10px", padding: "1px 7px", borderRadius: "20px", background: C.dangerBg, color: C.danger }}>{pending.length} waiting</span>}</div>
      {pending.length === 0 && <div style={{ fontSize: "12px", color: C.textTert }}>No requests waiting.</div>}
      {pending.map((r) => (
        <div key={r.id} style={{ border: `0.5px solid ${C.border}`, borderRadius: "10px", padding: "10px 12px", display: "flex", flexDirection: "column", gap: "6px" }}>
          <div style={{ fontSize: "12px", color: C.text }}><b>{r.title}</b> <span style={{ fontFamily: "monospace", fontSize: "10px", color: C.textTert }}>{r.artifact_num}</span></div>
          <div style={{ fontSize: "11px", color: C.textSec }}>{r.reason}: “{r.comment}” — requested by {r.requested_by_name}, {new Date(r.requested_at).toLocaleDateString()}</div>
          {active?.id === r.id ? (
            <>
              <label style={label}>{active.mode === "approved" ? "Comment (optional)" : "Why reject? (required)"}<input value={comment} onChange={(e) => setComment(e.target.value)} style={input} /></label>
              {active.mode === "approved" && (
                <>
                  <div style={note}><b>What happens next:</b> your password signs this electronically (“Deletion approved”, your name, the server&apos;s time). The document moves to the Recycle Bin and can be restored for 180 days.</div>
                  <label style={label}>Your password<input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} style={input} /></label>
                </>
              )}
              <Buttons busy={busy} danger={active.mode === "approved"} ok={active.mode === "approved" ? password.length > 0 : comment.trim().length >= 3}
                label={active.mode === "approved" ? "Sign & approve deletion" : "Reject request"} onCancel={() => { setActive(null); setPassword(""); }} onGo={() => decide(r.id, active.mode)} />
            </>
          ) : (
            <div style={{ display: "flex", gap: "6px" }}>
              {r.can_decide && <button onClick={() => setActive({ id: r.id, mode: "approved" })} style={btn(C.dangerBg, C.danger)}>Approve deletion</button>}
              {r.can_decide && <button onClick={() => setActive({ id: r.id, mode: "rejected" })} style={btn(C.bg, C.textSec)}>Reject</button>}
              {r.can_withdraw && <button disabled={busy} onClick={() => decide(r.id, "withdrawn")} style={btn(C.bg, C.textSec)}>Withdraw</button>}
              {!r.can_decide && !r.can_withdraw && <span style={{ fontSize: "11px", color: C.textTert }}>Waiting for another administrator.</span>}
            </div>
          )}
        </div>
      ))}
      {error && <div role="alert" style={errBox}>{error}</div>}
      {recent.length > 0 && (
        <details>
          <summary style={{ fontSize: "11px", color: C.textTert, cursor: "pointer" }}>Recent decisions</summary>
          {recent.map((r) => <div key={r.id} style={{ fontSize: "11px", color: C.textSec, padding: "3px 0" }}>{r.title}: {r.status}{r.decided_by_name ? ` by ${r.decided_by_name}` : ""}{r.decision_comment ? ` — “${r.decision_comment}”` : ""}</div>)}
        </details>
      )}
    </div>
  );
}

type Certification = { id: string; version_no: number | null; method: string; source_description: string; source_location: string | null; certified_by_name: string; certified_at: string; covers_current: boolean };
const METHODS = [["paper_scan", "Scan of a paper original"], ["electronic_conversion", "Electronic conversion"], ["electronic_duplicate", "Electronic duplicate (same file)"]] as const;
const CHECKS = [["page_count", "Page count matches the original"], ["legible", "Every page is legible"], ["complete", "Nothing is missing (incl. annexes, signatures)"], ["unaltered", "Content is unaltered"]] as const;

/** CCP / REG-06: certify the current file as a true copy, with an electronic signature bound to its hash. */
export function CertifyForm({ doc, onDone, onCancel }: { doc: ActionDoc; onDone: (msg: string) => void; onCancel: () => void }) {
  const [list, setList] = useState<Certification[] | null>(null);
  const [current, setCurrent] = useState<number | null>(null);
  const [method, setMethod] = useState("");
  const [source, setSource] = useState("");
  const [location, setLocation] = useState("");
  const [hash, setHash] = useState("");
  const [checks, setChecks] = useState<Record<string, boolean>>({ page_count: false, legible: false, complete: false, unaltered: false });
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    apiFetch<{ data: Certification[]; current_version: number | null }>(`/documents/${doc.id}/certify`)
      .then((r) => { setList(r.data); setCurrent(r.current_version); }).catch((e) => setError((e as Error).message));
  }, [doc.id]);
  const ok = !!method && source.trim().length >= 3 && Object.values(checks).every(Boolean) && pw.length > 0 && (method !== "electronic_duplicate" || /^[0-9a-f]{64}$/i.test(hash.trim()));
  async function go() {
    setBusy(true); setError("");
    try {
      await apiFetch(`/documents/${doc.id}/certify`, { method: "POST", body: JSON.stringify({ method, source_description: source.trim(), source_location: location.trim() || undefined,
        source_hash: hash.trim() || undefined, checks, password: pw }) });
      onDone("Certified as a true copy of the original (electronic signature recorded).");
    } catch (e) { setError((e as Error).message); }
    setBusy(false); setPw("");
  }
  const certifiedNow = list?.some((c) => c.covers_current);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
      <div style={{ fontSize: "12px", fontWeight: 700, color: C.text }}>Certified copy</div>
      {list?.map((c) => (
        <div key={c.id} style={{ ...note, background: C.greenBg }}>
          <i className="ti ti-certificate" /> File v{c.version_no} certified by {c.certified_by_name}, {new Date(c.certified_at).toLocaleString()} ({c.method.replace(/_/g, " ")}): {c.source_description}
          {!c.covers_current && <div style={{ color: C.danger }}>A newer file version (v{current}) exists and is not certified.</div>}
        </div>
      ))}
      {certifiedNow ? <div style={note}>The current file is already certified.</div> : (
        <>
          <label style={label}>How was the copy made? (required)
            <select value={method} onChange={(e) => setMethod(e.target.value)} style={input}><option value="">Choose…</option>{METHODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          </label>
          <label style={label}>Original (source) document (required)<input value={source} onChange={(e) => setSource(e.target.value)} placeholder="e.g. Wet-ink signed protocol v3, 42 pages" style={input} /></label>
          <label style={label}>Where the original is held<input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Site 101 binder, archive box 7" style={input} /></label>
          {method === "electronic_duplicate" && <label style={label}>SHA-256 of the source file (required)<input value={hash} onChange={(e) => setHash(e.target.value)} style={{ ...input, fontFamily: "monospace" }} /></label>}
          <div style={{ fontSize: "11px", color: C.textSec, fontWeight: 600 }}>Verification performed (all required)</div>
          {CHECKS.map(([k, l]) => (
            <label key={k} style={{ fontSize: "11px", color: C.textSec, display: "flex", gap: "6px", alignItems: "center" }}>
              <input type="checkbox" checked={checks[k]} onChange={(e) => setChecks({ ...checks, [k]: e.target.checked })} /> {l}
            </label>
          ))}
          <label style={label}>Your password (electronic signature)<input type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} style={input} /></label>
          <div style={note}><b>What happens next:</b> your signature with the meaning &quot;Certified as a true copy of the original&quot; is bound to the current file&apos;s SHA-256. The record is marked as a certified copy, and the certification appears in version history, inspections and archive packages. It can&apos;t be undone.</div>
        </>
      )}
      {error && <div role="alert" style={errBox}>{error}</div>}
      {certifiedNow ? <div style={{ display: "flex", justifyContent: "flex-end" }}><button onClick={onCancel} style={btn(C.bgSec, C.textSec)}>Close</button></div>
        : <Buttons busy={busy} ok={ok} label="Sign & certify" onCancel={onCancel} onGo={go} />}
    </div>
  );
}
