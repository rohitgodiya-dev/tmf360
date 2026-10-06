// Part 16: sponsor portfolio — cross-study rollup, country and site rollups, Excel export, access. (ENT-05)
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as portfolioRoute from "@/app/api/v1/portfolio/route";
import { Fixtures, admin, call, type TestUser } from "./fixtures";

const fx = new Fixtures();
let orgA: string, orgB: string;
let leadA: TestUser, craA: TestUser, leadB: TestUser;
let s1: { id: string; code: string }, s2: { id: string; code: string }, sB: { id: string; code: string };
let lowSite: string;

async function country(study: { id: string }, org: string, code: string) {
  const { data, error } = await admin().from("study_countries").insert([{ org_id: org, study_id: study.id, country_code: code }]).select("id").single();
  if (error) throw error;
  return data.id as string;
}
async function site(study: { id: string }, org: string, countryId: string, n: string, status: string, target: number, actual: number) {
  const { data: party } = await admin().from("parties").insert([{ org_id: org, party_type: "site", name: `Site ${n} ${fx.runId}` }]).select("id").single();
  const { data, error } = await admin().from("study_sites").insert([{ org_id: org, study_id: study.id, study_country_id: countryId, site_number: n,
    site_party_id: party!.id, display_name: `Site ${n}`, status, target_enrollment: target, actual_enrollment: actual }]).select("id").single();
  if (error) throw error;
  return data.id as string;
}
async function doc(org: string, user: string, study: { code: string }, countryId: string, siteId: string, final: boolean) {
  const { error } = await admin().from("documents").insert([{ org_id: org, user_id: user, study_id: study.code, status: final ? "Approved" : "Draft",
    file_path: final ? `${org}/${fx.runId}/x.pdf` : null, custom_file_name: "p", artifact_num: "05.04.03", artifact_name: "Site doc",
    study_country_id: countryId, study_site_id: siteId }]);
  if (error) throw error;
}

beforeAll(async () => {
  orgA = await fx.org("port-a");
  orgB = await fx.org("port-b");
  leadA = await fx.user("p-lead-a", { orgId: orgA, role: "TMF Lead" });
  craA = await fx.user("p-cra-a", { orgId: orgA, role: "CRA" });
  leadB = await fx.user("p-lead-b", { orgId: orgB, role: "TMF Lead" });
  s1 = await fx.study(orgA, "PF1");
  s2 = await fx.study(orgA, "PF2");
  sB = await fx.study(orgB, "PFB");
  await fx.member(orgA, s1.code, craA, "CRA");

  const fr1 = await country(s1, orgA, "FR"), us1 = await country(s1, orgA, "US"), fr2 = await country(s2, orgA, "FR");
  const a = await site(s1, orgA, fr1, "101", "ongoing", 20, 10);
  const b = await site(s1, orgA, us1, "201", "ongoing", 30, 5);
  lowSite = await site(s2, orgA, fr2, "301", "qualified", 10, 0);
  await doc(orgA, leadA.id, s1, fr1, a, true);
  await doc(orgA, leadA.id, s1, us1, b, true);
  await doc(orgA, leadA.id, s2, fr2, lowSite, false);
  await doc(orgA, leadA.id, s2, fr2, lowSite, true);
  await doc(orgA, leadA.id, s2, fr2, lowSite, false);
  const fB = await country(sB, orgB, "FR");
  await site(sB, orgB, fB, "901", "ongoing", 5, 5);

  const { error } = await admin().from("health_snapshots").insert([{ org_id: orgA, study_id: s2.id, taken_on: new Date().toISOString().slice(0, 10),
    indicators: { completeness: 33.3, critical_missing: 4, overdue_tasks: 0 } }]);
  if (error) throw error;
});
afterAll(() => fx.cleanup());

describe("portfolio", () => {
  it("is for administrators, sponsor admins and TMF leads only", async () => {
    const r = await call(portfolioRoute.GET, { token: craA.token });
    expect(r.status).toBe(403);
  });

  it("rolls up every study of the organisation and nothing else", async () => {
    const r = await call(portfolioRoute.GET, { token: leadA.token });
    expect(r.status).toBe(200);
    const codes = r.body.studies.map((s: { study_id: string }) => s.study_id);
    expect(codes).toEqual(expect.arrayContaining([s1.code, s2.code]));
    expect(codes).not.toContain(sB.code);
    const p1 = r.body.studies.find((s: { study_id: string }) => s.study_id === s1.code);
    expect(p1).toMatchObject({ countries: 2, country_codes: ["FR", "US"], sites_active: 2, sites_total: 2, actual_enrollment: 15, target_enrollment: 50, completeness: 100, risk: "green" });
    const p2 = r.body.studies.find((s: { study_id: string }) => s.study_id === s2.code);
    expect(p2).toMatchObject({ completeness: 33.3, risk: "red", critical_missing: 4 });
    // Completeness 33% is red; 4 critical missing is amber (red above 5).
    expect(p2.health).toMatchObject({ red: 1, amber: 1 });
    expect(r.body.totals).toMatchObject({ studies: 2, sites_active: 2, sites_total: 3, critical_missing: 4, completeness: 60 });
  });

  it("shows lagging countries and sites at risk", async () => {
    const r = await call(portfolioRoute.GET, { token: leadA.token });
    const fr = r.body.countries.find((c: { country_code: string }) => c.country_code === "FR");
    expect(fr).toMatchObject({ studies: 2, sites_total: 2, lowest_completeness: 33.3, lowest_study: s2.code });
    expect(r.body.countries[0].country_code).toBe("FR");
    expect(r.body.sites_at_risk[0]).toMatchObject({ study_site_id: lowSite, completeness: 33.3, study_code: s2.code });
    expect(r.body.sites_at_risk.some((s: { site_number: string }) => s.site_number === "901")).toBe(false);
  });

  it("exports to Excel and audits the export", async () => {
    const res = await portfolioRoute.GET(new Request("http://x/api/v1/portfolio?format=xlsx", { headers: { authorization: `Bearer ${leadA.token}` } }));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("spreadsheetml");
    expect((await res.arrayBuffer()).byteLength).toBeGreaterThan(1000);
    const { data } = await admin().from("audit_trail").select("new_value").eq("org_id", orgA).eq("action", "Report generated").like("new_value", "Portfolio%");
    expect(data?.length).toBe(1);
  });
});
