// Part 11d: explainable risk (M14 RSK-01..05, OVS-01..03) and oversight activities (OVS-04).
// Timeliness factors need records older than the thresholds; server timestamps (Pillar 6) can't be
// backdated here, so they are checked by SQL on DEV (see the Part 11d release notes) and the
// completeness/quality factors, weights, impact and roll-ups are checked below.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as risk from "@/app/api/v1/studies/[studyId]/risk/route";
import * as settings from "@/app/api/v1/risk-settings/route";
import * as oversight from "@/app/api/v1/studies/[studyId]/oversight/route";
import * as status from "@/app/api/v1/oversight/[activityId]/status/route";
import * as complete from "@/app/api/v1/oversight/[activityId]/complete/route";
import * as report from "@/app/api/v1/studies/[studyId]/reports/[report]/route";
import { Fixtures, admin, apiRequest, call, type TestUser } from "./fixtures";

const fx = new Fixtures();
let org: string;
let qa: TestUser, cra: TestUser, inv: TestUser, outsider: TestUser;
let study: { id: string; code: string };
let site: string;
let doc: string;
let reason: string;

const getRisk = async (u: TestUser = qa) => call(risk.GET, { token: u.token, params: { studyId: study.id } });

beforeAll(async () => {
  org = await fx.org("rsk");
  qa = await fx.user("rsk-qa", { orgId: org, role: "Quality Assurance" });
  cra = await fx.user("rsk-cra", { orgId: org, role: "CRA" });
  inv = await fx.user("rsk-inv", { orgId: org, role: "Clinical Trial Manager" });
  outsider = await fx.user("rsk-out", { orgId: await fx.org("rsk-b"), role: "System Administrator" });
  study = await fx.study(org, "RSK");
  await fx.member(org, study.code, cra, "CRA");
  await fx.member(org, study.code, inv, "Clinical Trial Manager");
  await fx.member(org, study.code, qa, "Quality Assurance");
  const { error } = await qa.db.rpc("seed_study_tmf_config", { p_study_code: study.code });
  if (error) throw error;
  const a = admin();
  const { data: party } = await a.from("parties").insert([{ org_id: org, party_type: "site", name: `Site ${fx.runId}` }]).select("id").single();
  const country = (await a.from("study_countries").insert([{ org_id: org, study_id: study.id, country_code: "DE" }]).select("id").single()).data!.id;
  site = (await a.from("study_sites").insert([{ org_id: org, study_id: study.id, study_country_id: country, site_number: "301", site_party_id: party!.id, display_name: "Berlin", status: "ongoing" }]).select("id").single()).data!.id;

  // Two missing artifacts at the site (one overdue) and one at study level.
  const { error: pErr } = await a.from("placeholders").insert([
    { org_id: org, study_id: study.id, artifact_num: "05.02.07", artifact_name: "Curriculum Vitae", level: "site", study_site_id: site, title: "CV PI", due_date: "2020-01-01", responsible_dept: "Clinical Ops" },
    { org_id: org, study_id: study.id, artifact_num: "05.02.07", artifact_name: "Curriculum Vitae", level: "site", study_site_id: site, title: "CV Sub-I", responsible_dept: "Clinical Ops" },
    { org_id: org, study_id: study.id, artifact_num: "01.01.01", artifact_name: "Trial Master File Plan", level: "study", title: "TMF Plan" },
  ]);
  if (pErr) throw pErr;

  // A QC rejection with one reason, on a site document.
  const { data: d, error: dErr } = await a.from("documents").insert([{ org_id: org, user_id: qa.id, study_id: study.code, status: "Rejected", artifact_num: "05.02.01",
    artifact_name: "Signature Sheet", custom_file_name: "Sig sheet", study_site_id: site, owner: "Site Staff" }]).select("id").single();
  if (dErr) throw dErr;
  doc = d.id;
  const { data: reasons } = await a.from("qc_reasons").select("code").eq("org_id", org).limit(1);
  reason = reasons![0].code;
  const { data: task, error: tErr } = await a.from("document_tasks").insert([{ org_id: org, study_id: study.id, document_id: doc, task_type: "inbound_qc", position: 1, cycle: 1,
    due_at: new Date().toISOString(), status: "completed", outcome: "reject", completed_by: qa.id, completed_at: new Date().toISOString() }]).select("id").single();
  if (tErr) throw tErr;
  const { data: sig, error: sErr } = await a.from("signature_events").insert([{ org_id: org, kind: "attestation", action: "qc_decision", meaning: "QC rejected",
    signer_id: qa.id, signer_name: "QA", signer_email: qa.email, document_id: doc, task_id: task.id }]).select("id").single();
  if (sErr) throw sErr;
  const { error: qErr } = await a.from("qc_decisions").insert([{ org_id: org, task_id: task.id, document_id: doc, outcome: "reject", reason_codes: [reason], comment: "Unsigned", signature_event_id: sig.id, decided_by: qa.id }]);
  if (qErr) throw qErr;
});

afterAll(async () => {
  await admin().from("risk_factor_weights").delete().eq("org_id", org);
  await admin().from("risk_settings").delete().eq("org_id", org);
  await admin().from("placeholders").delete().eq("org_id", org);
  await fx.cleanup();
});

describe("explainable risk (OVS-01..03)", () => {
  it("scores each artifact as Σ weight × events × impact, and explains it", async () => {
    const r = await getRisk();
    expect(r.status).toBe(200);
    const cv = r.body.artifacts.find((a: { artifact_num: string; location: string }) => a.artifact_num === "05.02.07" && a.location === "Site 301 Berlin");
    // 2 missing (default weight 3) × impact of the CV artifact type.
    expect(cv.factors).toEqual([{ factor: "missing_artifact", label: "Missing artifact", count: 2, weight: 3, points: 6 }]);
    expect(cv.score).toBe(6 * cv.impact);
    expect(cv.explanation).toMatch(/^2 × Missing artifact \(weight 3\), × impact \d/);
    expect(cv.events.map((e: { detail: string }) => e.detail)).toEqual(expect.arrayContaining([expect.stringContaining("days overdue")]));
    const sig = r.body.artifacts.find((a: { artifact_num: string }) => a.artifact_num === "05.02.01");
    expect(sig.factors[0]).toMatchObject({ factor: `qc:${reason}`, count: 1, weight: 1 });
    expect(r.body.explanation[0]).toMatch(/^3 expected artifacts missing \(\d+ Core\), 1 overdue$/);
    expect(r.body.explanation[1]).toMatch(/^1 QC rejection reason, most often ".+" \(1\)$/);
  });

  it("rolls up by zone, country, site and owner with the factor counts", async () => {
    const r = (await getRisk()).body;
    const site301 = r.rollups.site.find((n: { label: string }) => n.label === "Site 301 Berlin");
    expect(site301.artifacts).toBe(2);
    expect(site301.factors.find((c: { factor: string }) => c.factor === "missing_artifact").count).toBe(2);
    expect(r.rollups.owner.find((n: { label: string }) => n.label === "Clinical Ops").factors[0].count).toBe(2);
    expect(r.rollups.zone.map((n: { key: string }) => n.key).sort()).toEqual(["01", "05"]);
    const sum = r.artifacts.reduce((s: number, a: { score: number }) => s + a.score, 0);
    expect(r.total).toBeCloseTo(sum, 5);
  });

  it("weights are configurable (0 disables a factor) by quality leads only, with a reason", async () => {
    const body = { indexing_days: 7, processing_days: 20, weights: [{ factor: "missing_artifact", weight: 0 }, { factor: `qc:${reason}`, weight: 2.5 }], reason: "Risk SOP v3" };
    expect((await call(settings.PUT, { token: cra.token, method: "PUT", body })).status).toBe(403);
    expect((await call(settings.PUT, { token: qa.token, method: "PUT", body: { ...body, weights: [{ factor: "missing_artifact", weight: 0.05 }] } })).status).toBe(400);
    const r = await call(settings.PUT, { token: qa.token, method: "PUT", body });
    expect(r.status).toBe(200);
    expect(r.body.thresholds).toEqual({ indexing_days: 7, processing_days: 20 });
    const after = (await getRisk()).body;
    expect(after.artifacts.some((a: { factors: { factor: string }[] }) => a.factors.some((c) => c.factor === "missing_artifact"))).toBe(false);
    expect(after.artifacts[0].factors[0]).toMatchObject({ factor: `qc:${reason}`, weight: 2.5, points: 2.5 });
    const { data } = await admin().from("audit_trail").select("action, signature_reason").eq("org_id", org).like("action", "risk_%");
    expect(data!.map((x) => x.action).sort()).toEqual(["risk_factor_weights.insert", "risk_factor_weights.insert", "risk_settings.insert"]);
    expect(data!.every((x) => x.signature_reason === "Risk SOP v3")).toBe(true);
  });

  it("is study-scoped and the Risk Score report downloads", async () => {
    expect((await getRisk(outsider)).status).toBe(404);
    const res = await report.GET(apiRequest("/x", { token: cra.token }), { params: Promise.resolve({ studyId: study.id, report: "risk-score" }) });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/spreadsheetml/);
  });
});

describe("oversight activities (OVS-04)", () => {
  let id: string;

  it("quality leads create activities with OVS numbers; others cannot", async () => {
    const body = { title: "Review site 301 missing CVs", activity_type: "site_review", rationale: "Two CVs missing, one overdue", due_date: "2030-01-31", assignees: [inv.id] };
    expect((await call(oversight.POST, { token: cra.token, method: "POST", params: { studyId: study.id }, body })).status).toBe(403);
    const r = await call(oversight.POST, { token: qa.token, method: "POST", params: { studyId: study.id }, body });
    expect(r.status).toBe(201);
    expect(r.body.ref).toBe("OVS-001");
    id = r.body.id;
    const second = await call(oversight.POST, { token: qa.token, method: "POST", params: { studyId: study.id }, body: { ...body, title: "Second review" } });
    expect(second.body.ref).toBe("OVS-002");
    const list = await call(oversight.GET, { token: cra.token, params: { studyId: study.id } });
    expect(list.body.data.find((a: { id: string }) => a.id === id)).toMatchObject({ status: "open", assignee_names: [expect.any(String)], overdue: false });
  });

  it("completion can't be written directly; it needs an assignee's or lead's signature", async () => {
    const { error } = await qa.db.from("oversight_activities").update({ status: "completed", outcome: "forged" }).eq("id", id);
    expect(error?.message).toMatch(/electronic signature/);
    expect((await call(complete.POST, { token: cra.token, method: "POST", params: { activityId: id }, body: { outcome: "Looks fine", password: cra.password } })).status).toBe(404);
    expect((await call(complete.POST, { token: inv.token, method: "POST", params: { activityId: id }, body: { outcome: "Looks fine", password: "wrong" } })).status).toBe(400);
    expect((await call(status.POST, { token: qa.token, method: "POST", params: { activityId: id }, body: { status: "in_review", reason: "Starting review" } })).status).toBe(200);
    const r = await call(complete.POST, { token: inv.token, method: "POST", params: { activityId: id }, body: { outcome: "CVs requested from site; follow-up OVS-002", password: inv.password } });
    expect(r.status).toBe(200);
    const list = await call(oversight.GET, { token: qa.token, params: { studyId: study.id } });
    const a = list.body.data.find((x: { id: string }) => x.id === id);
    expect(a).toMatchObject({ status: "completed", outcome: "CVs requested from site; follow-up OVS-002", signature: { meaning: "Oversight review completed" } });
    expect((await call(status.POST, { token: qa.token, method: "POST", params: { activityId: id }, body: { status: "open", reason: "Reopen" } })).status).toBe(400);
  });

  it("cancelling needs a reason and is final", async () => {
    const list = await call(oversight.GET, { token: qa.token, params: { studyId: study.id } });
    const second = list.body.data.find((x: { ref: string }) => x.ref === "OVS-002");
    expect((await call(status.POST, { token: qa.token, method: "POST", params: { activityId: second.id }, body: { status: "cancelled", reason: "x" } })).status).toBe(400);
    expect((await call(status.POST, { token: qa.token, method: "POST", params: { activityId: second.id }, body: { status: "cancelled", reason: "Merged into OVS-001" } })).status).toBe(200);
    const { data } = await admin().from("audit_trail").select("action").eq("org_id", org).like("action", "oversight_activities.%");
    expect(data!.length).toBeGreaterThanOrEqual(5);
  });
});
