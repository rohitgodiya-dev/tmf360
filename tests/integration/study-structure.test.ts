import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as parties from "@/app/api/v1/parties/route";
import * as partyById from "@/app/api/v1/parties/[id]/route";
import * as persons from "@/app/api/v1/persons/route";
import * as structure from "@/app/api/v1/studies/[studyId]/structure/route";
import * as countries from "@/app/api/v1/studies/[studyId]/countries/route";
import * as countryById from "@/app/api/v1/studies/[studyId]/countries/[countryId]/route";
import * as sites from "@/app/api/v1/studies/[studyId]/sites/route";
import * as siteById from "@/app/api/v1/studies/[studyId]/sites/[siteId]/route";
import * as studyParties from "@/app/api/v1/studies/[studyId]/parties/route";
import * as contacts from "@/app/api/v1/studies/[studyId]/contacts/route";
import * as contactById from "@/app/api/v1/studies/[studyId]/contacts/[contactId]/route";
import * as contactRoleTypes from "@/app/api/v1/contact-role-types/route";
import { PERMISSIONS } from "@/lib/permissions";
import { Fixtures, admin, call, type TestUser } from "./fixtures";

const fx = new Fixtures();
let orgA: string;
let orgB: string;
let adminA: TestUser;
let craA: TestUser;
let adminB: TestUser;
let studyA: { id: string; code: string };
let studyA2: { id: string; code: string };
let studyB: { id: string; code: string };

beforeAll(async () => {
  orgA = await fx.org("struct-a");
  orgB = await fx.org("struct-b");
  adminA = await fx.user("s-admin-a", { orgId: orgA, role: "System Administrator" });
  craA = await fx.user("s-cra-a", { orgId: orgA, role: "CRA" });
  adminB = await fx.user("s-admin-b", { orgId: orgB, role: "System Administrator" });
  studyA = await fx.study(orgA, "A");
  studyA2 = await fx.study(orgA, "A2");
  studyB = await fx.study(orgB, "B");
  await fx.member(orgA, studyA.code, craA, "CRA");
});
afterAll(() => fx.cleanup());

const p = <E extends Record<string, string> = Record<never, never>>(studyId: string, extra?: E) =>
  ({ studyId, ...extra }) as { studyId: string } & E;

describe("directory: parties and persons", () => {
  it("an admin can add an organisation", async () => {
    const r = await call(parties.POST, { token: adminA.token, method: "POST", body: { party_type: "sponsor", name: "Acme Pharma", country_code: "US" } });
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ name: "Acme Pharma", org_id: orgA, row_version: 1 });
  });

  it("a CRA cannot manage the directory", async () => {
    const r = await call(parties.POST, { token: craA.token, method: "POST", body: { party_type: "vendor", name: "Lab Co" } });
    expect(r.status).toBe(403);
  });

  it("rejects duplicates and bad values", async () => {
    const dup = await call(parties.POST, { token: adminA.token, method: "POST", body: { party_type: "sponsor", name: "ACME PHARMA" } });
    expect(dup.status).toBe(409);
    const bad = await call(parties.POST, { token: adminA.token, method: "POST", body: { party_type: "sponsor", name: "X", country_code: "usa" } });
    expect(bad.status).toBe(400);
    expect(bad.body.error.details[0].path).toBe("country_code");
  });

  it("organisations are invisible to other tenants", async () => {
    const r = await call(parties.GET, { token: adminB.token });
    expect(r.status).toBe(200);
    expect(r.body.data.some((x: { name: string }) => x.name === "Acme Pharma")).toBe(false);
  });

  it("the client cannot choose the tenant", async () => {
    const { data, error } = await adminA.db.from("parties")
      .insert([{ org_id: orgB, party_type: "vendor", name: `Sneaky ${fx.runId}` }]).select("org_id").single();
    expect(error).toBeNull();
    expect(data?.org_id).toBe(orgA);
  });

  it("people: duplicate email in the same org is rejected", async () => {
    const email = `pi-${fx.runId}@example.test`;
    const first = await call(persons.POST, { token: adminA.token, method: "POST", body: { given_name: "Jane", family_name: "Doe", email } });
    expect(first.status).toBe(201);
    const again = await call(persons.POST, { token: adminA.token, method: "POST", body: { given_name: "J", family_name: "D", email: email.toUpperCase() } });
    expect(again.status).toBe(409);
  });

  it("updates use optimistic locking", async () => {
    const created = await call(parties.POST, { token: adminA.token, method: "POST", body: { party_type: "cro", name: "CRO One" } });
    const id = created.body.id;
    const ok = await call(partyById.PATCH, { token: adminA.token, method: "PATCH", params: { id }, body: { row_version: 1, name: "CRO One Ltd" } });
    expect(ok.status).toBe(200);
    expect(ok.body.row_version).toBe(2);
    const stale = await call(partyById.PATCH, { token: adminA.token, method: "PATCH", params: { id }, body: { row_version: 1, name: "Overwrite" } });
    expect(stale.status).toBe(409);
    const missing = await call(partyById.PATCH, { token: adminA.token, method: "PATCH", params: { id: randomUUID() }, body: { row_version: 1, name: "x" } });
    expect(missing.status).toBe(404);
  });
});

describe("study structure", () => {
  let siteParty: string;
  let foreignParty: string;
  let person: string;
  let countryUS: string;
  let site: { id: string; row_version: number };

  beforeAll(async () => {
    siteParty = (await call(parties.POST, { token: adminA.token, method: "POST", body: { party_type: "site", name: "North Georgia Clin Research", country_code: "US" } })).body.id;
    foreignParty = (await call(parties.POST, { token: adminB.token, method: "POST", body: { party_type: "site", name: "Other Org Site" } })).body.id;
    person = (await call(persons.POST, { token: adminA.token, method: "POST", body: { given_name: "James", family_name: "Mastriano" } })).body.id;
  });

  it("adds a country, and rejects the same country twice", async () => {
    const r = await call(countries.POST, { token: adminA.token, method: "POST", params: p(studyA.id), body: { country_code: "US" } });
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ country_code: "US", status: "startup", org_id: orgA });
    countryUS = r.body.id;
    const dup = await call(countries.POST, { token: adminA.token, method: "POST", params: p(studyA.id), body: { country_code: "US" } });
    expect(dup.status).toBe(409);
  });

  it("adds a site in that country", async () => {
    const r = await call(sites.POST, {
      token: adminA.token, method: "POST", params: p(studyA.id),
      body: { study_country_id: countryUS, site_number: "1121", site_party_id: siteParty, display_name: "North Georgia Clin Research" },
    });
    expect(r.status).toBe(201);
    expect(r.body.status).toBe("identified");
    site = r.body;
  });

  it("rejects a site using another org's institution", async () => {
    const r = await call(sites.POST, {
      token: adminA.token, method: "POST", params: p(studyA.id),
      body: { study_country_id: countryUS, site_number: "9999", site_party_id: foreignParty, display_name: "X" },
    });
    expect(r.status).toBe(400);
  });

  it("rejects a site whose country belongs to a different study", async () => {
    const r = await call(sites.POST, {
      token: adminA.token, method: "POST", params: p(studyA2.id),
      body: { study_country_id: countryUS, site_number: "2001", site_party_id: siteParty, display_name: "X" },
    });
    expect(r.status).toBe(400);
  });

  it("links an organisation to the study and adds a PI at the site", async () => {
    const sponsor = (await call(parties.GET, { token: adminA.token })).body.data.find((x: { name: string }) => x.name === "Acme Pharma");
    const link = await call(studyParties.POST, { token: adminA.token, method: "POST", params: p(studyA.id), body: { party_id: sponsor.id, role: "sponsor" } });
    expect(link.status).toBe(201);
    const pi = await call(contacts.POST, {
      token: adminA.token, method: "POST", params: p(studyA.id),
      body: { person_id: person, scope_type: "site", scope_id: site.id, role_code: "PI" },
    });
    expect(pi.status).toBe(201);
  });

  it("rejects a contact scoped to another study's site", async () => {
    const r = await call(contacts.POST, {
      token: adminA.token, method: "POST", params: p(studyA2.id),
      body: { person_id: person, scope_type: "site", scope_id: site.id, role_code: "PI" },
    });
    expect(r.status).toBe(400);
  });

  it("returns the study as a tree", async () => {
    const r = await call(structure.GET, { token: adminA.token, params: p(studyA.id) });
    expect(r.status).toBe(200);
    expect(r.body.study.study_id).toBe(studyA.code);
    expect(r.body.parties[0].party.name).toBe("Acme Pharma");
    const us = r.body.countries.find((c: { country_code: string }) => c.country_code === "US");
    expect(us.sites).toHaveLength(1);
    expect(us.sites[0].site_number).toBe("1121");
    expect(us.sites[0].contacts[0]).toMatchObject({ role_code: "PI", person: { family_name: "Mastriano" } });
  });

  it("a study member without edit rights can read but not change it", async () => {
    const read = await call(structure.GET, { token: craA.token, params: p(studyA.id) });
    expect(read.status).toBe(200);
    const write = await call(countries.POST, { token: craA.token, method: "POST", params: p(studyA.id), body: { country_code: "CA" } });
    expect(write.status).toBe(403);
  });

  it("other organisations get 404, as do unknown and malformed ids", async () => {
    expect((await call(structure.GET, { token: adminB.token, params: p(studyA.id) })).status).toBe(404);
    expect((await call(structure.GET, { token: adminA.token, params: p(studyB.id) })).status).toBe(404);
    expect((await call(structure.GET, { token: adminA.token, params: p(randomUUID()) })).status).toBe(404);
    expect((await call(structure.GET, { token: adminA.token, params: p("not-a-uuid") })).status).toBe(404);
    expect((await call(countries.POST, { token: adminB.token, method: "POST", params: p(studyA.id), body: { country_code: "GB" } })).status).toBe(404);
  });

  it("a site status change needs a reason and is audited with before/after values", async () => {
    const noReason = await call(siteById.PATCH, {
      token: adminA.token, method: "PATCH", params: p(studyA.id, { siteId: site.id }),
      body: { row_version: site.row_version, status: "selected" },
    });
    expect(noReason.status).toBe(400);

    const ok = await call(siteById.PATCH, {
      token: adminA.token, method: "PATCH", params: p(studyA.id, { siteId: site.id }),
      body: { row_version: site.row_version, status: "selected", change_reason: "Feasibility approved" },
    });
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ status: "selected", row_version: 2, updated_by: adminA.id });

    const { data: entries } = await adminA.db.from("audit_trail")
      .select("action, study_id, old_value, new_value, signature_reason, record_hash")
      .eq("field_changed", `study_sites:${site.id}`)
      .eq("action", "study_sites.update");
    expect(entries).toHaveLength(1);
    expect(entries![0]).toMatchObject({ study_id: studyA.code, signature_reason: "Feasibility approved" });
    expect(JSON.parse(entries![0].old_value)).toEqual({ status: "identified" });
    expect(JSON.parse(entries![0].new_value)).toEqual({ status: "selected" });
    expect(entries![0].record_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("a country status change needs a reason", async () => {
    const r = await call(countryById.PATCH, {
      token: adminA.token, method: "PATCH", params: p(studyA.id, { countryId: countryUS }),
      body: { row_version: 1, status: "ongoing" },
    });
    expect(r.status).toBe(400);
  });

  it("ends a contact role instead of deleting it", async () => {
    const tree = (await call(structure.GET, { token: adminA.token, params: p(studyA.id) })).body;
    const pi = tree.countries[0].sites[0].contacts[0];
    const r = await call(contactById.PATCH, {
      token: adminA.token, method: "PATCH", params: p(studyA.id, { contactId: pi.id }),
      body: { row_version: pi.row_version, end_date: "2099-12-31", change_reason: "PI moved institution" },
    });
    expect(r.status).toBe(200);
    expect(r.body.end_date).toBe("2099-12-31");
  });

  // Direct table reads, bypassing the API: row-level security alone must hide other tenants' rows.
  it.each(["study_countries", "study_sites", "contact_roles", "study_parties"])(
    "another org cannot read %s rows directly",
    async (table) => {
      const { data: own } = await adminA.db.from(table).select("id").eq("study_id", studyA.id);
      expect(own!.length).toBeGreaterThan(0); // the data exists, so an empty result below means "hidden"
      const { data } = await adminB.db.from(table).select("id").eq("study_id", studyA.id);
      expect(data).toHaveLength(0);
    },
  );

  it("another org cannot add rows to this study directly", async () => {
    const { error } = await adminB.db.from("study_countries").insert([{ study_id: studyA.id, country_code: "FR" }]);
    expect(error).not.toBeNull();
  });

  it("structure rows cannot be hard-deleted or moved to another study", async () => {
    await adminA.db.from("study_sites").delete().eq("id", site.id);
    const { data } = await adminA.db.from("study_sites").select("id").eq("id", site.id);
    expect(data).toHaveLength(1);
    const { error } = await adminA.db.from("study_sites").update({ study_id: studyA2.id }).eq("id", site.id);
    expect(error).not.toBeNull();
  });
});

describe("configuration", () => {
  it("lists contact role types for signed-in users only", async () => {
    const r = await call(contactRoleTypes.GET, { token: craA.token });
    expect(r.status).toBe(200);
    expect(r.body.data).toContainEqual({ code: "PI", label: "Principal Investigator" });
    expect((await call(contactRoleTypes.GET, {})).status).toBe(401);
  });

  it("the database role/permission matrix matches lib/permissions.ts", async () => {
    const { data, error } = await admin().from("role_permissions").select("role, permission");
    expect(error).toBeNull();
    const fromDb = new Set(data!.map((r) => `${r.permission}:${r.role}`));
    const fromCode = new Set(Object.entries(PERMISSIONS).flatMap(([perm, roles]) => roles.map((r) => `${perm}:${r}`)));
    expect([...fromDb].sort()).toEqual([...fromCode].sort());
  });

  it("new roles get can_delete from their role, not a blanket default", async () => {
    const { data } = await admin().from("user_roles").select("user_id, can_delete").in("user_id", [adminA.id, craA.id]);
    const byUser = Object.fromEntries(data!.map((r) => [r.user_id, r.can_delete]));
    expect(byUser[adminA.id]).toBe(true);
    expect(byUser[craA.id]).toBe(false);
  });
});
