import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as types from "@/app/api/v1/milestone-types/route";
import * as parties from "@/app/api/v1/parties/route";
import * as countries from "@/app/api/v1/studies/[studyId]/countries/route";
import * as sites from "@/app/api/v1/studies/[studyId]/sites/route";
import * as siteById from "@/app/api/v1/studies/[studyId]/sites/[siteId]/route";
import * as milestones from "@/app/api/v1/studies/[studyId]/milestones/route";
import * as milestoneById from "@/app/api/v1/studies/[studyId]/milestones/[milestoneId]/route";
import * as structure from "@/app/api/v1/studies/[studyId]/structure/route";
import { Fixtures, call, type TestUser } from "./fixtures";

const fx = new Fixtures();
let orgA: string;
let adminA: TestUser;
let craA: TestUser;
let adminB: TestUser;
let study: { id: string; code: string };
let otherStudy: { id: string; code: string };
let country: string;
let site: { id: string; row_version: number };

const today = new Date().toISOString().slice(0, 10);
const p = <E extends Record<string, string> = Record<never, never>>(studyId: string, extra?: E) =>
  ({ studyId, ...extra }) as { studyId: string } & E;

beforeAll(async () => {
  orgA = await fx.org("ms-a");
  const orgB = await fx.org("ms-b");
  adminA = await fx.user("ms-admin-a", { orgId: orgA, role: "System Administrator" });
  craA = await fx.user("ms-cra-a", { orgId: orgA, role: "CRA" });
  adminB = await fx.user("ms-admin-b", { orgId: orgB, role: "System Administrator" });
  study = await fx.study(orgA, "MS");
  otherStudy = await fx.study(orgA, "MS2");
  await fx.member(orgA, study.code, craA, "CRA");

  const party = (await call(parties.POST, { token: adminA.token, method: "POST", body: { party_type: "site", name: "Seattle General" } })).body.id;
  country = (await call(countries.POST, { token: adminA.token, method: "POST", params: p(study.id), body: { country_code: "US" } })).body.id;
  site = (await call(sites.POST, {
    token: adminA.token, method: "POST", params: p(study.id),
    body: { study_country_id: country, site_number: "1007", site_party_id: party, display_name: "Seattle General" },
  })).body;
});
afterAll(() => fx.cleanup());

async function siteMilestones() {
  const r = await call(milestones.GET, { token: adminA.token, params: p(study.id) });
  return (r.body.data as { id: string; milestone_type: string; scope_id: string }[]).filter((m) => m.scope_id === site.id);
}

describe("milestone types", () => {
  it("lists types for every level, with site types tied to statuses", async () => {
    const r = await call(types.GET, { token: craA.token });
    expect(r.status).toBe(200);
    const byCode = Object.fromEntries(r.body.data.map((t: { code: string }) => [t.code, t]));
    expect(byCode.FIRST_PATIENT_IN.applies_to).toBe("study");
    expect(byCode.COUNTRY_APPROVAL.applies_to).toBe("country");
    expect(byCode.SITE_ACTIVATED).toMatchObject({ applies_to: "site", completed_by_site_status: "ongoing" });
  });
});

describe("planning and recording milestones", () => {
  let fpi: { id: string; row_version: number };

  it("plans a study milestone", async () => {
    const r = await call(milestones.POST, {
      token: adminA.token, method: "POST", params: p(study.id),
      body: { scope_type: "study", scope_id: study.id, milestone_type: "FIRST_PATIENT_IN", planned_date: "2027-01-15" },
    });
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ status: "planned", source: "manual", planned_date: "2027-01-15", actual_date: null });
    fpi = r.body;
  });

  it("rejects a type at the wrong level, a scope from another study, and duplicates", async () => {
    const wrongLevel = await call(milestones.POST, {
      token: adminA.token, method: "POST", params: p(study.id),
      body: { scope_type: "country", scope_id: country, milestone_type: "SITE_ACTIVATED" },
    });
    expect(wrongLevel.status).toBe(400);
    const otherStudyScope = await call(milestones.POST, {
      token: adminA.token, method: "POST", params: p(otherStudy.id),
      body: { scope_type: "country", scope_id: country, milestone_type: "COUNTRY_APPROVAL" },
    });
    expect(otherStudyScope.status).toBe(400);
    const dup = await call(milestones.POST, {
      token: adminA.token, method: "POST", params: p(study.id),
      body: { scope_type: "study", scope_id: study.id, milestone_type: "FIRST_PATIENT_IN" },
    });
    expect(dup.status).toBe(409);
  });

  it("re-planning needs no reason, but recording an actual date does", async () => {
    const replan = await call(milestoneById.PATCH, {
      token: adminA.token, method: "PATCH", params: p(study.id, { milestoneId: fpi.id }),
      body: { row_version: fpi.row_version, planned_date: "2027-02-01" },
    });
    expect(replan.status).toBe(200);
    fpi = replan.body;

    const noReason = await call(milestoneById.PATCH, {
      token: adminA.token, method: "PATCH", params: p(study.id, { milestoneId: fpi.id }),
      body: { row_version: fpi.row_version, actual_date: "2027-02-03" },
    });
    expect(noReason.status).toBe(400);

    const achieved = await call(milestoneById.PATCH, {
      token: adminA.token, method: "PATCH", params: p(study.id, { milestoneId: fpi.id }),
      body: { row_version: fpi.row_version, actual_date: "2027-02-03", change_reason: "First subject consented at site 1007" },
    });
    expect(achieved.status).toBe(200);
    expect(achieved.body).toMatchObject({ status: "achieved", actual_date: "2027-02-03", planned_date: "2027-02-01" });
    fpi = achieved.body;
  });

  it("keeps status and actual date consistent", async () => {
    const bad = await call(milestoneById.PATCH, {
      token: adminA.token, method: "PATCH", params: p(study.id, { milestoneId: fpi.id }),
      body: { row_version: fpi.row_version, status: "achieved", actual_date: null, change_reason: "x-x-x" },
    });
    expect(bad.status).toBe(400);
    const reset = await call(milestoneById.PATCH, {
      token: adminA.token, method: "PATCH", params: p(study.id, { milestoneId: fpi.id }),
      body: { row_version: fpi.row_version, status: "planned", change_reason: "Entered against the wrong study" },
    });
    expect(reset.status).toBe(200);
    expect(reset.body).toMatchObject({ status: "planned", actual_date: null });
  });

  it("a CRA can read milestones but not change them; other orgs see nothing", async () => {
    expect((await call(milestones.GET, { token: craA.token, params: p(study.id) })).status).toBe(200);
    const write = await call(milestones.POST, {
      token: craA.token, method: "POST", params: p(study.id),
      body: { scope_type: "study", scope_id: study.id, milestone_type: "DATABASE_LOCK" },
    });
    expect(write.status).toBe(403);
    expect((await call(milestones.GET, { token: adminB.token, params: p(study.id) })).status).toBe(404);
    const { data: own } = await adminA.db.from("milestones").select("id").eq("study_id", study.id);
    expect(own!.length).toBeGreaterThan(0);
    const { data: foreign } = await adminB.db.from("milestones").select("id").eq("study_id", study.id);
    expect(foreign).toHaveLength(0);
  });
});

describe("site status completes site milestones (STU-06)", () => {
  it("moving a site to 'selected' achieves Site selected today", async () => {
    expect(await siteMilestones()).toHaveLength(0);
    const r = await call(siteById.PATCH, {
      token: adminA.token, method: "PATCH", params: p(study.id, { siteId: site.id }),
      body: { row_version: site.row_version, status: "selected", change_reason: "Feasibility approved" },
    });
    expect(r.status).toBe(200);
    site = r.body;
    const ms = await siteMilestones();
    expect(ms).toHaveLength(1);
    expect(ms[0]).toMatchObject({ milestone_type: "SITE_SELECTED", status: "achieved", actual_date: today, source: "site_status" });
  });

  it("completes an already planned milestone, keeping its planned date", async () => {
    const planned = await call(milestones.POST, {
      token: adminA.token, method: "POST", params: p(study.id),
      body: { scope_type: "site", scope_id: site.id, milestone_type: "SITE_ACTIVATED", planned_date: "2026-12-01" },
    });
    expect(planned.status).toBe(201);
    const r = await call(siteById.PATCH, {
      token: adminA.token, method: "PATCH", params: p(study.id, { siteId: site.id }),
      body: { row_version: site.row_version, status: "ongoing", change_reason: "SIV completed" },
    });
    expect(r.status).toBe(200);
    site = r.body;
    const activated = (await siteMilestones()).find((m) => m.milestone_type === "SITE_ACTIVATED");
    expect(activated).toMatchObject({ id: planned.body.id, status: "achieved", actual_date: today, planned_date: "2026-12-01", source: "site_status" });
  });

  it("does not create duplicates or overwrite an achieved date", async () => {
    const before = await siteMilestones();
    const r = await call(siteById.PATCH, {
      token: adminA.token, method: "PATCH", params: p(study.id, { siteId: site.id }),
      body: { row_version: site.row_version, display_name: "Seattle General Hospital" },
    });
    expect(r.status).toBe(200);
    expect(await siteMilestones()).toEqual(before);
  });

  it("the automatic completion is audited with its cause", async () => {
    const { data } = await adminA.db.from("audit_trail")
      .select("action, signature_reason, new_value")
      .like("field_changed", "milestones:%")
      .like("signature_reason", "Completed by site 1007%");
    expect(data!.length).toBeGreaterThanOrEqual(2);
    expect(data!.map((d) => d.signature_reason)).toContain("Completed by site 1007 status change to ongoing");
  });

  it("the structure tree shows milestones on the site", async () => {
    const r = await call(structure.GET, { token: adminA.token, params: p(study.id) });
    const s = r.body.countries[0].sites[0];
    expect(s.milestones.map((m: { milestone_type: string }) => m.milestone_type)).toEqual(["SITE_SELECTED", "SITE_ACTIVATED"]);
    expect(r.body.milestones.map((m: { milestone_type: string }) => m.milestone_type)).toContain("FIRST_PATIENT_IN");
  });

  it("milestones cannot be deleted or re-pointed", async () => {
    const [m] = await siteMilestones();
    await adminA.db.from("milestones").delete().eq("id", m.id);
    const { data } = await adminA.db.from("milestones").select("id").eq("id", m.id);
    expect(data).toHaveLength(1);
    const { error } = await adminA.db.from("milestones").update({ milestone_type: "SITE_CLOSED" }).eq("id", m.id);
    expect(error).not.toBeNull();
  });
});
