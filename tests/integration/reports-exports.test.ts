// Part 11b: reports (M13 RPT-02..05), navigator Excel export (EXP-02), ZIP export jobs (EXP-03/04),
// and the database audit of user-management changes.
import { createHash } from "node:crypto";
import JSZip from "jszip";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as catalogue from "@/app/api/v1/studies/[studyId]/reports/route";
import * as report from "@/app/api/v1/studies/[studyId]/reports/[report]/route";
import * as exportsRoute from "@/app/api/v1/studies/[studyId]/exports/route";
import * as download from "@/app/api/v1/exports/[jobId]/download/route";
import * as navExport from "@/app/api/v1/studies/[studyId]/navigator/export/route";
import { Fixtures, admin, apiRequest, call, type TestUser } from "./fixtures";

const fx = new Fixtures();
let org: string;
let admin1: TestUser, lead: TestUser, cra: TestUser, outsider: TestUser;
let study: { id: string; code: string };
const d: Record<string, string> = {};
const paths: string[] = [];
const bytesOf: Record<string, Uint8Array> = {};

async function file(key: string, text: string) {
  const bytes = new TextEncoder().encode(`%PDF-1.4\n% ${text}\n`);
  const path = `${org}/${fx.runId}/${key}.pdf`;
  const up = await admin().storage.from("Documents").upload(path, bytes, { contentType: "application/pdf" });
  if (up.error) throw up.error;
  paths.push(path);
  bytesOf[key] = bytes;
  return { file_path: path, file_name: `${key}.pdf`, file_type: "application/pdf", file_hash: createHash("sha256").update(bytes).digest("hex") };
}

async function seedDoc(key: string, fields: Record<string, unknown>) {
  const { data, error } = await admin().from("documents").insert([{
    org_id: org, user_id: lead.id, study_id: study.code, status: "Approved", approved_at: new Date().toISOString(), approved_by: "seed@example.test",
    custom_file_name: key, ...fields,
  }]).select("id").single();
  if (error) throw error;
  d[key] = data.id;
}

async function runReport(u: TestUser, key: string, query = "") {
  const res = await report.GET(apiRequest(`/x${query}`, { token: u.token }), { params: Promise.resolve({ studyId: study.id, report: key }) });
  return res;
}
async function sheets(res: Response) {
  const zip = await JSZip.loadAsync(await res.arrayBuffer());
  const out: string[] = [];
  for (const name of Object.keys(zip.files).filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))) out.push(await zip.file(name)!.async("string"));
  return out;
}

beforeAll(async () => {
  org = await fx.org("rpt");
  admin1 = await fx.user("rpt-admin", { orgId: org, role: "Sponsor Admin" });
  lead = await fx.user("rpt-lead", { orgId: org, role: "TMF Lead" });
  cra = await fx.user("rpt-cra", { orgId: org, role: "CRA" });
  outsider = await fx.user("rpt-out", { orgId: await fx.org("rpt-b"), role: "System Administrator" });
  study = await fx.study(org, "RPT");
  await fx.member(org, study.code, cra, "CRA");
  await seedDoc("protocol", { artifact_num: "02.01.02", artifact_name: "Protocol", ...(await file("protocol", "protocol v1")) });
  await seedDoc("plan", { artifact_num: "01.01.01", artifact_name: "Trial Master File Plan", expiry_date: new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10), ...(await file("plan", "tmf plan")) });
  await seedDoc("draft", { status: "Draft", approved_at: null, approved_by: null, artifact_num: "01.01.02", artifact_name: "Trial Management Plan", ...(await file("draft", "draft")) });
  // An audited action on a document, for the Document Activities report.
  const { error } = await lead.db.from("audit_trail").insert([{ user_id: lead.id, user_email: lead.email, org_id: org, action: "Document viewed in test", study_id: study.code, document_id: d.protocol, document_name: "protocol" }]);
  if (error) throw error;
});

afterAll(async () => {
  await admin().storage.from("Documents").remove(paths);
  const { data: jobs } = await admin().from("export_jobs").select("file_path").eq("org_id", org);
  const files = (jobs ?? []).map((j) => j.file_path).filter(Boolean) as string[];
  if (files.length) await admin().storage.from("exports").remove(files);
  await admin().from("export_jobs").delete().eq("org_id", org);
  await admin().from("documents").delete().eq("org_id", org);
  await fx.cleanup();
});

describe("user-management audit (RPT-02)", () => {
  it("a role change is written to the audit trail by the database, with old and new values", async () => {
    const { error } = await admin1.db.from("user_roles").update({ role: "Clinical Trial Associate" }).eq("user_id", cra.id).eq("org_id", org);
    expect(error).toBeNull();
    const { data } = await admin().from("audit_trail").select("action, user_id, old_value, new_value, field_changed").eq("org_id", org).eq("action", "User role changed");
    expect(data).toHaveLength(1);
    expect(data![0]).toMatchObject({ user_id: admin1.id, field_changed: `user_roles:${cra.email}` });
    expect(data![0].old_value).toMatch(/^CRA;/);
    expect(data![0].new_value).toMatch(/^Clinical Trial Associate;/);
    await admin().from("user_roles").update({ role: "CRA" }).eq("user_id", cra.id).eq("org_id", org);
  });

  it("study membership changes are audited too", async () => {
    await admin().from("study_members").update({ role: "Monitor" }).eq("user_id", cra.id).eq("study_id", study.code);
    const { data } = await admin().from("audit_trail").select("action, study_id").eq("org_id", org).like("action", "Study member%");
    expect(data!.some((r) => r.action === "Study member added" && r.study_id === study.code)).toBe(true);
    expect(data!.some((r) => r.action === "Study member changed")).toBe(true);
  });
});

describe("reports (RPT-03/04)", () => {
  it("lists the catalogue with what the caller may run", async () => {
    const r = await call(catalogue.GET, { token: cra.token, params: { studyId: study.id } });
    expect(r.status).toBe(200);
    const allowed = Object.fromEntries(r.body.data.map((x: { key: string; allowed: boolean }) => [x.key, x.allowed]));
    expect(allowed).toEqual({ "document-activities": false, "user-management": false, timeliness: true, rejected: true, "study-management": false, "feature-management": false, "risk-score": true });
  });

  it("every report downloads as Excel for a TMF Lead, and is audited", async () => {
    for (const key of ["document-activities", "user-management", "timeliness", "rejected", "study-management", "feature-management"]) {
      const res = await runReport(lead, key);
      expect(res.status, key).toBe(200);
      expect(res.headers.get("content-type")).toMatch(/spreadsheetml/);
    }
    const { data } = await admin().from("audit_trail").select("new_value").eq("org_id", org).eq("action", "Report generated");
    expect(data).toHaveLength(6);
  });

  it("Document Activities lists the study's document actions with taxonomy columns", async () => {
    const [summary, activities] = await sheets(await runReport(lead, "document-activities"));
    expect(summary).toContain("Document Activities");
    expect(activities).toContain("Document viewed in test");
    expect(activities).toContain("02.01.02");
  });

  it("User Management shows the role change", async () => {
    const [, rows] = await sheets(await runReport(lead, "user-management"));
    expect(rows).toContain("User role changed");
    expect(rows).toContain(cra.email);
  });

  it("Timeliness reports durations against thresholds and expiry", async () => {
    const [summary, durations, expiry] = await sheets(await runReport(lead, "timeliness"));
    expect(summary).toContain("Indexing threshold (days)");
    expect(durations).toContain("01.01 Trial Oversight");
    expect(expiry).toContain("Expired");
  });

  it("refuses a CRA the audit-trail reports, and bad or reversed dates", async () => {
    expect((await runReport(cra, "document-activities")).status).toBe(403);
    expect((await runReport(cra, "timeliness")).status).toBe(200);
    expect((await runReport(lead, "timeliness", "?from=2026-13-01&to=2026-01-01")).status).toBe(400);
    expect((await runReport(lead, "timeliness", "?from=2026-05-01&to=2026-01-01")).status).toBe(400);
    expect((await runReport(lead, "nope")).status).toBe(404);
    expect((await runReport(outsider, "timeliness")).status).toBe(404);
  });

  it("the Navigator exports to Excel (EXP-02)", async () => {
    const res = await navExport.POST(apiRequest("/x", { token: lead.token, method: "POST", body: JSON.stringify({ format: "xlsx" }), headers: { "Content-Type": "application/json" } }),
      { params: Promise.resolve({ studyId: study.id }) });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/spreadsheetml/);
    const [rows] = await sheets(res);
    expect(rows).toContain("Protocol");
  });
});

describe("ZIP export jobs (EXP-03/04)", () => {
  let jobId: string;

  it("builds a ZIP of Final documents in taxonomy folders with metadata and hashes", async () => {
    const r = await call(exportsRoute.POST, { token: cra.token, method: "POST", params: { studyId: study.id }, body: { scope: "final" } });
    expect(r.status).toBe(202);
    jobId = r.body.id;
    const list = await call(exportsRoute.GET, { token: cra.token, params: { studyId: study.id } });
    const job = list.body.data.find((j: { id: string }) => j.id === jobId);
    expect(job).toMatchObject({ status: "done", file_count: 2, expired: false });
    expect(job.file_path).toBeUndefined();

    const dl = await call(download.POST, { token: cra.token, method: "POST", params: { jobId } });
    expect(dl.status).toBe(200);
    const zip = await JSZip.loadAsync(await (await fetch(dl.body.url)).arrayBuffer());
    const names = Object.keys(zip.files).filter((n) => !n.endsWith("/"));
    const protocol = names.find((n) => n.includes("/02") && n.endsWith(".pdf"))!;
    expect(protocol.startsWith(`${study.code}/02`)).toBe(true);
    expect(protocol.split("/")).toHaveLength(5);   // study / zone / section / artifact / file
    expect(names).toContain(`${study.code}/metadata.xlsx`);
    expect(names).toContain(`${study.code}/README.txt`);
    expect(names.some((n) => n.includes("draft"))).toBe(false);
    expect(new Uint8Array(await zip.file(protocol)!.async("uint8array"))).toEqual(bytesOf.protocol);
    const meta = await JSZip.loadAsync(await zip.file(`${study.code}/metadata.xlsx`)!.async("uint8array"));
    const sheet = await meta.file("xl/worksheets/sheet1.xml")!.async("string");
    expect(sheet).toContain(createHash("sha256").update(bytesOf.protocol).digest("hex"));
    expect(sheet).not.toContain("differs from stored hash");
    const { data } = await admin().from("audit_trail").select("action").eq("org_id", org).in("action", ["Export requested", "Export downloaded"]);
    expect(data!.map((x) => x.action).sort()).toEqual(["Export downloaded", "Export requested"]);
  });

  it("all current documents includes drafts", async () => {
    const r = await call(exportsRoute.POST, { token: lead.token, method: "POST", params: { studyId: study.id }, body: { scope: "current" } });
    const list = await call(exportsRoute.GET, { token: lead.token, params: { studyId: study.id } });
    expect(list.body.data.find((j: { id: string }) => j.id === r.body.id)).toMatchObject({ status: "done", file_count: 3 });
  });

  it("another organisation cannot download it; an expired export is gone", async () => {
    expect((await call(download.POST, { token: outsider.token, method: "POST", params: { jobId } })).status).toBe(404);
    await admin().from("export_jobs").update({ expires_at: new Date(Date.now() - 1000).toISOString() }).eq("id", jobId);
    expect((await call(download.POST, { token: cra.token, method: "POST", params: { jobId } })).status).toBe(410);
  });

  it("users cannot write export jobs directly", async () => {
    await lead.db.from("export_jobs").update({ status: "failed" }).eq("id", jobId);
    const { data } = await admin().from("export_jobs").select("status").eq("id", jobId).single();
    expect(data!.status).toBe("done");
    const { error: ins } = await lead.db.from("export_jobs").insert([{ org_id: org, study_id: study.id, kind: "zip", requested_by: lead.id }]);
    expect(ins).toBeTruthy();
  });
});

describe("audit trail review (RPT-02)", () => {
  it("roles with view_audit_trail read the organisation's trail; others only their own; never another organisation", async () => {
    const { data: leadRows } = await lead.db.from("audit_trail").select("user_id, action").eq("org_id", org);
    expect(leadRows!.some((r) => r.user_id === admin1.id && r.action === "User role changed")).toBe(true);
    const { data: craRows } = await cra.db.from("audit_trail").select("user_id").eq("org_id", org);
    expect(craRows!.every((r) => r.user_id === cra.id)).toBe(true);
    const { data: outRows } = await outsider.db.from("audit_trail").select("id").eq("org_id", org);
    expect(outRows).toEqual([]);
  });
});
