// End-to-end Part 20: Bulk import — a studies CSV with an error is rejected by the dry run, the fixed file imports, (ENT-12)
// then a sites CSV imports into the new study. DEV only.
// Usage: start `next dev -p 3100` with .env.dev loaded, then: node tests/e2e/bulk-import.mjs
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
process.loadEnvFile(".env.dev");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!url.includes("ikjusswwskrkjwxovgza")) throw new Error("not dev");
const svc = createClient(url, process.env.DEV_SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const run = randomUUID().slice(0, 8);
const email = `e2e-${run}@example.test`, password = `Pw-${randomUUID()}`;
const shot = (n) => `test-screenshots/e2e-part20-${n}.png`;
const failures = [];
const check = (ok, what) => { console.log(`${ok ? "PASS" : "FAIL"} ${what}`); if (!ok) failures.push(what); };
let userId, browser, page;
const file = async (name, text) => { const p = join(tmpdir(), `${run}-${name}`); await writeFile(p, text); return p; };

try {
  const must = (r, what) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r; };
  const orgId = must(await svc.from("organizations").insert([{ name: `e2e-${run}`, type: "Sponsor" }]).select("id").single(), "org").data.id;
  userId = must(await svc.auth.admin.createUser({ email, password, email_confirm: true }), "user").data.user.id;
  must(await svc.from("user_roles").insert([{ user_id: userId, org_id: orgId, role: "Sponsor Admin", email, full_name: "Bulk Importer", is_active: true }]), "role");
  const [a, b] = [`IMP-${run}-A`, `IMP-${run}-B`];
  const bad = await file("studies-bad.csv", `study_id,protocol,phase,sponsor,status\n${a},Study A,III,Acme,Startup\n${b},Study B,Phase 9,Acme,\n`);
  const good = await file("studies.csv", `study_id,protocol,phase,sponsor,status\n${a},Study A,III,Acme,Startup\n${b},"Study B, extension",Obs,Acme,\n`);
  const sites = await file("sites.csv", `site_name,site_code,country_code,city,pi_name,pi_email,study_id\nMayo ${run},MAY-1,US,Rochester,Dr. Jane Smith,j-${run}@mayo.test,${a}\nCharité ${run},BER-1,de,Berlin,,,${a}\n`);

  browser = await chromium.launch({ channel: "chrome" });
  page = await (await browser.newContext({ viewport: { width: 1500, height: 1000 } })).newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => { errors.push(`unexpected dialog: ${d.message()}`); d.dismiss(); });
  await page.goto("http://localhost:3100/platform", { waitUntil: "networkidle", timeout: 120000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.getByRole("button", { name: "Bulk import" }).click();
  await page.getByText("Import studies").waitFor({ timeout: 60000 });

  await page.getByLabel("Choose studies CSV").setInputFiles(bad);
  await page.getByText("1 with errors").waitFor({ timeout: 30000 });
  check(await page.getByText(/phase: Use I, II, III/).isVisible(), "dry run explains the bad phase");
  check(await page.getByRole("button", { name: /Import 2 studies/ }).count() === 0, "import is not offered while errors remain");
  await page.screenshot({ path: shot("dry-run"), fullPage: true });

  await page.getByLabel("Choose studies CSV").setInputFiles(good);
  await page.getByRole("button", { name: "Import 2 studies" }).click();
  await page.getByText(/Imported 2 studies/).waitFor({ timeout: 30000 });
  await page.waitForFunction((code) => [...document.querySelectorAll("header select option")].some((o) => o.textContent === code), a, { timeout: 15000 });
  check(true, "imported studies appear in the study switcher");

  await page.getByLabel("Choose sites CSV").setInputFiles(sites);
  await page.getByRole("button", { name: "Import 2 sites" }).click();
  await page.getByText(/Imported 2 sites/).waitFor({ timeout: 30000 });
  const { data: s } = await svc.from("study_sites").select("site_number").eq("org_id", orgId).order("site_number");
  check(JSON.stringify(s?.map((x) => x.site_number)) === JSON.stringify(["BER-1", "MAY-1"]), "sites are in the study");
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
