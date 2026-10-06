"use client";
// Required and type-specific fields per document type (Part 22, RM-06). For each TMF artifact, choose which
// standard fields must be filled and add extra fields of that type. Filing from intake and Submit for QC refuse
// documents with required fields missing. Applies to the whole organisation; every change is audited.
import { useEffect, useMemo, useState } from "react";
import { ApiClientError, apiFetch } from "../../lib/api/client";
import { onDiscard, useUnsavedChanges } from "../../lib/unsaved";

type CustomField = { key: string; label: string; type: "text" | "date" | "number" | "select"; options?: string[]; required: boolean };
type Rule = { id?: string; artifact_num: string; required_fields: string[]; custom_fields: CustomField[]; row_version?: number };
type Artifact = { a: string; an: string; z: string };

const C = {
  orange: "#F97316", text: "#111827", textSec: "#374151", textMuted: "#6B7280", border: "#E5EDF6", bg: "#F8FAFC", bgCard: "#FFFFFF",
  greenDark: "#065F46", greenLight: "#ECFDF5", redDark: "#991B1B", redLight: "#FEF2F2",
};
const card: React.CSSProperties = { background: C.bgCard, border: `0.5px solid ${C.border}`, borderRadius: "12px", padding: "14px 16px" };
const input: React.CSSProperties = { width: "100%", fontSize: "12px", padding: "6px 8px", border: `0.5px solid ${C.border}`, borderRadius: "6px", boxSizing: "border-box", fontFamily: "inherit" };
const btn = (bg: string, color: string): React.CSSProperties => ({ fontSize: "12px", fontWeight: 600, padding: "6px 12px", background: bg, color, border: `0.5px solid ${C.border}`, borderRadius: "8px", cursor: "pointer" });
const STANDARD: [string, string][] = [["title", "Title"], ["version", "Version"], ["effective_date", "Effective date"], ["expiry_date", "Expiry date"], ["owner", "Owner"], ["country", "Country"], ["site", "Site"]];
const TYPES: [CustomField["type"], string][] = [["text", "Text"], ["date", "Date"], ["number", "Number"], ["select", "List"]];
const keyOf = (label: string) => label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").replace(/^(\d)/, "f_$1").slice(0, 40) || "field";
const blank = (a: string): Rule => ({ artifact_num: a, required_fields: [], custom_fields: [] });

export default function FieldRules({ artifacts, canEdit }: { artifacts: Artifact[]; canEdit: boolean }) {
  const [rules, setRules] = useState<Record<string, Rule>>({});
  const [reloads, setReloads] = useState(0);
  const [open, setOpen] = useState(false);
  const [artifact, setArtifact] = useState("");
  const [draft, setDraft] = useState<Rule | null>(null);
  const [optionText, setOptionText] = useState<Record<number, string>>({});
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch<{ data: Rule[] }>("/field-rules").then((r) => { if (!cancelled) setRules(Object.fromEntries(r.data.map((x) => [x.artifact_num, x]))); }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [reloads]);

  const sorted = useMemo(() => artifacts.slice().sort((a, b) => a.a.localeCompare(b.a, undefined, { numeric: true })), [artifacts]);
  const saved = artifact ? rules[artifact] ?? blank(artifact) : null;
  const dirty = !!draft && !!saved && JSON.stringify({ r: draft.required_fields, c: draft.custom_fields }) !== JSON.stringify({ r: saved.required_fields, c: saved.custom_fields });
  useUnsavedChanges("field-rules", dirty);
  useEffect(() => onDiscard(() => setDraft(null)), []);

  function choose(a: string) {
    setArtifact(a); setMsg(null); setReason(""); setOptionText({});
    const r = rules[a] ?? blank(a);
    setDraft({ ...r, required_fields: [...r.required_fields], custom_fields: r.custom_fields.map((f) => ({ ...f })) });
  }
  const setField = (i: number, patch: Partial<CustomField>) => setDraft((d) => d && ({ ...d, custom_fields: d.custom_fields.map((f, j) => (j === i ? { ...f, ...patch } : f)) }));
  const keys = draft?.custom_fields.map((f) => f.key) ?? [];
  const problems = draft ? [
    ...draft.custom_fields.filter((f) => !f.label.trim()).map(() => "Every extra field needs a name"),
    ...(new Set(keys).size !== keys.length ? ["Two extra fields have the same name"] : []),
    ...draft.custom_fields.filter((f) => f.type === "select" && !(f.options?.length)).map((f) => `"${f.label || "List"}" needs at least one option`),
  ] : [];

  async function save() {
    if (!draft) return;
    setSaving(true); setMsg(null);
    try {
      await apiFetch("/field-rules", { method: "PUT", body: JSON.stringify({
        artifact_num: draft.artifact_num, required_fields: draft.required_fields,
        custom_fields: draft.custom_fields.map((f) => ({ key: f.key, label: f.label.trim(), type: f.type, required: f.required, ...(f.type === "select" ? { options: f.options } : {}) })),
        ...(saved?.row_version ? { row_version: saved.row_version } : {}), change_reason: reason.trim(),
      }) });
      setMsg({ ok: true, text: `Fields for ${draft.artifact_num} saved.` });
      setReason(""); setReloads((n) => n + 1); setArtifact(""); setDraft(null);
    } catch (e) { setMsg({ ok: false, text: e instanceof ApiClientError ? e.message : "Could not save" }); } finally { setSaving(false); }
  }

  const configured = Object.values(rules).filter((r) => r.required_fields.length || r.custom_fields.length);
  return (
    <div style={{ ...card, marginTop: "14px" }}>
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit", textAlign: "left" }}>
        <i className={`ti ti-chevron-${open ? "down" : "right"}`} />
        <span style={{ fontSize: "13px", fontWeight: 600, color: C.text, flex: 1 }}>Required fields by document type</span>
        <span style={{ fontSize: "11px", color: C.textMuted }}>{configured.length} artifact(s) configured</span>
      </button>
      {open && (
        <div style={{ marginTop: "10px" }}>
          <div style={{ fontSize: "12px", color: C.textMuted, marginBottom: "10px" }}>
            Choose which fields a document of each type must have before it can be filed or submitted for QC, and add fields specific to that type (for example an IRB number). Applies to all studies of the organisation.
          </div>
          {configured.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "10px" }}>
              {configured.map((r) => (
                <button key={r.artifact_num} onClick={() => choose(r.artifact_num)} style={btn(artifact === r.artifact_num ? "#FFF7ED" : C.bg, C.textSec)}>
                  {r.artifact_num} · {r.required_fields.length + r.custom_fields.filter((f) => f.required).length} required{r.custom_fields.length ? `, ${r.custom_fields.length} extra` : ""}
                </button>
              ))}
            </div>
          )}
          <select aria-label="Artifact for field rules" value={artifact} onChange={(e) => choose(e.target.value)} style={{ ...input, marginBottom: "10px" }} disabled={!canEdit && !configured.length}>
            <option value="">Choose a document type…</option>
            {sorted.map((a) => <option key={a.a} value={a.a}>{a.a} — {a.an}{rules[a.a] ? " ✓" : ""}</option>)}
          </select>
          {draft && (
            <>
              <div style={{ fontSize: "11px", fontWeight: 600, color: C.textSec, marginBottom: "4px" }}>Required standard fields</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "12px" }}>
                {STANDARD.map(([k, label]) => (
                  <label key={k} style={{ fontSize: "12px", color: C.text, display: "flex", gap: "4px", alignItems: "center" }}>
                    <input type="checkbox" disabled={!canEdit} checked={draft.required_fields.includes(k)}
                      onChange={(e) => setDraft({ ...draft, required_fields: e.target.checked ? [...draft.required_fields, k] : draft.required_fields.filter((x) => x !== k) })} /> {label}
                  </label>
                ))}
              </div>
              <div style={{ fontSize: "11px", fontWeight: 600, color: C.textSec, marginBottom: "4px" }}>Extra fields for this type</div>
              {draft.custom_fields.map((f, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 2fr auto auto", gap: "6px", alignItems: "center", marginBottom: "6px" }}>
                  <input aria-label="Field name" disabled={!canEdit} value={f.label} placeholder="Field name" maxLength={100}
                    onChange={(e) => setField(i, { label: e.target.value, ...(rules[draft.artifact_num]?.custom_fields.some((x) => x.key === f.key) ? {} : { key: keyOf(e.target.value) }) })} style={input} />
                  <select aria-label="Field type" disabled={!canEdit} value={f.type} onChange={(e) => setField(i, { type: e.target.value as CustomField["type"] })} style={input}>
                    {TYPES.map(([t, l]) => <option key={t} value={t}>{l}</option>)}
                  </select>
                  {f.type === "select"
                    ? <input aria-label="Options" disabled={!canEdit} placeholder="Options, separated by commas" value={optionText[i] ?? (f.options ?? []).join(", ")}
                        onChange={(e) => { setOptionText((o) => ({ ...o, [i]: e.target.value })); setField(i, { options: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) }); }} style={input} />
                    : <span />}
                  <label style={{ fontSize: "12px", display: "flex", gap: "4px", alignItems: "center" }}><input type="checkbox" disabled={!canEdit} checked={f.required} onChange={(e) => setField(i, { required: e.target.checked })} /> Required</label>
                  {canEdit ? <button aria-label="Remove field" onClick={() => setDraft({ ...draft, custom_fields: draft.custom_fields.filter((_, j) => j !== i) })} style={btn(C.bgCard, C.redDark)}><i className="ti ti-trash" /></button> : <span />}
                </div>
              ))}
              {canEdit && draft.custom_fields.length < 20 && (
                <button onClick={() => setDraft({ ...draft, custom_fields: [...draft.custom_fields, { key: `field_${draft.custom_fields.length + 1}`, label: "", type: "text", required: false }] })} style={btn(C.bgCard, C.textSec)}>
                  <i className="ti ti-plus" /> Add field
                </button>
              )}
              {canEdit && (
                <div style={{ marginTop: "12px" }}>
                  {problems.map((p) => <div key={p} style={{ fontSize: "11px", color: C.redDark }}>{p}</div>)}
                  <label style={{ fontSize: "11px", fontWeight: 600, color: C.textSec, display: "block", margin: "6px 0 4px" }}>Reason for the change</label>
                  <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={2000} style={input} placeholder="e.g. IRB reference needed for inspections" />
                  <div style={{ fontSize: "11px", color: C.textMuted, background: C.bg, borderRadius: "8px", padding: "8px 10px", margin: "8px 0" }}>
                    What happens next: from now on, documents of type {draft.artifact_num} can&apos;t be filed from intake or submitted for QC until these fields are filled. Documents already in QC or Final are not changed. The change is recorded in the audit trail.
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button onClick={() => { setArtifact(""); setDraft(null); }} style={btn(C.bgCard, C.textSec)}>Cancel</button>
                    <button disabled={saving || !dirty || problems.length > 0 || reason.trim().length < 3} onClick={save}
                      style={{ ...btn(C.orange, "#fff"), opacity: saving || !dirty || problems.length > 0 || reason.trim().length < 3 ? 0.5 : 1 }}>{saving ? "Saving…" : "Save fields"}</button>
                  </div>
                </div>
              )}
            </>
          )}
          {msg && <div role="status" style={{ marginTop: "8px", fontSize: "12px", padding: "6px 10px", borderRadius: "8px", background: msg.ok ? C.greenLight : C.redLight, color: msg.ok ? C.greenDark : C.redDark }}>{msg.text}</div>}
        </div>
      )}
    </div>
  );
}
