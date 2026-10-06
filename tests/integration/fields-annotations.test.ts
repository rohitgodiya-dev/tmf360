// Part 22: required and type-specific fields per document type (RM-06) and reviewer annotations (VWR-03).
import { createHash } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as intake from "@/app/api/v1/studies/[studyId]/intake/route";
import * as intakeItem from "@/app/api/v1/studies/[studyId]/intake/[itemId]/route";
import * as fileItem from "@/app/api/v1/studies/[studyId]/intake/[itemId]/file/route";
import * as rules from "@/app/api/v1/field-rules/route";
import * as docFields from "@/app/api/v1/documents/[documentId]/fields/route";
import * as submit from "@/app/api/v1/documents/[documentId]/submit/route";
import * as annotations from "@/app/api/v1/documents/[documentId]/annotations/route";
import * as resolve from "@/app/api/v1/annotations/[annotationId]/resolve/route";
import { Fixtures, admin, call, type TestUser } from "./fixtures";

const fx = new Fixtures();
let org: string;
let lead: TestUser, cra: TestUser, outsider: TestUser;
let study: { id: string; code: string };
let artifact: string;
let item: { id: string; row_version: number };
let docId: string;
const paths: string[] = [];

const rule = { required_fields: ["version", "effective_date"], custom_fields: [
  { key: "irb_number", label: "IRB number", type: "text", required: true },
  { key: "language", label: "Language", type: "select", options: ["EN", "DE"] },
] };

beforeAll(async () => {
  org = await fx.org("fld");
  lead = await fx.user("fld-lead", { orgId: org, role: "TMF Lead" });
  cra = await fx.user("fld-cra", { orgId: org, role: "CRA" });
  const orgB = await fx.org("fld-b");
  outsider = await fx.user("fld-out", { orgId: orgB, role: "System Administrator" });
  study = await fx.study(org, "FLD");
  await fx.member(org, study.code, cra, "CRA");
  const { error } = await lead.db.rpc("seed_study_tmf_config", { p_study_code: study.code });
  if (error) throw error;
  const { data } = await admin().from("tmf_config").select("artifact_num").eq("study_id", study.code).eq("type", "artifact").eq("is_enabled", true).order("artifact_num").limit(1).single();
  artifact = data!.artifact_num;

  const bytes = new TextEncoder().encode(`%PDF-1.4\n% fields ${fx.runId}\n`);
  const hash = createHash("sha256").update(bytes).digest("hex");
  const path = `${org}/${study.code}/${hash}.pdf`;
  await lead.db.storage.from("Documents").upload(path, bytes);
  paths.push(path);
  const r = await call(intake.POST, { token: lead.token, method: "POST", params: { studyId: study.id }, body: { file_path: path, file_name: "consent.pdf", file_type: "application/pdf", file_size_bytes: bytes.length, file_hash: hash } });
  item = r.body;
});
afterAll(async () => {
  const a = admin();
  await a.from("document_annotations").delete().eq("org_id", org);
  await a.from("document_tasks").delete().eq("org_id", org);
  await a.from("intake_items").delete().eq("org_id", org);
  await a.from("documents").delete().eq("org_id", org);
  await a.from("artifact_field_rules").delete().eq("org_id", org);
  await a.storage.from("Documents").remove(paths);
  await fx.cleanup();
});

describe("field rules (RM-06)", () => {
  it("only administrators and TMF leads define them, with a reason", async () => {
    expect((await call(rules.PUT, { token: cra.token, method: "PUT", body: { artifact_num: artifact, ...rule, change_reason: "Need IRB" } })).status).toBe(403);
    expect((await call(rules.PUT, { token: lead.token, method: "PUT", body: { artifact_num: artifact, ...rule } })).status).toBe(400);
    const bad = await call(rules.PUT, { token: lead.token, method: "PUT", body: { artifact_num: artifact, required_fields: [], custom_fields: [{ key: "x", label: "X", type: "select" }], change_reason: "Try" } });
    expect(bad.status).toBe(400);
    const r = await call(rules.PUT, { token: lead.token, method: "PUT", body: { artifact_num: artifact, ...rule, change_reason: "IRB reference needed for inspections" } });
    expect(r.status).toBe(201);
    const { data } = await admin().from("audit_trail").select("action").eq("org_id", org).eq("action", "artifact_field_rules.insert");
    expect(data).toHaveLength(1);
  });

  it("values are checked against the field type", async () => {
    const r = await call(intakeItem.PATCH, { token: lead.token, method: "PATCH", params: { studyId: study.id, itemId: item.id },
      body: { row_version: item.row_version, artifact_num: artifact, custom_metadata: { language: "FR" } } });
    expect(r.status).toBe(400);
    expect(r.body.error.message).toMatch(/Language/);
  });

  it("an item missing required fields cannot be filed; once complete it files with its values", async () => {
    const saved = await call(intakeItem.PATCH, { token: lead.token, method: "PATCH", params: { studyId: study.id, itemId: item.id },
      body: { row_version: item.row_version, artifact_num: artifact, version_label: "1.0", custom_metadata: { language: "EN", unknown_key: "dropped" } } });
    expect(saved.status).toBe(200);
    expect(saved.body.custom_metadata).toEqual({ language: "EN" });
    const blocked = await call(fileItem.POST, { token: lead.token, method: "POST", params: { studyId: study.id, itemId: item.id } });
    expect(blocked.status).toBe(400);
    expect(blocked.body.error.message).toMatch(/Effective date.*IRB number/);

    const done = await call(intakeItem.PATCH, { token: lead.token, method: "PATCH", params: { studyId: study.id, itemId: item.id },
      body: { row_version: saved.body.row_version, effective_date: "2026-09-01", custom_metadata: { language: "EN", irb_number: "IRB-77" } } });
    expect(done.status).toBe(200);
    const filed = await call(fileItem.POST, { token: lead.token, method: "POST", params: { studyId: study.id, itemId: item.id } });
    expect(filed.status).toBeLessThan(300);
    const { data: d } = await admin().from("documents").select("id, custom_metadata").eq("org_id", org).single();
    expect(d?.custom_metadata).toEqual({ language: "EN", irb_number: "IRB-77" });
    docId = d!.id;
  });

  it("Submit for QC refuses a document whose required fields were emptied", async () => {
    const cleared = await call(docFields.PUT, { token: lead.token, method: "PUT", params: { documentId: docId }, body: { custom_metadata: { language: "DE" }, reason: "Wrong IRB entered" } });
    expect(cleared.status).toBe(200);
    const g = await call(docFields.GET, { token: lead.token, params: { documentId: docId } });
    expect(g.body.missing).toEqual(["IRB number"]);
    const s = await call(submit.POST, { token: lead.token, method: "POST", params: { documentId: docId }, body: {} });
    expect(s.status).toBe(400);
    expect(s.body.error.message).toMatch(/IRB number/);
    expect((await call(docFields.PUT, { token: lead.token, method: "PUT", params: { documentId: docId }, body: { custom_metadata: { language: "DE", irb_number: "IRB-78" }, reason: "Corrected IRB" } })).status).toBe(200);
    expect((await call(submit.POST, { token: lead.token, method: "POST", params: { documentId: docId }, body: {} })).status).toBeLessThan(300);
    const { data: snaps } = await admin().from("document_metadata_versions").select("snapshot").eq("document_id", docId);
    expect(snaps?.some((x) => x.snapshot.custom_metadata?.irb_number === "IRB-77")).toBe(true);
    expect((await call(docFields.PUT, { token: lead.token, method: "PUT", params: { documentId: docId }, body: { custom_metadata: {}, reason: "Try in QC" } })).status).toBe(409);
  });
});

describe("reviewer annotations (VWR-03)", () => {
  let noteId: string;
  it("reviewers pin notes to a page position; others cannot add", async () => {
    expect((await call(annotations.POST, { token: cra.token, method: "POST", params: { documentId: docId }, body: { page: 1, x: 0.2, y: 0.3, body: "No" } })).status).toBe(404);
    const r = await call(annotations.POST, { token: lead.token, method: "POST", params: { documentId: docId }, body: { page: 1, x: 0.25, y: 0.4, body: "Signature date is missing" } });
    expect(r.status).toBe(201);
    noteId = r.body.id;
    const list = await call(annotations.GET, { token: cra.token, params: { documentId: docId } });
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0]).toMatchObject({ page: 1, body: "Signature date is missing", status: "open", created_by_email: lead.email.toLowerCase() });
    expect(list.body.data[0].file_version_id).not.toBeNull();
    expect(list.body.can_annotate).toBe(false);
  });

  it("are invisible to other organisations and cannot be written or deleted directly", async () => {
    expect((await call(annotations.GET, { token: outsider.token, params: { documentId: docId } })).status).toBe(404);
    const { data: del } = await lead.db.from("document_annotations").delete().eq("id", noteId).select("id");
    expect(del ?? []).toHaveLength(0);
    const { error } = await lead.db.from("document_annotations").update({ body: "edited" }).eq("id", noteId);
    expect(error).not.toBeNull();
  });

  it("are resolved, never removed, and the history is audited", async () => {
    expect((await call(resolve.POST, { token: cra.token, method: "POST", params: { annotationId: noteId }, body: {} })).status).toBe(404);
    expect((await call(resolve.POST, { token: lead.token, method: "POST", params: { annotationId: noteId }, body: { note: "Date added in v1.1" } })).status).toBe(200);
    expect((await call(resolve.POST, { token: lead.token, method: "POST", params: { annotationId: noteId }, body: {} })).status).toBe(400);
    const { data } = await admin().from("document_annotations").select("status, resolution_note, resolved_at").eq("id", noteId).single();
    expect(data).toMatchObject({ status: "resolved", resolution_note: "Date added in v1.1" });
    const { data: audit } = await admin().from("audit_trail").select("action").eq("org_id", org).in("action", ["Annotation added", "Annotation resolved"]);
    expect(audit).toHaveLength(2);
  });
});
