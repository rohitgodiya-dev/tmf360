// End-to-end Risk & oversight (Part 11d): real browser, DEV Supabase only.
// Usage: start `next dev -p 3100` with .env.dev loaded (SUPABASE_SERVICE_ROLE_KEY=$DEV_SUPABASE_SERVICE_ROLE_KEY), then: node tests/e2e/risk.mjs
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
process.loadEnvFile(".env.dev");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL, anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url.includes("ikjusswwskrkjwxovgza")) throw new Error("not dev");
const svc = createClient(url, process.env.DEV_SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const run = randomUUID().slice(0, 8);
const studyCode = `E2K-${run}`;
const email = `e2e-${run}@example.test`, password = `Pw-${randomUUID()}`;
const shot = (n) => `test-screenshots/e2e-risk-${n}.png`;
const failures = [];
const check = (ok, what) => { console.log(`${ok ? "PASS" : "FAIL"} ${what}`); if (!ok) failures.push(what); };
let orgId, userId, studyId, browser, page;

try {
  const must = (r, what) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r; };
  orgId = must(await svc.from("organizations").insert([{ name: `e2e-${run}`, type: "Sponsor" }]).select("id").single(), "org").data.id;
  userId = must(await svc.auth.admin.createUser({ email, password, email_confirm: true }), "user").data.user.id;
  must(await svc.from("user_roles").insert([{ user_id: userId, org_id: orgId, role: "Quality Assurance", email, full_name: "Quinn Assure", is_active: true }]), "role");
  studyId = must(await svc.from("studies").insert([{ org_id: orgId, user_id: userId, study_id: studyCode, status: "Active", protocol: "E2E", phase: "Phase II", sponsor: "E2E" }]).select("id").single(), "study").data.id;
  must(await svc.from("study_members").insert([{ org_id: orgId, study_id: studyCode, user_id: userId, email, full_name: "Quinn Assure", role: "Quality Assurance", is_active: true }]), "member");
  const userDb = createClient(url, anon, { auth: { persistSession: false } });
  await userDb.auth.signInWithPassword({ email, password });
  must(await userDb.rpc("seed_study_tmf_config", { p_study_code: studyCode }), "seed");
  must(await svc.from("placeholders").insert([
    { org_id: orgId, study_id: studyId, artifact_num: "01.01.01", artifact_name: "Trial Master File Plan", level: "study", title: "TMF Plan", due_date: "2021-01-01", responsible_dept: "TMF Ops" },
    { org_id: orgId, study_id: studyId, artifact_num: "02.01.02", artifact_name: "Protocol", level: "study", title: "Protocol v2", responsible_dept: "Clinical" },
  ]), "placeholders");

  browser = await chromium.launch({ channel: "chrome" });
  page = await (await browser.newContext({ viewport: { width: 1500, height: 1000 } })).newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => { errors.push(`unexpected dialog: ${d.message()}`); d.dismiss(); });
  await page.goto("http://localhost:3100/platform", { waitUntil: "networkidle", timeout: 120000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.getByRole("button", { name: "Risk & oversight" }).click();
  await page.getByText(`Risk & oversight · ${studyCode}`).waitFor({ timeout: 60000 });
  await page.getByText(/^2 expected artifacts missing \(\d+ Core\), 1 overdue$/).waitFor({ timeout: 30000 });
  check(true, "study explanation in words");
  check(await page.getByText(/1 × Missing artifact \(weight 3\), × impact/).first().isVisible(), "artifact score explained");
  await page.getByRole("button", { name: "By owner" }).click();
  await page.getByText("TMF Ops", { exact: false }).first().waitFor({ timeout: 10000 });
  check(true, "roll-up by owner");

  // Turn missing artifacts off: the scores disappear.
  await page.getByRole("button", { name: /Weights & thresholds/ }).click();
  await page.getByLabel("Weight Missing artifact").fill("0");
  await page.getByLabel("Reason for the change *").fill("Pilot: completeness tracked elsewhere");
  await page.getByRole("button", { name: "Save" }).click();
  await page.getByText("Weights and thresholds saved.").waitFor({ timeout: 30000 });
  await page.getByText("No risk events: nothing missing, rejected or late.").waitFor({ timeout: 30000 });
  check(true, "weight 0 disables the factor");

  // Oversight activity: create, then complete with a signature.
  await page.getByRole("button", { name: /New activity/ }).click();
  await page.getByLabel("Title *").fill("Quarterly TMF review");
  await page.getByLabel("Rationale *").fill("Two expected artifacts missing, one overdue");
  await page.getByRole("button", { name: "Create activity" }).click();
  await page.getByText("OVS-001").waitFor({ timeout: 30000 });
  await page.getByRole("button", { name: /Complete$/ }).click();
  await page.getByLabel("Outcome of the review *").fill("Plan filed; protocol requested");
  await page.getByLabel("Your password (electronic signature) *").fill(password);
  await page.getByRole("button", { name: "Sign and complete" }).click();
  await page.getByText(/Oversight review completed: Quinn Assure/).waitFor({ timeout: 30000 });
  check(await page.getByText("Completed", { exact: true }).isVisible(), "activity completed with signature");
  await page.screenshot({ path: shot("1-panel"), fullPage: true });
  check(errors.length === 0, `no page errors ${JSON.stringify(errors)}`);
} catch (e) {
  failures.push(e.message.split("\n")[0]);
  console.log(`FAIL ${e.message}`);
  if (page) await page.screenshot({ path: shot("error") }).catch(() => {});
} finally {
  if (browser) await browser.close().catch(() => {});
  if (orgId) for (const t of ["risk_factor_weights", "risk_settings", "placeholders"]) await svc.from(t).delete().eq("org_id", orgId);
  // Signed oversight records stay on DEV as GxP history.
  if (userId) await svc.from("user_roles").update({ is_active: false }).eq("user_id", userId);
  console.log("cleaned up");
  if (failures.length) { console.log(`\n${failures.length} FAILED`); process.exitCode = 1; } else console.log("\nALL PASSED");
}
