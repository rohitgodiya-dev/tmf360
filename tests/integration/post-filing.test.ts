// Part 8b: post-filing operations (M11 OPS-01..06) — delete rules and Final deletion requests,
// recycle bin, reclassify, revision requests, version history.
import { createHash } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as del from "@/app/api/v1/documents/[documentId]/delete/route";
import * as restore from "@/app/api/v1/documents/[documentId]/restore/route";
import * as delReq from "@/app/api/v1/documents/[documentId]/deletion-request/route";
import * as decide from "@/app/api/v1/deletion-requests/[requestId]/decide/route";
import * as list from "@/app/api/v1/studies/[studyId]/deletion-requests/route";
import * as reclass from "@/app/api/v1/documents/[documentId]/reclassify/route";
import * as revision from "@/app/api/v1/documents/[documentId]/revision/route";
import * as fileRoute from "@/app/api/v1/documents/[documentId]/file/route";
import * as versions from "@/app/api/v1/documents/[documentId]/versions/route";
import * as access from "@/app/api/v1/documents/[documentId]/access/route";
import { Fixtures, admin, call, type TestUser } from "./fixtures";

const fx = new Fixtures();
let org: string;
let lead: TestUser, admin2: TestUser, cra: TestUser, outsider: TestUser;
let study: { id: string; code: string };
const files: string[] = [];
let n = 0;

async function stored(content: string) {
  const hash = createHash("sha256").update(content).digest("hex");
  const path = `${org}/${study.code}/${hash}.pdf`;
  const { error } = await lead.db.storage.from("Documents").upload(path, new Blob([content], { type: "application/pdf" }));
  if (error && !/exists/i.test(error.message)) throw error;
  files.push(path);
  return { path, hash };
}
async function doc(status: string, extra: Record<string, unknown> = {}) {
  n += 1;
  const f = await stored(`%PDF-1.4 post-filing ${fx.runId} ${n}`);
  const { data, error } = await admin().from("documents").insert([{
    org_id: org, user_id: cra.id, study_id: study.code, artifact_num: "01.01.01", artifact_name: "Trial Master File Plan",
    custom_file_name: `PF doc ${n}`, status, version: "1.0", file_path: f.path, file_name: `pf-${n}.pdf`, file_type: "application/pdf", file_hash: f.hash,
    ...(status === "Approved" ? { approved_at: new Date().toISOString(), approved_by: "seed@example.test" } : {}), ...extra,
  }]).select("id").single();
  if (error) throw error;
  return data.id as string;
}
const row = async (id: string) => (await admin().from("documents").select("*").eq("id", id).single()).data;
const post = <P extends Record<string, string>>(h: { POST: (req: Request, ctx: { params: Promise<P> }) => Promise<Response> }, u: TestUser, params: P, body: unknown) =>
  call(h.POST, { token: u.token, method: "POST", params, body });

beforeAll(async () => {
  org = await fx.org("pf");
  lead = await fx.user("pf-lead", { orgId: org, role: "TMF Lead" });
  admin2 = await fx.user("pf-admin", { orgId: org, role: "Sponsor Admin" });
  cra = await fx.user("pf-cra", { orgId: org, role: "CRA" });
  outsider = await fx.user("pf-out", { orgId: await fx.org("pf-b"), role: "System Administrator" });
  study = await fx.study(org, "PF");
  await fx.member(org, study.code, cra, "CRA");
  const { error } = await lead.db.rpc("seed_study_tmf_config", { p_study_code: study.code });
  if (error) throw error;
});
afterAll(async () => {
  if (files.length) await admin().storage.from("Documents").remove(files);
  await fx.cleanup();
});

describe("delete (OPS-01/02) and recycle bin (OPS-03)", () => {
  it("a Draft is deleted with a coded reason and comment; restored with a reason", async () => {
    const id = await doc("Draft");
    expect((await post(del, cra, { documentId: id }, { code: "other", comment: "dup" })).status).toBe(403);
    expect((await post(del, lead, { documentId: id }, { code: "made_up", comment: "Uploaded twice" })).status).toBe(400);
    expect((await post(del, outsider, { documentId: id }, { code: "other", comment: "Uploaded twice" })).status).toBe(404);
    expect((await post(del, lead, { documentId: id }, { code: "not_tmf_relevant", comment: "Personal note, not TMF" })).status).toBe(200);
    expect(await row(id)).toMatchObject({ status: "Deleted", deletion_code: "not_tmf_relevant", deletion_reason: "Personal note, not TMF", pre_deletion_status: "Draft" });
    const { data: audit } = await admin().from("audit_trail").select("signature_reason").eq("document_id", id).eq("action", "Document deleted");
    expect(audit).toEqual([{ signature_reason: "Not TMF Relevant: Personal note, not TMF" }]);
    const r = await post(restore, lead, { documentId: id }, { reason: "Was TMF after all" });
    expect(r.body).toMatchObject({ status: "Draft" });
    expect((await row(id)).deleted_at).toBeNull();
  });

  it("restore is refused after 180 days", async () => {
    const id = await doc("Draft");
    await post(del, lead, { documentId: id }, { code: "other", comment: "old deletion" });
    await admin().from("documents").update({ deleted_at: new Date(Date.now() - 200 * 86400000).toISOString() }).eq("id", id);
    const r = await post(restore, lead, { documentId: id }, { reason: "too late" });
    expect(r.status).toBe(400);
    expect(r.body.error.message).toMatch(/180 days/);
  });

  it("a Final document needs a request approved by someone else with an electronic signature", async () => {
    const id = await doc("Approved");
    expect((await post(del, lead, { documentId: id }, { code: "other", comment: "Superseded copy" })).body.error.message).toMatch(/deletion request/);
    const req = await post(delReq, cra, { documentId: id }, { code: "incorrectly_indexed", comment: "Filed under the wrong study" });
    expect(req.status).toBe(201);
    expect((await post(delReq, cra, { documentId: id }, { code: "other", comment: "again please" })).status).toBe(400);

    const rid = req.body.id;
    const listed = await call(list.GET, { token: lead.token, params: { studyId: study.id } });
    expect(listed.body.data.find((x: { id: string }) => x.id === rid)).toMatchObject({ status: "pending", reason: "Incorrectly Indexed", can_decide: true, title: `PF doc ${n}` });
    expect((await call(list.GET, { token: cra.token, params: { studyId: study.id } })).body.data.find((x: { id: string }) => x.id === rid)).toMatchObject({ can_decide: false, can_withdraw: true });

    expect((await post(decide, cra, { requestId: rid }, { decision: "approved", password: cra.password })).status).toBe(404);   // CRA: no delete permission
    expect((await post(decide, lead, { requestId: rid }, { decision: "approved" })).status).toBe(400);                          // no password
    expect((await post(decide, lead, { requestId: rid }, { decision: "approved", password: "wrong" })).status).toBe(400);
    expect((await row(id)).deleted_at).toBeNull();
    const ok = await post(decide, lead, { requestId: rid }, { decision: "approved", comment: "Confirmed with CTM", password: lead.password });
    expect(ok.status).toBe(200);
    expect(await row(id)).toMatchObject({ status: "Deleted", deletion_code: "incorrectly_indexed", pre_deletion_status: "Approved" });
    const { data: sig } = await admin().from("signature_events").select("kind, meaning, signer_id").eq("document_id", id).single();
    expect(sig).toEqual({ kind: "signature", meaning: "Deletion approved", signer_id: lead.id });
  });

  it("the requester can't approve their own request; requests can be withdrawn or rejected", async () => {
    const id = await doc("Approved");
    const rid = (await post(delReq, lead, { documentId: id }, { code: "other", comment: "Not needed" })).body.id;
    const self = await post(decide, lead, { requestId: rid }, { decision: "approved", password: lead.password });
    expect(self.status).toBe(404);
    expect((await post(decide, admin2, { requestId: rid }, { decision: "rejected", comment: "" })).status).toBe(400);
    expect((await post(decide, admin2, { requestId: rid }, { decision: "rejected", comment: "Still needed for inspection" })).status).toBe(200);
    expect((await row(id)).deleted_at).toBeNull();
    const rid2 = (await post(delReq, lead, { documentId: id }, { code: "other", comment: "Second try" })).body.id;
    expect((await post(decide, admin2, { requestId: rid2 }, { decision: "withdrawn" })).status).toBe(404);
    expect((await post(decide, lead, { requestId: rid2 }, { decision: "withdrawn" })).status).toBe(200);
  });
});

describe("reclassify (OPS-04)", () => {
  it("a Document in QC goes back to Draft and its task is cancelled", async () => {
    const id = await doc("Draft");
    expect((await cra.db.rpc("submit_for_qc", { p_document: id })).error).toBeNull();
    const r = await post(reclass, cra, { documentId: id }, { artifact_num: "01.01.02", reason: "It is the management plan" });
    expect(r.status).toBe(200);
    expect(r.body.status).toBe("Draft");
    expect(await row(id)).toMatchObject({ artifact_num: "01.01.02", artifact_name: "Trial Management Plan", status: "Draft" });
    const { data: t } = await admin().from("document_tasks").select("status, cancel_reason").eq("document_id", id).single();
    expect(t).toEqual({ status: "cancelled", cancel_reason: "Document reclassified: It is the management plan" });
    const { data: snap } = await admin().from("document_metadata_versions").select("snapshot, change_reason").eq("document_id", id).order("version_no", { ascending: false }).limit(1).single();
    expect(snap!.snapshot.artifact_num).toBe("01.01.01");
    expect(snap!.change_reason).toBe("Reclassified: It is the management plan");
  });

  it("a Final document needs approve rights and a password, and records an attestation", async () => {
    const id = await doc("Approved");
    expect((await lead.db.from("documents").update({ artifact_num: "01.01.02" }).eq("id", id)).error?.message).toMatch(/Reclassify/);
    expect((await post(reclass, cra, { documentId: id }, { artifact_num: "01.01.02", reason: "Misfiled", password: cra.password })).status).toBe(404);
    expect((await post(reclass, lead, { documentId: id }, { artifact_num: "01.01.02", reason: "Misfiled" })).status).toBe(400);
    expect((await post(reclass, lead, { documentId: id }, { artifact_num: "99.99.99", reason: "Misfiled", password: lead.password })).status).toBe(400);
    const ok = await post(reclass, lead, { documentId: id }, { artifact_num: "01.01.02", reason: "Misfiled at upload", password: lead.password });
    expect(ok.status).toBe(200);
    expect(await row(id)).toMatchObject({ artifact_num: "01.01.02", status: "Approved" });
    const { data: sig } = await admin().from("signature_events").select("kind, meaning").eq("document_id", id).single();
    expect(sig).toEqual({ kind: "attestation", meaning: "Reclassified, with reason" });
  });
});

describe("revision requests (OPS-05) and version history (OPS-06)", () => {
  it("Final metadata can't be edited directly", async () => {
    const id = await doc("Approved");
    const r = await lead.db.from("documents").update({ version: "9.9", expiry_date: "2030-01-01" }).eq("id", id);
    expect(r.error?.message).toMatch(/Revision request/);
    expect((await lead.db.from("documents").update({ comments: "still fine" }).eq("id", id)).error).toBeNull();
  });

  it("File as Final applies metadata with an attestation and keeps the old values", async () => {
    const id = await doc("Approved");
    const bad = await post(revision, lead, { documentId: id }, { rationale: "content_and_metadata_update", description: "New content", process: "file_as_final", password: lead.password });
    expect(bad.status).toBe(400);
    expect((await post(revision, cra, { documentId: id }, { rationale: "metadata_update", description: "Fix expiry", process: "file_as_final", changes: { expiry_date: "2031-06-30" }, password: cra.password })).status).toBe(404);
    const r = await post(revision, lead, { documentId: id }, {
      rationale: "metadata_update", description: "Expiry date was wrong", proposed_revision: "1.1", process: "file_as_final",
      changes: { expiry_date: "2031-06-30" }, password: lead.password,
    });
    expect(r.status).toBe(200);
    expect(await row(id)).toMatchObject({ status: "Approved", version: "1.1", expiry_date: "2031-06-30" });
    const h = await call(versions.GET, { token: cra.token, params: { documentId: id } });
    expect(h.body.revisions[0]).toMatchObject({ rationale: "Metadata update", process: "file_as_final", proposed_revision: "1.1", requested_by: lead.email });
    expect(h.body.metadata[0].snapshot).toMatchObject({ version: "1.0", expiry_date: null });
    expect(h.body.metadata[0].change_reason).toBe("Revision filed as Final: Expiry date was wrong");
    const { data: sig } = await admin().from("signature_events").select("meaning").eq("document_id", id).single();
    expect(sig!.meaning).toBe("Revision approved");
  });

  it("Start collaboration returns to Draft; a new file is verified and the old one stays viewable", async () => {
    const id = await doc("Approved");
    const r = await post(revision, cra, { documentId: id }, { rationale: "content_and_metadata_update", description: "Updated plan v2", proposed_revision: "2.0", process: "collaboration" });
    expect(r.status).toBe(200);
    expect(await row(id)).toMatchObject({ status: "Draft", version: "2.0", approved_at: null });

    const f = await stored(`%PDF-1.4 revised ${fx.runId}`);
    const wrong = await post(fileRoute, cra, { documentId: id }, { file_path: f.path, file_name: "v2.pdf", file_type: "application/pdf", file_hash: "0".repeat(64) });
    expect(wrong.status).toBe(400);
    const up = await post(fileRoute, cra, { documentId: id }, { file_path: f.path, file_name: "v2.pdf", file_type: "application/pdf", file_size_bytes: 30, file_hash: f.hash });
    expect(up.status).toBe(200);
    expect(up.body).toMatchObject({ version_no: 2, verification_status: "verified" });

    const h = await call(versions.GET, { token: cra.token, params: { documentId: id } });
    expect(h.body.files.map((x: { version_no: number; current: boolean }) => [x.version_no, x.current])).toEqual([[2, true], [1, false]]);
    const old = await post(access, cra, { documentId: id }, { purpose: "view", version_no: 1 });
    expect(old.status).toBe(200);
    expect(old.body.url).toContain("token=");
    expect((await post(access, cra, { documentId: id }, { purpose: "view", version_no: 9 })).status).toBe(404);

    // QC again, then a Final document can't take a new file.
    await cra.db.rpc("submit_for_qc", { p_document: id });
    const f2 = await stored(`%PDF-1.4 sneaky ${fx.runId}`);
    expect((await post(fileRoute, cra, { documentId: id }, { file_path: f2.path, file_name: "x.pdf", file_hash: f2.hash })).status).toBe(400);
  });
});

describe("archive", () => {
  it("an archived Final document can be restored to Approved", async () => {
    const id = await doc("Approved");
    expect((await lead.db.from("documents").update({ status: "Archived", archived_at: new Date().toISOString(), archive_reason: "Superseded", pre_archive_status: "Approved" }).eq("id", id)).error).toBeNull();
    const back = await lead.db.from("documents").update({ status: "Approved", archived_at: null, archive_reason: null, pre_archive_status: null }).eq("id", id).select("status").single();
    expect(back.error).toBeNull();
    expect(back.data!.status).toBe("Approved");
    // But a Draft can't be "restored" into Approved.
    const d = await doc("Draft");
    await lead.db.from("documents").update({ status: "Archived", archived_at: new Date().toISOString(), pre_archive_status: "Approved" }).eq("id", d);
    expect((await lead.db.from("documents").update({ status: "Approved" }).eq("id", d)).error?.message).toMatch(/QC/);
  });
});
