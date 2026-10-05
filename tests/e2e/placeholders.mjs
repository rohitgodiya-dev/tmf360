// End-to-end eTMF plan + expected artifacts + completeness (Part 8a): real browser, DEV Supabase only.
// Usage: start `next dev -p 3100` with .env.dev loaded (SUPABASE_SERVICE_ROLE_KEY=$DEV_SUPABASE_SERVICE_ROLE_KEY), then: node tests/e2e/placeholders.mjs
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
process.loadEnvFile(".env.dev");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL, anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url.includes("ikjusswwskrkjwxovgza")) throw new Error("not dev");
const svc = createClient(url, process.env.DEV_SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const run = randomUUID().slice(0, 8);
const email = `e2e-${run}@example.test`, password = `Pw-${randomUUID()}`;
const shot = (n) => `test-screenshots/e2e-placeholders-${n}.png`;
const failures = [];
const check = (ok, what) => { console.log(`${ok ? "PASS" : "FAIL"} ${what}`); if (!ok) failures.push(what); };
let orgId, userId, studyUuid, browser, page;
const studyCode = `E2P-${run}`;

try {
  const must = (r, what) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r; };
  orgId = must(await svc.from("organizations").insert([{ name: `e2e-${run}`, type: "Sponsor" }]).select("id").single(), "org").data.id;
  userId = must(await svc.auth.admin.createUser({ email, password, email_confirm: true }), "user").data.user.id;
  must(await svc.from("user_roles").insert([{ user_id: userId, org_id: orgId, role: "TMF Lead", email, full_name: "Pat Lead", is_active: true }]), "role");
  studyUuid = must(await svc.from("studies").insert([{ org_id: orgId, user_id: userId, study_id: studyCode, status: "Startup", protocol: "E2E", phase: "Phase II", sponsor: "E2E" }]).select("id").single(), "study").data.id;
  const userDb = createClient(url, anon, { auth: { persistSession: false } });
  await userDb.auth.signInWithPassword({ email, password });
  must(await userDb.rpc("seed_study_tmf_config", { p_study_code: studyCode }), "seed");
  for (const n of [1, 2]) must(await svc.from("documents").insert([{ org_id: orgId, user_id: userId, study_id: studyCode, artifact_num: "02.01.02", artifact_name: "Protocol", custom_file_name: `Protocol v${n}`, status: "Approved", file_path: `${orgId}/${studyCode}/p${n}.pdf` }]), "doc");

  browser = await chromium.launch({ channel: "chrome" });
  page = await (await browser.newContext({ viewport: { width: 1500, height: 950 } })).newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => { errors.push(`unexpected dialog: ${d.message()}`); d.dismiss(); });
  await page.goto("http://localhost:3100/platform", { waitUntil: "networkidle", timeout: 120000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.getByRole("button", { name: "TMF Navigator" }).waitFor({ timeout: 60000 });

  const tile = async (name) => (await page.locator("button[title]").filter({ has: page.locator("div", { hasText: new RegExp(`^${name}$`) }) }).first().locator("div").first().textContent()).trim();
  const until = async (fn, ms = 30000) => { const end = Date.now() + ms; while (Date.now() < end) { try { if (await fn()) return true; } catch {} await page.waitForTimeout(500); } return false; };
  const completeness = async () => (await page.getByText("Completeness", { exact: true }).locator("xpath=..").locator("div").first().textContent()).trim();

  // 1. eTMF plan in TMF Configuration: the protocol is expected twice at study level.
  await page.getByRole("button", { name: "TMF Configuration" }).click();
  await page.getByText("eTMF plan", { exact: true }).waitFor({ timeout: 30000 });
  await page.getByPlaceholder("e.g. TMF plan v2 approved").fill("Plan v1 approved");
  await page.getByRole("button", { name: "+ Add to plan" }).click();
  await page.getByPlaceholder("e.g. 05.02.07").fill("02.01.02");
  await page.getByLabel("How many").fill("3");
  await page.getByRole("button", { name: "Add to plan" }).last().click();
  await page.getByText("02.01.02 added to the plan.").waitFor({ timeout: 30000 });
  check(true, "plan: line added with a reason");

  // 2. Navigator before the plan is applied: Part 6 behaviour.
  await page.getByRole("button", { name: "TMF Navigator" }).click();
  await page.getByText("TMF Navigator —").waitFor({ timeout: 30000 });
  await page.getByText("Protocol v1").first().waitFor({ timeout: 30000 });
  check(Number(await tile("Missing")) > 100, "before plan: unplanned artifacts count as Missing");

  // 3. Apply the plan: 3 expected protocols, 2 already filled by the Final documents.
  await page.getByRole("button", { name: "Apply eTMF plan" }).click();
  await page.getByText("3 expected artifacts added from the eTMF plan.").waitFor({ timeout: 30000 });
  check(await until(async () => await tile("Missing") === "0" && await tile("Expected") === "1" && await tile("Final") === "2"), "after plan: 2 Final, 1 Expected, 0 Missing");
  check(await until(async () => await completeness() === "67%"), `completeness 67% (got ${await completeness()})`);

  // 4. Add an overdue expected artifact by hand.
  await page.getByRole("button", { name: "+ Expected artifact" }).click();
  await page.getByLabel("Artifact (required)").selectOption("01.01.01");
  await page.getByLabel("Due date").fill("2020-01-15");
  await page.getByLabel("Instructions for whoever files it").fill("Signed TMF plan, PDF");
  check(await page.getByText(/turning Missing after 2020-01-15/).isVisible(), "add: what-happens-next names the due date");
  await page.getByRole("button", { name: "Add expected artifact" }).click();
  await page.getByText("1 expected artifact added.").waitFor({ timeout: 30000 });
  check(await until(async () => await tile("Missing") === "1"), "overdue placeholder is Missing");
  check(await until(async () => await completeness() === "50%"), `completeness 50% (got ${await completeness()})`);
  await page.screenshot({ path: shot("1-grid") });

  // 5. Expected Artifacts view, drill-down to the grid.
  await page.getByRole("button", { name: "Expected artifacts" }).click();
  await page.getByText("Study total").waitFor({ timeout: 30000 });
  await page.screenshot({ path: shot("2-expected") });
  const zone1 = page.locator("tr", { hasText: /^01 / }).first();
  check(await zone1.isVisible(), "expected view: zone 01 listed");
  await zone1.getByRole("button", { name: /^01 / }).click();
  await page.getByRole("button", { name: /^Remove 01/ }).waitFor({ timeout: 15000 });
  await until(async () => await page.locator("tbody tr").count() === 1);
  check(await page.locator("tbody tr").count() === 1, "drill-down: zone chip shows the one placeholder");

  // 6. Placeholder panel: mark not needed with a reason.
  await page.locator("tbody tr").first().click();
  await page.getByText("Signed TMF plan, PDF").waitFor({ timeout: 15000 });
  await page.getByRole("button", { name: "Not needed" }).click();
  await page.getByLabel(/Reason \(required/).fill("Plan held by the sponsor");
  await page.getByRole("button", { name: "Mark not needed" }).click();
  await page.getByText("Nothing matches these filters.").waitFor({ timeout: 15000 });
  await page.getByRole("button", { name: "Clear all" }).click();
  check(await until(async () => await completeness() === "67%"), "cancelled placeholder no longer counts");
  const { data: cancelled } = await svc.from("placeholders").select("status, cancel_reason").eq("org_id", orgId).eq("artifact_num", "01.01.01").single();
  check(cancelled.status === "cancelled" && cancelled.cancel_reason === "Plan held by the sponsor", "cancel recorded with reason");

  check(errors.length === 0, `no page errors ${JSON.stringify(errors)}`);
} catch (e) {
  failures.push(e.message.split("\n")[0]);
  console.log(`FAIL ${e.message}`);
  if (page) await page.screenshot({ path: shot("error") }).catch(() => {});
} finally {
  if (browser) await browser.close().catch(() => {});
  if (orgId) {
    await svc.from("placeholders").delete().eq("org_id", orgId);
    await svc.from("plan_template_items").delete().eq("org_id", orgId);
    await svc.from("documents").delete().eq("org_id", orgId);
    for (const t of ["tmf_config", "qc_reasons", "studies", "user_roles"]) await svc.from(t).delete().eq("org_id", orgId);
  }
  if (userId) await svc.auth.admin.deleteUser(userId).catch(() => {});
  if (orgId) await svc.from("organizations").delete().eq("id", orgId);
  console.log("cleaned up");
  if (failures.length) { console.log(`\n${failures.length} FAILED`); process.exitCode = 1; } else console.log("\nALL PASSED");
}
