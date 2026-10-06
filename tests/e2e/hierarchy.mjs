// End-to-end Part 15: Countries & sites panel — add a country, add a site with a new institution, update enrollment. DEV only. (ENT-02, ENT-03)
// Usage: start `next dev -p 3100` with .env.dev loaded, then: node tests/e2e/hierarchy.mjs
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
process.loadEnvFile(".env.dev");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!url.includes("ikjusswwskrkjwxovgza")) throw new Error("not dev");
const svc = createClient(url, process.env.DEV_SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const run = randomUUID().slice(0, 8);
const studyCode = `E2H-${run}`;
const email = `e2e-${run}@example.test`, password = `Pw-${randomUUID()}`;
const shot = (n) => `test-screenshots/e2e-part15-${n}.png`;
const failures = [];
const check = (ok, what) => { console.log(`${ok ? "PASS" : "FAIL"} ${what}`); if (!ok) failures.push(what); };
let orgId, userId, browser, page;

try {
  const must = (r, what) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r; };
  orgId = must(await svc.from("organizations").insert([{ name: `e2e-${run}`, type: "Sponsor" }]).select("id").single(), "org").data.id;
  userId = must(await svc.auth.admin.createUser({ email, password, email_confirm: true }), "user").data.user.id;
  must(await svc.from("user_roles").insert([{ user_id: userId, org_id: orgId, role: "TMF Lead", email, full_name: "Hera Archy", is_active: true }]), "role");
  must(await svc.from("studies").insert([{ org_id: orgId, user_id: userId, study_id: studyCode, status: "Active", protocol: "E2E", phase: "Phase III", sponsor: "E2E" }]), "study");

  browser = await chromium.launch({ channel: "chrome" });
  page = await (await browser.newContext({ viewport: { width: 1500, height: 1000 } })).newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => { errors.push(`unexpected dialog: ${d.message()}`); d.dismiss(); });
  await page.goto("http://localhost:3100/platform", { waitUntil: "networkidle", timeout: 120000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.getByRole("button", { name: "Countries & sites" }).click();
  await page.getByText("No countries added to this study yet.").waitFor({ timeout: 60000 });
  check(true, "empty state shown");

  await page.getByRole("button", { name: /Add country/ }).click();
  const dlg = page.getByRole("dialog", { name: "Add country" });
  await dlg.locator("select").selectOption("FR");
  await dlg.getByText(/Regulator: ANSM/).waitFor({ timeout: 10000 });
  await dlg.getByRole("button", { name: "Save" }).click();
  await page.getByText("France", { exact: true }).waitFor({ timeout: 30000 });
  check(true, "country added with regulator shown");

  await page.getByRole("button", { name: /Add site/ }).first().click();
  const site = page.getByRole("dialog", { name: "Add site" });
  await site.getByRole("button", { name: "New institution" }).click();
  await site.getByPlaceholder("e.g. Mayo Clinic Rochester").fill(`Hôpital Édouard ${run}`);
  await site.locator("label", { hasText: "City" }).locator("xpath=..").locator("input").fill("Lyon");
  await site.locator("label", { hasText: "Institution type" }).locator("xpath=..").locator("select").selectOption("academic_hospital");
  await site.getByPlaceholder("e.g. 101").fill("301");
  await site.locator("label", { hasText: "Target enrollment" }).locator("xpath=..").locator("input").fill("25");
  await site.getByRole("button", { name: "Save" }).click();
  await site.waitFor({ state: "detached", timeout: 30000 });
  await page.getByText("France", { exact: true }).click();
  await page.getByText(`Hôpital Édouard ${run}`).first().waitFor({ timeout: 15000 });
  check(await page.getByText("Lyon · Academic hospital").isVisible(), "site row shows city and institution type");

  await page.getByRole("button", { name: "Enrollment" }).click();
  const enr = page.getByRole("dialog", { name: /Enrollment/ });
  await enr.locator("label", { hasText: "Enrolled to date" }).locator("xpath=..").locator("input").fill("7");
  await enr.getByRole("button", { name: "Save" }).click();
  await enr.waitFor({ state: "detached", timeout: 30000 });
  await page.getByText("7 / 25").first().waitFor({ timeout: 15000 });
  check(true, "enrollment updated in the table");
  await page.screenshot({ path: shot("panel"), fullPage: true });
  check(errors.length === 0, `no page errors ${JSON.stringify(errors)}`);
} catch (e) {
  failures.push(e.message.split("\n")[0]);
  console.log(`FAIL ${e.message}`);
  if (page) await page.screenshot({ path: shot("error") }).catch(() => {});
} finally {
  if (browser) await browser.close().catch(() => {});
  if (userId) await svc.from("user_roles").update({ is_active: false }).eq("user_id", userId);
  console.log("cleaned up");
  if (failures.length) { console.log(`\n${failures.length} FAILED`); process.exitCode = 1; } else console.log("\nALL PASSED");
}
