// End-to-end Part 14a–c: bulk indexing, signposts, full-text search, document links. DEV only.
// Usage: start `next dev -p 3100` with .env.dev loaded, then: node tests/e2e/part14-filing.mjs
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { chromium } from "playwright";
process.loadEnvFile(".env.dev");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL, anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url.includes("ikjusswwskrkjwxovgza")) throw new Error("not dev");
const svc = createClient(url, process.env.DEV_SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const run = randomUUID().slice(0, 8);
const studyCode = `E2F-${run}`;
const email = `e2e-${run}@example.test`, password = `Pw-${randomUUID()}`;
const shot = (n) => `test-screenshots/e2e-part14-${n}.png`;
const failures = [];
const check = (ok, what) => { console.log(`${ok ? "PASS" : "FAIL"} ${what}`); if (!ok) failures.push(what); };
let orgId, userId, browser, page;

try {
  const must = (r, what) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r; };
  orgId = must(await svc.from("organizations").insert([{ name: `e2e-${run}`, type: "Sponsor" }]).select("id").single(), "org").data.id;
  userId = must(await svc.auth.admin.createUser({ email, password, email_confirm: true }), "user").data.user.id;
  must(await svc.from("user_roles").insert([{ user_id: userId, org_id: orgId, role: "TMF Lead", email, full_name: "Fay Iling", is_active: true }]), "role");
  must(await svc.from("studies").insert([{ org_id: orgId, user_id: userId, study_id: studyCode, status: "Active", protocol: "E2E", phase: "Phase II", sponsor: "E2E" }]), "study");
  const userDb = createClient(url, anon, { auth: { persistSession: false } });
  await userDb.auth.signInWithPassword({ email, password });
  must(await userDb.rpc("seed_study_tmf_config", { p_study_code: studyCode }), "seed");
  must(await svc.from("ai_settings").insert([{ org_id: orgId, feature: "classification", enabled: false, change_reason: "e2e: no paid model calls" }]), "ai off");

  const files = [];
  for (const [i, text] of ["The bioanalytical laboratory manual describes centrifugation at 1500 g", "Curriculum vitae of the principal investigator", "Site delegation log"].entries()) {
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    pdf.addPage([600, 800]).drawText(text, { x: 30, y: 760, size: 11, font });
    const p = join(tmpdir(), `p14-${run}-${i}.pdf`);
    await writeFile(p, await pdf.save());
    files.push(p);
  }

  browser = await chromium.launch({ channel: "chrome" });
  page = await (await browser.newContext({ viewport: { width: 1500, height: 1000 } })).newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => { errors.push(`unexpected dialog: ${d.message()}`); d.dismiss(); });
  await page.goto("http://localhost:3100/platform", { waitUntil: "networkidle", timeout: 120000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.getByRole("button", { name: "Document Intake" }).click();
  await page.getByText("Drop files here or click to choose").waitFor({ timeout: 60000 });

  // Bulk indexing.
  await page.locator('input[type="file"]').first().setInputFiles(files);
  await page.getByLabel("Select all intake items").waitFor({ timeout: 60000 });
  await page.getByLabel("Select all intake items").check();
  await page.getByRole("button", { name: "Edit common metadata" }).click();
  const firstArtifact = await page.getByLabel("Common artifact").locator("option").nth(1).getAttribute("value");
  await page.getByLabel("Common artifact").selectOption(firstArtifact);
  await page.getByRole("button", { name: /^Apply to 3$/ }).click();
  await page.getByText("3 item(s) updated.").waitFor({ timeout: 30000 });
  await page.getByLabel("Select all intake items").check();
  await page.getByRole("button", { name: "File selected" }).click();
  await page.getByText("3 item(s) filed.").waitFor({ timeout: 60000 });
  check(true, "bulk index and file 3 items");

  // Signpost.
  await page.getByRole("button", { name: /Add signpost/ }).click();
  await page.locator("select").filter({ has: page.locator("option", { hasText: "Choose…" }) }).first().selectOption(firstArtifact);
  await page.getByLabel("Title").last().fill("Wet-ink monitoring plan");
  await page.getByPlaceholder(/vault\.example\.com/).fill("Sponsor archive, box 14");
  await page.getByRole("button", { name: "File signpost" }).click();
  await page.getByText(/Signpost filed/).waitFor({ timeout: 60000 });
  check(true, "signpost filed");

  // Full-text search (indexing runs after filing; give it a moment, then search).
  await page.getByRole("button", { name: "TMF Navigator" }).click();
  await page.getByLabel("Search inside documents").waitFor({ timeout: 30000 });
  await page.getByLabel("Search inside documents").check();
  await page.getByLabel("Search titles").fill("centrifugation");
  const found = await page.locator("mark", { hasText: "centrifugation" }).first().waitFor({ timeout: 20000 }).then(() => true).catch(() => false);
  check(found, "content search finds a word inside a PDF, highlighted");
  await page.screenshot({ path: shot("1-search"), fullPage: true });

  // Links: open the signpost document and link it to another document.
  await page.getByLabel("Search inside documents").uncheck();
  await page.getByLabel("Search titles").fill("Wet-ink");
  await page.getByText("Wet-ink monitoring plan").first().waitFor({ timeout: 15000 });
  await page.getByText("Wet-ink monitoring plan").first().click();
  await page.getByText(/^Links \(0\)$/).waitFor({ timeout: 30000 });
  await page.getByRole("button", { name: /Add$/ }).click();
  await page.getByLabel("Find documents to link").fill("");
  await page.locator('button:has(i.ti-search)').last().click();
  await page.locator('label:has(input[type="checkbox"])', { hasText: /p14-/ }).first().locator("input").check();
  await page.getByRole("button", { name: /Add 1 link/ }).click();
  await page.getByText(/1 link\(s\) added\./).waitFor({ timeout: 30000 });
  await page.getByText(/^Links \(1\)$/).waitFor({ timeout: 15000 });
  check(true, "link shown on the document");
  check(errors.length === 0, `no page errors ${JSON.stringify(errors)}`);
} catch (e) {
  failures.push(e.message.split("\n")[0]);
  console.log(`FAIL ${e.message}`);
  if (page) await page.screenshot({ path: shot("error") }).catch(() => {});
} finally {
  if (browser) await browser.close().catch(() => {});
  if (orgId) await svc.from("ai_settings").delete().eq("org_id", orgId);
  if (userId) await svc.from("user_roles").update({ is_active: false }).eq("user_id", userId);
  console.log("cleaned up");
  if (failures.length) { console.log(`\n${failures.length} FAILED`); process.exitCode = 1; } else console.log("\nALL PASSED");
}
