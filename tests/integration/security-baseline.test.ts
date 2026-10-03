// Regression tests for the Part 1 security fixes. If any of these fail, a
// database change has reopened access that was deliberately closed.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Fixtures, anonClient, type TestUser } from "./fixtures";

const fx = new Fixtures();
let orgA: string;
let userA: TestUser;
let userB: TestUser;
let docA: string;

beforeAll(async () => {
  orgA = await fx.org("a");
  const orgB = await fx.org("b");
  userA = await fx.user("a", { orgId: orgA, role: "System Administrator" });
  userB = await fx.user("b", { orgId: orgB, role: "System Administrator" });
  docA = await fx.document({ orgId: orgA, userId: userA.id, studyId: `S-${fx.runId}`, title: "Org A protocol" });
});
afterAll(() => fx.cleanup());

describe("documents: organisation isolation", () => {
  it("the owning org can read its document", async () => {
    const { data } = await userA.db.from("documents").select("id").eq("id", docA);
    expect(data).toHaveLength(1);
  });

  it("another org cannot see it", async () => {
    const { data } = await userB.db.from("documents").select("id").eq("id", docA);
    expect(data).toHaveLength(0);
  });

  it("anonymous visitors see no documents", async () => {
    const { data } = await anonClient().from("documents").select("id");
    expect(data ?? []).toHaveLength(0);
  });

  it("nobody can hard-delete a document, even its own org", async () => {
    await userA.db.from("documents").delete().eq("id", docA);
    const { data } = await userA.db.from("documents").select("id").eq("id", docA);
    expect(data).toHaveLength(1);
  });
});

describe("audit trail: append-only", () => {
  let auditId: string;

  beforeAll(async () => {
    const { data, error } = await userA.db.from("audit_trail").insert([{
      user_id: userA.id, user_email: userA.email, action: "integration test entry", study_id: `S-${fx.runId}`,
    }]).select("id").single();
    if (error) throw error;
    auditId = data.id;
  });

  it("a user can write their own audit entry, and it is hash-chained", async () => {
    const { data } = await userA.db.from("audit_trail").select("org_id, record_hash").eq("id", auditId).single();
    expect(data?.org_id).toBe(orgA);
    expect(data?.record_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("a user cannot write an entry in someone else's name", async () => {
    const { error } = await userA.db.from("audit_trail").insert([{ user_id: userB.id, action: "forged" }]);
    expect(error).not.toBeNull();
  });

  it("entries cannot be edited", async () => {
    await userA.db.from("audit_trail").update({ action: "tampered" }).eq("id", auditId);
    const { data } = await userA.db.from("audit_trail").select("action").eq("id", auditId).single();
    expect(data?.action).toBe("integration test entry");
  });

  it("entries cannot be deleted", async () => {
    await userA.db.from("audit_trail").delete().eq("id", auditId);
    const { data } = await userA.db.from("audit_trail").select("id").eq("id", auditId);
    expect(data).toHaveLength(1);
  });
});

describe("storage: files are private", () => {
  // A real file is needed: on an empty bucket "cannot list" would pass even if access were open.
  let probeFolder: string;
  let probePath: string;

  beforeAll(async () => {
    probeFolder = `${orgA}/S-${fx.runId}`;
    probePath = `${probeFolder}/probe.txt`;
    const { error } = await userA.db.storage.from("Documents").upload(probePath, new Blob(["probe"]));
    if (error) throw error;
    fx.trackFile("Documents", probePath);
  });

  it("the uploader can download their file", async () => {
    const { data, error } = await userA.db.storage.from("Documents").download(probePath);
    expect(error).toBeNull();
    expect(await data?.text()).toBe("probe");
  });

  it("anonymous visitors cannot list or download it", async () => {
    const { data: listed } = await anonClient().storage.from("Documents").list(probeFolder);
    expect(listed ?? []).toHaveLength(0);
    const { error } = await anonClient().storage.from("Documents").download(probePath);
    expect(error).not.toBeNull();
  });

  it("another org cannot list or download it", async () => {
    const { data: listed } = await userB.db.storage.from("Documents").list(probeFolder);
    expect(listed ?? []).toHaveLength(0);
    const { error } = await userB.db.storage.from("Documents").download(probePath);
    expect(error).not.toBeNull();
  });

  it.each(["Documents", "isf-documents", "participant-resources"])("anonymous cannot upload to %s", async (bucket) => {
    const path = `anon-${fx.runId}.txt`;
    const { error } = await anonClient().storage.from(bucket).upload(path, new Blob(["x"]));
    if (!error) fx.trackFile(bucket, path);
    expect(error).not.toBeNull();
  });

  it("a user cannot upload into another org's folder", async () => {
    const path = `${orgA}/x/${fx.runId}.txt`;
    const { error } = await userB.db.storage.from("Documents").upload(path, new Blob(["x"]));
    if (!error) fx.trackFile("Documents", path);
    expect(error).not.toBeNull();
  });
});
