"use client";
// Document Intake (Part 5): files arrive here first, are checked and indexed, then filed into the TMF.
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import { apiFetch } from "../../lib/api/client";
import AiAssist, { type AiFeature } from "./AiAssist";
import { onDiscard, useUnsavedChanges } from "../../lib/unsaved";

type Artifact = { z: string; zn: string; a: string; an: string; cl: string };
type Suggestion = { artifact_num?: string; artifact_name?: string; confidence?: number; reasoning?: string; issues?: string[] };
type Item = {
  id: string; row_version: number; status: string; verification_status: string;
  duplicate_status: "none" | "warning" | "blocked"; duplicate_reason: string | null;
  file_name: string; file_type: string | null; file_size_bytes: number | null; created_at: string;
  artifact_num: string | null; title: string | null; version_label: string | null; effective_date: string | null;
  owner: string | null; notes: string | null; suggestion: Suggestion | null;
  study_country_id: string | null; study_site_id: string | null;
  custom_metadata?: Record<string, string>;
  source?: string; email_from?: string | null; email_subject?: string | null;
};
type Draft = Pick<Item, "artifact_num" | "title" | "version_label" | "effective_date" | "owner" | "notes" | "study_country_id" | "study_site_id"> & { custom_metadata: Record<string, string> };
// Required and type-specific fields per artifact (Part 22, RM-06).
type CustomField = { key: string; label: string; type: "text" | "date" | "number" | "select"; options?: string[]; required?: boolean };
type FieldRule = { artifact_num: string; required_fields: string[]; custom_fields: CustomField[] };
const toDraft = (i: Item): Draft => ({
  artifact_num: i.artifact_num, title: i.title, version_label: i.version_label, effective_date: i.effective_date, owner: i.owner, notes: i.notes,
  study_country_id: i.study_country_id, study_site_id: i.study_site_id, custom_metadata: i.custom_metadata ?? {},
});
const same = (a: Draft, b: Draft) => JSON.stringify(a) === JSON.stringify(b);
/** Labels of required fields that are still empty in a draft. */
function missingFields(rule: FieldRule | undefined, d: Draft): string[] {
  if (!rule) return [];
  const std: Record<string, [string, unknown]> = {
    title: ["Title", d.title], version: ["Version", d.version_label], effective_date: ["Effective date", d.effective_date],
    owner: ["Owner", d.owner], country: ["Country", d.study_country_id], site: ["Site", d.study_site_id], expiry_date: ["Expiry date", null],
  };
  return [
    ...rule.required_fields.filter((f) => f !== "expiry_date" && !String(std[f]?.[1] ?? "").trim()).map((f) => std[f]?.[0] ?? f),
    ...rule.custom_fields.filter((f) => f.required && !(d.custom_metadata[f.key] ?? "").trim()).map((f) => f.label),
  ];
}
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


export default function DocumentIntake({ study, orgId, artifacts, canUpload, onFiled }: {
  study: { id: string; study_id: string }; orgId: string; artifacts: Artifact[]; zones: { z: string; zn: string }[];
  canUpload: boolean; onFiled: () => void;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const itemsRef = useRef<Item[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [busy, setBusy] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [dragging, setDragging] = useState(false);
  const [rejecting, setRejecting] = useState<{ id: string; reason: string } | null>(null);
  // Bulk indexing (IDX-02) and selection actions (STG-09).
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const fileInput = useRef<HTMLInputElement>(null);
  const base = `/studies/${study.id}/intake`;
  // AI capabilities switched on for the organisation (Part 12a); none means fully manual.
  const [aiFeatures, setAiFeatures] = useState<AiFeature[]>([]);
  const [aiTick, setAiTick] = useState(0);
  useEffect(() => {
    apiFetch<{ features: { feature: string; enabled: boolean }[] }>("/ai-settings")
      .then((r) => setAiFeatures(r.features.filter((f) => f.enabled && f.feature !== "summary").map((f) => f.feature as AiFeature)))
      .catch(() => setAiFeatures([]));
  }, []);

  const load = useCallback(async () => {
    try {
      const r = await apiFetch<{ data: Item[] }>(base);
      // Keep edits in progress unless the item changed on the server (a reload must not wipe what the user typed).
      const before = new Map(itemsRef.current.map((i) => [i.id, i.row_version]));
      itemsRef.current = r.data;
      setItems(r.data);
      setDrafts((prev) => Object.fromEntries(r.data.map((i) => [i.id, prev[i.id] && before.get(i.id) === i.row_version ? prev[i.id] : toDraft(i)])));
    } catch (e) { setMessage((e as Error).message); }
  }, [base]);
  useEffect(() => { load(); }, [load]);
  const [rules, setRules] = useState<Record<string, FieldRule>>({});
  useEffect(() => {
    apiFetch<{ data: FieldRule[] }>("/field-rules").then((r) => setRules(Object.fromEntries(r.data.map((x) => [x.artifact_num, x])))).catch(() => setRules({}));
  }, []);
  // IDX-08: warn before leaving with unsaved indexing edits; a discard puts the saved values back.
  const isDirty = items.some((i) => drafts[i.id] && !same(drafts[i.id], toDraft(i)));
  useUnsavedChanges("document-intake", isDirty);
  useEffect(() => onDiscard(() => setDrafts(Object.fromEntries(items.map((i) => [i.id, toDraft(i)])))), [items]);

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

  // Classification runs on the server when it is switched on; the result is a stored recommendation.
  async function suggest(item: Item, file: File) {
    if (!/pdf$/i.test(file.name) || !aiFeatures.includes("classification")) return;
    try {
      await apiFetch(`${base}/${item.id}/ai`, { method: "POST", body: JSON.stringify({ feature: "classification" }) });
      setAiTick((t) => t + 1);
    } catch { /* AI is never in the critical path */ }
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
  const setCustom = (id: string, key: string, value: string) =>
    setDrafts((d) => ({ ...d, [id]: { ...d[id], custom_metadata: { ...(d[id]?.custom_metadata ?? {}), [key]: value } } }));
  const req = (item: Item, field: string) => {
    const a = drafts[item.id]?.artifact_num;
    return a && rules[a]?.required_fields.includes(field) ? <span style={{ color: C.danger }}> *</span> : null;
  };

  async function save(item: Item) {
    const d = drafts[item.id];
    const updated = await apiFetch<Item>(`${base}/${item.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        row_version: item.row_version, artifact_num: d.artifact_num || null, title: d.title || null,
        version_label: d.version_label || null, effective_date: d.effective_date || null, owner: d.owner || null, notes: d.notes || null,
        study_country_id: d.study_country_id || null, study_site_id: d.study_site_id || null,
        custom_metadata: d.custom_metadata ?? {},
      }),
    });
    itemsRef.current = itemsRef.current.map((i) => (i.id === item.id ? updated : i));
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
          <div style={{ fontSize: "11px", color: C.textTert }}>AI suggestions (when switched on) are only suggestions; you always choose the artifact.</div>
          <input ref={fileInput} type="file" multiple style={{ display: "none" }} onChange={(e) => { if (e.target.files?.length) receive(e.target.files); e.target.value = ""; }} />
        </div>
      )}

      {canUpload && <IntakeEmail studyId={study.id} />}
      {canUpload && <SignpostForm studyId={study.id} artifacts={sortedArtifacts} scopes={scopes} onDone={(m) => { setMessage(m); onFiled(); }} />}
      {busy && <div style={{ fontSize: "12px", color: C.textSec }}>{busy}</div>}
      {message && <div style={{ fontSize: "12px", padding: "8px 10px", borderRadius: "8px", background: C.warnBg, color: C.warn }}>{message}</div>}

      {items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2.5rem", color: C.textTert, background: C.bg, border: `0.5px solid ${C.border}`, borderRadius: "12px", fontSize: "12px" }}>
          Nothing waiting in intake.
        </div>
      ) : <>
      {canUpload && items.length > 1 && (
        <BulkBar base={base} items={items} selected={selected} setSelected={setSelected} artifacts={sortedArtifacts} scopes={scopes}
          onDone={(m) => { setMessage(m); setSelected(new Set()); load(); onFiled(); }} />
      )}
      {items.map((item) => {
        const d = drafts[item.id] ?? ({} as Draft);
        const disabled = !canUpload || !!busy;
        return (
          <div key={item.id} style={{ background: C.bg, border: `0.5px solid ${C.border}`, borderRadius: "12px", padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              {canUpload && items.length > 1 && <input type="checkbox" aria-label={`Select ${item.file_name}`} checked={selected.has(item.id)}
                onChange={() => setSelected((p) => { const n = new Set(p); if (n.has(item.id)) n.delete(item.id); else n.add(item.id); return n; })} />}
              <i className="ti ti-file-text" style={{ fontSize: "16px", color: C.textTert }} />
              <span style={{ fontSize: "13px", fontWeight: 600, color: C.text }}>{item.file_name}</span>
              {verification(item.verification_status)}
              {duplicate(item.duplicate_status)}
              <span style={{ fontSize: "11px", color: C.textTert, marginLeft: "auto" }}>Received {new Date(item.created_at).toLocaleString()}</span>
            </div>

            {item.source === "email" && (
              <div style={{ marginTop: "6px", fontSize: "11px", color: C.textTert }}><i className="ti ti-mail" /> Emailed by {item.email_from}{item.email_subject ? `: "${item.email_subject}"` : ""}</div>
            )}
            {item.duplicate_reason && (
              <div style={{ marginTop: "10px", fontSize: "11px", borderRadius: "8px", padding: "8px 10px",
                background: item.duplicate_status === "blocked" ? C.dangerBg : C.warnBg, color: item.duplicate_status === "blocked" ? C.danger : C.warn }}>
                {item.duplicate_reason}.{" "}
                {item.duplicate_status === "blocked" ? "A Final document can't be filed twice — reject this item." : "Check it isn't the same document before filing."}
              </div>
            )}

            <AiAssist base={base} itemId={item.id} enabled={aiFeatures} disabled={disabled} refreshKey={aiTick}
              isPdf={/pdf/i.test(item.file_type ?? "") || /.pdf$/i.test(item.file_name)}
              onUseArtifact={(num) => { if (artifacts.some((x) => x.a === num)) setDraft(item.id, { artifact_num: num }); }}
              onUseFields={(f) => {
                const site = f.site_number ? scopes.find((x) => x.site && x.label.replace(/^Site — /, "").startsWith(f.site_number)) : undefined;
                setDraft(item.id, {
                  ...(f.title ? { title: f.title } : {}), ...(f.version_label ? { version_label: f.version_label } : {}),
                  ...(f.effective_date ? { effective_date: f.effective_date } : {}), ...(site ? { study_country_id: site.country, study_site_id: site.site } : {}),
                });
              }} />

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
              <label style={{ fontSize: "11px", color: C.textSec }}>Title{req(item, "title")}
                <input disabled={disabled} value={d.title ?? ""} placeholder={item.file_name} onChange={(e) => setDraft(item.id, { title: e.target.value })} style={input} />
              </label>
              <label style={{ fontSize: "11px", color: C.textSec }}>Version{req(item, "version")}
                <input disabled={disabled} value={d.version_label ?? ""} onChange={(e) => setDraft(item.id, { version_label: e.target.value })} style={input} />
              </label>
              <label style={{ fontSize: "11px", color: C.textSec }}>Effective date{req(item, "effective_date")}
                <input disabled={disabled} type="date" value={d.effective_date ?? ""} onChange={(e) => setDraft(item.id, { effective_date: e.target.value || null })} style={input} />
              </label>
              <label style={{ fontSize: "11px", color: C.textSec }}>Owner{req(item, "owner")}
                <input disabled={disabled} value={d.owner ?? ""} onChange={(e) => setDraft(item.id, { owner: e.target.value })} style={input} />
              </label>
              {(d.artifact_num ? rules[d.artifact_num]?.custom_fields ?? [] : []).map((f) => (
                <label key={f.key} style={{ fontSize: "11px", color: C.textSec }}>{f.label}{f.required && <span style={{ color: C.danger }}> *</span>}
                  {f.type === "select" ? (
                    <select disabled={disabled} aria-label={f.label} value={d.custom_metadata?.[f.key] ?? ""} onChange={(e) => setCustom(item.id, f.key, e.target.value)} style={input}>
                      <option value="">Choose…</option>
                      {(f.options ?? []).map((o) => <option key={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input disabled={disabled} aria-label={f.label} type={f.type === "date" ? "date" : "text"} inputMode={f.type === "number" ? "decimal" : undefined}
                      value={d.custom_metadata?.[f.key] ?? ""} onChange={(e) => setCustom(item.id, f.key, e.target.value)} style={input} />
                  )}
                </label>
              ))}
            </div>

            {canUpload && (() => {
              const blocked = item.duplicate_status === "blocked";
              const missing = missingFields(d.artifact_num ? rules[d.artifact_num] : undefined, d);
              const canFile = item.verification_status === "verified" && !!d.artifact_num && !blocked && missing.length === 0;
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
                  {!!d.artifact_num && missing.length > 0 && !isRejecting && (
                    <div style={{ marginTop: "12px", fontSize: "11px", color: C.danger, background: C.dangerBg, borderRadius: "8px", padding: "8px 10px" }}>
                      Required for {d.artifact_num} before filing: {missing.join(", ")}.
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
      </>}
    </div>
  );
}

/** SGN-01: a record for a document held elsewhere, filed with a generated placeholder page. */
function SignpostForm({ studyId, artifacts, scopes, onDone }: { studyId: string; artifacts: Artifact[]; scopes: Scope[]; onDone: (msg: string) => void }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ artifact_num: "", title: "", reference: "", scope: "|" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const ok = !!f.artifact_num && f.title.trim().length >= 2 && f.reference.trim().length >= 3;
  async function save() {
    setBusy(true); setError("");
    const [country, site] = f.scope.split("|");
    try {
      await apiFetch(`/studies/${studyId}/signposts`, { method: "POST", body: JSON.stringify({ artifact_num: f.artifact_num, title: f.title.trim(), reference: f.reference.trim(),
        study_country_id: country || null, study_site_id: site || null }) });
      setOpen(false); setF({ artifact_num: "", title: "", reference: "", scope: "|" });
      onDone("Signpost filed. It counts in completeness like any record; its page says where the original is.");
    } catch (e) { setError((e as Error).message); }
    setBusy(false);
  }
  if (!open) return <div><button onClick={() => setOpen(true)} style={btn(C.bgSec, C.textSec)}><i className="ti ti-signpost" /> Add signpost (original held elsewhere)</button></div>;
  return (
    <div style={{ background: C.bg, border: `0.5px solid ${C.border}`, borderRadius: "12px", padding: "14px 16px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "8px" }}>
      <div style={{ gridColumn: "1 / -1", fontSize: "13px", fontWeight: 600, color: C.text }}>New signpost</div>
      <label style={{ fontSize: "11px", color: C.textSec }}>TMF artifact
        <select value={f.artifact_num} onChange={(e) => setF({ ...f, artifact_num: e.target.value })} style={input}><option value="">Choose…</option>{artifacts.map((a) => <option key={a.a} value={a.a}>{a.a} — {a.an}</option>)}</select>
      </label>
      <label style={{ fontSize: "11px", color: C.textSec }}>TMF level
        <select aria-label="Signpost level" value={f.scope} onChange={(e) => setF({ ...f, scope: e.target.value })} style={input}>{scopes.map((s) => <option key={`${s.country ?? ""}|${s.site ?? ""}`} value={`${s.country ?? ""}|${s.site ?? ""}`}>{s.label}</option>)}</select>
      </label>
      <label style={{ fontSize: "11px", color: C.textSec }}>Title<input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} style={input} /></label>
      <label style={{ gridColumn: "1 / -1", fontSize: "11px", color: C.textSec }}>Reference: URL or where the original is held (required)
        <input value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} placeholder="e.g. https://vault.example.com/doc/123 or Sponsor archive, box 14" style={input} />
      </label>
      <div style={{ gridColumn: "1 / -1", fontSize: "11px", color: C.textSec, background: C.bgSec, borderRadius: "8px", padding: "8px 10px" }}>
        <strong>What happens next:</strong> a page stating where the original is held is generated and filed as a Draft record under this artifact, then submitted to QC like any document. Signpost status can&apos;t be undone.
      </div>
      {error && <div role="alert" style={{ gridColumn: "1 / -1", fontSize: "11px", color: C.danger }}>{error}</div>}
      <div style={{ gridColumn: "1 / -1", display: "flex", gap: "8px", justifyContent: "flex-end" }}>
        <button onClick={() => setOpen(false)} style={btn(C.bgSec, C.textSec)}>Cancel</button>
        <button disabled={!ok || busy} onClick={save} style={{ ...btn(C.primary, "#fff"), opacity: ok && !busy ? 1 : 0.5 }}>{busy ? "Filing…" : "File signpost"}</button>
      </div>
    </div>
  );
}

/** IDX-02 / STG-09: apply common metadata to the selected items, then file or reject them together. */
function BulkBar({ base, items, selected, setSelected, artifacts, scopes, onDone }: {
  base: string; items: Item[]; selected: Set<string>; setSelected: (s: Set<string>) => void; artifacts: Artifact[]; scopes: Scope[]; onDone: (msg: string) => void;
}) {
  const [mode, setMode] = useState<"" | "set" | "reject">("");
  const [f, setF] = useState({ artifact_num: "", scope: "", version_label: "", effective_date: "", owner: "" });
  const [why, setWhy] = useState("");
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<{ file_name: string | null; reason?: string }[]>([]);
  const ids = [...selected];
  async function run(body: Record<string, unknown>, verb: string) {
    setBusy(true); setReport([]);
    try {
      const r = await apiFetch<{ done: number; failed: number; results: { file_name: string | null; ok: boolean; reason?: string }[] }>(`${base}/bulk`, { method: "POST", body: JSON.stringify({ ...body, item_ids: ids }) });
      setReport(r.results.filter((x) => !x.ok));
      setMode("");
      onDone(`${r.done} item(s) ${verb}${r.failed ? `; ${r.failed} not (see the list)` : "."}`);
    } catch (e) { setReport([{ file_name: null, reason: (e as Error).message }]); }
    setBusy(false);
  }
  function applyCommon() {
    const set: Record<string, unknown> = {};
    if (f.artifact_num) set.artifact_num = f.artifact_num;
    if (f.scope) { const [c, st] = f.scope.split("|"); set.study_country_id = c || null; set.study_site_id = st || null; }
    if (f.version_label.trim()) set.version_label = f.version_label.trim();
    if (f.effective_date) set.effective_date = f.effective_date;
    if (f.owner.trim()) set.owner = f.owner.trim();
    return run({ action: "set", set }, "updated");
  }
  const anyCommon = !!(f.artifact_num || f.scope || f.version_label.trim() || f.effective_date || f.owner.trim());
  return (
    <div style={{ background: C.bg, border: `0.5px solid ${C.border}`, borderRadius: "12px", padding: "10px 14px", display: "flex", flexDirection: "column", gap: "8px" }}>
      <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
        <label style={{ fontSize: "12px", color: C.textSec, display: "flex", gap: "6px", alignItems: "center" }}>
          <input type="checkbox" aria-label="Select all intake items" checked={selected.size === items.length} onChange={(e) => setSelected(e.target.checked ? new Set(items.map((i) => i.id)) : new Set())} />
          {selected.size} selected
        </label>
        <span style={{ flex: 1 }} />
        <button disabled={!selected.size || busy} onClick={() => setMode("set")} style={{ ...btn(C.bgSec, C.textSec), opacity: selected.size ? 1 : 0.5 }}>Edit common metadata</button>
        <button disabled={!selected.size || busy} onClick={() => run({ action: "file" }, "filed")} style={{ ...btn(C.primary, "#fff"), opacity: selected.size ? 1 : 0.5 }}>File selected</button>
        <button disabled={!selected.size || busy} onClick={() => setMode("reject")} style={{ ...btn(C.dangerBg, C.danger), opacity: selected.size ? 1 : 0.5 }}>Reject selected</button>
      </div>
      {mode === "set" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "8px" }}>
          <label style={{ fontSize: "11px", color: C.textSec }}>TMF artifact<select aria-label="Common artifact" value={f.artifact_num} onChange={(e) => setF({ ...f, artifact_num: e.target.value })} style={input}><option value="">(leave as is)</option>{artifacts.map((a) => <option key={a.a} value={a.a}>{a.a} — {a.an}</option>)}</select></label>
          <label style={{ fontSize: "11px", color: C.textSec }}>TMF level<select aria-label="Common level" value={f.scope} onChange={(e) => setF({ ...f, scope: e.target.value })} style={input}><option value="">(leave as is)</option>{scopes.map((s) => <option key={`${s.country ?? ""}|${s.site ?? ""}`} value={`${s.country ?? ""}|${s.site ?? ""}`}>{s.label}</option>)}</select></label>
          <label style={{ fontSize: "11px", color: C.textSec }}>Version<input value={f.version_label} onChange={(e) => setF({ ...f, version_label: e.target.value })} style={input} /></label>
          <label style={{ fontSize: "11px", color: C.textSec }}>Effective date<input type="date" value={f.effective_date} onChange={(e) => setF({ ...f, effective_date: e.target.value })} style={input} /></label>
          <label style={{ fontSize: "11px", color: C.textSec }}>Owner<input value={f.owner} onChange={(e) => setF({ ...f, owner: e.target.value })} style={input} /></label>
          <div style={{ gridColumn: "1 / -1", fontSize: "11px", color: C.textSec }}><strong>What happens next:</strong> the filled fields are applied to all {selected.size} selected items; empty fields are left as they are. Titles stay per file. Then complete each item and file.</div>
          <div style={{ gridColumn: "1 / -1", display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <button onClick={() => setMode("")} style={btn(C.bgSec, C.textSec)}>Cancel</button>
            <button disabled={!anyCommon || busy} onClick={applyCommon} style={{ ...btn(C.primary, "#fff"), opacity: anyCommon ? 1 : 0.5 }}>Apply to {selected.size}</button>
          </div>
        </div>
      )}
      {mode === "reject" && (
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <input aria-label="Reason for rejecting the selected items" value={why} onChange={(e) => setWhy(e.target.value)} placeholder="Reason (kept in the audit trail)" style={input} />
          <button onClick={() => setMode("")} style={btn(C.bgSec, C.textSec)}>Cancel</button>
          <button disabled={why.trim().length < 3 || busy} onClick={() => run({ action: "reject", reason: why.trim() }, "rejected")} style={{ ...btn(C.danger, "#fff"), opacity: why.trim().length < 3 ? 0.5 : 1 }}>Reject {selected.size}</button>
        </div>
      )}
      {report.length > 0 && (
        <div role="alert" style={{ fontSize: "11px", color: C.warn, background: C.warnBg, borderRadius: "8px", padding: "6px 10px" }}>
          {report.map((r, i) => <div key={i}>{r.file_name ?? "Request"}: {r.reason}</div>)}
        </div>
      )}
    </div>
  );
}

type IntakeEmailView = { configured: boolean; address: { alias: string; enabled: boolean; email: string | null } | null;
  senders: { id: string; sender: string }[]; log: { sender: string; subject: string | null; received_at: string; status: string; reason: string | null; items_created: number }[] };

/** STG-02/03: the study's intake email address, who may send to it, and what arrived. */
function IntakeEmail({ studyId }: { studyId: string }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState<IntakeEmailView | null>(null);
  const [alias, setAlias] = useState("");
  const [sender, setSender] = useState("");
  const [why, setWhy] = useState("");
  const [error, setError] = useState("");
  const load = useCallback(() => {
    apiFetch<IntakeEmailView>(`/studies/${studyId}/intake-email`).then((r) => { setV(r); setAlias(r.address?.alias ?? ""); }).catch((e) => setError((e as Error).message));
  }, [studyId]);
  useEffect(() => { if (open) load(); }, [open, load]);
  async function act(body: Record<string, unknown>) {
    setError("");
    try { await apiFetch(`/studies/${studyId}/intake-email`, { method: "POST", body: JSON.stringify({ ...body, reason: why.trim() }) }); setSender(""); load(); }
    catch (e) { setError((e as Error).message); }
  }
  if (!open) return <div><button onClick={() => setOpen(true)} style={btn(C.bgSec, C.textSec)}><i className="ti ti-mail" /> Intake email</button></div>;
  return (
    <div style={{ background: C.bg, border: `0.5px solid ${C.border}`, borderRadius: "12px", padding: "14px 16px", display: "flex", flexDirection: "column", gap: "8px" }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        <div style={{ fontSize: "13px", fontWeight: 600, color: C.text, flex: 1 }}>Intake email</div>
        <button onClick={() => setOpen(false)} style={btn(C.bgSec, C.textSec)}>Close</button>
      </div>
      {v && !v.configured && <div style={{ fontSize: "11px", color: C.warn, background: C.warnBg, borderRadius: "8px", padding: "6px 10px" }}>Receiving email is not switched on for TMF360 yet (an administrator connects the mail domain). You can prepare the address and allow-list now.</div>}
      {v?.address?.email && <div style={{ fontSize: "12px", color: C.textSec }}>Send documents to <b>{v.address.email}</b> {v.address.enabled ? "" : "(switched off)"}</div>}
      <label style={{ fontSize: "11px", color: C.textSec }}>Reason for changes (required)<input value={why} onChange={(e) => setWhy(e.target.value)} style={input} /></label>
      <div style={{ display: "flex", gap: "6px", alignItems: "flex-end" }}>
        <label style={{ fontSize: "11px", color: C.textSec, flex: 1 }}>Address name<input aria-label="Intake address name" value={alias} onChange={(e) => setAlias(e.target.value.toLowerCase())} placeholder="e.g. abc-123-tmf" style={input} /></label>
        <button disabled={why.trim().length < 3 || alias.length < 3} onClick={() => act({ action: "set_address", alias, enabled: true })} style={btn(C.primary, "#fff")}>Save address</button>
        {v?.address && <button disabled={why.trim().length < 3} onClick={() => act({ action: "set_address", alias: v.address!.alias, enabled: !v.address!.enabled })} style={btn(C.bgSec, C.textSec)}>{v.address.enabled ? "Switch off" : "Switch on"}</button>}
      </div>
      <div style={{ fontSize: "11px", fontWeight: 600, color: C.textSec }}>Allowed senders (an address, or a whole domain). Others are refused and get a reply with the submission guidelines.</div>
      {v?.senders.map((x) => (
        <div key={x.id} style={{ display: "flex", gap: "6px", alignItems: "center", fontSize: "12px", color: C.textSec }}>
          <span style={{ flex: 1 }}>{x.sender}</span>
          <button aria-label={`Remove ${x.sender}`} disabled={why.trim().length < 3} onClick={() => act({ action: "remove_sender", id: x.id })} style={btn(C.bgSec, C.textSec)}>Remove</button>
        </div>
      ))}
      <div style={{ display: "flex", gap: "6px" }}>
        <input aria-label="Allowed sender" value={sender} onChange={(e) => setSender(e.target.value)} placeholder="name@site.org or site.org" style={input} />
        <button disabled={why.trim().length < 3 || !sender.trim()} onClick={() => act({ action: "add_sender", sender: sender.trim() })} style={btn(C.bgSec, C.textSec)}>Allow</button>
      </div>
      {v && v.log.length > 0 && (
        <div style={{ fontSize: "11px", color: C.textSec }}>
          <div style={{ fontWeight: 600, marginTop: "4px" }}>Received</div>
          {v.log.map((l, i) => <div key={i}>{new Date(l.received_at).toLocaleString()} · {l.sender} · {l.subject ?? "(no subject)"} · {l.status === "accepted" ? `${l.items_created} file(s) added` : "refused"}{l.reason ? ` (${l.reason})` : ""}</div>)}
        </div>
      )}
      <div style={{ fontSize: "11px", color: C.textTert }}>What happens next: attachments from allowed senders arrive here as intake items with the sender, subject and received date, ready to index. Address and allow-list changes are audited.</div>
      {error && <div role="alert" style={{ fontSize: "11px", color: C.danger }}>{error}</div>}
    </div>
  );
}
