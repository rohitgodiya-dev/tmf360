// End-to-end Part 18: Study lifecycle panel — advance to close-out (acknowledging warnings), sign the close, (ENT-09, ENT-10)
// then the read-only banner shows on other panels. DEV only.
// Usage: start `next dev -p 3100` with .env.dev loaded, then: node tests/e2e/lifecycle.mjs
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
process.loadEnvFile(".env.dev");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!url.includes("ikjusswwskrkjwxovgza")) throw new Error("not dev");
const svc = createClient(url, process.env.DEV_SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const run = randomUUID().slice(0, 8);
const email = `e2e-${run}@example.test`, password = `Pw-${randomUUID()}`;
const shot = (n) => `test-screenshots/e2e-part18-${n}.png`;
const failures = [];
const check = (ok, what) => { console.log(`${ok ? "PASS" : "FAIL"} ${what}`); if (!ok) failures.push(what); };
let userId, browser, page;

try {
  const must = (r, what) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r; };
  const orgId = must(await svc.from("organizations").insert([{ name: `e2e-${run}`, type: "Sponsor" }]).select("id").single(), "org").data.id;
  userId = must(await svc.auth.admin.createUser({ email, password, email_confirm: true }), "user").data.user.id;
  must(await svc.from("user_roles").insert([{ user_id: userId, org_id: orgId, role: "TMF Lead", email, full_name: "Life Cycle", is_active: true }]), "role");
  must(await svc.from("studies").insert([{ org_id: orgId, user_id: userId, study_id: `LC-${run}`, status: "Active", protocol: "E2E", phase: "Phase III" }]), "study");

  browser = await chromium.launch({ channel: "chrome" });
  page = await (await browser.newContext({ viewport: { width: 1500, height: 1000 } })).newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => { errors.push(`unexpected dialog: ${d.message()}`); d.dismiss(); });
  await page.goto("http://localhost:3100/platform", { waitUntil: "networkidle", timeout: 120000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.getByRole("button", { name: "Study lifecycle" }).click();
  await page.getByText("Close-out readiness").waitFor({ timeout: 60000 });
  check(await page.locator('[aria-current="step"]').innerText() === "Active", "timeline marks Active as current");

  await page.getByRole("button", { name: /Advance to Close-out/ }).click();
  let dlg = page.getByRole("dialog", { name: "Move to Close-out" });
  await dlg.locator("textarea").fill("Last patient last visit done");
  check(await dlg.getByRole("button", { name: "Move to Close-out" }).isDisabled(), "cannot proceed before acknowledging warnings");
  await dlg.getByRole("checkbox").check();
  await dlg.getByRole("button", { name: "Move to Close-out" }).click();
  await page.getByText("The study is now Close-out.").waitFor({ timeout: 30000 });

  await page.getByRole("button", { name: /Advance to Closed/ }).click();
  dlg = page.getByRole("dialog", { name: "Move to Closed" });
  await dlg.locator("textarea").fill("CSR final, TMF complete");
  await dlg.getByRole("checkbox").check();
  await dlg.locator('input[type="password"]').fill(password);
  await dlg.getByRole("button", { name: "Sign and move to Closed" }).click();
  await page.getByText("The study is now Closed.").waitFor({ timeout: 60000 });
  await page.getByText(/Closed study/).first().waitFor({ timeout: 30000 });
  check(true, "read-only banner appears after closing");
  check(await page.getByRole("row", { name: /CSR final, TMF complete/ }).isVisible(), "history shows the signed close");
  await page.screenshot({ path: shot("closed"), fullPage: true });

  await page.getByRole("button", { name: "Dashboard" }).click();
  check(await page.getByText(/Closed study/).first().isVisible(), "banner stays on other panels");
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
