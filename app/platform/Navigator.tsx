"use client";
// TMF Navigator (Part 6, M04): browse a study's TMF by trial structure or taxonomy, with status
// tiles, filters, a configurable grid and CSV export. All filtering runs on the server, as the user.
import { useEffect, useMemo, useState } from "react";
import { apiFetch, authHeaders } from "../../lib/api/client";
import { History } from "./QcTasks";
import { AddExpected, ExpectedArtifacts, PlaceholderPanel, pct } from "./Placeholders";

type TreeNode = { id: string; label: string; field: string | null; value: string | null; children: TreeNode[] };
type Tree = { my_trial: TreeNode; taxonomy: { label: string; nodes: TreeNode[] } };
type Chip = { field: string; value: string; label: string };
type Rule = { column: string; op: string; value: string };
type Row = {
  row_id: string; kind: "document" | "missing" | "placeholder"; document_id: string | null; nav_status: string; current_activity: string;
  placeholder_id: string | null; due_date: string | null;
  document_type: string | null; artifact_num: string | null; doc_ref: string | null; title: string | null;
  country_code: string | null; site_number: string | null; site_name: string | null; owner: string | null;
  last_modified: string | null; tmf_level: string; file_type: string | null; revision: string | null; has_file: boolean;
};
type Result = { data: Row[]; total: number; page: number; page_size: number; counts: Record<string, number>; completeness: number | null };
type DocDetail = Record<string, unknown> & {
  id: string; status: string; artifact_num: string; artifact_name: string; has_file: boolean; tmf_level: string;
  file_versions: { version_no: number; file_name: string; file_hash: string; verification_status: string; created_at: string }[];
};

const C = {
  primary: "#F97316", primaryLight: "#FFEDD5", text: "#111827", textSec: "#374151", textTert: "#6B7280",
  border: "#E5E7EB", bg: "#FFFFFF", bgSec: "#F9FAFB", bgTert: "#F3F4F6", danger: "#991B1B", dangerBg: "#FEF2F2",
};
const btn = (bg: string, color: string): React.CSSProperties => ({ fontSize: "11px", fontWeight: 600, padding: "6px 12px", background: bg, color, border: `0.5px solid ${C.border}`, borderRadius: "6px", cursor: "pointer" });
const field: React.CSSProperties = { fontSize: "12px", padding: "6px 8px", border: `0.5px solid ${C.border}`, borderRadius: "6px", background: C.bg, boxSizing: "border-box" };

const TILES: { key: string; color: string; bg: string; hint: string }[] = [
  { key: "Missing", color: "#991B1B", bg: "#FEF2F2", hint: "Expected artifacts past their due date (before a plan exists: every enabled artifact with no document)" },
  { key: "Expected", color: "#374151", bg: "#F3F4F6", hint: "Expected artifacts not yet due" },
  { key: "Incomplete", color: "#92400E", bg: "#FFFBEB", hint: "Records with no file attached" },
  { key: "Under Revision", color: "#1D4ED8", bg: "#EFF6FF", hint: "Draft, in review or returned for rework" },
  { key: "Final", color: "#065F46", bg: "#ECFDF5", hint: "Approved documents" },
];

const COLUMNS: { key: keyof Row & string; api: string; label: string; on: boolean }[] = [
  { key: "nav_status", api: "status", label: "Status", on: true },
  { key: "current_activity", api: "activity", label: "Current Activity", on: true },
  { key: "artifact_num", api: "artifact", label: "Artifact", on: true },
  { key: "document_type", api: "type", label: "Document Type", on: true },
  { key: "doc_ref", api: "ref", label: "ID", on: false },
  { key: "title", api: "title", label: "Title", on: true },
  { key: "tmf_level", api: "level", label: "TMF Level", on: true },
  { key: "country_code", api: "country", label: "Country", on: false },
  { key: "site_number", api: "site", label: "Site", on: false },
  { key: "site_name", api: "site_name", label: "Site Name", on: false },
  { key: "owner", api: "owner", label: "Owner", on: true },
  { key: "last_modified", api: "modified", label: "Last Modified", on: true },
  { key: "file_type", api: "file_type", label: "File Type", on: false },
  { key: "revision", api: "revision", label: "Revision", on: false },
  { key: "due_date", api: "due", label: "Due", on: true },
];
const OPS: { op: string; label: string; text: boolean; date: boolean; needsValue: boolean }[] = [
  { op: "eq", label: "is", text: true, date: false, needsValue: true },
  { op: "neq", label: "is not", text: true, date: false, needsValue: true },
  { op: "contains", label: "contains", text: true, date: false, needsValue: true },
  { op: "starts_with", label: "starts with", text: true, date: false, needsValue: true },
  { op: "gt", label: "after", text: false, date: true, needsValue: true },
  { op: "lt", label: "before", text: false, date: true, needsValue: true },
  { op: "empty", label: "is empty", text: true, date: true, needsValue: false },
  { op: "not_empty", label: "is not empty", text: true, date: true, needsValue: false },
];
const COLUMNS_KEY = "tmf360.navigator.columns";
const PAGE_SIZE = 50;

function loadColumns(): string[] {
  try {
    const saved = JSON.parse(localStorage.getItem(COLUMNS_KEY) || "null");
    if (Array.isArray(saved) && saved.every((k) => COLUMNS.some((c) => c.key === k))) return saved;
  } catch { /* browser storage unavailable */ }
  return COLUMNS.filter((c) => c.on).map((c) => c.key);
}

const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—");

export default function Navigator({ study, canDelete, canDownload, canSubmit, canEditStudy, onAddToIntake, onView, onOpenQc }: {
  study: { id: string; study_id: string }; canDelete: boolean; canDownload: boolean; canSubmit: boolean; canEditStudy: boolean;
  onAddToIntake: () => void; onView: (documentId: string) => void; onOpenQc: (documentId: string) => void;
}) {
  const [tree, setTree] = useState<Tree | null>(null);
  const [treeTab, setTreeTab] = useState<"my_trial" | "taxonomy">("taxonomy");
  const [open, setOpen] = useState<Set<string>>(new Set(["study"]));
  const [chips, setChips] = useState<Chip[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [level, setLevel] = useState<string>("");
  const [historical, setHistorical] = useState(false);
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [rules, setRules] = useState<Rule[]>([]);
  const [draftRules, setDraftRules] = useState<Rule[] | null>(null);
  const [sort, setSort] = useState<{ column: string; dir: "asc" | "desc" } | null>(null);
  const [columns, setColumns] = useState<string[]>(loadColumns);
  const [showColumns, setShowColumns] = useState(false);
  const [response, setResponse] = useState<{ key: string; result: Result | null; error: string } | null>(null);
  const [reloads, setReloads] = useState(0);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<{ row: Row; doc: DocDetail | null; steps?: React.ComponentProps<typeof History>["steps"] } | null>(null);
  const [submitNote, setSubmitNote] = useState<string | null>(null);
  const [view, setView] = useState<"grid" | "expected">("grid");
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [busy, setBusy] = useState("");

  useEffect(() => { try { localStorage.setItem(COLUMNS_KEY, JSON.stringify(columns)); } catch { /* ignore */ } }, [columns]);

  useEffect(() => {
    apiFetch<Tree>(`/studies/${study.id}/navigator/tree`).then(setTree).catch((e) => setError((e as Error).message));
  }, [study.id]);

  // Debounce the search box so each keystroke doesn't run six queries.
  useEffect(() => { const t = setTimeout(() => setQ(search.trim()), 300); return () => clearTimeout(t); }, [search]);
  const query = useMemo(() => ({
    chips: chips.map(({ field, value }) => ({ field, value })),
    status, level: level || null, index: historical ? "historical" : "current",
    q: q || undefined, rules: rules.map((r) => ({ column: r.column, op: r.op, value: r.value || undefined })),
    sort: sort ?? undefined,
  }), [chips, status, level, historical, q, rules, sort]);

  // Paging and selection belong to one set of filters: changing a filter starts again at
  // page 1 with nothing selected.
  const filterKey = JSON.stringify(query);
  const [paging, setPaging] = useState({ key: filterKey, page: 1 });
  const page = paging.key === filterKey ? paging.page : 1;
  const setPage = (p: number) => setPaging({ key: filterKey, page: p });
  const [selection, setSelection] = useState({ key: filterKey, ids: new Set<string>() });
  const selected = selection.key === filterKey ? selection.ids : new Set<string>();
  const setSelected = (fn: (s: Set<string>) => Set<string>) => setSelection({ key: filterKey, ids: fn(selected) });

  const requestKey = `${study.id}|${filterKey}|${page}|${reloads}`;
  useEffect(() => {
    let cancelled = false;
    apiFetch<Result>(`/studies/${study.id}/navigator`, {
      method: "POST", body: JSON.stringify({ ...query, page, page_size: PAGE_SIZE }),
    }).then((result) => { if (!cancelled) setResponse({ key: requestKey, result, error: "" }); })
      .catch((e) => { if (!cancelled) setResponse((r) => ({ key: requestKey, result: r?.result ?? null, error: (e as Error).message })); });
    return () => { cancelled = true; };
  }, [requestKey]); // eslint-disable-line react-hooks/exhaustive-deps -- requestKey covers study, query and page
  const loading = response?.key !== requestKey;
  const result = response?.result ?? null;
  const shownError = error || (response?.key === requestKey ? response.error : "");

  const addChip = (n: TreeNode) => {
    if (!n.field || !n.value) return;
    // One chip per field: picking another zone replaces the zone chip. Narrower taxonomy levels
    // replace broader ones so the chips never contradict each other.
    const replaces: Record<string, string[]> = { zone: ["zone", "section", "artifact"], section: ["zone", "section", "artifact"], artifact: ["zone", "section", "artifact"], country: ["country", "site"], site: ["country", "site"] };
    setChips((cs) => [...cs.filter((c) => !(replaces[n.field!] ?? [n.field]).includes(c.field)), { field: n.field!, value: n.value!, label: n.label }]);
  };

  async function openDetail(row: Row) {
    setDeleting(null);
    setSubmitNote(null);
    setDetail({ row, doc: null });
    if (row.kind !== "document" || !row.document_id) return;
    try {
      const [doc, tl] = await Promise.all([
        apiFetch<DocDetail>(`/documents/${row.document_id}`),
        apiFetch<{ steps: React.ComponentProps<typeof History>["steps"] }>(`/documents/${row.document_id}/timeline`),
      ]);
      setDetail((d) => (d?.row.row_id === row.row_id ? { row, doc, steps: tl.steps } : d));
    } catch (e) { setError((e as Error).message); }
  }

  async function submitForQc(row: Row, note: string) {
    setBusy("Submitting for QC…"); setError("");
    try {
      await apiFetch(`/documents/${row.document_id}/submit`, { method: "POST", body: JSON.stringify({ comment: note.trim() || undefined }) });
      setSubmitNote(null);
      setReloads((n) => n + 1);
      await openDetail(row);
    } catch (e) { setError((e as Error).message); }
    setBusy("");
  }

  async function download(id: string) {
    setBusy("Preparing download…");
    try {
      const r = await apiFetch<{ url: string }>(`/documents/${id}/access`, { method: "POST", body: JSON.stringify({ purpose: "download" }) });
      window.location.href = r.url;
    } catch (e) { setError((e as Error).message); }
    setBusy("");
  }

  async function applyPlan() {
    setBusy("Applying the eTMF plan…"); setError(""); setNotice("");
    try {
      const r = await apiFetch<{ created: number }>(`/studies/${study.id}/apply-plan`, { method: "POST" });
      setNotice(r.created ? `${r.created} expected artifact${r.created > 1 ? "s" : ""} added from the eTMF plan.` : "Nothing new: the study already has everything the plan expects so far. More appear as milestones are achieved.");
      setReloads((n) => n + 1);
    } catch (e) { setError((e as Error).message); }
    setBusy("");
  }

  async function remove(id: string, reason: string) {
    setBusy("Moving to the Recycle Bin…");
    try {
      await apiFetch(`/documents/${id}/delete`, { method: "POST", body: JSON.stringify({ reason: reason.trim() }) });
      setDetail(null); setDeleting(null);
      setReloads((n) => n + 1);
    } catch (e) { setError((e as Error).message); }
    setBusy("");
  }

  async function exportCsv() {
    setBusy("Exporting…"); setError("");
    try {
      const res = await fetch(`/api/v1/studies/${study.id}/navigator/export`, {
        method: "POST", headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({ ...query, ids: selected.size ? [...selected] : undefined }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error?.message ?? res.statusText);
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url; a.download = `${study.study_id.replace(/[^\w.-]/g, "_")}-navigator.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) { setError((e as Error).message); }
    setBusy("");
  }

  const visible = COLUMNS.filter((c) => columns.includes(c.key));
  const rows = result?.data ?? [];
  const pages = result ? Math.max(1, Math.ceil(result.total / PAGE_SIZE)) : 1;
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.row_id));
  const statusPill = (s: string) => {
    const t = TILES.find((x) => x.key === s) ?? TILES[1];
    return <span style={{ fontSize: "10px", fontWeight: 600, padding: "2px 8px", borderRadius: "20px", background: t.bg, color: t.color, whiteSpace: "nowrap" }}>{s}</span>;
  };

  const renderNode = (n: TreeNode, depth: number): React.ReactNode => {
    const isOpen = open.has(n.id);
    const active = chips.some((c) => c.field === n.field && c.value === n.value);
    return (
      <div key={n.id}>
        <div style={{ display: "flex", alignItems: "center", gap: "2px", paddingLeft: `${depth * 12}px` }}>
          <button aria-label={isOpen ? "Collapse" : "Expand"} onClick={() => setOpen((s) => { const x = new Set(s); if (x.has(n.id)) x.delete(n.id); else x.add(n.id); return x; })}
            style={{ width: "18px", border: "none", background: "transparent", cursor: n.children.length ? "pointer" : "default", color: C.textTert, visibility: n.children.length ? "visible" : "hidden", padding: 0 }}>
            <i className={`ti ti-chevron-${isOpen ? "down" : "right"}`} style={{ fontSize: "12px" }} />
          </button>
          <button onClick={() => (n.field ? addChip(n) : setOpen((s) => new Set(s).add(n.id)))} title={n.label}
            style={{ flex: 1, minWidth: 0, textAlign: "left", fontSize: "11px", padding: "4px 6px", borderRadius: "5px", border: "none", cursor: "pointer",
              background: active ? C.primaryLight : "transparent", color: active ? C.primary : C.textSec, fontWeight: active ? 600 : 400,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {n.label}
          </button>
        </div>
        {isOpen && n.children.map((c) => renderNode(c, depth + 1))}
      </div>
    );
  };

  const cell = (r: Row, key: string) => {
    if (key === "nav_status") return statusPill(r.nav_status);
    if (key === "last_modified") return fmtDate(r.last_modified);
    if (key === "due_date") return r.due_date
      ? <span style={{ color: r.nav_status === "Missing" ? C.danger : C.textSec, fontWeight: r.nav_status === "Missing" ? 600 : 400 }}>{new Date(`${r.due_date}T00:00:00`).toLocaleDateString(undefined, { dateStyle: "medium" })}</span>
      : <span style={{ color: C.textTert }}>—</span>;
    if (key === "artifact_num") return <span style={{ fontFamily: "monospace", fontSize: "10px", color: C.textTert }}>{r.artifact_num ?? "—"}</span>;
    if (key === "title") return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: r.kind === "document" ? C.text : C.textTert, fontStyle: r.kind === "document" ? "normal" : "italic" }}>
        {r.kind === "document" && <i className={`ti ${r.has_file ? "ti-file-text" : "ti-file-off"}`} style={{ fontSize: "13px", color: C.textTert }} />}
        {r.title ?? "—"}
      </span>
    );
    const v = r[key as keyof Row];
    return v == null || v === "" ? <span style={{ color: C.textTert }}>—</span> : String(v);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "8px", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 700, color: C.text }}>TMF Navigator — {study.study_id}</h1>
          <p style={{ fontSize: "12px", color: C.textTert, marginTop: "2px" }}>Pick a country, site, zone or artifact on the left, then narrow with the tiles and filters.</p>
        </div>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {canEditStudy && <button onClick={applyPlan} disabled={!!busy} title="Create the placeholders your eTMF plan expects for this study" style={btn(C.bg, C.textSec)}><i className="ti ti-list-check" /> Apply eTMF plan</button>}
          {canEditStudy && <button onClick={() => setAdding((a) => !a)} style={btn(C.bg, C.textSec)}>+ Expected artifact</button>}
          <button onClick={onAddToIntake} style={btn(C.primary, "#fff")}>+ Add documents</button>
        </div>
      </div>
      {notice && <div role="status" style={{ fontSize: "12px", padding: "8px 10px", borderRadius: "8px", background: "#ECFDF5", color: "#065F46" }}>{notice}</div>}
      {adding && tree && (
        <AddExpected studyId={study.id} tree={tree} onCancel={() => setAdding(false)}
          onDone={(msg) => { setAdding(false); setNotice(msg); setReloads((n) => n + 1); }} />
      )}

      {/* Status tiles (NAV-03): each count equals the rows clicking it shows. */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "8px" }}>
        {/* Completeness (PLC-06): Final ÷ all five, under the same filters as the tiles. */}
        <div title="Final ÷ (Missing + Expected + Incomplete + Under Revision + Final), for the current filters"
          style={{ padding: "10px 12px", borderRadius: "10px", background: C.primaryLight, border: `0.5px solid ${C.border}` }}>
          <div style={{ fontSize: "20px", fontWeight: 700, color: C.primary }}>{result ? pct(result.completeness) : "–"}</div>
          <div style={{ fontSize: "11px", color: C.textSec, fontWeight: 500 }}>Completeness</div>
        </div>
        {TILES.map((t) => {
          const on = status === t.key;
          return (
            <button key={t.key} title={t.hint} onClick={() => setStatus(on ? null : t.key)}
              style={{ textAlign: "left", padding: "10px 12px", borderRadius: "10px", cursor: "pointer", background: on ? t.bg : C.bg,
                border: `${on ? 1.5 : 0.5}px solid ${on ? t.color : C.border}` }}>
              <div style={{ fontSize: "20px", fontWeight: 700, color: t.color }}>{result?.counts[t.key] ?? "–"}</div>
              <div style={{ fontSize: "11px", color: C.textSec, fontWeight: 500 }}>{t.key}</div>
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", flexWrap: "wrap" }}>
        {/* Trees (NAV-01) */}
        <aside style={{ flex: "0 0 250px", maxWidth: "100%", background: C.bg, border: `0.5px solid ${C.border}`, borderRadius: "12px", overflow: "hidden" }}>
          <div style={{ display: "flex", borderBottom: `0.5px solid ${C.border}` }}>
            {(["taxonomy", "my_trial"] as const).map((t) => (
              <button key={t} onClick={() => setTreeTab(t)} style={{ flex: 1, fontSize: "11px", fontWeight: 600, padding: "8px", border: "none", cursor: "pointer",
                background: treeTab === t ? C.bg : C.bgSec, color: treeTab === t ? C.primary : C.textTert, borderBottom: treeTab === t ? `2px solid ${C.primary}` : "2px solid transparent" }}>
                {t === "taxonomy" ? "TMF Structure" : "My Trial"}
              </button>
            ))}
          </div>
          <div style={{ padding: "6px", maxHeight: "560px", overflowY: "auto" }}>
            {!tree ? <div style={{ fontSize: "11px", color: C.textTert, padding: "8px" }}>Loading…</div>
              : treeTab === "my_trial" ? (
                tree.my_trial.children.length
                  ? renderNode(tree.my_trial, 0)
                  : <div style={{ fontSize: "11px", color: C.textTert, padding: "8px" }}>No countries or sites yet. Add them under Study structure.</div>
              ) : (
                <>
                  <div style={{ fontSize: "10px", color: C.textTert, padding: "2px 6px 6px" }}>{tree.taxonomy.label}</div>
                  {tree.taxonomy.nodes.length ? tree.taxonomy.nodes.map((n) => renderNode(n, 0))
                    : <div style={{ fontSize: "11px", color: C.textTert, padding: "8px" }}>No artifacts are enabled for this study.</div>}
                </>
              )}
          </div>
        </aside>

        <section style={{ flex: "1 1 520px", minWidth: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ display: "flex", border: `0.5px solid ${C.border}`, borderRadius: "6px", overflow: "hidden", alignSelf: "flex-start" }}>
            {([["grid", "Documents"], ["expected", "Expected artifacts"]] as const).map(([k, l]) => (
              <button key={k} onClick={() => setView(k)} style={{ fontSize: "11px", padding: "6px 12px", border: "none", cursor: "pointer",
                background: view === k ? C.primaryLight : C.bg, color: view === k ? C.primary : C.textSec, fontWeight: view === k ? 600 : 400 }}>{l}</button>
            ))}
          </div>
          {view === "expected" ? (
            <ExpectedArtifacts key={reloads} studyId={study.id} onDrill={(field, value, label) => {
              setChips((cs) => [...cs.filter((c) => !["zone", "section", "artifact"].includes(c.field)), { field, value, label }]);
              setView("grid");
            }} />
          ) : (<>
          {/* Toolbar (NAV-04/06/07/08) */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search titles…" aria-label="Search titles" style={{ ...field, width: "200px" }} />
            <select value={level} onChange={(e) => setLevel(e.target.value)} aria-label="TMF level" style={field}>
              <option value="">All levels</option>
              <option>Study</option><option>Country</option><option>Site</option>
            </select>
            <div style={{ display: "flex", border: `0.5px solid ${C.border}`, borderRadius: "6px", overflow: "hidden" }}>
              {[false, true].map((h) => (
                <button key={String(h)} onClick={() => setHistorical(h)} style={{ fontSize: "11px", padding: "6px 10px", border: "none", cursor: "pointer",
                  background: historical === h ? C.primaryLight : C.bg, color: historical === h ? C.primary : C.textSec, fontWeight: historical === h ? 600 : 400 }}>
                  {h ? "Historical" : "Current"}
                </button>
              ))}
            </div>
            <button onClick={() => setDraftRules(draftRules ? null : rules.length ? rules : [{ column: "title", op: "contains", value: "" }])} style={btn(rules.length ? C.primaryLight : C.bg, rules.length ? C.primary : C.textSec)}>
              <i className="ti ti-filter" /> Filters{rules.length ? ` (${rules.length})` : ""}
            </button>
            <div style={{ position: "relative" }}>
              <button onClick={() => setShowColumns((s) => !s)} style={btn(C.bg, C.textSec)}><i className="ti ti-columns" /> Columns</button>
              {showColumns && (
                <div style={{ position: "absolute", right: 0, top: "110%", zIndex: 20, background: C.bg, border: `0.5px solid ${C.border}`, borderRadius: "8px", padding: "8px", boxShadow: "0 6px 20px rgba(0,0,0,.08)", width: "180px" }}>
                  {COLUMNS.map((c) => (
                    <label key={c.key} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: C.textSec, padding: "3px 0", cursor: "pointer" }}>
                      <input type="checkbox" checked={columns.includes(c.key)} disabled={c.key === "title"}
                        onChange={(e) => setColumns((cs) => e.target.checked ? COLUMNS.filter((x) => cs.includes(x.key) || x.key === c.key).map((x) => x.key) : cs.filter((k) => k !== c.key))} />
                      {c.label}
                    </label>
                  ))}
                  <button onClick={() => setColumns(COLUMNS.filter((c) => c.on).map((c) => c.key))} style={{ ...btn(C.bgSec, C.textSec), width: "100%", marginTop: "6px" }}>Reset</button>
                </div>
              )}
            </div>
            <button onClick={exportCsv} disabled={!!busy || !result?.total} style={{ ...btn(C.bg, C.textSec), marginLeft: "auto", opacity: result?.total ? 1 : 0.5 }}>
              <i className="ti ti-download" /> Export {selected.size ? `${selected.size} selected` : "all"}
            </button>
          </div>

          {/* Filter builder (NAV-06) */}
          {draftRules && (
            <div style={{ background: C.bgSec, border: `0.5px solid ${C.border}`, borderRadius: "10px", padding: "10px", display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ fontSize: "11px", fontWeight: 600, color: C.textSec }}>Show rows where all of these match</div>
              {draftRules.map((r, i) => {
                const isDate = r.column === "modified" || r.column === "due";
                const ops = OPS.filter((o) => (isDate ? o.date : o.text));
                const op = OPS.find((o) => o.op === r.op);
                const set = (patch: Partial<Rule>) => setDraftRules((rs) => rs!.map((x, j) => (j === i ? { ...x, ...patch } : x)));
                return (
                  <div key={i} style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                    <select value={r.column} aria-label="Column" style={field} onChange={(e) => {
                      const date = e.target.value === "modified" || e.target.value === "due";
                      set({ column: e.target.value, op: (OPS.find((o) => o.op === r.op && (date ? o.date : o.text)) ?? OPS.find((o) => (date ? o.date : o.text))!).op, value: "" });
                    }}>
                      {COLUMNS.map((c) => <option key={c.api} value={c.api}>{c.label}</option>)}
                    </select>
                    <select value={r.op} aria-label="Condition" onChange={(e) => set({ op: e.target.value })} style={field}>
                      {ops.map((o) => <option key={o.op} value={o.op}>{o.label}</option>)}
                    </select>
                    {op?.needsValue && <input type={isDate ? "date" : "text"} value={r.value} aria-label="Value" onChange={(e) => set({ value: e.target.value })} style={{ ...field, width: "180px" }} />}
                    <button aria-label="Remove rule" onClick={() => setDraftRules((rs) => rs!.filter((_, j) => j !== i))} style={{ ...btn(C.bg, C.textTert), padding: "5px 8px" }}><i className="ti ti-x" /></button>
                  </div>
                );
              })}
              {(() => {
                const incomplete = draftRules.some((r) => OPS.find((o) => o.op === r.op)?.needsValue && !r.value.trim());
                return (
                  <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                    <button onClick={() => setDraftRules((rs) => [...rs!, { column: "title", op: "contains", value: "" }])} disabled={draftRules.length >= 20} style={btn(C.bg, C.textSec)}>+ Add rule</button>
                    {incomplete && <span style={{ fontSize: "10px", color: C.danger }}>Fill in a value for every rule, or remove it.</span>}
                    <span style={{ flex: 1 }} />
                    <button onClick={() => { setRules([]); setDraftRules(null); }} style={btn(C.bg, C.textSec)}>Clear</button>
                    <button disabled={incomplete} onClick={() => { setRules(draftRules); setDraftRules(null); }} style={{ ...btn(C.primary, "#fff"), opacity: incomplete ? 0.5 : 1 }}>Apply</button>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Chips (NAV-02) */}
          {(chips.length > 0 || status || level || historical || q || rules.length > 0) && (
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
              {chips.map((c) => (
                <span key={c.field} style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", padding: "3px 4px 3px 10px", borderRadius: "20px", background: C.primaryLight, color: C.primary, fontWeight: 500 }}>
                  {c.label}
                  <button aria-label={`Remove ${c.label}`} onClick={() => setChips((cs) => cs.filter((x) => x.field !== c.field))} style={{ border: "none", background: "transparent", color: C.primary, cursor: "pointer", padding: "0 4px" }}><i className="ti ti-x" style={{ fontSize: "11px" }} /></button>
                </span>
              ))}
              <button onClick={() => { setChips([]); setStatus(null); setLevel(""); setHistorical(false); setSearch(""); setRules([]); setDraftRules(null); }}
                style={{ fontSize: "11px", border: "none", background: "transparent", color: C.textTert, cursor: "pointer", textDecoration: "underline" }}>Clear all</button>
            </div>
          )}

          {shownError && <div style={{ fontSize: "12px", padding: "8px 10px", borderRadius: "8px", background: C.dangerBg, color: C.danger }}>{shownError}</div>}
          {busy && <div style={{ fontSize: "12px", color: C.textSec }}>{busy}</div>}

          {/* Grid (NAV-05) */}
          <div style={{ background: C.bg, border: `0.5px solid ${C.border}`, borderRadius: "12px", overflowX: "auto", opacity: loading ? 0.6 : 1 }}>
            <table style={{ width: "100%", fontSize: "12px", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `0.5px solid ${C.border}`, background: C.bgSec }}>
                  <th style={{ padding: "8px 10px", width: "28px" }}>
                    <input type="checkbox" aria-label="Select all on this page" checked={allSelected}
                      onChange={(e) => setSelected((s) => { const x = new Set(s); rows.forEach((r) => (e.target.checked ? x.add(r.row_id) : x.delete(r.row_id))); return x; })} />
                  </th>
                  {visible.map((c) => {
                    const on = sort?.column === c.api;
                    return (
                      <th key={c.key} style={{ textAlign: "left", padding: "8px 10px", fontSize: "11px", fontWeight: 600, color: C.textSec, whiteSpace: "nowrap" }}>
                        <button onClick={() => setSort(on && sort!.dir === "desc" ? null : { column: c.api, dir: on ? "desc" : "asc" })}
                          style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: "11px", fontWeight: 600, color: on ? C.primary : C.textSec, padding: 0 }}>
                          {c.label} {on && <i className={`ti ti-arrow-${sort!.dir === "asc" ? "up" : "down"}`} style={{ fontSize: "11px" }} />}
                        </button>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={visible.length + 1} style={{ textAlign: "center", padding: "2rem", color: C.textTert }}>{loading ? "Loading…" : "Nothing matches these filters."}</td></tr>
                ) : rows.map((r) => (
                  <tr key={r.row_id} onClick={() => openDetail(r)} style={{ borderBottom: `0.5px solid ${C.bgTert}`, cursor: "pointer", background: detail?.row.row_id === r.row_id ? C.primaryLight : selected.has(r.row_id) ? C.bgSec : "transparent" }}>
                    <td style={{ padding: "7px 10px" }} onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" aria-label={`Select ${r.title ?? r.artifact_num}`} checked={selected.has(r.row_id)}
                        onChange={(e) => setSelected((s) => { const x = new Set(s); if (e.target.checked) x.add(r.row_id); else x.delete(r.row_id); return x; })} />
                    </td>
                    {visible.map((c) => (
                      <td key={c.key} style={{ padding: "7px 10px", fontSize: "11px", color: C.textSec, maxWidth: c.key === "title" || c.key === "document_type" ? "240px" : undefined, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {cell(r, c.key)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {result && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", color: C.textTert }}>
              <span>{result.total === 0 ? "0 rows" : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, result.total)} of ${result.total}`}</span>
              <span style={{ flex: 1 }} />
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} style={{ ...btn(C.bg, C.textSec), opacity: page <= 1 ? 0.4 : 1 }}>Previous</button>
              <span>Page {page} of {pages}</span>
              <button disabled={page >= pages} onClick={() => setPage(page + 1)} style={{ ...btn(C.bg, C.textSec), opacity: page >= pages ? 0.4 : 1 }}>Next</button>
            </div>
          )}
          </>)}
        </section>

        {/* Metadata panel (NAV-08 View Metadata) */}
        {detail && (
          <aside style={{ flex: "0 0 300px", maxWidth: "100%", background: C.bg, border: `0.5px solid ${C.border}`, borderRadius: "12px", padding: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "13px", fontWeight: 700, color: C.text, wordBreak: "break-word" }}>{detail.row.title}</div>
                <div style={{ fontSize: "10px", fontFamily: "monospace", color: C.textTert }}>{detail.row.artifact_num} · {detail.row.document_type}</div>
              </div>
              <button aria-label="Close" onClick={() => setDetail(null)} style={{ border: "none", background: "transparent", cursor: "pointer", color: C.textTert }}><i className="ti ti-x" /></button>
            </div>
            <div>{statusPill(detail.row.nav_status)}</div>

            {detail.row.kind === "placeholder" && detail.row.placeholder_id ? (
              <PlaceholderPanel key={detail.row.placeholder_id} id={detail.row.placeholder_id} canEdit={canEditStudy}
                onAddToIntake={onAddToIntake} onChanged={() => setReloads((n) => n + 1)} />
            ) : detail.row.kind === "missing" ? (
              <>
                <div style={{ fontSize: "11px", color: C.textSec, background: C.bgSec, borderRadius: "8px", padding: "8px 10px" }}>
                  No document has been filed for this artifact yet. Add the file through Document Intake; once it is filed it appears here as Under Revision.
                </div>
                <button onClick={onAddToIntake} style={btn(C.primary, "#fff")}>Go to Document Intake</button>
              </>
            ) : !detail.doc ? (
              <div style={{ fontSize: "11px", color: C.textTert }}>Loading…</div>
            ) : (
              <>
                <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 10px", fontSize: "11px", margin: 0 }}>
                  {([
                    ["Activity", detail.row.current_activity], ["Status", detail.doc.status], ["Version", detail.doc.version],
                    ["TMF level", [detail.doc.tmf_level, detail.doc.country_code, detail.doc.site_number && `${detail.doc.site_number} ${detail.doc.site_name ?? ""}`].filter(Boolean).join(" · ")],
                    ["Owner", detail.doc.owner], ["Effective", detail.doc.effective_date], ["Expiry", detail.doc.expiry_date],
                    ["File", detail.doc.file_name], ["Filed", fmtDate(detail.doc.created_at as string)], ["Last modified", fmtDate(detail.doc.updated_at as string)],
                    ["Approved by", detail.doc.approved_by], ["Returned", detail.doc.rejection_reason],
                  ] as [string, unknown][]).filter(([, v]) => v != null && v !== "").map(([k, v]) => (
                    <div key={k} style={{ display: "contents" }}>
                      <dt style={{ color: C.textTert }}>{k}</dt>
                      <dd style={{ margin: 0, color: C.text, wordBreak: "break-word" }}>{String(v)}</dd>
                    </div>
                  ))}
                </dl>
                {detail.doc.file_versions.length > 0 && (
                  <div>
                    <div style={{ fontSize: "11px", fontWeight: 600, color: C.textSec, marginBottom: "4px" }}>File history</div>
                    {detail.doc.file_versions.map((v) => (
                      <div key={v.version_no} style={{ fontSize: "10px", color: C.textSec, padding: "4px 0", borderTop: `0.5px solid ${C.bgTert}` }}>
                        v{v.version_no} · {v.file_name} · {v.verification_status}
                        <div style={{ fontFamily: "monospace", color: C.textTert }} title={v.file_hash}>{v.file_hash.slice(0, 16)}…</div>
                      </div>
                    ))}
                  </div>
                )}
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 600, color: C.textSec, marginBottom: "6px" }}>QC history</div>
                  {detail.steps ? <History steps={detail.steps} /> : <div style={{ fontSize: "10px", color: C.textTert }}>Loading…</div>}
                </div>
                {detail.doc.status === "Draft" && detail.doc.has_file && canSubmit && (
                  submitNote === null ? (
                    <button onClick={() => setSubmitNote("")} style={btn(C.primaryLight, C.primary)}><i className="ti ti-send" /> Submit for QC</button>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                      <label style={{ fontSize: "11px", color: C.textSec }}>Note for the reviewer (optional)
                        <input value={submitNote} onChange={(e) => setSubmitNote(e.target.value)} style={{ ...field, width: "100%", marginTop: "3px" }} />
                      </label>
                      <div style={{ fontSize: "10px", color: C.textTert }}>What happens next: the document becomes Under Review and a QC task is assigned from the File Plan.</div>
                      <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                        <button onClick={() => setSubmitNote(null)} style={btn(C.bgSec, C.textSec)}>Cancel</button>
                        <button disabled={!!busy} onClick={() => submitForQc(detail.row, submitNote)} style={btn(C.primary, "#fff")}>Submit for QC</button>
                      </div>
                    </div>
                  )
                )}
                {detail.doc.status === "Under Review" && (
                  <button onClick={() => onOpenQc(detail.doc!.id)} style={btn(C.primaryLight, C.primary)}><i className="ti ti-checklist" /> Open QC task</button>
                )}
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {detail.doc.has_file && <button onClick={() => onView(detail.doc!.id)} style={btn(C.primary, "#fff")}><i className="ti ti-eye" /> View</button>}
                  {detail.doc.has_file && canDownload && <button disabled={!!busy} onClick={() => download(detail.doc!.id)} style={btn(C.bg, C.textSec)}><i className="ti ti-download" /> Download</button>}
                  {canDelete && deleting === null && <button onClick={() => setDeleting("")} style={btn(C.dangerBg, C.danger)}><i className="ti ti-trash" /> Delete</button>}
                </div>
                {!detail.doc.has_file && <div style={{ fontSize: "11px", color: C.textTert }}>This record has no file attached.</div>}
                {deleting !== null && (
                  <div>
                    <label style={{ fontSize: "11px", color: C.textSec }}>Reason for deleting (required)
                      <input autoFocus value={deleting} onChange={(e) => setDeleting(e.target.value)} style={{ ...field, width: "100%" }} />
                    </label>
                    <div style={{ fontSize: "11px", color: C.textTert, marginTop: "4px" }}>
                      What happens next: the document moves to the Recycle Bin with your reason in the audit trail. It can be restored from there.
                    </div>
                    <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end", marginTop: "6px" }}>
                      <button onClick={() => setDeleting(null)} style={btn(C.bgSec, C.textSec)}>Cancel</button>
                      <button disabled={deleting.trim().length < 3 || !!busy} onClick={() => remove(detail.doc!.id, deleting)} style={{ ...btn("#991B1B", "#fff"), opacity: deleting.trim().length >= 3 ? 1 : 0.5 }}>Confirm delete</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
