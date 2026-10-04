"use client";
// Part 8a (M08): expected artifacts. Add Expected Artifact (PLC-02/03), the placeholder panel
// with Manage Expected Artifact (link/unlink, edit, cancel — PLC-05), and the Expected Artifacts
// view grouped by the study's taxonomy with completeness (PLC-06/07). All writes go through /api/v1.
import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api/client";

type TreeNode = { id: string; label: string; field: string | null; value: string | null; children: TreeNode[] };
type Counts = Record<"Missing" | "Expected" | "Incomplete" | "Under Revision" | "Final", number>;
type Group = { key: string; label: string; counts: Counts; completeness: number | null; children?: Group[] };
type Placeholder = {
  id: string; artifact_num: string; artifact_name: string; level: string; title: string | null; instructions: string | null;
  responsible_org: string | null; responsible_dept: string | null; due_date: string | null; status: string; document_id: string | null;
  source: string; created_at: string; row_version: number;
  candidates: { id: string; title: string; status: string; study_country_id: string | null; study_site_id: string | null }[];
};

const C = {
  primary: "#F97316", primaryLight: "#FFEDD5", text: "#111827", textSec: "#374151", textTert: "#6B7280",
  border: "#E5E7EB", bg: "#FFFFFF", bgSec: "#F9FAFB", danger: "#991B1B", dangerBg: "#FEF2F2", green: "#065F46", greenBg: "#ECFDF5",
};
const btn = (bg: string, color: string): React.CSSProperties => ({ fontSize: "11px", fontWeight: 600, padding: "6px 12px", background: bg, color, border: `0.5px solid ${C.border}`, borderRadius: "6px", cursor: "pointer" });
const input: React.CSSProperties = { fontSize: "12px", padding: "6px 8px", border: `0.5px solid ${C.border}`, borderRadius: "6px", background: C.bg, boxSizing: "border-box", width: "100%", fontFamily: "inherit" };
const label: React.CSSProperties = { fontSize: "11px", color: C.textSec, display: "flex", flexDirection: "column", gap: "3px" };
const STATUS_ORDER: (keyof Counts)[] = ["Missing", "Expected", "Incomplete", "Under Revision", "Final"];

export const pct = (n: number | null | undefined) => (n == null ? "—" : `${Math.round(n)}%`);

/** Add Expected Artifact — one, or several of the same kind at once (quantity). */
export function AddExpected({ studyId, tree, onDone, onCancel }: { studyId: string; tree: { my_trial: TreeNode; taxonomy: { nodes: TreeNode[] } }; onDone: (msg: string) => void; onCancel: () => void }) {
  const artifacts = tree.taxonomy.nodes.flatMap((z) => z.children.flatMap((s) => s.children)).filter((a) => a.field === "artifact");
  const countries = tree.my_trial.children;
  const sites = countries.flatMap((c) => c.children.map((s) => ({ ...s, country: c.label })));
  const [f, setF] = useState({ artifact_num: "", level: "study", country: "", site: "", title: "", instructions: "", responsible_org: "", responsible_dept: "", due_date: "", quantity: 1 });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<typeof f>) => setF((x) => ({ ...x, ...patch }));
  const valid = !!f.artifact_num && (f.level !== "country" || !!f.country) && (f.level !== "site" || !!f.site);

  async function save() {
    if (!valid) return;
    setBusy(true); setError("");
    try {
      const r = await apiFetch<{ data: { status: string }[] }>(`/studies/${studyId}/placeholders`, { method: "POST", body: JSON.stringify({ items: [{
        artifact_num: f.artifact_num, level: f.level,
        study_country_id: f.level === "country" ? f.country : null, study_site_id: f.level === "site" ? f.site : null,
        title: f.title, instructions: f.instructions, responsible_org: f.responsible_org, responsible_dept: f.responsible_dept,
        due_date: f.due_date || null, quantity: f.quantity,
      }] }) });
      const filled = r.data.filter((p) => p.status === "fulfilled").length;
      onDone(`${r.data.length} expected artifact${r.data.length > 1 ? "s" : ""} added${filled ? `; ${filled} already fulfilled by a filed document` : ""}.`);
    } catch (e) { setError((e as Error).message); }
    setBusy(false);
  }

  return (
    <div style={{ background: C.bgSec, border: `0.5px solid ${C.border}`, borderRadius: "10px", padding: "12px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "8px" }}>
      <div style={{ gridColumn: "1 / -1", fontSize: "12px", fontWeight: 700, color: C.text }}>Add expected artifact</div>
      <label style={{ ...label, gridColumn: "span 2" }}>Artifact (required)
        <select value={f.artifact_num} onChange={(e) => set({ artifact_num: e.target.value })} style={input}>
          <option value="">Choose an artifact…</option>
          {artifacts.map((a) => <option key={a.value!} value={a.value!}>{a.label}</option>)}
        </select>
      </label>
      <label style={label}>Level
        <select value={f.level} onChange={(e) => set({ level: e.target.value, country: "", site: "" })} style={input}>
          <option value="study">Study</option>
          <option value="country" disabled={!countries.length}>Country</option>
          <option value="site" disabled={!sites.length}>Site</option>
        </select>
      </label>
      {f.level === "country" && <label style={label}>Country (required)
        <select value={f.country} onChange={(e) => set({ country: e.target.value })} style={input}>
          <option value="">Choose…</option>{countries.map((c) => <option key={c.value!} value={c.value!}>{c.label}</option>)}
        </select></label>}
      {f.level === "site" && <label style={label}>Site (required)
        <select value={f.site} onChange={(e) => set({ site: e.target.value })} style={input}>
          <option value="">Choose…</option>{sites.map((s) => <option key={s.value!} value={s.value!}>{s.label} ({s.country})</option>)}
        </select></label>}
      <label style={label}>Title (optional)<input value={f.title} onChange={(e) => set({ title: e.target.value })} placeholder="Defaults to the artifact name" style={input} /></label>
      <label style={label}>Due date<input type="date" value={f.due_date} onChange={(e) => set({ due_date: e.target.value })} style={input} /></label>
      <label style={label}>Responsible organisation<input value={f.responsible_org} onChange={(e) => set({ responsible_org: e.target.value })} style={input} /></label>
      <label style={label}>Department<input value={f.responsible_dept} onChange={(e) => set({ responsible_dept: e.target.value })} style={input} /></label>
      <label style={label}>How many<input type="number" min={1} max={50} value={f.quantity} onChange={(e) => set({ quantity: Math.max(1, Math.min(50, Number(e.target.value) || 1)) })} style={input} /></label>
      <label style={{ ...label, gridColumn: "1 / -1" }}>Instructions for whoever files it<textarea value={f.instructions} onChange={(e) => set({ instructions: e.target.value.slice(0, 4000) })} rows={2} style={{ ...input, resize: "vertical" }} /></label>
      <div style={{ gridColumn: "1 / -1", fontSize: "11px", color: C.textSec, background: C.bg, borderRadius: "8px", padding: "8px 10px" }}>
        <b>What happens next:</b> {f.quantity > 1 ? `${f.quantity} placeholders appear` : "a placeholder appears"} as Expected{f.due_date ? `, turning Missing after ${f.due_date}` : ""}. The study&apos;s completeness drops until matching documents are filed; filing one at the same level fills it automatically.
      </div>
      {error && <div role="alert" style={{ gridColumn: "1 / -1", fontSize: "12px", color: C.danger, background: C.dangerBg, borderRadius: "8px", padding: "8px 10px" }}>{error}</div>}
      <div style={{ gridColumn: "1 / -1", display: "flex", gap: "6px", justifyContent: "flex-end" }}>
        <button onClick={onCancel} style={btn(C.bg, C.textSec)}>Cancel</button>
        <button disabled={!valid || busy} onClick={save} style={{ ...btn(C.primary, "#fff"), opacity: valid && !busy ? 1 : 0.5 }}>{busy ? "Adding…" : "Add expected artifact"}</button>
      </div>
    </div>
  );
}

/** The placeholder side panel: details, then Manage Expected Artifact actions. */
export function PlaceholderPanel({ id, canEdit, onAddToIntake, onChanged }: { id: string; canEdit: boolean; onAddToIntake: () => void; onChanged: () => void }) {
  const [p, setP] = useState<Placeholder | null>(null);
  const [mode, setMode] = useState<"" | "link" | "cancel" | "edit">("");
  const [docId, setDocId] = useState("");
  const [reason, setReason] = useState("");
  const [edit, setEdit] = useState({ due_date: "", responsible_org: "", responsible_dept: "", instructions: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reloads, setReloads] = useState(0);

  useEffect(() => {
    let cancelled = false;
    apiFetch<Placeholder>(`/placeholders/${id}`).then((x) => { if (!cancelled) { setP(x); setEdit({ due_date: x.due_date ?? "", responsible_org: x.responsible_org ?? "", responsible_dept: x.responsible_dept ?? "", instructions: x.instructions ?? "" }); } })
      .catch((e) => { if (!cancelled) setError((e as Error).message); });
    return () => { cancelled = true; };
  }, [id, reloads]);

  if (!p) return <div style={{ fontSize: "11px", color: error ? C.danger : C.textTert }}>{error || "Loading…"}</div>;
  const reasonOk = reason.trim().length >= 3;

  async function run(fn: () => Promise<unknown>) {
    setBusy(true); setError("");
    try { await fn(); setMode(""); setReason(""); setDocId(""); setReloads((n) => n + 1); onChanged(); }
    catch (e) { setError((e as Error).message); }
    setBusy(false);
  }

  const rows: [string, unknown][] = [
    ["Level", p.level], ["Due", p.due_date ?? "No due date"], ["Responsible", [p.responsible_org, p.responsible_dept].filter(Boolean).join(" · ")],
    ["Origin", p.source === "plan" ? "eTMF plan" : "Added by hand"], ["Added", new Date(p.created_at).toLocaleDateString()],
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 10px", fontSize: "11px", margin: 0 }}>
        {rows.filter(([, v]) => v).map(([k, v]) => (
          <div key={k} style={{ display: "contents" }}><dt style={{ color: C.textTert }}>{k}</dt><dd style={{ margin: 0, color: C.text, textTransform: k === "Level" ? "capitalize" : undefined }}>{String(v)}</dd></div>
        ))}
      </dl>
      {p.instructions && <div style={{ fontSize: "11px", color: C.textSec, background: C.bgSec, borderRadius: "8px", padding: "8px 10px", whiteSpace: "pre-wrap" }}>{p.instructions}</div>}
      <button onClick={onAddToIntake} style={btn(C.primary, "#fff")}>Add the file through Document Intake</button>
      {canEdit && p.status === "open" && (
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          <button onClick={() => setMode(mode === "link" ? "" : "link")} disabled={!p.candidates.length} title={p.candidates.length ? "" : "No filed document of this artifact yet"} style={{ ...btn(C.bg, C.textSec), opacity: p.candidates.length ? 1 : 0.5 }}><i className="ti ti-link" /> Link document</button>
          <button onClick={() => setMode(mode === "edit" ? "" : "edit")} style={btn(C.bg, C.textSec)}><i className="ti ti-pencil" /> Edit</button>
          <button onClick={() => setMode(mode === "cancel" ? "" : "cancel")} style={btn(C.dangerBg, C.danger)}><i className="ti ti-x" /> Not needed</button>
        </div>
      )}
      {mode === "link" && (
        <select value={docId} onChange={(e) => setDocId(e.target.value)} aria-label="Document to link" style={input}>
          <option value="">Choose a filed document…</option>
          {p.candidates.map((d) => <option key={d.id} value={d.id}>{d.title} ({d.status})</option>)}
        </select>
      )}
      {mode === "edit" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label style={label}>Due date<input type="date" value={edit.due_date} onChange={(e) => setEdit({ ...edit, due_date: e.target.value })} style={input} /></label>
          <label style={label}>Responsible organisation<input value={edit.responsible_org} onChange={(e) => setEdit({ ...edit, responsible_org: e.target.value })} style={input} /></label>
          <label style={label}>Department<input value={edit.responsible_dept} onChange={(e) => setEdit({ ...edit, responsible_dept: e.target.value })} style={input} /></label>
          <label style={label}>Instructions<textarea rows={2} value={edit.instructions} onChange={(e) => setEdit({ ...edit, instructions: e.target.value })} style={{ ...input, resize: "vertical" }} /></label>
        </div>
      )}
      {mode && (
        <>
          <label style={label}>Reason (required, recorded in the audit trail)<input value={reason} onChange={(e) => setReason(e.target.value)} style={input} /></label>
          <div style={{ fontSize: "10px", color: C.textTert }}>
            What happens next: {mode === "link" ? "the placeholder counts as filed by that document." : mode === "cancel" ? "the placeholder stops counting towards completeness. Its history stays." : "the placeholder is updated; a new due date changes when it turns Missing."}
          </div>
          <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
            <button onClick={() => setMode("")} style={btn(C.bgSec, C.textSec)}>Cancel</button>
            <button disabled={busy || !reasonOk || (mode === "link" && !docId)} style={{ ...btn(mode === "cancel" ? C.danger : C.primary, "#fff"), opacity: reasonOk && (mode !== "link" || docId) ? 1 : 0.5 }}
              onClick={() => run(() => mode === "link"
                ? apiFetch(`/placeholders/${id}/link`, { method: "POST", body: JSON.stringify({ document_id: docId, reason: reason.trim() }) })
                : mode === "cancel"
                  ? apiFetch(`/placeholders/${id}/cancel`, { method: "POST", body: JSON.stringify({ reason: reason.trim() }) })
                  : apiFetch(`/placeholders/${id}`, { method: "PATCH", body: JSON.stringify({ due_date: edit.due_date || null, responsible_org: edit.responsible_org || null, responsible_dept: edit.responsible_dept || null, instructions: edit.instructions || null, row_version: p.row_version, reason: reason.trim() }) }))}>
              {mode === "link" ? "Link" : mode === "cancel" ? "Mark not needed" : "Save"}
            </button>
          </div>
        </>
      )}
      {error && <div role="alert" style={{ fontSize: "11px", color: C.danger, background: C.dangerBg, borderRadius: "8px", padding: "7px 9px" }}>{error}</div>}
    </div>
  );
}

/** Expected Artifacts (PLC-07): counts per status by zone → section → artifact, with drill-down. */
export function ExpectedArtifacts({ studyId, onDrill }: { studyId: string; onDrill: (field: "zone" | "section" | "artifact", value: string, label: string) => void }) {
  const [data, setData] = useState<{ counts: Counts; completeness: number | null; zones: Group[] } | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  useEffect(() => {
    apiFetch<{ counts: Counts; completeness: number | null; zones: Group[] }>(`/studies/${studyId}/expected-artifacts`).then(setData).catch((e) => setError((e as Error).message));
  }, [studyId]);
  if (!data) return <div style={{ fontSize: "12px", color: error ? C.danger : C.textTert, padding: "1rem" }}>{error || "Loading…"}</div>;

  const bar = (c: number | null) => (
    <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: "110px" }}>
      <div style={{ flex: 1, height: "6px", borderRadius: "3px", background: "#F3F4F6", overflow: "hidden" }}><div style={{ width: `${c ?? 0}%`, height: "100%", background: (c ?? 0) >= 80 ? "#10B981" : (c ?? 0) >= 50 ? "#F59E0B" : "#EF4444" }} /></div>
      <span style={{ fontSize: "11px", color: C.textSec, width: "36px", textAlign: "right" }}>{pct(c)}</span>
    </div>
  );
  const row = (g: Group, depth: number, field: "zone" | "section" | "artifact"): React.ReactNode[] => {
    const isOpen = open.has(g.key);
    return [
      <tr key={g.key} style={{ borderBottom: `0.5px solid #F3F4F6` }}>
        <td style={{ padding: "6px 10px", paddingLeft: `${10 + depth * 16}px`, fontSize: "11px", color: C.text, fontWeight: depth === 0 ? 600 : 400 }}>
          {g.children ? (
            <button aria-label={isOpen ? "Collapse" : "Expand"} onClick={() => setOpen((s) => { const x = new Set(s); if (x.has(g.key)) x.delete(g.key); else x.add(g.key); return x; })}
              style={{ border: "none", background: "transparent", cursor: "pointer", color: C.textTert, padding: "0 4px 0 0" }}><i className={`ti ti-chevron-${isOpen ? "down" : "right"}`} /></button>
          ) : <span style={{ display: "inline-block", width: "16px" }} />}
          <button onClick={() => onDrill(field, g.key, g.label)} title="Show these in the grid" style={{ border: "none", background: "transparent", cursor: "pointer", color: "inherit", fontWeight: "inherit", padding: 0, textAlign: "left" }}>{g.label}</button>
        </td>
        {STATUS_ORDER.map((s) => <td key={s} style={{ padding: "6px 10px", fontSize: "11px", textAlign: "right", color: g.counts[s] ? C.text : "#D1D5DB" }}>{g.counts[s]}</td>)}
        <td style={{ padding: "6px 10px" }}>{bar(g.completeness)}</td>
      </tr>,
      ...(isOpen && g.children ? g.children.flatMap((c) => row(c, depth + 1, field === "zone" ? "section" : "artifact")) : []),
    ];
  };

  return (
    <div style={{ background: C.bg, border: `0.5px solid ${C.border}`, borderRadius: "12px", overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: C.bgSec, borderBottom: `0.5px solid ${C.border}` }}>
            <th style={{ textAlign: "left", padding: "8px 10px", fontSize: "11px", color: C.textSec }}>Zone / section / artifact</th>
            {STATUS_ORDER.map((s) => <th key={s} style={{ textAlign: "right", padding: "8px 10px", fontSize: "11px", color: C.textSec, whiteSpace: "nowrap" }}>{s}</th>)}
            <th style={{ textAlign: "left", padding: "8px 10px", fontSize: "11px", color: C.textSec }}>Completeness</th>
          </tr>
        </thead>
        <tbody>
          {data.zones.length === 0
            ? <tr><td colSpan={7} style={{ padding: "2rem", textAlign: "center", fontSize: "12px", color: C.textTert }}>Nothing expected yet. Add expected artifacts or apply the eTMF plan.</td></tr>
            : data.zones.flatMap((z) => row(z, 0, "zone"))}
          <tr style={{ background: C.bgSec, fontWeight: 700 }}>
            <td style={{ padding: "8px 10px", fontSize: "11px" }}>Study total</td>
            {STATUS_ORDER.map((s) => <td key={s} style={{ padding: "8px 10px", fontSize: "11px", textAlign: "right" }}>{data.counts[s]}</td>)}
            <td style={{ padding: "8px 10px" }}>{bar(data.completeness)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
