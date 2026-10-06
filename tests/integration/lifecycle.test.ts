// Part 18: study lifecycle (Planning → Startup → Active → Closeout → Closed → Archived) and study banners. (ENT-09, ENT-10)
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as lifecycle from "@/app/api/v1/studies/[studyId]/lifecycle/route";
import * as banner from "@/app/api/v1/studies/[studyId]/banner/route";
import * as reopen from "@/app/api/v1/studies/[studyId]/reopen/route";
import { Fixtures, admin, call, type TestUser } from "./fixtures";

const fx = new Fixtures();
let org: string;
let lead: TestUser, cra: TestUser;
let study: { id: string; code: string };
const step = (to: string, extra: Record<string, unknown> = {}, who: TestUser = lead) =>
  call(lifecycle.POST, { token: who.token, method: "POST", params: { studyId: study.id }, body: { to, reason: `Move to ${to}`, ...extra } });

beforeAll(async () => {
  org = await fx.org("life");
  lead = await fx.user("l-lead", { orgId: org, role: "TMF Lead" });
  cra = await fx.user("l-cra", { orgId: org, role: "CRA" });
  study = await fx.study(org, "LIFE");
  await fx.member(org, study.code, cra, "CRA");
});
afterAll(async () => {
  await admin().from("inspection_sessions").delete().eq("study_id", study.id);
  await fx.cleanup();
});

describe("study lifecycle", () => {
  it("a new study starts in its creation status and shows the next steps", async () => {
    const r = await call(lifecycle.GET, { token: cra.token, params: { studyId: study.id } });
    expect(r.status).toBe(200);
    expect(r.body.status).toBe("Startup");
    expect(r.body.next.map((n: { to: string }) => n.to)).toEqual(["Active", "Planning"]);
  });

  it("only administrators and TMF leads change the status", async () => {
    expect((await step("Active", {}, cra)).status).toBe(403);
  });

  it("steps cannot be skipped", async () => {
    const r = await step("Closed", { password: lead.password });
    expect(r.status).toBe(409);
  });

  it("the status cannot be written directly, and only study editors may edit the study record", async () => {
    const { error } = await lead.db.from("studies").update({ lifecycle_status: "Archived" }).eq("id", study.id);
    expect(error?.message).toMatch(/Study lifecycle/);
    const { error: legacy } = await lead.db.from("studies").update({ status: "Closed" }).eq("id", study.id);
    expect(legacy?.message).toMatch(/lifecycle/);
    const { data } = await cra.db.from("studies").update({ protocol: "changed by CRA" }).eq("id", study.id).select("id");
    expect(data ?? []).toHaveLength(0);
  });

  it("moves back and forward with reasons, keeping the history", async () => {
    expect((await step("Planning")).status).toBe(200);
    expect((await step("Startup")).status).toBe(200);
    expect((await step("Active")).status).toBe(200);
    const { data: s } = await admin().from("studies").select("status, lifecycle_status").eq("id", study.id).single();
    expect(s).toEqual({ status: "Active", lifecycle_status: "Active" });
    const r = await call(lifecycle.GET, { token: lead.token, params: { studyId: study.id } });
    expect(r.body.history.map((e: { to_status: string }) => e.to_status)).toEqual(["Active", "Startup", "Planning"]);
    expect(r.body.checks.warnings.length).toBeGreaterThan(0);
  });

  it("close-out warnings must be acknowledged, and are kept with the step", async () => {
    const r = await step("Closeout");
    expect(r.status).toBe(400);
    expect(r.body.error.details.warnings.length).toBeGreaterThan(0);
    expect((await step("Closeout", { acknowledge_warnings: true })).status).toBe(200);
    const { data } = await admin().from("study_lifecycle_events").select("details").eq("study_id", study.id).eq("to_status", "Closeout").single();
    expect(data?.details.checks.warnings.length).toBeGreaterThan(0);
  });

  it("closing is signed and makes the study read-only, with a banner for everyone", async () => {
    expect((await step("Closed", { acknowledge_warnings: true })).status).toBe(400);
    expect((await step("Closed", { acknowledge_warnings: true, password: "wrong" })).status).toBe(400);
    expect((await step("Closed", { acknowledge_warnings: true, password: lead.password })).status).toBe(200);
    const { data: s } = await admin().from("studies").select("closed_at, lifecycle_status").eq("id", study.id).single();
    expect(s?.lifecycle_status).toBe("Closed");
    expect(s?.closed_at).not.toBeNull();
    const { data: ev } = await admin().from("study_lifecycle_events").select("signature_event_id").eq("study_id", study.id).eq("to_status", "Closed");
    expect(ev).toHaveLength(1);
    expect(ev?.[0].signature_event_id).not.toBeNull();
    const b = await call(banner.GET, { token: cra.token, params: { studyId: study.id } });
    expect(b.body).toMatchObject({ lifecycle_status: "Closed", read_only: true, inspection: null });
  });

  it("shows 'inspection in progress' while an inspection session is open", async () => {
    const now = Date.now();
    const { error } = await admin().from("inspection_sessions").insert([{ org_id: org, study_id: study.id, inspector_name: "Ina Spector", inspector_org: "MHRA",
      purpose: "Routine GCP inspection", starts_at: new Date(now - 3600000).toISOString(), ends_at: new Date(now + 3600000).toISOString(), created_by: lead.id }]);
    expect(error).toBeNull();
    const b = await call(banner.GET, { token: cra.token, params: { studyId: study.id } });
    expect(b.body.inspection).toMatchObject({ inspector_org: "MHRA" });
  });

  it("archiving is signed and final: no reopening, no further steps", async () => {
    expect((await step("Archived", { password: lead.password })).status).toBe(200);
    const { data: s } = await admin().from("studies").select("archived_at, lifecycle_status, closed_at").eq("id", study.id).single();
    expect(s?.lifecycle_status).toBe("Archived");
    expect(s?.archived_at).not.toBeNull();
    const re = await call(reopen.POST, { token: lead.token, method: "POST", params: { studyId: study.id }, body: { reason: "Try reopening", password: lead.password } });
    expect(re.status).toBe(400);
    expect(re.body.error.message).toMatch(/archived/);
    expect((await step("Closed", { password: lead.password })).status).toBe(409);
    const r = await call(lifecycle.GET, { token: lead.token, params: { studyId: study.id } });
    expect(r.body.next).toEqual([]);
  });
});
