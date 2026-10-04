// Part 7b: QC workflow API — submit, task lists, the task screen, Confirm & Close with
// re-authentication, reassign, timeline, return for rework, and QC configuration.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as submit from "@/app/api/v1/documents/[documentId]/submit/route";
import * as ret from "@/app/api/v1/documents/[documentId]/return/route";
import * as tl from "@/app/api/v1/documents/[documentId]/timeline/route";
import * as list from "@/app/api/v1/studies/[studyId]/tasks/route";
import * as taskRoute from "@/app/api/v1/tasks/[taskId]/route";
import * as complete from "@/app/api/v1/tasks/[taskId]/complete/route";
import * as reassign from "@/app/api/v1/tasks/[taskId]/reassign/route";
import * as cfg from "@/app/api/v1/qc-config/route";
import * as plan from "@/app/api/v1/qc-config/file-plan/route";
import * as reasonsRoute from "@/app/api/v1/qc-config/reasons/route";
import * as reasonRoute from "@/app/api/v1/qc-config/reasons/[reasonId]/route";
import { Fixtures, admin, apiRequest, call, type TestUser } from "./fixtures";

const fx = new Fixtures();
let org: string;
let lead: TestUser, cra: TestUser, qa: TestUser, outsider: TestUser;
let study: { id: string; code: string };
let n = 0;

async function draft(artifact = "01.01.01") {
  n += 1;
  const { data, error } = await admin().from("documents").insert([{
    org_id: org, user_id: cra.id, study_id: study.code, artifact_num: artifact, artifact_name: "Trial Master File Plan",
    custom_file_name: `API doc ${n}`, status: "Draft", file_path: `${org}/${study.code}/qcapi-${fx.runId}-${n}.pdf`,
    file_name: `api-${n}.pdf`, file_type: "application/pdf", file_hash: "b".repeat(63) + (n % 10),
  }]).select("id").single();
  if (error) throw error;
  return data.id as string;
}
const doSubmit = (u: TestUser, doc: string) => call(submit.POST, { token: u.token, method: "POST", params: { documentId: doc }, body: { comment: "Ready for QC" } });
const tasks = (u: TestUser, q = "") => list.GET(apiRequest(`/api/v1/studies/${study.id}/tasks${q}`, { token: u.token }), { params: Promise.resolve({ studyId: study.id }) }).then(async (r) => ({ status: r.status, body: await r.json() }));
const decide = (u: TestUser, task: string, body: Record<string, unknown>) => call(complete.POST, { token: u.token, method: "POST", params: { taskId: task }, body });

beforeAll(async () => {
  org = await fx.org("qcapi");
  lead = await fx.user("qcapi-lead", { orgId: org, role: "TMF Lead" });
  cra = await fx.user("qcapi-cra", { orgId: org, role: "CRA" });
  qa = await fx.user("qcapi-qa", { orgId: org, role: "Quality Assurance" });
  outsider = await fx.user("qcapi-out", { orgId: await fx.org("qcapi-b"), role: "System Administrator" });
  study = await fx.study(org, "QCAPI");
  for (const u of [cra, qa]) await fx.member(org, study.code, u, "Member");
});
afterAll(async () => { await fx.cleanup(); });

describe("submit and task lists", () => {
  it("needs a session, the permission and a visible document", async () => {
    const doc = await draft();
    expect((await call(submit.POST, { method: "POST", params: { documentId: doc }, body: {} })).status).toBe(401);
    expect((await doSubmit(outsider, doc)).status).toBe(404);
  });

  it("submits, and the task shows in the approvers' My Tasks but not the submitter's", async () => {
    const doc = await draft();
    const r = await doSubmit(cra, doc);
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ status: "Under Review" });

    const mine = await tasks(qa);
    expect(mine.status).toBe(200);
    const row = mine.body.data.find((t: { document_id: string }) => t.document_id === doc);
    expect(row).toMatchObject({ task_type: "Inbound QC", assignee: "Any approver", status: "open", overdue: false, can_work: true, title: `API doc ${n}` });
    expect(row.created_by).toBe(cra.email);
    expect((await tasks(cra)).body.data.some((t: { document_id: string }) => t.document_id === doc)).toBe(false);
    expect((await tasks(cra, "?scope=all")).body.data.some((t: { document_id: string }) => t.document_id === doc)).toBe(true);
    const out = await tasks(outsider, "?scope=all");
    expect(out.status).toBe(404);
  });
});

describe("task screen and Confirm & Close", () => {
  let doc: string, task: string;
  beforeAll(async () => {
    doc = await draft();
    task = (await doSubmit(cra, doc)).body.task_id;
  });

  it("shows metadata, reasons and controls, and hides it from other organisations", async () => {
    const r = await call(taskRoute.GET, { token: qa.token, params: { taskId: task } });
    expect(r.status).toBe(200);
    expect(r.body.task).toMatchObject({ step: "Inbound QC", status: "open", assignee: "Any approver" });
    expect(r.body.document).toMatchObject({ id: doc, has_file: true, status: "Under Review", submission_reason: "Ready for QC" });
    expect(r.body.document.file_path).toBeUndefined();
    expect(r.body.reasons).toHaveLength(14);
    expect(r.body).toMatchObject({ control: "attestation", can_work: true, can_reject: true, can_reassign: true });
    expect(r.body.file_version.file_hash).toMatch(/^b{63}\d$/);
    expect((await call(taskRoute.GET, { token: cra.token, params: { taskId: task } })).body.can_work).toBe(false);
    expect((await call(taskRoute.GET, { token: outsider.token, params: { taskId: task } })).status).toBe(404);
  });

  it("refuses a wrong password and audits the attempt", async () => {
    const r = await decide(qa, task, { outcome: "accept", password: "not-it" });
    expect(r.status).toBe(400);
    expect(r.body.error.message).toMatch(/password is not correct/);
    const { data } = await admin().from("audit_trail").select("action, user_id").eq("document_id", doc).eq("action", "Signature re-authentication failed");
    expect(data).toEqual([{ action: "Signature re-authentication failed", user_id: qa.id }]);
    const { data: d } = await admin().from("documents").select("status").eq("id", doc).single();
    expect(d!.status).toBe("Under Review");
  });

  it("refuses someone who can't work the task before asking for a password", async () => {
    expect((await decide(cra, task, { outcome: "accept", password: cra.password })).status).toBe(403);
  });

  it("validates a rejection", async () => {
    const r = await decide(qa, task, { outcome: "reject", reason_codes: [], comment: "", password: qa.password });
    expect(r.status).toBe(400);
  });

  it("accepts with the right password and shows the signature on the timeline", async () => {
    const r = await decide(qa, task, { outcome: "accept", password: qa.password });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ document_status: "Approved", next_task_id: null });

    const t = await call(tl.GET, { token: cra.token, params: { documentId: doc } });
    expect(t.status).toBe(200);
    expect(t.body.status).toBe("Approved");
    expect(t.body.steps).toHaveLength(1);
    expect(t.body.steps[0]).toMatchObject({ step: "Inbound QC", status: "completed", completed_by: qa.email, decision: { outcome: "accept", reasons: [] } });
    expect(t.body.steps[0].signature).toMatchObject({ kind: "attestation", meaning: "Reviewed and accepted", signer: qa.email, email: qa.email });
    expect((await call(tl.GET, { token: outsider.token, params: { documentId: doc } })).status).toBe(404);
  });

  it("can't decide a closed task", async () => {
    expect((await decide(qa, task, { outcome: "accept", password: qa.password })).status).toBe(403);
  });
});

describe("reject, reassign, return", () => {
  it("rejects with coded reasons; the timeline shows the reason labels", async () => {
    const doc = await draft();
    const task = (await doSubmit(cra, doc)).body.task_id;
    const r = await decide(lead, task, { outcome: "reject", reason_codes: ["missing_pages"], comment: "Page 4 missing", password: lead.password });
    expect(r.status).toBe(200);
    expect(r.body.document_status).toBe("Draft");
    const t = await call(tl.GET, { token: cra.token, params: { documentId: doc } });
    expect(t.body.steps[0].decision).toEqual({ outcome: "reject", reasons: ["Missing Pages"], comment: "Page 4 missing" });
    expect(t.body.steps[0].signature.meaning).toBe("Reviewed and rejected");
  });

  it("reassigns to a named approver, with a reason; CRAs can't", async () => {
    const doc = await draft();
    const task = (await doSubmit(cra, doc)).body.task_id;
    expect((await call(reassign.POST, { token: cra.token, method: "POST", params: { taskId: task }, body: { user_id: qa.id, reason: "cover" } })).status).toBe(403);
    expect((await call(reassign.POST, { token: lead.token, method: "POST", params: { taskId: task }, body: { user_id: qa.id, role: "Regulatory", reason: "cover" } })).status).toBe(400);
    const r = await call(reassign.POST, { token: lead.token, method: "POST", params: { taskId: task }, body: { user_id: qa.id, reason: "QA owns protocols" } });
    expect(r.status).toBe(200);
    const leadView = await call(taskRoute.GET, { token: lead.token, params: { taskId: task } });
    expect(leadView.body).toMatchObject({ can_work: false, task: { assignee: qa.email } });
    expect((await tasks(qa)).body.data.some((t: { id: string }) => t.id === task)).toBe(true);
    expect((await tasks(lead)).body.data.some((t: { id: string }) => t.id === task)).toBe(false);
  });

  it("returns a document for rework with a reason", async () => {
    const doc = await draft();
    await doSubmit(cra, doc);
    expect((await call(ret.POST, { token: cra.token, method: "POST", params: { documentId: doc }, body: { reason: "Wrong site" } })).status).toBe(403);
    const r = await call(ret.POST, { token: lead.token, method: "POST", params: { documentId: doc }, body: { reason: "Wrong site" } });
    expect(r.status).toBe(200);
    const t = await call(tl.GET, { token: lead.token, params: { documentId: doc } });
    expect(t.body.steps[0]).toMatchObject({ status: "cancelled", cancel_reason: "Returned for rework: Wrong site" });
  });
});

describe("QC configuration", () => {
  it("everyone in the org can read it; only quality leads change it", async () => {
    const r = await call(cfg.GET, { token: cra.token });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ control: "attestation", can_edit: false, file_plan: [] });
    expect(r.body.reasons).toHaveLength(14);
    expect((await call(cfg.PUT, { token: cra.token, method: "PUT", body: { control: "signature", reason: "test" } })).status).toBe(403);
    expect((await call(cfg.GET, { token: outsider.token })).body.reasons.every((x: { id: string }) => !r.body.reasons.some((y: { id: string }) => y.id === x.id))).toBe(true);
  });

  it("switching to electronic signatures changes what QC decisions record", async () => {
    expect((await call(cfg.PUT, { token: lead.token, method: "PUT", body: { control: "signature", reason: "QA decision QD-12" } })).body.control).toBe("signature");
    const doc = await draft();
    const task = (await doSubmit(cra, doc)).body.task_id;
    expect((await call(taskRoute.GET, { token: qa.token, params: { taskId: task } })).body.control).toBe("signature");
    await decide(qa, task, { outcome: "accept", password: qa.password });
    const { data } = await admin().from("signature_events").select("kind").eq("document_id", doc).single();
    expect(data!.kind).toBe("signature");
    await call(cfg.PUT, { token: lead.token, method: "PUT", body: { control: "attestation", reason: "back to default" } });
  });

  it("sets an artifact's File Plan and uses it for new submissions", async () => {
    const bad = await call(plan.PUT, { token: lead.token, method: "PUT", body: { artifact_num: "05.02.07", steps: [{ step_type: "post_approval_qc", duration_days: 3 }], reason: "x-test" } });
    expect(bad.status).toBe(400);
    const r = await call(plan.PUT, { token: lead.token, method: "PUT", body: {
      artifact_num: "05.02.07", reason: "CVs need QA review",
      steps: [{ step_type: "inbound_qc", duration_days: 2 }, { step_type: "post_approval_qc", assignee_role: "Quality Assurance", duration_days: 7 }],
    } });
    expect(r.status).toBe(200);
    expect((await call(cfg.GET, { token: cra.token })).body.file_plan).toHaveLength(2);
    const doc = await draft("05.02.07");
    const task = (await doSubmit(cra, doc)).body.task_id;
    const first = await decide(lead, task, { outcome: "accept", password: lead.password });
    expect(first.body.document_status).toBe("Under Review");
    const second = await call(taskRoute.GET, { token: qa.token, params: { taskId: first.body.next_task_id } });
    expect(second.body).toMatchObject({ can_work: true, task: { step: "Post-Approval QC", assignee: "Quality Assurance" } });
  });

  it("adds and retires reasons with a reason for the change", async () => {
    const add = await call(reasonsRoute.POST, { token: lead.token, method: "POST", body: { label: "Wrong Language", weight: 1, reason: "Local requirement" } });
    expect(add.status).toBe(201);
    expect(add.body).toMatchObject({ code: "wrong_language", is_active: true });
    expect((await call(reasonRoute.PATCH, { token: cra.token, method: "PATCH", params: { reasonId: add.body.id }, body: { is_active: false, row_version: add.body.row_version, reason: "nope" } })).status).toBe(403);
    const off = await call(reasonRoute.PATCH, { token: lead.token, method: "PATCH", params: { reasonId: add.body.id }, body: { is_active: false, row_version: add.body.row_version, reason: "Not needed" } });
    expect(off.status).toBe(200);
    expect(off.body.is_active).toBe(false);
    const stale = await call(reasonRoute.PATCH, { token: lead.token, method: "PATCH", params: { reasonId: add.body.id }, body: { is_active: true, row_version: add.body.row_version, reason: "again" } });
    expect(stale.status).toBe(409);
  });
});
