// Part 15: countries reference, site institution details, enrollment, and the study → country → site rollup. (ENT-01..03)
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as countriesRoute from "@/app/api/v1/countries/route";
import * as parties from "@/app/api/v1/parties/route";
import * as partyById from "@/app/api/v1/parties/[id]/route";
import * as studyCountries from "@/app/api/v1/studies/[studyId]/countries/route";
import * as sites from "@/app/api/v1/studies/[studyId]/sites/route";
import * as siteById from "@/app/api/v1/studies/[studyId]/sites/[siteId]/route";
import * as milestones from "@/app/api/v1/studies/[studyId]/milestones/route";
import * as hierarchy from "@/app/api/v1/studies/[studyId]/hierarchy/route";
import { Fixtures, admin, call, type TestUser } from "./fixtures";

const fx = new Fixtures();
let orgA: string, orgB: string;
let adminA: TestUser, craA: TestUser, adminB: TestUser;
let studyA: { id: string; code: string };
let partyId: string, countryId: string, siteId: string, site2Id: string;

beforeAll(async () => {
  orgA = await fx.org("hier-a");
  orgB = await fx.org("hier-b");
  adminA = await fx.user("h-admin-a", { orgId: orgA, role: "System Administrator" });
  craA = await fx.user("h-cra-a", { orgId: orgA, role: "CRA" });
  adminB = await fx.user("h-admin-b", { orgId: orgB, role: "System Administrator" });
  studyA = await fx.study(orgA, "HIER");
  await fx.member(orgA, studyA.code, craA, "CRA");
});
afterAll(() => fx.cleanup());

describe("countries reference", () => {
  it("lists ISO countries with region and regulator", async () => {
    const r = await call(countriesRoute.GET, { token: craA.token });
    expect(r.status).toBe(200);
    expect(r.body.data.length).toBeGreaterThanOrEqual(249);
    expect(r.body.data.find((c: { code: string }) => c.code === "US")).toMatchObject({ name: "United States", region: "Americas", regulatory_authority: "FDA" });
  });

  it("is read-only for users", async () => {
    const { error } = await adminA.db.from("countries").insert([{ code: "QQ", name: "Nowhere", region: "Europe" }]);
    expect(error).not.toBeNull();
  });

  it("a study country must be a real country code", async () => {
    const r = await call(studyCountries.POST, { token: adminA.token, method: "POST", params: { studyId: studyA.id }, body: { country_code: "ZZ" } });
    expect(r.status).toBe(400);
  });
});

describe("site institutions and enrollment", () => {
  it("a site organisation carries city, address and institution type", async () => {
    const r = await call(parties.POST, { token: adminA.token, method: "POST", body: {
      party_type: "site", name: `Hôpital Lyon ${fx.runId}`, country_code: "FR", city: "Lyon", address: "1 Rue Test", institution_type: "academic_hospital" } });
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ city: "Lyon", institution_type: "academic_hospital" });
    partyId = r.body.id;
    const bad = await call(parties.POST, { token: adminA.token, method: "POST", body: { party_type: "site", name: `Bad ${fx.runId}`, institution_type: "castle" } });
    expect(bad.status).toBe(400);
    const upd = await call(partyById.PATCH, { token: adminA.token, method: "PATCH", params: { id: partyId }, body: { row_version: r.body.row_version, city: "Lyon 3e" } });
    expect(upd.status).toBe(200);
    expect(upd.body.city).toBe("Lyon 3e");
  });

  it("sites carry target and actual enrollment; only study editors can change them", async () => {
    const c = await call(studyCountries.POST, { token: adminA.token, method: "POST", params: { studyId: studyA.id }, body: { country_code: "FR" } });
    expect(c.status).toBe(201);
    countryId = c.body.id;
    const s = await call(sites.POST, { token: adminA.token, method: "POST", params: { studyId: studyA.id },
      body: { study_country_id: countryId, site_number: "201", site_party_id: partyId, display_name: "Lyon", target_enrollment: 30 } });
    expect(s.status).toBe(201);
    expect(s.body).toMatchObject({ target_enrollment: 30, actual_enrollment: 0 });
    siteId = s.body.id;

    const denied = await call(siteById.PATCH, { token: craA.token, method: "PATCH", params: { studyId: studyA.id, siteId }, body: { row_version: 1, actual_enrollment: 5 } });
    expect(denied.status).toBe(403);
    const neg = await call(siteById.PATCH, { token: adminA.token, method: "PATCH", params: { studyId: studyA.id, siteId }, body: { row_version: 1, actual_enrollment: -1 } });
    expect(neg.status).toBe(400);
    const ok = await call(siteById.PATCH, { token: adminA.token, method: "PATCH", params: { studyId: studyA.id, siteId },
      body: { row_version: 1, actual_enrollment: 12, status: "ongoing", change_reason: "Site initiation visit done" } });
    expect(ok.status).toBe(200);
    expect(ok.body.actual_enrollment).toBe(12);

    const s2 = await call(sites.POST, { token: adminA.token, method: "POST", params: { studyId: studyA.id },
      body: { study_country_id: countryId, site_number: "202", site_party_id: partyId, display_name: "Lyon 2", target_enrollment: 20 } });
    expect(s2.status).toBe(201);
    site2Id = s2.body.id;
  });

  it("enrollment changes are audited", async () => {
    const { data } = await admin().from("audit_trail").select("action, new_value").eq("field_changed", `study_sites:${siteId}`).eq("action", "study_sites.update");
    expect(data?.some((r) => (r.new_value ?? "").includes("actual_enrollment"))).toBe(true);
  });
});

describe("hierarchy rollup", () => {
  beforeAll(async () => {
    const m = await call(milestones.POST, { token: adminA.token, method: "POST", params: { studyId: studyA.id },
      body: { scope_type: "country", scope_id: countryId, milestone_type: "COUNTRY_FIRST_PATIENT_IN", planned_date: "2026-09-01" } });
    expect(m.status).toBe(201);
    const docs = [
      { status: "Approved", file_path: `${orgA}/${fx.runId}/a.pdf`, study_country_id: countryId, study_site_id: siteId },
      { status: "Draft", file_path: null, study_country_id: countryId, study_site_id: siteId },
    ];
    for (const [i, d] of docs.entries()) {
      const { error } = await admin().from("documents").insert([{ org_id: orgA, user_id: adminA.id, study_id: studyA.code,
        custom_file_name: `hier-${i}`, file_name: `hier-${i}.pdf`, artifact_num: "05.04.03", artifact_name: "Site doc", ...d }]);
      if (error) throw error;
    }
  });

  it("rolls sites, enrollment, completeness and dates up to the country and study", async () => {
    const r = await call(hierarchy.GET, { token: craA.token, params: { studyId: studyA.id } });
    expect(r.status).toBe(200);
    expect(r.body.totals).toMatchObject({ countries: 1, sites_total: 2, sites_active: 1, target_enrollment: 50, actual_enrollment: 12, completeness: 50 });
    const fr = r.body.countries[0];
    expect(fr).toMatchObject({ country_code: "FR", country_name: "France", region: "Europe", regulatory_authority: "ANSM", completeness: 50 });
    expect(fr.first_patient_in).toEqual({ date: "2026-09-01", actual: false });
    const lyon = fr.sites.find((s: { id: string }) => s.id === siteId);
    expect(lyon).toMatchObject({ completeness: 50, actual_enrollment: 12, institution: { city: "Lyon 3e", institution_type: "academic_hospital" } });
    expect(fr.sites.find((s: { id: string }) => s.id === site2Id).completeness).toBeNull();
  });

  it("is invisible to other organisations", async () => {
    const r = await call(hierarchy.GET, { token: adminB.token, params: { studyId: studyA.id } });
    expect(r.status).toBe(404);
  });
});
