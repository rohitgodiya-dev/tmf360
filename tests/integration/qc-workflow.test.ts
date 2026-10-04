// Part 7a: File Plan, QC tasks, decisions and signatures — enforced in the database.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Fixtures, admin, type TestUser } from "./fixtures";

const fx = new Fixtures();
let org: string;
let lead: TestUser;        // TMF Lead: submit, approve, reject
let cra: TestUser;         // CRA: submit only
let qa: TestUser;          // Quality Assurance: approve, reject
let auditor: TestUser;     // read-only
let study: { id: string; code: string };
let n = 0;

/** A Draft document with a stored file (so it has a file version). */
async function draft(artifact = "01.01.01") {
  n += 1;
  const { data, error } = await admin().from("documents").insert([{
    org_id: org, user_id: lead.id, study_id: study.code, artifact_num: artifact, artifact_name: "Trial Master File Plan",
    custom_file_name: `QC doc ${n}`, status: "Draft", file_path: `${org}/${study.code}/qc-${fx.runId}-${n}.pdf`,
    file_name: `qc-${n}.pdf`, file_type: "application/pdf", file_hash: "a".repeat(63) + (n % 10),
  }]).select("id").single();
  if (error) throw error;
  return data.id as string;
}

/** What the API records after it re-checks a password. */
async function proof(u: TestUser, opts: { expired?: boolean } = {}) {
  const { data, error } = await admin().from("reauth_proofs").insert([{
    user_id: u.id, purpose: "qc_decision",
    ...(opts.expired ? { expires_at: new Date(Date.now() - 1000).toISOString() } : {}),
  }]).select("id").single();
  if (error) throw error;
  return data.id as string;
}

const openTask = async (doc: string) =>
  (await admin().from("document_tasks").select("*").eq("document_id", doc).eq("status", "open").maybeSingle()).data;
const docRow = async (doc: string) =>
  (await admin().from("documents").select("status, approved_by, rejection_reason, rejected_by").eq("id", doc).single()).data!;
const complete = (u: TestUser, task: string, outcome: string, reauth: string | null, reasons: string[] = [], comment = "") =>
  u.db.rpc("complete_qc_task", { p_task: task, p_outcome: outcome, p_reason_codes: reasons, p_comment: comment, p_reauth: reauth });

beforeAll(async () => {
  org = await fx.org("qc");
  lead = await fx.user("qc-lead", { orgId: org, role: "TMF Lead" });
  cra = await fx.user("qc-cra", { orgId: org, role: "CRA" });
  qa = await fx.user("qc-qa", { orgId: org, role: "Quality Assurance" });
  auditor = await fx.user("qc-auditor", { orgId: org, role: "Auditor" });
  study = await fx.study(org, "QC");
  for (const u of [cra, qa, auditor]) await fx.member(org, study.code, u, "Member");
});

afterAll(async () => {
  await fx.cleanup();
});

describe("configuration", () => {
  it("a new organisation gets the 14 Appendix B quality reasons", async () => {
    const { data } = await lead.db.from("qc_reasons").select("code").eq("org_id", org);
    expect(data).toHaveLength(14);
    expect(data!.map((r) => r.code)).toContain("unsigned");
  });

  it("only quality leads change QC reasons", async () => {
    const { error } = await cra.db.from("qc_reasons").update({ label: "Hacked" }).eq("org_id", org).eq("code", "other").select("id").single();
    expect(error).not.toBeNull();
    const ok = await lead.db.from("qc_reasons").update({ weight: 1.5, change_reason: "pilot tuning" }).eq("org_id", org).eq("code", "other").select("weight").single();
    expect(ok.error).toBeNull();
    expect(Number(ok.data!.weight)).toBe(1.5);
  });

  it("with no File Plan, a document gets one Inbound QC step", async () => {
    const { data, error } = await lead.db.rpc("file_plan_for", { p_org: org, p_artifact: "09.09.09" });
    expect(error).toBeNull();
    expect(data).toEqual([{ step_position: 1, step_type: "inbound_qc", assignee_role: null, duration_days: 5 }]);
  });
});

describe("status changes only through the workflow", () => {
  it("blocks approving, submitting or rejecting by editing the document", async () => {
    const doc = await draft();
    for (const patch of [{ status: "Approved" }, { status: "Under Review" }, { rejected_at: new Date().toISOString() }]) {
      const { error } = await lead.db.from("documents").update(patch).eq("id", doc).select("id").single();
      expect(error?.message).toMatch(/QC/);
    }
    expect((await docRow(doc)).status).toBe("Draft");
  });

  it("blocks creating a document that is already Approved", async () => {
    const { error } = await lead.db.from("documents").insert([{ org_id: org, user_id: lead.id, study_id: study.code, artifact_name: "x", status: "Approved" }]);
    expect(error?.message).toMatch(/Draft/);
  });

  it("users cannot create or close tasks, decisions or signatures themselves", async () => {
    const doc = await draft();
    const t = await lead.db.from("document_tasks").insert([{ org_id: org, study_id: study.id, document_id: doc, task_type: "inbound_qc", position: 1, due_at: new Date().toISOString() }]);
    expect(t.error).not.toBeNull();
    const s = await lead.db.from("signature_events").insert([{ org_id: org, kind: "attestation", action: "x", meaning: "x", signer_id: lead.id, signer_name: "x", signer_email: "x" }]);
    expect(s.error).not.toBeNull();
    const p = await lead.db.from("reauth_proofs").insert([{ user_id: lead.id, purpose: "qc_decision" }]);
    expect(p.error).not.toBeNull();
  });
});

describe("submit for QC", () => {
  it("a Draft with a file moves to Under Review with an Inbound QC task due in 5 days", async () => {
    const doc = await draft();
    const { data: taskId, error } = await cra.db.rpc("submit_for_qc", { p_document: doc, p_comment: "Ready" });
    expect(error).toBeNull();
    expect((await docRow(doc)).status).toBe("Under Review");
    const t = await openTask(doc);
    expect(t.id).toBe(taskId);
    expect(t).toMatchObject({ task_type: "inbound_qc", position: 1, cycle: 1, assignee_role: null, status: "open" });
    expect(t.file_version_id).not.toBeNull();
    const days = (new Date(t.due_at).getTime() - Date.now()) / 86400000;
    expect(days).toBeGreaterThan(4.9);
    expect(days).toBeLessThan(5.1);
    const { data: seen } = await cra.db.from("document_tasks").select("id").eq("document_id", doc);
    expect(seen).toHaveLength(1);
  });

  it("refuses roles without submit, documents without a file, and non-Draft documents", async () => {
    const doc = await draft();
    expect((await auditor.db.rpc("submit_for_qc", { p_document: doc })).error?.message).toMatch(/does not allow/);
    const { data: bare } = await admin().from("documents").insert([{ org_id: org, user_id: lead.id, study_id: study.code, artifact_name: "No file", status: "Draft" }]).select("id").single();
    expect((await lead.db.rpc("submit_for_qc", { p_document: bare!.id })).error?.message).toMatch(/Attach the file/);
    await lead.db.rpc("submit_for_qc", { p_document: doc });
    expect((await lead.db.rpc("submit_for_qc", { p_document: doc })).error?.message).toMatch(/Only Draft/);
  });
});

describe("QC decisions", () => {
  it("need a fresh, single-use re-authentication of the same user", async () => {
    const doc = await draft();
    await cra.db.rpc("submit_for_qc", { p_document: doc });
    const task = (await openTask(doc)).id;
    expect((await complete(qa, task, "accept", null)).error?.message).toMatch(/Re-enter your password/);
    expect((await complete(qa, task, "accept", await proof(lead))).error?.message).toMatch(/Re-enter your password/);
    expect((await complete(qa, task, "accept", await proof(qa, { expired: true }))).error?.message).toMatch(/Re-enter your password/);
    expect((await docRow(doc)).status).toBe("Under Review");
  });

  it("accept records an attestation linked to the reviewed file version and approves the document", async () => {
    const doc = await draft();
    await cra.db.rpc("submit_for_qc", { p_document: doc });
    const t = await openTask(doc);
    const reauth = await proof(qa);
    const { data, error } = await complete(qa, t.id, "accept", reauth);
    expect(error).toBeNull();
    expect(data).toMatchObject({ document_status: "Approved", next_task_id: null });
    const d = await docRow(doc);
    expect(d.status).toBe("Approved");
    expect(d.approved_by).toBe(qa.email);

    const { data: sig } = await qa.db.from("signature_events").select("*").eq("document_id", doc).single();
    expect(sig).toMatchObject({ kind: "attestation", meaning: "Reviewed and accepted", signer_id: qa.id, signer_email: qa.email, file_version_id: t.file_version_id, task_id: t.id });
    expect(sig.file_hash).toMatch(/^a{63}\d$/);
    const { data: dec } = await qa.db.from("qc_decisions").select("outcome, signature_event_id").eq("document_id", doc).single();
    expect(dec).toEqual({ outcome: "accept", signature_event_id: sig.id });
    const { data: audit } = await admin().from("audit_trail").select("action, new_value").eq("document_id", doc).like("action", "QC accepted%");
    expect(audit).toEqual([{ action: "QC accepted (attestation)", new_value: "Approved" }]);

    // The proof is used up, and the task is closed.
    expect((await complete(qa, t.id, "accept", reauth)).error?.message).toMatch(/already completed/);
  });

  it("signatures and decisions cannot be changed or removed", async () => {
    const { data: sig } = await admin().from("signature_events").select("id").eq("org_id", org).limit(1).single();
    expect((await admin().from("signature_events").update({ meaning: "x" }).eq("id", sig!.id)).error?.message).toMatch(/append-only/);
    expect((await admin().from("signature_events").delete().eq("id", sig!.id)).error?.message).toMatch(/append-only/);
    expect((await admin().from("qc_decisions").delete().eq("org_id", org)).error?.message).toMatch(/append-only/);
  });

  it("reject needs coded reasons and a comment, returns the document, and resubmission starts a new cycle", async () => {
    const doc = await draft();
    await cra.db.rpc("submit_for_qc", { p_document: doc });
    const task = (await openTask(doc)).id;
    expect((await complete(qa, task, "reject", await proof(qa), [], "Bad")).error?.message).toMatch(/at least one reason/);
    expect((await complete(qa, task, "reject", await proof(qa), ["illegible"], "")).error?.message).toMatch(/at least one reason/);
    expect((await complete(qa, task, "reject", await proof(qa), ["made_up"], "Bad")).error?.message).toMatch(/Unknown QC reason/);
    expect((await complete(cra, task, "reject", await proof(cra), ["illegible"], "Bad")).error?.message).toMatch(/assigned to someone else/);

    const { error } = await complete(qa, task, "reject", await proof(qa), ["unsigned", "illegible"], "Page 3 is unsigned");
    expect(error).toBeNull();
    const d = await docRow(doc);
    expect(d).toMatchObject({ status: "Draft", rejected_by: qa.email, rejection_reason: "Illegible, Unsigned — Page 3 is unsigned" });
    const { data: sig } = await qa.db.from("signature_events").select("meaning").eq("document_id", doc).single();
    expect(sig!.meaning).toBe("Reviewed and rejected");

    await cra.db.rpc("submit_for_qc", { p_document: doc, p_comment: "Signed page added" });
    expect((await openTask(doc)).cycle).toBe(2);
  });

  it("follows a two-step File Plan and honours the step's role", async () => {
    const { error: planErr } = await lead.db.from("file_plan_steps").insert([
      { org_id: org, artifact_num: "05.02.07", position: 1, step_type: "inbound_qc", duration_days: 3 },
      { org_id: org, artifact_num: "05.02.07", position: 2, step_type: "post_approval_qc", assignee_role: "Quality Assurance", duration_days: 10 },
    ]);
    expect(planErr).toBeNull();
    const doc = await draft("05.02.07");
    await cra.db.rpc("submit_for_qc", { p_document: doc });
    const first = await openTask(doc);
    expect(first.task_type).toBe("inbound_qc");
    const r1 = await complete(lead, first.id, "accept", await proof(lead));
    expect(r1.data).toMatchObject({ document_status: "Under Review" });
    expect((await docRow(doc)).status).toBe("Under Review");

    const second = await openTask(doc);
    expect(second).toMatchObject({ task_type: "post_approval_qc", position: 2, assignee_role: "Quality Assurance" });
    expect((await complete(lead, second.id, "accept", await proof(lead))).error?.message).toMatch(/assigned to someone else/);

    // Reassign to the lead by name, with a reason.
    expect((await lead.db.rpc("reassign_qc_task", { p_task: second.id, p_user: lead.id, p_role: null, p_reason: "" })).error?.message).toMatch(/reason/);
    expect((await lead.db.rpc("reassign_qc_task", { p_task: second.id, p_user: cra.id, p_role: null, p_reason: "cover" })).error?.message).toMatch(/cannot approve/);
    expect((await lead.db.rpc("reassign_qc_task", { p_task: second.id, p_user: lead.id, p_role: null, p_reason: "QA on leave" })).error).toBeNull();
    const r2 = await complete(lead, second.id, "accept", await proof(lead));
    expect(r2.error).toBeNull();
    expect(r2.data).toMatchObject({ document_status: "Approved" });
  });

  it("a task can't be completed once the file has changed", async () => {
    const doc = await draft();
    await cra.db.rpc("submit_for_qc", { p_document: doc });
    const task = (await openTask(doc)).id;
    await admin().from("documents").update({ file_path: `${org}/${study.code}/qc-${fx.runId}-replaced.pdf` }).eq("id", doc);
    expect((await complete(qa, task, "accept", await proof(qa))).error?.message).toMatch(/file changed/);
  });
});

describe("closing tasks outside a decision", () => {
  it("return for rework cancels the open task and sends the document back to Draft", async () => {
    const doc = await draft();
    await cra.db.rpc("submit_for_qc", { p_document: doc });
    const task = (await openTask(doc)).id;
    expect((await cra.db.rpc("return_for_rework", { p_document: doc, p_reason: "Wrong study" })).error?.message).toMatch(/does not allow/);
    expect((await lead.db.rpc("return_for_rework", { p_document: doc, p_reason: "Wrong study" })).error).toBeNull();
    expect((await docRow(doc)).status).toBe("Draft");
    const { data: t } = await admin().from("document_tasks").select("status, cancel_reason").eq("id", task).single();
    expect(t).toEqual({ status: "cancelled", cancel_reason: "Returned for rework: Wrong study" });
  });

  it("deleting a document cancels its task; restoring it brings it back as Draft", async () => {
    const doc = await draft();
    await cra.db.rpc("submit_for_qc", { p_document: doc });
    const task = (await openTask(doc)).id;
    const del = await lead.db.from("documents").update({ deleted_at: new Date().toISOString(), deletion_reason: "test", pre_deletion_status: "Under Review", status: "Deleted" }).eq("id", doc).select("id").single();
    expect(del.error).toBeNull();
    const { data: t } = await admin().from("document_tasks").select("status").eq("id", task).single();
    expect(t!.status).toBe("cancelled");
    const res = await lead.db.from("documents").update({ deleted_at: null, status: "Under Review" }).eq("id", doc).select("status").single();
    expect(res.error).toBeNull();
    expect(res.data!.status).toBe("Draft");
  });
});
