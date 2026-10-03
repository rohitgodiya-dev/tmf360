// Part 1e: AI and export routes must not be usable without a login (cost abuse, data exposure).
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Fixtures, apiRequest, type TestUser } from "./fixtures";

// The routes create Anthropic clients at import; no real calls are made in these tests.
process.env.ANTHROPIC_API_KEY ||= "test-placeholder";

const ROUTES = ["chat", "classify", "trinity/extract-identity", "trinity/inspect", "trinity/validate", "vault/extract", "export/excel", "export/pdf", "export/word"];
const fx = new Fixtures();
let user: TestUser;

beforeAll(async () => {
  const org = await fx.org("ai");
  user = await fx.user("ai-user", { orgId: org, role: "CRA" });
});
afterAll(() => fx.cleanup());

const post = (path: string, body: unknown, token?: string) =>
  apiRequest(path, { method: "POST", token, body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });

describe("guarded routes", () => {
  it.each(ROUTES)("/api/%s refuses anonymous and invalid sessions", async (route) => {
    const { POST } = await import(`@/app/api/${route}/route`);
    expect((await POST(post(`/api/${route}`, {}))).status).toBe(401);
    expect((await POST(post(`/api/${route}`, {}, "not-a-real-token"))).status).toBe(401);
  });

  it("a signed-in user gets past the guard (export builds a file without calling AI)", async () => {
    const { POST } = await import("@/app/api/export/excel/route");
    const res = await POST(post("/api/export/excel", { docs: [], study: { study_id: "X" }, donePct: 0, ri: 0, missing: [], pending: [] }, user.token) as never);
    expect(res.status).not.toBe(401);
  });
});

describe("research360", () => {
  it("anonymous visitors cannot use the AI regulatory mode", async () => {
    const { POST } = await import("@/app/api/research360/route");
    const res = await POST(post("/api/research360", { query: "What does ICH E6 say about the TMF?", mode: "regulatory" }) as never);
    expect(res.status).toBe(401);
  });

  it("anonymous publication search never reaches the AI", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
    try {
      const { POST } = await import("@/app/api/research360/route");
      await POST(post("/api/research360", { query: "what are the regulatory requirements for an IRB?", mode: "publication" }) as never);
      const urls = fetchSpy.mock.calls.map((c) => String(c[0]));
      expect(urls.some((u) => u.includes("anthropic.com"))).toBe(false);
    } finally {
      fetchSpy.mockRestore();
    }
  });
});
