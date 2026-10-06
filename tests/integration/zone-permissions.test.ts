// Part 14g: per-zone content permissions (USR-05), Unblinded Contribute with a second approver (USR-06) and
// blinded documents (REG-07). Enforced in the documents RLS policies, so the user's own client is the boundary.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as grants from "@/app/api/v1/studies/[studyId]/zone-permissions/route";
import * as decide from "@/app/api/v1/zone-permissions/[grantId]/decide/route";
import * as revoke from "@/app/api/v1/zone-permissions/[grantId]/revoke/route";
import * as blinding from "@/app/api/v1/documents/[documentId]/blinding/route";
import { Fixtures, admin, call, type TestUser } from "./fixtures";

const fx = new Fixtures();
let org: string;
let admin1: TestUser, admin2: TestUser, cra: TestUser, lead: TestUser;
let study: { id: string; code: string };
const d: Record<string, string> = {};

async function doc(key: string, artifact: string, blinded = false) {
  const { data, error } = await admin().from("documents").insert([{ org_id: org, user_id: admin1.id, study_id: study.code, status: "Approved", approved_at: new Date().toISOString(),
    approved_by: "seed@example.test", artifact_num: artifact, artifact_name: key, custom_file_name: key, blinded, file_path: `${org}/${fx.runId}/${key}.pdf` }]).select("id").single();
  if (error) throw error;
  d[key] = data.id;
}
const visible = async (u: TestUser) => {
  const { data, error } = await u.db.from("documents").select("custom_file_name").eq("study_id", study.code).order("custom_file_name");
  if (error) throw error;
  return data.map((r) => r.custom_file_name);
};
const grant = (u: TestUser, body: Record<string, unknown>) => call(grants.POST, { token: u.token, method: "POST", params: { studyId: study.id }, body });

beforeAll(async () => {
  org = await fx.org("zp");
  admin1 = await fx.user("zp-admin1", { orgId: org, role: "Sponsor Admin" });
  admin2 = await fx.user("zp-admin2", { orgId: org, role: "Sponsor Admin" });
  lead = await fx.user("zp-lead", { orgId: org, role: "TMF Lead" });
  cra = await fx.user("zp-cra", { orgId: org, role: "CRA" });
  study = await fx.study(org, "ZP");
  await fx.member(org, study.code, cra, "CRA");
  await doc("a-protocol", "02.01.02");
  await doc("b-randomisation list", "02.01.09", true);
  await doc("c-site file", "05.01.01");
});

afterAll(async () => { await fx.cleanup(); });

describe("per-zone permissions and blinding (USR-05/06, REG-07)", () => {
  let unblindedGrant: string;

  it("with no grants the study is open, but blinded documents stay hidden", async () => {
    expect(await visible(cra)).toEqual(["a-protocol", "c-site file"]);
    expect(await visible(lead)).toEqual(["a-protocol", "c-site file"]);
    expect((await call(grants.GET, { token: cra.token, params: { studyId: study.id } })).body.restricted).toBe(false);
  });

  it("only access managers grant; Read-only on a zone hides the others and blocks edits", async () => {
    expect((await grant(cra, { user_id: cra.id, zone_num: "02", level: "contribute", reason: "self grant" })).status).toBe(403);
    expect((await grant(admin1, { user_id: cra.id, zone_num: "02", level: "read", reason: "Monitoring zone 02" })).status).toBe(201);
    expect(await visible(cra)).toEqual(["a-protocol"]);
    expect(await visible(lead)).toEqual([]);   // restricted study, no grant for the lead
    const { data: upd } = await cra.db.from("documents").update({ comments: "edited" }).eq("id", d["a-protocol"]).select("id");
    expect(upd).toEqual([]);
    const { data: file } = await cra.db.rpc("can_read_document_file", { p_name: `${org}/${fx.runId}/c-site file.pdf`, p_owner: admin1.id });
    expect(file).toBe(false);
    const { data: ok } = await cra.db.rpc("can_read_document_file", { p_name: `${org}/${fx.runId}/a-protocol.pdf`, p_owner: admin1.id });
    expect(ok).toBe(true);
  });

  it("Contribute allows edits; creating in a zone without Contribute is refused", async () => {
    await grant(admin1, { user_id: cra.id, zone_num: "02", level: "contribute", reason: "Needs to file" });
    const { data: upd } = await cra.db.from("documents").update({ comments: "edited" }).eq("id", d["a-protocol"]).select("id");
    expect(upd).toHaveLength(1);
    const { error } = await cra.db.from("documents").insert([{ org_id: org, user_id: cra.id, study_id: study.code, status: "Draft", artifact_num: "05.01.01", artifact_name: "x" }]);
    expect(error).toBeTruthy();
  });

  it("Unblinded Contribute needs a second approver before blinded documents show", async () => {
    const r = await grant(admin1, { user_id: cra.id, zone_num: "02", level: "unblinded_contribute", reason: "Unblinded statistician" });
    expect(r.body.status).toBe("pending");
    unblindedGrant = r.body.id;
    expect(await visible(cra)).toEqual(["a-protocol"]);   // still Contribute while pending
    const self = await call(decide.POST, { token: admin1.token, method: "POST", params: { grantId: unblindedGrant }, body: { approve: true, reason: "Approve it" } });
    expect(self.body.error.message).toMatch(/second person/);
    expect((await call(decide.POST, { token: cra.token, method: "POST", params: { grantId: unblindedGrant }, body: { approve: true, reason: "Approve it" } })).status).toBe(403);
    expect((await call(decide.POST, { token: admin2.token, method: "POST", params: { grantId: unblindedGrant }, body: { approve: true, reason: "Approved per unblinding plan" } })).status).toBe(200);
    expect(await visible(cra)).toEqual(["a-protocol", "b-randomisation list"]);
    const { data: audit } = await admin().from("audit_trail").select("action").eq("org_id", org).ilike("action", "%study_zone_permissions%");
    expect((audit ?? []).length).toBeGreaterThan(0);
  });

  it("only Unblinded Contribute changes blinding, through the audited action", async () => {
    const { error: direct } = await cra.db.from("documents").update({ blinded: true }).eq("id", d["a-protocol"]);
    expect(direct?.message).toMatch(/Set blinding/);
    expect((await call(blinding.POST, { token: cra.token, method: "POST", params: { documentId: d["a-protocol"] }, body: { blinded: true, reason: "Contains allocation" } })).status).toBe(200);
    const { data: a } = await admin().from("audit_trail").select("action, signature_reason").eq("document_id", d["a-protocol"]).eq("action", "Document blinded");
    expect(a).toEqual([{ action: "Document blinded", signature_reason: "Contains allocation" }]);
    await grant(admin1, { user_id: lead.id, zone_num: "02", level: "contribute", reason: "Lead files protocols" });
    expect(await visible(lead)).toEqual([]);   // both zone-02 documents are now blinded
    expect((await call(blinding.POST, { token: lead.token, method: "POST", params: { documentId: d["a-protocol"] }, body: { blinded: false, reason: "try" } })).status).toBe(404);
  });

  it("revoking removes access", async () => {
    expect((await call(revoke.POST, { token: admin2.token, method: "POST", params: { grantId: unblindedGrant }, body: { reason: "Left the study" } })).status).toBe(200);
    expect(await visible(cra)).toEqual([]);
    const g = await call(grants.GET, { token: admin1.token, params: { studyId: study.id } });
    expect(g.body.restricted).toBe(true);
    expect(g.body.grants.map((x: { email: string; level: string }) => x.level)).toEqual(["contribute"]);
  });
});
