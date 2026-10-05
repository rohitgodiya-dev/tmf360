// Part 13b: certified copies (CCP-03..06, REG-06): certification of one file version with source,
// method and verification recorded, an electronic signature bound to the file hash, and who may certify.
import { createHash } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as certify from "@/app/api/v1/documents/[documentId]/certify/route";
import { Fixtures, admin, call, type TestUser } from "./fixtures";

const fx = new Fixtures();
let org: string;
let lead: TestUser, cra: TestUser, owner: TestUser;
let study: { id: string; code: string };
let docId: string;
let fileHash: string;
const paths: string[] = [];

const body = (over: Record<string, unknown> = {}, u: TestUser = lead) => ({
  method: "paper_scan", source_description: "Wet-ink signed protocol v3, 42 pages", source_location: "Site 101 binder",
  checks: { page_count: true, legible: true, complete: true, unaltered: true }, password: u.password, ...over,
});

beforeAll(async () => {
  org = await fx.org("ccp");
  lead = await fx.user("ccp-lead", { orgId: org, role: "TMF Lead" });
  cra = await fx.user("ccp-cra", { orgId: org, role: "CRA" });
  owner = await fx.user("ccp-owner", { orgId: org, role: "Clinical Trial Associate" });
  study = await fx.study(org, "CCP");
  await fx.member(org, study.code, cra, "CRA");
  await fx.member(org, study.code, owner, "Clinical Trial Associate");
  const bytes = new TextEncoder().encode(`%PDF-1.4\n% certified ${fx.runId}\n`);
  fileHash = createHash("sha256").update(bytes).digest("hex");
  const path = `${org}/${study.code}/${fileHash}.pdf`;
  await admin().storage.from("Documents").upload(path, bytes, { contentType: "application/pdf" });
  paths.push(path);
  const { data, error } = await admin().from("documents").insert([{ org_id: org, user_id: owner.id, study_id: study.code, status: "Approved", approved_at: new Date().toISOString(),
    approved_by: "seed@example.test", artifact_num: "02.01.02", artifact_name: "Protocol", custom_file_name: "Protocol v3 (scan)", file_path: path, file_name: "p.pdf", file_hash: fileHash }]).select("id").single();
  if (error) throw error;
  docId = data.id;
});

afterAll(async () => {
  await admin().storage.from("Documents").remove(paths);
  await fx.cleanup();
});

describe("certified copies (CCP-03..06, REG-06)", () => {
  it("the mark can't be set directly", async () => {
    const { error } = await lead.db.from("documents").update({ certified_copy: true }).eq("id", docId);
    expect(error?.message).toMatch(/electronic signature/);
  });

  it("every verification must be confirmed; an electronic duplicate needs the matching source hash", async () => {
    const r = await call(certify.POST, { token: lead.token, method: "POST", params: { documentId: docId }, body: body({ checks: { page_count: true, legible: true, complete: false, unaltered: true } }) });
    expect(r.status).toBe(400);
    expect(r.body.error.message).toMatch(/Confirm every verification/);
    const dup = await call(certify.POST, { token: lead.token, method: "POST", params: { documentId: docId }, body: body({ method: "electronic_duplicate", source_hash: "a".repeat(64) }) });
    expect(dup.body.error.message).toMatch(/same SHA-256/);
  });

  it("a CRA who is neither owner nor approver may not certify; a wrong password is refused", async () => {
    expect((await call(certify.POST, { token: cra.token, method: "POST", params: { documentId: docId }, body: body({}, cra) })).status).toBe(404);
    expect((await call(certify.POST, { token: lead.token, method: "POST", params: { documentId: docId }, body: body({ password: "nope" }) })).status).toBe(400);
  });

  it("the owner certifies: signature bound to the file hash, source and method recorded, record marked", async () => {
    const r = await call(certify.POST, { token: owner.token, method: "POST", params: { documentId: docId }, body: body({}, owner) });
    expect(r.status, JSON.stringify(r.body)).toBe(201);
    const { data: sig } = await admin().from("signature_events").select("meaning, file_hash, signer_id, action").eq("document_id", docId).eq("action", "certified_copy").single();
    expect(sig).toEqual({ meaning: "Certified as a true copy of the original", file_hash: fileHash, signer_id: owner.id, action: "certified_copy" });
    const { data: doc } = await admin().from("documents").select("certified_copy").eq("id", docId).single();
    expect(doc!.certified_copy).toBe(true);
    const list = await call(certify.GET, { token: cra.token, params: { documentId: docId } });
    expect(list.body.data[0]).toMatchObject({ method: "paper_scan", source_location: "Site 101 binder", version_no: 1, covers_current: true });
    const { data: audit } = await admin().from("audit_trail").select("action").eq("document_id", docId).eq("action", "Certified as a true copy (electronic signature)");
    expect(audit).toHaveLength(1);
  });

  it("the same file version can't be certified twice, and certifications are append-only", async () => {
    expect((await call(certify.POST, { token: lead.token, method: "POST", params: { documentId: docId }, body: body() })).status).toBe(400);
    const { error } = await admin().from("certified_copies").update({ source_description: "changed" }).eq("document_id", docId);
    expect(error?.message).toMatch(/append-only/);
  });
});
