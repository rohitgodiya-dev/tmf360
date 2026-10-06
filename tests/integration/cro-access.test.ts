// Part 17: CRO study-scoped access, plus the study_members security fix. (ENT-06..08)
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as croAccess from "@/app/api/v1/studies/[studyId]/cro-access/route";
import * as memberById from "@/app/api/v1/study-members/[memberId]/route";
import * as accept from "@/app/api/v1/invitations/accept/route";
import { Fixtures, admin, anonClient, call, type TestUser } from "./fixtures";

const fx = new Fixtures();
let orgA: string, orgB: string;
let leadA: TestUser, craA: TestUser, adminB: TestUser, sponsorAdminA: TestUser;
let s1: { id: string; code: string }, s2: { id: string; code: string };
let craMemberId: string;
const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

const seesStudy = async (u: TestUser, code: string) => {
  const { data } = await u.db.from("studies").select("study_id").eq("study_id", code);
  return (data ?? []).length === 1;
};
const canAccess = async (u: TestUser, orgId: string, code: string) =>
  (await admin().rpc("can_access_study", { p_user_id: u.id, p_study_id: code, p_org_id: orgId })).data as boolean;

beforeAll(async () => {
  orgA = await fx.org("cro-a");
  orgB = await fx.org("cro-b");
  leadA = await fx.user("c-lead-a", { orgId: orgA, role: "TMF Lead" });
  sponsorAdminA = await fx.user("c-sadmin-a", { orgId: orgA, role: "Sponsor Admin" });
  craA = await fx.user("c-cra-a", { orgId: orgA, role: "CRA" });
  adminB = await fx.user("c-admin-b", { orgId: orgB, role: "System Administrator" });
  s1 = await fx.study(orgA, "C1");
  s2 = await fx.study(orgA, "C2");
  await fx.member(orgA, s1.code, craA, "CRA");
});
afterAll(() => fx.cleanup());

describe("study_members security", () => {
  it("a CRA cannot give themselves access to another study", async () => {
    const { error } = await craA.db.from("study_members").insert([{ org_id: orgA, study_id: s2.code, user_id: craA.id, email: craA.email, role: "CRA", is_active: true }]);
    expect(error).not.toBeNull();
    expect(await canAccess(craA, orgA, s2.code)).toBe(false);
  });

  it("memberships are not visible to other organisations", async () => {
    const { data } = await adminB.db.from("study_members").select("id").eq("org_id", orgA);
    expect(data ?? []).toHaveLength(0);
  });

  it("other organisations cannot change or delete memberships", async () => {
    const { data: upd } = await adminB.db.from("study_members").update({ is_active: false }).eq("org_id", orgA).select("id");
    expect(upd ?? []).toHaveLength(0);
    const { data: del } = await adminB.db.from("study_members").delete().eq("org_id", orgA).select("id");
    expect(del ?? []).toHaveLength(0);
    expect(await canAccess(craA, orgA, s1.code)).toBe(true);
  });

  it("memberships cannot be deleted in a sponsor organisation, even by a lead", async () => {
    const { data } = await leadA.db.from("study_members").delete().eq("org_id", orgA).select("id");
    expect(data ?? []).toHaveLength(0);
  });

  it("the study list shows only the studies a user can access", async () => {
    expect(await seesStudy(craA, s1.code)).toBe(true);
    expect(await seesStudy(craA, s2.code)).toBe(false);
    expect(await seesStudy(leadA, s2.code)).toBe(true);
  });
});

describe("CRO access", () => {
  it("only user managers can grant CRO access", async () => {
    const r = await call(croAccess.POST, { token: craA.token, method: "POST", params: { studyId: s1.id }, body: { email: "x@example.test", cro_name: "Nope", scope: "monitor" } });
    expect(r.status).toBe(403);
  });

  it("grants an existing organisation member access to one more study, for a CRO, until a date", async () => {
    const r = await call(croAccess.POST, { token: leadA.token, method: "POST", params: { studyId: s2.id },
      body: { email: craA.email, cro_name: `Parexel ${fx.runId}`, scope: "monitor", expires_on: tomorrow } });
    expect(r.status).toBe(201);
    expect(r.body.kind).toBe("member");
    craMemberId = r.body.member.id;
    expect(await canAccess(craA, orgA, s2.code)).toBe(true);
    expect(await seesStudy(craA, s2.code)).toBe(true);
    const list = await call(croAccess.GET, { token: leadA.token, params: { studyId: s2.id } });
    expect(list.body.members[0]).toMatchObject({ email: craA.email, status: "active", scope: "monitor", party: { name: `Parexel ${fx.runId}` } });
  });

  it("rejects end dates in the past and people who already see every study", async () => {
    const past = await call(croAccess.POST, { token: leadA.token, method: "POST", params: { studyId: s2.id },
      body: { email: craA.email, cro_party_id: (await admin().from("parties").select("id").eq("org_id", orgA).eq("party_type", "cro").single()).data!.id, scope: "monitor", expires_on: "2020-01-01" } });
    expect(past.status).toBe(400);
    const adminUser = await call(croAccess.POST, { token: leadA.token, method: "POST", params: { studyId: s2.id },
      body: { email: sponsorAdminA.email, cro_name: `Other ${fx.runId}`, scope: "monitor" } });
    expect(adminUser.status).toBe(409);
  });

  it("revoking access ends it immediately and is audited", async () => {
    const r = await call(memberById.PATCH, { token: leadA.token, method: "PATCH", params: { memberId: craMemberId }, body: { action: "revoke", reason: "Monitoring contract ended" } });
    expect(r.status).toBe(200);
    expect(r.body.deactivated_at).not.toBeNull();
    expect(await canAccess(craA, orgA, s2.code)).toBe(false);
    const { data } = await admin().from("audit_trail").select("action, signature_reason").eq("org_id", orgA).eq("action", "Study access revoked");
    expect(data?.[0]?.signature_reason).toBe("Monitoring contract ended");
  });

  it("expired access stops counting without anyone acting", { timeout: 30000 }, async () => {
    const soon = new Date(Date.now() + 4000).toISOString();
    const { error } = await admin().from("study_members").update({ is_active: true, expires_at: soon }).eq("id", craMemberId);
    expect(error).toBeNull();
    expect(await canAccess(craA, orgA, s2.code)).toBe(true);
    await new Promise((r) => setTimeout(r, 7000));
    expect(await canAccess(craA, orgA, s2.code)).toBe(false);
    expect(await seesStudy(craA, s2.code)).toBe(false);
  });

  it("invites a new CRO person straight into one study", async () => {
    const email = `test-${fx.runId}-newcra@example.test`;
    fx.trackEmail(email);
    const r = await call(croAccess.POST, { token: leadA.token, method: "POST", params: { studyId: s2.id },
      body: { email, full_name: "New Monitor", cro_name: `IQVIA ${fx.runId}`, scope: "data_manager", expires_on: tomorrow } });
    expect(r.status).toBe(201);
    expect(r.body.kind).toBe("invitation");
    const list = await call(croAccess.GET, { token: leadA.token, params: { studyId: s2.id } });
    expect(list.body.invitations.some((i: { email: string; cro_name: string }) => i.email === email && i.cro_name === `IQVIA ${fx.runId}`)).toBe(true);

    const token = new URL(r.body.inviteUrl).searchParams.get("token")!;
    const password = `Pw-${fx.runId}-secret`;
    const acc = await call(accept.POST, { method: "POST", body: { token, password } });
    expect(acc.status).toBe(200);

    const db = anonClient();
    const { data: session } = await db.auth.signInWithPassword({ email, password });
    const { data: role } = await admin().from("user_roles").select("role").eq("email", email).single();
    expect(role?.role).toBe("Clinical Trial Associate");
    const { data: m } = await admin().from("study_members").select("study_id, party_id, expires_at, role").eq("user_id", session.user!.id).single();
    expect(m).toMatchObject({ study_id: s2.code, role: "Clinical Trial Associate" });
    expect(m?.party_id).not.toBeNull();
    const { data: visible } = await db.from("studies").select("study_id").eq("org_id", orgA);
    expect((visible ?? []).map((s) => s.study_id)).toEqual([s2.code]);
  });
});
