"use client";
// Archive & retention (Part 11c, Baseline Section 6): study close-out and reopen with electronic
// signatures (RET-03), the retention policy in force (RET-01), legal holds (RET-02), and signed
// end-of-study archive and transfer packages (RET-04/05).
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../lib/api/client";

const C = { primary: "#F97316", primaryLight: "#FFF7ED", text: "#111827", textSec: "#374151", textTert: "#6B7280", border: "#E5E7EB", bg: "#FFFFFF", bgSec: "#F9FAFB", danger: "#991B1B", dangerBg: "#FEF2F2", ok: "#065F46", okBg: "#ECFDF5", warn: "#92400E", warnBg: "#FEF3C7" };
const btn: React.CSSProperties = { fontSize: "12px", padding: "6px 12px", borderRadius: "7px", border: `0.5px solid ${C.border}`, background: C.bg, color: C.textSec, cursor: "pointer" };
const primary: React.CSSProperties = { ...btn, background: C.primary, color: "#fff", border: "none", fontWeight: 600 };
const card: React.CSSProperties = { background: C.bg, border: `0.5px solid ${C.border}`, borderRadius: "12px", padding: "14px 16px" };
const input: React.CSSProperties = { fontSize: "12px", padding: "7px 9px", border: `0.5px solid ${C.border}`, borderRadius: "7px", width: "100%", boxSizing: "border-box" };
const label: React.CSSProperties = { fontSize: "11px", fontWeight: 600, color: C.textSec, display: "flex", flexDirection: "column", gap: "4px" };

type Trigger = "study_closeout" | "marketing_authorisation" | "fixed_date";
type Policy = { id: string; start_trigger: Trigger; years: number; start_date: string | null; notes: string | null; trigger_label?: string };
type Hold = { id: string; scope: "tenant" | "study" | "document"; reason: string; reference: string | null; placed_by_name: string; placed_at: string; released_at: string | null; released_by_name: string | null; release_reason: string | null; document_title: string | null };
type Pkg = { id: string; kind: string; status: string; options: { label?: string; recipient?: string; reason?: string }; file_count: number | null; file_size: number | null; file_hash: string | null; error: string | null; created_at: string; expires_at: string | null; expired: boolean; requested_by_name: string; signature: { meaning: string; signer_name: string; signed_at: string } | null };
type Data = {
  study: { id: string; study_id: string; closed_at: string | null; closed_by_name: string | null; close_reason: string | null; marketing_authorisation_date: string | null };
  retention: { source: "study" | "organisation" | "none"; policy: Policy | null; start: string | null; end: string | null; state: "no_policy" | "not_started" | "running" | "ended"; waiting_for: string | null; study_policy: Policy | null; org_policy: Policy | null };
  holds: Hold[]; packages: Pkg[];
  lifecycle_signatures: { id: string; action: string; meaning: string; signer_name: string; signed_at: string }[];
  can: { close: boolean; retention: boolean; hold: boolean; package: boolean };
};

const fmt = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
const TRIGGERS: [Trigger, string][] = [["study_closeout", "Study close-out"], ["marketing_authorisation", "Marketing authorisation"], ["fixed_date", "Fixed start date"]];
const SCOPE: Record<Hold["scope"], string> = { tenant: "Whole organisation", study: "This study", document: "Document" };

function Banner({ error, notice }: { error: string; notice: string }) {
  return <>
    {error && <div role="alert" style={{ fontSize: "12px", color: C.danger, background: C.dangerBg, borderRadius: "8px", padding: "8px 12px" }}>{error}</div>}
    {notice && <div style={{ fontSize: "12px", color: C.ok, background: C.okBg, borderRadius: "8px", padding: "8px 12px" }}>{notice}</div>}
  </>;
}

export default function ArchiveRetention({ study }: { study: { id: string; study_id: string } }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(() => {
    apiFetch<Data>(`/studies/${study.id}/archive`).then((d) => { setData(d); }).catch((e) => setError((e as Error).message));
  }, [study.id]);
  useEffect(() => { load(); }, [load]);
  const building = data?.packages.some((p) => p.status === "queued" || p.status === "running");
  useEffect(() => {
    if (!building) return;
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [building, load]);

  const done = (msg: string) => { setNotice(msg); setError(""); load(); };
  const fail = (e: unknown) => { setError((e as Error).message); setNotice(""); };

  if (!data) return <div style={{ fontSize: "12px", color: error ? C.danger : C.textTert }}>{error || "Loading…"}</div>;
  const r = data.retention;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <div>
        <h1 style={{ fontSize: "20px", fontWeight: 700, color: C.text, margin: 0 }}>Archive &amp; retention · {study.study_id}</h1>
        <p style={{ fontSize: "12px", color: C.textTert, margin: "2px 0 0" }}>Close the study, keep its records for the retention period, place legal holds, and produce signed archive or transfer packages. Nothing is ever purged by TMF360.</p>
      </div>
      <Banner error={error} notice={notice} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "12px" }}>
        <StudyStatus data={data} onDone={done} onError={fail} />
        <div style={card}>
          <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "6px" }}>Retention</div>
          {r.source === "none" ? <div style={{ fontSize: "12px", color: C.warn }}>No retention policy yet. Set the organisation default or one for this study.</div> : (
            <div style={{ fontSize: "12px", color: C.textSec, lineHeight: 1.7 }}>
              <div>{r.policy!.years} years from {r.policy!.trigger_label?.toLowerCase()} <span style={{ color: C.textTert }}>({r.source === "study" ? "this study's policy" : "organisation default"})</span></div>
              <div>Starts: {r.start ?? <em>waiting for {r.waiting_for?.toLowerCase()}</em>}</div>
              <div>Ends: {r.end ?? "-"}</div>
              <div>
                <span style={{ fontSize: "11px", padding: "2px 10px", borderRadius: "10px", fontWeight: 600, ...(r.state === "ended" ? { background: C.warnBg, color: C.warn } : { background: C.okBg, color: C.ok }) }}>
                  {r.state === "ended" ? "Retention period ended: review the records (nothing is deleted automatically)" : r.state === "running" ? "Retention running" : "Not started"}
                </span>
              </div>
            </div>
          )}
          {data.can.retention && <RetentionForm data={data} studyId={study.id} onDone={done} onError={fail} />}
        </div>
      </div>

      <Holds data={data} studyId={study.id} onDone={done} onError={fail} />
      <Packages data={data} studyId={study.id} onDone={done} onError={fail} />
    </div>
  );
}

function SignForm({ title, next, action, onCancel, onSubmit, extra, valid = true }: {
  title: string; next: string; action: string; onCancel: () => void; onSubmit: (reason: string, password: string) => Promise<void>; extra?: React.ReactNode; valid?: boolean;
}) {
  const [reason, setReason] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const ok = valid && reason.trim().length >= 3 && password.length > 0;
  return (
    <form onSubmit={async (e) => { e.preventDefault(); setBusy(true); try { await onSubmit(reason.trim(), password); } finally { setBusy(false); setPassword(""); } }}
      style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "10px", background: C.bgSec, borderRadius: "8px", padding: "10px" }}>
      <strong style={{ fontSize: "12px" }}>{title}</strong>
      {extra}
      <label style={label}>Reason *<input value={reason} onChange={(e) => setReason(e.target.value)} style={input} /></label>
      <label style={label}>Your password (electronic signature) *<input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} style={input} /></label>
      <div style={{ fontSize: "11px", color: C.textTert }}>What happens next: {next}</div>
      <div style={{ display: "flex", gap: "8px" }}>
        <button type="submit" disabled={!ok || busy} style={{ ...primary, opacity: !ok || busy ? 0.6 : 1 }}>{busy ? "Signing…" : action}</button>
        <button type="button" onClick={onCancel} style={btn}>Cancel</button>
      </div>
    </form>
  );
}

type Handlers = { onDone: (msg: string) => void; onError: (e: unknown) => void };

function StudyStatus({ data, onDone, onError }: { data: Data } & Handlers) {
  const [open, setOpen] = useState(false);
  const closed = !!data.study.closed_at;
  return (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
        <div style={{ fontSize: "14px", fontWeight: 700, flex: 1 }}>Study status</div>
        <span style={{ fontSize: "11px", padding: "2px 10px", borderRadius: "10px", fontWeight: 600, ...(closed ? { background: C.bgSec, color: C.textSec } : { background: C.okBg, color: C.ok }) }}>{closed ? "Closed (read-only)" : "Open"}</span>
      </div>
      {closed ? (
        <div style={{ fontSize: "12px", color: C.textSec }}>Closed {fmt(data.study.closed_at!)} by {data.study.closed_by_name}: {data.study.close_reason}</div>
      ) : <div style={{ fontSize: "12px", color: C.textSec }}>Closing the study makes its TMF read-only, cancels open QC tasks and records a final health snapshot.</div>}
      {data.lifecycle_signatures.length > 0 && (
        <div style={{ marginTop: "8px", fontSize: "11px", color: C.textTert }}>
          {data.lifecycle_signatures.map((s) => <div key={s.id}><i className="ti ti-signature" /> {s.meaning}: {s.signer_name}, {fmt(s.signed_at)}</div>)}
        </div>
      )}
      {data.can.close && !open && <button onClick={() => setOpen(true)} style={{ ...btn, marginTop: "10px" }}><i className={`ti ti-${closed ? "lock-open" : "lock"}`} /> {closed ? "Reopen study" : "Close study"}</button>}
      {open && (
        <SignForm title={closed ? "Reopen the study" : "Close the study"} action={closed ? "Sign and reopen" : "Sign and close"}
          next={closed ? "the study becomes editable again. Your signature (meaning \"Study TMF reopened\") and reason are recorded." : "your signature (meaning \"Study TMF closed\") is recorded, open QC tasks are cancelled with your reason, and no one can change the study's documents, intake, expected documents or structure until it is reopened."}
          onCancel={() => setOpen(false)}
          onSubmit={async (reason, password) => {
            try {
              const r = await apiFetch<{ tasks_cancelled?: number }>(`/studies/${data.study.id}/${closed ? "reopen" : "close"}`, { method: "POST", body: JSON.stringify({ reason, password }) });
              setOpen(false);
              onDone(closed ? "Study reopened." : `Study closed. ${r.tasks_cancelled ?? 0} open task(s) cancelled; final health snapshot recorded.`);
            } catch (e) { onError(e); }
          }} />
      )}
    </div>
  );
}

function RetentionForm({ data, studyId, onDone, onError }: { data: Data; studyId: string } & Handlers) {
  const [target, setTarget] = useState<"study" | "org" | null>(null);
  const base = target === "org" ? data.retention.org_policy : data.retention.study_policy ?? data.retention.org_policy;
  const [trigger, setTrigger] = useState<Trigger>(base?.start_trigger ?? "study_closeout");
  const [years, setYears] = useState(String(base?.years ?? 25));
  const [startDate, setStartDate] = useState(base?.start_date ?? "");
  const [maDate, setMaDate] = useState(data.study.marketing_authorisation_date ?? "");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const y = Number(years);
  const valid = Number.isInteger(y) && y >= 1 && y <= 100 && reason.trim().length >= 3 && (trigger !== "fixed_date" || !!startDate);

  function openFor(t: "study" | "org") {
    const p = t === "org" ? data.retention.org_policy : data.retention.study_policy ?? data.retention.org_policy;
    setTrigger(p?.start_trigger ?? "study_closeout"); setYears(String(p?.years ?? 25)); setStartDate(p?.start_date ?? ""); setReason(""); setTarget(t);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const policy = { start_trigger: trigger, years: y, start_date: trigger === "fixed_date" ? startDate : null };
    try {
      if (target === "org") await apiFetch(`/retention-default`, { method: "PUT", body: JSON.stringify({ ...policy, reason: reason.trim() }) });
      else await apiFetch(`/studies/${studyId}/retention`, { method: "PUT", body: JSON.stringify({ policy, marketing_authorisation_date: maDate || null, reason: reason.trim() }) });
      setTarget(null);
      onDone("Retention policy saved.");
    } catch (err) { onError(err); }
    setBusy(false);
  }

  if (!target) return (
    <div style={{ display: "flex", gap: "8px", marginTop: "10px", flexWrap: "wrap" }}>
      <button onClick={() => openFor("study")} style={btn}><i className="ti ti-edit" /> Set for this study</button>
      <button onClick={() => openFor("org")} style={btn}><i className="ti ti-building" /> Organisation default</button>
    </div>
  );
  return (
    <form onSubmit={save} style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "10px", background: C.bgSec, borderRadius: "8px", padding: "10px" }}>
      <strong style={{ fontSize: "12px" }}>{target === "org" ? "Organisation default retention" : "Retention for this study"}</strong>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 90px", gap: "8px" }}>
        <label style={label}>Starts at<select value={trigger} onChange={(e) => setTrigger(e.target.value as Trigger)} style={input}>{TRIGGERS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        <label style={label}>Years<input type="number" min={1} max={100} value={years} onChange={(e) => setYears(e.target.value)} style={input} /></label>
      </div>
      {trigger === "fixed_date" && <label style={label}>Start date *<input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={input} /></label>}
      {target === "study" && <label style={label}>Marketing authorisation date (optional)<input type="date" value={maDate} onChange={(e) => setMaDate(e.target.value)} style={input} /></label>}
      <label style={label}>Reason for the change *<input value={reason} onChange={(e) => setReason(e.target.value)} style={input} /></label>
      <div style={{ fontSize: "11px", color: C.textTert }}>What happens next: the policy and your reason are recorded in the audit trail{target === "org" ? "; every study without its own policy uses it" : ""}.</div>
      <div style={{ display: "flex", gap: "8px" }}>
        <button type="submit" disabled={!valid || busy} style={{ ...primary, opacity: !valid || busy ? 0.6 : 1 }}>Save</button>
        <button type="button" onClick={() => setTarget(null)} style={btn}>Cancel</button>
      </div>
    </form>
  );
}

type NavDoc = { document_id: string | null; title: string; artifact_num: string; nav_status: string };

function Holds({ data, studyId, onDone, onError }: { data: Data; studyId: string } & Handlers) {
  const [placing, setPlacing] = useState(false);
  const [scope, setScope] = useState<Hold["scope"]>("study");
  const [reason, setReason] = useState("");
  const [reference, setReference] = useState("");
  const [q, setQ] = useState("");
  const [docs, setDocs] = useState<NavDoc[]>([]);
  const [doc, setDoc] = useState("");
  const [releasing, setReleasing] = useState<string | null>(null);
  const [releaseReason, setReleaseReason] = useState("");
  const [busy, setBusy] = useState(false);
  const active = data.holds.filter((h) => !h.released_at);
  const released = data.holds.filter((h) => h.released_at);
  const valid = reason.trim().length >= 3 && (scope !== "document" || !!doc);

  async function find() {
    try {
      const r = await apiFetch<{ data: NavDoc[] }>(`/studies/${studyId}/navigator`, { method: "POST", body: JSON.stringify({ q: q.trim() || undefined, page_size: 50 }) });
      setDocs(r.data.filter((d) => d.document_id));
    } catch (e) { onError(e); }
  }
  async function place(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    try {
      await apiFetch(`/legal-holds`, { method: "POST", body: JSON.stringify({ scope, study_id: scope === "study" ? studyId : undefined, document_id: scope === "document" ? doc : undefined, reason: reason.trim(), reference: reference.trim() || undefined }) });
      setPlacing(false); setReason(""); setReference(""); setDoc("");
      onDone("Legal hold placed.");
    } catch (err) { onError(err); }
    setBusy(false);
  }
  async function release(id: string) {
    setBusy(true);
    try {
      await apiFetch(`/legal-holds/${id}/release`, { method: "POST", body: JSON.stringify({ reason: releaseReason.trim() }) });
      setReleasing(null); setReleaseReason("");
      onDone("Legal hold released.");
    } catch (err) { onError(err); }
    setBusy(false);
  }

  return (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
        <div style={{ fontSize: "14px", fontWeight: 700, flex: 1 }}>Legal holds ({active.length} active)</div>
        {data.can.hold && !placing && <button onClick={() => setPlacing(true)} style={btn}><i className="ti ti-gavel" /> Place legal hold</button>}
      </div>
      <div style={{ fontSize: "12px", color: C.textSec, marginBottom: "8px" }}>Documents under a hold cannot be deleted. Holds on the whole organisation also apply here.</div>
      {placing && (
        <form onSubmit={place} style={{ display: "flex", flexDirection: "column", gap: "8px", background: C.bgSec, borderRadius: "8px", padding: "10px", marginBottom: "10px" }}>
          <div style={{ display: "flex", gap: "14px", fontSize: "12px", color: C.textSec, flexWrap: "wrap" }}>
            {(Object.keys(SCOPE) as Hold["scope"][]).map((s) => <label key={s} style={{ display: "flex", gap: "4px", alignItems: "center" }}><input type="radio" name="scope" checked={scope === s} onChange={() => setScope(s)} /> {SCOPE[s]}</label>)}
          </div>
          {scope === "document" && (
            <>
              <div style={{ display: "flex", gap: "6px" }}>
                <input aria-label="Find a document" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a document" style={input} />
                <button type="button" onClick={find} style={btn}><i className="ti ti-search" /></button>
              </div>
              {docs.length > 0 && <select aria-label="Document to hold" value={doc} onChange={(e) => setDoc(e.target.value)} style={input}>
                <option value="">Choose a document</option>
                {docs.map((d) => <option key={d.document_id!} value={d.document_id!}>{d.title} ({d.artifact_num}, {d.nav_status})</option>)}
              </select>}
            </>
          )}
          <label style={label}>Reason *<input value={reason} onChange={(e) => setReason(e.target.value)} style={input} /></label>
          <label style={label}>Reference (matter or case number)<input value={reference} onChange={(e) => setReference(e.target.value)} style={input} /></label>
          <div style={{ fontSize: "11px", color: C.textTert }}>What happens next: {scope === "tenant" ? "no document in any of your organisation's studies" : scope === "study" ? "no document in this study" : "this document"} can be deleted until the hold is released. Recorded in the audit trail.</div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button type="submit" disabled={!valid || busy} style={{ ...primary, opacity: !valid || busy ? 0.6 : 1 }}>Place hold</button>
            <button type="button" onClick={() => setPlacing(false)} style={btn}>Cancel</button>
          </div>
        </form>
      )}
      {data.holds.length === 0 && <div style={{ fontSize: "12px", color: C.textTert }}>No legal holds.</div>}
      {[...active, ...released].map((h) => (
        <div key={h.id} style={{ border: `0.5px solid ${C.border}`, borderRadius: "8px", padding: "8px 10px", marginTop: "6px", opacity: h.released_at ? 0.7 : 1 }}>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <strong style={{ fontSize: "12px", flex: 1 }}>{SCOPE[h.scope]}{h.document_title ? `: ${h.document_title}` : ""}{h.reference ? ` · ${h.reference}` : ""}</strong>
            <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "10px", ...(h.released_at ? { background: C.bgSec, color: C.textTert } : { background: C.warnBg, color: C.warn }) }}>{h.released_at ? "Released" : "Active"}</span>
          </div>
          <div style={{ fontSize: "11px", color: C.textTert }}>{h.reason} · placed by {h.placed_by_name}, {fmt(h.placed_at)}{h.released_at ? ` · released by ${h.released_by_name}, ${fmt(h.released_at)}: ${h.release_reason}` : ""}</div>
          {data.can.hold && !h.released_at && (releasing === h.id ? (
            <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
              <input aria-label="Reason for release" value={releaseReason} onChange={(e) => setReleaseReason(e.target.value)} placeholder="Reason for release" style={input} />
              <button disabled={busy || releaseReason.trim().length < 3} onClick={() => release(h.id)} style={{ ...primary, opacity: releaseReason.trim().length < 3 ? 0.6 : 1 }}>Release</button>
              <button onClick={() => setReleasing(null)} style={btn}>Cancel</button>
            </div>
          ) : <button onClick={() => { setReleasing(h.id); setReleaseReason(""); }} style={{ ...btn, marginTop: "6px" }}>Release hold</button>)}
        </div>
      ))}
    </div>
  );
}

function Packages({ data, studyId, onDone, onError }: { data: Data; studyId: string } & Handlers) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"archive" | "transfer">(data.study.closed_at ? "archive" : "transfer");
  const [recipient, setRecipient] = useState("");
  const [busy, setBusy] = useState("");
  const closed = !!data.study.closed_at;
  const valid = kind === "archive" ? closed : recipient.trim().length >= 2;

  async function download(p: Pkg) {
    setBusy(p.id);
    try {
      const r = await apiFetch<{ url: string }>(`/exports/${p.id}/download`, { method: "POST" });
      window.location.assign(r.url);
    } catch (e) { onError(e); }
    setBusy("");
  }

  return (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
        <div style={{ fontSize: "14px", fontWeight: 700, flex: 1 }}>Archive and transfer packages</div>
        {data.can.package && !open && <button onClick={() => { setKind(closed ? "archive" : "transfer"); setOpen(true); }} style={btn}><i className="ti ti-archive" /> New package</button>}
      </div>
      <div style={{ fontSize: "12px", color: C.textSec }}>Every file version, metadata and its history, the audit trail, signatures, QC decisions and a manifest of SHA-256 hashes. Files keep their original format.</div>
      {open && (
        <SignForm title="New package" action="Sign and build package" valid={valid} onCancel={() => setOpen(false)}
          next={`your signature (meaning "Archive package approved") is recorded and the package is built in the background. You get an email when it is ready; the download works for 7 days.`}
          extra={<>
            <div style={{ display: "flex", gap: "14px", fontSize: "12px", color: C.textSec, flexWrap: "wrap" }}>
              <label style={{ display: "flex", gap: "4px", alignItems: "center" }}><input type="radio" name="pkg" checked={kind === "archive"} onChange={() => setKind("archive")} /> End-of-study archive</label>
              <label style={{ display: "flex", gap: "4px", alignItems: "center" }}><input type="radio" name="pkg" checked={kind === "transfer"} onChange={() => setKind("transfer")} /> Transfer to another sponsor, CRO or system</label>
            </div>
            {kind === "archive" && !closed && <div style={{ fontSize: "11px", color: C.warn }}>Close the study first: the end-of-study archive is made from a closed study.</div>}
            {kind === "transfer" && <label style={label}>Recipient *<input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="e.g. Acme CRO Ltd" style={input} /></label>}
          </>}
          onSubmit={async (reason, password) => {
            try {
              await apiFetch(`/studies/${studyId}/archive-packages`, { method: "POST", body: JSON.stringify({ kind, recipient: kind === "transfer" ? recipient.trim() : undefined, reason, password }) });
              setOpen(false); setRecipient("");
              onDone("Package approved and started.");
            } catch (e) { onError(e); }
          }} />
      )}
      <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "6px" }}>
        {data.packages.length === 0 && <div style={{ fontSize: "12px", color: C.textTert }}>No packages yet.</div>}
        {data.packages.map((p) => {
          const state = p.expired ? "Expired" : p.status === "done" ? "Ready" : p.status === "failed" ? "Failed" : "Building…";
          return (
            <div key={p.id} style={{ border: `0.5px solid ${C.border}`, borderRadius: "8px", padding: "8px 10px", display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: "240px" }}>
                <div style={{ fontSize: "12px", fontWeight: 600 }}>{p.options.label}</div>
                <div style={{ fontSize: "11px", color: C.textTert }}>
                  {p.signature ? `${p.signature.meaning}: ${p.signature.signer_name}, ${fmt(p.signature.signed_at)}` : `${p.requested_by_name}, ${fmt(p.created_at)}`}
                  {p.status === "done" && ` · ${p.file_count} files · ${Math.max(1, Math.round((p.file_size ?? 0) / 1024))} KB`}
                </div>
                {p.options.reason && <div style={{ fontSize: "11px", color: C.textTert }}>Reason: {p.options.reason}</div>}
                {p.file_hash && <div style={{ fontSize: "10px", color: C.textTert, fontFamily: "monospace", wordBreak: "break-all" }}>SHA-256 {p.file_hash}</div>}
                {p.status === "failed" && <div style={{ fontSize: "11px", color: C.danger }}>{p.error}</div>}
              </div>
              <span style={{ fontSize: "11px", padding: "2px 10px", borderRadius: "10px", fontWeight: 600, background: p.status === "done" && !p.expired ? C.okBg : p.status === "failed" ? C.dangerBg : C.warnBg, color: p.status === "done" && !p.expired ? C.ok : p.status === "failed" ? C.danger : C.warn }}>{state}</span>
              {p.status === "done" && !p.expired && <button onClick={() => download(p)} disabled={!!busy} style={btn}><i className="ti ti-download" /> Download</button>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
