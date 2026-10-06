// Part 14h — TMF Reference Model Exchange Mechanism Standard (eTMF-EMS v1.0, MIG-09).
// Package layout: <TRANSFERID>/exchange.xml at the root of the folder tree, files under
// <zone>/<zone.section>/<zone.section.artifact>/ (lowercase ASCII, spec 5.1). exchange.xml follows the published
// TmfReferenceModelExchange.xsd (github.com/TmfRef/exchange-framework): BATCH attributes, OBJECT/FILE/
// SIGNATURE/AUDITRECORD/METADATA child elements in schema order, INTEGRITY as a Subresource-Integrity value
// (sha256-<base64>). Export reads AS THE USER, so a package never holds more than the requester may see
// (zone permissions and blinding included). Import stages files into an isolated Part 12b batch.
import { createHash } from "node:crypto";
import countries from "i18n-iso-countries";
import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";
import type { RequestContext } from "./auth";
import { EXPORT_DAYS, MAX_BYTES, MAX_FILES, finishExport, notifyExport, type ExportJob } from "./exporter";
import { people } from "./qc";
import { serviceClient } from "./service";
import { stagingPrefix, type Batch } from "./imports";

export const EMS_NAMESPACE = "https://tmfrefmodel.com/ems";
export const TRANSFER_SOURCE_PREFIX = "TMF360";
const MAX_IMPORT_BYTES = 300 * 1024 * 1024;

const hex = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");
const sri = (b: Uint8Array) => `sha256-${createHash("sha256").update(b).digest("base64")}`;
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;")
  // XML 1.0 forbids most control characters.
  .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");
const el = (name: string, value: string | null | undefined, pad = "        ") => (value == null || value === "" ? "" : `${pad}<${name}>${esc(value)}</${name}>\n`);
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

/** ISO date (yyyy-mm-dd or timestamp) → DD-MON-YYYY (spec 5.3.2 date format). */
export function emsDate(iso: string | null | undefined): string | null {
  const m = iso && /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}-${MONTHS[Number(m[2]) - 1]}-${m[1]}` : null;
}
/** DD-MON-YYYY → yyyy-mm-dd. */
export function isoDate(ems: string | null | undefined): string | null {
  const m = ems && /^(\d{2})-([A-Za-z]{3})-(\d{4})$/.exec(ems.trim());
  const mon = m ? MONTHS.indexOf(m[2].toUpperCase()) : -1;
  return m && mon >= 0 ? `${m[3]}-${String(mon + 1).padStart(2, "0")}-${m[1]}` : null;
}
/** UTC ISO 8601 with an explicit offset, as the spec's examples (2016-04-13T14:00:25+00:00). */
const utc = (t: string) => new Date(/Z|[+-]\d\d:?\d\d$/.test(t) ? t : `${t}Z`).toISOString().replace(/\.\d{3}Z$/, "+00:00");

function auditType(action: string): "New" | "Change" | "Delete" | "Other" {
  if (/upload|creat|filed|added|import/i.test(action)) return "New";
  if (/delet/i.test(action)) return "Delete";
  if (/chang|edit|updat|reclass|approv|reject|return|submit|revis|certif|blind|restor|archiv/i.test(action)) return "Change";
  return "Other";
}

type Doc = { id: string; artifact_num: string | null; artifact_name: string | null; custom_file_name: string | null; status: string | null; version: string | null;
  file_name: string | null; file_path: string | null; file_hash: string | null; effective_date: string | null; expiry_date: string | null; approved_at: string | null;
  study_country_id: string | null; study_site_id: string | null; blinded: boolean | null; certified_copy: boolean | null; taxonomy_artifact_id: string | null; owner: string | null };
export type EmsOptions = { specification_id: string; event_id?: string; include_superseded?: boolean; scope?: "final" | "current" };

/**
 * Builds the exchange package for a study. Records without a TMF RM Unique ID (organisation-specific
 * artifacts) can't be described in the standard and are listed as skipped.
 */
export async function buildEmsPackage(ctx: RequestContext, job: ExportJob & { options: EmsOptions }) {
  const { data: study, error: sErr } = await ctx.db.from("studies").select("id, study_id, taxonomy_version_id").eq("id", job.study_id).single();
  if (sErr || !study) throw new Error("The study could not be read");
  const { data: ver } = await ctx.db.from("taxonomy_versions").select("version").eq("id", study.taxonomy_version_id).maybeSingle();
  const tmfrm = /^\d{1,2}\.\d{1,2}(\.\d{1,2})?$/.exec(ver?.version ?? "")?.[0];
  if (!tmfrm) throw new Error("The study is not pinned to a TMF Reference Model version (for example 3.3.1)");

  let q = ctx.db.from("documents").select("id, artifact_num, artifact_name, custom_file_name, status, version, file_name, file_path, file_hash, effective_date, expiry_date, " +
    "approved_at, study_country_id, study_site_id, blinded, certified_copy, taxonomy_artifact_id, owner")
    .eq("org_id", job.org_id).eq("study_id", study.study_id).is("deleted_at", null).is("archived_at", null).not("file_path", "is", null);
  q = job.options.scope === "current" ? q.neq("status", "Archived") : q.eq("status", "Approved");
  const { data: rows, error } = await q.order("artifact_num").limit(MAX_FILES + 1);
  if (error) throw new Error(`Documents could not be read: ${error.message}`);
  const docs = (rows ?? []) as unknown as Doc[];
  if (docs.length > MAX_FILES) throw new Error(`More than ${MAX_FILES} documents: narrow the export`);

  const ids = docs.map((d) => d.id);
  const chunks = <T,>(xs: T[], n: number) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));
  const byDoc = async <T extends { document_id: string }>(table: string, cols: string, order: string) => {
    const out = new Map<string, T[]>();
    for (const part of chunks(ids, 200)) {
      const { data, error: e } = await ctx.db.from(table).select(cols).in("document_id", part).order(order);
      if (e) throw new Error(`${table} could not be read: ${e.message}`);
      for (const r of (data ?? []) as unknown as T[]) out.set(r.document_id, [...(out.get(r.document_id) ?? []), r]);
    }
    return out;
  };
  type Audit = { document_id: string; sequence_no: number | null; id: string; created_at: string; user_email: string | null; user_id: string | null; action: string };
  type Sig = { document_id: string; id: string; signer_name: string | null; signer_email: string | null; signed_at: string; meaning: string | null; action: string | null };
  type FileVer = { document_id: string; version_no: number; file_path: string; file_name: string | null };
  const [arts, cs, ss, audits, sigs, fileVers, who] = await Promise.all([
    ctx.db.from("taxonomy_artifacts").select("id, unique_id, artifact_num").eq("version_id", study.taxonomy_version_id),
    ctx.db.from("study_countries").select("id, country_code").eq("study_id", study.id),
    ctx.db.from("study_sites").select("id, site_number, study_country_id").eq("study_id", study.id),
    byDoc<Audit>("audit_trail", "document_id, id, sequence_no, created_at, user_email, user_id, action", "created_at"),
    byDoc<Sig>("signature_events", "document_id, id, signer_name, signer_email, signed_at, meaning, action", "signed_at"),
    job.options.include_superseded ? byDoc<FileVer>("document_file_versions", "document_id, version_no, file_path, file_name", "version_no") : Promise.resolve(new Map<string, FileVer[]>()),
    people(ctx),
  ]);
  const uidById = new Map((arts.data ?? []).map((a) => [a.id, a.unique_id as string]));
  const uidByNum = new Map((arts.data ?? []).map((a) => [a.artifact_num as string, a.unique_id as string]));
  const country = new Map((cs.data ?? []).map((c) => [c.id, c.country_code as string]));
  const site = new Map((ss.data ?? []).map((s) => [s.id, s]));

  const transferId = `${new Date().toISOString().replace(/\D/g, "").slice(0, 14)}-${job.id.slice(0, 8)}`;
  const source = `${TRANSFER_SOURCE_PREFIX}-${job.org_id.slice(0, 8)}`;
  const zip = new JSZip();
  const root = zip.folder(transferId)!;
  const skipped: { document_id: string; reason: string }[] = [];
  let bytes = 0, files = 0, objects = 0;
  const parts: string[] = [];

  for (const d of docs) {
    const uid = (d.taxonomy_artifact_id && uidById.get(d.taxonomy_artifact_id)) || (d.artifact_num && uidByNum.get(d.artifact_num));
    if (!uid || !/^\d{2}\.\d{2}\.\d{2}$/.test(d.artifact_num ?? "")) { skipped.push({ document_id: d.id, reason: `No TMF RM Unique ID for artifact ${d.artifact_num ?? "(none)"}` }); continue; }
    const s = d.study_site_id ? site.get(d.study_site_id) : undefined;
    const cc2 = d.study_country_id ? country.get(d.study_country_id) : s?.study_country_id ? country.get(s.study_country_id) : undefined;
    const cc3 = cc2 ? countries.alpha2ToAlpha3(cc2.toUpperCase()) : undefined;
    const level = s ? "Site" : cc2 ? "Country" : "Trial";
    if (level !== "Trial" && !cc3) { skipped.push({ document_id: d.id, reason: `Unknown country code ${cc2}` }); continue; }
    const [z, sec] = [d.artifact_num!.slice(0, 2), d.artifact_num!.slice(0, 5)];
    const folder = `${z}/${sec}/${d.artifact_num}`;
    const title = (d.custom_file_name || "").trim() || d.artifact_name || "";

    const versions: { path: string; name: string | null; label: string; state: "Current" | "Superseded"; current: boolean }[] = [];
    const earlier = (fileVers.get(d.id) ?? []).filter((v) => v.file_path !== d.file_path);
    for (const v of earlier) versions.push({ path: v.file_path, name: v.file_name, label: `${d.version || "1"} (file ${v.version_no})`, state: "Superseded", current: false });
    versions.push({ path: d.file_path!, name: d.file_name, label: d.version || "1", state: "Current", current: true });

    for (const v of versions) {
      const { data: blob, error: dErr } = await ctx.db.storage.from("Documents").download(v.path);
      if (dErr || !blob) throw new Error(`File missing for "${title}" (${d.artifact_num})`);
      const buf = new Uint8Array(await blob.arrayBuffer());
      bytes += buf.length;
      if (bytes > MAX_BYTES) throw new Error(`The package is larger than ${Math.round(MAX_BYTES / 1048576)} MB: narrow the export`);
      const ext = ((v.name ?? "").match(/\.[A-Za-z0-9]{1,8}$/)?.[0] ?? ".bin").toLowerCase();
      const fileName = `${d.id}${v.current ? "" : `-superseded-${versions.indexOf(v) + 1}`}${ext}`;
      root.file(`${folder}/${fileName}`, buf, { binary: true });
      files++; objects++;
      const sig = v.current ? (sigs.get(d.id) ?? []) : [];
      const aud = v.current ? (audits.get(d.id) ?? []) : [];
      const person = d.owner ? who.get(d.owner)?.name ?? d.owner : null;
      parts.push(
        "    <OBJECT>\n" +
        el("OBJECTID", d.id) + el("OBJECTLEVEL", level) + el("COUNTRYID", level === "Trial" ? null : cc3) +
        el("SITESYSTEMID", s?.id) + el("SITEID", s?.site_number) + el("UNIQUEID", uid) + el("ARTIFACTNUMBER", d.artifact_num) +
        el("PERSONNAME", person) + el("TRANSLATION", "No") + el("OBJECTVERSION", v.label) + el("OBJECTVERSIONSTATE", v.state) +
        el("OBJECTTITLE", title) + el("SUBARTIFACT", d.artifact_name) + el("OBJECTCOPY", d.certified_copy ? "Yes" : "No") +
        el("OBJECTEXPIRYDATE", emsDate(d.expiry_date)) + el("RESTRICTED", d.blinded ? "Yes" : "No") +
        (d.effective_date ? el("ARTIFACTDATE", emsDate(d.effective_date)) + el("DATEDESCRIPTION", "Effective") :
          d.approved_at ? el("ARTIFACTDATE", emsDate(d.approved_at)) + el("DATEDESCRIPTION", "Approval") : "") +
        "        <FILE>\n" +
        el("INTEGRITY", sri(buf), "            ") + el("FILENAME", fileName, "            ") + el("CONTENTURL", `${folder}/${fileName}`, "            ") +
        el("FILEDESCRIPTION", v.current ? "Record" : "Superseded file version", "            ") +
        sig.map((g) => "            <SIGNATURE>\n" + el("SIGNATUREMETHODOLOGY", "Electronic", "                ") +
          el("USEROID", g.signer_email || "unknown", "                ") + el("SIGNATURENAME", g.signer_name || g.signer_email || "unknown", "                ") +
          el("SIGNATUREDATETIME", utc(g.signed_at), "                ") + el("SIGNATUREREASON", g.meaning || g.action || "Signed", "                ") + "            </SIGNATURE>\n").join("") +
        aud.map((a) => "            <AUDITRECORD>\n" + el("AUDITID", String(a.sequence_no ?? a.id), "                ") + el("DATETIMESTAMP", utc(a.created_at), "                ") +
          el("USERREF", a.user_email || a.user_id || "system", "                ") + el("AUDITENTRYTYPE", auditType(a.action), "                ") +
          el("AUDITEVENT", a.action || "Other", "                ") + "            </AUDITRECORD>\n").join("") +
        "        </FILE>\n" +
        `        <METADATA NAME="TMF360STATUS">${esc(d.status === "Approved" ? "Final" : d.status ?? "")}</METADATA>\n` +
        (v.current && hex(buf) !== (d.file_hash ?? "").toLowerCase() && d.file_hash ? `        <METADATA NAME="TMF360HASHNOTE">Stored hash differs from the exported file</METADATA>\n` : "") +
        "    </OBJECT>\n");
    }
  }
  if (!objects) throw new Error("No documents can be exported in the exchange format (none have a TMF RM Unique ID)");
  const attrs: [string, string | undefined][] = [["STUDYSYSTEMID", study.id], ["STUDYID", study.study_id], ["EVENTID", job.options.event_id], ["TRANSFERSOURCEID", source],
    ["TRANSFERID", transferId], ["SPECIFICATIONID", job.options.specification_id], ["TMFRMVERSION", tmfrm]];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<BATCH xmlns="${EMS_NAMESPACE}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ` +
    `xsi:schemaLocation="${EMS_NAMESPACE} TmfReferenceModelExchange.xsd"\n       ` +
    attrs.filter(([, v]) => v).map(([k, v]) => `${k}="${esc(v!)}"`).join("\n       ") + ">\n" + parts.join("") + "</BATCH>\n";
  root.file("exchange.xml", xml);
  return { zip, xml, transferId, source, tmfrm, objects, files, skipped, study };
}

/** Runs an EMS export job (never throws: failures are stored on the job). */
export async function runEmsExport(ctx: RequestContext, job: ExportJob & { options: EmsOptions }) {
  const svc = serviceClient();
  await svc.from("export_jobs").update({ status: "running", started_at: new Date().toISOString() }).eq("id", job.id);
  try {
    const pkg = await buildEmsPackage(ctx, job);
    const issues = validateExchange(pkg.xml);
    if (issues.length) throw new Error(`exchange.xml failed validation: ${issues.slice(0, 3).join("; ")}`);
    const bytes = await pkg.zip.generateAsync({ type: "uint8array", compression: "DEFLATE", compressionOptions: { level: 1 } });
    const { error } = await svc.from("ems_transfers").insert([{ org_id: job.org_id, study_id: job.study_id, direction: "export", transfer_source_id: pkg.source, transfer_id: pkg.transferId,
      specification_id: job.options.specification_id, event_id: job.options.event_id ?? null, tmfrm_version: pkg.tmfrm, objects: pkg.objects, files: pkg.files,
      skipped: pkg.skipped, exchange_xml_sha256: hex(new TextEncoder().encode(pkg.xml)), export_job_id: job.id, requested_by: ctx.user.id }]);
    if (error) throw new Error(`Could not record the transfer: ${error.message}`);
    await finishExport(job, bytes, pkg.files);
    await notifyExport(ctx, job, true, `TMF exchange package ${pkg.transferId}: ${pkg.objects} objects from study ${pkg.study.study_id}` +
      (pkg.skipped.length ? `; ${pkg.skipped.length} records skipped (no TMF RM Unique ID)` : "") + `. Download link valid ${EXPORT_DAYS} days.`);
  } catch (e) {
    const message = (e as Error).message.slice(0, 500);
    await svc.from("export_jobs").update({ status: "failed", error: message, finished_at: new Date().toISOString() }).eq("id", job.id);
    await notifyExport(ctx, job, false, message).catch(() => {});
  }
}

// ---------------------------------------------------------------------------------------------------------
// Parsing and validation
// ---------------------------------------------------------------------------------------------------------
type XFile = { INTEGRITY?: string; FILENAME?: string; CONTENTURL?: string; FILEDESCRIPTION?: string; SIGNATURE?: Record<string, string>[]; AUDITRECORD?: Record<string, string>[] };
export type XObject = Record<string, string | undefined> & { FILE?: XFile[]; METADATA?: ({ "#text"?: string; NAME?: string } | string)[]; PERSONNAME?: string[] };
export type XBatch = Record<string, string | undefined> & { OBJECT?: XObject[] };

const parser = new XMLParser({
  ignoreAttributes: false, attributeNamePrefix: "", removeNSPrefix: true, parseTagValue: false, parseAttributeValue: false, trimValues: true,
  isArray: (name) => ["OBJECT", "FILE", "SIGNATURE", "AUDITRECORD", "METADATA", "PERSONNAME"].includes(name),
});

export function parseExchange(xml: string): XBatch {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error("exchange.xml must not contain a DTD");
  const doc = parser.parse(xml) as { BATCH?: XBatch };
  if (!doc.BATCH) throw new Error("exchange.xml has no BATCH element");
  return doc.BATCH;
}

const ORDER_OBJECT = ["OBJECTID", "OBJECTLEVEL", "COUNTRYID", "SITESYSTEMID", "SITEID", "UNIQUEID", "ARTIFACTNUMBER", "PERSONNAME", "ORGANIZATIONNAME", "OBJECTLANGUAGE",
  "TRANSLATION", "OBJECTVERSION", "OBJECTVERSIONSTATE", "OBJECTTITLE", "SUBARTIFACT", "OBJECTCOPY", "OBJECTEXPIRYDATE", "RESTRICTED", "RENTENTIONDATE", "ARTIFACTDATE",
  "DATEDESCRIPTION", "FILE", "METADATA"];

/**
 * The XSD's rules (required elements and attributes, enumerations and patterns), checked on the parsed
 * document. Returns human-readable problems; empty when valid.
 */
export function validateExchange(xml: string): string[] {
  const out: string[] = [];
  let b: XBatch;
  try { b = parseExchange(xml); } catch (e) { return [(e as Error).message]; }
  if (!/<BATCH[^>]*xmlns="https:\/\/tmfrefmodel\.com\/ems"/.test(xml)) out.push(`BATCH must be in the ${EMS_NAMESPACE} namespace`);
  for (const a of ["STUDYID", "TRANSFERSOURCEID", "TRANSFERID", "SPECIFICATIONID", "TMFRMVERSION"]) if (!b[a]?.trim()) out.push(`BATCH ${a} is required`);
  if (b.TMFRMVERSION && !/^(([1-9][0-9])|[0-9])\.(([1-9][0-9])|[0-9])(\.(([1-9][0-9])|[0-9]))?$/.test(b.TMFRMVERSION)) out.push(`TMFRMVERSION ${b.TMFRMVERSION} is not like 3.0 or 3.3.1`);
  const objs = b.OBJECT ?? [];
  if (!objs.length) out.push("BATCH needs at least one OBJECT");
  const nonEmpty = (o: Record<string, unknown>, k: string, where: string) => { if (typeof o[k] !== "string" || !(o[k] as string).length) out.push(`${where}: ${k} is required`); };
  const yesNo = (o: Record<string, unknown>, k: string, where: string, required = false) => {
    if (o[k] === undefined) { if (required) out.push(`${where}: ${k} is required`); } else if (!["Yes", "No"].includes(o[k] as string)) out.push(`${where}: ${k} must be Yes or No`);
  };
  const date = (o: Record<string, unknown>, k: string, where: string) => { if (o[k] !== undefined && !/^\d{2}-[a-zA-Z]{3}-\d{4}$/.test(o[k] as string)) out.push(`${where}: ${k} must be DD-MON-YYYY`); };
  const dt = (v: unknown) => typeof v === "string" && /^-?\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/.test(v);
  objs.forEach((o, i) => {
    const w = `OBJECT ${i + 1}`;
    for (const k of Object.keys(o)) if (!ORDER_OBJECT.includes(k)) out.push(`${w}: unknown element ${k}`);
    nonEmpty(o, "OBJECTID", w);
    if (!["Trial", "Country", "Site"].includes(o.OBJECTLEVEL ?? "")) out.push(`${w}: OBJECTLEVEL must be Trial, Country or Site`);
    if (o.COUNTRYID !== undefined && !/^[A-Z]{3}$/.test(o.COUNTRYID)) out.push(`${w}: COUNTRYID must be ISO 3166 alpha-3`);
    if (!/^[+-]?\d+$/.test(o.UNIQUEID ?? "")) out.push(`${w}: UNIQUEID must be a number`);
    if (!/^\d{2}\.\d{2}\.\d{2}$/.test(o.ARTIFACTNUMBER ?? "")) out.push(`${w}: ARTIFACTNUMBER must be like 01.01.01`);
    if (o.OBJECTLANGUAGE !== undefined && !/^[a-z]{2}$/.test(o.OBJECTLANGUAGE)) out.push(`${w}: OBJECTLANGUAGE must be an ISO 639-1 code`);
    yesNo(o, "TRANSLATION", w); yesNo(o, "OBJECTCOPY", w, true); yesNo(o, "RESTRICTED", w);
    nonEmpty(o, "OBJECTVERSION", w);
    if (!["Current", "Superseded", "Obsolete"].includes(o.OBJECTVERSIONSTATE ?? "")) out.push(`${w}: OBJECTVERSIONSTATE must be Current, Superseded or Obsolete`);
    date(o, "OBJECTEXPIRYDATE", w); date(o, "RENTENTIONDATE", w); date(o, "ARTIFACTDATE", w);
    if (!o.FILE?.length) out.push(`${w}: at least one FILE is required`);
    (o.FILE ?? []).forEach((f, j) => {
      const fw = `${w} FILE ${j + 1}`;
      nonEmpty(f, "INTEGRITY", fw); nonEmpty(f, "FILENAME", fw); nonEmpty(f, "CONTENTURL", fw);
      for (const g of f.SIGNATURE ?? []) {
        if (!["Electronic", "Digital"].includes(g.SIGNATUREMETHODOLOGY)) out.push(`${fw}: SIGNATUREMETHODOLOGY must be Electronic or Digital`);
        for (const k of ["USEROID", "SIGNATURENAME", "SIGNATUREREASON"]) nonEmpty(g, k, `${fw} SIGNATURE`);
        if (!dt(g.SIGNATUREDATETIME)) out.push(`${fw}: SIGNATUREDATETIME must be ISO 8601`);
      }
      for (const a of f.AUDITRECORD ?? []) {
        for (const k of ["AUDITID", "USERREF", "AUDITEVENT"]) nonEmpty(a, k, `${fw} AUDITRECORD`);
        if (!dt(a.DATETIMESTAMP)) out.push(`${fw}: DATETIMESTAMP must be ISO 8601`);
        if (!["New", "Change", "Delete", "Other"].includes(a.AUDITENTRYTYPE)) out.push(`${fw}: AUDITENTRYTYPE must be New, Change, Delete or Other`);
      }
    });
    for (const m of o.METADATA ?? []) if (typeof m === "string" || !m.NAME) out.push(`${w}: METADATA needs a NAME attribute`);
  });
  return out;
}

/** Checks a file against an INTEGRITY value: SRI (sha256-/sha384-/sha512- + base64) or the same with hex. */
export function integrityMatches(integrity: string, bytes: Uint8Array): boolean {
  const m = /^(sha256|sha384|sha512)-(.+)$/i.exec(integrity.trim());
  if (!m) return false;
  const h = createHash(m[1].toLowerCase()).update(bytes);
  const digest = h.digest();
  const v = m[2].trim();
  return v.toLowerCase() === digest.toString("hex") || v === digest.toString("base64");
}

// ---------------------------------------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------------------------------------
export type EmsImportResult = { transfer_id: string; transfer_source_id: string; tmfrm_version: string; added: number; skipped: { object_id: string; reason: string }[] };

/**
 * Reads an EMS package already staged in the batch folder, validates exchange.xml, checks every file's
 * INTEGRITY, stages the files (named by their SHA-256 so the server re-hash verifies them) and registers
 * one import item per Current object. Superseded and Obsolete objects are reported, not imported.
 */
export async function importEmsPackage(ctx: RequestContext, b: Batch, zipPath: string): Promise<EmsImportResult> {
  const prefix = stagingPrefix(b);
  const { data: blob, error } = await ctx.db.storage.from("Documents").download(zipPath);
  if (error || !blob) throw new Error("The package could not be read from the batch folder");
  if (blob.size > MAX_IMPORT_BYTES) throw new Error(`The package is larger than ${MAX_IMPORT_BYTES / 1048576} MB`);
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const xmlEntry = Object.values(zip.files).filter((f) => !f.dir && /(^|\/)exchange\.xml$/i.test(f.name)).sort((a, c) => a.name.length - c.name.length)[0];
  if (!xmlEntry) throw new Error("The package has no exchange.xml");
  const base = xmlEntry.name.slice(0, xmlEntry.name.length - "exchange.xml".length);
  const xmlBytes = await xmlEntry.async("uint8array");
  const xml = new TextDecoder().decode(xmlBytes);
  const issues = validateExchange(xml);
  if (issues.length) throw new Error(`exchange.xml is not valid: ${issues.slice(0, 5).join("; ")}`);
  const batch = parseExchange(xml);

  const svc = serviceClient();
  const { data: dup } = await svc.from("ems_transfers").select("id").eq("org_id", b.org_id).eq("direction", "import")
    .eq("transfer_source_id", batch.TRANSFERSOURCEID!).eq("transfer_id", batch.TRANSFERID!).maybeSingle();
  if (dup) throw new Error(`Transfer ${batch.TRANSFERID} from ${batch.TRANSFERSOURCEID} was already imported`);

  // The Unique ID never changes between TMF RM versions (spec 3.2.1), so it maps into the study's version.
  const { data: study } = await ctx.db.from("studies").select("taxonomy_version_id").eq("id", b.study_id).single();
  const { data: arts } = await ctx.db.from("taxonomy_artifacts").select("unique_id, artifact_num").eq("version_id", study?.taxonomy_version_id ?? "");
  const byUid = new Map((arts ?? []).map((a) => [Number(a.unique_id), a.artifact_num as string]));

  const skipped: EmsImportResult["skipped"] = [];
  const items: Record<string, unknown>[] = [];
  let staged = 0;
  for (const o of batch.OBJECT ?? []) {
    const id = o.OBJECTID!;
    if (o.OBJECTVERSIONSTATE !== "Current") { skipped.push({ object_id: id, reason: `${o.OBJECTVERSIONSTATE} version ${o.OBJECTVERSION} (only Current records are filed)` }); continue; }
    const f = o.FILE!.find((x) => /record/i.test(x.FILEDESCRIPTION ?? "")) ?? o.FILE![0];
    const rel = (f.CONTENTURL ?? "").replace(/\\/g, "/").replace(/^\.\//, "");
    if (rel.split("/").some((p) => p === ".." ) || rel.startsWith("/")) { skipped.push({ object_id: id, reason: `Unsafe CONTENTURL ${rel}` }); continue; }
    const entry = zip.file(base + rel) ?? zip.file(base + decodeURI(rel));
    if (!entry) { skipped.push({ object_id: id, reason: `File ${rel} is not in the package` }); continue; }
    const bytes = await entry.async("uint8array");
    if (!integrityMatches(f.INTEGRITY!, bytes)) { skipped.push({ object_id: id, reason: `File ${rel} does not match its INTEGRITY value` }); continue; }
    const sha = hex(bytes);
    const ext = (f.FILENAME ?? rel).match(/\.[A-Za-z0-9]{1,8}$/)?.[0]?.toLowerCase() ?? "";
    const path = `${prefix}${sha}${ext}`;
    const up = await ctx.db.storage.from("Documents").upload(path, bytes, { contentType: ext === ".pdf" ? "application/pdf" : "application/octet-stream", upsert: false });
    if (up.error && !/exist|duplicate/i.test(up.error.message)) throw new Error(`Could not stage ${rel}: ${up.error.message}`);
    staged++;
    const created = (f.AUDITRECORD ?? []).find((a) => a.AUDITENTRYTYPE === "New")?.DATETIMESTAMP;
    const meta = Object.fromEntries((o.METADATA ?? []).filter((m): m is { NAME: string; "#text"?: string } => typeof m !== "string" && !!m.NAME).map((m) => [`ems_meta_${m.NAME}`.slice(0, 60), String(m["#text"] ?? "").slice(0, 2000)]));
    const raw: Record<string, string> = {
      document_type: byUid.get(Number(o.UNIQUEID)) ?? o.ARTIFACTNUMBER!,
      status: "Final",
      title: (o.OBJECTTITLE || o.SUBARTIFACT || f.FILENAME || id).slice(0, 2000),
      version: o.OBJECTVERSION!.slice(0, 2000),
      source_id: id.slice(0, 300),
      ems_unique_id: o.UNIQUEID!, ems_artifact_number: o.ARTIFACTNUMBER!, ems_level: o.OBJECTLEVEL!,
      ems_restricted: o.RESTRICTED ?? "No", ems_copy: o.OBJECTCOPY!, ems_signatures: String(f.SIGNATURE?.length ?? 0), ems_audit_records: String(f.AUDITRECORD?.length ?? 0),
      ...meta,
    };
    if (o.SITEID) raw.site = o.SITEID;
    if (o.COUNTRYID) raw.country = countries.alpha3ToAlpha2(o.COUNTRYID) ?? o.COUNTRYID;
    if (o.ARTIFACTDATE && /effective/i.test(o.DATEDESCRIPTION ?? "")) raw.effective_date = isoDate(o.ARTIFACTDATE) ?? "";
    if (created) raw.created_date = created;
    if (o.PERSONNAME?.length) raw.owner = o.PERSONNAME.join("; ").slice(0, 2000);
    items.push({ org_id: b.org_id, batch_id: b.id, study_id: b.study_id, source_path: `${batch.TRANSFERID}/${rel}`.slice(0, 1000), source_id: id.slice(0, 300),
      file_path: path, file_name: (f.FILENAME ?? rel.split("/").pop() ?? "file").slice(0, 500), file_type: ext === ".pdf" ? "application/pdf" : null,
      file_size_bytes: bytes.length, declared_hash: sha, raw });
  }
  for (let i = 0; i < items.length; i += 500) {
    const { error: iErr } = await ctx.db.from("import_items").insert(items.slice(i, i + 500));
    if (iErr) throw new Error(`Could not register the items: ${iErr.message}`);
  }
  // The source exchange.xml (with its audit records and signatures) is kept with the batch as evidence.
  const xmlPath = `${prefix}exchange-${hex(xmlBytes)}.xml`;
  const upXml = await ctx.db.storage.from("Documents").upload(xmlPath, xmlBytes, { contentType: "application/xml", upsert: false });
  if (upXml.error && !/exist|duplicate/i.test(upXml.error.message)) throw new Error(`Could not keep exchange.xml: ${upXml.error.message}`);
  const { error: tErr } = await svc.from("ems_transfers").insert([{ org_id: b.org_id, study_id: b.study_id, direction: "import", transfer_source_id: batch.TRANSFERSOURCEID,
    transfer_id: batch.TRANSFERID, specification_id: batch.SPECIFICATIONID, event_id: batch.EVENTID ?? null, tmfrm_version: batch.TMFRMVERSION,
    objects: batch.OBJECT?.length ?? 0, files: staged, skipped, exchange_xml_sha256: hex(xmlBytes), exchange_xml_path: xmlPath, import_batch_id: b.id, requested_by: ctx.user.id }]);
  if (tErr) throw new Error(`Could not record the transfer: ${tErr.message}`);
  return { transfer_id: batch.TRANSFERID!, transfer_source_id: batch.TRANSFERSOURCEID!, tmfrm_version: batch.TMFRMVERSION!, added: items.length, skipped };
}
