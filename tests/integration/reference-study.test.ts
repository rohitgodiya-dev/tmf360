// Part 13 — PQ: synthetic reference study (Baseline section 17): 3 countries, 10 sites, ~2,000 records,
// built so every expected value below can be calculated by hand. The system's computed values must
// match exactly (completeness PLC-06, Navigator tiles, health indicators, risk events, drill-down).
//
//   per site:   120 Final + 30 Under Revision (Draft with file) + 20 Incomplete (no file)
//               10 expected artifacts overdue (Missing) + 5 expected artifacts due later (Expected)
//   study level: 100 Final, 20 Missing, 10 Expected
//   sites: US 101-104, DE 201-203, JP 301-303
//
//   Final 1,300 · Under Revision 300 · Incomplete 200 · Missing 120 · Expected 60 → 1,980 rows
//   Completeness = 1,300 / 1,980 = 65.66 % → 65.7 %;  each site = 120 / 185 = 64.9 %
//   Overdue expected artifacts = 120;  missing_artifact risk events = 180 (all open expected artifacts)
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as navigator from "@/app/api/v1/studies/[studyId]/navigator/route";
import * as health from "@/app/api/v1/studies/[studyId]/health/route";
import * as risk from "@/app/api/v1/studies/[studyId]/risk/route";
import { Fixtures, admin, call, type TestUser } from "./fixtures";

const fx = new Fixtures();
let org: string;
let lead: TestUser;
let study: { id: string; code: string };
const sites: { id: string; country: string; number: string; countryId: string }[] = [];
let docArts: string[] = [], plcArts: { num: string; core: boolean }[] = [];

async function bulk(table: string, rows: Record<string, unknown>[]) {
  for (let i = 0; i < rows.length; i += 400) {
    const { error } = await admin().from(table).insert(rows.slice(i, i + 400));
    if (error) throw new Error(`${table}: ${error.message}`);
  }
}

beforeAll(async () => {
  org = await fx.org("ref");
  lead = await fx.user("ref-lead", { orgId: org, role: "TMF Lead" });
  study = await fx.study(org, "REF");
  const { error } = await lead.db.rpc("seed_study_tmf_config", { p_study_code: study.code });
  if (error) throw error;
  const { data: arts } = await admin().from("tmf_config").select("artifact_num, classification").eq("study_id", study.code).eq("type", "artifact").eq("is_enabled", true).order("artifact_num");
  // Documents and expected artifacts use different record types, so no expected artifact is fulfilled.
  docArts = arts!.slice(0, 40).map((a) => a.artifact_num);
  plcArts = arts!.slice(60, 75).map((a) => ({ num: a.artifact_num, core: a.classification === "Core" }));

  const a = admin();
  const { data: party } = await a.from("parties").insert([{ org_id: org, party_type: "site", name: `Ref sites ${fx.runId}` }]).select("id").single();
  for (const [code, numbers] of [["US", ["101", "102", "103", "104"]], ["DE", ["201", "202", "203"]], ["JP", ["301", "302", "303"]]] as const) {
    const countryId = (await a.from("study_countries").insert([{ org_id: org, study_id: study.id, country_code: code }]).select("id").single()).data!.id;
    for (const n of numbers) {
      const id = (await a.from("study_sites").insert([{ org_id: org, study_id: study.id, study_country_id: countryId, site_number: n, site_party_id: party!.id, display_name: `Site ${n}`, status: "ongoing" }]).select("id").single()).data!.id;
      sites.push({ id, country: code, number: n, countryId });
    }
  }

  const docs: Record<string, unknown>[] = [];
  const base = { org_id: org, user_id: lead.id, study_id: study.code };
  const doc = (i: number, kind: "final" | "rev" | "inc", site: (typeof sites)[number] | null) => ({
    ...base, artifact_num: docArts[i % docArts.length], artifact_name: "Reference", custom_file_name: `${kind}-${site?.number ?? "study"}-${i}`,
    status: kind === "final" ? "Approved" : "Draft", approved_at: kind === "final" ? new Date().toISOString() : null, approved_by: kind === "final" ? "ref@example.test" : null,
    file_path: kind === "inc" ? null : `ref/${fx.runId}/${kind}-${site?.number ?? "s"}-${i}.pdf`, file_hash: kind === "inc" ? null : `${fx.runId}${kind}${site?.number ?? "s"}${i}`.padEnd(64, "0").slice(0, 64),
    study_site_id: site?.id ?? null, study_country_id: site?.countryId ?? null,
  });
  for (const s of sites) {
    for (let i = 0; i < 120; i++) docs.push(doc(i, "final", s));
    for (let i = 0; i < 30; i++) docs.push(doc(i, "rev", s));
    for (let i = 0; i < 20; i++) docs.push(doc(i, "inc", s));
  }
  for (let i = 0; i < 100; i++) docs.push(doc(i, "final", null));
  await bulk("documents", docs);

  const plc: Record<string, unknown>[] = [];
  const p = (i: number, overdue: boolean, site: (typeof sites)[number] | null) => ({
    org_id: org, study_id: study.id, artifact_num: plcArts[i % plcArts.length].num, artifact_name: "Expected", level: site ? "site" : "study",
    study_site_id: site?.id ?? null, study_country_id: site?.countryId ?? null, title: `exp-${site?.number ?? "study"}-${i}`,
    due_date: overdue ? "2021-01-01" : "2099-01-01", responsible_dept: site ? `Site team ${site.country}` : "Study team",
  });
  for (const s of sites) { for (let i = 0; i < 10; i++) plc.push(p(i, true, s)); for (let i = 0; i < 5; i++) plc.push(p(i, false, s)); }
  for (let i = 0; i < 20; i++) plc.push(p(i, true, null));
  for (let i = 0; i < 10; i++) plc.push(p(i, false, null));
  await bulk("placeholders", plc);
}, 600000);

afterAll(async () => {
  await admin().from("findings").delete().eq("org_id", org);
  await admin().from("study_health_state").delete().eq("org_id", org);
  await admin().from("health_snapshots").delete().eq("org_id", org);
  await admin().from("placeholders").delete().eq("org_id", org);
  const { data: ids } = await admin().from("documents").select("id").eq("org_id", org);
  for (let i = 0; i < (ids ?? []).length; i += 500) {
    const part = ids!.slice(i, i + 500).map((d) => d.id);
    await admin().from("document_metadata_versions").delete().in("document_id", part);
    await admin().from("document_file_versions").delete().in("document_id", part);
    await admin().from("documents").delete().in("id", part);
  }
  await fx.cleanup();
}, 600000);

describe("PQ: synthetic reference study (hand-calculated expected values)", () => {
  it("Navigator tiles and completeness match (PLC-06, NAV-03)", async () => {
    const r = await call(navigator.POST, { token: lead.token, method: "POST", params: { studyId: study.id }, body: { page_size: 1 } });
    expect(r.status).toBe(200);
    expect(r.body.counts).toEqual({ Final: 1300, "Under Revision": 300, Incomplete: 200, Missing: 120, Expected: 60 });
    expect(r.body.total).toBe(1980);
    expect(r.body.completeness).toBe(65.7);
  });

  it("each site and each country computes the same way (drill-down, HLT-04)", async () => {
    const r = await call(health.GET, { token: lead.token, params: { studyId: study.id } });
    expect(r.status).toBe(200);
    for (const s of sites) {
      const row = r.body.scopes.find((x: { id: string }) => x.id === s.id);
      expect(row, s.number).toMatchObject({ completeness: 64.9, missing: 10, expected: 5 });
    }
    const us = r.body.scopes.find((x: { label: string }) => x.label === "US");
    expect(us).toMatchObject({ completeness: 64.9, missing: 40, expected: 20 });   // 480 / 740
  });

  it("health indicators match: completeness, critical missing, overdue expected artifacts", async () => {
    const r = await call(health.GET, { token: lead.token, params: { studyId: study.id } });
    const v = r.body.values;
    expect(v.completeness).toBe(65.7);
    const coreShare = (n: number, count: number) => Array.from({ length: count }, (_, i) => plcArts[i % plcArts.length].core).filter(Boolean).length * n;
    expect(v.critical_missing).toBe(coreShare(10, 10) + coreShare(1, 20));   // Missing rows whose type is Core
    expect(v.overdue_placeholders).toBe(120);
    const ind = r.body.dimensions.flatMap((d: { indicators: unknown[] }) => d.indicators).find((i: { key: string }) => i.key === "completeness");
    expect(ind.status).toBe("amber");   // 65.7 % is below 80 and not below 60
  }, 120000);

  it("risk counts every open expected artifact once (RSK-01, OVS-03)", async () => {
    const r = await call(risk.GET, { token: lead.token, params: { studyId: study.id } });
    expect(r.status).toBe(200);
    const missing = r.body.artifacts.reduce((n: number, a: { factors: { factor: string; count: number }[] }) => n + (a.factors.find((f) => f.factor === "missing_artifact")?.count ?? 0), 0);
    expect(missing).toBe(180);
    expect(r.body.explanation[0]).toMatch(/^180 expected artifacts missing \(\d+ Core\), 120 overdue$/);
    const siteNode = r.body.rollups.site.find((n: { label: string }) => n.label === "Site 101 Site 101");
    expect(siteNode.factors[0]).toMatchObject({ factor: "missing_artifact", count: 15 });
  }, 120000);
});
