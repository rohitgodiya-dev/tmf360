// End-to-end smoke test: real browser, local app, DEV Supabase only.
// Usage: node tests/e2e/smoke.mjs   (starts `next dev` itself; needs .env.dev)
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

const root = path.resolve(import.meta.dirname, "../..");
process.loadEnvFile(path.join(root, ".env.dev"));
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!URL_?.includes("ikjusswwskrkjwxovgza")) throw new Error("Refusing: not the dev project");
const admin = createClient(URL_, process.env.DEV_SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const PORT = 3124;
const BASE = `http://localhost:${PORT}`;
const OUT = path.join(root, "test-screenshots", "e2e");
fs.mkdirSync(OUT, { recursive: true });
const run = Math.random().toString(16).slice(2, 8);
const email = `e2e-${run}@example.test`;
const password = `E2e-${run}-Pass!`;
const results = [];
const check = (name, ok, note = "") => { results.push({ name, ok, note }); console.log(ok ? "PASS" : "FAIL", name, note); };

let orgId, userId, studyRowId, server;
async function setup() {
  const { data: org } = await admin.from("organizations").insert([{ name: `test-${run}-e2e` }]).select("id").single();
  orgId = org.id;
  const { data: u, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  userId = u.user.id;
  await admin.from("organizations").update({ created_by: userId }).eq("id", orgId);
  const { error: rErr } = await admin.from("user_roles").insert([{ user_id: userId, org_id: orgId, email, role: "System Administrator", is_active: true, full_name: "E2E Admin" }]);
  if (rErr) throw rErr;
  const { data: st, error: sErr } = await admin.from("studies").insert([{ org_id: orgId, user_id: userId, study_id: `E2E-${run}`, protocol: "E2E protocol", phase: "Phase II", status: "Active", sponsor: "E2E Pharma" }]).select("id").single();
  if (sErr) throw sErr;
  studyRowId = st.id;
}
async function cleanup() {
  for (const t of ["milestones", "contact_roles", "study_sites", "study_countries", "study_parties", "persons", "parties", "tmf_config"]) await admin.from(t).delete().eq("org_id", orgId);
  await admin.from("studies").delete().eq("org_id", orgId);
  await admin.from("user_roles").delete().eq("user_id", userId);
  await admin.auth.admin.deleteUser(userId);
  await admin.from("organizations").delete().eq("id", orgId);
}

function startServer() {
  return new Promise((resolve, reject) => {
    const env = { ...process.env, SUPABASE_SERVICE_ROLE_KEY: process.env.DEV_SUPABASE_SERVICE_ROLE_KEY, PORT: String(PORT) };
    server = spawn("npx", ["next", "dev", "-p", String(PORT)], { cwd: root, env, shell: true });
    const timer = setTimeout(() => reject(new Error("server start timeout")), 180000);
    server.stdout.on("data", (d) => { if (/Ready|ready in|Local:/i.test(String(d))) { clearTimeout(timer); resolve(); } });
    server.stderr.on("data", (d) => process.stderr.write(String(d).slice(0, 300)));
  });
}

try {
  await setup();
  await startServer();
  const browser = await chromium.launch({ channel: "chrome" });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 200)); });

  // Sign in through the real login form.
  await page.goto(`${BASE}/platform`, { waitUntil: "domcontentloaded", timeout: 180000 });
  await page.waitForSelector('input[type="password"]', { timeout: 180000 });
  await page.fill('input[type="email"], input[placeholder*="organisation"]', email);
  await page.fill('input[type="password"]', password);
  await page.getByRole("button", { name: /log in/i }).click();
  await page.waitForTimeout(6000);
  await page.screenshot({ path: `${OUT}/1-after-login.png` });
  const body1 = await page.locator("body").innerText();
  check("signed in to platform", !/log in/i.test(body1.slice(0, 300)) || /E2E-/.test(body1), body1.slice(0, 120).replace(/\s+/g, " "));

  // TMF Configuration panel: seeds the study on the server from the taxonomy.
  const nav = page.getByText("TMF Configuration", { exact: true }).first();
  if (await nav.count()) {
    await nav.click();
    await page.waitForTimeout(5000);
    await page.screenshot({ path: `${OUT}/2-tmf-config.png` });
    const { count } = await admin.from("tmf_config").select("id", { count: "exact", head: true }).eq("org_id", orgId);
    check("TMF configuration seeded from taxonomy (261 rows)", count === 261, `rows=${count}`);
    const txt = await page.locator("body").innerText();
    check("configuration panel shows zones", /Trial Management/.test(txt) && /Statistics/.test(txt));
  } else check("TMF Configuration nav present", false);

  // Study structure page (Part 2d).
  await page.goto(`${BASE}/platform/studies/${studyRowId}/structure`, { waitUntil: "domcontentloaded", timeout: 180000 });
  await page.waitForSelector("text=Study structure", { timeout: 180000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${OUT}/3-structure-empty.png` });
  check("structure page loads for the study", await page.getByText(`Study structure — E2E-${run}`).count() > 0);
  await page.getByRole("button", { name: "+ Add country" }).click();
  await page.getByPlaceholder("US").fill("DE");
  await page.getByRole("button", { name: "Add country" }).last().click();
  await page.waitForTimeout(2500);
  check("country added through the UI", await page.getByText("Germany (DE)").count() > 0);
  await page.getByRole("button", { name: "+ Add site" }).click();
  await page.getByPlaceholder("1121").fill("4401");
  await page.locator("select").nth(0).selectOption("__new");
  await page.locator("label:has-text('New institution name') input").fill("Charité Berlin");
  await page.getByRole("button", { name: "Add site" }).last().click();
  await page.waitForTimeout(2500);
  check("site added with a new institution", await page.getByText("4401 — Charité Berlin").count() > 0);
  await page.getByRole("button", { name: "Change status" }).last().click();
  await page.locator("select").nth(0).selectOption("ongoing");
  check("dialog explains the milestone it will complete", await page.getByText(/Site activated/).count() > 0);
  await page.locator("textarea").fill("Site initiation visit completed");
  await page.getByRole("button", { name: "Change status" }).last().click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/4-structure-with-site.png`, fullPage: true });
  const txt4 = await page.locator("body").innerText();
  check("site shows Ongoing and the achieved milestone", /Ongoing/.test(txt4) && /Site activated/.test(txt4) && /from site status/.test(txt4));
  const { data: audit } = await admin.from("audit_trail").select("action").eq("org_id", orgId);
  check("UI changes were audited", (audit ?? []).some((a) => a.action === "study_sites.update"), `entries=${audit?.length}`);

  const realErrors = errors.filter((e) => !/favicon|Download the React DevTools|hydrat/i.test(e));
  check("no page errors", realErrors.length === 0, realErrors.slice(0, 3).join(" | "));
  await browser.close();
} catch (e) {
  check("run completed", false, e.message);
} finally {
  await cleanup().catch((e) => console.error("cleanup failed", e.message));
  if (server) {
    // Stop the dev server and its child processes (Windows needs taskkill /T).
    if (process.platform === "win32") spawn("taskkill", ["/PID", String(server.pid), "/T", "/F"]);
    else { try { process.kill(-server.pid); } catch { server.kill(); } }
  }
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
}
