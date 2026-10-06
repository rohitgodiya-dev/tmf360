// Part 14e: intake email per study (STG-02) and sender allow-list (STG-03), through the signed webhook.
import { createHmac } from "node:crypto";
import { PDFDocument } from "pdf-lib";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as inbound from "@/app/api/inbound/email/route";
import * as settings from "@/app/api/v1/studies/[studyId]/intake-email/route";
import { Fixtures, admin, call, type TestUser } from "./fixtures";

const fx = new Fixtures();
let org: string;
let lead: TestUser, cra: TestUser;
let study: { id: string; code: string };
let alias: string;
const SECRET = "test-inbound-secret";
const DOMAIN = "in.example.test";

function post(payload: unknown, opts: { secret?: string; ts?: number } = {}) {
  const raw = JSON.stringify(payload);
  const ts = String(opts.ts ?? Math.floor(Date.now() / 1000));
  const sig = createHmac("sha256", opts.secret ?? SECRET).update(`${ts}.${raw}`).digest("hex");
  return inbound.POST(new Request("http://localhost/api/inbound/email", { method: "POST", body: raw, headers: { "x-tmf360-timestamp": ts, "x-tmf360-signature": `sha256=${sig}` } }));
}
async function pdfB64() {
  const d = await PDFDocument.create(); d.addPage([200, 200]);
  return Buffer.from(await d.save()).toString("base64");
}
const set = (body: Record<string, unknown>, u: TestUser = lead) => call(settings.POST, { token: u.token, method: "POST", params: { studyId: study.id }, body });

beforeAll(async () => {
  process.env.INBOUND_EMAIL_DOMAIN = DOMAIN;
  process.env.INBOUND_EMAIL_SECRET = SECRET;
  org = await fx.org("mail");
  lead = await fx.user("mail-lead", { orgId: org, role: "TMF Lead" });
  cra = await fx.user("mail-cra", { orgId: org, role: "CRA" });
  study = await fx.study(org, "MAIL");
  await fx.member(org, study.code, cra, "CRA");
  alias = `mail-${fx.runId}`.toLowerCase().slice(0, 30);
});

afterAll(async () => {
  const { data } = await admin().from("intake_items").select("file_path").eq("org_id", org);
  const paths = (data ?? []).map((i) => i.file_path).filter(Boolean) as string[];
  if (paths.length) await admin().storage.from("Documents").remove(paths);
  await admin().from("intake_items").delete().eq("org_id", org);
  await fx.cleanup();
});

describe("intake email (STG-02/03)", () => {
  it("leads set the address and allow-list (with reasons); a CRA cannot", async () => {
    expect((await set({ action: "set_address", alias, enabled: true, reason: "x" })).status).toBe(400);
    expect((await set({ action: "set_address", alias, enabled: true, reason: "Study inbox" }, cra)).status).toBe(403);
    expect((await set({ action: "set_address", alias, enabled: true, reason: "Study inbox" })).status).toBe(200);
    expect((await set({ action: "add_sender", sender: "site101.example.org", reason: "Site 101 staff" })).status).toBe(200);
    expect((await set({ action: "add_sender", sender: "cro.lead@vendor.example.com", reason: "CRO lead" })).status).toBe(200);
    const v = await call(settings.GET, { token: cra.token, params: { studyId: study.id } });
    expect(v.body).toMatchObject({ configured: true, address: { alias, enabled: true, email: `${alias}@${DOMAIN}` } });
    expect(v.body.senders.map((s: { sender: string }) => s.sender).sort()).toEqual(["cro.lead@vendor.example.com", "site101.example.org"]);
  });

  it("refuses unsigned, wrongly signed and stale calls", async () => {
    expect((await inbound.POST(new Request("http://x", { method: "POST", body: "{}" }))).status).toBe(401);
    expect((await post({ to: `${alias}@${DOMAIN}`, from: "a@b.co" }, { secret: "wrong" })).status).toBe(401);
    expect((await post({ to: `${alias}@${DOMAIN}`, from: "a@b.co" }, { ts: Math.floor(Date.now() / 1000) - 3600 })).status).toBe(401);
  });

  it("an allowed sender's attachments become intake items with sender, subject and received date", async () => {
    const r = await post({ message_id: `m1-${fx.runId}`, to: [`TMF <${alias}@${DOMAIN}>`], from: "Dr Lee <dr.lee@site101.example.org>", subject: "Signed CV",
      attachments: [{ filename: "cv-lee.pdf", content_type: "application/pdf", content_base64: await pdfB64() }, { filename: "virus.exe", content_base64: "AAAA" }] });
    const body = await r.json();
    expect(body.results[0]).toMatchObject({ status: "accepted", items: 1 });
    expect(body.results[0].reason).toMatch(/virus\.exe: file type not accepted/);
    const { data } = await admin().from("intake_items").select("source, email_from, email_subject, email_received_at, verification_status, status").eq("org_id", org);
    expect(data).toHaveLength(1);
    expect(data![0]).toMatchObject({ source: "email", email_from: "dr.lee@site101.example.org", email_subject: "Signed CV", verification_status: "verified", status: "received" });
  });

  it("the same message is processed once", async () => {
    const r = await post({ message_id: `m1-${fx.runId}`, to: `${alias}@${DOMAIN}`, from: "dr.lee@site101.example.org", attachments: [] });
    expect((await r.json()).results[0].status).toBe("duplicate");
  });

  it("refuses a sender not on the allow-list and logs it", async () => {
    const r = await post({ message_id: `m2-${fx.runId}`, to: `${alias}@${DOMAIN}`, from: "someone@elsewhere.example.net", subject: "Docs",
      attachments: [{ filename: "x.pdf", content_base64: await pdfB64() }] });
    expect((await r.json()).results[0]).toMatchObject({ status: "refused" });
    const v = await call(settings.GET, { token: lead.token, params: { studyId: study.id } });
    expect(v.body.log.map((l: { status: string }) => l.status).sort()).toEqual(["accepted", "refused"]);
    const { count } = await admin().from("intake_items").select("id", { count: "exact", head: true }).eq("org_id", org);
    expect(count).toBe(1);
  });

  it("a switched-off address ignores mail; users can't forge an emailed item", async () => {
    await set({ action: "set_address", alias, enabled: false, reason: "Pause" });
    const r = await post({ to: `${alias}@${DOMAIN}`, from: "dr.lee@site101.example.org", attachments: [{ filename: "y.pdf", content_base64: await pdfB64() }] });
    expect((await r.json()).results[0].status).toBe("ignored");
    const { data: item } = await lead.db.from("intake_items").insert([{ study_id: study.id, file_path: `${org}/${study.code}/${"d".repeat(64)}.pdf`, file_name: "f.pdf", file_hash: "d".repeat(64), source: "email", email_from: "forged@x.com" }]).select("source, email_from").single();
    expect(item).toMatchObject({ source: "upload", email_from: null });
  });
});
