// Part 6: Navigator (M04) and document access for the viewer (M07).
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as nav from "@/app/api/v1/studies/[studyId]/navigator/route";
import * as tree from "@/app/api/v1/studies/[studyId]/navigator/tree/route";
import * as exp from "@/app/api/v1/studies/[studyId]/navigator/export/route";
import * as docRoute from "@/app/api/v1/documents/[documentId]/route";
import * as access from "@/app/api/v1/documents/[documentId]/access/route";
import * as del from "@/app/api/v1/documents/[documentId]/delete/route";
import { Fixtures, admin, apiRequest, call, type TestUser } from "./fixtures";

const fx = new Fixtures();
let orgA: string;
let lead: TestUser;        // TMF Lead: sees all studies of the org
let auditor: TestUser;     // member of the study, read-only
let stranger: TestUser;    // same org, Auditor, not a member of the study
let outsider: TestUser;    // another org
let study: { id: string; code: string };
let otherStudy: { id: string; code: string };
let countryUS: string, countryDE: string, siteUS1: string, otherSite: string;
let enabledCount: number;
const docIds: string[] = [];
const filePath = () => `${orgA}/${study.code}/nav-${fx.runId}.pdf`;
const docs: Record<string, string> = {};

const sp = () => ({ studyId: study.id });
const query = (u: TestUser, body: Record<string, unknown> = {}) =>
  call(nav.POST, { token: u.token, method: "POST", params: sp(), body });

async function addDoc(key: string, fields: Record<string, unknown>) {
  const { data, error } = await admin().from("documents").insert([{
    org_id: orgA, user_id: lead.id, study_id: study.code, status: "Draft", ...fields,
  }]).select("id, study_country_id, updated_at").single();
  if (error) throw error;
  docIds.push(data.id);
  docs[key] = data.id;
  return data;
}

beforeAll(async () => {
  orgA = await fx.org("nav");
  lead = await fx.user("nav-lead", { orgId: orgA, role: "TMF Lead" });
  auditor = await fx.user("nav-auditor", { orgId: orgA, role: "Auditor" });
  stranger = await fx.user("nav-stranger", { orgId: orgA, role: "Auditor" });
  outsider = await fx.user("nav-outsider", { orgId: (await fx.org("nav-b")), role: "System Administrator" });
  study = await fx.study(orgA, "NAV");
  otherStudy = await fx.study(orgA, "NAV2");
  await fx.member(orgA, study.code, auditor, "Auditor");
  const { error } = await lead.db.rpc("seed_study_tmf_config", { p_study_code: study.code });
  if (error) throw error;
  const { count } = await admin().from("tmf_config").select("id", { count: "exact", head: true })
    .eq("study_id", study.code).eq("type", "artifact").eq("is_enabled", true);
  enabledCount = count!;

  const a = admin();
  const { data: party } = await a.from("parties").insert([{ org_id: orgA, party_type: "site", name: `Site ${fx.runId}` }]).select("id").single();
  const { data: cs } = await a.from("study_countries").insert([
    { org_id: orgA, study_id: study.id, country_code: "US" },
    { org_id: orgA, study_id: study.id, country_code: "DE" },
    { org_id: orgA, study_id: otherStudy.id, country_code: "FR" },
  ]).select("id, country_code, study_id");
  countryUS = cs!.find((c) => c.country_code === "US")!.id;
  countryDE = cs!.find((c) => c.country_code === "DE")!.id;
  const countryFR = cs!.find((c) => c.country_code === "FR")!.id;
  const { data: ss, error: sErr } = await a.from("study_sites").insert([
    { org_id: orgA, study_id: study.id, study_country_id: countryUS, site_number: "101", site_party_id: party!.id, display_name: "Atlanta Clinic" },
    { org_id: orgA, study_id: otherStudy.id, study_country_id: countryFR, site_number: "900", site_party_id: party!.id, display_name: "Paris" },
  ]).select("id, site_number");
  if (sErr) throw sErr;
  siteUS1 = ss!.find((s) => s.site_number === "101")!.id;
  otherSite = ss!.find((s) => s.site_number === "900")!.id;

  const { error: upErr } = await lead.db.storage.from("Documents").upload(filePath(), new Blob(["%PDF-1.4 nav"], { type: "application/pdf" }));
  if (upErr) throw upErr;
  fx.trackFile("Documents", filePath());

  await addDoc("protocol", { artifact_num: "02.01.02", artifact_name: "Protocol", custom_file_name: "Protocol v1", status: "Approved", file_path: filePath(), file_name: "protocol.pdf", file_type: "application/pdf", version: "1.0" });
  await addDoc("plan", { artifact_num: "01.01.01", artifact_name: "Trial Master File Plan", custom_file_name: "TMF Plan", status: "Under Review" });
  await addDoc("cv", { artifact_num: "05.02.07", artifact_name: "Curriculum Vitae", custom_file_name: "=CV Dr Smith", study_site_id: siteUS1, owner: "CRA Jones" });
  await addDoc("de", { artifact_num: "03.01.01", artifact_name: "Regulatory Submission", custom_file_name: "DE submission", study_country_id: countryDE, status: "Approved" });
  await addDoc("old", { artifact_num: "02.01.02", artifact_name: "Protocol", custom_file_name: "Protocol v0", status: "Archived", archived_at: new Date().toISOString() });
});

afterAll(async () => {
  if (docIds.length) await admin().from("documents").delete().in("id", docIds);
  await fx.cleanup();
});

describe("TMF level", () => {
  it("a site brings its own country", async () => {
    const { data } = await admin().from("documents").select("study_country_id, updated_at").eq("id", docs.cv).single();
    expect(data!.study_country_id).toBe(countryUS);
    expect(data!.updated_at).toBeTruthy();
  });

  it("rejects a site or country from another study", async () => {
    const site = await admin().from("documents").insert([{ org_id: orgA, study_id: study.code, status: "Draft", study_site_id: otherSite }]).select("id");
    expect(site.error?.message).toMatch(/site that belongs to this study/);
    const { data: fr } = await admin().from("study_countries").select("id").eq("study_id", otherStudy.id).single();
    const country = await admin().from("documents").insert([{ org_id: orgA, study_id: study.code, status: "Draft", study_country_id: fr!.id }]).select("id");
    expect(country.error?.message).toMatch(/country that belongs to this study/);
  });

  it("stamps updated_at on every change", async () => {
    const before = (await admin().from("documents").select("updated_at").eq("id", docs.plan).single()).data!.updated_at;
    await new Promise((r) => setTimeout(r, 20));
    await lead.db.from("documents").update({ owner: "Lead" }).eq("id", docs.plan);
    const after = (await admin().from("documents").select("updated_at").eq("id", docs.plan).single()).data!.updated_at;
    expect(new Date(after).getTime()).toBeGreaterThan(new Date(before).getTime());
  });
});

describe("navigator query", () => {
  it("needs a session and hides the study from other orgs and non-members", async () => {
    expect((await call(nav.POST, { method: "POST", params: sp(), body: {} })).status).toBe(401);
    expect((await query(outsider)).status).toBe(404);
    expect((await query(stranger)).status).toBe(404);
  });

  it("returns live documents plus one Missing row per enabled artifact without a document", async () => {
    const r = await query(auditor, { page_size: 200 });
    expect(r.status).toBe(200);
    const filedArtifacts = new Set(["02.01.02", "01.01.01", "05.02.07", "03.01.01"]);
    expect(r.body.counts).toEqual({ Missing: enabledCount - filedArtifacts.size, Expected: 0, Incomplete: 0, "Under Revision": 2, Final: 2 });
    expect(r.body.total).toBe(enabledCount - filedArtifacts.size + 4);
    // The archived version is history, not current.
    expect(r.body.data.some((x: { row_id: string }) => x.row_id === docs.old)).toBe(false);
  });

  it("tile counts equal the rows the tile returns", async () => {
    const all = await query(lead, { page_size: 1 });
    for (const status of ["Missing", "Under Revision", "Final"]) {
      const r = await query(lead, { status, page_size: 1 });
      expect(r.body.total).toBe(all.body.counts[status]);
      expect(r.body.counts).toEqual(all.body.counts);
    }
  });

  it("filters by tree chips (AND), TMF level and index", async () => {
    const us = await query(lead, { chips: [{ field: "country", value: countryUS }] });
    expect(us.body.data.map((x: { row_id: string }) => x.row_id)).toEqual([docs.cv]);
    const zone2Final = await query(lead, { chips: [{ field: "zone", value: "02" }], status: "Final" });
    expect(zone2Final.body.data.map((x: { row_id: string }) => x.row_id)).toEqual([docs.protocol]);
    const both = await query(lead, { chips: [{ field: "zone", value: "02" }, { field: "country", value: countryUS }] });
    expect(both.body.total).toBe(0);
    const country = await query(lead, { level: "Country" });
    expect(country.body.data.map((x: { row_id: string }) => x.row_id)).toEqual([docs.de]);
    const hist = await query(lead, { chips: [{ field: "artifact", value: "02.01.02" }], index: "historical" });
    expect(hist.body.data.map((x: { row_id: string }) => x.row_id).sort()).toEqual([docs.protocol, docs.old].sort());
  });

  it("searches titles and applies filter rules", async () => {
    // Missing placeholders are searchable too (their title is the artifact name, e.g. "Protocol Synopsis").
    const q = await query(lead, { q: "protocol" });
    type Row = { row_id: string; kind: string; title: string };
    expect(q.body.data.filter((x: Row) => x.kind === "document").map((x: Row) => x.row_id)).toEqual([docs.protocol]);
    expect(q.body.data.every((x: Row) => /protocol/i.test(x.title))).toBe(true);
    expect(q.body.data.some((x: Row) => x.kind === "missing")).toBe(true);
    const owner = await query(lead, { rules: [{ column: "owner", op: "contains", value: "jones" }] });
    expect(owner.body.data.map((x: { row_id: string }) => x.row_id)).toEqual([docs.cv]);
    const hasSite = await query(lead, { rules: [{ column: "site", op: "not_empty" }] });
    expect(hasSite.body.total).toBe(1);
    const wildcard = await query(lead, { q: "%" });
    expect(wildcard.body.total).toBe(0);
    const bad = await query(lead, { rules: [{ column: "modified", op: "contains", value: "x" }] });
    expect(bad.status).toBe(400);
    const sql = await query(lead, { sort: { column: "title; drop table documents", dir: "asc" } });
    expect(sql.status).toBe(400);
  });

  it("sorts and pages with a stable order", async () => {
    const p1 = await query(lead, { sort: { column: "type", dir: "asc" }, page: 1, page_size: 5 });
    const p2 = await query(lead, { sort: { column: "type", dir: "asc" }, page: 2, page_size: 5 });
    expect(p1.body.data).toHaveLength(5);
    const ids = new Set([...p1.body.data, ...p2.body.data].map((x: { row_id: string }) => x.row_id));
    expect(ids.size).toBe(10);
  });
});

describe("navigator tree", () => {
  it("builds My Trial and taxonomy trees from data", async () => {
    const r = await call(tree.GET, { token: auditor.token, params: sp() });
    expect(r.status).toBe(200);
    const countries = r.body.my_trial.children;
    expect(countries.map((c: { label: string }) => c.label)).toEqual(["DE", "US"]);
    expect(countries[1].children[0]).toMatchObject({ field: "site", value: siteUS1, label: "101 — Atlanta Clinic" });
    expect(r.body.taxonomy.label).toMatch(/TMF Reference Model/);
    const zone1 = r.body.taxonomy.nodes[0];
    expect(zone1).toMatchObject({ field: "zone", value: "01" });
    expect(zone1.children[0].children[0]).toMatchObject({ field: "artifact", value: "01.01.01" });
    expect((await call(tree.GET, { token: outsider.token, params: sp() })).status).toBe(404);
  });
});

describe("export", () => {
  it("exports selected rows as CSV, neutralises formulas, and audits it", async () => {
    const res = await exp.POST(apiRequest("/x", {
      method: "POST", token: lead.token, headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [docs.cv, docs.protocol] }),
    }), { params: Promise.resolve(sp()) });
    expect(res.status).toBe(200);
    const text = await res.text();
    const lines = text.replace(/^﻿/, "").split("\r\n");
    expect(lines[0]).toMatch(/^Status,Current Activity,Document Type/);
    expect(lines).toHaveLength(3);
    expect(text).toContain("'=CV Dr Smith");
    const { data: audit } = await admin().from("audit_trail").select("new_value").eq("org_id", orgA).eq("action", "Navigator export");
    expect(audit!.map((a) => a.new_value)).toContain("2 rows (selected)");
  });
});

describe("document metadata and file access", () => {
  const dp = (id: string) => ({ documentId: id });

  it("returns metadata with TMF level, without the storage path", async () => {
    const r = await call(docRoute.GET, { token: auditor.token, params: dp(docs.cv) });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ tmf_level: "Site", country_code: "US", site_number: "101", has_file: false });
    expect(r.body.file_path).toBeUndefined();
    expect((await call(docRoute.GET, { token: outsider.token, params: dp(docs.cv) })).status).toBe(404);
  });

  it("issues a short-lived link that works, and audits downloads", async () => {
    const r = await call(access.POST, { token: auditor.token, method: "POST", params: dp(docs.protocol), body: { purpose: "view" } });
    expect(r.status).toBe(200);
    expect(r.body.expires_in).toBe(60);
    expect(await (await fetch(r.body.url)).text()).toBe("%PDF-1.4 nav");

    const d = await call(access.POST, { token: auditor.token, method: "POST", params: dp(docs.protocol), body: { purpose: "download" } });
    expect(d.body.file_name).toBe("Protocol v1.pdf");
    const { data: audit } = await admin().from("audit_trail").select("action, user_id").eq("document_id", docs.protocol);
    expect(audit).toEqual(expect.arrayContaining([{ action: "Document downloaded", user_id: auditor.id }]));
    expect(audit!.some((a) => a.action === "Document viewed")).toBe(false);
  });

  it("refuses documents without a file or out of reach", async () => {
    expect((await call(access.POST, { token: lead.token, method: "POST", params: dp(docs.plan), body: { purpose: "view" } })).status).toBe(404);
    expect((await call(access.POST, { token: outsider.token, method: "POST", params: dp(docs.protocol), body: { purpose: "view" } })).status).toBe(404);
    expect((await call(access.POST, { token: stranger.token, method: "POST", params: dp(docs.protocol), body: { purpose: "view" } })).status).toBe(404);
  });
});

describe("delete from the navigator", () => {
  it("needs delete_document and a reason, then drops the row from the grid", async () => {
    const dp = { documentId: docs.plan };
    expect((await call(del.POST, { token: auditor.token, method: "POST", params: dp, body: { reason: "duplicate" } })).status).toBe(403);
    expect((await call(del.POST, { token: lead.token, method: "POST", params: dp, body: {} })).status).toBe(400);
    const r = await call(del.POST, { token: lead.token, method: "POST", params: dp, body: { reason: "Uploaded twice" } });
    expect(r.status).toBe(200);
    const { data } = await admin().from("documents").select("status, deleted_by_id, deletion_reason").eq("id", docs.plan).single();
    expect(data).toEqual({ status: "Deleted", deleted_by_id: lead.id, deletion_reason: "Uploaded twice" });
    const after = await query(lead, { chips: [{ field: "artifact", value: "01.01.01" }] });
    expect(after.body.data.map((x: { kind: string }) => x.kind)).toEqual(["missing"]);
  });
});
