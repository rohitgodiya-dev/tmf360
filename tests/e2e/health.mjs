// End-to-end TMF Health & Readiness (Part 9): real browser, DEV Supabase only.
// Usage: start `next dev -p 3100` with .env.dev loaded (SUPABASE_SERVICE_ROLE_KEY=$DEV_SUPABASE_SERVICE_ROLE_KEY), then: node tests/e2e/health.mjs
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
process.loadEnvFile(".env.dev");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL, anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url.includes("ikjusswwskrkjwxovgza")) throw new Error("not dev");
const svc = createClient(url, process.env.DEV_SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const run = randomUUID().slice(0, 8);
const studyCode = `E2H-${run}`;
const email = `e2e-${run}@example.test`, password = `Pw-${randomUUID()}`;
const shot = (n) => `test-screenshots/e2e-health-${n}.png`;
const failures = [];
const check = (ok, what) => { console.log(`${ok ? "PASS" : "FAIL"} ${what}`); if (!ok) failures.push(what); };
let orgId, userId, studyId, browser, page;
const day = (o) => new Date(Date.now() + o * 86400000).toISOString().slice(0, 10);

try {
  const must = (r, what) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r; };
  orgId = must(await svc.from("organizations").insert([{ name: `e2e-${run}`, type: "Sponsor" }]).select("id").single(), "org").data.id;
  userId = must(await svc.auth.admin.createUser({ email, password, email_confirm: true }), "user").data.user.id;
  must(await svc.from("user_roles").insert([{ user_id: userId, org_id: orgId, role: "TMF Lead", email, full_name: "Hal Health", is_active: true }]), "role");
  studyId = must(await svc.from("studies").insert([{ org_id: orgId, user_id: userId, study_id: studyCode, status: "Startup", protocol: "E2E", phase: "Phase II", sponsor: "E2E" }]).select("id").single(), "study").data.id;
  const userDb = createClient(url, anon, { auth: { persistSession: false } });
  await userDb.auth.signInWithPassword({ email, password });
  must(await userDb.rpc("seed_study_tmf_config", { p_study_code: studyCode }), "seed");
  const party = must(await svc.from("parties").insert([{ org_id: orgId, party_type: "site", name: `Site ${run}` }]).select("id").single(), "party").data.id;
  const country = must(await svc.from("study_countries").insert([{ org_id: orgId, study_id: studyId, country_code: "US" }]).select("id").single(), "country").data.id;
  const site = must(await svc.from("study_sites").insert([{ org_id: orgId, study_id: studyId, study_country_id: country, site_number: "201", site_party_id: party, display_name: "Chicago", status: "ongoing" }]).select("id").single(), "site").data.id;
  must(await svc.from("documents").insert([{ org_id: orgId, user_id: userId, study_id: studyCode, artifact_num: "05.02.07", artifact_name: "Curriculum Vitae", custom_file_name: "CV Dr Lee",
    status: "Approved", approved_at: new Date().toISOString(), approved_by: "seed@example.test", expiry_date: day(-20), study_site_id: site, file_path: `x/${run}/cv.pdf` }]), "doc");
  must(await userDb.from("placeholders").insert([{ org_id: orgId, study_id: studyId, artifact_num: "05.03.01", level: "site", study_site_id: site, title: "Signature log", due_date: "2021-03-01" }]), "placeholder");

  browser = await chromium.launch({ channel: "chrome" });
  page = await (await browser.newContext({ viewport: { width: 1500, height: 1000 }, acceptDownloads: true })).newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => { errors.push(`unexpected dialog: ${d.message()}`); d.dismiss(); });
  await page.goto("http://localhost:3100/platform", { waitUntil: "networkidle", timeout: 120000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.getByRole("button", { name: "TMF Health & Readiness" }).click();
  await page.getByText(`TMF Health & Readiness — ${studyCode}`).waitFor({ timeout: 60000 });

  for (const d of ["Completeness", "Timeliness", "Quality", "Risk", "Open issues"]) check(await page.getByText(d, { exact: true }).first().isVisible(), `dimension shown: ${d}`);
  check(!(await page.getByText("Readiness score").isVisible()), "no single merged score");
  check(await page.getByText("Expired records is 1, above the target of 0.").isVisible(), "amber indicator states its cause");
  await page.getByText("Expired document", { exact: true }).waitFor({ timeout: 30000 });
  check(await page.getByText(/CV Dr Lee \(05\.02\.07\) at site 201 expired on/).isVisible(), "finding names the record and site");
  check(await page.getByText("Active site with missing documents").isVisible(), "consistency rule: active site missing documents");
  check(await page.getByText(/Factors: criticality \d × severity 3 × overdue/).first().isVisible(), "priority factors shown");
  await page.screenshot({ path: shot("1-overview"), fullPage: true });

  // Drill down to the site.
  await page.getByRole("button", { name: "201 — Chicago (active)" }).click();
  await page.getByText("Findings — 201 — Chicago (active)").waitFor({ timeout: 15000 });
  check(true, "drill-down to site filters findings");

  // Accept one finding with a reason.
  const card = page.locator("div", { has: page.getByText("Active site with missing documents", { exact: true }) }).filter({ has: page.getByRole("button", { name: "Accept with reason" }) }).last();
  await card.getByRole("button", { name: "Accept with reason" }).click();
  await page.getByLabel("Reason for accepting").fill("Site activated under sponsor waiver W-12");
  await page.getByRole("button", { name: "Accept", exact: true }).click();
  await page.getByText("Finding accepted.").waitFor({ timeout: 30000 });
  const { data: acc } = await svc.from("findings").select("status, accepted_reason").eq("org_id", orgId).eq("rule_code", "RUL-SITE-ACTIVE-MISSING").single();
  check(acc.status === "accepted" && acc.accepted_reason === "Site activated under sponsor waiver W-12", "accepted with reason");

  // Run the assessment and export the report.
  await page.getByRole("button", { name: "Show all" }).click();
  await page.getByRole("button", { name: /Run readiness assessment/ }).click();
  await page.getByText(/Assessment complete: \d+ open finding/).waitFor({ timeout: 30000 });
  await page.getByText("Expired document", { exact: true }).waitFor({ timeout: 30000 });
  const dl = page.waitForEvent("download");
  await page.getByRole("button", { name: /Export report/ }).click();
  const csv = await readFile(await (await dl).path(), "utf8");
  check(csv.startsWith("Priority,Band,Rule") && csv.includes("Expired document"), "report exported as CSV");
  check(errors.length === 0, `no page errors ${JSON.stringify(errors)}`);
} catch (e) {
  failures.push(e.message.split("\n")[0]);
  console.log(`FAIL ${e.message}`);
  if (page) await page.screenshot({ path: shot("error") }).catch(() => {});
} finally {
  if (browser) await browser.close().catch(() => {});
  if (orgId) {
    for (const t of ["findings", "study_health_state", "health_snapshots", "placeholders"]) await svc.from(t).delete().eq("org_id", orgId);
    await svc.from("documents").delete().eq("org_id", orgId);
    for (const t of ["study_sites", "study_countries", "parties", "tmf_config", "qc_reasons", "studies", "user_roles"]) await svc.from(t).delete().eq("org_id", orgId);
  }
  if (userId) await svc.auth.admin.deleteUser(userId).catch(() => {});
  if (orgId) await svc.from("organizations").delete().eq("id", orgId);
  console.log("cleaned up");
  if (failures.length) { console.log(`\n${failures.length} FAILED`); process.exitCode = 1; } else console.log("\nALL PASSED");
}
