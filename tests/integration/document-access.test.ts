// Part 4a: document permissions are enforced by the database, not just hidden in the UI.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Fixtures, admin, type TestUser } from "./fixtures";

const fx = new Fixtures();
let orgA: string;
let sysAdmin: TestUser;
let cra: TestUser;
let auditor: TestUser;
let outsider: TestUser; // same org, not on the study
let study: { id: string; code: string };
let otherStudy: { id: string; code: string };
let docId: string;
const uploaded: string[] = [];

beforeAll(async () => {
  orgA = await fx.org("doc-acc");
  sysAdmin = await fx.user("da-admin", { orgId: orgA, role: "System Administrator" });
  cra = await fx.user("da-cra", { orgId: orgA, role: "CRA" });
  auditor = await fx.user("da-auditor", { orgId: orgA, role: "Auditor" });
  outsider = await fx.user("da-outsider", { orgId: orgA, role: "CRA" });
  study = await fx.study(orgA, "DA");
  otherStudy = await fx.study(orgA, "DA2");
  await fx.member(orgA, study.code, cra, "CRA");
  await fx.member(orgA, study.code, auditor, "Auditor");
  docId = await fx.document({ orgId: orgA, userId: cra.id, studyId: study.code });
});
afterAll(async () => {
  await admin().from("study_access_grants").delete().eq("org_id", orgA);
  if (uploaded.length) await admin().storage.from("Documents").remove(uploaded);
  await fx.cleanup();
});

async function status() {
  const { data } = await admin().from("documents").select("status, deleted_at, study_id, comments").eq("id", docId).single();
  return data!;
}

async function insertDoc(u: TestUser, studyCode: string) {
  const { data, error } = await u.db.from("documents")
    .insert([{ org_id: orgA, user_id: u.id, study_id: studyCode, artifact_name: "x", status: "Draft" }]).select("id").single();
  if (data) await admin().from("documents").delete().eq("id", data.id);
  return error;
}

describe("creating documents", () => {
  it("needs access to the study", async () => {
    expect(await insertDoc(outsider, study.code)).not.toBeNull();
  });

  it("needs upload permission", async () => {
    expect(await insertDoc(auditor, study.code)).not.toBeNull();
    expect(await insertDoc(cra, study.code)).toBeNull();
  });
});

describe("changing documents", () => {
  // Since Part 7, submitting and approving go through the QC workflow (qc-workflow.test.ts).
  it("a CRA can submit for QC but not approve", async () => {
    await admin().from("documents").update({ file_path: `${orgA}/${study.code}/da-${fx.runId}.pdf` }).eq("id", docId);
    expect((await cra.db.rpc("submit_for_qc", { p_document: docId })).error).toBeNull();
    const r = await cra.db.from("documents").update({ status: "Approved", approved_at: new Date().toISOString() }).eq("id", docId);
    expect(r.error?.message).toMatch(/approve_document/);
    expect((await status()).status).toBe("Under Review");
  });

  it("an administrator approves through the QC task, not by editing the document", async () => {
    const r = await sysAdmin.db.from("documents").update({ status: "Approved", approved_at: new Date().toISOString() }).eq("id", docId);
    expect(r.error?.message).toMatch(/QC/);
    const { data: task } = await admin().from("document_tasks").select("id").eq("document_id", docId).eq("status", "open").single();
    const { data: proof } = await admin().from("reauth_proofs").insert([{ user_id: sysAdmin.id, purpose: "qc_decision" }]).select("id").single();
    const done = await sysAdmin.db.rpc("complete_qc_task", { p_task: task!.id, p_outcome: "accept", p_reason_codes: [], p_comment: "", p_reauth: proof!.id });
    expect(done.error).toBeNull();
    expect((await status()).status).toBe("Approved");
  });

  it("an auditor can comment but not edit", async () => {
    expect((await auditor.db.from("documents").update({ comments: "Looks fine" }).eq("id", docId)).error).toBeNull();
    expect((await status()).comments).toBe("Looks fine");
    const r = await auditor.db.from("documents").update({ artifact_name: "Renamed" }).eq("id", docId);
    expect(r.error?.message).toMatch(/upload_document/);
  });

  it("a CRA cannot delete; an administrator can", async () => {
    const del = { deleted_at: new Date().toISOString(), deletion_reason: "test", status: "Deleted" };
    expect((await cra.db.from("documents").update(del).eq("id", docId)).error?.message).toMatch(/delete_document/);
    expect((await status()).deleted_at).toBeNull();
    expect((await sysAdmin.db.from("documents").update(del).eq("id", docId)).error).toBeNull();
    expect((await sysAdmin.db.from("documents").update({ deleted_at: null, status: "Draft" }).eq("id", docId)).error).toBeNull();
  });

  it("documents cannot be moved to another study", async () => {
    const r = await sysAdmin.db.from("documents").update({ study_id: otherStudy.code }).eq("id", docId);
    expect(r.error).not.toBeNull();
    expect((await status()).study_id).toBe(study.code);
  });
});

describe("study access grants", () => {
  it("users cannot grant themselves access to a study", async () => {
    const { error } = await outsider.db.from("study_access_grants")
      .insert([{ org_id: orgA, study_id: study.code, user_id: outsider.id, is_active: true }]);
    expect(error).not.toBeNull();
    expect(await insertDoc(outsider, study.code)).not.toBeNull();
  });

  it("administrators can grant access", async () => {
    const { error } = await sysAdmin.db.from("study_access_grants")
      .insert([{ org_id: orgA, study_id: study.code, user_id: outsider.id, is_active: true, granted_by: sysAdmin.id }]);
    expect(error).toBeNull();
    expect(await insertDoc(outsider, study.code)).toBeNull();
  });
});

describe("stored files", () => {
  it("cannot be overwritten", async () => {
    const path = `${orgA}/${study.code}/test-${fx.runId}.txt`;
    uploaded.push(path);
    const first = await cra.db.storage.from("Documents").upload(path, new Blob(["original"]));
    expect(first.error).toBeNull();
    await cra.db.storage.from("Documents").upload(path, new Blob(["tampered"]), { upsert: true });
    const { data } = await admin().storage.from("Documents").download(path);
    expect(await data!.text()).toBe("original");
  });
});
