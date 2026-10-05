// Part 12a: AI as recommendations (M17 AI-01..07). The model call is stubbed (setModelRunner), so
// these tests check switches, scope, provenance, decisions and settlement without spending credits.
// The duplicate check uses real PDFs and real text extraction.
import { createHash } from "node:crypto";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { setModelRunner, type ModelCall } from "@/lib/api/ai";
import * as intake from "@/app/api/v1/studies/[studyId]/intake/route";
import * as intakeItem from "@/app/api/v1/studies/[studyId]/intake/[itemId]/route";
import * as fileItem from "@/app/api/v1/studies/[studyId]/intake/[itemId]/file/route";
import * as ai from "@/app/api/v1/studies/[studyId]/intake/[itemId]/ai/route";
import * as decision from "@/app/api/v1/ai-recommendations/[recId]/decision/route";
import * as settings from "@/app/api/v1/ai-settings/route";
import * as summary from "@/app/api/v1/documents/[documentId]/summary/route";
import * as log from "@/app/api/v1/studies/[studyId]/ai-recommendations/route";
import { Fixtures, admin, call, type TestUser } from "./fixtures";

const fx = new Fixtures();
let org: string;
let lead: TestUser, sysadmin: TestUser, cra: TestUser, outsider: TestUser;
let study: { id: string; code: string };
const paths: string[] = [];
let calls: ModelCall<unknown>[] = [];
let artifacts: string[] = [];
const LOREM = "This protocol describes a randomised double blind placebo controlled trial of the study drug in adults with moderate disease including dosing schedule visits safety monitoring and statistical analysis plan for the primary endpoint";

async function pdfBytes(text: string) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const page = pdf.addPage([600, 800]);
  text.match(/.{1,80}(\s|$)/g)!.forEach((line, i) => page.drawText(line, { x: 30, y: 760 - i * 14, size: 10, font }));
  return pdf.save();
}
async function receive(text: string, name = "doc.pdf") {
  const bytes = await pdfBytes(text);
  const hash = createHash("sha256").update(bytes).digest("hex");
  const path = `${org}/${study.code}/${hash}.pdf`;
  const up = await lead.db.storage.from("Documents").upload(path, bytes, { contentType: "application/pdf" });
  if (up.error && !/exists/i.test(up.error.message)) throw up.error;
  paths.push(path);
  const r = await call(intake.POST, { token: lead.token, method: "POST", params: { studyId: study.id },
    body: { file_path: path, file_name: name, file_type: "application/pdf", file_size_bytes: bytes.length, file_hash: hash } });
  expect(r.status).toBe(201);
  return r.body as { id: string; row_version: number };
}
const runAi = (u: TestUser, itemId: string, feature: string) => call(ai.POST, { token: u.token, method: "POST", params: { studyId: study.id, itemId }, body: { feature } });
const enable = (feature: string, enabled: boolean, u: TestUser = sysadmin) => call(settings.PUT, { token: u.token, method: "PUT", body: { feature, enabled, reason: "Pilot of AI assistance" } });

beforeAll(async () => {
  org = await fx.org("ai");
  lead = await fx.user("ai-lead", { orgId: org, role: "TMF Lead" });
  sysadmin = await fx.user("ai-admin", { orgId: org, role: "Sponsor Admin" });
  cra = await fx.user("ai-cra", { orgId: org, role: "CRA" });
  outsider = await fx.user("ai-out", { orgId: await fx.org("ai-b"), role: "System Administrator" });
  study = await fx.study(org, "AI");
  await fx.member(org, study.code, cra, "CRA");
  const { error } = await lead.db.rpc("seed_study_tmf_config", { p_study_code: study.code });
  if (error) throw error;
  const { data } = await admin().from("tmf_config").select("artifact_num").eq("study_id", study.code).eq("type", "artifact").eq("is_enabled", true).order("artifact_num").limit(3);
  artifacts = data!.map((a) => a.artifact_num);
  setModelRunner(async <T,>(c: ModelCall<T>) => {
    calls.push(c as ModelCall<unknown>);
    if (c.instructions.includes("Classify")) return { model: "claude-test-1", output: { suggestions: [
      { artifact_num: artifacts[1], confidence: 91.4, reason: "Title page says protocol", evidence: [{ page: 1, quote: "This protocol describes" }] },
      { artifact_num: "99.99.99", confidence: 50, reason: "made up", evidence: [] },
      { artifact_num: artifacts[0], confidence: 20, reason: "less likely", evidence: [] },
    ] } as T };
    if (c.instructions.includes("Extract")) return { model: "claude-test-1", output: { fields: {
      title: { value: "Protocol v2", confidence: 88, page: 1, quote: "Protocol v2" }, version_label: { value: "2.0", confidence: 80, page: 1, quote: "Version 2.0" },
      effective_date: { value: "12 March 2026", confidence: 70, page: 2, quote: "12 March 2026" }, expiry_date: { value: null, confidence: 0, page: null, quote: null },
      site_number: { value: null, confidence: 0, page: null, quote: null }, investigator: { value: "Dr Lee", confidence: 60, page: 3, quote: "PI: Dr Lee" },
      signatures_present: { value: "no", confidence: 75, page: 9, quote: "Signature: ____" } } } as T };
    if (c.instructions.includes("Check the document before QC")) return { model: "claude-test-1", output: { flags: [
      { check: "unsigned", severity: "high", detail: "Signature block on page 9 is empty", pages: [9] }] } as T };
    return { model: "claude-test-1", output: { summary: "A protocol.", key_points: [{ point: "Randomised trial", page: 1 }] } as T };
  });
});
afterEach(() => { calls = []; });
afterAll(async () => {
  setModelRunner(null);
  await admin().from("ai_settings").delete().eq("org_id", org);
  if (paths.length) await admin().storage.from("Documents").remove(paths);
  await fx.cleanup();
});

describe("switches (AI-07)", () => {
  it("classification is on by default; the rest are off until an admin switches them on with a reason", async () => {
    const r = await call(settings.GET, { token: cra.token });
    expect(Object.fromEntries(r.body.features.map((f: { feature: string; enabled: boolean }) => [f.feature, f.enabled])))
      .toEqual({ classification: true, metadata_extraction: false, pre_qc_checks: false, duplicate_detection: false, summary: false });
    const item = await receive(LOREM + " one");
    expect((await runAi(lead, item.id, "metadata_extraction")).status).toBe(403);
    expect(calls).toHaveLength(0);
    expect((await enable("metadata_extraction", true, lead)).status).toBe(403);
    expect((await call(settings.PUT, { token: sysadmin.token, method: "PUT", body: { feature: "pre_qc_checks", enabled: true } })).status).toBe(400);
    for (const f of ["metadata_extraction", "pre_qc_checks", "duplicate_detection", "summary"]) expect((await enable(f, true)).status).toBe(200);
    const { data } = await admin().from("audit_trail").select("action").eq("org_id", org).like("action", "ai_settings.%");
    expect(data).toHaveLength(4);
  });

  it("switching classification off stops it", async () => {
    await enable("classification", false);
    const item = await receive(LOREM + " two");
    expect((await runAi(lead, item.id, "classification")).status).toBe(403);
    await enable("classification", true);
  });
});

describe("recommendations with provenance (AI-01..06)", () => {
  let itemId: string;
  let rowVersion: number;

  it("classification keeps only the study's record types, top 3, with model, version and evidence", async () => {
    const item = await receive(LOREM + " three", "protocol.pdf");
    itemId = item.id; rowVersion = item.row_version;
    const r = await runAi(lead, itemId, "classification");
    expect(r.status).toBe(201);
    expect(calls[0].pdf.length).toBeGreaterThan(100);
    expect(r.body).toMatchObject({ feature: "classification", model_version: "claude-test-1", prompt_version: "classify-v1", confidence: 91, status: "pending", requested_by: lead.id });
    expect(r.body.output.suggestions.map((s: { artifact_num: string }) => s.artifact_num)).toEqual([artifacts[1], artifacts[0]]);
    expect(r.body.evidence).toEqual([{ page: 1, quote: "This protocol describes", artifact_num: artifacts[1] }]);
  });

  it("metadata comes with the page and text it was found in; bad dates are dropped, not guessed", async () => {
    const r = await runAi(lead, itemId, "metadata_extraction");
    expect(r.status).toBe(201);
    expect(r.body.output.fields.title).toEqual({ value: "Protocol v2", confidence: 88 });
    expect(r.body.output.fields.effective_date.value).toBeNull();
    expect(r.body.evidence).toContainEqual({ field: "investigator", page: 3, quote: "PI: Dr Lee" });
  });

  it("pre-QC flags are recorded as flags only", async () => {
    const r = await runAi(lead, itemId, "pre_qc_checks");
    expect(r.body.output.flags).toEqual([{ check: "unsigned", severity: "high", detail: "Signature block on page 9 is empty" }]);
    expect(r.body.evidence).toEqual([{ check: "unsigned", page: 9 }]);
    const { data: item } = await admin().from("intake_items").select("status, artifact_num").eq("id", itemId).single();
    expect(item).toMatchObject({ status: "received", artifact_num: null });   // AI changed nothing
  });

  it("recommendations can't be written or changed by users", async () => {
    const { error } = await lead.db.from("ai_recommendations").insert([{ org_id: org, study_id: study.id, feature: "summary", intake_item_id: itemId, model: "x", model_version: "x", prompt_version: "x", output: {}, requested_by: lead.id }]);
    expect(error).toBeTruthy();
    const { data: rec } = await admin().from("ai_recommendations").select("id").eq("intake_item_id", itemId).eq("feature", "classification").single();
    const { error: change } = await admin().from("ai_recommendations").update({ output: { forged: true } }).eq("id", rec!.id);
    expect(change?.message).toMatch(/cannot change/);
    const { error: del } = await admin().from("ai_recommendations").delete().eq("id", rec!.id);
    expect(del?.message).toMatch(/cannot be deleted/);
  });

  it("a dismissed flag is rejected and audited; another organisation can't decide", async () => {
    const { data: flag } = await admin().from("ai_recommendations").select("id").eq("intake_item_id", itemId).eq("feature", "pre_qc_checks").single();
    expect((await call(decision.POST, { token: outsider.token, method: "POST", params: { recId: flag!.id }, body: { decision: "rejected" } })).status).toBe(404);
    expect((await call(decision.POST, { token: lead.token, method: "POST", params: { recId: flag!.id }, body: { decision: "rejected", note: "Signed on paper copy" } })).status).toBe(200);
    expect((await call(decision.POST, { token: lead.token, method: "POST", params: { recId: flag!.id }, body: { decision: "accepted" } })).status).toBe(400);
    const { data } = await admin().from("audit_trail").select("action, signature_reason").eq("org_id", org).eq("action", "AI recommendation rejected");
    expect(data).toEqual([{ action: "AI recommendation rejected", signature_reason: "Signed on paper copy" }]);
  });

  it("filing settles the rest: a different record type is 'modified', changed metadata 'modified'", async () => {
    const idx = await call(intakeItem.PATCH, { token: lead.token, method: "PATCH", params: { studyId: study.id, itemId },
      body: { row_version: rowVersion, artifact_num: artifacts[0], title: "Protocol v2", version_label: "2.1" } });
    expect(idx.status).toBe(200);
    expect((await call(fileItem.POST, { token: lead.token, method: "POST", params: { studyId: study.id, itemId } })).status).toBe(201);
    const { data } = await admin().from("ai_recommendations").select("feature, status, final_value").eq("intake_item_id", itemId).order("created_at");
    expect(data!.map((r) => [r.feature, r.status])).toEqual([["classification", "modified"], ["metadata_extraction", "modified"], ["pre_qc_checks", "rejected"]]);
    expect(data![0].final_value).toEqual({ artifact_num: artifacts[0] });
  });

  it("accepting the top suggestion unchanged settles as 'accepted'", async () => {
    const item = await receive(LOREM + " four", "protocol2.pdf");
    await runAi(lead, item.id, "classification");
    await call(intakeItem.PATCH, { token: lead.token, method: "PATCH", params: { studyId: study.id, itemId: item.id }, body: { row_version: item.row_version, artifact_num: artifacts[1] } });
    await call(fileItem.POST, { token: lead.token, method: "POST", params: { studyId: study.id, itemId: item.id } });
    const { data } = await admin().from("ai_recommendations").select("status").eq("intake_item_id", item.id).single();
    expect(data!.status).toBe("accepted");
  });

  it("the log summarises decisions for oversight", async () => {
    const r = await call(log.GET, { token: lead.token, params: { studyId: study.id } });
    expect(r.body.summary.by_status).toMatchObject({ accepted: 1, modified: 2, rejected: 1 });
    expect((await call(log.GET, { token: cra.token, params: { studyId: study.id } })).status).toBe(403);
  });
});

describe("content duplicates (AI-04) and summary (AI-05)", () => {
  it("finds a near-duplicate Final document by its text, without calling the model", async () => {
    const bytes = await pdfBytes(LOREM + " final copy");
    const path = `${org}/${study.code}/final-${fx.runId}.pdf`;
    await admin().storage.from("Documents").upload(path, bytes, { contentType: "application/pdf" });
    paths.push(path);
    const { data: fin, error } = await admin().from("documents").insert([{ org_id: org, user_id: lead.id, study_id: study.code, status: "Approved",
      approved_at: new Date().toISOString(), approved_by: "seed@example.test", artifact_num: artifacts[2], artifact_name: "Seeded", custom_file_name: "Final copy",
      file_path: path, file_name: "final.pdf", file_type: "application/pdf", file_hash: createHash("sha256").update(bytes).digest("hex") }]).select("id").single();
    if (error) throw error;
    const filed = { body: { document_id: fin.id } };
    const rescanned = await receive(LOREM + " final copy rescanned", "rescan.pdf");
    await call(intakeItem.PATCH, { token: lead.token, method: "PATCH", params: { studyId: study.id, itemId: rescanned.id }, body: { row_version: rescanned.row_version, artifact_num: artifacts[2] } });
    const r = await runAi(lead, rescanned.id, "duplicate_detection");
    expect(r.status).toBe(201);
    expect(calls).toHaveLength(0);
    expect(r.body.output.matches[0]).toMatchObject({ document_id: filed.body.document_id, identical_file: false });
    expect(r.body.output.matches[0].similarity).toBeGreaterThan(0.8);
  });

  it("summarises a document once per file version", async () => {
    const item = await receive(LOREM + " summary", "sum.pdf");
    await call(intakeItem.PATCH, { token: lead.token, method: "PATCH", params: { studyId: study.id, itemId: item.id }, body: { row_version: item.row_version, artifact_num: artifacts[0] } });
    const filed = await call(fileItem.POST, { token: lead.token, method: "POST", params: { studyId: study.id, itemId: item.id } });
    const a = await call(summary.POST, { token: cra.token, method: "POST", params: { documentId: filed.body.document_id } });
    expect(a.status).toBe(200);
    expect(a.body.output.summary).toBe("A protocol.");
    const b = await call(summary.POST, { token: cra.token, method: "POST", params: { documentId: filed.body.document_id } });
    expect(b.body.id).toBe(a.body.id);
    expect(calls).toHaveLength(1);
  });
});
