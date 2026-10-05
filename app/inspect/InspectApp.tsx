"use client";
// Inspection Mode portal (Part 11a, M19 INS-01..09). Inspectors have no TMF360 account: they open the
// secret link from the study team (token in the URL fragment) and enter the separate access code.
// Everything here is read-only: taxonomy navigation, search, the viewer, version history and audit
// trail when the session includes them, and the request queue. No AI, no tasks, no uploads, no edits.
import { useCallback, useEffect, useMemo, useState } from "react";
import DocumentViewer, { type Meta, type ViewerSource } from "../platform/DocumentViewer";

const C = { primary: "#F97316", primaryLight: "#FFF7ED", text: "#111827", textSec: "#374151", textTert: "#6B7280", border: "#E5E7EB", bg: "#FFFFFF", bgSec: "#F9FAFB", danger: "#991B1B", dangerBg: "#FEF2F2", ok: "#065F46", okBg: "#ECFDF5", dark: "#1F2937" };
const btn: React.CSSProperties = { fontSize: "12px", padding: "7px 12px", borderRadius: "7px", border: `0.5px solid ${C.border}`, background: C.bg, color: C.textSec, cursor: "pointer" };
const primaryBtn: React.CSSProperties = { ...btn, background: C.primary, color: "#fff", border: "none", fontWeight: 600 };
const input: React.CSSProperties = { fontSize: "13px", padding: "8px 10px", border: `0.5px solid ${C.border}`, borderRadius: "7px", width: "100%", boxSizing: "border-box" };
const STORE = "tmf360_inspection";

type Session = { id: string; inspector_name: string; inspector_org: string; purpose: string; starts_at: string; ends_at: string; include_versions: boolean; include_audit: boolean; download_mode: "view_only" | "watermark" | "original"; scope_statuses: string[] };
type Study = { code: string; protocol: string | null; sponsor: string | null };
type Doc = { id: string; artifact_num: string | null; artifact_name: string | null; title: string; zone_num: string | null; zone_name: string | null; section_num: string | null; section_name: string | null; status: string; version: string | null; effective_date: string | null; country_code: string | null; site_number: string | null; site_name: string | null; file_type: string | null; file_name: string | null; has_file: boolean; extra: boolean };
type Version = { version_no: number; file_name: string | null; file_hash: string | null; created_at: string; verification_status: string; signatures: { kind: string; meaning: string; signer_name: string; signed_at: string }[] };
type AuditRow = { created_at: string; user_email: string | null; action: string; field_changed: string | null; old_value: string | null; new_value: string | null; signature_reason: string | null };
type Req = { id: string; kind: string; subject: string; detail: string | null; status: string; response: string | null; response_document_id: string | null; created_at: string; responded_at: string | null };

class InspectError extends Error { constructor(public status: number, message: string) { super(message); } }

type Creds = { token: string; code: string };

/** Calls the inspector API with the session secrets. Pure: callers handle errors (401 = signed out). */
async function inspectFetch<T>(c: Creds, path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("x-inspection-token", c.token);
  headers.set("x-inspection-code", c.code);
  if (init.body) headers.set("Content-Type", "application/json");
  const res = await fetch(`/api/v1/inspect${path}`, { ...init, headers });
  const body = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new InspectError(res.status, body?.error?.message ?? res.statusText);
  return body as T;
}

/** Reads the link token from the URL fragment or from this tab's storage. */
function initialCreds(): { token: string; saved: Creds | null } {
  let token = "";
  let saved: Creds | null = null;
  // Must be idempotent (React may run initialisers twice): the token is moved into this tab's
  // storage before it is taken out of the address bar.
  let stored: Creds | null = null;
  try { stored = JSON.parse(sessionStorage.getItem(STORE) || "null") as Creds | null; } catch { /* storage unavailable */ }
  const m = /[#&]t=([A-Za-z0-9_-]{20,200})/.exec(window.location.hash);
  if (m) {
    token = m[1];
    if (stored?.token !== token) {
      stored = null;
      try { sessionStorage.setItem(STORE, JSON.stringify({ token, code: "" })); } catch { /* storage unavailable */ }
    }
  } else if (stored?.token) {
    token = stored.token;
  }
  if (stored?.token === token && stored.code) saved = stored;
  return { token, saved };
}

const fmt = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
const statusLabel = (s: string) => (s === "Approved" ? "Final" : s);
const MODE: Record<Session["download_mode"], string> = { view_only: "View only", watermark: "Download with watermark", original: "Download allowed" };

export default function InspectApp() {
  const [init] = useState(initialCreds);
  // The token is in this tab's storage now; take it out of the address bar (and history).
  useEffect(() => {
    if (/[#&]t=/.test(window.location.hash)) history.replaceState(history.state, "", window.location.pathname);
  }, []);
  const [creds, setCreds] = useState<Creds | null>(null);
  const token = init.token;
  const [code, setCode] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [study, setStudy] = useState<Study | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const signedOut = useCallback((message: string) => {
    try { sessionStorage.removeItem(STORE); } catch { /* ignore */ }
    setCreds(null); setSession(null); setError(message);
  }, []);

  // Every portal call: on 401 (expired, ended, locked) the inspector is returned to the code screen.
  const call = useCallback(async <T,>(path: string, req: RequestInit = {}): Promise<T> => {
    if (!creds) throw new InspectError(401, "Enter your access code");
    try {
      return await inspectFetch<T>(creds, path, req);
    } catch (e) {
      if (e instanceof InspectError && e.status === 401) signedOut(e.message);
      throw e;
    }
  }, [creds, signedOut]);

  // Reloading the tab keeps the inspector signed in (the code is kept for this tab only).
  useEffect(() => {
    if (!init.saved) return;
    const saved = init.saved;
    inspectFetch<{ session: Session; study: Study }>(saved, "/session", { method: "POST" })
      .then((r) => { setCreds(saved); setSession(r.session); setStudy(r.study); })
      .catch((e) => signedOut((e as Error).message));
  }, [init.saved, signedOut]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    const c = { token, code: code.trim() };
    try {
      const r = await inspectFetch<{ session: Session; study: Study }>(c, "/session", { method: "POST" });
      try { sessionStorage.setItem(STORE, JSON.stringify(c)); } catch { /* ignore */ }
      setCreds(c); setSession(r.session); setStudy(r.study);
    } catch (err) { setError((err as Error).message); }
    setBusy(false);
  }

  function signOut() {
    try { sessionStorage.removeItem(STORE); } catch { /* ignore */ }
    setCreds(null); setSession(null); setCode("");
  }

  if (!session || !creds) {
    return (
      <div style={{ minHeight: "100vh", background: C.bgSec, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif" }}>
        <form onSubmit={signIn} style={{ width: "100%", maxWidth: "400px", background: C.bg, border: `0.5px solid ${C.border}`, borderRadius: "14px", padding: "28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            <i className="ti ti-shield-check" style={{ fontSize: "22px", color: C.primary }} />
            <h1 style={{ fontSize: "18px", fontWeight: 700, color: C.text, margin: 0 }}>TMF360 Inspection Mode</h1>
          </div>
          <p style={{ fontSize: "12px", color: C.textTert, margin: "0 0 18px" }}>Read-only access to the trial master file for an agreed scope and time.</p>
          {!token ? (
            <div style={{ fontSize: "13px", color: C.textSec, background: C.bgSec, borderRadius: "8px", padding: "12px" }}>
              Open the inspection link you received from the study team. The link and the access code are sent separately.
            </div>
          ) : (
            <>
              <label htmlFor="code" style={{ fontSize: "12px", fontWeight: 600, color: C.textSec }}>Access code</label>
              <input id="code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="XXXX-XXXX" autoComplete="off" autoFocus
                style={{ ...input, marginTop: "6px", letterSpacing: "2px", fontFamily: "monospace", fontSize: "16px" }} />
              <p style={{ fontSize: "11px", color: C.textTert, margin: "8px 0 14px" }}>What happens next: your sign-in, and everything you search, view, download or request, is recorded in the inspection log.</p>
              <button type="submit" disabled={busy || code.replace(/[\s-]/g, "").length < 8} style={{ ...primaryBtn, width: "100%", padding: "10px", opacity: busy || code.replace(/[\s-]/g, "").length < 8 ? 0.6 : 1 }}>
                {busy ? "Checking…" : "Open inspection"}
              </button>
            </>
          )}
          {error && <div role="alert" style={{ marginTop: "12px", fontSize: "12px", color: C.danger, background: C.dangerBg, borderRadius: "7px", padding: "8px 10px" }}>{error}</div>}
        </form>
      </div>
    );
  }
  return <Portal session={session} study={study} call={call} onSignOut={signOut} />;
}

type Call = <T>(path: string, init?: RequestInit) => Promise<T>;

function Portal({ session, study, call, onSignOut }: { session: Session; study: Study | null; call: Call; onSignOut: () => void }) {
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Doc[] | null>(null);
  const [node, setNode] = useState<{ zone?: string; section?: string }>({});
  const [openZones, setOpenZones] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<Doc | null>(null);
  const [showRequests, setShowRequests] = useState(false);
  const [requestFor, setRequestFor] = useState<Doc | null>(null);

  useEffect(() => {
    call<{ data: Doc[] }>("/documents").then((r) => setDocs(r.data)).catch((e) => setError((e as Error).message));
  }, [call]);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) { setResults(null); return; }
    try {
      const r = await call<{ data: Doc[] }>(`/documents?q=${encodeURIComponent(q)}`);
      setResults(r.data); setNode({});
    } catch (err) { setError((err as Error).message); }
  }

  const tree = useMemo(() => {
    const zones = new Map<string, { name: string; count: number; sections: Map<string, { name: string; count: number }> }>();
    for (const d of docs ?? []) {
      const z = d.zone_num ?? "—";
      const zone = zones.get(z) ?? { name: d.zone_name ?? "Unclassified", count: 0, sections: new Map() };
      zone.count++;
      const s = d.section_num ?? "—";
      const sec = zone.sections.get(s) ?? { name: d.section_name ?? "", count: 0 };
      sec.count++;
      zone.sections.set(s, sec);
      zones.set(z, zone);
    }
    return [...zones.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [docs]);

  const shown = results ?? (docs ?? []).filter((d) =>
    (!node.zone || (d.zone_num ?? "—") === node.zone) && (!node.section || (d.section_num ?? "—") === node.section));

  const source = useCallback((d: Doc): ViewerSource => ({
    meta: () => call<Meta>(`/documents/${d.id}`),
    access: (purpose) => call<{ url: string }>(`/documents/${d.id}/file`, { method: "POST", body: JSON.stringify({ purpose }) }),
  }), [call]);

  const pageTime = useCallback((docId: string) => (page: number, seconds: number) => {
    call(`/activity`, { method: "POST", body: JSON.stringify({ document_id: docId, page, seconds }) }).catch(() => { /* best effort */ });
  }, [call]);

  const canDownload = session.download_mode !== "view_only";

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: C.bgSec, fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif" }}>
      <header style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", padding: "10px 18px", background: C.dark, color: "#fff" }}>
        <i className="ti ti-shield-check" style={{ fontSize: "20px", color: C.primary }} />
        <div style={{ flex: "1 1 260px", minWidth: 0 }}>
          <div style={{ fontSize: "14px", fontWeight: 700 }}>Inspection Mode · {study?.code}{study?.protocol ? ` · ${study.protocol}` : ""}</div>
          <div style={{ fontSize: "11px", color: "#D1D5DB" }}>{session.inspector_name} ({session.inspector_org}) · Session ends {fmt(session.ends_at)}</div>
        </div>
        <span style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "20px", background: "#374151" }}><i className="ti ti-lock" /> Read-only</span>
        <span style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "20px", background: "#374151" }}>{MODE[session.download_mode]}</span>
        <button onClick={() => setShowRequests(true)} style={{ ...btn, background: "#374151", color: "#fff", border: "none" }}><i className="ti ti-message-question" /> Requests</button>
        <button onClick={onSignOut} style={{ ...btn, background: "transparent", color: "#fff", border: "0.5px solid #6B7280" }}>Sign out</button>
      </header>

      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <aside style={{ width: "280px", flexShrink: 0, borderRight: `0.5px solid ${C.border}`, background: C.bg, overflowY: "auto", padding: "12px" }}>
          <form onSubmit={search} style={{ display: "flex", gap: "6px", marginBottom: "12px" }}>
            <input aria-label="Search documents" value={query} onChange={(e) => { setQuery(e.target.value); if (!e.target.value.trim()) setResults(null); }} placeholder="Search title, artifact, site…" style={{ ...input, fontSize: "12px" }} />
            <button type="submit" aria-label="Search" style={btn}><i className="ti ti-search" /></button>
          </form>
          <button onClick={() => { setNode({}); setResults(null); setQuery(""); }} style={{ ...treeBtn, fontWeight: !node.zone && !results ? 700 : 400 }}>
            All documents <span style={{ color: C.textTert }}>({docs?.length ?? "…"})</span>
          </button>
          {tree.map(([z, zone]) => (
            <div key={z}>
              <button onClick={() => { setResults(null); setNode({ zone: z }); setOpenZones((o) => { const n = new Set(o); if (n.has(z)) n.delete(z); else n.add(z); return n; }); }}
                style={{ ...treeBtn, fontWeight: node.zone === z && !node.section ? 700 : 500 }}>
                <i className={`ti ti-chevron-${openZones.has(z) ? "down" : "right"}`} style={{ fontSize: "12px" }} /> {z} {zone.name} <span style={{ color: C.textTert }}>({zone.count})</span>
              </button>
              {openZones.has(z) && [...zone.sections.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([s, sec]) => (
                <button key={s} onClick={() => { setResults(null); setNode({ zone: z, section: s }); }}
                  style={{ ...treeBtn, paddingLeft: "28px", fontWeight: node.section === s ? 700 : 400 }}>
                  {s} {sec.name} <span style={{ color: C.textTert }}>({sec.count})</span>
                </button>
              ))}
            </div>
          ))}
        </aside>

        <main style={{ flex: 1, overflow: "auto", padding: "16px 20px", minWidth: 0 }}>
          {error && <div role="alert" style={{ fontSize: "12px", color: C.danger, background: C.dangerBg, borderRadius: "7px", padding: "8px 10px", marginBottom: "12px" }}>{error}</div>}
          <div style={{ fontSize: "13px", fontWeight: 600, color: C.text, marginBottom: "10px" }}>
            {results ? `Search results for "${query}" (${results.length})` : node.section ? `Section ${node.section}` : node.zone ? `Zone ${node.zone}` : "All documents in scope"}
          </div>
          {!docs && !error && <div style={{ fontSize: "12px", color: C.textTert }}>Loading documents…</div>}
          {docs && shown.length === 0 && <div style={{ fontSize: "12px", color: C.textTert, background: C.bg, borderRadius: "10px", padding: "24px", textAlign: "center" }}>No documents here. Use Requests to ask the study team for anything you need that is not in scope.</div>}
          {shown.length > 0 && (
            <div style={{ background: C.bg, border: `0.5px solid ${C.border}`, borderRadius: "10px", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                <thead><tr style={{ background: C.bgSec, color: C.textTert, textAlign: "left" }}>
                  {["Document", "Artifact", "Status", "Country / site", "Version", "Effective"].map((h) => <th key={h} style={{ padding: "8px 10px", fontWeight: 600 }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {shown.map((d) => (
                    <tr key={d.id} style={{ borderTop: `0.5px solid ${C.border}` }}>
                      <td style={{ padding: "8px 10px" }}>
                        <button onClick={() => setOpen(d)} style={{ background: "none", border: "none", padding: 0, color: C.text, fontWeight: 600, cursor: "pointer", textAlign: "left", fontSize: "12px" }}>{d.title}</button>
                        {d.extra && <span style={{ marginLeft: "6px", fontSize: "10px", color: C.ok, background: C.okBg, padding: "1px 6px", borderRadius: "8px" }}>Added on request</span>}
                      </td>
                      <td style={{ padding: "8px 10px", color: C.textSec }}><span style={{ fontFamily: "monospace" }}>{d.artifact_num}</span> {d.artifact_name}</td>
                      <td style={{ padding: "8px 10px" }}>{statusLabel(d.status)}</td>
                      <td style={{ padding: "8px 10px", color: C.textSec }}>{d.site_number ? `Site ${d.site_number}${d.country_code ? ` (${d.country_code})` : ""}` : d.country_code ?? "Study"}</td>
                      <td style={{ padding: "8px 10px", color: C.textSec }}>{d.version ?? ""}</td>
                      <td style={{ padding: "8px 10px", color: C.textSec }}>{d.effective_date ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>

      {open && <DocumentPanel doc={open} session={session} call={call} source={source(open)} canDownload={canDownload} onPageTime={pageTime(open.id)}
        onClose={() => setOpen(null)} onRequest={() => { setRequestFor(open); setShowRequests(true); }} />}
      {showRequests && <Requests call={call} about={requestFor} onClose={() => { setShowRequests(false); setRequestFor(null); }} />}
    </div>
  );
}

const treeBtn: React.CSSProperties = { display: "flex", alignItems: "center", gap: "4px", width: "100%", textAlign: "left", background: "none", border: "none", padding: "6px 8px", fontSize: "12px", color: C.textSec, cursor: "pointer", borderRadius: "6px" };

function DocumentPanel({ doc, session, call, source, canDownload, onPageTime, onClose, onRequest }: {
  doc: Doc; session: Session; call: Call; source: ViewerSource; canDownload: boolean; onPageTime: (p: number, s: number) => void; onClose: () => void; onRequest: () => void;
}) {
  const [tab, setTab] = useState<"document" | "versions" | "audit">("document");
  const [versions, setVersions] = useState<Version[] | null>(null);
  const [audit, setAudit] = useState<AuditRow[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (tab === "versions" && !versions) call<{ data: Version[] }>(`/documents/${doc.id}/versions`).then((r) => setVersions(r.data)).catch((e) => setError((e as Error).message));
    if (tab === "audit" && !audit) call<{ data: AuditRow[] }>(`/documents/${doc.id}/audit`).then((r) => setAudit(r.data)).catch((e) => setError((e as Error).message));
  }, [tab, doc.id, call, versions, audit]);

  async function downloadVersion(n: number) {
    setError("");
    try {
      const r = await call<{ url: string }>(`/documents/${doc.id}/file`, { method: "POST", body: JSON.stringify({ purpose: "download", version_no: n }) });
      window.location.assign(r.url);
    } catch (e) { setError((e as Error).message); }
  }

  const tabs: { key: typeof tab; label: string; show: boolean }[] = [
    { key: "document", label: "Document", show: true },
    { key: "versions", label: "Version history", show: session.include_versions },
    { key: "audit", label: "Audit trail", show: session.include_audit },
  ];

  return (
    <div role="dialog" aria-modal="true" aria-label={`Document: ${doc.title}`} style={{ position: "fixed", inset: 0, zIndex: 900, background: "rgba(17,24,39,.6)", display: "flex", padding: "16px" }}>
      <div style={{ flex: 1, background: C.bgSec, borderRadius: "12px", display: "flex", flexDirection: "column", overflow: "hidden", maxWidth: "1400px", margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 12px", background: C.bg, borderBottom: `0.5px solid ${C.border}`, flexWrap: "wrap" }}>
          {tabs.filter((t) => t.show).map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{ ...btn, background: tab === t.key ? C.primaryLight : C.bg, color: tab === t.key ? C.primary : C.textSec, fontWeight: tab === t.key ? 600 : 400 }}>{t.label}</button>
          ))}
          <span style={{ flex: 1 }} />
          <button onClick={onRequest} style={btn}><i className="ti ti-message-question" /> Ask about this document</button>
          <button onClick={onClose} style={{ ...btn, background: C.dark, color: "#fff", border: "none" }}><i className="ti ti-x" /> Close</button>
        </div>
        {error && <div role="alert" style={{ fontSize: "12px", color: C.danger, background: C.dangerBg, padding: "6px 14px" }}>{error}</div>}
        <div style={{ flex: 1, minHeight: 0, overflow: tab === "document" ? "hidden" : "auto", padding: tab === "document" ? 0 : "16px" }}>
          {tab === "document" && <DocumentViewer documentId={doc.id} canDownload={canDownload} inline onClose={onClose} source={source} onPageTime={onPageTime} />}
          {tab === "versions" && (!versions ? <div style={{ fontSize: "12px", color: C.textTert }}>Loading…</div> : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {versions.map((v) => (
                <div key={v.version_no} style={{ background: C.bg, border: `0.5px solid ${C.border}`, borderRadius: "10px", padding: "12px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <strong style={{ fontSize: "13px" }}>File version {v.version_no}</strong>
                    <span style={{ fontSize: "11px", color: C.textTert }}>{v.file_name} · {fmt(v.created_at)} · integrity {v.verification_status}</span>
                    <span style={{ flex: 1 }} />
                    {canDownload && <button onClick={() => downloadVersion(v.version_no)} style={btn}><i className="ti ti-download" /> Download</button>}
                  </div>
                  <div style={{ fontSize: "10px", color: C.textTert, fontFamily: "monospace", marginTop: "4px", wordBreak: "break-all" }}>SHA-256 {v.file_hash}</div>
                  {v.signatures.map((s, i) => (
                    <div key={i} style={{ fontSize: "12px", color: C.textSec, marginTop: "6px" }}><i className="ti ti-signature" /> {s.meaning}: {s.signer_name}, {fmt(s.signed_at)} ({s.kind})</div>
                  ))}
                </div>
              ))}
            </div>
          ))}
          {tab === "audit" && (!audit ? <div style={{ fontSize: "12px", color: C.textTert }}>Loading…</div> : audit.length === 0 ? <div style={{ fontSize: "12px", color: C.textTert }}>No audit entries.</div> : (
            <div style={{ background: C.bg, border: `0.5px solid ${C.border}`, borderRadius: "10px", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                <thead><tr style={{ background: C.bgSec, color: C.textTert, textAlign: "left" }}>
                  {["When", "Who", "Action", "Field", "Old value", "New value", "Reason"].map((h) => <th key={h} style={{ padding: "8px 10px", fontWeight: 600 }}>{h}</th>)}
                </tr></thead>
                <tbody>{audit.map((a, i) => (
                  <tr key={i} style={{ borderTop: `0.5px solid ${C.border}`, verticalAlign: "top" }}>
                    <td style={{ padding: "7px 10px", whiteSpace: "nowrap" }}>{fmt(a.created_at)}</td>
                    <td style={{ padding: "7px 10px" }}>{a.user_email ?? "System"}</td>
                    <td style={{ padding: "7px 10px" }}>{a.action}</td>
                    <td style={{ padding: "7px 10px", color: C.textSec }}>{a.field_changed}</td>
                    <td style={{ padding: "7px 10px", color: C.textSec, maxWidth: "220px", wordBreak: "break-word" }}>{a.old_value}</td>
                    <td style={{ padding: "7px 10px", color: C.textSec, maxWidth: "220px", wordBreak: "break-word" }}>{a.new_value}</td>
                    <td style={{ padding: "7px 10px", color: C.textSec }}>{a.signature_reason}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const KIND_LABEL: Record<string, string> = { document: "Document request", clarification: "Clarification", out_of_scope: "Record outside scope" };

function Requests({ call, about, onClose }: { call: Call; about: Doc | null; onClose: () => void }) {
  const [list, setList] = useState<Req[] | null>(null);
  const [kind, setKind] = useState<"document" | "clarification" | "out_of_scope">(about ? "clarification" : "document");
  const [subject, setSubject] = useState(about ? `About ${about.title}` : "");
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const load = useCallback(() => call<{ data: Req[] }>("/requests").then((r) => setList(r.data)).catch((e) => setError((e as Error).message)), [call]);
  useEffect(() => {
    call<{ data: Req[] }>("/requests").then((r) => setList(r.data)).catch((e) => setError((e as Error).message));
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [call, load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(""); setSent(false);
    try {
      await call("/requests", { method: "POST", body: JSON.stringify({ kind, subject: subject.trim(), detail: detail.trim() || undefined, document_id: about?.id }) });
      setSubject(""); setDetail(""); setSent(true);
      await load();
    } catch (err) { setError((err as Error).message); }
    setBusy(false);
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Requests" style={{ position: "fixed", inset: 0, zIndex: 950, background: "rgba(17,24,39,.5)", display: "flex", justifyContent: "flex-end" }}>
      <div style={{ width: "100%", maxWidth: "460px", background: C.bg, height: "100%", overflowY: "auto", padding: "18px" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: "12px" }}>
          <h2 style={{ fontSize: "15px", fontWeight: 700, margin: 0, flex: 1 }}>Requests to the study team</h2>
          <button onClick={onClose} aria-label="Close requests" style={btn}><i className="ti ti-x" /></button>
        </div>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "8px", background: C.bgSec, borderRadius: "10px", padding: "12px" }}>
          <label style={{ fontSize: "12px", fontWeight: 600, color: C.textSec }}>Type
            <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} style={{ ...input, marginTop: "4px" }}>
              {Object.entries(KIND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label style={{ fontSize: "12px", fontWeight: 600, color: C.textSec }}>Subject
            <input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={300} style={{ ...input, marginTop: "4px" }} />
          </label>
          <label style={{ fontSize: "12px", fontWeight: 600, color: C.textSec }}>Details
            <textarea value={detail} onChange={(e) => setDetail(e.target.value)} rows={4} maxLength={4000} style={{ ...input, marginTop: "4px", resize: "vertical" }} />
          </label>
          {about && <div style={{ fontSize: "11px", color: C.textTert }}>Linked to: {about.title}</div>}
          <div style={{ fontSize: "11px", color: C.textTert }}>What happens next: the study team sees your request straight away; their answer appears below.</div>
          <button type="submit" disabled={busy || subject.trim().length < 3} style={{ ...primaryBtn, opacity: busy || subject.trim().length < 3 ? 0.6 : 1 }}>{busy ? "Sending…" : "Send request"}</button>
          {sent && <div style={{ fontSize: "12px", color: C.ok }}>Request sent.</div>}
          {error && <div role="alert" style={{ fontSize: "12px", color: C.danger }}>{error}</div>}
        </form>
        <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
          {!list && <div style={{ fontSize: "12px", color: C.textTert }}>Loading…</div>}
          {list?.length === 0 && <div style={{ fontSize: "12px", color: C.textTert }}>No requests yet.</div>}
          {list?.map((r) => (
            <div key={r.id} style={{ border: `0.5px solid ${C.border}`, borderRadius: "10px", padding: "10px 12px" }}>
              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <strong style={{ fontSize: "12px", flex: 1 }}>{r.subject}</strong>
                <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "10px", background: r.status === "open" ? "#FEF3C7" : C.okBg, color: r.status === "open" ? "#92400E" : C.ok }}>{r.status}</span>
              </div>
              <div style={{ fontSize: "11px", color: C.textTert }}>{KIND_LABEL[r.kind]} · {fmt(r.created_at)}</div>
              {r.detail && <div style={{ fontSize: "12px", color: C.textSec, marginTop: "4px", whiteSpace: "pre-wrap" }}>{r.detail}</div>}
              {r.response && (
                <div style={{ fontSize: "12px", color: C.text, marginTop: "6px", background: C.bgSec, borderRadius: "7px", padding: "6px 8px", whiteSpace: "pre-wrap" }}>
                  <strong>Study team</strong>{r.responded_at ? ` · ${fmt(r.responded_at)}` : ""}<br />{r.response}
                  {r.response_document_id && <div style={{ fontSize: "11px", color: C.textTert, marginTop: "4px" }}>A document was attached; if it was added to your scope it appears in the document list (reload).</div>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
