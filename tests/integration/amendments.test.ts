// Part 19: protocol amendment cascade — registration rules, per-site acknowledgement and re-consent, overdue sites. (ENT-11)
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as amendments from "@/app/api/v1/studies/[studyId]/amendments/route";
import * as ack from "@/app/api/v1/amendment-acks/[ackId]/route";
import { Fixtures, admin, call, type TestUser } from "./fixtures";

const fx = new Fixtures();
let org: string;
let lead: TestUser, cra: TestUser, coord: TestUser;
let study: { id: string; code: string };
const site: Record<string, string> = {};
const doc: Record<string, string> = {};

async function seedDoc(key: string, artifact: string, status: string) {
  const { data, error } = await admin().from("documents").insert([{ org_id: org, user_id: lead.id, study_id: study.code, status, artifact_num: artifact,
    artifact_name: artifact === "01.02.01" ? "Trial Team Details" : "Protocol Amendment", custom_file_name: key, file_path: `${org}/${fx.runId}/${key}.pdf`,
    ...(status === "Approved" ? { approved_at: new Date().toISOString(), approved_by: "seed@example.test" } : {}) }]).select("id").single();
  if (error) throw error;
  doc[key] = data.id;
}

beforeAll(async () => {
  org = await fx.org("amend");
  lead = await fx.user("a-lead", { orgId: org, role: "TMF Lead" });
  cra = await fx.user("a-cra", { orgId: org, role: "CRA" });
  coord = await fx.user("a-coord", { orgId: org, role: "Site Coordinator" });
  study = await fx.study(org, "AMD");
  await fx.member(org, study.code, cra, "CRA");
  await fx.member(org, study.code, coord, "Site Coordinator");
  const a = admin();
  const country = (await a.from("study_countries").insert([{ org_id: org, study_id: study.id, country_code: "FR" }]).select("id").single()).data!.id;
  const party = (await a.from("parties").insert([{ org_id: org, party_type: "site", name: `Site ${fx.runId}` }]).select("id").single()).data!.id;
  for (const [n, status] of [["101", "ongoing"], ["102", "qualified"], ["103", "identified"], ["104", "closed"]]) {
    site[n] = (await a.from("study_sites").insert([{ org_id: org, study_id: study.id, study_country_id: country, site_number: n, site_party_id: party, display_name: `Site ${n}`, status }]).select("id").single()).data!.id;
  }
  // The coordinator is the current contact at site 101 only.
  const person = (await a.from("persons").insert([{ org_id: org, given_name: "Cora", family_name: "Ordinator", email: coord.email }]).select("id").single()).data!.id;
  const { error } = await a.from("contact_roles").insert([{ org_id: org, study_id: study.id, person_id: person, scope_type: "site", scope_id: site["101"], role_code: "STUDY_COORDINATOR" }]);
  if (error) throw error;
  await seedDoc("amend2", "02.01.04", "Approved");
  await seedDoc("amend3", "02.01.04", "Approved");
  await seedDoc("draft", "02.01.04", "Draft");
  await seedDoc("team", "01.02.01", "Approved");
});
afterAll(async () => {
  const a = admin();
  await a.from("amendment_site_acknowledgements").delete().eq("study_id", study.id);
  await a.from("protocol_amendments").delete().eq("study_id", study.id);
  await a.from("documents").delete().in("id", Object.values(doc));
  await fx.cleanup();
});

const register = (who: TestUser, body: Record<string, unknown>) =>
  call(amendments.POST, { token: who.token, method: "POST", params: { studyId: study.id }, body: { amendment_number: "2", protocol_version: "3.0", effective_date: "2099-01-01", ...body } });
const list = async () => (await call(amendments.GET, { token: lead.token, params: { studyId: study.id } })).body;

describe("registering an amendment", () => {
  it("lists Final protocol documents that are not registered yet", async () => {
    const b = await list();
    expect(b.unregistered.map((d: { id: string }) => d.id).sort()).toEqual([doc.amend2, doc.amend3].sort());
  });

  it("only study editors register; only Final protocol or amendment documents qualify", async () => {
    expect((await register(cra, { document_id: doc.amend2 })).status).toBe(403);
    expect((await register(lead, { document_id: doc.draft })).body.error.message).toMatch(/Final/);
    expect((await register(lead, { document_id: doc.team })).body.error.message).toMatch(/02\.01\.04/);
    expect((await register(lead, { document_id: doc.amend2, reconsent_required: true })).status).toBe(400);
  });

  it("cascades one acknowledgement to every selected, qualified or active site", async () => {
    const r = await register(lead, { document_id: doc.amend2, reconsent_required: true, reconsent_deadline: "2099-03-01" });
    expect(r.status).toBe(201);
    expect(r.body.sites).toBe(2);
    const b = await list();
    const a = b.amendments.find((x: { document_id: string }) => x.document_id === doc.amend2);
    expect(a.sites.map((s: { site: { site_number: string } }) => s.site.site_number)).toEqual(["101", "102"]);
    expect(a.counts).toMatchObject({ total: 2, acknowledged: 0, overdue: 0 });
    expect(b.unregistered.map((d: { id: string }) => d.id)).toEqual([doc.amend3]);
    expect((await register(lead, { document_id: doc.amend2, amendment_number: "2b" })).status).toBe(409);
  });

  it("tables cannot be written directly", async () => {
    const { error } = await lead.db.from("protocol_amendments").insert([{ org_id: org, study_id: study.id, document_id: doc.amend3, amendment_number: "X", protocol_version: "X", effective_date: "2099-01-01" }]);
    expect(error).not.toBeNull();
  });
});

describe("site acknowledgement and re-consent", () => {
  const ackFor = async (n: string, docKey = "amend2") => {
    const a = (await list()).amendments.find((x: { document_id: string }) => x.document_id === doc[docKey]);
    return a.sites.find((s: { site: { site_number: string } }) => s.site.site_number === n);
  };

  it("a site contact acknowledges for their own site only", async () => {
    const own = await ackFor("101");
    const other = await ackFor("102");
    expect((await call(ack.POST, { token: coord.token, method: "POST", params: { ackId: other.id }, body: { action: "acknowledge" } })).status).toBe(404);
    const r = await call(ack.POST, { token: coord.token, method: "POST", params: { ackId: own.id }, body: { action: "acknowledge", note: "Read and filed in ISF" } });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ status: "acknowledged", acknowledged_by_email: coord.email.toLowerCase() });
    expect(r.body.acknowledged_at).not.toBeNull();
    expect((await call(ack.POST, { token: coord.token, method: "POST", params: { ackId: own.id }, body: { action: "acknowledge" } })).status).toBe(400);
  });

  it("a CRA without site contact role cannot acknowledge", async () => {
    const other = await ackFor("102");
    expect((await call(ack.POST, { token: cra.token, method: "POST", params: { ackId: other.id }, body: { action: "acknowledge" } })).status).toBe(404);
  });

  it("re-consent progress is recorded and audited", async () => {
    const own = await ackFor("101");
    const r = await call(ack.POST, { token: coord.token, method: "POST", params: { ackId: own.id }, body: { action: "reconsent", count: 7, completed: true } });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ reconsent_count: 7, reconsent_completed: true });
    const { data } = await admin().from("audit_trail").select("new_value").eq("org_id", org).eq("action", "Re-consent progress recorded");
    expect(data?.[0]?.new_value).toBe("7 (complete)");
  });

  it("sites past the effective date without acknowledging are overdue", async () => {
    expect((await register(lead, { document_id: doc.amend3, amendment_number: "3", protocol_version: "4.0", effective_date: "2020-01-01" })).status).toBe(201);
    const s102 = await ackFor("102", "amend3");
    expect(s102.overdue).toBe(true);
    const a = (await list()).amendments.find((x: { document_id: string }) => x.document_id === doc.amend3);
    expect(a.counts.overdue).toBe(2);
    expect((await call(ack.POST, { token: coord.token, method: "POST", params: { ackId: (await ackFor("101", "amend3")).id }, body: { action: "reconsent", count: 1, completed: false } })).status).toBe(400);
  });
});
