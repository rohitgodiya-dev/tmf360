// Site360 ISF Configuration settings (isf_artifact_config): who can read and change them,
// and that times and actors come from the server.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Fixtures, admin, type TestUser } from "./fixtures";

const fx = new Fixtures();
let orgA: string;
let siteId: string;
let study: { id: string; code: string };
let coordinator: TestUser;
let readOnly: TestUser;
let outsider: TestUser;

beforeAll(async () => {
  orgA = await fx.org("isfc-a");
  const orgB = await fx.org("isfc-b");
  coordinator = await fx.user("isfc-coord", { orgId: orgA, role: "Site Coordinator" });
  readOnly = await fx.user("isfc-ro", { orgId: orgA, role: "Auditor" });
  outsider = await fx.user("isfc-out", { orgId: orgB, role: "Site Coordinator" });
  study = await fx.study(orgA, "ISFC");
  const { data, error } = await admin().from("sites").insert([{ org_id: orgA, site_name: `test-${fx.runId}` }]).select("id").single();
  if (error) throw error;
  siteId = data.id;
  await fx.member(orgA, study.id, readOnly, "Auditor");
});
afterAll(async () => {
  await admin().from("isf_artifact_config").delete().eq("site_id", siteId);
  await admin().from("study_members").delete().eq("study_id", study.id);
  await admin().from("sites").delete().eq("id", siteId);
  await fx.cleanup();
});

const zone = (label: string) => ({
  org_id: orgA, site_id: siteId, study_id: study.id, type: "zone", zone_num: label, zone_name: `Zone ${label}`,
});

describe("isf_artifact_config", () => {
  let zoneId: string;

  it("lets a site coordinator add settings, stamped by the server", async () => {
    const { data, error } = await coordinator.db.from("isf_artifact_config")
      .insert([{ ...zone("5"), created_by: "someone-else@example.test" }]).select("*").single();
    expect(error).toBeNull();
    zoneId = data!.id;
    expect(data!.created_by).toBe(coordinator.email);
  });

  it("stamps disabling with server time and the signed-in user", async () => {
    const { error } = await coordinator.db.from("isf_artifact_config")
      .update({ is_enabled: false, disabled_reason: "n/a", disabled_by: "x@example.test", disabled_at: "2000-01-01T00:00:00Z" })
      .eq("id", zoneId);
    expect(error).toBeNull();
    const { data } = await admin().from("isf_artifact_config").select("*").eq("id", zoneId).single();
    expect(data.disabled_by).toBe(coordinator.email);
    expect(Math.abs(Date.now() - Date.parse(data.disabled_at))).toBeLessThan(60_000);
  });

  it("rejects a duplicate zone", async () => {
    const { error } = await coordinator.db.from("isf_artifact_config").insert([zone("5")]);
    expect(error).not.toBeNull();
  });

  it("lets study members read but not change settings", async () => {
    const { data } = await readOnly.db.from("isf_artifact_config").select("id").eq("site_id", siteId);
    expect(data!.map((r) => r.id)).toContain(zoneId);
    const ins = await readOnly.db.from("isf_artifact_config").insert([zone("6")]);
    expect(ins.error).not.toBeNull();
    await readOnly.db.from("isf_artifact_config").delete().eq("id", zoneId);
    const { data: still } = await admin().from("isf_artifact_config").select("id").eq("id", zoneId);
    expect(still).toHaveLength(1);
  });

  it("hides settings from other organisations", async () => {
    const { data } = await outsider.db.from("isf_artifact_config").select("id").eq("site_id", siteId);
    expect(data).toEqual([]);
    const ins = await outsider.db.from("isf_artifact_config").insert([zone("7")]);
    expect(ins.error).not.toBeNull();
  });
});
