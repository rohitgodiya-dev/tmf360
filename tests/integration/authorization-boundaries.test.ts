// Part 13 — authorization boundary (negative) testing (Baseline section 3.1 + section 17): for each
// persona that must not see the study, every channel must refuse without revealing anything —
// records, counts, completeness, exports, reports, risk, AI output, inspections, imports, audit trail.
// Personas: removed user (deactivated), same-organisation user without study access, other organisation.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as navigator from "@/app/api/v1/studies/[studyId]/navigator/route";
import * as navExport from "@/app/api/v1/studies/[studyId]/navigator/export/route";
import * as health from "@/app/api/v1/studies/[studyId]/health/route";
import * as findings from "@/app/api/v1/studies/[studyId]/findings/route";
import * as risk from "@/app/api/v1/studies/[studyId]/risk/route";
import * as oversight from "@/app/api/v1/studies/[studyId]/oversight/route";
import * as reports from "@/app/api/v1/studies/[studyId]/reports/[report]/route";
import * as exportsRoute from "@/app/api/v1/studies/[studyId]/exports/route";
import * as inspections from "@/app/api/v1/studies/[studyId]/inspections/route";
import * as archive from "@/app/api/v1/studies/[studyId]/archive/route";
import * as aiLog from "@/app/api/v1/studies/[studyId]/ai-recommendations/route";
import * as imports from "@/app/api/v1/studies/[studyId]/imports/route";
import * as tasks from "@/app/api/v1/studies/[studyId]/tasks/route";
import * as intake from "@/app/api/v1/studies/[studyId]/intake/route";
import * as docRoute from "@/app/api/v1/documents/[documentId]/route";
import * as access from "@/app/api/v1/documents/[documentId]/access/route";
import { Fixtures, admin, apiRequest, call, type TestUser } from "./fixtures";

const fx = new Fixtures();
let org: string;
let lead: TestUser, removed: TestUser, noAccess: TestUser, outsider: TestUser;
let study: { id: string; code: string };
let other: { id: string; code: string };
let docId: string;

type H = (req: Request, ctx: { params: Promise<any> }) => Promise<Response>; // eslint-disable-line @typescript-eslint/no-explicit-any
const channels: [string, H, string, unknown?][] = [
  ["navigator", navigator.POST as H, "POST", { page_size: 50 }],
  ["navigator export", navExport.POST as H, "POST", { format: "csv" }],
  ["health", health.GET as H, "GET"],
  ["findings", findings.GET as H, "GET"],
  ["risk", risk.GET as H, "GET"],
  ["oversight", oversight.GET as H, "GET"],
  ["export jobs", exportsRoute.GET as H, "GET"],
  ["inspections", inspections.GET as H, "GET"],
  ["archive", archive.GET as H, "GET"],
  ["AI log", aiLog.GET as H, "GET"],
  ["imports", imports.GET as H, "GET"],
  ["tasks", tasks.GET as H, "GET"],
  ["intake", intake.GET as H, "GET"],
];

async function hit(u: TestUser, h: H, method: string, body: unknown, params: Record<string, string>) {
  const res = await h(apiRequest("/x", { token: u.token, method, body: body === undefined ? undefined : JSON.stringify(body), headers: body === undefined ? undefined : { "Content-Type": "application/json" } }),
    { params: Promise.resolve(params) });
  const text = await res.text();
  return { status: res.status, text };
}

beforeAll(async () => {
  org = await fx.org("azb");
  lead = await fx.user("azb-lead", { orgId: org, role: "TMF Lead" });
  removed = await fx.user("azb-removed", { orgId: org, role: "TMF Lead" });
  noAccess = await fx.user("azb-noaccess", { orgId: org, role: "CRA" });
  outsider = await fx.user("azb-out", { orgId: await fx.org("azb-b"), role: "System Administrator" });
  study = await fx.study(org, "AZB");
  other = await fx.study(org, "AZB2");
  await fx.member(org, other.code, noAccess, "CRA");   // a member of a different study only
  const { data, error } = await admin().from("documents").insert([{ org_id: org, user_id: lead.id, study_id: study.code, status: "Approved", approved_at: new Date().toISOString(),
    approved_by: "seed@example.test", artifact_num: "01.01.01", artifact_name: "Trial Master File Plan", custom_file_name: "SECRET-TITLE-AZB", file_path: `azb/${fx.runId}/plan.pdf` }]).select("id").single();
  if (error) throw error;
  docId = data.id;
  await admin().from("user_roles").update({ is_active: false }).eq("user_id", removed.id);
});

afterAll(async () => {
  await admin().from("documents").delete().eq("org_id", org);
  await fx.cleanup();
});

describe("authorization boundaries by persona (AZB-01..12)", () => {
  for (const [persona, user] of [["removed user", () => removed], ["no study access", () => noAccess], ["other organisation", () => outsider]] as const) {
    it(`${persona}: every study channel refuses and reveals nothing`, async () => {
      for (const [name, h, method, body] of channels) {
        const r = await hit(user(), h, method, body, { studyId: study.id });
        expect([401, 403, 404], `${persona} → ${name}: ${r.status} ${r.text.slice(0, 120)}`).toContain(r.status);
        expect(r.text, `${persona} → ${name} leaked the title`).not.toContain("SECRET-TITLE-AZB");
      }
      for (const key of ["document-activities", "timeliness", "risk-score"]) {
        const r = await hit(user(), reports.GET as H, "GET", undefined, { studyId: study.id, report: key });
        expect([401, 403, 404], `${persona} → report ${key}`).toContain(r.status);
      }
    });

    it(`${persona}: the document, its file link and its audit rows are not reachable`, async () => {
      expect([401, 403, 404]).toContain((await hit(user(), docRoute.GET as H, "GET", undefined, { documentId: docId })).status);
      expect([401, 403, 404]).toContain((await hit(user(), access.POST as H, "POST", { purpose: "view" }, { documentId: docId })).status);
      const { data: rows } = await user().db.from("documents").select("id").eq("id", docId);
      expect(rows ?? []).toEqual([]);
      const { data: audit } = await user().db.from("audit_trail").select("id").eq("document_id", docId);
      expect(audit ?? []).toEqual([]);
      const { data: nav } = await user().db.from("navigator_items").select("row_id").eq("study_code", study.code);
      expect(nav ?? []).toEqual([]);
    });
  }

  it("control: the study lead sees the same channels", async () => {
    for (const [name, h, method, body] of channels) {
      const r = await hit(lead, h, method, body, { studyId: study.id });
      expect(r.status, name).toBeLessThan(300);
    }
  });
});
