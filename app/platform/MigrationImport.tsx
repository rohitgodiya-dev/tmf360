"use client";
// Migration & import (Part 12b, M18): bring an existing TMF in through an isolated batch.
// 1 Stage files + manifest  2 Verify + dry run  3 Map values / resolve exceptions  4 Reconcile
// 5 Accept with an electronic signature (files everything ready into the live TMF)  6 Audit report.
import { useCallback, useEffect, useRef, useState } from "react";
import JSZip from "jszip";
import { supabase } from "../../lib/supabase";
import { apiFetch, authHeaders } from "../../lib/api/client";

const C = { primary: "#F97316", primaryLight: "#FFF7ED", text: "#111827", textSec: "#374151", textTert: "#6B7280", border: "#E5E7EB", bg: "#FFFFFF", bgSec: "#F9FAFB", danger: "#991B1B", dangerBg: "#FEF2F2", ok: "#065F46", okBg: "#ECFDF5", warn: "#92400E", warnBg: "#FEF3C7" };
const btn: React.CSSProperties = { fontSize: "12px", padding: "6px 12px", borderRadius: "7px", border: `0.5px solid ${C.border}`, background: C.bg, color: C.textSec, cursor: "pointer" };
const primary: React.CSSProperties = { ...btn, background: C.primary, color: "#fff", border: "none", fontWeight: 600 };
const card: React.CSSProperties = { background: C.bg, border: `0.5px solid ${C.border}`, borderRadius: "12px", padding: "14px 16px" };
const input: React.CSSProperties = { fontSize: "12px", padding: "6px 8px", border: `0.5px solid ${C.border}`, borderRadius: "7px", width: "100%", boxSizing: "border-box" };
const label: React.CSSProperties = { fontSize: "11px", fontWeight: 600, color: C.textSec, display: "flex", flexDirection: "column", gap: "4px" };

type Artifact = { a: string; an: string; z: string };
type Batch = { id: string; name: string; source_system: string; description: string | null; status: string; dry_run_report: Record<string, unknown> | null; reconciliation: Record<string, unknown> | null;
  filed_count: number | null; created_at: string; created_by_name: string; cancel_reason: string | null };
type Item = { id: string; source_path: string; source_id: string | null; file_path: string | null; state: string; exceptions: string[]; verification: string; artifact_num: string | null;
  target_status: string | null; title: string | null; exclusion_reason: string | null; document_id: string | null; raw: Record<string, string> };
type Site = { id: string; site_number: string; display_name: string };

const STATUS: Record<string, [string, string, string]> = {
  draft: [C.warn, C.warnBg, "Draft"], dry_run: ["#1E40AF", "#DBEAFE", "Dry run done"], reconciled: [C.ok, C.okBg, "Reconciled"], filed: [C.ok, C.okBg, "Filed"], cancelled: [C.textTert, C.bgSec, "Cancelled"],
};
const ALIASES: Record<string, string[]> = {
  file: ["file", "filename", "file name", "path", "file path"], document_type: ["document_type", "document type", "type", "doc type", "artifact"],
  status: ["status", "state"], site: ["site", "site number", "site_number"], country: ["country", "country code"], title: ["title", "name", "document title", "document name"],
  version: ["version", "revision"], effective_date: ["effective_date", "effective date", "date"], owner: ["owner", "author"], created_date: ["created", "created_date", "created date"],
  source_id: ["id", "source_id", "source id", "document id"],
};

async function sha256Hex(file: Blob) {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cell = ""; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
    else if (c === '"') q = true; else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim()));
}

async function parseXlsx(file: File): Promise<string[][]> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const xml = (s: string) => new DOMParser().parseFromString(s, "application/xml");
  const shared = zip.file("xl/sharedStrings.xml") ? [...xml(await zip.file("xl/sharedStrings.xml")!.async("string")).getElementsByTagName("si")].map((si) => si.textContent ?? "") : [];
  const sheet = xml(await zip.file("xl/worksheets/sheet1.xml")!.async("string"));
  const colIndex = (ref: string) => [...ref.replace(/\d+/g, "")].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
  return [...sheet.getElementsByTagName("row")].map((r) => {
    const out: string[] = [];
    for (const c of r.getElementsByTagName("c")) {
      const t = c.getAttribute("t"); const v = c.getElementsByTagName("v")[0]?.textContent ?? c.getElementsByTagName("t")[0]?.textContent ?? "";
      out[colIndex(c.getAttribute("r") ?? "A")] = t === "s" ? shared[Number(v)] ?? "" : v;
    }
    return Array.from(out, (x) => x ?? "");
  }).filter((r) => r.some((c) => c.trim()));
}

/** Manifest rows as standard fields, keyed by file name (lower case). */
async function readManifest(file: File): Promise<Map<string, Record<string, string>>> {
  const rows = /\.xlsx$/i.test(file.name) ? await parseXlsx(file) : parseCsv(await file.text());
  const [head, ...body] = rows;
  const col: Record<string, number> = {};
  head.forEach((h, i) => { for (const [k, names] of Object.entries(ALIASES)) if (names.includes(h.trim().toLowerCase()) && col[k] === undefined) col[k] = i; });
  if (col.file === undefined) throw new Error("The manifest needs a File column with each document's file name");
  const out = new Map<string, Record<string, string>>();
  for (const r of body) {
    const rec: Record<string, string> = {};
    for (const [k, i] of Object.entries(col)) if (k !== "file" && r[i]?.trim()) rec[k] = r[i].trim().slice(0, 2000);
    const name = (r[col.file] ?? "").trim().split(/[\\/]/).pop()!.toLowerCase();
    if (name) out.set(name, rec);
  }
  return out;
}

export default function MigrationImport({ study, artifacts }: { study: { id: string; study_id: string }; artifacts: Artifact[] }) {
  const [batches, setBatches] = useState<Batch[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [f, setF] = useState({ name: "", source_system: "", description: "" });
  const [error, setError] = useState("");

  const load = useCallback(() => {
    apiFetch<{ data: Batch[] }>(`/studies/${study.id}/imports`).then((r) => setBatches(r.data)).catch((e) => setError((e as Error).message));
  }, [study.id]);
  useEffect(() => { load(); }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault(); setError("");
    try {
      const b = await apiFetch<Batch>(`/studies/${study.id}/imports`, { method: "POST", body: JSON.stringify({ name: f.name.trim(), source_system: f.source_system.trim(), description: f.description.trim() || undefined }) });
      setCreating(false); setF({ name: "", source_system: "", description: "" }); setOpen(b.id); load();
    } catch (err) { setError((err as Error).message); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: "20px", fontWeight: 700, color: C.text, margin: 0 }}>Migration &amp; import · {study.study_id}</h1>
          <p style={{ fontSize: "12px", color: C.textTert, margin: "2px 0 0" }}>Bring documents from another eTMF, a file share or spreadsheets into an isolated batch. Nothing reaches the live TMF until the batch is reconciled and accepted with your signature.</p>
        </div>
        {!creating && !open && <button onClick={() => setCreating(true)} style={primary}><i className="ti ti-plus" /> New import batch</button>}
      </div>
      {error && <div role="alert" style={{ fontSize: "12px", color: C.danger, background: C.dangerBg, borderRadius: "8px", padding: "8px 12px" }}>{error}</div>}
      {creating && (
        <form onSubmit={create} style={{ ...card, display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            <label style={label}>Batch name *<input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} style={input} /></label>
            <label style={label}>Source system *<input value={f.source_system} onChange={(e) => setF({ ...f, source_system: e.target.value })} placeholder="e.g. Veeva Vault, file share" style={input} /></label>
          </div>
          <label style={label}>Description<input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} style={input} /></label>
          <div style={{ display: "flex", gap: "8px" }}>
            <button type="submit" disabled={f.name.trim().length < 3 || f.source_system.trim().length < 2} style={{ ...primary, opacity: f.name.trim().length < 3 || f.source_system.trim().length < 2 ? 0.6 : 1 }}>Open batch</button>
            <button type="button" onClick={() => setCreating(false)} style={btn}>Cancel</button>
          </div>
        </form>
      )}
      {open ? <BatchView id={open} study={study} artifacts={artifacts} onBack={() => { setOpen(null); load(); }} /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {batches?.length === 0 && <div style={{ ...card, fontSize: "12px", color: C.textTert, textAlign: "center" }}>No import batches yet.</div>}
          {batches?.map((b) => {
            const [fg, bg, l] = STATUS[b.status] ?? [C.textTert, C.bgSec, b.status];
            return (
              <button key={b.id} onClick={() => setOpen(b.id)} style={{ ...card, display: "flex", gap: "10px", alignItems: "center", textAlign: "left", cursor: "pointer", width: "100%" }}>
                <i className="ti ti-database-import" style={{ fontSize: "20px", color: C.textTert }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: C.text }}>{b.name}</div>
                  <div style={{ fontSize: "11px", color: C.textTert }}>{b.source_system} · {b.created_by_name}, {new Date(b.created_at).toLocaleString()}{b.filed_count != null ? ` · ${b.filed_count} filed` : ""}</div>
                </div>
                <span style={{ fontSize: "11px", padding: "2px 10px", borderRadius: "10px", background: bg, color: fg, fontWeight: 600 }}>{l}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BatchView({ id, study, artifacts, onBack }: { id: string; study: { id: string; study_id: string }; artifacts: Artifact[]; onBack: () => void }) {
  const [batch, setBatch] = useState<Batch | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [prefix, setPrefix] = useState("");
  const [signature, setSignature] = useState<{ meaning: string; signer_name: string; signed_at: string } | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [password, setPassword] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const filesRef = useRef<HTMLInputElement>(null);
  const manifestRef = useRef<HTMLInputElement>(null);
  const emsRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    apiFetch<{ batch: Batch; items: Item[]; staging_prefix: string; signature: typeof signature }>(`/imports/${id}`)
      .then((r) => { setBatch(r.batch); setItems(r.items); setPrefix(r.staging_prefix); setSignature(r.signature); }).catch((e) => setError((e as Error).message));
  }, [id]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    apiFetch<{ countries: { sites: Site[] }[] }>(`/studies/${study.id}/structure`).then((r) => setSites(r.countries.flatMap((c) => c.sites))).catch(() => setSites([]));
  }, [study.id]);

  async function step(label: string, fn: () => Promise<string | void>) {
    setBusy(label); setError(""); setNotice("");
    try { const msg = await fn(); if (msg) setNotice(msg); } catch (e) { setError((e as Error).message); }
    setBusy(""); load();
  }

  const stage = () => step("Staging files…", async () => {
    const files = Array.from(filesRef.current?.files ?? []);
    const manifestFile = manifestRef.current?.files?.[0];
    if (!files.length && !manifestFile) throw new Error("Choose the documents and/or a manifest");
    const manifest = manifestFile ? await readManifest(manifestFile) : new Map<string, Record<string, string>>();
    const payload: Record<string, unknown>[] = [];
    const seen = new Set<string>();
    let n = 0;
    for (const file of files) {
      setBusy(`Staging ${++n} of ${files.length}: ${file.name}`);
      const hash = await sha256Hex(file);
      const ext = (file.name.split(".").pop() || "bin").toLowerCase();
      const path = `${prefix}${hash}.${ext}`;
      const { error } = await supabase.storage.from("Documents").upload(path, file);
      if (error && !/exists|duplicate|409/i.test(`${error.message} ${(error as { statusCode?: unknown }).statusCode ?? ""}`)) throw new Error(`${file.name}: ${error.message}`);
      const raw = manifest.get(file.name.toLowerCase()) ?? {};
      seen.add(file.name.toLowerCase());
      payload.push({ source_path: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name, source_id: raw.source_id, file_path: path, file_name: file.name,
        file_type: file.type || null, file_size_bytes: file.size, declared_hash: hash, raw });
    }
    for (const [name, raw] of manifest) if (!seen.has(name)) payload.push({ source_path: name, source_id: raw.source_id, file_path: null, raw });
    for (let i = 0; i < payload.length; i += 200) {
      await apiFetch(`/imports/${id}/items`, { method: "POST", body: JSON.stringify({ items: payload.slice(i, i + 200) }) });
    }
    if (filesRef.current) filesRef.current.value = "";
    if (manifestRef.current) manifestRef.current.value = "";
    return `${payload.length} item(s) registered in the batch.`;
  });

  // MIG-09: a TMF exchange package (EMS ZIP with exchange.xml) from another eTMF.
  const loadExchange = () => step("Uploading the exchange package…", async () => {
    const file = emsRef.current?.files?.[0];
    if (!file) throw new Error("Choose the exchange package (.zip)");
    const path = `${prefix}package-${await sha256Hex(file)}.zip`;
    const { error } = await supabase.storage.from("Documents").upload(path, file, { contentType: "application/zip" });
    if (error && !/exists|duplicate|409/i.test(`${error.message} ${(error as { statusCode?: unknown }).statusCode ?? ""}`)) throw new Error(error.message);
    setBusy("Checking exchange.xml and every file's checksum…");
    const r = await apiFetch<{ transfer_id: string; transfer_source_id: string; tmfrm_version: string; added: number; skipped: { object_id: string; reason: string }[] }>(
      `/imports/${id}/ems`, { method: "POST", body: JSON.stringify({ file_path: path }) });
    if (emsRef.current) emsRef.current.value = "";
    return `Transfer ${r.transfer_id} from ${r.transfer_source_id} (TMF RM ${r.tmfrm_version}): ${r.added} item(s) registered` +
      (r.skipped.length ? `; ${r.skipped.length} not loaded: ${r.skipped.slice(0, 3).map((s) => s.reason).join("; ")}${r.skipped.length > 3 ? " …" : ""}` : ".");
  });

  const dryRun = () => step("Verifying files on the server…", async () => {
    for (let guard = 0; guard < 200; guard++) {
      const v = await apiFetch<{ remaining: number }>(`/imports/${id}/verify`, { method: "POST" });
      if (!v.remaining) break;
      setBusy(`Verifying files on the server… ${v.remaining} left`);
    }
    setBusy("Running the dry run…");
    await apiFetch(`/imports/${id}/dry-run`, { method: "POST" });
    return "Dry run complete. Nothing has been filed.";
  });

  async function downloadReport() {
    const res = await fetch(`/api/v1/imports/${id}/report`, { headers: await authHeaders() });
    if (!res.ok) { setError((await res.json().catch(() => null))?.error?.message ?? "Report failed"); return; }
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement("a"); a.href = url; a.download = `import-report-${study.study_id}-${id.slice(0, 8)}.xlsx`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  if (!batch) return <div style={{ fontSize: "12px", color: error ? C.danger : C.textTert }}>{error || "Loading batch…"}</div>;
  const closed = batch.status === "filed" || batch.status === "cancelled";
  const report = batch.dry_run_report as Record<string, number | Record<string, number>> | null;
  const exceptions = items.filter((i) => i.state === "exception");
  const unmapped = new Map<string, Set<string>>();
  for (const i of exceptions) for (const e of i.exceptions) {
    const m = /^Unmapped (document type|status|site|country): (.+)$/.exec(e);
    if (m) { const k = m[1].replace(" ", "_"); if (!unmapped.has(k)) unmapped.set(k, new Set()); unmapped.get(k)!.add(m[2]); }
  }
  const [fg, bg, l] = STATUS[batch.status] ?? [C.textTert, C.bgSec, batch.status];
  const count = (s: string) => items.filter((i) => i.state === s).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={onBack} style={btn}><i className="ti ti-arrow-left" /> All batches</button>
        <strong style={{ fontSize: "14px" }}>{batch.name}</strong>
        <span style={{ fontSize: "11px", color: C.textTert }}>{batch.source_system}</span>
        <span style={{ fontSize: "11px", padding: "2px 10px", borderRadius: "10px", background: bg, color: fg, fontWeight: 600 }}>{l}</span>
        <span style={{ flex: 1 }} />
        <button onClick={downloadReport} style={btn}><i className="ti ti-file-spreadsheet" /> Import audit report</button>
      </div>
      {error && <div role="alert" style={{ fontSize: "12px", color: C.danger, background: C.dangerBg, borderRadius: "8px", padding: "8px 12px" }}>{error}</div>}
      {notice && <div style={{ fontSize: "12px", color: C.ok, background: C.okBg, borderRadius: "8px", padding: "8px 12px" }}>{notice}</div>}
      {busy && <div style={{ fontSize: "12px", color: C.textSec }}>{busy}</div>}
      {signature && <div style={{ fontSize: "12px", color: C.ok }}><i className="ti ti-signature" /> {signature.meaning}: {signature.signer_name}, {new Date(signature.signed_at).toLocaleString()} · {batch.filed_count} document(s) filed</div>}
      {batch.cancel_reason && <div style={{ fontSize: "12px", color: C.textTert }}>Cancelled: {batch.cancel_reason}</div>}

      {!closed && (
        <div style={card}>
          <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "6px" }}>1. Stage documents and manifest</div>
          <div style={{ fontSize: "11px", color: C.textTert, marginBottom: "8px" }}>The manifest (CSV or Excel) has one row per document: File, Document type, Status, Site, Country, Title, Version, Effective date (YYYY-MM-DD), Owner, Created, ID. Files go to this batch&apos;s staging area, not the TMF.</div>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "flex-end" }}>
            <label style={label}>Documents<input aria-label="Documents to import" ref={filesRef} type="file" multiple style={{ fontSize: "12px" }} /></label>
            <label style={label}>Manifest<input aria-label="Manifest" ref={manifestRef} type="file" accept=".csv,.xlsx" style={{ fontSize: "12px" }} /></label>
            <button disabled={!!busy} onClick={stage} style={primary}><i className="ti ti-upload" /> Stage</button>
          </div>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "flex-end", marginTop: "10px", paddingTop: "10px", borderTop: `0.5px solid ${C.border}` }}>
            <label style={label}>Or a TMF exchange package (TMF RM Exchange Mechanism Standard)<input aria-label="Exchange package" ref={emsRef} type="file" accept=".zip" style={{ fontSize: "12px" }} /></label>
            <button disabled={!!busy} onClick={loadExchange} style={btn}><i className="ti ti-package-import" /> Load package</button>
          </div>
          <div style={{ fontSize: "11px", color: C.textTert, marginTop: "4px" }}>What happens next: exchange.xml is validated, each file is checked against its checksum and staged here; Current records become items. Superseded or failing records are listed and not loaded.</div>
        </div>
      )}

      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
          <div style={{ fontSize: "13px", fontWeight: 700, flex: 1 }}>2. Verify and dry run</div>
          {!closed && <button disabled={!!busy || !items.length} onClick={dryRun} style={btn}><i className="ti ti-player-play" /> Run dry run</button>}
        </div>
        <div style={{ fontSize: "12px", color: C.textSec }}>{items.length} items · {count("ready")} ready · {count("exception")} exceptions · {count("excluded")} excluded · {count("imported")} imported</div>
        {report && (
          <div style={{ fontSize: "11px", color: C.textSec, marginTop: "6px", lineHeight: 1.7 }}>
            By type: {Object.entries((report.by_type as Record<string, number>) ?? {}).map(([k, v]) => `${k}: ${v}`).join(" · ") || "none"}<br />
            Unmapped: {Object.entries((report.unmapped as Record<string, number>) ?? {}).map(([k, v]) => `${k.replace("Unmapped ", "")} (${v})`).join(" · ") || "none"}<br />
            Missing metadata: {String(report.missing_metadata)} · Duplicates: {String(report.duplicates)} · Conflicts with the TMF: {String(report.conflicts)} · File problems: {String(report.unverified)}
          </div>
        )}
      </div>

      {!closed && unmapped.size > 0 && <MappingForm unmapped={unmapped} artifacts={artifacts} sites={sites} onSaved={() => { setNotice("Mappings saved. Run the dry run again."); load(); }} onError={(e) => setError((e as Error).message)} />}

      {(exceptions.length > 0 || count("excluded") > 0) && (
        <div style={card}>
          <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "6px" }}>3. Exception queue ({exceptions.length})</div>
          {[...exceptions, ...items.filter((i) => i.state === "excluded")].map((i) => <ExceptionRow key={i.id} item={i} artifacts={artifacts} closed={closed} onDone={load} onError={(e) => setError((e as Error).message)} />)}
        </div>
      )}

      {!closed && (
        <div style={card}>
          <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "6px" }}>4. Reconcile and accept</div>
          {batch.reconciliation && (
            <div style={{ fontSize: "11px", color: C.textSec, marginBottom: "8px" }}>
              {Object.entries(batch.reconciliation).filter(([k]) => k !== "excluded_reasons").map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`).join(" · ")}
            </div>
          )}
          {batch.status !== "reconciled" ? (
            <button disabled={!!busy || batch.status !== "dry_run"} onClick={() => step("Reconciling…", async () => { await apiFetch(`/imports/${id}/reconcile`, { method: "POST" }); return "Reconciled: every item is imported or excluded, and every file hash matches."; })}
              style={{ ...btn, opacity: batch.status !== "dry_run" ? 0.6 : 1 }}><i className="ti ti-scale" /> Reconcile</button>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxWidth: "460px" }}>
              <label style={label}>Your password (electronic signature) *<input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} style={input} /></label>
              <div style={{ fontSize: "11px", color: C.textTert }}>What happens next: your signature (meaning &quot;Import reconciled and accepted&quot;) is recorded and {count("ready")} document(s) are filed into the live TMF with their source, original dates and version kept as provenance. Final records are filed as Final. This cannot be undone except by the normal deletion process.</div>
              <button disabled={!!busy || !password} onClick={() => step("Filing…", async () => { const r = await apiFetch<{ filed: number }>(`/imports/${id}/accept`, { method: "POST", body: JSON.stringify({ password }) }); setPassword(""); return `${r.filed} document(s) filed into the TMF.`; })}
                style={{ ...primary, opacity: !password ? 0.6 : 1, alignSelf: "flex-start" }}>Sign and file</button>
            </div>
          )}
          <div style={{ display: "flex", gap: "6px", marginTop: "12px", alignItems: "center" }}>
            <input aria-label="Reason to cancel" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Reason to cancel the batch" style={{ ...input, maxWidth: "320px" }} />
            <button disabled={!!busy || cancelReason.trim().length < 3} onClick={() => step("Cancelling…", async () => { await apiFetch(`/imports/${id}/cancel`, { method: "POST", body: JSON.stringify({ reason: cancelReason.trim() }) }); return "Batch cancelled."; })}
              style={{ ...btn, color: C.danger, opacity: cancelReason.trim().length < 3 ? 0.6 : 1 }}>Cancel batch</button>
          </div>
        </div>
      )}
    </div>
  );
}

function MappingForm({ unmapped, artifacts, sites, onSaved, onError }: { unmapped: Map<string, Set<string>>; artifacts: Artifact[]; sites: Site[]; onSaved: () => void; onError: (e: unknown) => void }) {
  const [targets, setTargets] = useState<Record<string, string>>({});
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const entries = [...unmapped.entries()].flatMap(([kind, values]) => [...values].map((v) => ({ kind, value: v, key: `${kind}|${v}` })));
  const chosen = entries.filter((e) => targets[e.key]);

  async function save() {
    setBusy(true);
    try {
      await apiFetch("/import-mappings", { method: "PUT", body: JSON.stringify({ reason: reason.trim(), mappings: chosen.map((e) => ({ kind: e.kind, source_value: e.value, target_value: targets[e.key] })) }) });
      setTargets({}); setReason(""); onSaved();
    } catch (e) { onError(e); }
    setBusy(false);
  }

  return (
    <div style={card}>
      <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "4px" }}>Mapping workspace</div>
      <div style={{ fontSize: "11px", color: C.textTert, marginBottom: "8px" }}>Map each source value once; mappings are saved for your organisation and reused by later batches.</div>
      {entries.map((e) => (
        <div key={e.key} style={{ display: "grid", gridTemplateColumns: "140px 1fr 1fr", gap: "8px", alignItems: "center", marginTop: "4px" }}>
          <span style={{ fontSize: "11px", color: C.textTert }}>{e.kind.replace("_", " ")}</span>
          <span style={{ fontSize: "12px", fontWeight: 600 }}>{e.value}</span>
          <select aria-label={`Map ${e.value}`} value={targets[e.key] ?? ""} onChange={(ev) => setTargets({ ...targets, [e.key]: ev.target.value })} style={input}>
            <option value="">Choose…</option>
            {e.kind === "document_type" && artifacts.map((a) => <option key={a.a} value={a.a}>{a.a} {a.an}</option>)}
            {e.kind === "status" && ["Final", "Draft"].map((s) => <option key={s} value={s}>{s}</option>)}
            {e.kind === "site" && sites.map((s) => <option key={s.id} value={s.site_number}>{s.site_number} {s.display_name}</option>)}
            {e.kind === "country" && ["US", "GB", "DE", "FR", "ES", "IT", "NL", "BE", "CA", "AU", "JP", "IN"].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      ))}
      <label style={{ ...label, marginTop: "8px" }}>Reason *<input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Mapping agreed in migration plan v1" style={input} /></label>
      <button disabled={busy || !chosen.length || reason.trim().length < 3} onClick={save} style={{ ...primary, marginTop: "8px", opacity: busy || !chosen.length || reason.trim().length < 3 ? 0.6 : 1 }}>Save {chosen.length} mapping(s)</button>
    </div>
  );
}

function ExceptionRow({ item, artifacts, closed, onDone, onError }: { item: Item; artifacts: Artifact[]; closed: boolean; onDone: () => void; onError: (e: unknown) => void }) {
  const [mode, setMode] = useState<"" | "exclude" | "remap">("");
  const [why, setWhy] = useState("");
  const [art, setArt] = useState(item.artifact_num ?? "");
  const [status, setStatus] = useState(item.target_status ?? "");
  const [title, setTitle] = useState(item.title ?? item.raw.title ?? "");
  async function patch(body: Record<string, unknown>) {
    try { await apiFetch(`/import-items/${item.id}`, { method: "PATCH", body: JSON.stringify(body) }); setMode(""); onDone(); } catch (e) { onError(e); }
  }
  return (
    <div style={{ borderTop: `0.5px solid ${C.bgSec}`, padding: "8px 0" }}>
      <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
        <strong style={{ fontSize: "12px", flex: 1 }}>{item.source_path}{item.source_id ? ` (${item.source_id})` : ""}</strong>
        {item.state === "excluded" ? <span style={{ fontSize: "11px", color: C.textTert }}>Excluded: {item.exclusion_reason}</span> : null}
        {!closed && item.state === "exception" && !mode && <>
          <button onClick={() => setMode("remap")} style={btn}>Fix values</button>
          <button onClick={() => setMode("exclude")} style={btn}>Exclude</button>
        </>}
        {!closed && item.state === "excluded" && <button onClick={() => patch({ include: true })} style={btn}>Include again</button>}
      </div>
      {item.state === "exception" && <ul style={{ margin: "2px 0 0", paddingLeft: "18px", fontSize: "11px", color: C.warn }}>{item.exceptions.map((e) => <li key={e}>{e}</li>)}</ul>}
      {mode === "exclude" && (
        <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
          <input aria-label="Justification" value={why} onChange={(e) => setWhy(e.target.value)} placeholder="Justification (kept in the audit report)" style={input} />
          <button disabled={why.trim().length < 3} onClick={() => patch({ exclude: why.trim() })} style={{ ...primary, opacity: why.trim().length < 3 ? 0.6 : 1 }}>Exclude</button>
          <button onClick={() => setMode("")} style={btn}>Back</button>
        </div>
      )}
      {mode === "remap" && (
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 2fr auto auto", gap: "6px", marginTop: "6px" }}>
          <select aria-label="Artifact" value={art} onChange={(e) => setArt(e.target.value)} style={input}><option value="">Artifact…</option>{artifacts.map((a) => <option key={a.a} value={a.a}>{a.a} {a.an}</option>)}</select>
          <select aria-label="Target status" value={status} onChange={(e) => setStatus(e.target.value)} style={input}><option value="">Status…</option><option>Final</option><option>Draft</option></select>
          <input aria-label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" style={input} />
          <button onClick={() => patch({ artifact_num: art || null, target_status: status || null, title: title.trim() || null })} style={primary}>Save</button>
          <button onClick={() => setMode("")} style={btn}>Back</button>
        </div>
      )}
    </div>
  );
}
