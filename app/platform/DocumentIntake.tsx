"use client";
// Document Intake (Part 5): files arrive here first, are checked and indexed, then filed into the TMF.
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import { apiFetch, authHeaders } from "../../lib/api/client";

type Artifact = { z: string; zn: string; a: string; an: string; cl: string };
type Suggestion = { artifact_num?: string; artifact_name?: string; confidence?: number; reasoning?: string; issues?: string[] };
type Item = {
  id: string; row_version: number; status: string; verification_status: string;
  duplicate_status: "none" | "warning" | "blocked"; duplicate_reason: string | null;
  file_name: string; file_type: string | null; file_size_bytes: number | null; created_at: string;
  artifact_num: string | null; title: string | null; version_label: string | null; effective_date: string | null;
  owner: string | null; notes: string | null; suggestion: Suggestion | null;
  study_country_id: string | null; study_site_id: string | null;
};
type Draft = Pick<Item, "artifact_num" | "title" | "version_label" | "effective_date" | "owner" | "notes" | "study_country_id" | "study_site_id">;
// TMF level choices from the study structure: study level, a country, or a site (its country follows).
type Scope = { label: string; country: string | null; site: string | null };
type TreeNode = { id: string; label: string; field: string | null; value: string | null; children: TreeNode[] };

const C = {
  primary: "#F97316", primaryLight: "#FFEDD5", text: "#111827", textSec: "#374151", textTert: "#6B7280",
  border: "#E5E7EB", bg: "#FFFFFF", bgSec: "#F9FAFB", success: "#065F46", successBg: "#ECFDF5",
  danger: "#991B1B", dangerBg: "#FEF2F2", warn: "#92400E", warnBg: "#FFFBEB",
};
const input: React.CSSProperties = { width: "100%", fontSize: "12px", padding: "6px 8px", border: `0.5px solid ${C.border}`, borderRadius: "6px", boxSizing: "border-box" };
const btn = (bg: string, color: string): React.CSSProperties => ({ fontSize: "11px", fontWeight: 600, padding: "6px 12px", background: bg, color, border: "none", borderRadius: "6px", cursor: "pointer" });

async function sha256Hex(file: File) {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
const alreadyStored = (e: { message?: string; statusCode?: unknown }) =>
  String(e.statusCode) === "409" || /already exists|duplicate/i.test(e.message || "");

function readBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

export default function DocumentIntake({ study, orgId, artifacts, zones, canUpload, onFiled }: {
  study: { id: string; study_id: string }; orgId: string; artifacts: Artifact[]; zones: { z: string; zn: string }[];
  canUpload: boolean; onFiled: () => void;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [busy, setBusy] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [dragging, setDragging] = useState(false);
  const [rejecting, setRejecting] = useState<{ id: string; reason: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const base = `/studies/${study.id}/intake`;

  const load = useCallback(async () => {
    try {
      const r = await apiFetch<{ data: Item[] }>(base);
      setItems(r.data);
      setDrafts(Object.fromEntries(r.data.map((i) => [i.id, {
        artifact_num: i.artifact_num, title: i.title, version_label: i.version_label,
        effective_date: i.effective_date, owner: i.owner, notes: i.notes,
        study_country_id: i.study_country_id, study_site_id: i.study_site_id,
      }])));
    } catch (e) { setMessage((e as Error).message); }
  }, [base]);
  useEffect(() => { load(); }, [load]);

  const [scopes, setScopes] = useState<Scope[]>([{ label: "Study level", country: null, site: null }]);
  useEffect(() => {
    apiFetch<{ my_trial: TreeNode }>(`/studies/${study.id}/navigator/tree`).then((t) => setScopes([
      { label: "Study level", country: null, site: null },
      ...t.my_trial.children.flatMap((c) => [
        { label: `Country — ${c.label}`, country: c.value, site: null },
        ...c.children.map((s) => ({ label: `Site — ${s.label} (${c.label})`, country: c.value, site: s.value })),
      ]),
    ])).catch(() => { /* study level only */ });
  }, [study.id]);
  const scopeKey = (country: string | null, site: string | null) => `${country ?? ""}|${site ?? ""}`;

  async function suggest(item: Item, file: File) {
    if (!/pdf$/i.test(file.name)) return;
    try {
      const res = await fetch("/api/classify", {
        method: "POST", headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({ pdfBase64: await readBase64(file), fileName: file.name, activeZONES: zones, activeTMF: artifacts }),
      });
      const s = await res.json();
      if (!res.ok || s.error) return;
      await apiFetch(`${base}/${item.id}`, { method: "PATCH", body: JSON.stringify({ row_version: item.row_version, suggestion: s }) });
    } catch { /* a suggestion is optional */ }
  }

  async function receive(files: FileList | File[]) {
    setMessage("");
    for (const file of Array.from(files)) {
      setBusy(`Receiving ${file.name}…`);
      try {
        const hash = await sha256Hex(file);
        const ext = (file.name.split(".").pop() || "bin").toLowerCase();
        const path = `${orgId}/${study.study_id}/${hash}.${ext}`;
        const { error } = await supabase.storage.from("Documents").upload(path, file);
        if (error && !alreadyStored(error)) throw new Error(error.message);
        const item = await apiFetch<Item>(base, {
          method: "POST",
          body: JSON.stringify({ file_path: path, file_name: file.name, file_type: file.type || null, file_size_bytes: file.size, file_hash: hash }),
        });
        if (item.verification_status !== "verified") setMessage(`${file.name}: integrity check ${item.verification_status}. Reject it and add the file again.`);
        else if (item.duplicate_status === "blocked") setMessage(`${file.name}: ${item.duplicate_reason}. It can't be filed — reject it.`);
        else { setBusy(`Suggesting an artifact for ${file.name}…`); await suggest(item, file); }
      } catch (e) {
        setMessage(`${file.name}: ${(e as Error).message}`);
      }
    }
    setBusy("");
    load();
  }

  const setDraft = (id: string, patch: Partial<Draft>) => setDrafts((d) => ({ ...d, [id]: { ...d[id], ...patch } }));

  async function save(item: Item) {
    const d = drafts[item.id];
    const updated = await apiFetch<Item>(`${base}/${item.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        row_version: item.row_version, artifact_num: d.artifact_num || null, title: d.title || null,
        version_label: d.version_label || null, effective_date: d.effective_date || null, owner: d.owner || null, notes: d.notes || null,
        study_country_id: d.study_country_id || null, study_site_id: d.study_site_id || null,
      }),
    });
    setItems((list) => list.map((i) => (i.id === item.id ? updated : i)));
    return updated;
  }

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label); setMessage("");
    try { await fn(); } catch (e) { setMessage((e as Error).message); }
    setBusy("");
  }

  const fileIt = (item: Item) => run(`Filing ${item.file_name}…`, async () => {
    await save(item);
    await apiFetch(`${base}/${item.id}/file`, { method: "POST" });
    await load();
    onFiled();
    setMessage(`${item.file_name} was filed to the TMF as a Draft.`);
  });

  const reject = (item: Item, reason: string) => run(`Rejecting ${item.file_name}…`, async () => {
    await apiFetch(`${base}/${item.id}`, { method: "PATCH", body: JSON.stringify({ row_version: item.row_version, reject: reason.trim() }) });
    setRejecting(null);
    await load();
  });

  const sortedArtifacts = artifacts.slice().sort((a, b) => a.a.localeCompare(b.a, undefined, { numeric: true }));
  const verification = (s: string) => s === "verified"
    ? <span style={{ fontSize: "10px", fontWeight: 600, padding: "2px 8px", borderRadius: "20px", background: C.successBg, color: C.success }}>Integrity verified</span>
    : <span style={{ fontSize: "10px", fontWeight: 600, padding: "2px 8px", borderRadius: "20px", background: C.dangerBg, color: C.danger }}>Integrity {s}</span>;
  const duplicate = (s: Item["duplicate_status"]) => s === "blocked"
    ? <span style={{ fontSize: "10px", fontWeight: 600, padding: "2px 8px", borderRadius: "20px", background: C.dangerBg, color: C.danger }}>Duplicate — blocked</span>
    : s === "warning"
      ? <span style={{ fontSize: "10px", fontWeight: 600, padding: "2px 8px", borderRadius: "20px", background: C.warnBg, color: C.warn }}>Possible duplicate</span>
      : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div>
        <h1 style={{ fontSize: "20px", fontWeight: 700, color: C.text }}>Document Intake — {study.study_id}</h1>
        <p style={{ fontSize: "12px", color: C.textTert, marginTop: "2px" }}>
          New files land here first. Each is checked on the server, indexed to a TMF artifact, then filed as a Draft document.
        </p>
      </div>

      {canUpload && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files.length) receive(e.dataTransfer.files); }}
          onClick={() => fileInput.current?.click()}
          style={{ border: `1.5px dashed ${dragging ? C.primary : C.border}`, background: dragging ? C.primaryLight : C.bg, borderRadius: "12px", padding: "1.5rem", textAlign: "center", cursor: "pointer" }}
        >
          <i className="ti ti-inbox" style={{ fontSize: "26px", color: C.primary }} />
          <div style={{ fontSize: "13px", fontWeight: 600, color: C.text, marginTop: "4px" }}>Drop files here or click to choose</div>
          <div style={{ fontSize: "11px", color: C.textTert }}>PDFs get an AI artifact suggestion; you always choose the artifact.</div>
          <input ref={fileInput} type="file" multiple style={{ display: "none" }} onChange={(e) => { if (e.target.files?.length) receive(e.target.files); e.target.value = ""; }} />
        </div>
      )}

      {busy && <div style={{ fontSize: "12px", color: C.textSec }}>{busy}</div>}
      {message && <div style={{ fontSize: "12px", padding: "8px 10px", borderRadius: "8px", background: C.warnBg, color: C.warn }}>{message}</div>}

      {items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2.5rem", color: C.textTert, background: C.bg, border: `0.5px solid ${C.border}`, borderRadius: "12px", fontSize: "12px" }}>
          Nothing waiting in intake.
        </div>
      ) : items.map((item) => {
        const d = drafts[item.id] ?? ({} as Draft);
        const s = item.suggestion;
        const disabled = !canUpload || !!busy;
        return (
          <div key={item.id} style={{ background: C.bg, border: `0.5px solid ${C.border}`, borderRadius: "12px", padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <i className="ti ti-file-text" style={{ fontSize: "16px", color: C.textTert }} />
              <span style={{ fontSize: "13px", fontWeight: 600, color: C.text }}>{item.file_name}</span>
              {verification(item.verification_status)}
              {duplicate(item.duplicate_status)}
              <span style={{ fontSize: "11px", color: C.textTert, marginLeft: "auto" }}>Received {new Date(item.created_at).toLocaleString()}</span>
            </div>

            {item.duplicate_reason && (
              <div style={{ marginTop: "10px", fontSize: "11px", borderRadius: "8px", padding: "8px 10px",
                background: item.duplicate_status === "blocked" ? C.dangerBg : C.warnBg, color: item.duplicate_status === "blocked" ? C.danger : C.warn }}>
                {item.duplicate_reason}.{" "}
                {item.duplicate_status === "blocked" ? "A Final document can't be filed twice — reject this item." : "Check it isn't the same document before filing."}
              </div>
            )}

            {s?.artifact_num && (
              <div style={{ marginTop: "10px", fontSize: "11px", color: C.textSec, background: C.bgSec, borderRadius: "8px", padding: "8px 10px" }}>
                <strong>Suggested:</strong> {s.artifact_num} — {s.artifact_name} ({s.confidence ?? "?"}%)
                {s.reasoning && <div style={{ color: C.textTert, marginTop: "2px" }}>{s.reasoning}</div>}
                {!!s.issues?.length && <div style={{ color: C.warn, marginTop: "2px" }}>Issues: {s.issues.join("; ")}</div>}
                {d.artifact_num !== s.artifact_num && artifacts.some((a) => a.a === s.artifact_num) && (
                  <button disabled={disabled} onClick={() => setDraft(item.id, { artifact_num: s.artifact_num! })} style={{ ...btn(C.primaryLight, C.primary), marginTop: "6px" }}>Use suggestion</button>
                )}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "8px", marginTop: "10px" }}>
              <label style={{ gridColumn: "1 / -1", fontSize: "11px", color: C.textSec }}>TMF artifact
                <select disabled={disabled} value={d.artifact_num ?? ""} onChange={(e) => setDraft(item.id, { artifact_num: e.target.value || null })} style={input}>
                  <option value="">Choose an artifact…</option>
                  {sortedArtifacts.map((a) => <option key={a.a} value={a.a}>{a.a} — {a.an} (Zone {a.z})</option>)}
                </select>
              </label>
              {scopes.length > 1 && (
                <label style={{ gridColumn: "1 / -1", fontSize: "11px", color: C.textSec }}>TMF level
                  <select disabled={disabled} aria-label="TMF level" value={scopeKey(d.study_country_id, d.study_site_id)}
                    onChange={(e) => { const s = scopes.find((x) => scopeKey(x.country, x.site) === e.target.value); if (s) setDraft(item.id, { study_country_id: s.country, study_site_id: s.site }); }} style={input}>
                    {scopes.map((s) => <option key={scopeKey(s.country, s.site)} value={scopeKey(s.country, s.site)}>{s.label}</option>)}
                  </select>
                </label>
              )}
              <label style={{ fontSize: "11px", color: C.textSec }}>Title
                <input disabled={disabled} value={d.title ?? ""} placeholder={item.file_name} onChange={(e) => setDraft(item.id, { title: e.target.value })} style={input} />
              </label>
              <label style={{ fontSize: "11px", color: C.textSec }}>Version
                <input disabled={disabled} value={d.version_label ?? ""} onChange={(e) => setDraft(item.id, { version_label: e.target.value })} style={input} />
              </label>
              <label style={{ fontSize: "11px", color: C.textSec }}>Effective date
                <input disabled={disabled} type="date" value={d.effective_date ?? ""} onChange={(e) => setDraft(item.id, { effective_date: e.target.value || null })} style={input} />
              </label>
              <label style={{ fontSize: "11px", color: C.textSec }}>Owner
                <input disabled={disabled} value={d.owner ?? ""} onChange={(e) => setDraft(item.id, { owner: e.target.value })} style={input} />
              </label>
            </div>

            {canUpload && (() => {
              const blocked = item.duplicate_status === "blocked";
              const canFile = item.verification_status === "verified" && !!d.artifact_num && !blocked;
              const art = artifacts.find((a) => a.a === d.artifact_num);
              const isRejecting = rejecting?.id === item.id;
              return (
                <>
                  {canFile && art && !isRejecting && (
                    <div style={{ marginTop: "12px", fontSize: "11px", color: C.textSec, background: C.bgSec, borderRadius: "8px", padding: "8px 10px" }}>
                      <strong>What happens next:</strong> filing creates a Draft document in Zone {art.z} under {art.a} — {art.an}
                      {" "}(TMF level: {(scopes.find((x) => scopeKey(x.country, x.site) === scopeKey(d.study_country_id, d.study_site_id))?.label ?? "Study level")}), with this file and metadata.
                      This intake item then closes and can no longer be edited here.
                    </div>
                  )}
                  {isRejecting && (
                    <div style={{ marginTop: "12px" }}>
                      <label style={{ fontSize: "11px", color: C.textSec }}>Reason for rejecting (required)
                        <input autoFocus value={rejecting.reason} onChange={(e) => setRejecting({ id: item.id, reason: e.target.value })} style={input} />
                      </label>
                      {!rejecting.reason.trim() && <div style={{ fontSize: "10px", color: C.danger, marginTop: "2px" }}>Enter a reason to reject this item.</div>}
                      <div style={{ fontSize: "11px", color: C.textTert, marginTop: "4px" }}>
                        What happens next: the item leaves intake and your reason is kept in the audit trail. Nothing is filed.
                      </div>
                    </div>
                  )}
                  <div style={{ display: "flex", gap: "8px", marginTop: "12px", justifyContent: "flex-end" }}>
                    {isRejecting ? (
                      <>
                        <button disabled={disabled} onClick={() => setRejecting(null)} style={btn(C.bgSec, C.textSec)}>Cancel</button>
                        <button disabled={disabled || !rejecting.reason.trim()} onClick={() => reject(item, rejecting.reason)}
                          style={{ ...btn(C.danger, "#fff"), opacity: rejecting.reason.trim() ? 1 : 0.5 }}>Confirm reject</button>
                      </>
                    ) : (
                      <>
                        <button disabled={disabled} onClick={() => setRejecting({ id: item.id, reason: blocked ? "Duplicate of a Final document" : "" })}
                          style={btn(C.dangerBg, C.danger)}>Reject</button>
                        <button disabled={disabled} onClick={() => run("Saving…", async () => { await save(item); setMessage("Saved."); })} style={btn(C.bgSec, C.textSec)}>Save</button>
                        <button disabled={disabled || !canFile} onClick={() => fileIt(item)}
                          style={{ ...btn(C.primary, "#fff"), opacity: canFile ? 1 : 0.5 }}>File to TMF</button>
                      </>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        );
      })}
    </div>
  );
}
