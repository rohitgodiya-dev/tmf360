// Part 11c: retention policies (RET-01), legal holds (RET-02), study close-out with an electronic
// signature and read-only enforcement (RET-03), archive and transfer packages (RET-04/05).
import { createHash } from "node:crypto";
import JSZip from "jszip";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as overview from "@/app/api/v1/studies/[studyId]/archive/route";
import * as close from "@/app/api/v1/studies/[studyId]/close/route";
import * as reopen from "@/app/api/v1/studies/[studyId]/reopen/route";
import * as retention from "@/app/api/v1/studies/[studyId]/retention/route";
import * as orgDefault from "@/app/api/v1/retention-default/route";
import * as holds from "@/app/api/v1/legal-holds/route";
import * as release from "@/app/api/v1/legal-holds/[holdId]/release/route";
import * as packages from "@/app/api/v1/studies/[studyId]/archive-packages/route";
import * as download from "@/app/api/v1/exports/[jobId]/download/route";
import { Fixtures, admin, call, type TestUser } from "./fixtures";

const fx = new Fixtures();
let org: string;
let lead: TestUser, cra: TestUser, outsider: TestUser;
let study: { id: string; code: string };
const d: Record<string, string> = {};
const paths: string[] = [];
const bytes: Record<string, Uint8Array> = {};

async function upload(key: string) {
  const b = new TextEncoder().encode(`%PDF-1.4\n% ${key} ${fx.runId}\n`);
  const path = `${org}/${fx.runId}/${key}.pdf`;
  const up = await admin().storage.from("Documents").upload(path, b, { contentType: "application/pdf" });
  if (up.error) throw up.error;
  paths.push(path);
  bytes[key] = b;
  return { file_path: path, file_name: `${key}.pdf`, file_type: "application/pdf", file_hash: createHash("sha256").update(b).digest("hex") };
}
const view = async (u: TestUser = lead) => (await call(overview.GET, { token: u.token, params: { studyId: study.id } })).body;
const deleteDoc = (u: TestUser, id: string) => u.db.rpc("delete_document", { p_document: id, p_code: "incorrectly_indexed", p_comment: "testing the hold" });

beforeAll(async () => {
  org = await fx.org("ret");
  lead = await fx.user("ret-lead", { orgId: org, role: "TMF Lead" });
  cra = await fx.user("ret-cra", { orgId: org, role: "CRA" });
  outsider = await fx.user("ret-out", { orgId: await fx.org("ret-b"), role: "System Administrator" });
  study = await fx.study(org, "RET");
  await fx.member(org, study.code, cra, "CRA");
  const a = admin();
  const { data: fin, error } = await a.from("documents").insert([{ org_id: org, user_id: lead.id, study_id: study.code, status: "Approved", approved_at: new Date().toISOString(),
    approved_by: "seed@example.test", artifact_num: "02.01.02", artifact_name: "Protocol", custom_file_name: "Protocol v1", ...(await upload("protocol")) }]).select("id").single();
  if (error) throw error;
  d.final = fin.id;
  const { data: dr, error: dErr } = await a.from("documents").insert([{ org_id: org, user_id: lead.id, study_id: study.code, status: "Draft",
    artifact_num: "01.01.01", artifact_name: "Trial Master File Plan", custom_file_name: "TMF Plan", ...(await upload("plan-v1")) }]).select("id").single();
  if (dErr) throw dErr;
  d.draft = dr.id;
  // A second file version of the draft, for the archive (all versions).
  const v2 = await upload("plan-v2");
  const { error: vErr } = await a.from("documents").update({ file_path: v2.file_path, file_name: v2.file_name, file_hash: v2.file_hash }).eq("id", d.draft);
  if (vErr) throw vErr;
  const { error: tErr } = await a.from("document_tasks").insert([{ org_id: org, study_id: study.id, document_id: d.draft, task_type: "inbound_qc", position: 1, cycle: 1,
    due_at: new Date(Date.now() + 86400000).toISOString(), status: "open" }]);
  if (tErr) throw tErr;
});

afterAll(async () => {
  const s = await view();
  for (const h of s.holds ?? []) if (!h.released_at) await call(release.POST, { token: lead.token, method: "POST", params: { holdId: h.id }, body: { reason: "test cleanup" } });
  if (s.study?.closed_at) await call(reopen.POST, { token: lead.token, method: "POST", params: { studyId: study.id }, body: { reason: "test cleanup", password: lead.password } });
  await admin().storage.from("Documents").remove(paths);
  const { data: jobs } = await admin().from("export_jobs").select("file_path").eq("org_id", org);
  const files = (jobs ?? []).map((j) => j.file_path).filter(Boolean) as string[];
  if (files.length) await admin().storage.from("exports").remove(files);
  await admin().from("retention_policies").delete().eq("org_id", org);
  await admin().from("documents").delete().eq("org_id", org);
  await fx.cleanup();
});

describe("retention (RET-01)", () => {
  it("the organisation default applies until the study has its own; changes need a reason and are audited", async () => {
    expect((await view()).retention.source).toBe("none");
    expect((await call(orgDefault.PUT, { token: lead.token, method: "PUT", body: { start_trigger: "study_closeout", years: 25 } })).status).toBe(400);
    expect((await call(orgDefault.PUT, { token: cra.token, method: "PUT", body: { start_trigger: "study_closeout", years: 25, reason: "SOP-RET-01" } })).status).toBe(403);
    expect((await call(orgDefault.PUT, { token: lead.token, method: "PUT", body: { start_trigger: "study_closeout", years: 25, reason: "SOP-RET-01" } })).status).toBe(200);
    expect((await view()).retention).toMatchObject({ source: "organisation", state: "not_started", waiting_for: "Study close-out", end: null });

    const r = await call(retention.PUT, { token: lead.token, method: "PUT", params: { studyId: study.id },
      body: { policy: { start_trigger: "fixed_date", years: 10, start_date: "2020-01-01" }, reason: "Contract requires 10 years" } });
    expect(r.status).toBe(200);
    expect((await view()).retention).toMatchObject({ source: "study", start: "2020-01-01", end: "2030-01-01", state: "running" });
    expect((await call(retention.PUT, { token: lead.token, method: "PUT", params: { studyId: study.id },
      body: { policy: { start_trigger: "fixed_date", years: 10 }, reason: "missing date" } })).status).toBe(400);
    const { data } = await admin().from("audit_trail").select("action, signature_reason").eq("org_id", org).like("action", "retention_policies.%");
    expect(data!.map((x) => x.signature_reason).sort()).toEqual(["Contract requires 10 years", "SOP-RET-01"]);
  });
});

describe("legal holds (RET-02)", () => {
  it("a CRA cannot place a hold", async () => {
    expect((await call(holds.POST, { token: cra.token, method: "POST", body: { scope: "study", study_id: study.id, reason: "Litigation" } })).status).toBe(403);
  });

  for (const scope of ["document", "study", "tenant"] as const) {
    it(`a ${scope} hold blocks deletion until released`, async () => {
      const placed = await call(holds.POST, { token: lead.token, method: "POST", body: {
        scope, study_id: scope === "study" ? study.id : undefined, document_id: scope === "document" ? d.draft : undefined, reason: `Litigation ${scope}`, reference: "CASE-42" } });
      expect(placed.status).toBe(201);
      const { error } = await deleteDoc(lead, d.draft);
      expect(error?.message).toMatch(/under legal hold \(Litigation .* \(CASE-42\)\)/);
      expect((await call(release.POST, { token: lead.token, method: "POST", params: { holdId: placed.body.id }, body: { reason: "Case settled" } })).status).toBe(200);
      expect((await call(release.POST, { token: lead.token, method: "POST", params: { holdId: placed.body.id }, body: { reason: "Again" } })).status).toBe(400);
    });
  }

  it("holds are listed and audited; another organisation cannot release them", async () => {
    const placed = await call(holds.POST, { token: lead.token, method: "POST", body: { scope: "study", study_id: study.id, reason: "Regulatory enquiry" } });
    expect((await call(release.POST, { token: outsider.token, method: "POST", params: { holdId: placed.body.id }, body: { reason: "Not mine" } })).status).toBe(404);
    const s = await view();
    expect(s.holds.filter((h: { released_at: string | null }) => !h.released_at)).toHaveLength(1);
    const { data } = await admin().from("audit_trail").select("action").eq("org_id", org).like("action", "Legal hold%");
    expect(data!.filter((x) => x.action === "Legal hold placed")).toHaveLength(4);
    expect(data!.filter((x) => x.action === "Legal hold released")).toHaveLength(3);
    await call(release.POST, { token: lead.token, method: "POST", params: { holdId: placed.body.id }, body: { reason: "Enquiry closed" } });
  });
});

describe("close-out (RET-03) and archive / transfer packages (RET-04/05)", () => {
  it("an archive needs a closed study; a transfer needs a recipient", async () => {
    expect((await call(packages.POST, { token: lead.token, method: "POST", params: { studyId: study.id }, body: { kind: "archive", reason: "End of study", password: lead.password } })).status).toBe(400);
    expect((await call(packages.POST, { token: lead.token, method: "POST", params: { studyId: study.id }, body: { kind: "transfer", reason: "Acquisition", password: lead.password } })).status).toBe(400);
  });

  it("closing needs the right password and permission", async () => {
    expect((await call(close.POST, { token: cra.token, method: "POST", params: { studyId: study.id }, body: { reason: "Done", password: cra.password } })).status).toBe(403);
    const bad = await call(close.POST, { token: lead.token, method: "POST", params: { studyId: study.id }, body: { reason: "Done", password: "wrong" } });
    expect(bad.status).toBe(400);
    expect((await view()).study.closed_at).toBeNull();
  });

  it("closes with a signature, cancels open tasks and records a final snapshot", async () => {
    const r = await call(close.POST, { token: lead.token, method: "POST", params: { studyId: study.id }, body: { reason: "Last patient last visit; CSR final", password: lead.password } });
    expect(r.status).toBe(200);
    expect(r.body.tasks_cancelled).toBe(1);
    const s = await view();
    expect(s.study.closed_at).toBeTruthy();
    expect(s.lifecycle_signatures[0]).toMatchObject({ meaning: "Study TMF closed", action: "study_closeout" });
    const { data: task } = await admin().from("document_tasks").select("status, cancel_reason").eq("document_id", d.draft).single();
    expect(task).toMatchObject({ status: "cancelled", cancel_reason: "Study closed: Last patient last visit; CSR final" });
    const { data: snap } = await admin().from("health_snapshots").select("indicators").eq("study_id", study.id);
    expect(snap).toHaveLength(1);
  });

  it("a closed study is read-only, even for direct database writes", async () => {
    const { error: upd } = await lead.db.from("documents").update({ comments: "late edit" }).eq("id", d.final);
    expect(upd?.message).toMatch(/closed and read-only/);
    const { error: svc } = await admin().from("documents").update({ comments: "late edit" }).eq("id", d.final);
    expect(svc?.message).toMatch(/closed and read-only/);
    const { error: pl } = await lead.db.from("placeholders").insert([{ org_id: org, study_id: study.id, artifact_num: "01.01.02", level: "study", title: "late" }]);
    expect(pl?.message).toMatch(/closed and read-only/);
    const { error: st } = await lead.db.from("studies").update({ protocol: "changed" }).eq("id", study.id);
    expect(st?.message).toMatch(/closed and read-only/);
    const { error: forged } = await lead.db.from("studies").update({ closed_at: null }).eq("id", study.id);
    expect(forged?.message).toMatch(/electronic signature/);
    // Recording the marketing authorisation date still works: it starts retention.
    const ma = await call(retention.PUT, { token: lead.token, method: "PUT", params: { studyId: study.id }, body: { marketing_authorisation_date: "2026-06-30", reason: "EMA approval" } });
    expect(ma.status).toBe(200);
  });

  it("builds a signed archive package with every version, audit trail, signatures and manifest", async () => {
    const r = await call(packages.POST, { token: lead.token, method: "POST", params: { studyId: study.id }, body: { kind: "archive", reason: "End-of-study archive", password: lead.password } });
    expect(r.status).toBe(202);
    const s = await view();
    const pkg = s.packages.find((p: { id: string }) => p.id === r.body.id);
    expect(pkg).toMatchObject({ status: "done", kind: "archive", file_count: 3 });
    expect(pkg.signature).toMatchObject({ meaning: "Archive package approved" });

    const dl = await call(download.POST, { token: lead.token, method: "POST", params: { jobId: r.body.id } });
    const raw = new Uint8Array(await (await fetch(dl.body.url)).arrayBuffer());
    expect(createHash("sha256").update(raw).digest("hex")).toBe(pkg.file_hash);
    const zip = await JSZip.loadAsync(raw);
    const names = Object.keys(zip.files);
    for (const f of ["metadata.xlsx", "audit-trail.xlsx", "signatures.xlsx", "manifest.json"]) expect(names).toContain(`${study.code}/${f}`);
    expect(names.some((n) => n.endsWith("TMF Plan - file v1.pdf"))).toBe(true);
    expect(names.some((n) => n.endsWith("TMF Plan - file v2 (current).pdf"))).toBe(true);
    const manifest = JSON.parse(await zip.file(`${study.code}/manifest.json`)!.async("string"));
    expect(manifest).toMatchObject({ package: "archive", study: study.code, approval: { meaning: "Archive package approved" } });
    expect(manifest.files).toHaveLength(3);
    for (const f of manifest.files) {
      const content = await zip.file(f.path)!.async("uint8array");
      expect(createHash("sha256").update(content).digest("hex")).toBe(f.sha256);
    }
    const audit = await JSZip.loadAsync(await zip.file(`${study.code}/audit-trail.xlsx`)!.async("uint8array"));
    expect(await audit.file("xl/worksheets/sheet1.xml")!.async("string")).toContain("Study closed (electronic signature)");
  });

  it("a transfer package carries the signed transfer record", async () => {
    const r = await call(packages.POST, { token: lead.token, method: "POST", params: { studyId: study.id }, body: { kind: "transfer", recipient: "Acme CRO Ltd", reason: "Sponsor acquisition", password: lead.password } });
    expect(r.status).toBe(202);
    const dl = await call(download.POST, { token: lead.token, method: "POST", params: { jobId: r.body.id } });
    const zip = await JSZip.loadAsync(await (await fetch(dl.body.url)).arrayBuffer());
    const record = await zip.file(`${study.code}/TRANSFER-RECORD.txt`)!.async("string");
    expect(record).toContain("Recipient: Acme CRO Ltd");
    expect(record).toContain('meaning "Archive package approved"');
  });

  it("reopens with a signature; the study is editable again", async () => {
    const r = await call(reopen.POST, { token: lead.token, method: "POST", params: { studyId: study.id }, body: { reason: "Late safety document", password: lead.password } });
    expect(r.status).toBe(200);
    expect((await view()).study.closed_at).toBeNull();
    const { error } = await lead.db.from("documents").update({ comments: "now allowed" }).eq("id", d.draft);
    expect(error).toBeNull();
    const { data } = await admin().from("signature_events").select("meaning").eq("study_id", study.id).order("signed_at");
    expect(data!.map((x) => x.meaning)).toEqual(["Study TMF closed", "Archive package approved", "Archive package approved", "Study TMF reopened"]);
  });
});
