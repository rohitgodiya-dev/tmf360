// Part 3: TMF Reference Model as data.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as taxonomyRoute from "@/app/api/v1/taxonomy/route";
import { ARTIFACTS, MILESTONE_EVENTS, SECTIONS_V, ZONES_V, TAXONOMY_VERSION } from "@/lib/taxonomy";
import { Fixtures, admin, call, type TestUser } from "./fixtures";

const fx = new Fixtures();
let orgA: string;
let adminA: TestUser;
let craA: TestUser;
let adminB: TestUser;
let study: { id: string; code: string };

beforeAll(async () => {
  orgA = await fx.org("tax-a");
  const orgB = await fx.org("tax-b");
  adminA = await fx.user("tax-admin-a", { orgId: orgA, role: "System Administrator" });
  craA = await fx.user("tax-cra-a", { orgId: orgA, role: "CRA" });
  adminB = await fx.user("tax-admin-b", { orgId: orgB, role: "System Administrator" });
  study = await fx.study(orgA, "TAX");
  await fx.member(orgA, study.code, craA, "CRA");
});
afterAll(() => fx.cleanup());

describe("reference data", () => {
  it("the database holds exactly the model in lib/taxonomy (code and data cannot drift)", async () => {
    const db = admin();
    const { data: version } = await db.from("taxonomy_versions").select("id, version, status").eq("model", "TMF Reference Model").eq("status", "active").single();
    expect(version!.version).toBe(TAXONOMY_VERSION);
    const [{ data: zones }, { data: sections }, { data: arts }, { data: events }] = await Promise.all([
      db.from("taxonomy_zones").select("zone_num, name").eq("version_id", version!.id).order("zone_num"),
      db.from("taxonomy_sections").select("section_num, name").eq("version_id", version!.id).order("section_num"),
      db.from("taxonomy_artifacts").select("*, taxonomy_subartifacts(name, sort_order)").eq("version_id", version!.id).order("sort_order"),
      db.from("tmf_milestone_events").select("code, name, phase").order("code"),
    ]);
    expect(zones!.map((z) => [z.zone_num, z.name])).toEqual(ZONES_V);
    expect(sections!.map((s) => [s.section_num, s.name])).toEqual(SECTIONS_V);
    expect(events!.map((e) => [e.code, e.name, e.phase])).toEqual(MILESTONE_EVENTS);
    expect(arts).toHaveLength(ARTIFACTS.length);
    arts!.forEach((row, i) => {
      const a = ARTIFACTS[i];
      expect({
        n: row.artifact_num, u: row.unique_id, name: row.name, cl: row.classification, d: row.definition,
        sponsor: row.sponsor_doc, investigator: row.investigator_doc, device_sponsor: row.device_sponsor_doc,
        device_investigator: row.device_investigator_doc, iis: row.iis_requirement, process: row.process_number,
        dating: row.dating_convention, site_milestone: row.site_milestone, iso: row.iso_ref,
        s: [...row.taxonomy_subartifacts].sort((x: { sort_order: number }, y: { sort_order: number }) => x.sort_order - y.sort_order).map((x: { name: string }) => x.name),
      }).toEqual(a);
    });
  });

  it("users can read the taxonomy but cannot change it", async () => {
    const { data } = await craA.db.from("taxonomy_artifacts").select("name").eq("unique_id", "101");
    expect(data![0].name).toBe("Site Signature Sheet");
    await craA.db.from("taxonomy_artifacts").update({ name: "Hacked" }).eq("unique_id", "101");
    const { error } = await adminA.db.from("taxonomy_artifacts").insert([{ unique_id: "999" }]);
    expect(error).not.toBeNull();
    const { data: after } = await admin().from("taxonomy_artifacts").select("name").eq("unique_id", "101");
    expect(after![0].name).toBe("Site Signature Sheet");
  });

  it("milestone types are mapped to the model's milestone events", async () => {
    const { data } = await craA.db.from("milestone_types").select("code, tmf_event_code").in("code", ["SITE_ACTIVATED", "DATABASE_LOCK", "SITE_FIRST_MONITORING_VISIT"]);
    expect(Object.fromEntries(data!.map((m) => [m.code, m.tmf_event_code]))).toEqual({ SITE_ACTIVATED: "03", DATABASE_LOCK: "08", SITE_FIRST_MONITORING_VISIT: "04" });
  });
});

describe("/api/v1/taxonomy", () => {
  it("requires a login", async () => {
    expect((await call(taxonomyRoute.GET, {})).status).toBe(401);
  });

  it("returns the full model with sub-artifacts", async () => {
    const r = await call(taxonomyRoute.GET, { token: craA.token });
    expect(r.status).toBe(200);
    expect(r.body.version.version).toBe("3.3.1");
    expect(r.body.artifacts).toHaveLength(250);
    const sss = r.body.artifacts.find((a: { unique_id: string }) => a.unique_id === "101");
    expect(sss.subartifacts).toEqual(["Delegation of Authority Log", "Site Signature Sheet"]);
    expect(r.body.milestone_events).toHaveLength(12);
  });

  it("filters to the investigator site file view", async () => {
    const r = await call(taxonomyRoute.GET, { token: craA.token, params: {} as Record<string, string> });
    const isf = await taxonomyRoute.GET(new Request("http://localhost/api/v1/taxonomy?for=investigator", { headers: { Authorization: `Bearer ${craA.token}` } }));
    const body = await isf.json();
    expect(body.artifacts.length).toBe(ARTIFACTS.filter((a) => a.investigator).length);
    expect(body.artifacts.length).toBeLessThan(r.body.artifacts.length);
    expect(body.artifacts.every((a: { investigator_doc: boolean }) => a.investigator_doc)).toBe(true);
  });
});

describe("study configuration (tmf_config)", () => {
  it("is seeded on the server from the model, once", async () => {
    const { data: added, error } = await craA.db.rpc("seed_study_tmf_config", { p_study_code: study.code });
    expect(error).toBeNull();
    expect(added).toBe(261); // 11 zones + 250 artifacts
    const { data: again } = await adminA.db.rpc("seed_study_tmf_config", { p_study_code: study.code });
    expect(again).toBe(0);
    const { data: rows } = await adminA.db.from("tmf_config").select("type, taxonomy_artifact_id").eq("study_id", study.code);
    expect(rows).toHaveLength(261);
    expect(rows!.filter((r) => r.type === "artifact").every((r) => r.taxonomy_artifact_id)).toBe(true);
  });

  it("another organisation cannot seed, read or change it", async () => {
    const { error } = await adminB.db.rpc("seed_study_tmf_config", { p_study_code: study.code });
    expect(error).not.toBeNull();
    const { data } = await adminB.db.from("tmf_config").select("id").eq("study_id", study.code);
    expect(data).toHaveLength(0);
  });

  it("duplicate entries are impossible", async () => {
    const { error } = await adminA.db.from("tmf_config").insert([{
      org_id: orgA, study_id: study.code, type: "artifact", zone_num: "5", section_num: "5.02",
      artifact_num: "05.02.18", artifact_name: "Site Signature Sheet", classification: "Core",
    }]);
    expect(error).not.toBeNull();
  });

  it("only users with edit rights can disable artifacts; changes are audited; nothing is deleted", async () => {
    const { data: row } = await adminA.db.from("tmf_config").select("id").eq("study_id", study.code).eq("artifact_num", "06.06.01").single();
    await craA.db.from("tmf_config").update({ is_enabled: false, disabled_reason: "No IRT" }).eq("id", row!.id);
    const { data: unchanged } = await admin().from("tmf_config").select("is_enabled").eq("id", row!.id).single();
    expect(unchanged!.is_enabled).toBe(true);

    const { error } = await adminA.db.from("tmf_config").update({ is_enabled: false, disabled_reason: "Study does not use IRT" }).eq("id", row!.id);
    expect(error).toBeNull();
    const { data: audit } = await admin().from("audit_trail").select("old_value, new_value, signature_reason")
      .eq("org_id", orgA).eq("action", "tmf_config.update").eq("field_changed", "tmf_config:06.06.01");
    expect(audit).toHaveLength(1);
    expect(JSON.parse(audit![0].new_value)).toMatchObject({ is_enabled: false });
    expect(audit![0].signature_reason).toBe("Study does not use IRT");

    await adminA.db.from("tmf_config").delete().eq("id", row!.id);
    const { data: still } = await admin().from("tmf_config").select("id").eq("id", row!.id);
    expect(still).toHaveLength(1);
    const { error: moveErr } = await adminA.db.from("tmf_config").update({ artifact_num: "06.06.02" }).eq("id", row!.id);
    expect(moveErr).not.toBeNull();
  });
});

describe("documents", () => {
  it("are linked to the permanent artifact, and relinked when re-filed", async () => {
    const id = await fx.document({ orgId: orgA, userId: adminA.id, studyId: study.code, title: "Delegation log" });
    const tax = async (n: string) => (await admin().from("taxonomy_artifacts").select("id").eq("artifact_num", n).single()).data!.id;
    await admin().from("documents").update({ artifact_num: "05.02.18" }).eq("id", id);
    let { data } = await admin().from("documents").select("taxonomy_artifact_id").eq("id", id).single();
    expect(data!.taxonomy_artifact_id).toBe(await tax("05.02.18"));
    await admin().from("documents").update({ artifact_num: "05.02.04" }).eq("id", id);
    ({ data } = await admin().from("documents").select("taxonomy_artifact_id").eq("id", id).single());
    expect(data!.taxonomy_artifact_id).toBe(await tax("05.02.04"));
  });
});
