// Part 14d: two-factor sign-in (PLT-01). Real TOTP codes (RFC 6238) are computed here to enrol and
// verify a factor; the API must refuse one-factor sessions where two-factor applies.
import { createHmac } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as me from "@/app/api/v1/me/route";
import * as settings from "@/app/api/v1/security-settings/route";
import { Fixtures, admin, call, type TestUser } from "./fixtures";

const fx = new Fixtures();
let org: string;
let adminUser: TestUser, member: TestUser;

function totp(secretB32: string, at = Date.now()) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const c of secretB32.replace(/=+$/, "").toUpperCase()) bits += alphabet.indexOf(c).toString(2).padStart(5, "0");
  const key = Buffer.from(bits.match(/.{8}/g)!.map((b) => parseInt(b, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(at / 30000)));
  const h = createHmac("sha1", key).update(counter).digest();
  const o = h[h.length - 1] & 0xf;
  return String((((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]) % 1_000_000).padStart(6, "0");
}
async function signIn(u: TestUser) {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await db.auth.signInWithPassword({ email: u.email, password: u.password });
  if (error) throw error;
  return { db, token: data.session!.access_token };
}
const meStatus = async (token: string) => (await call(me.GET, { token })).status;

let factorSecret: string;
let adminDb: SupabaseClient;
let aal2Token: string;

beforeAll(async () => {
  org = await fx.org("mfa");
  adminUser = await fx.user("mfa-admin", { orgId: org, role: "Sponsor Admin" });
  member = await fx.user("mfa-member", { orgId: org, role: "CRA" });
});

afterAll(async () => {
  await admin().from("org_security_settings").delete().eq("org_id", org);
  await fx.cleanup();
});

describe("two-factor sign-in (PLT-01)", () => {
  it("without a factor or a requirement, password sessions work", async () => {
    expect(await meStatus(member.token)).toBe(200);
  });

  it("an administrator can't require two-factor from a one-factor session (no lock-out)", async () => {
    const r = await call(settings.PUT, { token: adminUser.token, method: "PUT", body: { require_mfa: true, sso_domain: null, reason: "Security policy v2" } });
    expect(r.status).toBe(400);
  });

  it("enrolling a TOTP factor raises the session to aal2", async () => {
    const s = await signIn(adminUser);
    adminDb = s.db;
    const { data: enrol, error } = await adminDb.auth.mfa.enroll({ factorType: "totp", friendlyName: "test" });
    expect(error).toBeNull();
    factorSecret = enrol!.totp.secret;
    const { data: v, error: vErr } = await adminDb.auth.mfa.challengeAndVerify({ factorId: enrol!.id, code: totp(factorSecret) });
    expect(vErr).toBeNull();
    aal2Token = v!.access_token;
    expect(await meStatus(aal2Token)).toBe(200);
  });

  it("an account with a factor is refused with a password-only session", async () => {
    const fresh = await signIn(adminUser);
    const r = await call(me.GET, { token: fresh.token });
    expect(r.status).toBe(403);
    expect(r.body.error.message).toMatch(/two-factor code/);
  });

  it("requiring two-factor blocks members without it; the change is audited", async () => {
    const r = await call(settings.PUT, { token: aal2Token, method: "PUT", body: { require_mfa: true, sso_domain: "mfa-test.example.com", reason: "Security policy v2" } });
    expect(r.status).toBe(200);
    const m = await call(me.GET, { token: member.token });
    expect(m.status).toBe(403);
    expect(m.body.error.message).toMatch(/requires two-factor/);
    const { data } = await admin().from("audit_trail").select("signature_reason").eq("org_id", org).eq("action", "org_security_settings.insert");
    expect(data).toEqual([{ signature_reason: "Security policy v2" }]);
    const { data: sso } = await admin().rpc("sso_available", { p_email: "someone@mfa-test.example.com" });
    expect(sso).toBe(true);
  });

  it("members can't change the policy", async () => {
    await admin().from("org_security_settings").update({ require_mfa: false, change_reason: "test reset" }).eq("org_id", org);
    expect((await call(settings.PUT, { token: member.token, method: "PUT", body: { require_mfa: false, sso_domain: null, reason: "Turn it off" } })).status).toBe(403);
  });
});
