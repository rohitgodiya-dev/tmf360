// End-to-end Part 19: Amendment tracker — register an approved protocol amendment, sites get acknowledgement (ENT-11)
// tasks, acknowledge for one site, overdue site highlighted. DEV only.
// Usage: start `next dev -p 3100` with .env.dev loaded, then: node tests/e2e/amendments.mjs
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
process.loadEnvFile(".env.dev");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!url.includes("ikjusswwskrkjwxovgza")) throw new Error("not dev");
const svc = createClient(url, process.env.DEV_SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const run = randomUUID().slice(0, 8);
const email = `e2e-${run}@example.test`, password = `Pw-${randomUUID()}`;
const shot = (n) => `test-screenshots/e2e-part19-${n}.png`;
const failures = [];
const check = (ok, what) => { console.log(`${ok ? "PASS" : "FAIL"} ${what}`); if (!ok) failures.push(what); };
let userId, browser, page;

try {
  const must = (r, what) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r; };
  const orgId = must(await svc.from("organizations").insert([{ name: `e2e-${run}`, type: "Sponsor" }]).select("id").single(), "org").data.id;
  userId = must(await svc.auth.admin.createUser({ email, password, email_confirm: true }), "user").data.user.id;
  must(await svc.from("user_roles").insert([{ user_id: userId, org_id: orgId, role: "TMF Lead", email, full_name: "Amy Endment", is_active: true }]), "role");
  const code = `AM-${run}`;
  const studyId = must(await svc.from("studies").insert([{ org_id: orgId, user_id: userId, study_id: code, status: "Active", protocol: "E2E", phase: "Phase III" }]).select("id").single(), "study").data.id;
  const country = must(await svc.from("study_countries").insert([{ org_id: orgId, study_id: studyId, country_code: "ES" }]).select("id").single(), "country").data.id;
  const party = must(await svc.from("parties").insert([{ org_id: orgId, party_type: "site", name: `Hospital ${run}` }]).select("id").single(), "party").data.id;
  for (const [n, name] of [["11", "Madrid"], ["12", "Barcelona"]]) {
    must(await svc.from("study_sites").insert([{ org_id: orgId, study_id: studyId, study_country_id: country, site_number: n, site_party_id: party, display_name: name, status: "ongoing" }]), "site");
  }
  must(await svc.from("documents").insert([{ org_id: orgId, user_id: userId, study_id: code, status: "Approved", approved_at: new Date().toISOString(), approved_by: email,
    artifact_num: "02.01.04", artifact_name: "Protocol Amendment", custom_file_name: `Protocol amendment 3 ${run}`, file_path: `${orgId}/am.pdf`, version: "4.0" }]), "doc");

  browser = await chromium.launch({ channel: "chrome" });
  page = await (await browser.newContext({ viewport: { width: 1500, height: 1000 } })).newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => { errors.push(`unexpected dialog: ${d.message()}`); d.dismiss(); });
  await page.goto("http://localhost:3100/platform", { waitUntil: "networkidle", timeout: 120000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.getByRole("button", { name: "Amendment tracker" }).click();
  await page.getByText(/not yet registered as a protocol version/).waitFor({ timeout: 60000 });
  check(true, "approved amendment offered for registration");

  await page.getByRole("button", { name: /Register/ }).click();
  const dlg = page.getByRole("dialog", { name: "Register protocol amendment" });
  await dlg.getByPlaceholder("e.g. 3").fill("3");
  check(await dlg.getByPlaceholder("e.g. 4.0").inputValue() === "4.0", "protocol version prefilled from the document");
  await dlg.locator('input[type="date"]').first().fill("2020-01-01");
  await dlg.getByRole("button", { name: "Register and notify sites" }).click();
  await page.getByText(/2 site\(s\) must acknowledge/).waitFor({ timeout: 30000 });
  await page.getByText("2 overdue").waitFor({ timeout: 15000 });
  check(true, "sites past the effective date are overdue");

  await page.getByRole("button", { name: /Amendment 3/ }).click();
  await page.getByRole("row", { name: /Madrid/ }).getByRole("button", { name: "Acknowledge" }).click();
  const ack = page.getByRole("dialog", { name: /Acknowledge amendment 3/ });
  await ack.locator("textarea").fill("Filed in ISF");
  await ack.getByRole("button", { name: "Acknowledge" }).click();
  await page.getByText(/Site 11 acknowledged amendment 3/).waitFor({ timeout: 30000 });
  await page.getByText("1/2 acknowledged").waitFor({ timeout: 15000 });
  if (!(await page.getByRole("row", { name: /Madrid/ }).isVisible())) await page.getByRole("button", { name: /Amendment 3/ }).click();
  check(await page.getByRole("row", { name: /Madrid/ }).getByText("Acknowledged").isVisible(), "Madrid shows acknowledged");
  check(await page.getByRole("row", { name: /Barcelona/ }).getByText("Overdue").isVisible(), "Barcelona still overdue");
  await page.screenshot({ path: shot("tracker"), fullPage: true });
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
