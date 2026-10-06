// Part 20: bulk import of studies and sites — template, dry run with row errors, all-or-nothing import. (ENT-12, ENT-13)
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as bulk from "@/app/api/v1/bulk-import/[kind]/route";
import { csvRecords } from "@/lib/csv";
import { Fixtures, admin, call, type TestUser } from "./fixtures";

const fx = new Fixtures();
let org: string, orgB: string;
let lead: TestUser, cra: TestUser, adminB: TestUser;
const code = (n: string) => `BI-${fx.runId}-${n}`;
const run = (who: TestUser, kind: string, csv: string, commit = false) =>
  call(bulk.POST, { token: who.token, method: "POST", params: { kind }, body: { rows: csvRecords(csv).records, commit } });

beforeAll(async () => {
  org = await fx.org("bulk");
  orgB = await fx.org("bulk-b");
  lead = await fx.user("b-lead", { orgId: org, role: "TMF Lead" });
  cra = await fx.user("b-cra", { orgId: org, role: "CRA" });
  adminB = await fx.user("b-admin-b", { orgId: orgB, role: "System Administrator" });
});
afterAll(async () => {
  const a = admin();
  const { data } = await a.from("studies").select("id").in("org_id", [org, orgB]);
  const ids = (data ?? []).map((s) => s.id);
  if (ids.length) {
    await a.from("contact_roles").delete().in("study_id", ids);
    await a.from("study_sites").delete().in("study_id", ids);
    await a.from("study_countries").delete().in("study_id", ids);
    await a.from("studies").delete().in("id", ids);
  }
  await fx.cleanup();
});

describe("study import", () => {
  it("offers a template and is limited to study administrators", async () => {
    const t = await bulk.GET(new Request("http://x/api/v1/bulk-import/studies", { headers: { authorization: `Bearer ${lead.token}` } }), { params: Promise.resolve({ kind: "studies" }) });
    expect(t.status).toBe(200);
    expect((await t.text()).split("\r\n")[0]).toBe("study_id,protocol,phase,sponsor,status,therapeutic_area");
    expect((await run(cra, "studies", `study_id,protocol,phase\n${code("X")},P,III`)).status).toBe(403);
  });

  it("the dry run reports every problem by line and imports nothing", async () => {
    await fx.study(org, "EXIST");
    const csv = [
      "study_id,protocol,phase,status,colour",
      `${code("1")},A Phase III study,III,Startup,blue`,
      `${code("1")},Duplicate,II,,`,
      `S-${fx.runId}-EXIST,Exists,I,,`,
      `bad code!,No,Phase 9,Closed,`,
      `${code("2")},,IV,,`,
    ].join("\n");
    const r = await run(lead, "studies", csv);
    expect(r.status).toBe(200);
    expect(r.body.valid).toBe(false);
    const at = (line: number, field: string) => r.body.errors.some((e: { line: number; field: string }) => e.line === line && e.field === field);
    expect(at(3, "study_id")).toBe(true);
    expect(at(4, "study_id")).toBe(true);
    expect(at(5, "study_id") && at(5, "phase") && at(5, "status")).toBe(true);
    expect(at(6, "protocol")).toBe(true);
    expect(r.body.warnings[0]).toMatch(/colour/);
    expect((await run(lead, "studies", csv, true)).status).toBe(400);
    const { data } = await admin().from("studies").select("id").eq("study_id", code("1"));
    expect(data).toHaveLength(0);
  });

  it("imports clean rows with normalised phase and status", async () => {
    const csv = `study_id,protocol,phase,sponsor,status,therapeutic_area\n${code("A")},Study A,III,Acme,Startup,Oncology\n${code("B")},Study B,Obs,,,`;
    const r = await run(lead, "studies", csv, true);
    expect(r.status).toBe(201);
    expect(r.body.imported).toBe(2);
    const { data } = await admin().from("studies").select("study_id, phase, lifecycle_status, therapeutic_area, org_id").in("study_id", [code("A"), code("B")]).order("study_id");
    expect(data).toEqual([
      { study_id: code("A"), phase: "Phase III", lifecycle_status: "Startup", therapeutic_area: "Oncology", org_id: org },
      { study_id: code("B"), phase: "Observational", lifecycle_status: "Planning", therapeutic_area: null, org_id: org },
    ]);
    const { data: audit } = await admin().from("audit_trail").select("new_value").eq("org_id", org).eq("action", "Studies imported");
    expect(audit?.[0]?.new_value).toContain(code("A"));
  });
});

describe("site import", () => {
  const header = "site_name,site_code,country_code,city,pi_name,pi_email,study_id";

  it("validates countries, studies, site codes and PI details", async () => {
    const csv = [header,
      `Mayo Clinic ${fx.runId},MAY-001,us,Rochester,Dr. Jane Smith,jsmith-${fx.runId}@mayo.test,${code("A")}`,
      `Other,MAY-001,US,,,,${code("A")}`,
      `Nowhere,X-1,ZZ,,,,${code("A")}`,
      `Lost,X-2,US,,,,NO-SUCH-STUDY`,
      `Bad PI,X-3,US,,,not-an-email,${code("A")}`,
    ].join("\n");
    const r = await run(lead, "sites", csv);
    const at = (line: number, field: string) => r.body.errors.some((e: { line: number; field: string }) => e.line === line && e.field === field);
    expect(at(2, "country_code")).toBe(false);
    expect(at(3, "site_code")).toBe(true);
    expect(at(4, "country_code")).toBe(true);
    expect(at(5, "study_id")).toBe(true);
    expect(at(6, "pi_email") && at(6, "pi_name")).toBe(true);
  });

  it("imports sites into the study with their country, institution and PI, all or nothing", async () => {
    const csv = [header,
      `Mayo Clinic ${fx.runId},MAY-001,US,Rochester,Dr. Jane Smith,jsmith-${fx.runId}@mayo.test,${code("A")}`,
      `Charité ${fx.runId},BER-001,DE,Berlin,,,${code("A")}`,
      `Mayo Clinic ${fx.runId},MAY-002,US,Rochester,,,${code("B")}`,
    ].join("\n");
    const r = await run(lead, "sites", csv, true);
    expect(r.status).toBe(201);
    expect(r.body.imported).toBe(3);
    const { data: sites } = await admin().from("study_sites").select("site_number, status, site_party_id, study_country:study_countries(country_code)").eq("org_id", org).order("site_number");
    expect(sites?.map((s) => s.site_number)).toEqual(["BER-001", "MAY-001", "MAY-002"]);
    expect(sites?.[1].site_party_id).toBe(sites?.[2].site_party_id); // same institution reused across studies
    const { data: pi } = await admin().from("contact_roles").select("role_code, person:persons(given_name, family_name, email)").eq("org_id", org);
    expect(pi).toEqual([{ role_code: "PI", person: { given_name: "Dr. Jane", family_name: "Smith", email: `jsmith-${fx.runId}@mayo.test` } }]);

    // One bad row stops the whole file: nothing from it is imported.
    const again = await bulk.POST(new Request("http://x", { method: "POST", headers: { authorization: `Bearer ${lead.token}`, "content-type": "application/json" },
      body: JSON.stringify({ rows: csvRecords([header, `New ${fx.runId},NEW-1,FR,,,,${code("A")}`, `Dup,BER-001,DE,,,,${code("A")}`].join("\n")).records, commit: true }) }),
      { params: Promise.resolve({ kind: "sites" }) });
    expect(again.status).toBe(400);
    const { data: none } = await admin().from("study_sites").select("id").eq("org_id", org).eq("site_number", "NEW-1");
    expect(none).toHaveLength(0);
  });

  it("other organisations' studies are not found", async () => {
    const r = await run(adminB, "sites", `${header}\nX,X-1,US,,,,${code("A")}`);
    expect(r.body.errors.some((e: { field: string; message: string }) => e.field === "study_id" && /not found/.test(e.message))).toBe(true);
  });
});
