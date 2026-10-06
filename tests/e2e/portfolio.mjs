// End-to-end Part 16: Portfolio panel — studies side by side, filters, drill-through, Excel export. DEV only. (ENT-05)
// Usage: start `next dev -p 3100` with .env.dev loaded, then: node tests/e2e/portfolio.mjs
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
process.loadEnvFile(".env.dev");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!url.includes("ikjusswwskrkjwxovgza")) throw new Error("not dev");
const svc = createClient(url, process.env.DEV_SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const run = randomUUID().slice(0, 8);
const email = `e2e-${run}@example.test`, password = `Pw-${randomUUID()}`;
const shot = (n) => `test-screenshots/e2e-part16-${n}.png`;
const failures = [];
const check = (ok, what) => { console.log(`${ok ? "PASS" : "FAIL"} ${what}`); if (!ok) failures.push(what); };
let orgId, userId, browser, page;

try {
  const must = (r, what) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r; };
  orgId = must(await svc.from("organizations").insert([{ name: `e2e-${run}`, type: "Sponsor" }]).select("id").single(), "org").data.id;
  userId = must(await svc.auth.admin.createUser({ email, password, email_confirm: true }), "user").data.user.id;
  must(await svc.from("user_roles").insert([{ user_id: userId, org_id: orgId, role: "Sponsor Admin", email, full_name: "Port Folio", is_active: true }]), "role");
  const studies = [];
  for (const [code, phase] of [[`PA-${run}`, "Phase II"], [`PB-${run}`, "Phase III"]]) {
    const s = must(await svc.from("studies").insert([{ org_id: orgId, user_id: userId, study_id: code, status: "Active", protocol: `Protocol ${code}`, phase, sponsor: "E2E" }]).select("id, study_id").single(), "study").data;
    studies.push(s);
  }
  const country = must(await svc.from("study_countries").insert([{ org_id: orgId, study_id: studies[0].id, country_code: "DE" }]).select("id").single(), "country").data.id;
  const party = must(await svc.from("parties").insert([{ org_id: orgId, party_type: "site", name: `Charité ${run}` }]).select("id").single(), "party").data.id;
  const site = must(await svc.from("study_sites").insert([{ org_id: orgId, study_id: studies[0].id, study_country_id: country, site_number: "11", site_party_id: party, display_name: "Berlin", status: "ongoing", target_enrollment: 40, actual_enrollment: 9 }]).select("id").single(), "site").data.id;
  for (const final of [true, false]) {
    must(await svc.from("documents").insert([{ org_id: orgId, user_id: userId, study_id: studies[0].study_id, status: final ? "Approved" : "Draft", file_path: final ? `${orgId}/x.pdf` : null,
      custom_file_name: "d", artifact_num: "05.04.03", artifact_name: "Site doc", study_country_id: country, study_site_id: site }]), "doc");
  }

  browser = await chromium.launch({ channel: "chrome" });
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 1000 }, acceptDownloads: true });
  page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => { errors.push(`unexpected dialog: ${d.message()}`); d.dismiss(); });
  await page.goto("http://localhost:3100/platform", { waitUntil: "networkidle", timeout: 120000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.getByRole("button", { name: "Portfolio" }).click();
  await page.locator("td b", { hasText: `PA-${run}` }).waitFor({ timeout: 60000 });
  check(await page.locator("td b", { hasText: `PB-${run}` }).isVisible(), "both studies listed");
  check(await page.getByText("50%").first().isVisible(), "completeness shown for the study with documents");
  check(await page.locator("td b", { hasText: "Germany" }).isVisible(), "country rollup shows Germany");

  await page.getByLabel("Filter by phase").selectOption("Phase III");
  await page.getByText("1 of 2 studies").waitFor({ timeout: 5000 });
  check(!(await page.locator("td b", { hasText: `PA-${run}` }).isVisible()), "phase filter hides the Phase II study");
  await page.getByRole("button", { name: "Clear filters" }).click();
  await page.screenshot({ path: shot("panel"), fullPage: true });

  const [download] = await Promise.all([page.waitForEvent("download", { timeout: 60000 }), page.getByRole("button", { name: /Export to Excel/ }).click()]);
  check(download.suggestedFilename().endsWith(".xlsx"), "Excel export downloads");

  await page.locator("td b", { hasText: `PA-${run}` }).click();
  await page.waitForFunction((code) => document.querySelector("header select")?.value === code, `PA-${run}`, { timeout: 15000 });
  check(true, "drill-through switches the active study");
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
