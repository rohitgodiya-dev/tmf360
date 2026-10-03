// Site360 invitations: site managers invite site staff through /api/v1/invitations,
// limited to site roles; the old /api/site360-invite routes are retired.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { POST as oldSiteInvite } from "@/app/api/site360-invite/route";
import { POST as oldSiteAccept } from "@/app/api/site360-invite/accept/route";
import * as invitations from "@/app/api/v1/invitations/route";
import * as lookup from "@/app/api/v1/invitations/lookup/route";
import * as accept from "@/app/api/v1/invitations/accept/route";
import { Fixtures, admin, anonClient, call, type TestUser } from "./fixtures";

const fx = new Fixtures();
let siteOrg: string;
let coordinator: TestUser;
let investigator: TestUser;

beforeAll(async () => {
  siteOrg = await fx.org("site-inv", "Site");
  coordinator = await fx.user("site-coord", { orgId: siteOrg, role: "Site Coordinator" });
  investigator = await fx.user("site-pi", { orgId: siteOrg, role: "Investigator" });
});
afterAll(() => fx.cleanup());

describe("site invitations", () => {
  const email = () => `site-invitee-${fx.runId}@example.test`;

  it("the old Site360 invite routes are retired", async () => {
    expect((await oldSiteInvite()).status).toBe(410);
    expect((await oldSiteAccept()).status).toBe(410);
  });

  it("a site coordinator can invite site staff, and the link leads to Site360", async () => {
    fx.trackEmail(email());
    const r = await call(invitations.POST, {
      token: coordinator.token, method: "POST", body: { email: email(), full_name: "Pat Investigator", role: "Investigator" },
    });
    expect(r.status).toBe(201);
    const token = new URL(r.body.inviteUrl).searchParams.get("token")!;
    const info = await call(lookup.POST, { method: "POST", body: { token } });
    expect(info.body).toMatchObject({ role: "Investigator", product: "site360" });

    expect((await call(accept.POST, { method: "POST", body: { token, password: "Correct-Horse-9" } })).status).toBe(200);
    const { data: session, error } = await anonClient().auth.signInWithPassword({ email: email(), password: "Correct-Horse-9" });
    expect(error).toBeNull();
    const { data: role } = await admin().from("user_roles").select("role, org_id").eq("user_id", session.user!.id).single();
    expect(role).toMatchObject({ role: "Investigator", org_id: siteOrg });
  });

  it("site managers cannot grant sponsor-side or administrator roles", async () => {
    for (const role of ["System Administrator", "Sponsor Admin", "TMF Lead", "CRA"]) {
      const r = await call(invitations.POST, { token: coordinator.token, method: "POST", body: { email: `x-${fx.runId}@example.test`, role } });
      expect(r.status, role).toBe(403);
    }
  });

  it("other site staff cannot invite", async () => {
    const r = await call(invitations.POST, { token: investigator.token, method: "POST", body: { email: `y-${fx.runId}@example.test`, role: "Auditor" } });
    expect(r.status).toBe(403);
  });
});
