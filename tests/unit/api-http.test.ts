import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ApiError, errorResponse, forbidden, handle, invalidRequest, notFound, parseBody, unauthenticated } from "@/lib/api/http";
import { bearerToken } from "@/lib/api/auth";

describe("errorResponse", () => {
  it.each([
    [unauthenticated(), 401, "unauthenticated"],
    [forbidden(), 403, "forbidden"],
    [notFound(), 404, "not_found"],
    [invalidRequest("bad"), 400, "invalid_request"],
  ])("maps %o to status %i", async (err, status, code) => {
    const res = errorResponse(err);
    expect(res.status).toBe(status);
    expect((await res.json()).error.code).toBe(code);
  });

  it("hides internal error details", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = errorResponse(new Error("select * from secret_table failed"));
    const body = await res.json();
    expect(res.status).toBe(500);
    expect(body).toEqual({ error: { code: "internal", message: "Something went wrong" } });
    spy.mockRestore();
  });

  it("includes details only when given", async () => {
    expect((await errorResponse(invalidRequest("bad")).json()).error).not.toHaveProperty("details");
    expect((await errorResponse(invalidRequest("bad", [1])).json()).error.details).toEqual([1]);
  });
});

describe("handle", () => {
  it("passes successful responses through", async () => {
    const route = handle(async () => Response.json({ ok: true }));
    expect(await (await route()).json()).toEqual({ ok: true });
  });

  it("turns thrown ApiErrors into responses", async () => {
    const route = handle(async () => { throw new ApiError("conflict", "already exists"); });
    const res = await route();
    expect(res.status).toBe(409);
    expect((await res.json()).error.message).toBe("already exists");
  });
});

describe("parseBody", () => {
  const schema = z.object({ name: z.string().min(1) });
  const req = (body: string) => new Request("http://x", { method: "POST", body });

  it("returns validated data", async () => {
    expect(await parseBody(req('{"name":"Study A"}'), schema)).toEqual({ name: "Study A" });
  });

  it("rejects malformed JSON with 400", async () => {
    await expect(parseBody(req("{oops"), schema)).rejects.toMatchObject({ code: "invalid_request" });
  });

  it("reports which field failed", async () => {
    await expect(parseBody(req('{"name":""}'), schema)).rejects.toMatchObject({
      code: "invalid_request",
      details: [expect.objectContaining({ path: "name" })],
    });
  });
});

describe("bearerToken", () => {
  const withAuth = (value?: string) =>
    new Request("http://x", value ? { headers: { Authorization: value } } : undefined);

  it("reads a bearer token", () => expect(bearerToken(withAuth("Bearer abc.def"))).toBe("abc.def"));
  it("is case-insensitive about the scheme", () => expect(bearerToken(withAuth("bearer abc"))).toBe("abc"));
  it("returns null without a header", () => expect(bearerToken(withAuth())).toBeNull());
  it("returns null for other schemes", () => expect(bearerToken(withAuth("Basic abc"))).toBeNull());
});
