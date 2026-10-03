// Part 4b: every file a document has had is kept as a version, and the server checks
// stored bytes against the recorded SHA-256.
import { createHash } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as verify from "@/app/api/v1/documents/[documentId]/verify-file/route";
import { Fixtures, admin, call, type TestUser } from "./fixtures";

const fx = new Fixtures();
let orgA: string;
let sysAdmin: TestUser;
let outsider: TestUser;
let study: { id: string; code: string };
let docId: string;
const paths: string[] = [];
const docIds: string[] = [];

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

async function store(content: string, name = sha(content)) {
  const path = `${orgA}/${study.code}/${name}.txt`;
  paths.push(path);
  const { error } = await sysAdmin.db.storage.from("Documents").upload(path, new Blob([content]));
  if (error) throw error;
  return path;
}

async function newDoc(path: string, hash: string) {
  const { data, error } = await sysAdmin.db.from("documents").insert([{
    org_id: orgA, user_id: sysAdmin.id, study_id: study.code, artifact_name: "Protocol", status: "Draft",
    file_path: path, file_name: "protocol.txt", file_hash: hash, file_size_bytes: 10,
  }]).select("id").single();
  if (error) throw error;
  docIds.push(data.id);
  return data.id as string;
}

async function versions(id: string) {
  const { data } = await admin().from("document_file_versions").select("*").eq("document_id", id).order("version_no");
  return data!;
}

const check = (u: TestUser, id: string) => call(verify.POST, { token: u.token, method: "POST", params: { documentId: id } });

beforeAll(async () => {
  orgA = await fx.org("fv");
  sysAdmin = await fx.user("fv-admin", { orgId: orgA, role: "System Administrator" });
  const orgB = await fx.org("fv-b");
  outsider = await fx.user("fv-outsider", { orgId: orgB, role: "System Administrator" });
  study = await fx.study(orgA, "FV");
});
afterAll(async () => {
  if (docIds.length) {
    await admin().from("document_file_versions").delete().in("document_id", docIds);
    await admin().from("documents").delete().in("id", docIds);
  }
  if (paths.length) await admin().storage.from("Documents").remove(paths);
  await fx.cleanup();
});

describe("file versions", () => {
  it("records version 1 when a document is created with a file", async () => {
    const path = await store("first draft");
    docId = await newDoc(path, sha("first draft"));
    const v = await versions(docId);
    expect(v).toHaveLength(1);
    expect(v[0]).toMatchObject({ version_no: 1, file_path: path, file_hash: sha("first draft"), uploaded_by: sysAdmin.id });
  });

  it("records a new version when the file is replaced, keeping the old one", async () => {
    const path = await store("second draft");
    const { error } = await sysAdmin.db.from("documents").update({ file_path: path, file_hash: sha("second draft") }).eq("id", docId);
    expect(error).toBeNull();
    expect((await versions(docId)).map((v) => v.version_no)).toEqual([1, 2]);
  });

  it("cannot be changed or removed by users", async () => {
    const [v1] = await versions(docId);
    await sysAdmin.db.from("document_file_versions").update({ file_hash: "x" }).eq("id", v1.id);
    await sysAdmin.db.from("document_file_versions").delete().eq("id", v1.id);
    const [after] = await versions(docId);
    expect(after.file_hash).toBe(v1.file_hash);
  });

  it("locks the file of an approved document", async () => {
    await sysAdmin.db.from("documents").update({ status: "Approved", approved_at: new Date().toISOString() }).eq("id", docId);
    const path = await store("sneaky swap");
    const { error } = await sysAdmin.db.from("documents").update({ file_path: path }).eq("id", docId);
    expect(error?.message).toMatch(/approved document/);
    expect(await versions(docId)).toHaveLength(2);
  });
});

describe("integrity check", () => {
  it("verifies a file whose stored bytes match its hash", async () => {
    const r = await check(sysAdmin, docId);
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ version_no: 2, status: "verified", hash: sha("second draft") });
    expect((await versions(docId))[1]).toMatchObject({ verification_status: "verified", verified_hash: sha("second draft") });
  });

  it("catches a file stored under someone else's hash", async () => {
    const claimed = sha("the real protocol");
    const path = await store("something else entirely", claimed);
    const id = await newDoc(path, claimed);
    const r = await check(sysAdmin, id);
    expect(r.body.status).toBe("mismatch");
  });

  it("reports a missing file", async () => {
    const id = await newDoc(`${orgA}/${study.code}/${sha("never uploaded")}.txt`, sha("never uploaded"));
    expect((await check(sysAdmin, id)).body.status).toBe("missing");
  });

  it("is not available for documents the caller can't see", async () => {
    expect((await check(outsider, docId)).status).toBe(404);
  });
});
