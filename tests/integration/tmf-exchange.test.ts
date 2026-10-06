// Part 14h: TMF Reference Model Exchange Mechanism Standard (MIG-09). One organisation exports an EMS
// package; its exchange.xml is validated against the published XSD; another organisation loads it into an
// isolated import batch, where it passes verification and the dry run.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import JSZip from "jszip";
import { validateXML } from "xmllint-wasm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as exportsRoute from "@/app/api/v1/studies/[studyId]/exports/route";
import * as download from "@/app/api/v1/exports/[jobId]/download/route";
import * as batches from "@/app/api/v1/studies/[studyId]/imports/route";
import * as batch from "@/app/api/v1/imports/[batchId]/route";
import * as ems from "@/app/api/v1/imports/[batchId]/ems/route";
import * as verify from "@/app/api/v1/imports/[batchId]/verify/route";
import * as dryRun from "@/app/api/v1/imports/[batchId]/dry-run/route";
import { integrityMatches, validateExchange } from "@/lib/api/ems";
import { Fixtures, admin, call, type TestUser } from "./fixtures";

const XSD = readFileSync("docs/standards/etmf-ems/TmfReferenceModelExchange.xsd", "utf8");
const fx = new Fixtures();
let orgA: string, orgB: string;
let leadA: TestUser, craA: TestUser, leadB: TestUser;
let studyA: { id: string; code: string }, studyB: { id: string; code: string };
let protocolArt: string, siteArt: string;
const paths: string[] = [];
let pkg: Uint8Array;
let xml: string;

async function site(org: string, study: string) {
  const a = admin();
  const { data: party } = await a.from("parties").insert([{ org_id: org, party_type: "site", name: `Site ${fx.runId}` }]).select("id").single();
  const country = (await a.from("study_countries").insert([{ org_id: org, study_id: study, country_code: "FR" }]).select("id").single()).data!.id;
  return (await a.from("study_sites").insert([{ org_id: org, study_id: study, study_country_id: country, site_number: "101", site_party_id: party!.id, display_name: "Paris", status: "ongoing" }]).select("id").single()).data!.id as string;
}
async function seedDoc(key: string, fields: Record<string, unknown>) {
  const bytes = new TextEncoder().encode(`%PDF-1.4\n% ${key} ${fx.runId}\n`);
  const path = `${orgA}/${fx.runId}/${key}.pdf`;
  const up = await admin().storage.from("Documents").upload(path, bytes, { contentType: "application/pdf" });
  if (up.error) throw up.error;
  paths.push(path);
  const { error } = await admin().from("documents").insert([{ org_id: orgA, user_id: leadA.id, study_id: studyA.code, status: "Approved", approved_at: new Date().toISOString(),
    approved_by: "seed@example.test", custom_file_name: key, file_path: path, file_name: `${key}.pdf`, file_type: "application/pdf",
    file_hash: createHash("sha256").update(bytes).digest("hex"), ...fields }]);
  if (error) throw error;
}

beforeAll(async () => {
  orgA = await fx.org("emsa");
  orgB = await fx.org("emsb");
  leadA = await fx.user("ems-lead-a", { orgId: orgA, role: "TMF Lead" });
  craA = await fx.user("ems-cra-a", { orgId: orgA, role: "CRA" });
  leadB = await fx.user("ems-lead-b", { orgId: orgB, role: "TMF Lead" });
  studyA = await fx.study(orgA, "EMSA");
  studyB = await fx.study(orgB, "EMSB");
  await fx.member(orgA, studyA.code, craA, "CRA");
  for (const [u, s] of [[leadA, studyA], [leadB, studyB]] as const) {
    const { error } = await u.db.rpc("seed_study_tmf_config", { p_study_code: s.code });
    if (error) throw error;
  }
  const { data: arts } = await admin().from("tmf_config").select("artifact_num").eq("study_id", studyB.code).eq("type", "artifact").eq("is_enabled", true).order("artifact_num");
  protocolArt = arts!.find((a) => a.artifact_num.startsWith("02."))!.artifact_num;
  siteArt = arts!.find((a) => a.artifact_num.startsWith("05."))!.artifact_num;
  const siteA = await site(orgA, studyA.id);
  await site(orgB, studyB.id);
  await seedDoc("protocol", { artifact_num: protocolArt, artifact_name: "Protocol", effective_date: "2026-03-01", version: "2.0" });
  await seedDoc("site doc", { artifact_num: siteArt, artifact_name: "Site document", study_site_id: siteA });
  await seedDoc("custom", { artifact_num: "99.01.01", artifact_name: "Org-specific record" });
});

afterAll(async () => {
  const a = admin();
  if (paths.length) await a.storage.from("Documents").remove([...new Set(paths)]);
  const { data: jobs } = await a.from("export_jobs").select("file_path").eq("org_id", orgA);
  const files = (jobs ?? []).map((j) => j.file_path).filter(Boolean) as string[];
  if (files.length) await a.storage.from("exports").remove(files);
  await fx.cleanup();
});

describe("TMF exchange export (MIG-09)", () => {
  it("only TMF Leads and administrators can export an exchange package", async () => {
    const r = await call(exportsRoute.POST, { token: craA.token, method: "POST", params: { studyId: studyA.id }, body: { format: "ems", specification_id: "EA-1" } });
    expect(r.status).toBe(403);
  });

  it("builds <TRANSFERID>/exchange.xml that validates against the published XSD", async () => {
    const r = await call(exportsRoute.POST, { token: leadA.token, method: "POST", params: { studyId: studyA.id }, body: { format: "ems", specification_id: "EA-2026-01", event_id: "CLOSEOUT" } });
    expect(r.status).toBe(202);
    const { data: job } = await admin().from("export_jobs").select("status, error, kind").eq("id", r.body.id).single();
    expect(job, JSON.stringify(job)).toMatchObject({ status: "done", kind: "ems" });
    const dl = await call(download.POST, { token: leadA.token, method: "POST", params: { jobId: r.body.id } });
    pkg = new Uint8Array(await (await fetch(dl.body.url)).arrayBuffer());
    const zip = await JSZip.loadAsync(pkg);
    const entry = Object.keys(zip.files).find((n) => /^[^/]+\/exchange\.xml$/.test(n))!;
    expect(entry).toBeTruthy();
    xml = await zip.file(entry)!.async("string");
    const v = await validateXML({ xml: [{ fileName: "exchange.xml", contents: xml }], schema: [{ fileName: "TmfReferenceModelExchange.xsd", contents: XSD }] });
    expect(v.errors, JSON.stringify(v.errors)).toEqual([]);
    expect(validateExchange(xml)).toEqual([]);
    expect(xml).toContain(`STUDYID="${studyA.code}"`);
    expect(xml).toContain('SPECIFICATIONID="EA-2026-01"');
    expect(xml).toContain('TMFRMVERSION="3.3.1"');
    expect(xml).toContain("<COUNTRYID>FRA</COUNTRYID>");
    expect(xml).toContain("<SITEID>101</SITEID>");
    expect(xml).toContain("<ARTIFACTDATE>01-MAR-2026</ARTIFACTDATE>");
    expect(xml).not.toContain("99.01.01");   // no TMF RM Unique ID: skipped and recorded
    // Every file is in the folder tree and matches its INTEGRITY value.
    const base = entry.slice(0, -"exchange.xml".length);
    const pairs = [...xml.matchAll(/<INTEGRITY>([^<]+)<\/INTEGRITY>\s*<FILENAME>[^<]+<\/FILENAME>\s*<CONTENTURL>([^<]+)<\/CONTENTURL>/g)];
    expect(pairs).toHaveLength(2);
    for (const [, integrity, url] of pairs) {
      expect(url).toMatch(/^\d{2}\/\d{2}\.\d{2}\/\d{2}\.\d{2}\.\d{2}\//);
      expect(integrityMatches(integrity, await zip.file(base + url)!.async("uint8array"))).toBe(true);
    }
    const { data: t } = await admin().from("ems_transfers").select("direction, objects, skipped").eq("org_id", orgA).single();
    expect(t).toMatchObject({ direction: "export", objects: 2 });
    expect((t!.skipped as { reason: string }[])[0].reason).toMatch(/Unique ID/);
  });

  it("the official example and broken files are judged by the same rules", () => {
    expect(validateExchange(readFileSync("docs/standards/etmf-ems/example.xml", "utf8"))).toEqual([]);
    expect(validateExchange(xml.replace(/<OBJECTVERSIONSTATE>Current</, "<OBJECTVERSIONSTATE>Live<"))[0]).toMatch(/OBJECTVERSIONSTATE/);
    expect(validateExchange(xml.replace(/ TRANSFERID="[^"]+"/, ""))).toContain("BATCH TRANSFERID is required");
    expect(validateExchange('<!DOCTYPE x [<!ENTITY a "b">]><BATCH/>')[0]).toMatch(/DTD/);
  });
});

describe("TMF exchange import (MIG-09)", () => {
  let batchId: string, prefix: string;

  async function stageZip(bytes: Uint8Array, name: string) {
    const path = `${prefix}${name}`;
    const up = await leadB.db.storage.from("Documents").upload(path, bytes, { contentType: "application/zip" });
    if (up.error) throw up.error;
    paths.push(path);
    return path;
  }

  it("loads the package into an isolated batch; files are integrity-checked and staged", async () => {
    const r = await call(batches.POST, { token: leadB.token, method: "POST", params: { studyId: studyB.id }, body: { name: "CRO handover", source_system: "Other eTMF (EMS)" } });
    batchId = r.body.id;
    prefix = (await call(batch.GET, { token: leadB.token, params: { batchId } })).body.staging_prefix;
    // A tampered copy: one file changed after export.
    const bad = await JSZip.loadAsync(pkg);
    const victim = Object.keys(bad.files).find((n) => n.endsWith(".pdf"))!;
    bad.file(victim, "tampered");
    const badPath = await stageZip(await bad.generateAsync({ type: "uint8array" }), "tampered.zip");
    const t = await call(ems.POST, { token: leadB.token, method: "POST", params: { batchId }, body: { file_path: badPath } });
    expect(t.status).toBe(201);
    expect(t.body.added).toBe(1);
    expect(t.body.skipped[0].reason).toMatch(/INTEGRITY/);
    // The same transfer can't be loaded twice.
    const good = await stageZip(pkg, "package.zip");
    const again = await call(ems.POST, { token: leadB.token, method: "POST", params: { batchId }, body: { file_path: good } });
    expect(again.body.error.message).toMatch(/already imported/);
  });

  it("a clean package passes verification and the dry run with artifacts, site and country mapped", async () => {
    const r = await call(batches.POST, { token: leadB.token, method: "POST", params: { studyId: studyB.id }, body: { name: "CRO handover 2", source_system: "Other eTMF (EMS)" } });
    batchId = r.body.id;
    prefix = (await call(batch.GET, { token: leadB.token, params: { batchId } })).body.staging_prefix;
    // Re-label the transfer so it is a new exchange from the same source.
    const zip = await JSZip.loadAsync(pkg);
    const entry = Object.keys(zip.files).find((n) => n.endsWith("exchange.xml"))!;
    zip.file(entry, xml.replace(/TRANSFERID="([^"]+)"/, 'TRANSFERID="$1-B"'));
    const path = await stageZip(await zip.generateAsync({ type: "uint8array" }), "package2.zip");
    const res = await call(ems.POST, { token: leadB.token, method: "POST", params: { batchId }, body: { file_path: path } });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    expect(res.body).toMatchObject({ added: 2, skipped: [], tmfrm_version: "3.3.1" });
    expect((await call(verify.POST, { token: leadB.token, method: "POST", params: { batchId } })).status).toBe(200);
    const dr = await call(dryRun.POST, { token: leadB.token, method: "POST", params: { batchId } });
    expect(dr.status).toBe(200);
    const items = (await call(batch.GET, { token: leadB.token, params: { batchId } })).body.items as { exceptions: string[]; artifact_num: string; study_site_id: string | null }[];
    expect(items.map((i) => i.exceptions)).toEqual([[], []]);
    expect(items.map((i) => i.artifact_num).sort()).toEqual([protocolArt, siteArt].sort());
    expect(items.some((i) => i.study_site_id)).toBe(true);
    const { data: t } = await admin().from("ems_transfers").select("direction, files, exchange_xml_path").eq("org_id", orgB).eq("import_batch_id", batchId).single();
    expect(t).toMatchObject({ direction: "import", files: 2 });
    expect(t!.exchange_xml_path).toMatch(/exchange-[0-9a-f]{64}\.xml$/);
  });
});
