// End-to-end Migration & import (Part 12b): real browser, DEV Supabase only.
// Usage: start `next dev -p 3100` with .env.dev loaded, then: node tests/e2e/migration.mjs
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
process.loadEnvFile(".env.dev");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL, anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url.includes("ikjusswwskrkjwxovgza")) throw new Error("not dev");
const svc = createClient(url, process.env.DEV_SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const run = randomUUID().slice(0, 8);
const studyCode = `E2M-${run}`;
const email = `e2e-${run}@example.test`, password = `Pw-${randomUUID()}`;
const shot = (n) => `test-screenshots/e2e-migration-${n}.png`;
const failures = [];
const check = (ok, what) => { console.log(`${ok ? "PASS" : "FAIL"} ${what}`); if (!ok) failures.push(what); };
let orgId, userId, browser, page;

try {
  const must = (r, what) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r; };
  orgId = must(await svc.from("organizations").insert([{ name: `e2e-${run}`, type: "Sponsor" }]).select("id").single(), "org").data.id;
  userId = must(await svc.auth.admin.createUser({ email, password, email_confirm: true }), "user").data.user.id;
  must(await svc.from("user_roles").insert([{ user_id: userId, org_id: orgId, role: "TMF Lead", email, full_name: "Mia Grate", is_active: true }]), "role");
  must(await svc.from("studies").insert([{ org_id: orgId, user_id: userId, study_id: studyCode, status: "Active", protocol: "E2E", phase: "Phase II", sponsor: "E2E" }]), "study");
  const userDb = createClient(url, anon, { auth: { persistSession: false } });
  await userDb.auth.signInWithPassword({ email, password });
  must(await userDb.rpc("seed_study_tmf_config", { p_study_code: studyCode }), "seed");
  const { data: arts } = await svc.from("tmf_config").select("artifact_num").eq("study_id", studyCode).eq("type", "artifact").eq("is_enabled", true).order("artifact_num");
  const protocolArt = arts.find((a) => a.artifact_num.startsWith("02.")).artifact_num;

  const dir = tmpdir();
  const fileA = join(dir, `protocol-${run}.pdf`), fileB = join(dir, `plan-${run}.pdf`), manifest = join(dir, `manifest-${run}.csv`);
  await writeFile(fileA, `%PDF-1.4\n% protocol ${run}\n`);
  await writeFile(fileB, `%PDF-1.4\n% plan ${run}\n`);
  await writeFile(manifest, [
    "File,Document type,Status,Title,Version,Effective date,Created,ID",
    `protocol-${run}.pdf,Legacy Protocol,Approved,"Protocol, version 4",4.0,2023-05-01,2023-04-20,LV-100`,
    `plan-${run}.pdf,${arts[0].artifact_num},Draft,TMF Plan,1.0,,2022-01-10,LV-101`,
  ].join("\r\n"));

  browser = await chromium.launch({ channel: "chrome" });
  page = await (await browser.newContext({ viewport: { width: 1500, height: 1000 } })).newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => { errors.push(`unexpected dialog: ${d.message()}`); d.dismiss(); });
  await page.goto("http://localhost:3100/platform", { waitUntil: "networkidle", timeout: 120000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.getByRole("button", { name: "Migration & import" }).click();
  await page.getByText(`Migration & import · ${studyCode}`).waitFor({ timeout: 60000 });

  await page.getByRole("button", { name: /New import batch/ }).click();
  await page.getByLabel("Batch name *").fill("Legacy vault wave 1");
  await page.getByLabel("Source system *").fill("LegacyVault");
  await page.getByRole("button", { name: "Open batch" }).click();
  await page.getByText("1. Stage documents and manifest").waitFor({ timeout: 30000 });
  await page.getByLabel("Documents to import").setInputFiles([fileA, fileB]);
  await page.getByLabel("Manifest").setInputFiles(manifest);
  await page.getByRole("button", { name: /Stage$/ }).click();
  await page.getByText("2 item(s) registered in the batch.").waitFor({ timeout: 60000 });
  check(true, "files staged with manifest");

  await page.getByRole("button", { name: /Run dry run/ }).click();
  await page.getByText("Dry run complete. Nothing has been filed.").waitFor({ timeout: 60000 });
  await page.getByText("Unmapped document type: Legacy Protocol").first().waitFor({ timeout: 30000 });
  check(true, "unmapped value in the exception queue");
  await page.getByLabel("Map Legacy Protocol").selectOption(protocolArt);
  await page.getByPlaceholder("e.g. Mapping agreed in migration plan v1").fill("Migration plan v1 mapping table");
  await page.getByRole("button", { name: /Save 1 mapping/ }).click();
  await page.getByText("Mappings saved. Run the dry run again.").waitFor({ timeout: 30000 });
  await page.getByRole("button", { name: /Run dry run/ }).click();
  await page.getByText("Dry run complete. Nothing has been filed.").waitFor({ timeout: 60000 });
  await page.getByText(/2 items · 2 ready · 0 exceptions/).waitFor({ timeout: 30000 });
  check(true, "dry run clean after mapping");

  await page.getByRole("button", { name: /Reconcile$/ }).click();
  await page.getByText(/Reconciled: every item is imported or excluded/).waitFor({ timeout: 30000 });
  await page.getByLabel("Your password (electronic signature) *").fill(password);
  await page.getByRole("button", { name: "Sign and file" }).click();
  await page.getByText("2 document(s) filed into the TMF.").waitFor({ timeout: 60000 });
  await page.getByText(/Import reconciled and accepted: Mia Grate/).waitFor({ timeout: 30000 });
  check(true, "accepted with signature");
  await page.screenshot({ path: shot("1-filed"), fullPage: true });

  const { data: docs } = await svc.from("documents").select("status, artifact_num, custom_file_name, provenance").eq("org_id", orgId).order("artifact_num");
  check(docs.length === 2, "two documents in the live TMF");
  const protocol = docs.find((d) => d.artifact_num === protocolArt);
  check(protocol?.status === "Approved" && protocol?.custom_file_name === "Protocol, version 4", "Final record filed as Final with its title");
  check(protocol?.provenance?.source_system === "LegacyVault" && protocol?.provenance?.source_id === "LV-100" && protocol?.provenance?.original_created === "2023-04-20", "provenance kept");
  check(errors.length === 0, `no page errors ${JSON.stringify(errors)}`);
} catch (e) {
  failures.push(e.message.split("\n")[0]);
  console.log(`FAIL ${e.message}`);
  if (page) await page.screenshot({ path: shot("error") }).catch(() => {});
} finally {
  if (browser) await browser.close().catch(() => {});
  if (orgId) await svc.from("import_mappings").delete().eq("org_id", orgId);
  // Filed documents, signatures and batches are GxP history and stay on DEV.
  if (userId) await svc.from("user_roles").update({ is_active: false }).eq("user_id", userId);
  console.log("cleaned up");
  if (failures.length) { console.log(`\n${failures.length} FAILED`); process.exitCode = 1; } else console.log("\nALL PASSED");
}
