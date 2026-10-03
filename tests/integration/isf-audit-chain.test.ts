// Site360 ISF audit trail: hash-chained, server-stamped, append-only.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Fixtures, admin, type TestUser } from "./fixtures";

const fx = new Fixtures();
let siteOrg: string;
let otherOrg: string;
let siteId: string;
let coordinator: TestUser;
let firstId: string;

beforeAll(async () => {
  siteOrg = await fx.org("isfa", "Site");
  otherOrg = await fx.org("isfa-other", "Site");
  coordinator = await fx.user("isfa-coord", { orgId: siteOrg, role: "Site Coordinator" });
  const { data, error } = await admin().from("sites").insert([{ org_id: siteOrg, site_name: `test-${fx.runId}` }]).select("id").single();
  if (error) throw error;
  siteId = data.id;
});
afterAll(async () => {
  await admin().from("isf_audit_trail").delete().in("org_id", [siteOrg, otherOrg]);
  await admin().from("sites").delete().eq("id", siteId);
  await fx.cleanup();
});

const entry = (action: string, extra: Record<string, unknown> = {}) => ({
  org_id: siteOrg, site_id: siteId, action, actor_id: coordinator.id, actor_email: coordinator.email, ...extra,
});

async function chain() {
  const { data, error } = await admin().rpc("verify_isf_audit_chain", { p_org_id: siteOrg });
  if (error) throw error;
  return data as { row_sequence_no: number; is_valid: boolean }[];
}

describe("isf_audit_trail", () => {
  it("chains entries and stamps time and actor from the server", async () => {
    const a = await coordinator.db.from("isf_audit_trail")
      .insert([entry("UPLOAD", { actor_email: "someone-else@example.test", created_at: "2000-01-01T00:00:00Z" })])
      .select("*").single();
    expect(a.error).toBeNull();
    firstId = a.data!.id;
    expect(a.data!.prev_hash).toBe("GENESIS");
    expect(a.data!.record_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(a.data!.actor_email).toBe(coordinator.email);
    expect(Math.abs(Date.now() - Date.parse(a.data!.created_at))).toBeLessThan(60_000);

    const b = await coordinator.db.from("isf_audit_trail").insert([entry("APPROVE")]).select("*").single();
    expect(b.data!.prev_hash).toBe(a.data!.record_hash);
    expect(await chain()).toEqual([
      { row_sequence_no: a.data!.sequence_no, is_valid: true },
      { row_sequence_no: b.data!.sequence_no, is_valid: true },
    ]);
  });

  it("cannot be edited or deleted by users", async () => {
    await coordinator.db.from("isf_audit_trail").update({ action: "NOTHING HAPPENED" }).eq("id", firstId);
    await coordinator.db.from("isf_audit_trail").delete().eq("id", firstId);
    const { data } = await admin().from("isf_audit_trail").select("action").eq("id", firstId).single();
    expect(data!.action).toBe("UPLOAD");
  });

  it("refuses edits even with full database access, so the chain stays valid", async () => {
    const { error } = await admin().from("isf_audit_trail").update({ action: "tampered" }).eq("id", firstId);
    expect(error).not.toBeNull();
    expect((await chain()).every((r) => r.is_valid)).toBe(true);
  });

  it("refuses entries for another organisation", async () => {
    const { error } = await coordinator.db.from("isf_audit_trail").insert([entry("UPLOAD", { org_id: otherOrg, site_id: null })]);
    expect(error).not.toBeNull();
  });
});
