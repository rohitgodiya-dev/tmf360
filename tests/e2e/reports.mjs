// End-to-end Reports & exports (Part 11b): real browser, DEV Supabase only.
// Usage: start `next dev -p 3100` with .env.dev loaded (SUPABASE_SERVICE_ROLE_KEY=$DEV_SUPABASE_SERVICE_ROLE_KEY), then: node tests/e2e/reports.mjs
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import JSZip from "jszip";
import { chromium } from "playwright";
process.loadEnvFile(".env.dev");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!url.includes("ikjusswwskrkjwxovgza")) throw new Error("not dev");
const svc = createClient(url, process.env.DEV_SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const run = randomUUID().slice(0, 8);
const studyCode = `E2R-${run}`;
const email = `e2e-${run}@example.test`, password = `Pw-${randomUUID()}`;
const shot = (n) => `test-screenshots/e2e-reports-${n}.png`;
const failures = [];
const check = (ok, what) => { console.log(`${ok ? "PASS" : "FAIL"} ${what}`); if (!ok) failures.push(what); };
let orgId, userId, browser, page;
const files = [`e2e/${run}/protocol.pdf`, `e2e/${run}/cv.pdf`];

try {
  const must = (r, what) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r; };
  orgId = must(await svc.from("organizations").insert([{ name: `e2e-${run}`, type: "Sponsor" }]).select("id").single(), "org").data.id;
  userId = must(await svc.auth.admin.createUser({ email, password, email_confirm: true }), "user").data.user.id;
  must(await svc.from("user_roles").insert([{ user_id: userId, org_id: orgId, role: "TMF Lead", email, full_name: "Rae Ports", is_active: true }]), "role");
  must(await svc.from("studies").insert([{ org_id: orgId, user_id: userId, study_id: studyCode, status: "Active", protocol: "E2E", phase: "Phase II", sponsor: "E2E" }]), "study");
  for (const f of files) must(await svc.storage.from("Documents").upload(f, new TextEncoder().encode(`%PDF-1.4\n% ${f}\n`), { contentType: "application/pdf" }), "upload");
  const base = { org_id: orgId, user_id: userId, study_id: studyCode, status: "Approved", approved_at: new Date().toISOString(), approved_by: "seed@example.test", file_type: "application/pdf" };
  must(await svc.from("documents").insert([
    { ...base, artifact_num: "02.01.02", artifact_name: "Protocol", custom_file_name: "Protocol v2.0", file_path: files[0], file_name: "protocol.pdf" },
    { ...base, artifact_num: "05.02.07", artifact_name: "Curriculum Vitae", custom_file_name: "CV Dr Lee", file_path: files[1], file_name: "cv.pdf" },
  ]), "docs");

  browser = await chromium.launch({ channel: "chrome" });
  page = await (await browser.newContext({ viewport: { width: 1500, height: 1000 }, acceptDownloads: true })).newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => { errors.push(`unexpected dialog: ${d.message()}`); d.dismiss(); });
  await page.goto("http://localhost:3100/platform", { waitUntil: "networkidle", timeout: 120000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.getByRole("button", { name: "Reports & exports" }).click();
  await page.getByText(`Reports & exports · ${studyCode}`).waitFor({ timeout: 60000 });
  await page.getByText("User Management Audit Trail", { exact: true }).waitFor({ timeout: 30000 });
  check(true, "report catalogue shown");

  // A report downloads as Excel.
  let dl = page.waitForEvent("download");
  await page.getByRole("button", { name: /Download Timeliness \(Excel\)/ }).click();
  let d = await dl;
  check(d.suggestedFilename().endsWith(".xlsx") && d.suggestedFilename().includes("timeliness"), "Timeliness report downloads as .xlsx");
  const book = await JSZip.loadAsync(await readFile(await d.path()));
  check(Object.keys(book.files).includes("xl/worksheets/sheet2.xml"), "workbook has summary + durations sheets");

  // Reversed dates are refused inline.
  await page.getByLabel("From").fill("2030-01-01");
  check(await page.getByText("The start date must be on or before the end date.").isVisible(), "reversed range refused");
  await page.getByLabel("From").fill(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));

  // ZIP export runs in the background and becomes downloadable.
  await page.getByRole("button", { name: /Start export/ }).click();
  await page.getByText("Export started.", { exact: false }).waitFor({ timeout: 30000 });
  await page.getByText("Ready", { exact: true }).waitFor({ timeout: 120000 });
  check(await page.getByText(/2 files/).isVisible(), "export lists 2 files");
  await page.screenshot({ path: shot("1-panel"), fullPage: true });
  dl = page.waitForEvent("download");
  await page.getByRole("button", { name: /Download$/ }).first().click();
  d = await dl;
  const zip = await JSZip.loadAsync(await readFile(await d.path()));
  const names = Object.keys(zip.files);
  check(names.some((n) => n.startsWith(`${studyCode}/02 `) && n.endsWith("Protocol v2.0.pdf")), "ZIP uses taxonomy folders");
  check(names.includes(`${studyCode}/metadata.xlsx`), "ZIP includes metadata spreadsheet");

  // Navigator Excel export.
  await page.getByRole("button", { name: "TMF Navigator" }).click();
  await page.getByRole("button", { name: /Excel$/ }).waitFor({ timeout: 30000 });
  await page.waitForFunction(() => [...document.querySelectorAll("button")].some((b) => /Excel$/.test(b.textContent ?? "") && !b.disabled), null, { timeout: 30000 });
  dl = page.waitForEvent("download");
  await page.getByRole("button", { name: /Excel$/ }).click();
  check((await dl).suggestedFilename().endsWith("-navigator.xlsx"), "Navigator exports to Excel");

  const { data: audit } = await svc.from("audit_trail").select("action").eq("org_id", orgId);
  const actions = new Set(audit.map((a) => a.action));
  check(["Report generated", "Export requested", "Export downloaded", "Navigator export"].every((a) => actions.has(a)), "report, export and download audited");
  check(errors.length === 0, `no page errors ${JSON.stringify(errors)}`);
} catch (e) {
  failures.push(e.message.split("\n")[0]);
  console.log(`FAIL ${e.message}`);
  if (page) await page.screenshot({ path: shot("error") }).catch(() => {});
} finally {
  if (browser) await browser.close().catch(() => {});
  await svc.storage.from("Documents").remove(files).catch(() => {});
  if (orgId) {
    const { data: jobs } = await svc.from("export_jobs").select("file_path").eq("org_id", orgId);
    const paths = (jobs ?? []).map((j) => j.file_path).filter(Boolean);
    if (paths.length) await svc.storage.from("exports").remove(paths);
    await svc.from("export_jobs").delete().eq("org_id", orgId);
    await svc.from("documents").delete().eq("org_id", orgId);
    for (const t of ["tmf_config", "qc_reasons", "studies"]) await svc.from(t).delete().eq("org_id", orgId);
  }
  if (userId) await svc.from("user_roles").update({ is_active: false }).eq("user_id", userId);
  console.log("cleaned up");
  if (failures.length) { console.log(`\n${failures.length} FAILED`); process.exitCode = 1; } else console.log("\nALL PASSED");
}
