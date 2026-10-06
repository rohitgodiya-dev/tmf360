// Part 14c: bulk indexing (IDX-02) and bulk selection actions in Document Intake (STG-09).
import { createHash } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as intake from "@/app/api/v1/studies/[studyId]/intake/route";
import * as bulk from "@/app/api/v1/studies/[studyId]/intake/bulk/route";
import { Fixtures, admin, call, type TestUser } from "./fixtures";

const fx = new Fixtures();
let org: string;
let lead: TestUser, auditor: TestUser;
let study: { id: string; code: string };
let artifact: string;
const items: string[] = [];
const paths: string[] = [];

async function receive(text: string) {
  const bytes = new TextEncoder().encode(`%PDF-1.4\n% ${text} ${fx.runId}\n`);
  const hash = createHash("sha256").update(bytes).digest("hex");
  const path = `${org}/${study.code}/${hash}.pdf`;
  await lead.db.storage.from("Documents").upload(path, bytes);
  paths.push(path);
  const r = await call(intake.POST, { token: lead.token, method: "POST", params: { studyId: study.id }, body: { file_path: path, file_name: `${text}.pdf`, file_type: "application/pdf", file_size_bytes: bytes.length, file_hash: hash } });
  items.push(r.body.id);
  return r.body.id as string;
}
const run = (body: Record<string, unknown>, u: TestUser = lead) => call(bulk.POST, { token: u.token, method: "POST", params: { studyId: study.id }, body });

beforeAll(async () => {
  org = await fx.org("blk");
  lead = await fx.user("blk-lead", { orgId: org, role: "TMF Lead" });
  auditor = await fx.user("blk-aud", { orgId: org, role: "Auditor" });
  study = await fx.study(org, "BLK");
  await fx.member(org, study.code, auditor, "Auditor");
  const { error } = await lead.db.rpc("seed_study_tmf_config", { p_study_code: study.code });
  if (error) throw error;
  const { data } = await admin().from("tmf_config").select("artifact_num").eq("study_id", study.code).eq("type", "artifact").eq("is_enabled", true).order("artifact_num").limit(1).single();
  artifact = data!.artifact_num;
  for (const t of ["cv-a", "cv-b", "cv-c", "spare"]) await receive(t);
});

afterAll(async () => {
  await admin().from("document_text").delete().eq("org_id", org);
  await admin().storage.from("Documents").remove(paths);
  await fx.cleanup();
});

describe("bulk indexing (IDX-02, STG-09)", () => {
  it("roles without upload rights cannot act; at least one field is required", async () => {
    expect((await run({ action: "set", item_ids: items.slice(0, 3), set: { owner: "Clinical Ops" } }, auditor)).status).toBe(403);
    expect((await run({ action: "set", item_ids: items.slice(0, 3), set: {} })).status).toBe(400);
  });

  it("applies common metadata to every selected item and leaves others alone", async () => {
    const r = await run({ action: "set", item_ids: items.slice(0, 3), set: { artifact_num: artifact, owner: "Clinical Ops", version_label: "1.0" } });
    expect(r.body).toMatchObject({ done: 3, failed: 0 });
    const { data } = await admin().from("intake_items").select("id, status, artifact_num, owner, version_label, title").in("id", items);
    const by = new Map((data ?? []).map((i) => [i.id, i]));
    for (const id of items.slice(0, 3)) expect(by.get(id)).toMatchObject({ status: "indexed", artifact_num: artifact, owner: "Clinical Ops", version_label: "1.0", title: null });
    expect(by.get(items[3])).toMatchObject({ status: "received", artifact_num: null });
  });

  it("files the selected items, reporting each one (unindexed items fail with the reason)", async () => {
    const r = await run({ action: "file", item_ids: [items[0], items[1], items[3]] });
    expect(r.body.done).toBe(2);
    expect(r.body.results.find((x: { id: string }) => x.id === items[3])).toMatchObject({ ok: false });
    const { count } = await admin().from("documents").select("id", { count: "exact", head: true }).eq("org_id", org);
    expect(count).toBe(2);
    const again = await run({ action: "file", item_ids: [items[0]] });
    expect(again.body.results[0].reason).toBe("Already filed");
  });

  it("rejects the selected items with one reason", async () => {
    expect((await run({ action: "reject", item_ids: [items[2], items[3]], reason: "x" })).status).toBe(400);
    const r = await run({ action: "reject", item_ids: [items[2], items[3]], reason: "Duplicates of the paper binder scan" });
    expect(r.body.done).toBe(2);
    const { data } = await admin().from("intake_items").select("status, rejected_reason").in("id", [items[2], items[3]]);
    expect(data!.every((i) => i.status === "rejected" && i.rejected_reason === "Duplicates of the paper binder scan")).toBe(true);
  });
});
