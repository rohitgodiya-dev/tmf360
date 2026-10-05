// Part 11b/11c — ZIP export and archive packages (M16 EXP-03/04, Section 6 RET-04/05).
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
  id: string; org_id: string; study_id: string; kind: "zip" | "archive" | "transfer"; status: string;
  options: { scope?: "final" | "current"; label?: string; recipient?: string; reason?: string }; requested_by: string;
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
 * otherwise each document's current file only (EXP-03). Returns the ZIP and its manifest.
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

async function finish(job: ExportJob, zipBytes: Uint8Array, files: number) {
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

async function notify(ctx: RequestContext, job: ExportJob, ok: boolean, detail: string) {
  if (!ctx.user.email) return;
  const what = job.kind === "zip" ? "TMF export" : job.kind === "archive" ? "archive package" : "transfer package";
  await sendEmail(ctx.user.email, ok ? `Your ${what} is ready` : `Your ${what} failed`, emailLayout(ok ? `Your ${what} is ready` : `Your ${what} failed`,
    `<p style="color:#374151;font-size:14px">${escapeHtml(detail)}</p><p style="color:#374151;font-size:14px">Open TMF360 &rarr; Reports &amp; exports to download it. The download link works for ${EXPORT_DAYS} days and every download is recorded.</p>`));
}

/** Runs a ZIP export job to completion (EXP-03/04). Never throws: failures are stored on the job. */
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
    await finish(job, bytes, pkg.files);
    await notify(ctx, job, true, `${pkg.files} files from study ${pkg.study.study_id} (${Math.round(bytes.length / 1024)} KB).`);
  } catch (e) {
    const message = (e as Error).message.slice(0, 500);
    await svc.from("export_jobs").update({ status: "failed", error: message, finished_at: new Date().toISOString() }).eq("id", job.id);
    await notify(ctx, job, false, message).catch(() => {});
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
