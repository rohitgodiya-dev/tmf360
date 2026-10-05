// End-to-end Inspection Mode (Part 11a): real browser, DEV Supabase only. Two browser contexts:
// the study team (signed in) and the inspector (no account, link + access code).
// Usage: start `next dev -p 3100` with .env.dev loaded (SUPABASE_SERVICE_ROLE_KEY=$DEV_SUPABASE_SERVICE_ROLE_KEY), then: node tests/e2e/inspection.mjs
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { chromium } from "playwright";
process.loadEnvFile(".env.dev");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!url.includes("ikjusswwskrkjwxovgza")) throw new Error("not dev");
const svc = createClient(url, process.env.DEV_SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const run = randomUUID().slice(0, 8);
const studyCode = `E2I-${run}`;
const email = `e2e-${run}@example.test`, password = `Pw-${randomUUID()}`;
const shot = (n) => `test-screenshots/e2e-inspection-${n}.png`;
const failures = [];
const check = (ok, what) => { console.log(`${ok ? "PASS" : "FAIL"} ${what}`); if (!ok) failures.push(what); };
let orgId, userId, browser, team, inspector;
const filePath = `e2e/${run}/plan.pdf`;

try {
  const must = (r, what) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r; };
  orgId = must(await svc.from("organizations").insert([{ name: `e2e-${run}`, type: "Sponsor" }]).select("id").single(), "org").data.id;
  userId = must(await svc.auth.admin.createUser({ email, password, email_confirm: true }), "user").data.user.id;
  must(await svc.from("user_roles").insert([{ user_id: userId, org_id: orgId, role: "TMF Lead", email, full_name: "Tia Lead", is_active: true }]), "role");
  must(await svc.from("studies").insert([{ org_id: orgId, user_id: userId, study_id: studyCode, status: "Active", protocol: "E2E-PROT", phase: "Phase II", sponsor: "E2E" }]), "study");
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  pdf.addPage([400, 500]).drawText("Trial Master File Plan v1", { x: 40, y: 450, size: 16, font });
  must(await svc.storage.from("Documents").upload(filePath, await pdf.save(), { contentType: "application/pdf" }), "upload");
  const base = { org_id: orgId, user_id: userId, study_id: studyCode, approved_by: "seed@example.test" };
  must(await svc.from("documents").insert([
    { ...base, artifact_num: "01.01.01", artifact_name: "Trial Master File Plan", custom_file_name: "TMF Plan v1", status: "Approved", approved_at: new Date().toISOString(), file_path: filePath, file_name: "plan.pdf", file_type: "application/pdf" },
    { ...base, artifact_num: "01.01.02", artifact_name: "Trial Management Plan", custom_file_name: "Draft management plan", status: "Draft", approved_by: null },
  ]), "docs");

  browser = await chromium.launch({ channel: "chrome" });
  const errors = [];
  const watch = (p, who) => { p.on("pageerror", (e) => errors.push(`${who}: ${e.message}`)); p.on("dialog", (d) => { errors.push(`${who} dialog: ${d.message()}`); d.dismiss(); }); };
  team = await (await browser.newContext({ viewport: { width: 1500, height: 1000 }, permissions: ["clipboard-read", "clipboard-write"] })).newPage();
  watch(team, "team");

  // 1. The study team creates a session.
  await team.goto("http://localhost:3100/platform", { waitUntil: "networkidle", timeout: 120000 });
  await team.fill('input[type="email"]', email);
  await team.fill('input[type="password"]', password);
  await team.getByRole("button", { name: "Log in" }).click();
  await team.getByRole("button", { name: "Inspection Mode" }).click();
  await team.getByText(`Inspection Mode · ${studyCode}`).waitFor({ timeout: 60000 });
  await team.getByText("No inspection sessions yet for this study.").waitFor({ timeout: 30000 });
  check(true, "empty state");
  await team.getByRole("button", { name: /New inspection session/ }).click();
  const create = team.getByRole("button", { name: "Create session" });
  check(await create.isDisabled(), "create disabled until required fields are filled");
  await team.getByLabel("Inspector name *").fill("Dr Ines Pector");
  await team.getByLabel("Organisation (authority, auditor) *").fill("MHRA GCP Inspectorate");
  await team.getByLabel("Purpose *").fill("Routine GCP inspection of the sponsor TMF");
  check(await team.getByText("AI features are always off in Inspection Mode.").isVisible(), "AI off stated");
  await create.click();
  await team.getByText("Session created for Dr Ines Pector").waitFor({ timeout: 30000 });
  const link = await team.locator("code").nth(0).textContent();
  const code = await team.locator("code").nth(1).textContent();
  check(/\/inspect#t=[A-Za-z0-9_-]{30,}$/.test(link) && /^[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(code), "link and code shown once");
  await team.screenshot({ path: shot("1-created"), fullPage: true });
  await team.getByRole("button", { name: "I have sent both" }).click();

  // 2. The inspector opens the link in a separate browser (no account).
  inspector = await (await browser.newContext({ viewport: { width: 1400, height: 950 } })).newPage();
  watch(inspector, "inspector");
  await inspector.goto(link, { waitUntil: "networkidle", timeout: 120000 });
  check(!inspector.url().includes("#t="), "token removed from the address bar");
  await inspector.getByLabel("Access code").fill("WRON-GCOD");
  await inspector.getByRole("button", { name: "Open inspection" }).click();
  await inspector.getByText("The access code is not correct").waitFor({ timeout: 30000 });
  check(true, "wrong code refused");
  await inspector.getByLabel("Access code").fill(code);
  await inspector.getByRole("button", { name: "Open inspection" }).click();
  await inspector.getByText(`Inspection Mode · ${studyCode} · E2E-PROT`).waitFor({ timeout: 30000 });
  check(await inspector.getByText("Read-only").isVisible(), "read-only badge");
  await inspector.getByRole("button", { name: "TMF Plan v1" }).waitFor({ timeout: 30000 });
  check(!(await inspector.getByText("Draft management plan").isVisible()), "draft is out of scope");
  await inspector.screenshot({ path: shot("2-portal"), fullPage: true });

  // 3. Search, open the document, read it; no download in view-only mode.
  await inspector.getByLabel("Search documents").fill("plan");
  await inspector.getByRole("button", { name: "Search", exact: true }).click();
  await inspector.getByText('Search results for "plan" (1)').waitFor({ timeout: 15000 });
  await inspector.getByRole("button", { name: "TMF Plan v1" }).click();
  await inspector.locator('canvas[aria-label="Page 1"]').waitFor({ timeout: 30000 });
  check(true, "PDF renders in the inspector viewer");
  check(!(await inspector.getByRole("button", { name: /Download/ }).isVisible()), "no download button (view only)");
  check(await inspector.getByRole("button", { name: "Version history" }).isVisible(), "version history tab");
  await inspector.getByRole("button", { name: "Version history" }).click();
  await inspector.getByText("File version 1").waitFor({ timeout: 15000 });
  await inspector.getByRole("button", { name: "Audit trail" }).click();
  await inspector.getByRole("button", { name: "Document", exact: true }).click();
  await inspector.locator('canvas[aria-label="Page 1"]').waitFor({ timeout: 30000 });
  await inspector.waitForTimeout(1500);   // time on page, for the page view log
  await inspector.getByRole("button", { name: "Ask about this document" }).click();
  await inspector.getByLabel("Details").fill("Please provide the draft Trial Management Plan referenced in section 3.");
  await inspector.getByRole("button", { name: "Send request" }).click();
  await inspector.getByText("Request sent.").waitFor({ timeout: 15000 });
  await inspector.screenshot({ path: shot("3-request"), fullPage: true });
  await inspector.getByRole("button", { name: "Close requests" }).click();
  await inspector.getByRole("button", { name: /Close$/ }).click();

  // 4. The team sees it live and answers, adding the draft to the scope.
  await team.getByRole("button", { name: /Dr Ines Pector/ }).click();
  await team.getByText("Inspection in progress").waitFor({ timeout: 30000 });
  await team.getByText("About TMF Plan v1", { exact: true }).waitFor({ timeout: 30000 });
  check(await team.getByText(/Searched "plan"/).isVisible(), "live activity shows the search");
  check(await team.getByText(/Read TMF Plan v1 \(01\.01\.01\), page 1 for \d+ s/).first().isVisible(), "page view time logged");
  await team.getByRole("button", { name: /Answer$/ }).click();
  await team.getByLabel("Response").fill("Added the draft plan to your scope.");
  await team.getByLabel("Find a document").fill("management");
  await team.locator('button:has(i.ti-search)').last().click();
  await team.getByLabel("Document to attach").waitFor({ timeout: 15000 });
  const opts = await team.getByLabel("Document to attach").locator("option").allTextContents();
  await team.getByLabel("Document to attach").selectOption({ label: opts.find((o) => o.includes("Draft management plan")) });
  await team.getByRole("button", { name: "Send answer" }).click();
  await team.getByText("Attached: Draft management plan (01.01.02) (added to the scope)").waitFor({ timeout: 30000 });
  await team.screenshot({ path: shot("4-live"), fullPage: true });

  // 5. The inspector sees the answer and the new document.
  await inspector.reload({ waitUntil: "networkidle" });
  await inspector.getByRole("button", { name: "Draft management plan" }).waitFor({ timeout: 30000 });
  check(await inspector.getByText("Added on request").isVisible(), "draft now in scope, marked as added on request");
  await inspector.getByRole("button", { name: /Requests/ }).click();
  await inspector.getByText("Added the draft plan to your scope.").waitFor({ timeout: 15000 });
  check(true, "inspector sees the answer");
  await inspector.getByRole("button", { name: "Close requests" }).click();

  // 6. Export the log, then end the session: the inspector is signed out.
  const dl = team.waitForEvent("download");
  await team.getByRole("button", { name: /Export inspection log/ }).click();
  check((await dl).suggestedFilename().endsWith(".xlsx"), "inspection log exported as Excel");
  await team.getByRole("button", { name: /End session now/ }).click();
  await team.getByLabel("Reason *").fill("Inspection completed");
  await team.getByRole("button", { name: "Confirm" }).click();
  await team.getByText("Session ended. The inspector can no longer open it.").waitFor({ timeout: 15000 });
  await inspector.getByLabel("Search documents").fill("plan");
  await inspector.getByRole("button", { name: "Search", exact: true }).click();
  await inspector.getByText("This inspection session has been ended by the study team").waitFor({ timeout: 15000 });
  check(await inspector.getByLabel("Access code").isVisible(), "inspector returned to the code screen");
  const { data: kinds } = await svc.from("inspection_activity").select("kind").eq("org_id", orgId);
  const k = new Set(kinds.map((x) => x.kind));
  check(["failed_code", "login", "search", "view", "page_view", "request", "versions_view", "audit_view"].every((x) => k.has(x)), `activity log complete ${[...k].join(",")}`);
  check(errors.length === 0, `no page errors ${JSON.stringify(errors)}`);
} catch (e) {
  failures.push(e.message.split("\n")[0]);
  console.log(`FAIL ${e.message}`);
  if (team) await team.screenshot({ path: shot("error-team") }).catch(() => {});
  if (inspector) await inspector.screenshot({ path: shot("error-inspector") }).catch(() => {});
} finally {
  if (browser) await browser.close().catch(() => {});
  await svc.storage.from("Documents").remove([filePath]).catch(() => {});
  // Inspection sessions and their activity are append-only GxP records and stay behind on DEV.
  if (userId) await svc.from("user_roles").update({ is_active: false }).eq("user_id", userId);
  console.log("cleaned up");
  if (failures.length) { console.log(`\n${failures.length} FAILED`); process.exitCode = 1; } else console.log("\nALL PASSED");
}
