import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { GET as me } from "@/app/api/v1/me/route";
import { Fixtures, apiRequest, type TestUser } from "./fixtures";

const fx = new Fixtures();
let orgId: string;
let adminUser: TestUser;
let craUser: TestUser;
let noRoleUser: TestUser;

beforeAll(async () => {
  orgId = await fx.org("me");
  adminUser = await fx.user("admin", { orgId, role: "System Administrator" });
  craUser = await fx.user("cra", { orgId, role: "CRA" });
  noRoleUser = await fx.user("norole");
});
afterAll(() => fx.cleanup());

describe("GET /api/v1/me", () => {
  it("rejects requests without a token", async () => {
    const res = await me(apiRequest("/api/v1/me"));
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe("unauthenticated");
  });

  it("rejects a forged token", async () => {
    const res = await me(apiRequest("/api/v1/me", { token: "not.a.real.token" }));
    expect(res.status).toBe(401);
  });

  it("rejects a user with no active role", async () => {
    const res = await me(apiRequest("/api/v1/me", { token: noRoleUser.token }));
    expect(res.status).toBe(403);
  });

  it("returns identity, org, role and permissions", async () => {
    const res = await me(apiRequest("/api/v1/me", { token: adminUser.token }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ id: adminUser.id, email: adminUser.email, orgId, role: "System Administrator" });
    expect(body.permissions).toContain("manage_roles");
  });

  it("scopes permissions to the role", async () => {
    const body = await (await me(apiRequest("/api/v1/me", { token: craUser.token }))).json();
    expect(body.role).toBe("CRA");
    expect(body.permissions).toContain("upload_document");
    expect(body.permissions).not.toContain("approve_document");
    expect(body.permissions).not.toContain("manage_roles");
  });
});
