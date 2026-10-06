// Part 14b: document links (LNK-01..03) and signposts (SGN-01..02).
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as links from "@/app/api/v1/documents/[documentId]/links/route";
import * as remove from "@/app/api/v1/document-links/[linkId]/remove/route";
import * as signposts from "@/app/api/v1/studies/[studyId]/signposts/route";
import { pdfPagesText } from "@/lib/api/pdftext";
import { Fixtures, admin, call, type TestUser } from "./fixtures";

const fx = new Fixtures();
let org: string;
let lead: TestUser, outsider: TestUser;
let study: { id: string; code: string };
let other: { id: string; code: string };
const d: Record<string, string> = {};
let artifact: string;

async function doc(key: string, studyCode = study.code) {
  const { data, error } = await admin().from("documents").insert([{ org_id: org, user_id: lead.id, study_id: studyCode, status: "Approved", approved_at: new Date().toISOString(),
    approved_by: "seed@example.test", artifact_num: "02.01.02", artifact_name: "Protocol", custom_file_name: key }]).select("id").single();
  if (error) throw error;
  d[key] = data.id;
}

beforeAll(async () => {
  org = await fx.org("lnk");
  lead = await fx.user("lnk-lead", { orgId: org, role: "TMF Lead" });
  outsider = await fx.user("lnk-out", { orgId: await fx.org("lnk-b"), role: "System Administrator" });
  study = await fx.study(org, "LNK");
  other = await fx.study(org, "LNK2");
  const { error } = await lead.db.rpc("seed_study_tmf_config", { p_study_code: study.code });
  if (error) throw error;
  const { data: a } = await admin().from("tmf_config").select("artifact_num").eq("study_id", study.code).eq("type", "artifact").eq("is_enabled", true).order("artifact_num").limit(1).single();
  artifact = a!.artifact_num;
  for (const k of ["protocol v2", "protocol v3", "amendment 1", "french translation"]) await doc(k);
  await doc("other study", other.code);
});

afterAll(async () => {
  await admin().from("placeholders").delete().eq("org_id", org);
  await fx.cleanup();
});

describe("document links (LNK-01..03)", () => {
  it("adds several links at once; failures are reported per target", async () => {
    const r = await call(links.POST, { token: lead.token, method: "POST", params: { documentId: d["protocol v3"] }, body: { targets: [
      { document_id: d["protocol v2"], link_type: "supersedes" },
      { document_id: d["other study"], link_type: "relates_to" },
      { document_id: d["protocol v3"], link_type: "relates_to" },
    ] } });
    expect(r.status).toBe(201);
    expect(r.body.added).toBe(1);
    expect(r.body.results.filter((x: { ok: boolean }) => !x.ok).map((x: { reason: string }) => x.reason))
      .toEqual(["Both documents must be live documents of this study", "A document cannot link to itself"]);
    const dup = await call(links.POST, { token: lead.token, method: "POST", params: { documentId: d["protocol v3"] }, body: { targets: [{ document_id: d["protocol v2"], link_type: "supersedes" }] } });
    expect(dup.status).toBe(400);
    expect(dup.body.results[0].reason).toBe("This link already exists");
  });

  it("shows typed links in both directions", async () => {
    await call(links.POST, { token: lead.token, method: "POST", params: { documentId: d["amendment 1"] }, body: { targets: [{ document_id: d["protocol v3"], link_type: "amends" }] } });
    const v3 = await call(links.GET, { token: lead.token, params: { documentId: d["protocol v3"] } });
    expect(v3.body.data.map((l: { label: string; title: string }) => `${l.label}: ${l.title}`).sort())
      .toEqual(["amended by: amendment 1 (02.01.02)", "supersedes: protocol v2 (02.01.02)"]);
    const v2 = await call(links.GET, { token: lead.token, params: { documentId: d["protocol v2"] } });
    expect(v2.body.data[0]).toMatchObject({ label: "superseded by", direction: "incoming" });
  });

  it("removing needs a reason, keeps history and is audited; another organisation sees nothing", async () => {
    const v3 = await call(links.GET, { token: lead.token, params: { documentId: d["protocol v3"] } });
    const id = v3.body.data.find((l: { label: string }) => l.label === "amended by").id;
    expect((await call(remove.POST, { token: lead.token, method: "POST", params: { linkId: id }, body: { reason: "x" } })).status).toBe(400);
    expect((await call(remove.POST, { token: lead.token, method: "POST", params: { linkId: id }, body: { reason: "Linked in error" } })).status).toBe(200);
    expect((await call(links.GET, { token: lead.token, params: { documentId: d["protocol v3"] } })).body.data).toHaveLength(1);
    const { data: row } = await admin().from("document_links").select("removed_at, remove_reason").eq("id", id).single();
    expect(row).toMatchObject({ remove_reason: "Linked in error" });
    expect((await call(links.GET, { token: outsider.token, params: { documentId: d["protocol v3"] } })).status).toBe(404);
    const { data: audit } = await admin().from("audit_trail").select("action").eq("org_id", org).like("action", "document_links.%");
    expect(audit!.length).toBeGreaterThanOrEqual(3);
  });
});

describe("signposts (SGN-01..02)", () => {
  let signpostId: string;

  it("files a signpost with a generated page and fulfils the expected document", async () => {
    const { error } = await lead.db.from("placeholders").insert([{ org_id: org, study_id: study.id, artifact_num: artifact, level: "study", title: "Expected" }]);
    if (error) throw error;
    const r = await call(signposts.POST, { token: lead.token, method: "POST", params: { studyId: study.id },
      body: { artifact_num: artifact, title: "Wet-ink protocol signature page", reference: "Sponsor archive, Basel, box 14" } });
    expect(r.status, JSON.stringify(r.body)).toBe(201);
    signpostId = r.body.document_id;
    const { data: doc } = await admin().from("documents").select("signpost, signpost_reference, status, file_path").eq("id", signpostId).single();
    expect(doc).toMatchObject({ signpost: true, signpost_reference: "Sponsor archive, Basel, box 14", status: "Draft" });
    const { data: blob } = await admin().storage.from("Documents").download(doc!.file_path!);
    const text = (await pdfPagesText(new Uint8Array(await blob!.arrayBuffer()))).join(" ");
    expect(text).toContain("Sponsor archive, Basel, box 14");
    const { data: p } = await admin().from("placeholders").select("status, document_id").eq("org_id", org).single();
    expect(p).toMatchObject({ status: "fulfilled", document_id: signpostId });
  });

  it("signpost status and reference are irreversible and can't be set directly", async () => {
    const { error: undo } = await lead.db.from("documents").update({ signpost: false }).eq("id", signpostId);
    expect(undo?.message).toMatch(/cannot be changed|irreversible/);
    const { error: forge } = await lead.db.from("documents").update({ signpost: true, signpost_reference: "x" }).eq("id", d["protocol v2"]);
    expect(forge?.message).toMatch(/cannot be changed/);
    const { data: item, error: iErr } = await lead.db.from("intake_items").insert([{ study_id: study.id, file_path: `${org}/${study.code}/${"c".repeat(64)}.pdf`, file_name: "x.pdf", file_hash: "c".repeat(64) }]).select("id, signpost_reference").single();
    if (iErr) throw iErr;
    expect(item!.signpost_reference).toBeNull();
    const { error: tag } = await lead.db.from("intake_items").update({ signpost_reference: "Somewhere" }).eq("id", item!.id);
    expect(tag?.message).toMatch(/Add signpost/);
  });
});
