// Part 1d: unauthenticated service-key routes. Each test reproduces the old attack.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as oldPassword from "@/app/api/change-password/route";
import * as oldPrefs from "@/app/api/notification-preferences/route";
import * as password from "@/app/api/v1/users/[userId]/password/route";
import * as prefs from "@/app/api/v1/notification-preferences/route";
import * as genToken from "@/app/api/generate-token/route";
import * as genSiteToken from "@/app/api/generate-site360-token/route";
import * as expiryCron from "@/app/api/cron/expiry-check/route";
import { NextRequest } from "next/server";
import { Fixtures, admin, anonClient, call, type TestUser } from "./fixtures";

const fx = new Fixtures();
let orgA: string;
let adminA: TestUser;
let craA: TestUser;
let adminB: TestUser;
let operator: TestUser;
const tokens: string[] = [];

beforeAll(async () => {
  orgA = await fx.org("route-a");
  const orgB = await fx.org("route-b");
  adminA = await fx.user("route-admin-a", { orgId: orgA, role: "System Administrator" });
  craA = await fx.user("route-cra-a", { orgId: orgA, role: "CRA" });
  adminB = await fx.user("route-admin-b", { orgId: orgB, role: "System Administrator" });
  operator = await fx.user("route-operator");
  const { error } = await admin().from("admin_users").insert([{ email: operator.email, is_active: true }]);
  if (error) throw error;
});
afterAll(async () => {
  await admin().from("admin_users").delete().eq("email", operator.email);
  if (tokens.length) await admin().from("signup_tokens").delete().in("token", tokens);
  await admin().from("site360_signup_tokens").delete().like("site_name", `test-${fx.runId}%`);
  await admin().from("notification_preferences").delete().in("user_id", [adminA.id, craA.id]);
  await fx.cleanup();
});

describe("retired routes", () => {
  it("the old change-password and notification-preferences routes are gone", async () => {
    expect((await oldPassword.POST()).status).toBe(410);
    expect((await oldPrefs.POST()).status).toBe(410);
    expect((await oldPrefs.GET()).status).toBe(410);
  });
});

describe("admin password reset", () => {
  const body = { new_password: "Brand-New-Pass-9" };

  it("requires a signed-in administrator", async () => {
    expect((await call(password.PUT, { method: "PUT", params: { userId: craA.id }, body })).status).toBe(401);
    expect((await call(password.PUT, { token: craA.token, method: "PUT", params: { userId: adminA.id }, body })).status).toBe(403);
  });

  it("cannot reach users in another organisation", async () => {
    const r = await call(password.PUT, { token: adminB.token, method: "PUT", params: { userId: craA.id }, body });
    expect(r.status).toBe(404);
    const { error } = await anonClient().auth.signInWithPassword({ email: craA.email, password: body.new_password });
    expect(error).not.toBeNull(); // the password was not changed
  });

  it("works within the organisation, is audited, and never logs the password", async () => {
    const r = await call(password.PUT, { token: adminA.token, method: "PUT", params: { userId: craA.id }, body });
    expect(r.status).toBe(200);
    const { error } = await anonClient().auth.signInWithPassword({ email: craA.email, password: body.new_password });
    expect(error).toBeNull();
    const { data: audit } = await admin().from("audit_trail").select("*").eq("user_id", adminA.id).eq("action", "Password reset by administrator");
    expect(audit).toHaveLength(1);
    expect(JSON.stringify(audit)).not.toContain(body.new_password);
  });

  it("signs the user out of their existing sessions", async () => {
    const { error } = await craA.db.auth.getUser(craA.token);
    expect(error).not.toBeNull();
  });

  it("an admin cannot reset their own password here", async () => {
    expect((await call(password.PUT, { token: adminA.token, method: "PUT", params: { userId: adminA.id }, body })).status).toBe(409);
  });
});

describe("notification preferences", () => {
  it("always apply to the caller and the caller's organisation", async () => {
    // The attack: name another user and organisation in the request.
    const r = await call(prefs.PUT, {
      token: adminA.token, method: "PUT",
      body: { report_frequency: "Weekly", expiry_window: 45, user_id: adminB.id, org_id: "00000000-0000-0000-0000-000000000000" },
    });
    expect(r.status).toBe(200);
    const { data } = await admin().from("notification_preferences").select("user_id, org_id, report_frequency").eq("user_id", adminA.id).single();
    expect(data).toMatchObject({ user_id: adminA.id, org_id: orgA, report_frequency: "Weekly" });
    const { data: victim } = await admin().from("notification_preferences").select("id").eq("user_id", adminB.id);
    expect(victim).toHaveLength(0);
    expect((await call(prefs.GET, { token: adminA.token })).body).toMatchObject({ report_frequency: "Weekly", expiry_window: 45 });
  });

  it("require sign-in", async () => {
    expect((await call(prefs.GET, {})).status).toBe(401);
  });
});

describe("sign-up links", () => {
  it("only platform admins can create them; the old browser secret no longer works", async () => {
    const body = { org_name: `test-${fx.runId}-org`, email: "", secret: "tmf360-admin-2026" };
    expect((await call(genToken.POST, { method: "POST", body })).status).toBe(401);
    expect((await call(genToken.POST, { token: adminA.token, method: "POST", body })).status).toBe(403);
    const ok = await call(genToken.POST, { token: operator.token, method: "POST", body });
    expect(ok.status).toBe(200);
    tokens.push(ok.body.token);
    expect(ok.body.token).toMatch(/^[0-9a-f]{64}$/);

    const site = { site_name: `test-${fx.runId}-site`, email: "site@example.test", secret: "site360-admin-2026" };
    expect((await call(genSiteToken.POST, { token: adminA.token, method: "POST", body: site })).status).toBe(403);
    expect((await call(genSiteToken.POST, { token: operator.token, method: "POST", body: site })).status).toBe(200);
  });

  it("visitors cannot list or edit tokens, but can check and use the one they hold", async () => {
    const token = tokens[0];
    const { data: listed } = await anonClient().from("signup_tokens").select("token");
    expect(listed ?? []).toHaveLength(0);
    await anonClient().from("signup_tokens").update({ expires_at: "2099-01-01" }).eq("token", token);

    const { data: check } = await anonClient().rpc("check_signup_token", { p_token: token });
    expect(check[0]).toMatchObject({ status: "valid", org_name: `test-${fx.runId}-org` });
    const { data: used } = await anonClient().rpc("use_signup_token", { p_token: token });
    expect(used).toBe(true);
    const { data: again } = await anonClient().rpc("use_signup_token", { p_token: token });
    expect(again).toBe(false);
    const { data: after } = await anonClient().rpc("check_signup_token", { p_token: token });
    expect(after[0].status).toBe("used");
    const { data: unknown } = await anonClient().rpc("check_signup_token", { p_token: "nope" });
    expect(unknown ?? []).toHaveLength(0);
  });
});

describe("scheduled jobs", () => {
  it("reject 'Bearer undefined' when CRON_SECRET is not configured", async () => {
    const saved = process.env.CRON_SECRET;
    delete process.env.CRON_SECRET;
    try {
      const res = await expiryCron.GET(new NextRequest("http://localhost/api/cron/expiry-check", {
        headers: { authorization: "Bearer undefined" },
      }));
      expect(res.status).toBe(401);
    } finally {
      if (saved !== undefined) process.env.CRON_SECRET = saved;
    }
  });
});
