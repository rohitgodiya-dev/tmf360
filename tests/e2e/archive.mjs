// End-to-end Archive & retention (Part 11c): real browser, DEV Supabase only.
// Usage: start `next dev -p 3100` with .env.dev loaded (SUPABASE_SERVICE_ROLE_KEY=$DEV_SUPABASE_SERVICE_ROLE_KEY), then: node tests/e2e/archive.mjs
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
const studyCode = `E2A-${run}`;
const email = `e2e-${run}@example.test`, password = `Pw-${randomUUID()}`;
const shot = (n) => `test-screenshots/e2e-archive-${n}.png`;
const failures = [];
const check = (ok, what) => { console.log(`${ok ? "PASS" : "FAIL"} ${what}`); if (!ok) failures.push(what); };
let orgId, userId, studyId, browser, page;
const file = `e2e/${run}/protocol.pdf`;

try {
  const must = (r, what) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r; };
  orgId = must(await svc.from("organizations").insert([{ name: `e2e-${run}`, type: "Sponsor" }]).select("id").single(), "org").data.id;
  userId = must(await svc.auth.admin.createUser({ email, password, email_confirm: true }), "user").data.user.id;
  must(await svc.from("user_roles").insert([{ user_id: userId, org_id: orgId, role: "TMF Lead", email, full_name: "Arch Ivist", is_active: true }]), "role");
  studyId = must(await svc.from("studies").insert([{ org_id: orgId, user_id: userId, study_id: studyCode, status: "Active", protocol: "E2E", phase: "Phase III", sponsor: "E2E" }]).select("id").single(), "study").data.id;
  must(await svc.storage.from("Documents").upload(file, new TextEncoder().encode("%PDF-1.4\n% e2e\n"), { contentType: "application/pdf" }), "upload");
  must(await svc.from("documents").insert([{ org_id: orgId, user_id: userId, study_id: studyCode, status: "Approved", approved_at: new Date().toISOString(), approved_by: "seed@example.test",
    artifact_num: "02.01.02", artifact_name: "Protocol", custom_file_name: "Protocol v3", file_path: file, file_name: "protocol.pdf", file_type: "application/pdf" }]), "doc");

  browser = await chromium.launch({ channel: "chrome" });
  page = await (await browser.newContext({ viewport: { width: 1500, height: 1000 }, acceptDownloads: true })).newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => { errors.push(`unexpected dialog: ${d.message()}`); d.dismiss(); });
  await page.goto("http://localhost:3100/platform", { waitUntil: "networkidle", timeout: 120000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.getByRole("button", { name: "Archive & retention" }).click();
  await page.getByText(`Archive & retention · ${studyCode}`).waitFor({ timeout: 60000 });
  await page.getByText("No retention policy yet.", { exact: false }).waitFor({ timeout: 30000 });
  check(true, "no policy state shown");

  // Organisation default retention.
  await page.getByRole("button", { name: /Organisation default/ }).click();
  await page.getByLabel("Years").fill("25");
  await page.getByLabel("Reason for the change *").fill("SOP-RET-01 v2");
  await page.getByRole("button", { name: "Save" }).click();
  await page.getByText("Retention policy saved.").waitFor({ timeout: 30000 });
  await page.getByText("25 years from study close-out").waitFor({ timeout: 30000 });
  check(true, "effective policy shown");
  await page.getByText("waiting for study close-out").waitFor({ timeout: 30000 });
  check(true, "retention waits for close-out");

  // Legal hold on the study.
  await page.getByRole("button", { name: /Place legal hold/ }).click();
  await page.getByLabel("Reason *").fill("Patent litigation");
  await page.getByLabel("Reference (matter or case number)").fill("CASE-7");
  await page.getByRole("button", { name: "Place hold" }).click();
  await page.getByText("Legal hold placed.").waitFor({ timeout: 30000 });
  await page.getByText("Legal holds (1 active)").waitFor({ timeout: 30000 });
  check(true, "hold active");

  // Close the study with an electronic signature.
  await page.getByRole("button", { name: /Close study/ }).click();
  await page.getByLabel("Reason *").fill("Database lock and CSR final");
  await page.getByLabel("Your password (electronic signature) *").fill("wrong-password");
  await page.getByRole("button", { name: "Sign and close" }).click();
  await page.getByText("That password is not correct").waitFor({ timeout: 30000 });
  check(true, "wrong password refused");
  await page.getByLabel("Your password (electronic signature) *").fill(password);
  await page.getByRole("button", { name: "Sign and close" }).click();
  await page.getByText(/Study closed\. 0 open task/).waitFor({ timeout: 30000 });
  await page.getByText("Closed (read-only)").waitFor({ timeout: 30000 });
  check(true, "study shown closed");
  check(await page.getByText(/Study TMF closed: Arch Ivist/).isVisible(), "close-out signature manifestation shown");
  check(await page.getByText(/^Starts: \d{4}-\d{2}-\d{2}$/).isVisible(), "retention started at close-out");

  // Signed archive package.
  await page.getByRole("button", { name: /New package/ }).click();
  await page.getByLabel("Reason *").fill("End-of-study archive");
  await page.getByLabel("Your password (electronic signature) *").fill(password);
  await page.getByRole("button", { name: "Sign and build package" }).click();
  await page.getByText("Package approved and started.").waitFor({ timeout: 30000 });
  await page.getByText("Ready", { exact: true }).waitFor({ timeout: 120000 });
  check(await page.getByText(/Archive package approved: Arch Ivist/).isVisible(), "package signature shown");
  await page.screenshot({ path: shot("1-closed"), fullPage: true });
  const dl = page.waitForEvent("download");
  await page.getByRole("button", { name: /Download$/ }).first().click();
  const zip = await JSZip.loadAsync(await readFile(await (await dl).path()));
  const names = Object.keys(zip.files);
  check(["manifest.json", "audit-trail.xlsx", "signatures.xlsx", "metadata.xlsx"].every((f) => names.includes(`${studyCode}/${f}`)), "archive package contents");

  // Release the hold and reopen.
  await page.getByRole("button", { name: "Release hold" }).click();
  await page.getByLabel("Reason for release").fill("Litigation settled");
  await page.getByRole("button", { name: "Release", exact: true }).click();
  await page.getByText("Legal hold released.").waitFor({ timeout: 30000 });
  await page.getByRole("button", { name: /Reopen study/ }).click();
  await page.getByLabel("Reason *").fill("Late safety letter");
  await page.getByLabel("Your password (electronic signature) *").fill(password);
  await page.getByRole("button", { name: "Sign and reopen" }).click();
  await page.getByText("Study reopened.").waitFor({ timeout: 30000 });
  await page.getByText("Open", { exact: true }).waitFor({ timeout: 30000 });
  check(true, "study open again");
  check(errors.length === 0, `no page errors ${JSON.stringify(errors)}`);
} catch (e) {
  failures.push(e.message.split("\n")[0]);
  console.log(`FAIL ${e.message}`);
  if (page) await page.screenshot({ path: shot("error") }).catch(() => {});
} finally {
  if (browser) await browser.close().catch(() => {});
  await svc.storage.from("Documents").remove([file]).catch(() => {});
  if (orgId) {
    const { data: jobs } = await svc.from("export_jobs").select("file_path").eq("org_id", orgId);
    const paths = (jobs ?? []).map((j) => j.file_path).filter(Boolean);
    if (paths.length) await svc.storage.from("exports").remove(paths);
  }
  // Signed records (signatures, holds, packages) are GxP history and stay on DEV.
  if (userId) await svc.from("user_roles").update({ is_active: false }).eq("user_id", userId);
  console.log("cleaned up");
  if (failures.length) { console.log(`\n${failures.length} FAILED`); process.exitCode = 1; } else console.log("\nALL PASSED");
}
