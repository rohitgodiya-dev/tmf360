// Part 1c: each test reproduces an attack that worked before the fix.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { POST as oldInvite } from "@/app/api/invite/route";
import { POST as oldNotify } from "@/app/api/notify/route";
import * as invitations from "@/app/api/v1/invitations/route";
import * as lookup from "@/app/api/v1/invitations/lookup/route";
import * as accept from "@/app/api/v1/invitations/accept/route";
import * as notifications from "@/app/api/v1/notifications/route";
import { Fixtures, admin, anonClient, apiRequest, call, type TestUser } from "./fixtures";

const fx = new Fixtures();
let orgA: string;
let orgB: string;
let adminA: TestUser;
let leadA: TestUser;
let craA: TestUser;
let outsiderA: TestUser;
let adminB: TestUser;
let noRole: TestUser;
let study: { id: string; code: string };
let docA: string;

beforeAll(async () => {
  orgA = await fx.org("acct-a");
  orgB = await fx.org("acct-b");
  adminA = await fx.user("acct-admin-a", { orgId: orgA, role: "System Administrator" });
  leadA = await fx.user("acct-lead-a", { orgId: orgA, role: "TMF Lead" });
  craA = await fx.user("acct-cra-a", { orgId: orgA, role: "CRA" });
  outsiderA = await fx.user("acct-outsider-a", { orgId: orgA, role: "CRA" }); // same org, not on the study
  adminB = await fx.user("acct-admin-b", { orgId: orgB, role: "System Administrator" });
  noRole = await fx.user("acct-norole");
  study = await fx.study(orgA, "ACCT");
  await fx.member(orgA, study.code, craA, "CRA");
  docA = await fx.document({ orgId: orgA, userId: craA.id, studyId: study.code, title: "Delegation log" });
});
afterAll(() => fx.cleanup());

async function roleOf(userId: string) {
  const { data } = await admin().from("user_roles").select("role, org_id, is_active").eq("user_id", userId).single();
  return data!;
}

describe("user_roles: no self-escalation or cross-tenant changes", () => {
  it("a user cannot make themselves System Administrator", async () => {
    const { error } = await craA.db.from("user_roles").update({ role: "System Administrator" }).eq("user_id", craA.id);
    expect(error).not.toBeNull();
    expect((await roleOf(craA.id)).role).toBe("CRA");
  });

  it("a user cannot move themselves into another organisation", async () => {
    await craA.db.from("user_roles").update({ org_id: orgB }).eq("user_id", craA.id);
    expect((await roleOf(craA.id)).org_id).toBe(orgA);
  });

  it("a user without a role cannot join an existing organisation as admin", async () => {
    const { error } = await noRole.db.from("user_roles")
      .insert([{ user_id: noRole.id, org_id: orgA, role: "System Administrator", email: noRole.email, is_active: true }]);
    expect(error).not.toBeNull();
  });

  it("but can become the first member of an organisation they just created (setup flow)", async () => {
    const { data: org, error: orgErr } = await noRole.db.from("organizations")
      .insert([{ name: `test-${fx.runId}-own`, created_by: noRole.id }]).select("id").single();
    expect(orgErr).toBeNull();
    fx.trackOrg(org!.id);
    const { error } = await noRole.db.from("user_roles")
      .insert([{ user_id: noRole.id, org_id: org!.id, role: "System Administrator", email: noRole.email, is_active: true }]);
    expect(error).toBeNull();
  });

  it("an admin of another organisation cannot change these users", async () => {
    await adminB.db.from("user_roles").update({ is_active: false }).eq("user_id", craA.id);
    expect((await roleOf(craA.id)).is_active).toBe(true);
  });

  it("a TMF Lead cannot promote someone to administrator", async () => {
    const { error } = await leadA.db.from("user_roles").update({ role: "System Administrator" }).eq("user_id", craA.id);
    expect(error).not.toBeNull();
    expect((await roleOf(craA.id)).role).toBe("CRA");
  });

  it("an admin can manage users in their own organisation", async () => {
    const { error } = await adminA.db.from("user_roles").update({ role: "Clinical Trial Associate" }).eq("user_id", outsiderA.id);
    expect(error).toBeNull();
    expect((await roleOf(outsiderA.id)).role).toBe("Clinical Trial Associate");
  });

  it("users can still edit their own name", async () => {
    const { error } = await craA.db.from("user_roles").update({ full_name: "Casey CRA" }).eq("user_id", craA.id);
    expect(error).toBeNull();
  });
});

describe("retired endpoints", () => {
  it("the old invite route no longer creates users or resets passwords", async () => {
    const res = await oldInvite();
    expect(res.status).toBe(410);
    // The attack: reset an existing admin's password. Their real session must still work.
    const { error } = await adminA.db.auth.getUser();
    expect(error).toBeNull();
  });

  it("the old notify route no longer sends email", async () => {
    expect((await oldNotify()).status).toBe(410);
  });
});

describe("invitations", () => {
  const inviteeEmail = () => `invitee-${fx.runId}@example.test`;
  let link: string;

  it("anonymous callers and roles without invite rights are refused", async () => {
    const body = { email: "x@example.test", role: "CRA" };
    expect((await call(invitations.POST, { method: "POST", body })).status).toBe(401);
    expect((await call(invitations.POST, { token: craA.token, method: "POST", body })).status).toBe(403);
  });

  it("a TMF Lead cannot invite an administrator", async () => {
    const r = await call(invitations.POST, { token: leadA.token, method: "POST", body: { email: "boss@example.test", role: "System Administrator" } });
    expect(r.status).toBe(403);
  });

  it("existing members cannot be re-invited (no password or role takeover)", async () => {
    const own = await call(invitations.POST, { token: adminA.token, method: "POST", body: { email: craA.email, role: "System Administrator" } });
    expect(own.status).toBe(409);
    const other = await call(invitations.POST, { token: adminA.token, method: "POST", body: { email: adminB.email.toUpperCase(), role: "CRA" } });
    expect(other.status).toBe(409);
  });

  it("an admin invites a new person into their own organisation", async () => {
    fx.trackEmail(inviteeEmail());
    const r = await call(invitations.POST, { token: adminA.token, method: "POST", body: { email: inviteeEmail(), full_name: "Ivy Invitee", role: "CRA" } });
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ email: inviteeEmail(), role: "CRA", emailed: false });
    link = r.body.inviteUrl;
    expect(link).toMatch(/\/platform\/invite\?token=[\w-]{40,}/);
    const { data } = await admin().from("user_invitations").select("org_id, token_hash").eq("email", inviteeEmail()).single();
    expect(data!.org_id).toBe(orgA);
    expect(link).not.toContain(data!.token_hash); // only the hash is stored
  });

  it("only that organisation's managers can see the invitation", async () => {
    const { data: mine } = await adminA.db.from("user_invitations").select("id").eq("email", inviteeEmail());
    expect(mine).toHaveLength(1);
    const { data: theirs } = await adminB.db.from("user_invitations").select("id").eq("email", inviteeEmail());
    expect(theirs).toHaveLength(0);
    const { data: cra } = await craA.db.from("user_invitations").select("id").eq("email", inviteeEmail());
    expect(cra).toHaveLength(0);
  });

  it("the link shows who it is for; bad links are rejected", async () => {
    const token = new URL(link).searchParams.get("token")!;
    const ok = await call(lookup.POST, { method: "POST", body: { token } });
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ email: inviteeEmail(), role: "CRA" });
    const bad = await call(lookup.POST, { method: "POST", body: { token: "x".repeat(43) } });
    expect(bad.status).toBe(404);
  });

  it("accepting sets the invitee's own password and joins the right organisation, once", async () => {
    const token = new URL(link).searchParams.get("token")!;
    const weak = await call(accept.POST, { method: "POST", body: { token, password: "short" } });
    expect(weak.status).toBe(400);
    const ok = await call(accept.POST, { method: "POST", body: { token, password: "Correct-Horse-9" } });
    expect(ok.status).toBe(200);

    const { data: session, error } = await anonClient().auth.signInWithPassword({ email: inviteeEmail(), password: "Correct-Horse-9" });
    expect(error).toBeNull();
    const role = await roleOf(session.user!.id);
    expect(role).toMatchObject({ role: "CRA", org_id: orgA, is_active: true });

    const again = await call(accept.POST, { method: "POST", body: { token, password: "Another-Pass-9" } });
    expect(again.status).toBe(410);
  });

  it("expired links cannot be used", async () => {
    const email = `expired-${fx.runId}@example.test`;
    fx.trackEmail(email);
    const r = await call(invitations.POST, { token: adminA.token, method: "POST", body: { email, role: "CRA" } });
    await admin().from("user_invitations").update({ expires_at: new Date(Date.now() - 1000).toISOString() }).eq("id", r.body.id);
    const token = new URL(r.body.inviteUrl).searchParams.get("token")!;
    expect((await call(accept.POST, { method: "POST", body: { token, password: "Correct-Horse-9" } })).status).toBe(410);
  });
});

describe("notifications", () => {
  it("anonymous callers are refused", async () => {
    const res = await notifications.POST(apiRequest("/api/v1/notifications", {
      method: "POST", body: JSON.stringify({ type: "document_uploaded", document_id: docA }),
    }));
    expect(res.status).toBe(401);
  });

  it("go only to opted-in members of the organisation who can access the study", async () => {
    const r = await call(notifications.POST, { token: craA.token, method: "POST", body: { type: "document_uploaded", document_id: docA } });
    expect(r.status).toBe(200);
    // adminA and leadA (their roles see every study), craA (study member).
    // Not outsiderA (same org, not on the study), not the uninvited, not org B.
    expect(r.body.recipients).toBe(3);
  });

  it("a user cannot trigger notifications about another organisation's document", async () => {
    const r = await call(notifications.POST, { token: adminB.token, method: "POST", body: { type: "document_uploaded", document_id: docA } });
    expect(r.status).toBe(404);
  });

  it("the recipient list cannot be read for a study the caller cannot access", async () => {
    const { data } = await adminB.db.rpc("study_notification_recipients", { p_study_code: study.code });
    expect(data ?? []).toHaveLength(0);
    const { data: anon } = await anonClient().rpc("study_notification_recipients", { p_study_code: study.code });
    expect(anon ?? []).toHaveLength(0);
  });
});
