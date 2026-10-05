// Part 12b: migration and import (M18 MIG-01..08) — isolated batches, mappings, dry run, exception
// queue, server-hash reconciliation, signed acceptance into the live TMF with provenance.
import { createHash } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as batches from "@/app/api/v1/studies/[studyId]/imports/route";
import * as batch from "@/app/api/v1/imports/[batchId]/route";
import * as items from "@/app/api/v1/imports/[batchId]/items/route";
import * as verify from "@/app/api/v1/imports/[batchId]/verify/route";
import * as dryRun from "@/app/api/v1/imports/[batchId]/dry-run/route";
import * as reconcile from "@/app/api/v1/imports/[batchId]/reconcile/route";
import * as accept from "@/app/api/v1/imports/[batchId]/accept/route";
import * as report from "@/app/api/v1/imports/[batchId]/report/route";
import * as item from "@/app/api/v1/import-items/[itemId]/route";
import * as mappings from "@/app/api/v1/import-mappings/route";
import { Fixtures, admin, apiRequest, call, type TestUser } from "./fixtures";

const fx = new Fixtures();
let org: string;
let lead: TestUser, cra: TestUser, outsider: TestUser;
let study: { id: string; code: string };
let site: string;
let protocolArt: string, cvArt: string;
let batchId: string;
let prefix: string;
const paths: string[] = [];
const sha = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");

async function stage(text: string) {
  const bytes = new TextEncoder().encode(`%PDF-1.4\n% ${text} ${fx.runId}\n`);
  const path = `${prefix}${sha(bytes)}.pdf`;
  const up = await lead.db.storage.from("Documents").upload(path, bytes, { contentType: "application/pdf" });
  if (up.error && !/exists/i.test(up.error.message)) throw up.error;
  paths.push(path);
  return { path, hash: sha(bytes), size: bytes.length };
}
const b = (route: { POST: (r: Request, c: { params: Promise<{ batchId: string }> }) => Promise<Response> }, u: TestUser = lead, body?: unknown) =>
  call(route.POST, { token: u.token, method: "POST", params: { batchId }, body });
const items_ = async () => (await call(batch.GET, { token: lead.token, params: { batchId } })).body.items as { id: string; source_path: string; state: string; exceptions: string[]; verification: string }[];
const bySource = async (s: string) => (await items_()).find((i) => i.source_path === s)!;

beforeAll(async () => {
  org = await fx.org("mig");
  lead = await fx.user("mig-lead", { orgId: org, role: "TMF Lead" });
  cra = await fx.user("mig-cra", { orgId: org, role: "CRA" });
  outsider = await fx.user("mig-out", { orgId: await fx.org("mig-b"), role: "System Administrator" });
  study = await fx.study(org, "MIG");
  await fx.member(org, study.code, cra, "CRA");
  const { error } = await lead.db.rpc("seed_study_tmf_config", { p_study_code: study.code });
  if (error) throw error;
  const { data: arts } = await admin().from("tmf_config").select("artifact_num").eq("study_id", study.code).eq("type", "artifact").eq("is_enabled", true).order("artifact_num");
  protocolArt = arts!.find((a) => a.artifact_num.startsWith("02."))!.artifact_num;
  cvArt = arts!.find((a) => a.artifact_num.startsWith("05."))!.artifact_num;
  const a = admin();
  const { data: party } = await a.from("parties").insert([{ org_id: org, party_type: "site", name: `Site ${fx.runId}` }]).select("id").single();
  const country = (await a.from("study_countries").insert([{ org_id: org, study_id: study.id, country_code: "FR" }]).select("id").single()).data!.id;
  site = (await a.from("study_sites").insert([{ org_id: org, study_id: study.id, study_country_id: country, site_number: "101", site_party_id: party!.id, display_name: "Paris", status: "ongoing" }]).select("id").single()).data!.id;
});

afterAll(async () => {
  if (paths.length) await admin().storage.from("Documents").remove([...new Set(paths)]);
  await admin().from("import_mappings").delete().eq("org_id", org);
  await fx.cleanup();
});

describe("isolated batch, staging and verification (MIG-01)", () => {
  it("only leads open batches", async () => {
    const body = { name: "Legacy eTMF migration", source_system: "OldVault 9" };
    expect((await call(batches.POST, { token: cra.token, method: "POST", params: { studyId: study.id }, body })).status).toBe(403);
    const r = await call(batches.POST, { token: lead.token, method: "POST", params: { studyId: study.id }, body });
    expect(r.status).toBe(201);
    batchId = r.body.id;
    prefix = (await call(batch.GET, { token: lead.token, params: { batchId } })).body.staging_prefix;
    expect(prefix).toBe(`${org}/import/${batchId}/`);
    expect((await call(batch.GET, { token: outsider.token, params: { batchId } })).status).toBe(404);
  });

  it("registers staged files with their manifest rows; files outside the staging folder are refused", async () => {
    const p = await stage("protocol");
    const cv = await stage("cv");
    const bad = await stage("tampered");
    const outside = await call(items.POST, { token: lead.token, method: "POST", params: { batchId }, body: { items: [
      { source_path: "x.pdf", file_path: `${org}/${study.code}/${p.hash}.pdf`, raw: {} }] } });
    expect(outside.status).toBe(400);
    const r = await call(items.POST, { token: lead.token, method: "POST", params: { batchId }, body: { items: [
      { source_path: "TMF/Protocol v3.pdf", source_id: "OV-1", file_path: p.path, file_name: "Protocol v3.pdf", file_type: "application/pdf", file_size_bytes: p.size, declared_hash: p.hash,
        raw: { document_type: "Protocol", status: "Approved", title: "Protocol v3", version: "3.0", effective_date: "2024-02-01", created_date: "2024-01-15" } },
      { source_path: "TMF/Sites/101/CV Dupont.pdf", source_id: "OV-2", file_path: cv.path, file_name: "CV Dupont.pdf", file_type: "application/pdf", declared_hash: cv.hash,
        raw: { document_type: "CV", status: "Approved", site: "101", title: "CV Dr Dupont" } },
      { source_path: "TMF/Protocol v3 (copy).pdf", source_id: "OV-3", file_path: p.path, file_name: "Protocol v3 copy.pdf", file_type: "application/pdf", declared_hash: p.hash,
        raw: { document_type: "Protocol", status: "Approved", title: "Protocol v3 copy" } },
      { source_path: "TMF/Broken.pdf", source_id: "OV-4", file_path: bad.path, file_name: "Broken.pdf", file_type: "application/pdf", declared_hash: "0".repeat(64),
        raw: { document_type: "Protocol", status: "Approved", title: "Broken" } },
    ] } });
    expect(r.status).toBe(201);
    expect(r.body.added).toBe(4);
  });

  it("the server re-hashes every staged file; users cannot set verification themselves", async () => {
    const someone = await bySource("TMF/Broken.pdf");
    const { error } = await lead.db.from("import_items").update({ verification: "verified" }).eq("id", someone.id);
    expect(error?.message).toMatch(/done by the server/);
    const v = await b(verify);
    expect(v.body).toEqual({ verified: 3, failed: 1, remaining: 0 });
    expect((await bySource("TMF/Broken.pdf")).verification).toBe("mismatch");
  });
});

describe("dry run, mappings and the exception queue (MIG-02..04)", () => {
  it("the dry run reports unmapped values, duplicates and unverified files, and files nothing", async () => {
    const r = await b(dryRun);
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.report).toMatchObject({ items: 4, ready: 0, exceptions: 4, duplicates: 2 });
    expect(r.body.report.unmapped).toEqual({ "Unmapped document type: Protocol": 3, "Unmapped document type: CV": 1 });
    const { count } = await admin().from("documents").select("id", { count: "exact", head: true }).eq("org_id", org);
    expect(count).toBe(0);
  });

  it("saved mappings are reused; the CV maps to its site", async () => {
    const bad = await call(mappings.PUT, { token: lead.token, method: "PUT", body: { mappings: [{ kind: "document_type", source_value: "Protocol", target_value: "protocol" }], reason: "Mapping workshop" } });
    expect(bad.status).toBe(400);
    const r = await call(mappings.PUT, { token: lead.token, method: "PUT", body: { reason: "Mapping workshop 2026-10-05", mappings: [
      { kind: "document_type", source_value: "Protocol", target_value: protocolArt }, { kind: "document_type", source_value: "CV", target_value: cvArt }] } });
    expect(r.body.saved).toBe(2);
    const d = await b(dryRun);
    expect(d.body.report).toMatchObject({ ready: 1, exceptions: 3 });
    const cv = await bySource("TMF/Sites/101/CV Dupont.pdf");
    expect(cv.exceptions).toEqual([]);
    const { data: cvRow } = await admin().from("import_items").select("study_site_id, artifact_num, target_status").eq("id", cv.id).single();
    expect(cvRow).toEqual({ study_site_id: site, artifact_num: cvArt, target_status: "Final" });
    expect((await bySource("TMF/Protocol v3 (copy).pdf")).exceptions).toContain("Duplicate: the same file appears more than once in this batch");
    expect((await bySource("TMF/Broken.pdf")).exceptions).toContain("File does not match its declared hash");
  });

  it("reconciliation is refused while exceptions remain", async () => {
    const r = await b(reconcile);
    expect(r.status).toBe(400);
    expect(r.body.error.message).toMatch(/Resolve every exception/);
  });

  it("exceptions are resolved by excluding with a justification (audited)", async () => {
    expect((await call(item.PATCH, { token: lead.token, method: "PATCH", params: { itemId: (await bySource("TMF/Broken.pdf")).id }, body: { exclude: "x" } })).status).toBe(400);
    for (const [s, why] of [["TMF/Protocol v3 (copy).pdf", "Same file as OV-1"], ["TMF/Broken.pdf", "Corrupt in source; re-requested from vendor"]]) {
      const r = await call(item.PATCH, { token: lead.token, method: "PATCH", params: { itemId: (await bySource(s)).id }, body: { exclude: why } });
      expect(r.status).toBe(200);
    }
    const d = await b(dryRun);
    expect(d.body.report).toMatchObject({ ready: 2, exceptions: 0, excluded: 2 });
    const { data } = await admin().from("audit_trail").select("signature_reason").eq("org_id", org).eq("action", "import_items.update");
    expect(data!.map((x) => x.signature_reason)).toEqual(expect.arrayContaining(["Excluded: Same file as OV-1"]));
  });
});

describe("reconciliation and signed acceptance (MIG-05..07)", () => {
  it("reconciles counts and hashes item by item", async () => {
    const r = await b(reconcile);
    expect(r.status).toBe(200);
    expect(r.body.reconciliation).toMatchObject({ source_items: 4, excluded: 2, to_import: 2, hash_verified: 2, declared_hash_checked: 2, metadata_complete: 2, differences: 0 });
  });

  it("status can't be forged; any item change undoes the reconciliation", async () => {
    const { error } = await lead.db.from("import_batches").update({ status: "filed" }).eq("id", batchId);
    expect(error?.message).toMatch(/import steps/);
    await call(item.PATCH, { token: lead.token, method: "PATCH", params: { itemId: (await bySource("TMF/Protocol v3.pdf")).id }, body: { version_label: "3.0" } });
    expect((await call(batch.GET, { token: lead.token, params: { batchId } })).body.batch.status).toBe("draft");
    expect((await b(accept, lead, { password: lead.password })).status).toBe(400);
    await b(dryRun);
    await b(reconcile);
  });

  it("acceptance needs the password, then files every ready item with provenance", async () => {
    expect((await b(accept, lead, { password: "wrong" })).status).toBe(400);
    const r = await b(accept, lead, { password: lead.password });
    expect(r.status).toBe(200);
    expect(r.body.filed).toBe(2);
    const { data: docs } = await admin().from("documents").select("id, status, artifact_num, custom_file_name, version, effective_date, study_site_id, provenance, approved_by")
      .eq("org_id", org).order("artifact_num");
    expect(docs).toHaveLength(2);
    const protocol = docs!.find((d) => d.artifact_num === protocolArt)!;
    expect(protocol).toMatchObject({ status: "Approved", custom_file_name: "Protocol v3", version: "3.0", effective_date: "2024-02-01", approved_by: lead.email });
    expect(protocol.provenance).toMatchObject({ source_system: "OldVault 9", source_id: "OV-1", source_path: "TMF/Protocol v3.pdf", original_created: "2024-01-15", original_status: "Approved" });
    expect(docs!.find((d) => d.artifact_num === cvArt)!.study_site_id).toBe(site);
    const { data: versions } = await admin().from("document_file_versions").select("verification_status").in("document_id", docs!.map((d) => d.id));
    expect(versions!.every((v) => v.verification_status === "verified")).toBe(true);
    const view = (await call(batch.GET, { token: lead.token, params: { batchId } })).body;
    expect(view.batch).toMatchObject({ status: "filed", filed_count: 2 });
    expect(view.signature).toMatchObject({ meaning: "Import reconciled and accepted" });
  });

  it("a filed batch is final, and the audit report downloads", async () => {
    const { error } = await lead.db.from("import_items").update({ title: "late" }).eq("batch_id", batchId);
    expect(error?.message).toMatch(/filed/);
    const res = await report.GET(apiRequest("/x", { token: lead.token }), { params: Promise.resolve({ batchId }) });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/spreadsheetml/);
  });

  it("a later batch with the same file is flagged as a conflict with the live TMF", async () => {
    const r = await call(batches.POST, { token: lead.token, method: "POST", params: { studyId: study.id }, body: { name: "Second wave", source_system: "OldVault 9" } });
    batchId = r.body.id;
    prefix = `${org}/import/${batchId}/`;
    const p = await stage("protocol");
    await call(items.POST, { token: lead.token, method: "POST", params: { batchId }, body: { items: [
      { source_path: "TMF/Protocol v3.pdf", file_path: p.path, file_name: "Protocol v3.pdf", file_type: "application/pdf", raw: { document_type: "Protocol", status: "Final", title: "Protocol v3" } }] } });
    await b(verify);
    await b(dryRun);
    expect((await items_())[0].exceptions).toContain("Conflict: this file is already in the study's TMF");
  });
});
