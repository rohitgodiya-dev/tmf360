// Part 5: Document Intake — receive, verify, index, file or reject.
import { createHash } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as intake from "@/app/api/v1/studies/[studyId]/intake/route";
import * as intakeItem from "@/app/api/v1/studies/[studyId]/intake/[itemId]/route";
import * as fileItem from "@/app/api/v1/studies/[studyId]/intake/[itemId]/file/route";
import { Fixtures, admin, call, type TestUser } from "./fixtures";

const fx = new Fixtures();
let orgA: string;
let uploader: TestUser;   // TMF Lead
let auditor: TestUser;
let outsider: TestUser;
let study: { id: string; code: string };
let artifact: { artifact_num: string; artifact_name: string };
const paths: string[] = [];
const sha = (s: string) => createHash("sha256").update(s).digest("hex");

async function store(content: string, name = sha(content)) {
  const path = `${orgA}/${study.code}/${name}.pdf`;
  paths.push(path);
  const { error } = await uploader.db.storage.from("Documents").upload(path, new Blob([content]));
  if (error) throw error;
  return path;
}

const p = <T extends Record<string, string>>(extra: T = {} as T) => ({ studyId: study.id, ...extra });
const register = (u: TestUser, path: string, hash: string) => call(intake.POST, {
  token: u.token, method: "POST", params: p(),
  body: { file_path: path, file_name: "Protocol v2.pdf", file_type: "application/pdf", file_size_bytes: 12, file_hash: hash },
});
const patch = (u: TestUser, itemId: string, body: Record<string, unknown>) =>
  call(intakeItem.PATCH, { token: u.token, method: "PATCH", params: p({ itemId }), body });
const file = (u: TestUser, itemId: string) =>
  call(fileItem.POST, { token: u.token, method: "POST", params: p({ itemId }) });

beforeAll(async () => {
  orgA = await fx.org("intake");
  uploader = await fx.user("in-lead", { orgId: orgA, role: "TMF Lead" });
  auditor = await fx.user("in-auditor", { orgId: orgA, role: "Auditor" });
  const orgB = await fx.org("intake-b");
  outsider = await fx.user("in-outsider", { orgId: orgB, role: "System Administrator" });
  study = await fx.study(orgA, "IN");
  await fx.member(orgA, study.code, auditor, "Auditor");
  const { error } = await uploader.db.rpc("seed_study_tmf_config", { p_study_code: study.code });
  if (error) throw error;
  const { data } = await admin().from("tmf_config").select("artifact_num, artifact_name")
    .eq("study_id", study.code).eq("type", "artifact").eq("is_enabled", true).limit(1).single();
  artifact = data!;
});
afterAll(async () => {
  const { data: items } = await admin().from("intake_items").select("filed_document_id").eq("org_id", orgA);
  const docs = (items ?? []).map((i) => i.filed_document_id).filter(Boolean);
  await admin().from("intake_items").delete().eq("org_id", orgA);
  if (docs.length) {
    await admin().from("document_file_versions").delete().in("document_id", docs);
    await admin().from("documents").delete().in("id", docs);
  }
  if (paths.length) await admin().storage.from("Documents").remove(paths);
  await fx.cleanup();
});

describe("receiving files", () => {
  let itemId: string;
  let rowVersion: number;

  it("registers a stored file and verifies it on the server", async () => {
    const r = await register(uploader, await store("protocol v2"), sha("protocol v2"));
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ status: "received", verification_status: "verified", org_id: orgA, created_by: uploader.id });
    itemId = r.body.id;
    rowVersion = r.body.row_version;
  });

  it("flags a file stored under the wrong hash", async () => {
    const claimed = sha("real file");
    const r = await register(uploader, await store("different bytes", claimed), claimed);
    expect(r.body.verification_status).toBe("mismatch");
    expect((await file(uploader, r.body.id)).status).toBe(400);
  });

  it("refuses paths outside the study's folder", async () => {
    const r = await register(uploader, `someone-else/${sha("x")}.pdf`, sha("x"));
    expect(r.status).toBe(400);
  });

  it("refuses roles without upload rights and other organisations", async () => {
    expect((await register(auditor, await store("auditor file"), sha("auditor file"))).status).toBe(403);
    expect((await call(intake.GET, { token: outsider.token, params: p() })).status).toBe(404);
  });

  it("users can't mark an item verified or filed themselves", async () => {
    await uploader.db.from("intake_items").update({ verification_status: "verified" }).eq("verification_status", "mismatch");
    const { data } = await admin().from("intake_items").select("verification_status").eq("org_id", orgA).eq("verification_status", "mismatch");
    expect(data).toHaveLength(1);
  });

  it("needs an artifact before filing", async () => {
    const r = await file(uploader, itemId);
    expect(r.status).toBe(400);
    expect(r.body.error.message).toMatch(/artifact/);
  });

  it("indexes the item", async () => {
    const r = await patch(uploader, itemId, {
      row_version: rowVersion, artifact_num: artifact.artifact_num, title: "Protocol v2", version_label: "2.0", effective_date: "2026-09-01",
    });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ status: "indexed", artifact_num: artifact.artifact_num });
    rowVersion = r.body.row_version;
  });

  it("files it as a Draft TMF document with a verified first version", async () => {
    const r = await file(uploader, itemId);
    expect(r.status).toBe(201);
    const docId = r.body.document_id;
    const { data: doc } = await admin().from("documents").select("*").eq("id", docId).single();
    expect(doc).toMatchObject({
      study_id: study.code, org_id: orgA, status: "Draft", artifact_num: artifact.artifact_num,
      artifact_name: artifact.artifact_name, custom_file_name: "Protocol v2", version: "2.0", file_hash: sha("protocol v2"),
    });
    const { data: v } = await admin().from("document_file_versions").select("*").eq("document_id", docId).single();
    expect(v).toMatchObject({ version_no: 1, verification_status: "verified" });
    const { data: item } = await admin().from("intake_items").select("status, filed_document_id").eq("id", itemId).single();
    expect(item).toEqual({ status: "filed", filed_document_id: docId });
  });

  it("can't be filed twice or changed after filing", async () => {
    expect((await file(uploader, itemId)).status).toBe(400);
    expect((await patch(uploader, itemId, { row_version: rowVersion + 1, title: "Changed" })).status).not.toBe(200);
  });
});

describe("duplicate checks (Part 5b)", () => {
  const extraDocs: string[] = [];
  const addDoc = async (fields: Record<string, unknown>) => {
    const { data, error } = await admin().from("documents").insert([{
      org_id: orgA, user_id: uploader.id, study_id: study.code, artifact_num: artifact.artifact_num,
      artifact_name: artifact.artifact_name, ...fields,
    }]).select("id").single();
    if (error) throw error;
    extraDocs.push(data.id);
    return data.id as string;
  };
  afterAll(async () => {
    await admin().from("intake_items").update({ duplicate_of: null }).in("duplicate_of", extraDocs);
    await admin().from("document_file_versions").delete().in("document_id", extraDocs);
    await admin().from("documents").delete().in("id", extraDocs);
  });

  it("blocks a file that is already Final in the study", async () => {
    const finalId = await addDoc({ status: "Approved", file_name: "Signed plan.pdf", custom_file_name: "Signed plan", file_hash: sha("signed plan") });
    const r = await register(uploader, await store("signed plan"), sha("signed plan"));
    expect(r.body).toMatchObject({ duplicate_status: "blocked", duplicate_of: finalId });
    expect(r.body.duplicate_reason).toMatch(/already Final.*Signed plan/);
    const idx = await patch(uploader, r.body.id, { row_version: r.body.row_version, artifact_num: artifact.artifact_num });
    const f = await file(uploader, r.body.id);
    expect(f.status).toBe(400);
    expect(f.body.error.message).toMatch(/cannot be filed/);
    const { count } = await admin().from("documents").select("id", { count: "exact", head: true })
      .eq("org_id", orgA).eq("file_hash", sha("signed plan"));
    expect(count).toBe(1);
    await patch(uploader, r.body.id, { row_version: idx.body.row_version, reject: "Duplicate of a Final document" });
  });

  it("warns on the same file name and still allows filing", async () => {
    await addDoc({ status: "Draft", file_name: "Monitoring report.pdf", file_hash: sha("old report") });
    const path = await store("new report");
    const r = await call(intake.POST, {
      token: uploader.token, method: "POST", params: p(),
      body: { file_path: path, file_name: "monitoring REPORT.pdf", file_type: "application/pdf", file_size_bytes: 10, file_hash: sha("new report") },
    });
    expect(r.body).toMatchObject({ duplicate_status: "warning" });
    expect(r.body.duplicate_reason).toMatch(/same file name/);
    const idx = await patch(uploader, r.body.id, { row_version: r.body.row_version, artifact_num: artifact.artifact_num });
    expect((await file(uploader, idx.body.id)).status).toBe(201);
  });

  it("warns when the same file is in the TMF but not Final", async () => {
    await addDoc({ status: "Under Review", file_name: "Lab manual.pdf", file_hash: sha("lab manual") });
    const r = await register(uploader, await store("lab manual"), sha("lab manual"));
    expect(r.body.duplicate_status).toBe("warning");
    expect(r.body.duplicate_reason).toMatch(/exact file.*Under Review/);
  });

  it("re-checks at filing: a match approved after receipt blocks filing", async () => {
    const r = await register(uploader, await store("late approval"), sha("late approval"));
    expect(r.body.duplicate_status).not.toBe("blocked");   // "Protocol v2.pdf" name match only
    await addDoc({ status: "Approved", file_name: "Late.pdf", file_hash: sha("late approval") });
    const idx = await patch(uploader, r.body.id, { row_version: r.body.row_version, artifact_num: artifact.artifact_num });
    expect((await file(uploader, idx.body.id)).status).toBe(400);
  });

  it("users can't clear a duplicate flag themselves", async () => {
    const { error } = await uploader.db.from("intake_items").update({ duplicate_status: "none" })
      .eq("org_id", orgA).eq("duplicate_status", "warning").eq("status", "received");
    expect(error?.message).toMatch(/Only the server/);
  });
});

describe("rejecting", () => {
  it("needs a reason and closes the item", async () => {
    const r = await register(uploader, await store("wrong study's file"), sha("wrong study's file"));
    expect((await patch(uploader, r.body.id, { row_version: r.body.row_version, reject: "" })).status).toBe(400);
    const rej = await patch(uploader, r.body.id, { row_version: r.body.row_version, reject: "Belongs to another study" });
    expect(rej.body).toMatchObject({ status: "rejected", rejected_reason: "Belongs to another study" });
    const open = await call(intake.GET, { token: auditor.token, params: p() });
    expect(open.body.data.map((i: { id: string }) => i.id)).not.toContain(r.body.id);
  });
});
