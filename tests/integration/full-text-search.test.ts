// Part 14a: full-text search inside documents (NAV-09). Text is extracted on the server; search runs as
// the caller, so a document the caller cannot open is never found.
import { createHash } from "node:crypto";
import JSZip from "jszip";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as navigator from "@/app/api/v1/studies/[studyId]/navigator/route";
import { extractText, indexDocument } from "@/lib/api/textindex";
import { Fixtures, admin, call, type TestUser } from "./fixtures";

const fx = new Fixtures();
let org: string;
let lead: TestUser, outsider: TestUser, noAccess: TestUser;
let study: { id: string; code: string };
const ids: Record<string, string> = {};
const paths: string[] = [];

async function pdf(text: string) {
  const d = await PDFDocument.create();
  const font = await d.embedFont(StandardFonts.Helvetica);
  d.addPage([600, 800]).drawText(text, { x: 30, y: 760, size: 10, font });
  return d.save();
}
async function docx(text: string) {
  const z = new JSZip();
  z.file("word/document.xml", `<?xml version="1.0"?><w:document xmlns:w="x"><w:body><w:p><w:r><w:t>${text}</w:t></w:r></w:p></w:body></w:document>`);
  return z.generateAsync({ type: "uint8array" });
}
async function seed(key: string, bytes: Uint8Array, name: string, type: string, studyCode = study.code) {
  const hash = createHash("sha256").update(bytes).digest("hex");
  const path = `${org}/${studyCode}/${hash}-${name}`;
  await admin().storage.from("Documents").upload(path, bytes, { contentType: type });
  paths.push(path);
  const { data, error } = await admin().from("documents").insert([{ org_id: org, user_id: lead.id, study_id: studyCode, status: "Approved", approved_at: new Date().toISOString(),
    approved_by: "seed@example.test", artifact_num: "01.01.01", artifact_name: "Trial Master File Plan", custom_file_name: key, file_path: path, file_name: name, file_type: type, file_hash: hash }]).select("*").single();
  if (error) throw error;
  ids[key] = data.id;
  return data;
}
const search = (u: TestUser, q: string, content = true) => call(navigator.POST, { token: u.token, method: "POST", params: { studyId: study.id }, body: { q, content, page_size: 50 } });

beforeAll(async () => {
  org = await fx.org("fts");
  lead = await fx.user("fts-lead", { orgId: org, role: "TMF Lead" });
  noAccess = await fx.user("fts-cra", { orgId: org, role: "CRA" });
  outsider = await fx.user("fts-out", { orgId: await fx.org("fts-b"), role: "System Administrator" });
  study = await fx.study(org, "FTS");
  const other = await fx.study(org, "FTS2");
  await fx.member(org, other.code, noAccess, "CRA");
  for (const d of [
    await seed("pdf", await pdf("The pharmacokinetic sampling schedule requires twelve timepoints after dosing"), "pk.pdf", "application/pdf"),
    await seed("docx", await docx("Monitoring plan covering source data verification at every visit"), "plan.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
    await seed("scan", await (async () => { const d = await PDFDocument.create(); d.addPage([600, 800]); return d.save(); })(), "scan.pdf", "application/pdf"),
  ]) await indexDocument(d, true);
});

afterAll(async () => {
  await admin().from("document_text").delete().eq("org_id", org);
  await admin().storage.from("Documents").remove(paths);
  await admin().from("documents").delete().eq("org_id", org);
  await fx.cleanup();
});

describe("full-text search (NAV-09)", () => {
  it("extracts PDF and Word text; a scan without a text layer is recorded as no text", async () => {
    const { data } = await admin().from("document_text").select("document_id, status, pages").eq("org_id", org);
    const by = Object.fromEntries((data ?? []).map((r) => [r.document_id, r]));
    expect(by[ids.pdf]).toMatchObject({ status: "indexed", pages: 1 });
    expect(by[ids.docx].status).toBe("indexed");
    expect(by[ids.scan].status).toBe("no_text");
    expect((await extractText(new TextEncoder().encode("x"), "a.png", "image/png")).status).toBe("unsupported");
  });

  it("finds a document by words inside it, with a highlighted snippet", async () => {
    const r = await search(lead, "pharmacokinetic timepoints");
    expect(r.status).toBe(200);
    expect(r.body.data.map((x: { document_id: string }) => x.document_id)).toEqual([ids.pdf]);
    expect(r.body.snippets[ids.pdf]).toMatch(/\[\[pharmacokinetic\]\]/);
    expect(r.body.counts.Final).toBe(1);
    const word = await search(lead, "verification");
    expect(word.body.data.map((x: { document_id: string }) => x.document_id)).toEqual([ids.docx]);
  });

  it("title search is unchanged when the option is off", async () => {
    const r = await search(lead, "pharmacokinetic", false);
    expect(r.body.data).toEqual([]);
  });

  it("never reveals documents the caller cannot open", async () => {
    const { data: rpcOut } = await outsider.db.rpc("search_document_text", { p_study: study.id, p_query: "pharmacokinetic" });
    expect(rpcOut ?? []).toEqual([]);
    const { data: rows } = await noAccess.db.from("document_text").select("document_id").eq("org_id", org);
    expect(rows ?? []).toEqual([]);
    expect((await search(outsider, "pharmacokinetic")).status).toBe(404);
  });

  it("users cannot write the index", async () => {
    const { error } = await lead.db.from("document_text").insert([{ document_id: ids.pdf, org_id: org, status: "indexed", content: "forged" }]);
    expect(error).toBeTruthy();
  });
});
