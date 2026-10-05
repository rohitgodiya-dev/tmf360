// Part 9: Rule → Finding engine, TMF Health indicators and continuous readiness (Baseline 13.1, M19).
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as health from "@/app/api/v1/studies/[studyId]/health/route";
import * as assess from "@/app/api/v1/studies/[studyId]/health/assessment/route";
import * as list from "@/app/api/v1/studies/[studyId]/findings/route";
import * as accept from "@/app/api/v1/findings/[findingId]/accept/route";
import * as assign from "@/app/api/v1/findings/[findingId]/assign/route";
import * as thresholds from "@/app/api/v1/health-thresholds/route";
import * as cron from "@/app/api/cron/health/route";
import { Fixtures, admin, apiRequest, call, type TestUser } from "./fixtures";

const fx = new Fixtures();
let org: string;
let lead: TestUser, cra: TestUser, outsider: TestUser;
let study: { id: string; code: string };
let site: string;
const ids: Record<string, string> = {};
const day = (offset: number) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);

async function doc(key: string, fields: Record<string, unknown>) {
  const { data, error } = await admin().from("documents").insert([{
    org_id: org, user_id: lead.id, study_id: study.code, status: "Approved", approved_at: new Date().toISOString(), approved_by: "seed@example.test",
    artifact_num: "01.01.01", artifact_name: "Trial Master File Plan", custom_file_name: key, file_path: `x/${fx.runId}/${key}.pdf`, file_hash: `${key}`.padEnd(64, "0").slice(0, 64),
    ...fields,
  }]).select("id").single();
  if (error) throw error;
  ids[key] = data.id;
  return data.id as string;
}
const getHealth = (u: TestUser) => call(health.GET, { token: u.token, params: { studyId: study.id } });
const findings = async (u: TestUser, q = "") => (await list.GET(apiRequest(`/x${q}`, { token: u.token }), { params: Promise.resolve({ studyId: study.id }) }).then((r) => r.json())).data;
const indicator = (body: { dimensions: { indicators: { key: string }[] }[] }, key: string) =>
  body.dimensions.flatMap((d) => d.indicators).find((i) => i.key === key) as unknown as { value: number; status: string; cause: string | null };

beforeAll(async () => {
  org = await fx.org("hlt");
  lead = await fx.user("hlt-lead", { orgId: org, role: "TMF Lead" });
  cra = await fx.user("hlt-cra", { orgId: org, role: "CRA" });
  outsider = await fx.user("hlt-out", { orgId: await fx.org("hlt-b"), role: "System Administrator" });
  study = await fx.study(org, "HLT");
  await fx.member(org, study.code, cra, "CRA");
  const { error } = await lead.db.rpc("seed_study_tmf_config", { p_study_code: study.code });
  if (error) throw error;
  const a = admin();
  const { data: party } = await a.from("parties").insert([{ org_id: org, party_type: "site", name: `Site ${fx.runId}` }]).select("id").single();
  const country = (await a.from("study_countries").insert([{ org_id: org, study_id: study.id, country_code: "US" }]).select("id").single()).data!.id;
  site = (await a.from("study_sites").insert([{ org_id: org, study_id: study.id, study_country_id: country, site_number: "101", site_party_id: party!.id, display_name: "Boston", status: "ongoing" }]).select("id").single()).data!.id;

  await doc("expired", { expiry_date: day(-12) });
  await doc("soon", { artifact_num: "01.01.02", artifact_name: "Trial Management Plan", expiry_date: day(10) });
  await doc("dates", { status: "Draft", approved_at: null, approved_by: null, artifact_num: "01.01.03", artifact_name: "Quality Plan", effective_date: "2030-01-01", expiry_date: "2029-01-01" });
  await doc("dupA", { artifact_num: "02.01.02", artifact_name: "Protocol", file_hash: "d".repeat(64) });
  await doc("dupB", { artifact_num: "02.01.02", artifact_name: "Protocol", file_hash: "d".repeat(64) });
  const { error: pErr } = await lead.db.from("placeholders").insert([{ org_id: org, study_id: study.id, artifact_num: "05.03.01", level: "site", study_site_id: site, title: "Signature log", due_date: "2020-01-01" }]);
  if (pErr) throw pErr;
});
afterAll(async () => {
  await admin().from("findings").delete().eq("org_id", org);
  await admin().from("study_health_state").delete().eq("org_id", org);
  await admin().from("health_snapshots").delete().eq("org_id", org);
  await admin().from("health_thresholds").delete().eq("org_id", org);
  await admin().from("placeholders").delete().eq("org_id", org);
  await admin().from("documents").delete().eq("org_id", org);
  await fx.cleanup();
});

describe("rules and findings", () => {
  it("opening Health runs the rules and returns the five dimensions side by side", async () => {
    const r = await getHealth(lead);
    expect(r.status).toBe(200);
    expect(r.body.dimensions.map((d: { key: string }) => d.key)).toEqual(["completeness", "timeliness", "quality", "risk", "open_issues"]);
    expect(r.body.evaluated_at).toBeTruthy();
    expect(indicator(r.body, "expired_records")).toMatchObject({ value: 1, status: "amber" });
    expect(indicator(r.body, "expired_records").cause).toBe("Expired records is 1, above the target of 0.");
    expect(indicator(r.body, "overdue_placeholders").value).toBe(1);
    expect(indicator(r.body, "metadata_issues").value).toBe(2);   // date order + duplicate
    expect(indicator(r.body, "unverified_files").value).toBe(4);  // seeded Final files were never verified
  });

  it("each finding names the records, the rule version and its priority factors", async () => {
    const f = await findings(lead);
    const byRule = (code: string) => f.filter((x: { rule_code: string }) => x.rule_code === code);
    const expired = byRule("RUL-EXPIRED-DOC")[0];
    expect(expired).toMatchObject({ document_id: ids.expired, rule_version: 1, severity: "high", dimension: "quality" });
    expect(expired.explanation).toMatch(/expired on .*, 12 days ago/);
    // Criticality comes from the artifact's classification in the study (Core 3, Recommended 2).
    const { data: cls } = await admin().from("tmf_config").select("classification").eq("study_id", study.code).eq("type", "artifact").eq("artifact_num", "01.01.01").single();
    const crit = cls!.classification === "Core" ? 3 : cls!.classification === "Recommended" ? 2 : 1;
    expect(expired.factors).toEqual({ criticality: crit, severity: 3, overdue: 1.4, overdue_days: 12, scope: 1, scope_count: 1 });
    expect(expired.priority).toBe(Math.round(crit * 3 * 1.4 * 1 * 10) / 10);
    expect(byRule("RUL-EXPIRING-SOON")[0].document_id).toBe(ids.soon);
    expect(byRule("RUL-DATE-ORDER")[0].document_id).toBe(ids.dates);
    expect(byRule("RUL-DUPLICATE-FINAL")[0]).toMatchObject({ document_id: ids.dupA, factors: expect.objectContaining({ scope_count: 2, scope: 2 }) });
    expect(byRule("RUL-SITE-ACTIVE-MISSING")[0]).toMatchObject({ study_site_id: site, where: "Site 101 — Boston" });
    expect(byRule("RUL-MISSING-OVERDUE")[0].explanation).toMatch(/Signature log \(05\.03\.01\) at site 101 was due on 2020-01-01/);
    // Sorted by priority, highest first.
    const p = f.map((x: { priority: number }) => x.priority);
    expect([...p].sort((a, b) => b - a)).toEqual(p);
    // Drill-down by site.
    const atSite = await findings(lead, `?site=${site}`);
    expect(atSite.length).toBeGreaterThan(0);
    expect(atSite.every((x: { study_site_id: string }) => x.study_site_id === site)).toBe(true);
  });

  it("continuous: fixing the problem resolves the finding the next time Health is opened", async () => {
    await admin().from("documents").update({ expiry_date: day(400) }).eq("id", ids.expired);
    const r = await getHealth(lead);
    expect(indicator(r.body, "expired_records").value).toBe(0);
    const resolved = await findings(lead, "?status=resolved");
    expect(resolved.some((x: { rule_code: string; document_id: string }) => x.rule_code === "RUL-EXPIRED-DOC" && x.document_id === ids.expired)).toBe(true);
  });

  it("a forced assessment is audited; re-running doesn't duplicate findings", async () => {
    const before = (await findings(lead)).length;
    const r = await call(assess.POST, { token: cra.token, method: "POST", params: { studyId: study.id } });
    expect(r.status).toBe(200);
    expect(r.body.open_findings).toBe(before);
    const { data } = await admin().from("audit_trail").select("action").eq("org_id", org).eq("action", "Inspection readiness assessment run");
    expect(data!.length).toBeGreaterThanOrEqual(1);
  });

  it("findings can be accepted with a reason and assigned; others can't see them", async () => {
    const f = (await findings(lead)).find((x: { rule_code: string }) => x.rule_code === "RUL-FUTURE-EFFECTIVE" || x.rule_code === "RUL-DATE-ORDER");
    expect((await call(accept.POST, { token: cra.token, method: "POST", params: { findingId: f.id }, body: { reason: "Known" } })).status).toBe(403);
    expect((await call(accept.POST, { token: lead.token, method: "POST", params: { findingId: f.id }, body: { reason: "x" } })).status).toBe(400);
    expect((await call(accept.POST, { token: lead.token, method: "POST", params: { findingId: f.id }, body: { reason: "Dates are from the sponsor template; confirmed correct" } })).status).toBe(200);
    expect((await findings(lead, "?status=accepted"))[0]).toMatchObject({ id: f.id, accepted_reason: "Dates are from the sponsor template; confirmed correct" });

    const g = (await findings(lead)).find((x: { rule_code: string }) => x.rule_code === "RUL-MISSING-OVERDUE");
    expect((await call(assign.POST, { token: lead.token, method: "POST", params: { findingId: g.id }, body: { user_id: outsider.id } })).status).toBe(400);
    expect((await call(assign.POST, { token: lead.token, method: "POST", params: { findingId: g.id }, body: { user_id: cra.id } })).status).toBe(200);
    expect((await findings(lead)).find((x: { id: string }) => x.id === g.id).assigned_to).toBe(cra.id);

    expect((await getHealth(outsider)).status).toBe(404);
    expect((await call(assess.POST, { token: outsider.token, method: "POST", params: { studyId: study.id } })).status).toBe(404);
  });
});

describe("indicators, thresholds and drill-down", () => {
  it("thresholds are per organisation, validated, and change the status", async () => {
    expect((await call(thresholds.PUT, { token: cra.token, method: "PUT", body: { indicator: "open_findings", amber: 1, red: 2, reason: "tighter" } })).status).toBe(403);
    expect((await call(thresholds.PUT, { token: lead.token, method: "PUT", body: { indicator: "open_findings", amber: 5, red: 2, reason: "wrong order" } })).status).toBe(400);
    expect((await call(thresholds.PUT, { token: lead.token, method: "PUT", body: { indicator: "open_findings", amber: 1, red: 2, reason: "Inspection due next month" } })).status).toBe(200);
    const h = await getHealth(lead);
    expect(indicator(h.body, "open_findings").status).toBe("red");
    expect(indicator(h.body, "open_findings").cause).toMatch(/above the red threshold of 2/);
    const t = await call(thresholds.GET, { token: cra.token });
    expect(t.body.indicators.find((i: { key: string }) => i.key === "open_findings")).toMatchObject({ amber: 1, red: 2, custom: true });
  });

  it("drill-down rows exist for study, country and site", async () => {
    const h = await getHealth(lead);
    const levels = h.body.scopes.map((s: { level: string }) => s.level);
    expect(levels).toEqual(["study", "country", "site"]);
    const s = h.body.scopes.find((x: { level: string }) => x.level === "site");
    expect(s).toMatchObject({ label: "101 — Boston (active)", missing: 1 });
    expect(s.open_findings).toBeGreaterThanOrEqual(2);
  });

  it("the daily job needs its secret", async () => {
    const { NextRequest } = await import("next/server");
    const res = await cron.GET(new NextRequest("http://localhost/api/cron/health"));
    expect(res.status).toBe(401);
  });
});
