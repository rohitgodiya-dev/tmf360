// Part 14f: taxonomy version pinning (RM-04) and guided, signed study migration (RM-05). A synthetic target
// version is loaded on DEV with one-to-one, split, retired and (at first) unmapped record types.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as taxonomy from "@/app/api/v1/studies/[studyId]/taxonomy/route";
import * as execute from "@/app/api/v1/taxonomy-migrations/[migrationId]/execute/route";
import * as cancel from "@/app/api/v1/taxonomy-migrations/[migrationId]/cancel/route";
import { Fixtures, admin, call, type TestUser } from "./fixtures";

const fx = new Fixtures();
let org: string;
let lead: TestUser, cra: TestUser;
let study: { id: string; code: string };
let fromVersion: string, toVersion: string;
const art: Record<string, { id: string; num: string }> = {};
const doc: Record<string, string> = {};

async function newArtifact(key: string, num: string, i: number) {
  const { data, error } = await admin().from("taxonomy_artifacts").insert([{ version_id: toVersion, unique_id: String(900 + i), artifact_num: num, zone_num: "01", section_num: "01.01",
    name: `New ${key}`, classification: "Core", definition: "test", sponsor_doc: true, investigator_doc: false, device_sponsor_doc: false, device_investigator_doc: false,
    iis_requirement: "M", sort_order: i }]).select("id").single();
  if (error) throw error;
  art[key] = { id: data.id, num };
}

beforeAll(async () => {
  org = await fx.org("txm");
  lead = await fx.user("txm-lead", { orgId: org, role: "TMF Lead" });
  cra = await fx.user("txm-cra", { orgId: org, role: "CRA" });
  study = await fx.study(org, "TXM");
  await fx.member(org, study.code, cra, "CRA");
  const a = admin();
  const { data: s } = await a.from("studies").select("taxonomy_version_id").eq("id", study.id).single();
  fromVersion = s!.taxonomy_version_id;
  const { data: v, error } = await a.from("taxonomy_versions").insert([{ model: "TMF RM TEST", version: `T-${fx.runId}`, status: "retired", notes: "integration test target" }]).select("id").single();
  if (error) throw error;
  toVersion = v.id;
  await a.from("taxonomy_zones").insert([{ version_id: toVersion, zone_num: "01", name: "Trial Management (new)" }]);
  await a.from("taxonomy_sections").insert([{ version_id: toVersion, section_num: "01.01", zone_num: "01", name: "Trial Oversight (new)" }]);
  await newArtifact("plan", "01.01.01", 1);
  await newArtifact("splitA", "01.01.08", 2);
  await newArtifact("splitB", "01.01.09", 3);
  const { data: olds } = await a.from("taxonomy_artifacts").select("id, artifact_num").eq("version_id", fromVersion).in("artifact_num", ["01.01.01", "01.01.02", "01.01.03", "01.01.04"]);
  const old = Object.fromEntries((olds ?? []).map((o) => [o.artifact_num, o.id]));
  const { error: mErr } = await a.from("taxonomy_version_mappings").insert([
    { from_version_id: fromVersion, to_version_id: toVersion, from_artifact_id: old["01.01.01"], to_artifact_id: art.plan.id, kind: "one_to_one" },
    { from_version_id: fromVersion, to_version_id: toVersion, from_artifact_id: old["01.01.02"], to_artifact_id: art.splitA.id, kind: "split" },
    { from_version_id: fromVersion, to_version_id: toVersion, from_artifact_id: old["01.01.02"], to_artifact_id: art.splitB.id, kind: "split" },
    { from_version_id: fromVersion, to_version_id: toVersion, from_artifact_id: old["01.01.03"], to_artifact_id: null, kind: "retired" },
  ]);
  if (mErr) throw mErr;
  for (const [key, num, id] of [["plan", "01.01.01", old["01.01.01"]], ["split", "01.01.02", old["01.01.02"]], ["retired", "01.01.03", old["01.01.03"]], ["unmapped", "01.01.04", old["01.01.04"]]]) {
    const { data, error: dErr } = await a.from("documents").insert([{ org_id: org, user_id: lead.id, study_id: study.code, status: "Approved", approved_at: new Date().toISOString(),
      approved_by: "seed@example.test", artifact_num: num, artifact_name: "Old", custom_file_name: key, taxonomy_artifact_id: id }]).select("id").single();
    if (dErr) throw dErr;
    doc[key] = data.id;
  }
});

afterAll(async () => { await fx.cleanup(); });

describe("taxonomy version migration (RM-04/05)", () => {
  let migrationId: string;

  it("studies are pinned to a version; the version can't be changed directly", async () => {
    expect(fromVersion).toBeTruthy();
    const { error } = await lead.db.from("studies").update({ taxonomy_version_id: toVersion }).eq("id", study.id);
    expect(error?.message).toMatch(/signed taxonomy migration/);
    const r = await call(taxonomy.GET, { token: cra.token, params: { studyId: study.id } });
    expect(r.body.targets.map((t: { id: string }) => t.id)).toContain(toVersion);
  });

  it("planning gives an impact report: mapped, split choices, retired and unmapped", async () => {
    expect((await call(taxonomy.POST, { token: cra.token, method: "POST", params: { studyId: study.id }, body: { to_version_id: toVersion } })).status).toBe(403);
    const r = await call(taxonomy.POST, { token: lead.token, method: "POST", params: { studyId: study.id }, body: { to_version_id: toVersion } });
    expect(r.status).toBe(201);
    migrationId = r.body.id;
    expect(r.body.impact).toMatchObject({ documents: 4, mapped: 1, needs_choice: 1, retired: 1, unmapped: 1 });
    expect(r.body.impact.choices[0].options.map((o: { artifact_num: string }) => o.artifact_num).sort()).toEqual(["01.01.08", "01.01.09"]);
  });

  it("execution is refused while documents are unmapped or splits undecided", async () => {
    const r1 = await call(execute.POST, { token: lead.token, method: "POST", params: { migrationId }, body: { password: lead.password } });
    expect(r1.body.error.message).toMatch(/no mapping to the new version/);
    await admin().from("taxonomy_version_mappings").insert([{ from_version_id: fromVersion, to_version_id: toVersion,
      from_artifact_id: (await admin().from("documents").select("taxonomy_artifact_id").eq("id", doc.unmapped).single()).data!.taxonomy_artifact_id, to_artifact_id: art.plan.id, kind: "merge" }]);
    const r2 = await call(execute.POST, { token: lead.token, method: "POST", params: { migrationId }, body: { password: lead.password } });
    expect(r2.body.error.message).toMatch(/Choose the new record type/);
    expect((await call(execute.POST, { token: lead.token, method: "POST", params: { migrationId }, body: { decisions: { [doc.split]: art.splitB.id }, password: "wrong" } })).status).toBe(400);
  });

  it("executes with a signature: mapped view created, study re-pinned, filed records unchanged", async () => {
    const r = await call(execute.POST, { token: lead.token, method: "POST", params: { migrationId }, body: { decisions: { [doc.split]: art.splitB.id }, password: lead.password } });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.mapped).toBe(4);
    const { data: map } = await admin().from("document_taxonomy_map").select("document_id, to_artifact_id, outcome").eq("migration_id", migrationId);
    const by = new Map((map ?? []).map((m) => [m.document_id, m]));
    expect(by.get(doc.plan)).toMatchObject({ to_artifact_id: art.plan.id, outcome: "mapped" });
    expect(by.get(doc.split)).toMatchObject({ to_artifact_id: art.splitB.id, outcome: "chosen" });
    expect(by.get(doc.retired)).toMatchObject({ to_artifact_id: null, outcome: "retired" });
    expect(by.get(doc.unmapped)).toMatchObject({ to_artifact_id: art.plan.id, outcome: "mapped" });
    const { data: docs } = await admin().from("documents").select("artifact_num").in("id", Object.values(doc)).order("artifact_num");
    expect(docs!.map((d) => d.artifact_num)).toEqual(["01.01.01", "01.01.02", "01.01.03", "01.01.04"]);   // unchanged
    const { data: s } = await admin().from("studies").select("taxonomy_version_id").eq("id", study.id).single();
    expect(s!.taxonomy_version_id).toBe(toVersion);
    const { data: sig } = await admin().from("signature_events").select("meaning").eq("study_id", study.id).eq("action", "taxonomy_migration");
    expect(sig).toEqual([{ meaning: "Mapping approved" }]);
    const { data: types } = await admin().rpc("study_document_types", { p_study: study.id });
    expect((types as { document_id: string; artifact_num: string }[]).find((t) => t.document_id === doc.split)!.artifact_num).toBe("01.01.09");
  });

  it("an executed migration can't be cancelled or run again", async () => {
    expect((await call(cancel.POST, { token: lead.token, method: "POST", params: { migrationId }, body: { reason: "Changed my mind" } })).status).toBe(400);
    expect((await call(execute.POST, { token: lead.token, method: "POST", params: { migrationId }, body: { password: lead.password } })).status).toBe(400);
  });
});
