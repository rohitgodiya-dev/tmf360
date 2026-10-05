// Part 11a: Inspection Mode (M19 INS-01..09). The scope functions are the authorisation boundary for
// inspectors, so most tests here try to reach something outside it.
import { PDFDocument } from "pdf-lib";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as sessions from "@/app/api/v1/studies/[studyId]/inspections/route";
import * as live from "@/app/api/v1/inspections/[sessionId]/route";
import * as change from "@/app/api/v1/inspections/[sessionId]/change/route";
import * as log from "@/app/api/v1/inspections/[sessionId]/log/route";
import * as respond from "@/app/api/v1/inspection-requests/[requestId]/respond/route";
import * as login from "@/app/api/v1/inspect/session/route";
import * as docs from "@/app/api/v1/inspect/documents/route";
import * as doc from "@/app/api/v1/inspect/documents/[documentId]/route";
import * as file from "@/app/api/v1/inspect/documents/[documentId]/file/route";
import * as versions from "@/app/api/v1/inspect/documents/[documentId]/versions/route";
import * as audit from "@/app/api/v1/inspect/documents/[documentId]/audit/route";
import * as activity from "@/app/api/v1/inspect/activity/route";
import * as requests from "@/app/api/v1/inspect/requests/route";
import { Fixtures, admin, call, type TestUser } from "./fixtures";

const fx = new Fixtures();
let org: string;
let lead: TestUser, cra: TestUser, outsider: TestUser;
let study: { id: string; code: string };
let other: { id: string; code: string };
let site101: string, site201: string;
const d: Record<string, string> = {};
const paths: string[] = [];

type Secrets = { id: string; token: string; code: string };
type InspectHandler = (req: Request, ctx: { params: Promise<any> }) => Promise<Response>; // eslint-disable-line @typescript-eslint/no-explicit-any

async function inspect(h: InspectHandler, s: Pick<Secrets, "token" | "code">, opts: { method?: string; body?: unknown; params?: Record<string, string>; query?: string } = {}) {
  const headers = new Headers({ "x-inspection-token": s.token, "x-inspection-code": s.code });
  if (opts.body !== undefined) headers.set("Content-Type", "application/json");
  const res = await h(new Request(`http://localhost/api/v1/inspect${opts.query ?? ""}`, { method: opts.method ?? "GET", headers, body: opts.body === undefined ? undefined : JSON.stringify(opts.body) }),
    { params: Promise.resolve(opts.params ?? {}) });
  return { status: res.status, body: res.status === 204 ? null : await res.json() };
}

async function create(body: Record<string, unknown>, u: TestUser = lead): Promise<Secrets> {
  const r = await call(sessions.POST, { token: u.token, method: "POST", params: { studyId: study.id }, body: {
    inspector_name: "Dr Ines Pector", inspector_org: "MHRA", purpose: "GCP inspection", ends_at: new Date(Date.now() + 3 * 86400000).toISOString(), ...body,
  } });
  expect(r.status, JSON.stringify(r.body)).toBe(201);
  return { id: r.body.id, token: new URL(r.body.link).hash.slice(3), code: r.body.access_code };
}

async function seedDoc(key: string, fields: Record<string, unknown>, studyCode = study.code) {
  const { data, error } = await admin().from("documents").insert([{
    org_id: org, user_id: lead.id, study_id: studyCode, status: "Approved", approved_at: new Date().toISOString(), approved_by: "seed@example.test",
    artifact_num: "01.01.01", artifact_name: "Trial Master File Plan", custom_file_name: key, ...fields,
  }]).select("id").single();
  if (error) throw error;
  d[key] = data.id;
}

const ids = (rows: { id: string }[]) => rows.map((r) => r.id).sort();

beforeAll(async () => {
  org = await fx.org("ins");
  lead = await fx.user("ins-lead", { orgId: org, role: "TMF Lead" });
  cra = await fx.user("ins-cra", { orgId: org, role: "CRA" });
  outsider = await fx.user("ins-out", { orgId: await fx.org("ins-b"), role: "System Administrator" });
  study = await fx.study(org, "INS");
  other = await fx.study(org, "INS2");
  await fx.member(org, study.code, cra, "CRA");
  const a = admin();
  const { data: party } = await a.from("parties").insert([{ org_id: org, party_type: "site", name: `Site ${fx.runId}` }]).select("id").single();
  const us = (await a.from("study_countries").insert([{ org_id: org, study_id: study.id, country_code: "US" }]).select("id").single()).data!.id;
  const gb = (await a.from("study_countries").insert([{ org_id: org, study_id: study.id, country_code: "GB" }]).select("id").single()).data!.id;
  site101 = (await a.from("study_sites").insert([{ org_id: org, study_id: study.id, study_country_id: us, site_number: "101", site_party_id: party!.id, display_name: "Boston", status: "ongoing" }]).select("id").single()).data!.id;
  site201 = (await a.from("study_sites").insert([{ org_id: org, study_id: study.id, study_country_id: gb, site_number: "201", site_party_id: party!.id, display_name: "Leeds", status: "ongoing" }]).select("id").single()).data!.id;

  // A real PDF so viewing and watermarking can be checked end to end.
  const pdf = await PDFDocument.create();
  pdf.addPage([300, 400]).drawText("Trial Master File Plan", { x: 30, y: 350, size: 14 });
  const bytes = await pdf.save();
  const path = `${org}/${fx.runId}/tmf-plan.pdf`;
  const up = await a.storage.from("Documents").upload(path, bytes, { contentType: "application/pdf" });
  if (up.error) throw up.error;
  paths.push(path);

  await seedDoc("final", { file_path: path, file_name: "tmf-plan.pdf", file_type: "application/pdf" });
  await seedDoc("site101", { artifact_num: "05.02.01", artifact_name: "Site Signature Sheet", study_site_id: site101 });
  await seedDoc("site201", { artifact_num: "05.02.01", artifact_name: "Site Signature Sheet", study_site_id: site201 });
  await seedDoc("draft", { status: "Draft", approved_at: null, approved_by: null, artifact_num: "01.01.02", artifact_name: "Trial Management Plan" });
  await seedDoc("deleted", { deleted_at: new Date().toISOString(), deletion_reason: "test" });
  await seedDoc("otherStudy", {}, other.code);
});

afterAll(async () => {
  await admin().storage.from("Documents").remove(paths);
  await admin().from("documents").delete().eq("org_id", org);
  await fx.cleanup();
});

describe("creating sessions (INS-01)", () => {
  it("needs invite_users; a CRA cannot create a session", async () => {
    const r = await call(sessions.POST, { token: cra.token, method: "POST", params: { studyId: study.id }, body: {
      inspector_name: "X Y", inspector_org: "FDA", purpose: "test", ends_at: new Date(Date.now() + 86400000).toISOString() } });
    expect(r.status).toBe(403);
  });

  it("another organisation cannot see the study's sessions", async () => {
    await create({});
    const r = await call(sessions.GET, { token: outsider.token, params: { studyId: study.id } });
    expect(r.status).toBe(404);
  });

  it("returns the link and code once and stores only hashes, unreadable to users", async () => {
    const s = await create({});
    expect(s.token.length).toBeGreaterThan(30);
    expect(s.code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    const { data } = await admin().from("inspection_session_secrets").select("token_hash, code_hash").eq("session_id", s.id).single();
    expect(data!.token_hash).not.toContain(s.token);
    expect(data!.token_hash).toMatch(/^[0-9a-f]{64}$/);
    const { data: leaked } = await lead.db.from("inspection_session_secrets").select("*");
    expect(leaked ?? []).toEqual([]);
    const list = await call(sessions.GET, { token: lead.token, params: { studyId: study.id } });
    expect(list.body.data.find((x: { id: string }) => x.id === s.id)).toMatchObject({ state: "active", ai_enabled: false, scope_statuses: ["Approved"] });
  });

  it("rejects scope ids from another study and AI being switched on", async () => {
    const { error } = await lead.db.rpc("create_inspection_session", {
      p: { study_id: study.id, inspector_name: "A B", inspector_org: "EMA", purpose: "x x x", ends_at: new Date(Date.now() + 86400000).toISOString(), scope_sites: [crypto.randomUUID()] },
      p_token_hash: "a".repeat(64), p_code_hash: "b".repeat(64),
    });
    expect(error?.message).toMatch(/not part of this study/);
    const { error: ai } = await admin().from("inspection_sessions").update({ ai_enabled: true }).eq("study_id", study.id);
    expect(ai).toBeTruthy();
  });
});

describe("inspector access and scope (INS-02/03)", () => {
  let s: Secrets;
  beforeAll(async () => { s = await create({}); });

  it("a wrong access code is refused and logged; the right one signs in", async () => {
    const bad = await inspect(login.POST, { token: s.token, code: "AAAA-AAAA" }, { method: "POST" });
    expect(bad.status).toBe(401);
    expect(bad.body.error.message).toMatch(/access code is not correct/);
    const ok = await inspect(login.POST, { token: s.token, code: s.code.toLowerCase().replace("-", "") }, { method: "POST" });
    expect(ok.status).toBe(200);
    expect(ok.body.session).toMatchObject({ inspector_name: "Dr Ines Pector", download_mode: "view_only", ai_enabled: false });
    expect(ok.body.study.code).toBe(study.code);
    const { data } = await admin().from("inspection_activity").select("kind").eq("session_id", s.id).order("at");
    expect(data!.map((x) => x.kind)).toEqual(["failed_code", "login"]);
  });

  it("an unknown link is refused", async () => {
    const r = await inspect(docs.GET, { token: "x".repeat(43), code: s.code });
    expect(r.status).toBe(401);
  });

  it("by default lists only current Final documents of this study", async () => {
    const r = await inspect(docs.GET, s);
    expect(r.status).toBe(200);
    expect(ids(r.body.data)).toEqual([d.final, d.site101, d.site201].sort());
  });

  it("documents outside the scope are not found, through every endpoint", async () => {
    for (const key of ["draft", "deleted", "otherStudy"]) {
      expect((await inspect(doc.GET, s, { params: { documentId: d[key] } })).status).toBe(404);
      expect((await inspect(file.POST, s, { method: "POST", body: { purpose: "view" }, params: { documentId: d[key] } })).status).toBe(404);
    }
    expect((await inspect(activity.POST, s, { method: "POST", body: { document_id: d.draft, page: 1, seconds: 5 } })).status).toBe(404);
  });

  it("narrows by site, country and taxonomy node", async () => {
    const bySite = await create({ scope_sites: [site101] });
    expect(ids((await inspect(docs.GET, bySite)).body.data)).toEqual([d.site101]);
    const { data: gb } = await admin().from("study_countries").select("id").eq("study_id", study.id).eq("country_code", "GB").single();
    const byCountry = await create({ scope_countries: [gb!.id] });
    expect(ids((await inspect(docs.GET, byCountry)).body.data)).toEqual([d.site201]);
    const byNode = await create({ scope_nodes: ["01"] });
    expect(ids((await inspect(docs.GET, byNode)).body.data)).toEqual([d.final]);
    const withDrafts = await create({ scope_nodes: ["01.01"], scope_statuses: ["Approved", "Draft"] });
    expect(ids((await inspect(docs.GET, withDrafts)).body.data)).toEqual([d.final, d.draft].sort());
  });

  it("logs searches, views and page view time (INS-08)", async () => {
    const r = await inspect(docs.GET, s, { query: "?q=signature" });
    expect(r.body.data).toHaveLength(2);
    expect((await inspect(doc.GET, s, { params: { documentId: d.final } })).body).toMatchObject({ status: "Final", has_file: true });
    expect((await inspect(activity.POST, s, { method: "POST", body: { document_id: d.final, page: 1, seconds: 12 } })).status).toBe(204);
    const { data } = await admin().from("inspection_activity").select("kind, detail, document_id").eq("session_id", s.id).order("at");
    expect(data!.slice(-3)).toEqual([
      { kind: "search", detail: { query: "signature", results: 2 }, document_id: null },
      { kind: "view", detail: { artifact_num: "01.01.01" }, document_id: d.final },
      { kind: "page_view", detail: { page: 1, seconds: 12 }, document_id: d.final },
    ]);
  });

  it("the activity log is append-only", async () => {
    const { error } = await admin().from("inspection_activity").update({ kind: "view" }).eq("session_id", s.id);
    expect(error?.message).toMatch(/append-only/);
  });
});

describe("downloads, versions and audit trail (INS-02/06)", () => {
  it("view only: viewing works, download and print are refused", async () => {
    const s = await create({});
    const view = await inspect(file.POST, s, { method: "POST", body: { purpose: "view" }, params: { documentId: d.final } });
    expect(view.status).toBe(200);
    expect((await fetch(view.body.url)).status).toBe(200);
    for (const purpose of ["download", "print"]) {
      expect((await inspect(file.POST, s, { method: "POST", body: { purpose }, params: { documentId: d.final } })).status).toBe(403);
    }
  });

  it("watermark: the download is a stamped copy and is logged", async () => {
    const s = await create({ download_mode: "watermark" });
    const r = await inspect(file.POST, s, { method: "POST", body: { purpose: "download" }, params: { documentId: d.final } });
    expect(r.status).toBe(200);
    expect(r.body.watermarked).toBe(true);
    const copy = await PDFDocument.load(await (await fetch(r.body.url)).arrayBuffer(), { updateMetadata: false });
    expect(copy.getProducer()).toBe("TMF360 Inspection Mode");
    expect(copy.getPageCount()).toBe(1);
    const { data } = await admin().from("inspection_activity").select("kind, detail").eq("session_id", s.id).eq("kind", "download");
    expect(data).toEqual([{ kind: "download", detail: { version_no: null, watermarked: true } }]);
  });

  it("version history and audit trail only when the session includes them", async () => {
    const off = await create({});
    expect((await inspect(versions.GET, off, { params: { documentId: d.final } })).status).toBe(404);
    expect((await inspect(audit.GET, off, { params: { documentId: d.final } })).status).toBe(404);
    const on = await create({ include_versions: true, include_audit: true });
    const v = await inspect(versions.GET, on, { params: { documentId: d.final } });
    expect(v.status).toBe(200);
    expect(v.body.data[0]).toMatchObject({ version_no: 1, file_name: "tmf-plan.pdf" });
    const a = await inspect(audit.GET, on, { params: { documentId: d.final } });
    expect(a.status).toBe(200);
    expect(Array.isArray(a.body.data)).toBe(true);
  });
});

describe("request queue (INS-07) and live view (INS-09)", () => {
  it("the inspector asks, the study team answers and extends the scope", async () => {
    const s = await create({});
    const made = await inspect(requests.POST, s, { method: "POST", body: { kind: "out_of_scope", subject: "Please provide the draft management plan" } });
    expect(made.status).toBe(201);
    const view = await call(live.GET, { token: lead.token, params: { sessionId: s.id } });
    expect(view.body.requests).toHaveLength(1);
    expect(view.body.activity[0].kind).toBe("request");

    const ans = await call(respond.POST, { token: lead.token, method: "POST", params: { requestId: made.body.id },
      body: { response: "Attached the draft.", document_id: d.draft, extend_scope: true, close: true } });
    expect(ans.status).toBe(200);
    const mine = await inspect(requests.GET, s);
    expect(mine.body.data[0]).toMatchObject({ status: "closed", response: "Attached the draft.", response_document_id: d.draft });
    const list = await inspect(docs.GET, s);
    expect(list.body.data.find((x: { id: string }) => x.id === d.draft)).toMatchObject({ extra: true });

    const again = await call(respond.POST, { token: lead.token, method: "POST", params: { requestId: made.body.id }, body: { response: "More" } });
    expect(again.status).toBe(400);
  });

  it("an answer cannot attach a document from another study", async () => {
    const s = await create({});
    const made = await inspect(requests.POST, s, { method: "POST", body: { kind: "document", subject: "Need the plan" } });
    const r = await call(respond.POST, { token: lead.token, method: "POST", params: { requestId: made.body.id }, body: { response: "Here", document_id: d.otherStudy, extend_scope: true } });
    expect(r.status).toBe(400);
  });

  it("the inspection log exports as Excel and is audited", async () => {
    const s = await create({});
    await inspect(login.POST, s, { method: "POST" });
    const res = await log.GET(new Request("http://localhost/x", { headers: { Authorization: `Bearer ${lead.token}` } }), { params: Promise.resolve({ sessionId: s.id }) });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/spreadsheetml/);
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect(String.fromCharCode(bytes[0], bytes[1])).toBe("PK");
    const { data } = await admin().from("audit_trail").select("action").eq("org_id", org).eq("action", "Inspection log exported");
    expect(data!.length).toBeGreaterThan(0);
  });
});

describe("access always expires (INS-01 business rule)", () => {
  it("ending a session signs the inspector out; the change is audited with its reason", async () => {
    const s = await create({});
    expect((await inspect(docs.GET, s)).status).toBe(200);
    const bad = await call(change.POST, { token: lead.token, method: "POST", params: { sessionId: s.id }, body: { action: "revoke", reason: "x" } });
    expect(bad.status).toBe(400);
    const r = await call(change.POST, { token: lead.token, method: "POST", params: { sessionId: s.id }, body: { action: "revoke", reason: "Inspection closed early" } });
    expect(r.status).toBe(200);
    const after = await inspect(docs.GET, s);
    expect(after.status).toBe(401);
    expect(after.body.error.message).toMatch(/ended by the study team/);
    const { data } = await admin().from("audit_trail").select("action, signature_reason").eq("org_id", org).eq("action", "inspection_sessions.update");
    expect(data!.some((x) => x.signature_reason === "Inspection closed early")).toBe(true);
  });

  it("an expired session is refused", async () => {
    const s = await create({});
    await admin().from("inspection_sessions").update({ starts_at: new Date(Date.now() - 2 * 86400000).toISOString(), ends_at: new Date(Date.now() - 60000).toISOString() }).eq("id", s.id);
    const r = await inspect(docs.GET, s);
    expect(r.status).toBe(401);
    expect(r.body.error.message).toMatch(/expired/);
  });

  it("ten wrong codes lock the session until the study team extends it", async () => {
    const s = await create({});
    for (let i = 0; i < 10; i++) await inspect(login.POST, { token: s.token, code: "ZZZZ-ZZZZ" }, { method: "POST" });
    const locked = await inspect(login.POST, s, { method: "POST" });
    expect(locked.status).toBe(401);
    expect(locked.body.error.message).toMatch(/locked/);
    const ext = await call(change.POST, { token: lead.token, method: "POST", params: { sessionId: s.id },
      body: { action: "set_end", ends_at: new Date(Date.now() + 5 * 86400000).toISOString(), reason: "Unlock after typo" } });
    expect(ext.status).toBe(200);
    expect((await inspect(login.POST, s, { method: "POST" })).status).toBe(200);
  });

  it("a CRA cannot end or extend a session", async () => {
    const s = await create({});
    const r = await call(change.POST, { token: cra.token, method: "POST", params: { sessionId: s.id }, body: { action: "revoke", reason: "Not allowed" } });
    expect(r.status).toBe(403);
  });
});
