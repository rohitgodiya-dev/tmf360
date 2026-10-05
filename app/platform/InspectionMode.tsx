"use client";
// Inspection Mode for the study team (Part 11a, M19). Create time-boxed, scoped inspection sessions
// (INS-01/02/06), hand the inspector a secret link + access code, follow the inspection live (INS-09),
// answer the request queue (INS-07) and export the complete inspection log (INS-08).
import { useCallback, useEffect, useState } from "react";
import { apiFetch, authHeaders } from "../../lib/api/client";

const C = { primary: "#F97316", primaryLight: "#FFF7ED", text: "#111827", textSec: "#374151", textTert: "#6B7280", border: "#E5E7EB", bg: "#FFFFFF", bgSec: "#F9FAFB", danger: "#991B1B", dangerBg: "#FEF2F2", ok: "#065F46", okBg: "#ECFDF5", warn: "#92400E", warnBg: "#FEF3C7" };
const btn: React.CSSProperties = { fontSize: "12px", padding: "6px 12px", borderRadius: "7px", border: `0.5px solid ${C.border}`, background: C.bg, color: C.textSec, cursor: "pointer" };
const primary: React.CSSProperties = { ...btn, background: C.primary, color: "#fff", border: "none", fontWeight: 600 };
const input: React.CSSProperties = { fontSize: "12px", padding: "7px 9px", border: `0.5px solid ${C.border}`, borderRadius: "7px", width: "100%", boxSizing: "border-box" };
const label: React.CSSProperties = { fontSize: "11px", fontWeight: 600, color: C.textSec, display: "flex", flexDirection: "column", gap: "4px" };
const card: React.CSSProperties = { background: C.bg, border: `0.5px solid ${C.border}`, borderRadius: "12px", padding: "14px 16px" };

type SessionRow = {
  id: string; inspector_name: string; inspector_email: string | null; inspector_org: string; purpose: string; starts_at: string; ends_at: string;
  scope_countries: string[]; scope_sites: string[]; scope_nodes: string[]; scope_statuses: string[]; include_versions: boolean; include_audit: boolean;
  download_mode: "view_only" | "watermark" | "original"; revoked_at: string | null; revoke_reason: string | null; locked_at: string | null;
  last_seen_at: string | null; created_at: string; state: string; open_requests: number; created_by_name: string; extra_document_ids: string[];
};
type RequestRow = { id: string; kind: string; subject: string; detail: string | null; status: string; response: string | null; created_at: string; responded_at: string | null; responded_by_name: string | null; document_title: string | null; response_document_title: string | null; scope_extended: boolean };
type Activity = { id: string; kind: string; document_id: string | null; document_title: string | null; detail: Record<string, unknown>; at: string };
type Live = { session: SessionRow; now_viewing: { title: string | null; at: string } | null; requests: RequestRow[]; activity: Activity[] };
type Country = { id: string; country_code: string; sites: { id: string; site_number: string; display_name: string }[] };
type NavDoc = { document_id: string | null; title: string; artifact_num: string; nav_status: string };

const fmt = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
const STATE: Record<string, [string, string]> = { active: [C.ok, C.okBg], scheduled: [C.warn, C.warnBg], expired: [C.textTert, C.bgSec], ended: [C.textTert, C.bgSec], locked: [C.danger, C.dangerBg] };
const MODE = { view_only: "View only", watermark: "Download with watermark", original: "Download original files" } as const;
const ACTIVITY: Record<string, string> = { login: "Signed in", failed_code: "Wrong access code", locked: "Session locked", search: "Searched", view: "Opened", page_view: "Read", download: "Downloaded", print: "Printed", request: "Sent a request", audit_view: "Viewed audit trail of", versions_view: "Viewed version history of" };
const KIND: Record<string, string> = { document: "Document request", clarification: "Clarification", out_of_scope: "Record outside scope" };

function toLocalInput(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function describe(a: Activity) {
  const d = a.detail ?? {};
  switch (a.kind) {
    case "search": return `"${d.query}" (${d.results} results)`;
    case "page_view": return `${a.document_title ?? ""}, page ${d.page} for ${d.seconds} s`;
    case "download": case "print": return `${a.document_title ?? ""}${d.watermarked ? " (watermarked)" : ""}`;
    case "request": return `${d.subject ?? ""}`;
    case "failed_code": case "locked": return `attempt ${d.attempt}`;
    default: return a.document_title ?? "";
  }
}

export default function InspectionMode({ study, canCreate, canRespond }: { study: { id: string; study_id: string }; canCreate: boolean; canRespond: boolean }) {
  const [sessions, setSessions] = useState<SessionRow[] | null>(null);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<{ link: string; access_code: string; name: string } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const load = useCallback(() => {
    apiFetch<{ data: SessionRow[] }>(`/studies/${study.id}/inspections`).then((r) => { setSessions(r.data); setError(""); }).catch((e) => setError((e as Error).message));
  }, [study.id]);
  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: "20px", fontWeight: 700, color: C.text, margin: 0 }}>Inspection Mode · {study.study_id}</h1>
          <p style={{ fontSize: "12px", color: C.textTert, margin: "2px 0 0" }}>Give inspectors and auditors time-limited, read-only access to an agreed scope. Everything they do is logged.</p>
        </div>
        {canCreate && !creating && <button onClick={() => { setCreating(true); setCreated(null); }} style={primary}><i className="ti ti-plus" /> New inspection session</button>}
      </div>
      {error && <div role="alert" style={{ fontSize: "12px", color: C.danger, background: C.dangerBg, borderRadius: "8px", padding: "8px 12px" }}>{error}</div>}

      {created && (
        <div style={{ ...card, borderColor: C.primary, background: C.primaryLight }}>
          <div style={{ fontSize: "13px", fontWeight: 700, color: C.text }}><i className="ti ti-key" /> Session created for {created.name}</div>
          <p style={{ fontSize: "12px", color: C.textSec, margin: "6px 0 10px" }}>
            Copy these now: they are shown only once and are not stored. Send the link and the access code by <strong>different channels</strong> (for example, the link by email and the code by phone).
          </p>
          <Secret label="Inspection link" value={created.link} />
          <Secret label="Access code" value={created.access_code} mono />
          <button onClick={() => setCreated(null)} style={{ ...btn, marginTop: "10px" }}>I have sent both</button>
        </div>
      )}

      {creating && <CreateForm study={study} onCancel={() => setCreating(false)}
        onCreated={(r) => { setCreating(false); setCreated(r); load(); setSelected(null); }} />}

      {selected ? (
        <LiveView sessionId={selected} canCreate={canCreate} canRespond={canRespond} study={study} onBack={() => { setSelected(null); load(); }} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {!sessions && !error && <div style={{ fontSize: "12px", color: C.textTert }}>Loading sessions…</div>}
          {sessions?.length === 0 && <div style={{ ...card, textAlign: "center", color: C.textTert, fontSize: "12px" }}>No inspection sessions yet for this study.</div>}
          {sessions?.map((s) => {
            const [fg, bg] = STATE[s.state] ?? [C.textTert, C.bgSec];
            return (
              <button key={s.id} onClick={() => setSelected(s.id)} style={{ ...card, display: "flex", alignItems: "center", gap: "12px", textAlign: "left", cursor: "pointer", width: "100%" }}>
                <i className="ti ti-user-shield" style={{ fontSize: "22px", color: C.textTert }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: C.text }}>{s.inspector_name} · {s.inspector_org}</div>
                  <div style={{ fontSize: "11px", color: C.textTert }}>{fmt(s.starts_at)} → {fmt(s.ends_at)} · {MODE[s.download_mode]} · {s.purpose.slice(0, 80)}</div>
                </div>
                {s.open_requests > 0 && <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "10px", background: C.warnBg, color: C.warn }}>{s.open_requests} open request{s.open_requests > 1 ? "s" : ""}</span>}
                <span style={{ fontSize: "11px", padding: "2px 10px", borderRadius: "10px", background: bg, color: fg, fontWeight: 600, textTransform: "capitalize" }}>{s.state}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Secret({ label: l, value, mono }: { label: string; value: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px" }}>
      <span style={{ fontSize: "11px", fontWeight: 600, color: C.textSec, width: "100px", flexShrink: 0 }}>{l}</span>
      <code style={{ flex: 1, minWidth: 0, fontSize: mono ? "16px" : "11px", letterSpacing: mono ? "2px" : 0, background: C.bg, border: `0.5px solid ${C.border}`, borderRadius: "6px", padding: "6px 8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</code>
      <button onClick={() => { navigator.clipboard.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }).catch(() => { /* clipboard blocked */ }); }} style={btn}>
        <i className={`ti ti-${copied ? "check" : "copy"}`} /> {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

function CreateForm({ study, onCancel, onCreated }: { study: { id: string }; onCancel: () => void; onCreated: (r: { link: string; access_code: string; name: string }) => void }) {
  const now = new Date();
  const [f, setF] = useState({
    inspector_name: "", inspector_email: "", inspector_org: "", purpose: "",
    starts_at: toLocalInput(now), ends_at: toLocalInput(new Date(now.getTime() + 5 * 86400000)),
    nodes: "", include_versions: true, include_audit: true, download_mode: "view_only" as keyof typeof MODE,
  });
  const [statuses, setStatuses] = useState<string[]>(["Approved"]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [pickedCountries, setPickedCountries] = useState<string[]>([]);
  const [pickedSites, setPickedSites] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<{ countries: Country[] }>(`/studies/${study.id}/structure`).then((r) => setCountries(r.countries ?? [])).catch(() => setCountries([]));
  }, [study.id]);

  const nodes = f.nodes.split(/[\s,;]+/).map((n) => n.trim()).filter(Boolean);
  const badNode = nodes.find((n) => !/^\d\d(\.\d\d){0,2}$/.test(n));
  const valid = f.inspector_name.trim().length >= 2 && f.inspector_org.trim().length >= 2 && f.purpose.trim().length >= 3
    && statuses.length > 0 && !badNode && new Date(f.ends_at) > new Date(f.starts_at) && new Date(f.ends_at) > new Date();

  const toggle = (list: string[], set: (v: string[]) => void, v: string) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const starts = new Date(f.starts_at);
      const r = await apiFetch<{ link: string; access_code: string }>(`/studies/${study.id}/inspections`, {
        method: "POST",
        body: JSON.stringify({
          inspector_name: f.inspector_name.trim(), inspector_email: f.inspector_email.trim(), inspector_org: f.inspector_org.trim(), purpose: f.purpose.trim(),
          starts_at: starts > new Date() ? starts.toISOString() : undefined, ends_at: new Date(f.ends_at).toISOString(),
          scope_countries: pickedCountries, scope_sites: pickedSites, scope_nodes: nodes, scope_statuses: statuses,
          include_versions: f.include_versions, include_audit: f.include_audit, download_mode: f.download_mode,
        }),
      });
      onCreated({ ...r, name: f.inspector_name.trim() });
    } catch (err) { setError((err as Error).message); }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} style={{ ...card, display: "flex", flexDirection: "column", gap: "12px" }}>
      <div style={{ fontSize: "14px", fontWeight: 700 }}>New inspection session</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px" }}>
        <label style={label}>Inspector name *<input value={f.inspector_name} onChange={(e) => setF({ ...f, inspector_name: e.target.value })} style={input} /></label>
        <label style={label}>Organisation (authority, auditor) *<input value={f.inspector_org} onChange={(e) => setF({ ...f, inspector_org: e.target.value })} style={input} /></label>
        <label style={label}>Inspector email<input type="email" value={f.inspector_email} onChange={(e) => setF({ ...f, inspector_email: e.target.value })} style={input} /></label>
        <label style={label}>Starts<input type="datetime-local" value={f.starts_at} onChange={(e) => setF({ ...f, starts_at: e.target.value })} style={input} /></label>
        <label style={label}>Access ends (max 90 days) *<input type="datetime-local" value={f.ends_at} onChange={(e) => setF({ ...f, ends_at: e.target.value })} style={input} /></label>
      </div>
      <label style={label}>Purpose *<textarea value={f.purpose} onChange={(e) => setF({ ...f, purpose: e.target.value })} rows={2} style={{ ...input, resize: "vertical" }} /></label>

      <div style={{ fontSize: "12px", fontWeight: 700, color: C.text, marginTop: "4px" }}>Scope</div>
      <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", fontSize: "12px", color: C.textSec }}>
        <span style={{ fontWeight: 600 }}>Record statuses:</span>
        {[["Approved", "Final"], ["Under Review", "Under review"], ["Draft", "Draft"]].map(([v, l]) => (
          <label key={v} style={{ display: "flex", gap: "4px", alignItems: "center" }}><input type="checkbox" checked={statuses.includes(v)} onChange={() => toggle(statuses, setStatuses, v)} /> {l}</label>
        ))}
      </div>
      <label style={label}>Taxonomy nodes (optional, comma-separated: zone 01, section 01.01 or artifact 01.01.01; empty = all)
        <input value={f.nodes} onChange={(e) => setF({ ...f, nodes: e.target.value })} placeholder="e.g. 01, 05.02" style={input} />
        {badNode && <span style={{ color: C.danger, fontWeight: 400 }}>&quot;{badNode}&quot; is not a zone, section or artifact number.</span>}
      </label>
      {countries.length > 0 && (
        <div style={{ fontSize: "12px", color: C.textSec }}>
          <div style={{ fontWeight: 600, marginBottom: "4px" }}>Countries and sites (none ticked = whole study)</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxHeight: "160px", overflowY: "auto", background: C.bgSec, borderRadius: "8px", padding: "8px" }}>
            {countries.map((c) => (
              <div key={c.id}>
                <label style={{ display: "flex", gap: "4px", alignItems: "center", fontWeight: 600 }}><input type="checkbox" checked={pickedCountries.includes(c.id)} onChange={() => toggle(pickedCountries, setPickedCountries, c.id)} /> {c.country_code}</label>
                {c.sites.map((s) => (
                  <label key={s.id} style={{ display: "flex", gap: "4px", alignItems: "center", paddingLeft: "20px" }}><input type="checkbox" checked={pickedSites.includes(s.id)} onChange={() => toggle(pickedSites, setPickedSites, s.id)} /> Site {s.site_number} {s.display_name}</label>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", fontSize: "12px", color: C.textSec }}>
        <label style={{ display: "flex", gap: "4px", alignItems: "center" }}><input type="checkbox" checked={f.include_versions} onChange={(e) => setF({ ...f, include_versions: e.target.checked })} /> Include version history</label>
        <label style={{ display: "flex", gap: "4px", alignItems: "center" }}><input type="checkbox" checked={f.include_audit} onChange={(e) => setF({ ...f, include_audit: e.target.checked })} /> Include audit trail</label>
      </div>
      <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", fontSize: "12px", color: C.textSec }}>
        <span style={{ fontWeight: 600 }}>Downloads and printing:</span>
        {(Object.keys(MODE) as (keyof typeof MODE)[]).map((m) => (
          <label key={m} style={{ display: "flex", gap: "4px", alignItems: "center" }}><input type="radio" name="mode" checked={f.download_mode === m} onChange={() => setF({ ...f, download_mode: m })} /> {MODE[m]}</label>
        ))}
      </div>
      <div style={{ fontSize: "11px", color: C.textTert }}>AI features are always off in Inspection Mode.</div>
      <div style={{ fontSize: "12px", color: C.textSec, background: C.bgSec, borderRadius: "8px", padding: "8px 10px" }}>
        What happens next: a secret link and an access code are shown once. The inspector can see only the scope above, read-only, until the end time. Creating the session is recorded in the audit trail.
      </div>
      {error && <div role="alert" style={{ fontSize: "12px", color: C.danger }}>{error}</div>}
      <div style={{ display: "flex", gap: "8px" }}>
        <button type="submit" disabled={!valid || busy} style={{ ...primary, opacity: !valid || busy ? 0.6 : 1 }}>{busy ? "Creating…" : "Create session"}</button>
        <button type="button" onClick={onCancel} style={btn}>Cancel</button>
      </div>
    </form>
  );
}

function LiveView({ sessionId, study, canCreate, canRespond, onBack }: { sessionId: string; study: { id: string; study_id: string }; canCreate: boolean; canRespond: boolean; onBack: () => void }) {
  const [live, setLive] = useState<Live | null>(null);
  const [error, setError] = useState("");
  const [change, setChange] = useState<"revoke" | "set_end" | null>(null);
  const [reason, setReason] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [now, setNow] = useState(0);

  const load = useCallback(() => {
    apiFetch<Live>(`/inspections/${sessionId}`).then((r) => { setLive(r); setNow(Date.now()); setError(""); }).catch((e) => setError((e as Error).message));
  }, [sessionId]);
  useEffect(() => {
    load();
    const t = setInterval(load, 15000);   // INS-09: live view
    return () => clearInterval(t);
  }, [load]);

  async function exportLog() {
    setError("");
    try {
      const res = await fetch(`/api/v1/inspections/${sessionId}/log`, { headers: await authHeaders() });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error?.message ?? "Export failed");
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url; a.download = `inspection-log-${study.study_id}-${sessionId.slice(0, 8)}.xlsx`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (e) { setError((e as Error).message); }
  }

  async function applyChange() {
    setBusy(true); setError("");
    try {
      await apiFetch(`/inspections/${sessionId}/change`, { method: "POST", body: JSON.stringify({ action: change, reason: reason.trim(), ends_at: change === "set_end" ? new Date(endsAt).toISOString() : undefined }) });
      setNotice(change === "revoke" ? "Session ended. The inspector can no longer open it." : "End time changed.");
      setChange(null); setReason("");
      load();
    } catch (e) { setError((e as Error).message); }
    setBusy(false);
  }

  if (!live) return <div style={{ fontSize: "12px", color: error ? C.danger : C.textTert }}>{error || "Loading session…"}</div>;
  const s = live.session;
  const ended = !!s.revoked_at || Date.parse(s.ends_at) <= now;
  const open = live.requests.filter((r) => r.status === "open");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={onBack} style={btn}><i className="ti ti-arrow-left" /> All sessions</button>
        <span style={{ flex: 1 }} />
        <button onClick={exportLog} style={btn}><i className="ti ti-file-spreadsheet" /> Export inspection log</button>
        {canCreate && !s.revoked_at && <button onClick={() => { setChange("set_end"); setEndsAt(toLocalInput(new Date(Math.max(Date.parse(s.ends_at), now) + 86400000))); }} style={btn}><i className="ti ti-clock-edit" /> Change end time</button>}
        {canCreate && !ended && <button onClick={() => setChange("revoke")} style={{ ...btn, color: C.danger }}><i className="ti ti-player-stop" /> End session now</button>}
      </div>
      {error && <div role="alert" style={{ fontSize: "12px", color: C.danger, background: C.dangerBg, borderRadius: "8px", padding: "8px 12px" }}>{error}</div>}
      {notice && <div style={{ fontSize: "12px", color: C.ok, background: C.okBg, borderRadius: "8px", padding: "8px 12px" }}>{notice}</div>}
      {change && (
        <div style={{ ...card, display: "flex", flexDirection: "column", gap: "8px" }}>
          <strong style={{ fontSize: "13px" }}>{change === "revoke" ? "End this session now" : "Change the end time"}</strong>
          {change === "set_end" && <label style={label}>New end time<input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} style={{ ...input, maxWidth: "260px" }} /></label>}
          <label style={label}>Reason *<input value={reason} onChange={(e) => setReason(e.target.value)} style={input} /></label>
          <div style={{ fontSize: "11px", color: C.textTert }}>What happens next: {change === "revoke" ? "the inspector is signed out on their next action and the link stops working for good." : "the inspector can use the same link and code until the new end time (a locked session is unlocked)."} The change and reason go into the audit trail.</div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button disabled={busy || reason.trim().length < 3 || (change === "set_end" && !(new Date(endsAt) > new Date()))} onClick={applyChange} style={{ ...primary, opacity: busy || reason.trim().length < 3 ? 0.6 : 1 }}>Confirm</button>
            <button onClick={() => setChange(null)} style={btn}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "12px" }}>
        <div style={card}>
          <div style={{ fontSize: "14px", fontWeight: 700 }}>{s.inspector_name}</div>
          <div style={{ fontSize: "12px", color: C.textSec }}>{s.inspector_org}{s.inspector_email ? ` · ${s.inspector_email}` : ""}</div>
          <div style={{ fontSize: "12px", color: C.textSec, marginTop: "6px" }}>{s.purpose}</div>
          <div style={{ fontSize: "11px", color: C.textTert, marginTop: "8px", lineHeight: 1.6 }}>
            {fmt(s.starts_at)} → {fmt(s.ends_at)}<br />
            Statuses: {s.scope_statuses.map((x) => (x === "Approved" ? "Final" : x)).join(", ")} · Nodes: {s.scope_nodes.join(", ") || "all"} · Countries: {s.scope_countries.length || "all"} · Sites: {s.scope_sites.length || "all"}<br />
            Version history {s.include_versions ? "included" : "not included"} · Audit trail {s.include_audit ? "included" : "not included"} · {MODE[s.download_mode]} · AI off
            {s.extra_document_ids.length > 0 && <><br />{s.extra_document_ids.length} document(s) added on request</>}
            {s.revoked_at && <><br /><span style={{ color: C.danger }}>Ended {fmt(s.revoked_at)}: {s.revoke_reason}</span></>}
            {s.locked_at && <><br /><span style={{ color: C.danger }}>Locked after too many wrong access codes</span></>}
          </div>
        </div>
        <div style={card}>
          <div style={{ fontSize: "12px", fontWeight: 700, color: C.text, display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: !ended && live.now_viewing ? "#10B981" : "#9CA3AF" }} /> Inspection in progress
          </div>
          <div style={{ fontSize: "12px", color: C.textSec, marginTop: "6px" }}>
            {ended ? "This session is over." : live.now_viewing ? <>Now viewing: <strong>{live.now_viewing.title ?? "a document"}</strong> (since {fmt(live.now_viewing.at)})</> : s.last_seen_at ? `Last active ${fmt(s.last_seen_at)}` : "The inspector has not signed in yet."}
          </div>
          <div style={{ fontSize: "12px", color: C.textSec, marginTop: "4px" }}>{open.length} open request{open.length === 1 ? "" : "s"} · refreshes every 15 seconds</div>
        </div>
      </div>

      <div style={card}>
        <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "8px" }}>Requests ({live.requests.length})</div>
        {live.requests.length === 0 && <div style={{ fontSize: "12px", color: C.textTert }}>No requests from the inspector.</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {live.requests.map((r) => <RequestCard key={r.id} r={r} study={study} canRespond={canRespond && !ended} onDone={load} />)}
        </div>
      </div>

      <div style={card}>
        <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "8px" }}>Recent activity</div>
        {live.activity.length === 0 && <div style={{ fontSize: "12px", color: C.textTert }}>Nothing yet.</div>}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {live.activity.map((a) => (
            <div key={a.id} style={{ display: "flex", gap: "10px", fontSize: "12px", padding: "5px 0", borderTop: `0.5px solid ${C.bgSec}` }}>
              <span style={{ color: C.textTert, width: "150px", flexShrink: 0 }}>{fmt(a.at)}</span>
              <span style={{ color: a.kind === "failed_code" || a.kind === "locked" ? C.danger : C.text }}>{ACTIVITY[a.kind] ?? a.kind} {describe(a)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RequestCard({ r, study, canRespond, onDone }: { r: RequestRow; study: { id: string }; canRespond: boolean; onDone: () => void }) {
  const [answering, setAnswering] = useState(false);
  const [response, setResponse] = useState("");
  const [q, setQ] = useState("");
  const [docs, setDocs] = useState<NavDoc[]>([]);
  const [doc, setDoc] = useState("");
  const [extend, setExtend] = useState(true);
  const [close, setClose] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function findDocs() {
    try {
      const res = await apiFetch<{ data: NavDoc[] }>(`/studies/${study.id}/navigator`, { method: "POST", body: JSON.stringify({ q: q.trim() || undefined, page_size: 50 }) });
      setDocs(res.data.filter((d) => d.document_id));
    } catch (e) { setError((e as Error).message); }
  }

  async function send() {
    setBusy(true); setError("");
    try {
      await apiFetch(`/inspection-requests/${r.id}/respond`, { method: "POST", body: JSON.stringify({ response: response.trim(), document_id: doc || undefined, extend_scope: !!doc && extend, close }) });
      setAnswering(false); setResponse(""); setDoc("");
      onDone();
    } catch (e) { setError((e as Error).message); }
    setBusy(false);
  }

  const [fg, bg] = r.status === "open" ? [C.warn, C.warnBg] : [C.ok, C.okBg];
  return (
    <div style={{ border: `0.5px solid ${C.border}`, borderRadius: "10px", padding: "10px 12px" }}>
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <strong style={{ fontSize: "12px", flex: 1 }}>{r.subject}</strong>
        <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "10px", background: bg, color: fg }}>{r.status}</span>
      </div>
      <div style={{ fontSize: "11px", color: C.textTert }}>{KIND[r.kind] ?? r.kind} · {fmt(r.created_at)}{r.document_title ? ` · about ${r.document_title}` : ""}</div>
      {r.detail && <div style={{ fontSize: "12px", color: C.textSec, marginTop: "4px", whiteSpace: "pre-wrap" }}>{r.detail}</div>}
      {r.response && (
        <div style={{ fontSize: "12px", marginTop: "6px", background: C.bgSec, borderRadius: "7px", padding: "6px 8px", whiteSpace: "pre-wrap" }}>
          <strong>{r.responded_by_name}</strong>{r.responded_at ? ` · ${fmt(r.responded_at)}` : ""}<br />{r.response}
          {r.response_document_title && <div style={{ fontSize: "11px", color: C.textTert }}>Attached: {r.response_document_title}{r.scope_extended ? " (added to the scope)" : ""}</div>}
        </div>
      )}
      {canRespond && r.status !== "closed" && !answering && <button onClick={() => setAnswering(true)} style={{ ...btn, marginTop: "8px" }}><i className="ti ti-message-reply" /> {r.response ? "Answer again" : "Answer"}</button>}
      {answering && (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "8px" }}>
          <textarea aria-label="Response" value={response} onChange={(e) => setResponse(e.target.value)} rows={3} placeholder="Your answer to the inspector" style={{ ...input, resize: "vertical" }} />
          <div style={{ display: "flex", gap: "6px" }}>
            <input aria-label="Find a document" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a document to attach (optional)" style={input} />
            <button onClick={findDocs} style={btn}><i className="ti ti-search" /></button>
          </div>
          {docs.length > 0 && (
            <select aria-label="Document to attach" value={doc} onChange={(e) => setDoc(e.target.value)} style={input}>
              <option value="">No document</option>
              {docs.map((d) => <option key={d.document_id!} value={d.document_id!}>{d.title} ({d.artifact_num}, {d.nav_status})</option>)}
            </select>
          )}
          {doc && <label style={{ fontSize: "12px", color: C.textSec, display: "flex", gap: "4px", alignItems: "center" }}><input type="checkbox" checked={extend} onChange={(e) => setExtend(e.target.checked)} /> Add this document to the inspector&apos;s scope</label>}
          <label style={{ fontSize: "12px", color: C.textSec, display: "flex", gap: "4px", alignItems: "center" }}><input type="checkbox" checked={close} onChange={(e) => setClose(e.target.checked)} /> Close the request</label>
          <div style={{ fontSize: "11px", color: C.textTert }}>What happens next: the inspector sees your answer straight away. It is time-stamped and recorded in the inspection log and the audit trail.</div>
          {error && <div role="alert" style={{ fontSize: "12px", color: C.danger }}>{error}</div>}
          <div style={{ display: "flex", gap: "6px" }}>
            <button disabled={busy || response.trim().length < 2} onClick={send} style={{ ...primary, opacity: busy || response.trim().length < 2 ? 0.6 : 1 }}>Send answer</button>
            <button onClick={() => setAnswering(false)} style={btn}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
