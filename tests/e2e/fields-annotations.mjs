// End-to-end Part 22 (RM-06, IDX-08, VWR-03): define required fields for a document type, see them enforced in
// Document Intake with the unsaved-changes guard, then add and resolve a reviewer note pinned in the viewer. DEV only.
// Usage: start `next dev -p 3100` with .env.dev loaded, then: node tests/e2e/fields-annotations.mjs
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { chromium } from "playwright";
process.loadEnvFile(".env.dev");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL, anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url.includes("ikjusswwskrkjwxovgza")) throw new Error("not dev");
const svc = createClient(url, process.env.DEV_SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const run = randomUUID().slice(0, 8);
const studyCode = `E2R-${run}`;
const email = `e2e-${run}@example.test`, password = `Pw-${randomUUID()}`;
const shot = (n) => `test-screenshots/e2e-part22-${n}.png`;
const failures = [];
const check = (ok, what) => { console.log(`${ok ? "PASS" : "FAIL"} ${what}`); if (!ok) failures.push(what); };
let orgId, userId, browser, page;

try {
  const must = (r, what) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r; };
  orgId = must(await svc.from("organizations").insert([{ name: `e2e-${run}`, type: "Sponsor" }]).select("id").single(), "org").data.id;
  userId = must(await svc.auth.admin.createUser({ email, password, email_confirm: true }), "user").data.user.id;
  must(await svc.from("user_roles").insert([{ user_id: userId, org_id: orgId, role: "TMF Lead", email, full_name: "Fiona Fields", is_active: true }]), "role");
  must(await svc.from("studies").insert([{ org_id: orgId, user_id: userId, study_id: studyCode, status: "Active", protocol: "E2E", phase: "Phase II", sponsor: "E2E" }]), "study");
  const userDb = createClient(url, anon, { auth: { persistSession: false } });
  await userDb.auth.signInWithPassword({ email, password });
  must(await userDb.rpc("seed_study_tmf_config", { p_study_code: studyCode }), "seed");
  const art = must(await svc.from("tmf_config").select("artifact_num, artifact_name").eq("study_id", studyCode).eq("type", "artifact").eq("is_enabled", true).order("artifact_num").limit(1).single(), "artifact").data;
  must(await svc.from("ai_settings").insert([{ org_id: orgId, feature: "classification", enabled: false, change_reason: "e2e: no paid model calls" }]), "ai off");
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  pdfDoc.addPage([600, 800]).drawText(`Ethics approval letter ${run}`, { x: 40, y: 740, size: 14, font });
  const pdf = Buffer.from(await pdfDoc.save());

  browser = await chromium.launch({ channel: "chrome" });
  page = await (await browser.newContext({ viewport: { width: 1500, height: 1000 } })).newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => { errors.push(`unexpected dialog: ${d.message()}`); d.dismiss(); });
  await page.goto("http://localhost:3100/platform", { waitUntil: "networkidle", timeout: 120000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.getByRole("button", { name: "Log in" }).click();

  // RM-06: define the rule in TMF Configuration.
  await page.getByRole("button", { name: "TMF Configuration" }).click();
  await page.getByRole("button", { name: /Required fields by document type/ }).click();
  await page.getByLabel("Artifact for field rules").selectOption(art.artifact_num);
  await page.getByLabel("Version", { exact: true }).check();
  await page.getByRole("button", { name: "Add field" }).click();
  await page.getByLabel("Field name").fill("IRB number");
  await page.locator("label", { hasText: /^ Required$/ }).last().locator("input").check();
  await page.getByPlaceholder("e.g. IRB reference needed for inspections").fill("IRB number needed for inspections");
  await page.getByRole("button", { name: "Save fields" }).click();
  await page.getByText(`Fields for ${art.artifact_num} saved.`).waitFor({ timeout: 30000 });
  check(true, "rule saved from TMF Configuration");

  // RM-06 + IDX-08 in Document Intake.
  await page.getByRole("button", { name: "Document Intake" }).click();
  await page.getByText("Drop files here").waitFor({ timeout: 30000 });
  await page.setInputFiles('input[type="file"][multiple]', { name: `Ethics ${run}.pdf`, mimeType: "application/pdf", buffer: pdf });
  await page.getByText("Integrity verified").waitFor({ timeout: 60000 });
  await page.locator("select").filter({ hasText: "Choose an artifact" }).selectOption(art.artifact_num);
  await page.getByText(/Required for .* before filing: Version, IRB number/).waitFor({ timeout: 10000 });
  check(await page.getByRole("button", { name: "File to TMF" }).isDisabled(), "filing blocked while required fields are empty");

  await page.getByRole("button", { name: "Dashboard" }).click();
  await page.getByRole("dialog", { name: "Unsaved changes" }).waitFor({ timeout: 5000 });
  check(true, "leaving with unsaved edits asks first");
  await page.getByRole("button", { name: "Keep editing" }).click();
  check(await page.getByText("Drop files here").isVisible(), "keep editing stays on Document Intake");

  await page.locator("label", { hasText: /^Version/ }).locator("input").first().fill("1.0");
  await page.getByLabel("IRB number").fill("IRB-2026-41");
  await page.getByRole("button", { name: "File to TMF" }).click();
  await page.getByText("was filed to the TMF as a Draft").waitFor({ timeout: 30000 });
  check(true, "files once required fields are filled");
  const { data: doc } = await svc.from("documents").select("id, custom_metadata").eq("org_id", orgId).single();
  check(doc?.custom_metadata?.irb_number === "IRB-2026-41", "type-specific value stored on the document");

  // VWR-03: reviewer note pinned in the viewer.
  await page.getByRole("button", { name: "TMF Navigator" }).click();
  await page.getByText(`Ethics ${run}.pdf`).first().click();
  await page.getByText("File history").waitFor({ timeout: 30000 });
  await page.getByRole("button", { name: "View" }).click();
  await page.locator('canvas[aria-label="Page 1"]').first().waitFor({ timeout: 30000 });
  await page.getByRole("button", { name: /Notes/ }).first().click();
  await page.getByLabel("New note").fill("Signature date missing on page 1");
  await page.getByRole("button", { name: "Pin to page" }).click();
  await page.getByTestId("page-surface").click({ position: { x: 120, y: 90 } });
  check(await page.getByLabel("New note position").isVisible(), "pin placed where clicked");
  await page.getByRole("button", { name: "Add note" }).click();
  await page.getByText("Note added.").waitFor({ timeout: 15000 });
  await page.getByLabel(/^Note 1: Signature date missing/).waitFor({ timeout: 10000 });
  check(true, "note shows as a numbered pin on the page");
  await page.screenshot({ path: shot("note"), fullPage: true });
  await page.getByRole("complementary", { name: "Notes and fields" }).getByRole("button", { name: "Resolve" }).click();
  await page.getByLabel("Resolution note").fill("Corrected in v1.1");
  await page.getByRole("complementary", { name: "Notes and fields" }).getByRole("button", { name: "Resolve" }).last().click();
  await page.getByText("Note resolved.").waitFor({ timeout: 15000 });
  await page.getByText("No open notes.").waitFor({ timeout: 15000 });
  check(true, "resolved note leaves the open list");
  await page.getByRole("button", { name: "Fields", exact: true }).first().click();
  check(await page.getByLabel("IRB number").inputValue() === "IRB-2026-41", "fields tab shows the stored value");
  check(errors.length === 0, `no page errors ${JSON.stringify(errors)}`);
} catch (e) {
  failures.push(e.message.split("\n")[0]);
  console.log(`FAIL ${e.message}`);
  if (page) await page.screenshot({ path: shot("error"), fullPage: true }).catch(() => {});
} finally {
  if (browser) await browser.close().catch(() => {});
  if (orgId) await svc.from("ai_settings").delete().eq("org_id", orgId);
  if (userId) await svc.from("user_roles").update({ is_active: false }).eq("user_id", userId);
  console.log("cleaned up");
  if (failures.length) { console.log(`\n${failures.length} FAILED`); process.exitCode = 1; } else console.log("\nALL PASSED");
}
