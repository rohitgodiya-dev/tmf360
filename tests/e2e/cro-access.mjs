// End-to-end Part 17: CRO access panel — grant an existing member access to a study for a CRO, the CRA's study (ENT-06, ENT-08)
// switcher then shows it; revoke with a reason and it disappears. DEV only.
// Usage: start `next dev -p 3100` with .env.dev loaded, then: node tests/e2e/cro-access.mjs
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
process.loadEnvFile(".env.dev");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!url.includes("ikjusswwskrkjwxovgza")) throw new Error("not dev");
const svc = createClient(url, process.env.DEV_SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const run = randomUUID().slice(0, 8);
const lead = { email: `e2e-${run}-lead@example.test`, password: `Pw-${randomUUID()}` };
const cra = { email: `e2e-${run}-cra@example.test`, password: `Pw-${randomUUID()}` };
const shot = (n) => `test-screenshots/e2e-part17-${n}.png`;
const failures = [];
const check = (ok, what) => { console.log(`${ok ? "PASS" : "FAIL"} ${what}`); if (!ok) failures.push(what); };
let orgId, browser, page;
const userIds = [];

async function login(p, who) {
  await p.goto("http://localhost:3100/platform", { waitUntil: "networkidle", timeout: 120000 });
  await p.fill('input[type="email"]', who.email);
  await p.fill('input[type="password"]', who.password);
  await p.getByRole("button", { name: "Log in" }).click();
  await p.locator("header select").waitFor({ timeout: 60000 });
}
// Already signed in: reload so the study list is fetched again.
async function reopen(p) {
  await p.goto("http://localhost:3100/platform", { waitUntil: "networkidle", timeout: 120000 });
  await p.locator("header select").waitFor({ timeout: 60000 });
}
const studyOptions = (p) => p.locator("header select option").allTextContents();

try {
  const must = (r, what) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r; };
  orgId = must(await svc.from("organizations").insert([{ name: `e2e-${run}`, type: "Sponsor" }]).select("id").single(), "org").data.id;
  for (const [who, role, name] of [[lead, "TMF Lead", "Lea Lead"], [cra, "CRA", "Cora Monitor"]]) {
    who.id = must(await svc.auth.admin.createUser({ email: who.email, password: who.password, email_confirm: true }), "user").data.user.id;
    userIds.push(who.id);
    must(await svc.from("user_roles").insert([{ user_id: who.id, org_id: orgId, role, email: who.email, full_name: name, is_active: true }]), "role");
  }
  const [a, b] = [`CA-${run}`, `CB-${run}`];
  for (const code of [a, b]) must(await svc.from("studies").insert([{ org_id: orgId, user_id: lead.id, study_id: code, status: "Active", protocol: code, phase: "Phase II" }]), "study");
  must(await svc.from("study_members").insert([{ org_id: orgId, study_id: a, user_id: cra.id, email: cra.email, full_name: "Cora Monitor", role: "CRA", is_active: true }]), "member");

  browser = await chromium.launch({ channel: "chrome" });
  const craPage = await (await browser.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
  await login(craPage, cra);
  check(JSON.stringify(await studyOptions(craPage)) === JSON.stringify([a]), "CRA's study switcher shows only the assigned study");

  page = await (await browser.newContext({ viewport: { width: 1500, height: 1000 } })).newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => { errors.push(`unexpected dialog: ${d.message()}`); d.dismiss(); });
  await login(page, lead);
  await page.locator("header select").selectOption(b);
  await page.getByRole("button", { name: "CRO access" }).click();
  await page.getByText(/No CRO has access to this study yet/).waitFor({ timeout: 60000 });
  await page.getByRole("button", { name: /Give CRO access/ }).click();
  const dlg = page.getByRole("dialog", { name: "Give CRO access" });
  await dlg.getByPlaceholder("name@cro.com").fill(cra.email);
  await dlg.getByPlaceholder("e.g. Parexel").fill(`Parexel ${run}`);
  const until = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  await dlg.locator('input[type="date"]').fill(until);
  await dlg.getByRole("button", { name: "Give access" }).click();
  await page.getByText(`Access granted to ${cra.email}.`).waitFor({ timeout: 30000 });
  await page.getByRole("cell", { name: `Parexel ${run}` }).waitFor({ timeout: 15000 });
  check(true, "CRO shown on the member row");
  check(await page.getByRole("cell", { name: until }).isVisible(), "end date shown");
  await page.screenshot({ path: shot("granted"), fullPage: true });

  await reopen(craPage);
  check((await studyOptions(craPage)).includes(b), "CRA now sees the second study");

  await page.getByRole("button", { name: "Revoke" }).click();
  const rv = page.getByRole("dialog", { name: /Revoke access/ });
  await rv.locator("textarea").fill("Monitoring contract ended");
  await rv.getByRole("button", { name: "Revoke access" }).click();
  await page.getByText(`Access revoked for ${cra.email}.`).waitFor({ timeout: 30000 });
  check(await page.getByText("Monitoring contract ended").waitFor({ timeout: 15000 }).then(() => true), "revocation reason shown");
  await reopen(craPage);
  check(!(await studyOptions(craPage)).includes(b), "CRA no longer sees the second study");
  check(errors.length === 0, `no page errors ${JSON.stringify(errors)}`);
} catch (e) {
  failures.push(e.message.split("\n")[0]);
  console.log(`FAIL ${e.message}`);
  if (page) await page.screenshot({ path: shot("error") }).catch(() => {});
} finally {
  if (browser) await browser.close().catch(() => {});
  for (const id of userIds) await svc.from("user_roles").update({ is_active: false }).eq("user_id", id);
  console.log("cleaned up");
  if (failures.length) { console.log(`\n${failures.length} FAILED`); process.exitCode = 1; } else console.log("\nALL PASSED");
}
