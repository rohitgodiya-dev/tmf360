// Part 8a: eTMF plan, placeholders (expected artifacts), fulfilment and completeness (M08).
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as nav from "@/app/api/v1/studies/[studyId]/navigator/route";
import * as add from "@/app/api/v1/studies/[studyId]/placeholders/route";
import * as one from "@/app/api/v1/placeholders/[placeholderId]/route";
import * as cancel from "@/app/api/v1/placeholders/[placeholderId]/cancel/route";
import * as link from "@/app/api/v1/placeholders/[placeholderId]/link/route";
import * as apply from "@/app/api/v1/studies/[studyId]/apply-plan/route";
import * as tpl from "@/app/api/v1/plan-template/route";
import * as tplItem from "@/app/api/v1/plan-template/[itemId]/route";
import * as expected from "@/app/api/v1/studies/[studyId]/expected-artifacts/route";
import { Fixtures, admin, apiRequest, call, type TestUser } from "./fixtures";

const fx = new Fixtures();
let org: string;
let lead: TestUser, cra: TestUser, outsider: TestUser;
let study: { id: string; code: string };
let country: string, site: string, site2: string;
const docIds: string[] = [];

async function doc(fields: Record<string, unknown>) {
  const { data, error } = await admin().from("documents").insert([{
    org_id: org, user_id: lead.id, study_id: study.code, status: "Approved", file_path: `x/${fx.runId}/${docIds.length}.pdf`, ...fields,
  }]).select("id").single();
  if (error) throw error;
  docIds.push(data.id);
  return data.id as string;
}
const grid = (u: TestUser, body: Record<string, unknown> = {}) => call(nav.POST, { token: u.token, method: "POST", params: { studyId: study.id }, body });
const addPh = (u: TestUser, items: Record<string, unknown>[]) => call(add.POST, { token: u.token, method: "POST", params: { studyId: study.id }, body: { items } });
const ph = async (id: string) => (await admin().from("placeholders").select("*").eq("id", id).single()).data;
const siteChip = (id: string) => ({ chips: [{ field: "site", value: id }] });

beforeAll(async () => {
  org = await fx.org("plc");
  lead = await fx.user("plc-lead", { orgId: org, role: "TMF Lead" });
  cra = await fx.user("plc-cra", { orgId: org, role: "CRA" });
  outsider = await fx.user("plc-out", { orgId: await fx.org("plc-b"), role: "System Administrator" });
  study = await fx.study(org, "PLC");
  await fx.member(org, study.code, cra, "CRA");
  const { error } = await lead.db.rpc("seed_study_tmf_config", { p_study_code: study.code });
  if (error) throw error;
  const a = admin();
  const { data: party } = await a.from("parties").insert([{ org_id: org, party_type: "site", name: `Site ${fx.runId}` }]).select("id").single();
  country = (await a.from("study_countries").insert([{ org_id: org, study_id: study.id, country_code: "US" }]).select("id").single()).data!.id;
  const { data: ss, error: sErr } = await a.from("study_sites").insert([
    { org_id: org, study_id: study.id, study_country_id: country, site_number: "101", site_party_id: party!.id, display_name: "Boston" },
    { org_id: org, study_id: study.id, study_country_id: country, site_number: "102", site_party_id: party!.id, display_name: "Denver" },
  ]).select("id, site_number");
  if (sErr) throw sErr;
  site = ss!.find((s) => s.site_number === "101")!.id;
  site2 = ss!.find((s) => s.site_number === "102")!.id;
});
afterAll(async () => {
  await admin().from("placeholders").delete().eq("org_id", org);
  await admin().from("plan_template_items").delete().eq("org_id", org);
  await admin().from("milestones").delete().eq("org_id", org);
  if (docIds.length) await admin().from("documents").delete().in("id", docIds);
  await fx.cleanup();
});

describe("completeness and statuses", () => {
  it("before any placeholder, every enabled artifact without a document is Missing", async () => {
    const r = await grid(lead);
    expect(r.status).toBe(200);
    expect(r.body.counts.Missing).toBeGreaterThan(100);
    expect(r.body.counts.Expected).toBe(0);
  });

  it("acceptance: one placeholder at a site with two Final documents takes it from 100% to 67%", async () => {
    await doc({ artifact_num: "05.02.07", artifact_name: "Curriculum Vitae", custom_file_name: "CV A", study_site_id: site });
    await doc({ artifact_num: "05.02.07", artifact_name: "Curriculum Vitae", custom_file_name: "CV B", study_site_id: site });
    expect((await grid(lead, siteChip(site))).body.completeness).toBe(100);

    const r = await addPh(lead, [{ artifact_num: "05.03.01", level: "site", study_site_id: site, title: "Site signature log" }]);
    expect(r.status).toBe(201);
    const after = await grid(lead, siteChip(site));
    expect(after.body.counts).toMatchObject({ Final: 2, Expected: 1 });
    expect(after.body.completeness).toBe(66.7);
    const row = after.body.data.find((x: { kind: string }) => x.kind === "placeholder");
    expect(row).toMatchObject({ title: "Site signature log", nav_status: "Expected", tmf_level: "Site", site_number: "101" });
  });

  it("once the study has placeholders, unplanned artifacts no longer count as Missing", async () => {
    expect((await grid(lead)).body.counts.Missing).toBe(0);
  });

  it("a placeholder past its due date is Missing; a document without a file is Incomplete", async () => {
    const r = await addPh(lead, [{ artifact_num: "01.01.02", level: "study", due_date: "2020-01-01" }]);
    const row = (await grid(lead, { status: "Missing" })).body.data.find((x: { placeholder_id: string }) => x.placeholder_id === r.body.data[0].id);
    expect(row).toMatchObject({ nav_status: "Missing", current_activity: "Overdue", due_date: "2020-01-01" });
    const d = await doc({ artifact_num: "01.01.03", artifact_name: "Quality Plan", status: "Draft", file_path: null });
    const inc = (await grid(lead, { status: "Incomplete" })).body.data.find((x: { document_id: string }) => x.document_id === d);
    expect(inc).toMatchObject({ nav_status: "Incomplete", current_activity: "No file attached" });
  });
});

describe("fulfilment", () => {
  it("filing a matching document fulfils the placeholder; deleting it opens it again", async () => {
    const id = (await addPh(lead, [{ artifact_num: "05.03.02", level: "site", study_site_id: site2 }])).body.data[0].id;
    // Same artifact at another site does not match.
    const other = await doc({ artifact_num: "05.03.02", artifact_name: "Site staff log", study_site_id: site });
    expect((await ph(id)).status).toBe("open");
    const d = await doc({ artifact_num: "05.03.02", artifact_name: "Site staff log", study_site_id: site2 });
    expect(await ph(id)).toMatchObject({ status: "fulfilled", document_id: d });
    await admin().from("documents").update({ deleted_at: new Date().toISOString(), deletion_reason: "test" }).eq("id", d);
    expect(await ph(id)).toMatchObject({ status: "open", document_id: null });
    expect(other).toBeTruthy();
  });

  it("a new placeholder takes an already-filed matching document that fulfils nothing", async () => {
    const d = await doc({ artifact_num: "02.01.02", artifact_name: "Protocol" });
    const r = await addPh(lead, [{ artifact_num: "02.01.02", level: "study", quantity: 2 }]);
    const both = await Promise.all(r.body.data.map((p: { id: string }) => ph(p.id)));
    expect(both.filter((p) => p.status === "fulfilled").map((p) => p.document_id)).toEqual([d]);
    expect(both.filter((p) => p.status === "open")).toHaveLength(1);
  });

  it("manual link and unlink need a reason and the same artifact", async () => {
    const id = (await addPh(lead, [{ artifact_num: "05.04.01", level: "site", study_site_id: site }])).body.data[0].id;
    const wrong = await doc({ artifact_num: "05.04.02", artifact_name: "Other", study_site_id: site2 });
    expect((await call(link.POST, { token: lead.token, method: "POST", params: { placeholderId: id }, body: { document_id: wrong, reason: "match" } })).status).toBe(400);
    const right = await doc({ artifact_num: "05.04.01", artifact_name: "Ok", study_site_id: site2 });   // different site: no auto-match
    expect((await ph(id)).status).toBe("open");
    expect((await call(link.POST, { token: cra.token, method: "POST", params: { placeholderId: id }, body: { document_id: right, reason: "covers both sites" } })).status).toBe(403);
    const ok = await call(link.POST, { token: lead.token, method: "POST", params: { placeholderId: id }, body: { document_id: right, reason: "covers both sites" } });
    expect(ok.status).toBe(200);
    expect(await ph(id)).toMatchObject({ status: "fulfilled", document_id: right });
    const view = await call(one.GET, { token: cra.token, params: { placeholderId: id } });
    expect(view.body.candidates.map((c: { id: string }) => c.id)).toContain(right);
    await call(link.POST, { token: lead.token, method: "POST", params: { placeholderId: id }, body: { document_id: null, reason: "wrong site after all" } });
    expect(await ph(id)).toMatchObject({ status: "open", document_id: null });
  });
});

describe("managing placeholders", () => {
  it("needs edit_study, a visible study and an enabled artifact", async () => {
    expect((await addPh(cra, [{ artifact_num: "01.01.01", level: "study" }])).status).toBe(403);
    expect((await addPh(outsider, [{ artifact_num: "01.01.01", level: "study" }])).status).toBe(404);
    expect((await addPh(lead, [{ artifact_num: "99.99.99", level: "study" }])).status).toBe(400);
    expect((await addPh(lead, [{ artifact_num: "05.02.07", level: "site" }])).status).toBe(400);
  });

  it("edits descriptive fields with a reason, and can't fulfil by editing", async () => {
    const created = (await addPh(lead, [{ artifact_num: "01.01.04", level: "study", instructions: "Signed copy" }])).body.data[0].id;
    const p = await ph(created);
    const r = await call(one.PATCH, { token: lead.token, method: "PATCH", params: { placeholderId: created }, body: { due_date: "2030-01-31", responsible_dept: "Clinical Ops", row_version: p.row_version, reason: "Agreed with sponsor" } });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ due_date: "2030-01-31", responsible_dept: "Clinical Ops" });
    const sneaky = await lead.db.from("placeholders").update({ status: "fulfilled", document_id: docIds[0] }).eq("id", created).select("id");
    expect(sneaky.error?.message).toMatch(/fulfilled by filing/);
  });

  it("cancels with a reason; cancelled placeholders don't count", async () => {
    const id = (await addPh(lead, [{ artifact_num: "05.03.01", level: "site", study_site_id: site2 }])).body.data[0].id;
    const before = (await grid(lead, siteChip(site2))).body.counts.Expected;
    expect((await call(cancel.POST, { token: lead.token, method: "POST", params: { placeholderId: id }, body: { reason: "x" } })).status).toBe(400);
    expect((await call(cancel.POST, { token: lead.token, method: "POST", params: { placeholderId: id }, body: { reason: "Site uses a central log" } })).status).toBe(200);
    expect((await grid(lead, siteChip(site2))).body.counts.Expected).toBe(before - 1);
    expect((await call(cancel.POST, { token: lead.token, method: "POST", params: { placeholderId: id }, body: { reason: "again please" } })).status).toBe(404);
  });
});

describe("eTMF plan", () => {
  it("only quality leads change the plan; it validates the milestone level", async () => {
    expect((await call(tpl.POST, { token: cra.token, method: "POST", body: { artifact_num: "01.01.01", level: "study", reason: "plan" } })).status).toBe(403);
    expect((await call(tpl.POST, { token: lead.token, method: "POST", body: { artifact_num: "05.02.07", level: "site", trigger_milestone: "DATABASE_LOCK", reason: "plan" } })).status).toBe(400);
  });

  it("apply creates untriggered items; a milestone creates its items; repeating creates nothing new", async () => {
    const a = await call(tpl.POST, { token: lead.token, method: "POST", body: { artifact_num: "01.01.05", level: "study", due_offset_days: 10, instructions: "Use template v3", reason: "Initial plan" } });
    expect(a.status).toBe(201);
    const b = await call(tpl.POST, { token: lead.token, method: "POST", body: { artifact_num: "05.02.09", level: "site", quantity: 2, trigger_milestone: "SITE_ACTIVATED", due_offset_days: 14, reason: "Initial plan" } });
    expect(b.status).toBe(201);

    const first = await call(apply.POST, { token: lead.token, method: "POST", params: { studyId: study.id } });
    expect(first.body.created).toBe(1);
    expect((await call(apply.POST, { token: lead.token, method: "POST", params: { studyId: study.id } })).body.created).toBe(0);
    const { data: made } = await admin().from("placeholders").select("level, due_date, source, instructions").eq("template_item_id", a.body.id);
    expect(made).toHaveLength(1);
    expect(made![0]).toMatchObject({ level: "study", source: "plan", instructions: "Use template v3" });

    // Activating site 101 (status → ongoing) achieves SITE_ACTIVATED and creates two site placeholders due in 14 days.
    const { error } = await lead.db.from("study_sites").update({ status: "ongoing", change_reason: "SIV done" }).eq("id", site);
    expect(error).toBeNull();
    const { data: siteMade } = await admin().from("placeholders").select("study_site_id, due_date, source, milestone_id").eq("template_item_id", b.body.id);
    expect(siteMade).toHaveLength(2);
    expect(siteMade!.every((p) => p.study_site_id === site && p.source === "plan" && p.milestone_id)).toBe(true);
    const due = new Date(siteMade![0].due_date).getTime() - Date.now();
    expect(due / 86400000).toBeGreaterThan(12.5);
    expect((await call(apply.POST, { token: lead.token, method: "POST", params: { studyId: study.id } })).body.created).toBe(0);

    const retire = await call(tplItem.PATCH, { token: lead.token, method: "PATCH", params: { itemId: b.body.id }, body: { is_active: false, row_version: b.body.row_version, reason: "Not needed" } });
    expect(retire.status).toBe(200);
    const view = await call(tpl.GET, { token: cra.token });
    expect(view.body).toMatchObject({ can_edit: false });
    expect(view.body.items.find((i: { id: string }) => i.id === b.body.id).is_active).toBe(false);
  });

  it("users can't create plan placeholders or set their origin directly", async () => {
    const { data } = await lead.db.from("placeholders").insert([{ org_id: org, study_id: study.id, artifact_num: "01.01.01", level: "study", source: "plan" }]).select("source").single();
    expect(data!.source).toBe("manual");
  });
});

describe("Expected Artifacts view and legacy table", () => {
  it("groups counts by zone, section and artifact with completeness", async () => {
    const r = expected.GET(apiRequest(`/x`, { token: lead.token }), { params: Promise.resolve({ studyId: study.id }) });
    const body = await (await r).json();
    expect(body.counts.Final).toBeGreaterThanOrEqual(2);
    const zone5 = body.zones.find((z: { key: string }) => z.key === "05");
    const cv = zone5.children.find((s: { key: string }) => s.key === "05.02").children.find((a: { key: string }) => a.key === "05.02.07");
    expect(cv.counts.Final).toBe(2);
    expect(cv.completeness).toBe(100);
    expect(zone5.completeness).toBeLessThan(100);
    expect((await expected.GET(apiRequest(`/x`, { token: outsider.token }), { params: Promise.resolve({ studyId: study.id }) })).status).toBe(404);
  });

  it("the legacy expected_documents table is closed to users", async () => {
    const { error } = await lead.db.from("expected_documents").select("id").limit(1);
    expect(error).not.toBeNull();
  });
});
