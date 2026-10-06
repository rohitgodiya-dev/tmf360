// Part 11b/11c — ZIP export and archive packages (M16 EXP-02..04, Section 6 RET-04/05).
// A job is created as the user; this runs after the response (next/server `after`). Documents and
// files are read AS THE USER (RLS and storage policies apply), so a package never holds more than
// the requester may see. The finished ZIP goes to the private "exports" bucket via the service
// role, and the job is marked done with its size, file count and SHA-256.
import { createHash } from "node:crypto";
import JSZip from "jszip";
import type { RequestContext } from "./auth";
import { emailLayout, escapeHtml, sendEmail } from "../email";
import { DOC_COLS, placement } from "./reports";
import { people } from "./qc";
import { serviceClient } from "./service";
import { buildXlsx, type Cell } from "../xlsx";

export const MAX_FILES = 2000;
export const MAX_BYTES = 750 * 1024 * 1024;
export const EXPORT_DAYS = 7;

export type ExportJob = {
  id: string; org_id: string; study_id: string; kind: "zip" | "archive" | "transfer" | "ems"; status: string;
  options: { scope?: "final" | "current"; label?: string; recipient?: string; reason?: string; specification_id?: string; event_id?: string; include_superseded?: boolean }; requested_by: string;
};

type Doc = { id: string; artifact_num: string | null; artifact_name: string | null; custom_file_name: string | null; status: string | null;
  study_country_id: string | null; study_site_id: string | null; created_at: string; approved_at: string | null; effective_date: string | null;
  expiry_date: string | null; owner: string | null; file_name: string | null; version: string | null; file_hash: string | null; file_path: string | null;
  taxonomy_artifacts: { version_id: string; zone_num: string; section_num: string } | null };

/** Safe, readable path segment for any OS. */
export function segment(s: string, max = 80): string {
  const clean = s.replace(/[\u0000-\u001f<>:"/\\|?*]+/g, " ").replace(/\s+/g, " ").trim().replace(/[. ]+$/, "");
  return (clean || "untitled").slice(0, max).trim();
}

const sha = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");

export type PackageContents = { zip: JSZip; files: number; bytes: number; manifest: { path: string; sha256: string; bytes: number }[] };

/**
 * Builds the package in memory. `allVersions` adds every earlier file version (archive);
 * otherwise each document's current file only (EXP-02). Returns the ZIP and its manifest.
 */
export async function buildPackage(ctx: RequestContext, job: ExportJob, opts: { allVersions: boolean }): Promise<PackageContents & { study: { study_id: string; protocol: string | null } }> {
  const { data: study, error: sErr } = await ctx.db.from("studies").select("study_id, protocol").eq("id", job.study_id).single();
  if (sErr || !study) throw new Error("The study could not be read");
  let q = ctx.db.from("documents").select(DOC_COLS).eq("org_id", job.org_id).eq("study_id", study.study_id).is("deleted_at", null).not("file_path", "is", null);
  if (job.kind === "zip") {
    q = q.is("archived_at", null);
    q = job.options.scope === "final" ? q.eq("status", "Approved") : q.neq("status", "Archived");
  }
  const { data: rows, error } = await q.order("artifact_num").limit(MAX_FILES + 1);
  if (error) throw new Error(`Documents could not be read: ${error.message}`);
  const docs = (rows ?? []) as unknown as Doc[];
  if (docs.length > MAX_FILES) throw new Error(`More than ${MAX_FILES} documents: narrow the export (for example Final only)`);

  const [place, countries, sites] = await Promise.all([
    placement(ctx),
    ctx.db.from("study_countries").select("id, country_code").eq("study_id", job.study_id),
    ctx.db.from("study_sites").select("id, site_number, display_name").eq("study_id", job.study_id),
  ]);
  const country = new Map((countries.data ?? []).map((c) => [c.id, c.country_code as string]));
  const site = new Map((sites.data ?? []).map((s) => [s.id, `${s.site_number} ${s.display_name}`]));

  const root = segment(study.study_id);
  const zip = new JSZip();
  const used = new Set<string>();
  const manifest: PackageContents["manifest"] = [];
  const meta: Cell[][] = [];
  let bytes = 0;

  const unique = (p: string) => {
    let candidate = p, n = 2;
    const dot = p.lastIndexOf(".");
    while (used.has(candidate.toLowerCase())) candidate = dot > p.lastIndexOf("/") ? `${p.slice(0, dot)} (${n++})${p.slice(dot)}` : `${p} (${n++})`;
    used.add(candidate.toLowerCase());
    return candidate;
  };

  for (const d of docs) {
    const p = place(d);
    const folder = [root, segment(`${p.zone} ${p.zone_name}`), segment(`${p.section} ${p.section_name}`), segment(`${d.artifact_num ?? ""} ${d.artifact_name ?? ""}`)].join("/");
    const title = (d.custom_file_name || "").trim() || d.artifact_name || "document";
    let versions: { version_no: number | null; file_path: string; file_name: string | null; file_hash: string | null; current: boolean }[] =
      [{ version_no: null, file_path: d.file_path!, file_name: d.file_name, file_hash: d.file_hash, current: true }];
    if (opts.allVersions) {
      const { data: vs } = await ctx.db.from("document_file_versions").select("version_no, file_path, file_name, file_hash").eq("document_id", d.id).order("version_no");
      if (vs?.length) {
        const latest = Math.max(...vs.map((v) => v.version_no));
        versions = vs.map((v) => ({ ...v, current: v.version_no === latest }));
      }
    }
    for (const v of versions) {
      const { data: blob, error: dErr } = await ctx.db.storage.from("Documents").download(v.file_path);
      if (dErr || !blob) throw new Error(`File missing for "${title}" (${d.artifact_num})`);
      const buf = new Uint8Array(await blob.arrayBuffer());
      bytes += buf.length;
      if (bytes > MAX_BYTES) throw new Error(`The package is larger than ${Math.round(MAX_BYTES / 1048576)} MB: narrow the export`);
      const ext = (v.file_name ?? "").match(/\.[A-Za-z0-9]{1,8}$/)?.[0] ?? "";
      const label = opts.allVersions ? `${title} - file v${v.version_no ?? 1}${v.current ? " (current)" : ""}` : `${title}${d.version ? ` v${d.version}` : ""}`;
      const path = unique(`${folder}/${segment(label, 120)}${ext}`);
      zip.file(path, buf, { binary: true });
      const hash = sha(buf);
      manifest.push({ path, sha256: hash, bytes: buf.length });
      meta.push([path, title, d.artifact_num, `${p.zone} ${p.zone_name}`.trim(), `${p.section} ${p.section_name}`.trim(), d.status === "Approved" ? "Final" : d.status,
        d.version, v.version_no ?? "", v.current, d.effective_date, d.expiry_date, d.owner, d.study_country_id ? country.get(d.study_country_id) ?? "" : "",
        d.study_site_id ? site.get(d.study_site_id) ?? "" : "", new Date(d.created_at.match(/Z|[+-]\d\d:?\d\d$/) ? d.created_at : `${d.created_at}Z`),
        d.approved_at ?? "", hash, v.file_hash ? (v.file_hash.toLowerCase() === hash ? "Yes" : "NO - differs from stored hash") : "No stored hash", d.id]);
    }
  }

  zip.file(`${root}/metadata.xlsx`, await buildXlsx([{
    name: "Documents",
    columns: ["Path in package", "Title", "Artifact", "Zone", "Section", "Status", "Version", "File version", "Current file", "Effective date", "Expiry date",
      "Owner", "Country", "Site", "Filed (UTC)", "Final", "SHA-256", "Matches stored hash", "Document ID"],
    rows: meta,
  }]));
  return { zip, files: manifest.length, bytes, manifest, study };
}

export async function finishExport(job: ExportJob, zipBytes: Uint8Array, files: number) {
  const svc = serviceClient();
  const path = `${job.org_id}/${job.id}.zip`;
  const up = await svc.storage.from("exports").upload(path, zipBytes, { contentType: "application/zip", upsert: false });
  if (up.error) throw new Error(`Could not store the package: ${up.error.message}`);
  const { error } = await svc.from("export_jobs").update({
    status: "done", file_path: path, file_size: zipBytes.length, file_count: files, file_hash: sha(zipBytes),
    finished_at: new Date().toISOString(), expires_at: new Date(Date.now() + EXPORT_DAYS * 86400000).toISOString(),
  }).eq("id", job.id);
  if (error) throw new Error(`Could not mark the export done: ${error.message}`);
}

export async function notifyExport(ctx: RequestContext, job: ExportJob, ok: boolean, detail: string) {
  if (!ctx.user.email) return;
  const what = job.kind === "zip" ? "TMF export" : job.kind === "archive" ? "archive package" : job.kind === "ems" ? "TMF exchange package" : "transfer package";
  await sendEmail(ctx.user.email, ok ? `Your ${what} is ready` : `Your ${what} failed`, emailLayout(ok ? `Your ${what} is ready` : `Your ${what} failed`,
    `<p style="color:#374151;font-size:14px">${escapeHtml(detail)}</p><p style="color:#374151;font-size:14px">Open TMF360 &rarr; Reports &amp; exports to download it. The download link works for ${EXPORT_DAYS} days and every download is recorded.</p>`));
}

/** Runs a ZIP export job to completion (EXP-02/04). Never throws: failures are stored on the job. */
export async function runZipExport(ctx: RequestContext, job: ExportJob) {
  const svc = serviceClient();
  await svc.from("export_jobs").update({ status: "running", started_at: new Date().toISOString() }).eq("id", job.id);
  try {
    const pkg = await buildPackage(ctx, job, { allVersions: false });
    pkg.zip.file(`${segment(pkg.study.study_id)}/README.txt`, [
      `TMF export - study ${pkg.study.study_id}${pkg.study.protocol ? ` (${pkg.study.protocol})` : ""}`,
      `Generated: ${new Date().toISOString()} by ${ctx.user.email ?? ctx.user.id}`,
      `Scope: ${job.options.scope === "final" ? "Final documents" : "all current documents"}, current file of each document.`,
      "Folders follow the taxonomy version each document is classified under: zone / section / artifact.",
      "metadata.xlsx lists every file with its metadata and SHA-256; a mismatch with the stored hash is flagged.",
    ].join("\r\n"));
    const bytes = await pkg.zip.generateAsync({ type: "uint8array", compression: "DEFLATE", compressionOptions: { level: 1 } });
    await finishExport(job, bytes, pkg.files);
    await notifyExport(ctx, job, true, `${pkg.files} files from study ${pkg.study.study_id} (${Math.round(bytes.length / 1024)} KB).`);
  } catch (e) {
    const message = (e as Error).message.slice(0, 500);
    await svc.from("export_jobs").update({ status: "failed", error: message, finished_at: new Date().toISOString() }).eq("id", job.id);
    await notifyExport(ctx, job, false, message).catch(() => {});
  }
}

/**
 * Runs an archive or transfer package (RET-04/05): every file version of every document (including
 * archived ones), metadata, metadata history, the study's audit trail, signatures and QC decisions,
 * a manifest of SHA-256 hashes, and for a transfer the signed transfer record. Never throws.
 */
export async function runArchiveExport(ctx: RequestContext, job: ExportJob) {
  const svc = serviceClient();
  await svc.from("export_jobs").update({ status: "running", started_at: new Date().toISOString() }).eq("id", job.id);
  try {
    const pkg = await buildPackage(ctx, job, { allVersions: true });
    const root = segment(pkg.study.study_id);
    const { data: docs } = await ctx.db.from("documents").select("id").eq("org_id", job.org_id).eq("study_id", pkg.study.study_id);
    const ids = (docs ?? []).map((d) => d.id as string);
    const chunks = <T,>(xs: T[], n: number) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));
    const byDocs = async (table: string, cols: string, order: string) => {
      const out: Record<string, unknown>[] = [];
      for (const part of chunks(ids, 200)) {
        const { data, error } = await ctx.db.from(table).select(cols).in("document_id", part).order(order);
        if (error) throw new Error(`${table} could not be read: ${error.message}`);
        out.push(...((data ?? []) as unknown as Record<string, unknown>[]));
      }
      return out;
    };
    const [auditRes, sigDocs, sigStudy, decisions, metaVersions, who] = await Promise.all([
      ctx.db.from("audit_trail").select("sequence_no, created_at, user_email, action, document_id, document_name, field_changed, old_value, new_value, signature_reason, record_hash, prev_hash")
        .eq("org_id", job.org_id).eq("study_id", pkg.study.study_id).order("sequence_no").limit(200000),
      byDocs("signature_events", "id, kind, action, meaning, signer_name, signer_email, document_id, file_hash, signed_at", "signed_at"),
      ctx.db.from("signature_events").select("id, kind, action, meaning, signer_name, signer_email, signed_at").eq("study_id", job.study_id).order("signed_at"),
      byDocs("qc_decisions", "document_id, outcome, reason_codes, comment, decided_by, decided_at", "decided_at"),
      byDocs("document_metadata_versions", "*", "document_id"),
      people(ctx),
    ]);
    if (auditRes.error) throw new Error(`The audit trail could not be read: ${auditRes.error.message}`);
    const val = (v: unknown): Cell => (v == null ? "" : typeof v === "object" ? JSON.stringify(v) : (v as Cell));
    const metaCols = metaVersions.length ? Object.keys(metaVersions[0]) : ["document_id"];
    pkg.zip.file(`${root}/audit-trail.xlsx`, await buildXlsx([{ name: "Audit trail",
      columns: ["Sequence", "Time (UTC)", "User", "Action", "Document ID", "Document", "Field / record", "Old value", "New value", "Reason", "Record hash", "Previous hash"],
      rows: (auditRes.data ?? []).map((a) => [a.sequence_no, new Date(a.created_at), a.user_email, a.action, a.document_id, a.document_name, a.field_changed, a.old_value, a.new_value, a.signature_reason, a.record_hash, a.prev_hash]) }]));
    pkg.zip.file(`${root}/signatures.xlsx`, await buildXlsx([
      { name: "Document signatures", columns: ["Signed (UTC)", "Signer", "Email", "Meaning", "Kind", "Action", "Document ID", "File SHA-256"],
        rows: sigDocs.map((s) => [new Date(s.signed_at as string), val(s.signer_name), val(s.signer_email), val(s.meaning), val(s.kind), val(s.action), val(s.document_id), val(s.file_hash)]) },
      { name: "Study signatures", columns: ["Signed (UTC)", "Signer", "Email", "Meaning", "Kind", "Action"],
        rows: (sigStudy.data ?? []).map((s) => [new Date(s.signed_at), s.signer_name, s.signer_email, s.meaning, s.kind, s.action]) },
      { name: "QC decisions", columns: ["Decided (UTC)", "Document ID", "Outcome", "Reasons", "Comment", "Reviewer"],
        rows: decisions.map((q) => [new Date(q.decided_at as string), val(q.document_id), val(q.outcome), ((q.reason_codes as string[]) ?? []).join("; "), val(q.comment), who.get(q.decided_by as string)?.name ?? "Former member"]) },
      { name: "Metadata history", columns: metaCols, rows: metaVersions.map((m) => metaCols.map((c) => val(m[c]))) },
    ]));
    const sig = (sigStudy.data ?? []).find((s) => s.id === (job.options as { signature_event_id?: string }).signature_event_id);
    if (job.kind === "transfer") {
      pkg.zip.file(`${root}/TRANSFER-RECORD.txt`, [
        `TRANSFER RECORD - study ${pkg.study.study_id}${pkg.study.protocol ? ` (${pkg.study.protocol})` : ""}`,
        `Recipient: ${job.options.recipient}`, `Reason: ${job.options.reason}`,
        `Approved by electronic signature: ${sig ? `${sig.signer_name} <${sig.signer_email}>, ${sig.signed_at}, meaning "${sig.meaning}"` : "see signatures.xlsx"}`,
        `Package job: ${job.id}`, `Files: ${pkg.files}`, "The SHA-256 of every file is in manifest.json; the package hash is recorded in TMF360.",
      ].join("\r\n"));
    }
    const generated = new Date().toISOString();
    pkg.zip.file(`${root}/manifest.json`, JSON.stringify({
      package: job.kind, study: pkg.study.study_id, protocol: pkg.study.protocol, job_id: job.id, generated_at: generated, generated_by: ctx.user.email ?? ctx.user.id,
      recipient: job.options.recipient ?? null, reason: job.options.reason ?? null,
      approval: sig ? { meaning: sig.meaning, signer: sig.signer_name, email: sig.signer_email, signed_at: sig.signed_at } : null,
      formats: "Files are kept in their original format (PDF/A conversion is not performed). Spreadsheets are Office Open XML (.xlsx).",
      structure: "study / zone / section / artifact / <title> - file v<n>; metadata.xlsx, audit-trail.xlsx, signatures.xlsx",
      audit_entries: auditRes.data?.length ?? 0, signatures: sigDocs.length + (sigStudy.data?.length ?? 0),
      files: pkg.manifest,
    }, null, 2));
    const bytes = await pkg.zip.generateAsync({ type: "uint8array", compression: "DEFLATE", compressionOptions: { level: 1 } });
    await finishExport(job, bytes, pkg.files);
    await notifyExport(ctx, job, true, `${pkg.files} file versions from study ${pkg.study.study_id} with audit trail, signatures and manifest (${Math.round(bytes.length / 1024)} KB).`);
  } catch (e) {
    const message = (e as Error).message.slice(0, 500);
    await svc.from("export_jobs").update({ status: "failed", error: message, finished_at: new Date().toISOString() }).eq("id", job.id);
    await notifyExport(ctx, job, false, message).catch(() => {});
  }
}

/** Requester names for job lists. */
export async function jobView(ctx: RequestContext, jobs: (ExportJob & Record<string, unknown>)[]) {
  const who = await people(ctx);
  const now = Date.now();
  return jobs.map((j) => ({
    ...j, file_path: undefined,
    requested_by_name: who.get(j.requested_by)?.name ?? "Former member",
    expired: j.status === "done" && !!j.expires_at && Date.parse(j.expires_at as string) <= now,
  }));
}
