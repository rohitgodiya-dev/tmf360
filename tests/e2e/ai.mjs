// End-to-end AI assistance (Part 12a): real browser, DEV Supabase only. Uses only the duplicate
// check (no model call), so it spends no API credits; classification is switched off for the org.
// Usage: start `next dev -p 3100` with .env.dev loaded, then: node tests/e2e/ai.mjs
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
const studyCode = `E2AI-${run}`;
const email = `e2e-${run}@example.test`, password = `Pw-${randomUUID()}`;
const shot = (n) => `test-screenshots/e2e-ai-${n}.png`;
const failures = [];
const check = (ok, what) => { console.log(`${ok ? "PASS" : "FAIL"} ${what}`); if (!ok) failures.push(what); };
let orgId, userId, browser, page;

try {
  const must = (r, what) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r; };
  orgId = must(await svc.from("organizations").insert([{ name: `e2e-${run}`, type: "Sponsor" }]).select("id").single(), "org").data.id;
  userId = must(await svc.auth.admin.createUser({ email, password, email_confirm: true }), "user").data.user.id;
  must(await svc.from("user_roles").insert([{ user_id: userId, org_id: orgId, role: "Sponsor Admin", email, full_name: "Ada Admin", is_active: true }]), "role");
  must(await svc.from("studies").insert([{ org_id: orgId, user_id: userId, study_id: studyCode, status: "Active", protocol: "E2E", phase: "Phase II", sponsor: "E2E" }]), "study");
  const userDb = createClient(url, anon, { auth: { persistSession: false } });
  await userDb.auth.signInWithPassword({ email, password });
  must(await userDb.rpc("seed_study_tmf_config", { p_study_code: studyCode }), "seed");
  must(await userDb.from("ai_settings").insert([{ org_id: orgId, feature: "classification", enabled: false, change_reason: "e2e: no paid model calls" }]), "ai off");

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  pdf.addPage([600, 800]).drawText("Monitoring visit report for site 101 covering consent, source data verification and drug accountability.", { x: 30, y: 760, size: 10, font });
  const file = join(tmpdir(), `e2e-ai-${run}.pdf`);
  await writeFile(file, await pdf.save());

  browser = await chromium.launch({ channel: "chrome" });
  page = await (await browser.newContext({ viewport: { width: 1500, height: 1000 } })).newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => { errors.push(`unexpected dialog: ${d.message()}`); d.dismiss(); });
  await page.goto("http://localhost:3100/platform", { waitUntil: "networkidle", timeout: 120000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.getByRole("button", { name: "Log in" }).click();

  // Switch duplicate detection on in the AI assistance panel.
  await page.getByRole("button", { name: "AI assistance" }).click();
  await page.getByText("Content duplicate detection").waitFor({ timeout: 60000 });
  // Rows are listed in order: classification, metadata, pre-QC, duplicates, summary.
  await page.getByRole("button", { name: /^Switch on$/ }).nth(3).click();
  await page.getByLabel("Reason *").fill("Pilot duplicate checks");
  await page.getByRole("button", { name: /^Switch on$/ }).nth(3).click();   // the confirm button replaces that row's button
  await page.getByText("Content duplicate detection switched on.").waitFor({ timeout: 30000 });
  check(true, "capability switched on with a reason");

  // Receive a PDF in Document Intake and run the duplicate check.
  await page.getByRole("button", { name: "Document Intake" }).click();
  await page.getByText("Drop files here or click to choose").waitFor({ timeout: 60000 });
  await page.locator('input[type="file"]').first().setInputFiles(file);
  await page.getByText(`e2e-ai-${run}.pdf`).first().waitFor({ timeout: 60000 });
  await page.getByText("AI assistance", { exact: false }).last().waitFor({ timeout: 30000 });
  check(!(await page.getByRole("button", { name: "Suggest record type" }).isVisible()), "classification hidden while switched off");
  await page.getByRole("button", { name: "Check for duplicates" }).click();
  await page.getByText(/No near-duplicates among \d+ Final document/).waitFor({ timeout: 60000 });
  check(await page.getByText(/word-5-shingle-jaccard-1/).isVisible(), "provenance (model version) shown");
  await page.screenshot({ path: shot("1-intake"), fullPage: true });
  const { data: recs } = await svc.from("ai_recommendations").select("feature, status").eq("org_id", orgId);
  check(recs.length === 1 && recs[0].feature === "duplicate_detection", "recommendation stored");
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
