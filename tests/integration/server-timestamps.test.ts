// Pillar 6: record times and actors come from the database, not the browser.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Fixtures, admin, type TestUser } from "./fixtures";

const fx = new Fixtures();
let orgA: string;
let orgB: string;
let userA: TestUser;
let study: { id: string; code: string };
let docId: string;

const PAST = "2000-01-01T00:00:00.000Z";
const FORGED = "someone-else@example.test";

/** True if the timestamp is within a minute of now (server and test clocks may differ slightly). */
function isRecent(t: string | null | undefined) {
  expect(t).toBeTruthy();
  const ms = Date.parse(/[zZ]|[+-]\d\d:?\d\d$/.test(t!) ? t! : t! + "Z");
  expect(Math.abs(Date.now() - ms)).toBeLessThan(60_000);
}

beforeAll(async () => {
  orgA = await fx.org("ts-a");
  orgB = await fx.org("ts-b");
  userA = await fx.user("ts-admin-a", { orgId: orgA, role: "System Administrator" });
  study = await fx.study(orgA, "TS");
  docId = await fx.document({ orgId: orgA, userId: userA.id, studyId: study.code });
});
afterAll(async () => {
  await admin().from("document_metadata_versions").delete().eq("document_id", docId);
  await fx.cleanup();
});

async function doc() {
  const { data, error } = await admin().from("documents").select("*").eq("id", docId).single();
  if (error) throw error;
  return data;
}

describe("documents", () => {
  it("stamps approval time and approver from the server", async () => {
    // A forged approval time or approver is refused outright (Part 7: approval is a QC decision)…
    const { error } = await userA.db.from("documents")
      .update({ status: "Approved", approved_at: PAST, approved_by: FORGED }).eq("id", docId);
    expect(error?.message).toMatch(/QC/);
    // …and the QC decision records the server's time and the signed-in user.
    await admin().from("documents").update({ file_path: `${orgA}/${study.code}/ts-${fx.runId}.pdf` }).eq("id", docId);
    expect((await userA.db.rpc("submit_for_qc", { p_document: docId })).error).toBeNull();
    const { data: task } = await admin().from("document_tasks").select("id").eq("document_id", docId).eq("status", "open").single();
    const { data: proof } = await admin().from("reauth_proofs").insert([{ user_id: userA.id, purpose: "qc_decision" }]).select("id").single();
    expect((await userA.db.rpc("complete_qc_task", { p_task: task!.id, p_outcome: "accept", p_reason_codes: [], p_comment: "", p_reauth: proof!.id })).error).toBeNull();
    const d = await doc();
    isRecent(d.approved_at);
    expect(d.approved_by).toBe(userA.email);
  });

  it("does not let created_at be changed", async () => {
    const before = (await doc()).created_at;
    await userA.db.from("documents").update({ created_at: PAST }).eq("id", docId);
    expect((await doc()).created_at).toBe(before);
  });

  it("stamps deletion time and deleter, and still allows restore", async () => {
    await userA.db.from("documents")
      .update({ deleted_at: PAST, deleted_by: FORGED, deletion_reason: "test" }).eq("id", docId);
    let d = await doc();
    isRecent(d.deleted_at);
    expect(d.deleted_by).toBe(userA.email);
    expect(d.deleted_by_id).toBe(userA.id);

    await userA.db.from("documents").update({ deleted_at: null, deleted_by: null, deletion_reason: null }).eq("id", docId);
    d = await doc();
    expect(d.deleted_at).toBeNull();
  });

  it("leaves service-role writes (imports) alone", async () => {
    await admin().from("documents").update({ archived_at: PAST }).eq("id", docId);
    expect(Date.parse((await doc()).archived_at)).toBe(Date.parse(PAST));
    await admin().from("documents").update({ archived_at: null }).eq("id", docId);
  });
});

describe("audit trail", () => {
  it("uses server time and the signed-in user's email", async () => {
    const action = `ts-test-${fx.runId}`;
    const { error } = await userA.db.from("audit_trail").insert([{
      user_id: userA.id, user_email: FORGED, action, created_at: PAST,
    }]);
    expect(error).toBeNull();
    const { data } = await admin().from("audit_trail").select("*").eq("action", action).single();
    isRecent(data.created_at);
    expect(data.user_email).toBe(userA.email);
    expect(data.org_id).toBe(orgA);
  });

  it("refuses rows for another organisation's chain", async () => {
    const { error } = await userA.db.from("audit_trail").insert([{
      user_id: userA.id, org_id: orgB, action: `ts-cross-${fx.runId}`,
    }]);
    expect(error).not.toBeNull();
    const { data } = await admin().from("audit_trail").select("id").eq("org_id", orgB);
    expect(data).toEqual([]);
  });
});

describe("document metadata versions", () => {
  let versionId: string;

  it("stamps the change time and author", async () => {
    const { data, error } = await userA.db.from("document_metadata_versions").insert([{
      document_id: docId, org_id: orgA, study_id: study.code, version_no: 1,
      snapshot: { status: "Draft" }, changed_at: PAST, changed_by_email: FORGED,
    }]).select("id").single();
    expect(error).toBeNull();
    versionId = data!.id;
    const { data: v } = await admin().from("document_metadata_versions").select("*").eq("id", versionId).single();
    isRecent(v.changed_at);
    expect(v.changed_by_email).toBe(userA.email);
    expect(v.changed_by_id).toBe(userA.id);
  });

  it("cannot be changed or removed by users", async () => {
    await userA.db.from("document_metadata_versions").update({ snapshot: { status: "x" } }).eq("id", versionId);
    await userA.db.from("document_metadata_versions").delete().eq("id", versionId);
    const { data } = await admin().from("document_metadata_versions").select("snapshot").eq("id", versionId).single();
    expect(data!.snapshot).toEqual({ status: "Draft" });
  });
});
