// End-to-end Document Intake test: real browser, DEV Supabase only.
// Usage: start `next dev -p 3100` with .env.dev loaded (SUPABASE_SERVICE_ROLE_KEY=$DEV_SUPABASE_SERVICE_ROLE_KEY), then: node tests/e2e/intake.mjs
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
process.loadEnvFile(".env.dev");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL, anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url.includes("ikjusswwskrkjwxovgza")) throw new Error("not dev");
const svc = createClient(url, process.env.DEV_SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const run = randomUUID().slice(0, 8);
const email = `e2e-${run}@example.test`, password = `Pw-${randomUUID()}`;
const shot = (n) => `test-screenshots/e2e-intake-${n}.png`;
let orgId, userId, studyCode = `E2E-${run}`;
try {
  orgId = (await svc.from("organizations").insert([{ name: `e2e-${run}`, type: "Sponsor" }]).select("id").single()).data.id;
  userId = (await svc.auth.admin.createUser({ email, password, email_confirm: true })).data.user.id;
  const must = (r, what) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r; };
  must(await svc.from("user_roles").insert([{ user_id: userId, org_id: orgId, role: "TMF Lead", email, full_name: "E2E Lead", is_active: true }]), "user_roles");
  must(await svc.from("studies").insert([{ org_id: orgId, user_id: userId, study_id: studyCode, status: "Startup", protocol: "E2E", phase: "Phase II", sponsor: "E2E" }]), "studies");
  const userDb = createClient(url, anon, { auth: { persistSession: false } });
  await userDb.auth.signInWithPassword({ email, password });
  const seeded = await userDb.rpc("seed_study_tmf_config", { p_study_code: studyCode });
  console.log("seeded tmf_config rows:", seeded.data, seeded.error?.message ?? "");

  const pdf = Buffer.from(`%PDF-1.4\n% e2e ${run}\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n`);
  const browser = await chromium.launch({ channel: "chrome" });
  const page = await browser.newPage({ viewport: { width: 1400, height: 950 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => { console.log("dialog:", d.message()); d.accept(); });
  await page.goto("http://localhost:3100/platform", { waitUntil: "networkidle", timeout: 120000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.getByText("Document Intake").first().waitFor({ timeout: 60000 });
  await page.getByText("Document Intake").first().click();
  await page.getByText("Drop files here").waitFor({ timeout: 30000 });
  await page.screenshot({ path: shot("1-empty") });
  await page.setInputFiles('input[type="file"][multiple]', { name: "Protocol E2E.pdf", mimeType: "application/pdf", buffer: pdf });
  await page.getByText("Integrity verified").waitFor({ timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: shot("2-received") });
  const select = page.locator("select").filter({ hasText: "Choose an artifact" });
  const options = await select.locator("option").allTextContents();
  await select.selectOption({ index: 1 });
  console.log("chose artifact:", options[1]);
  await page.locator('input[placeholder="Protocol E2E.pdf"]').fill("Protocol (E2E)");
  await page.getByRole("button", { name: "File to TMF" }).click();
  await page.getByText("was filed to the TMF as a Draft").waitFor({ timeout: 30000 });
  console.log("queue empty after filing:", await page.getByText("Nothing waiting in intake.").isVisible());
  await page.screenshot({ path: shot("3-filed") });
  const { data: docs } = await svc.from("documents").select("id, status, artifact_num, custom_file_name").eq("org_id", orgId);
  console.log("documents:", JSON.stringify(docs));
  await page.getByText("Documents", { exact: true }).first().click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: shot("4-documents") });
  console.log("documents panel shows filed doc:", await page.getByText("Protocol (E2E)").count() > 0);

  // Part 5b: "+ Add document" sends the file to Document Intake (indexed), not straight into the TMF.
  const rejectOpen = async (reason) => {
    await page.getByRole("button", { name: "Reject", exact: true }).click();
    await page.getByLabel("Reason for rejecting (required)").fill(reason);
    await page.getByRole("button", { name: "Confirm reject" }).click();
    await page.getByText("Nothing waiting in intake.").waitFor({ timeout: 30000 });
  };
  const pdf2 = Buffer.from(`%PDF-1.4\n% e2e second ${run}\n%%EOF\n`);
  await page.getByRole("button", { name: "+ Add document" }).click();
  await page.setInputFiles('input[type="file"]:not([multiple])', { name: "Monitoring E2E.pdf", mimeType: "application/pdf", buffer: pdf2 });
  await page.getByText("Monitoring E2E.pdf ready").first().waitFor({ timeout: 30000 });
  await page.screenshot({ path: shot("5-add-modal") });
  await page.getByRole("button", { name: "Send to Document Intake" }).click();
  await page.getByText("Drop files here").waitFor({ timeout: 30000 });
  await page.getByText("Monitoring E2E.pdf").first().waitFor({ timeout: 30000 });
  const { count: directDocs } = await svc.from("documents").select("id", { count: "exact", head: true }).eq("org_id", orgId);
  const { data: modalItem } = await svc.from("intake_items").select("status, artifact_num").eq("org_id", orgId).eq("file_name", "Monitoring E2E.pdf").single();
  console.log("add-document went to intake:", JSON.stringify(modalItem), "documents still:", directDocs);
  await page.screenshot({ path: shot("6-modal-in-intake") });
  await rejectOpen("E2E: not needed");

  // The same file again (already a Draft in the TMF) → warning.
  await page.setInputFiles('input[type="file"][multiple]', { name: "Protocol E2E.pdf", mimeType: "application/pdf", buffer: pdf });
  await page.getByText("Possible duplicate").waitFor({ timeout: 60000 });
  await page.screenshot({ path: shot("7-duplicate-warning") });
  await rejectOpen("E2E: duplicate");

  // Once that document is Final, the same file is blocked.
  await svc.from("documents").update({ status: "Approved" }).eq("id", docs[0].id);
  await page.setInputFiles('input[type="file"][multiple]', { name: "Protocol E2E.pdf", mimeType: "application/pdf", buffer: pdf });
  await page.getByText("Duplicate — blocked").waitFor({ timeout: 60000 });
  await page.locator("select").filter({ hasText: "Choose an artifact" }).selectOption({ index: 1 });
  console.log("file button disabled when blocked:", await page.getByRole("button", { name: "File to TMF" }).isDisabled());
  await page.screenshot({ path: shot("8-duplicate-blocked") });
  console.log("page errors:", JSON.stringify(errors));
  await browser.close();
} finally {
  if (orgId) {
    const { data: items } = await svc.from("intake_items").select("filed_document_id, file_path").eq("org_id", orgId);
    const docIds = (items ?? []).map((i) => i.filed_document_id).filter(Boolean);
    await svc.from("intake_items").delete().eq("org_id", orgId);
    if (docIds.length) { await svc.from("document_file_versions").delete().in("document_id", docIds); await svc.from("documents").delete().in("id", docIds); }
    const paths = (items ?? []).map((i) => i.file_path);
    if (paths.length) await svc.storage.from("Documents").remove(paths);
    await svc.from("tmf_config").delete().eq("org_id", orgId);
    await svc.from("studies").delete().eq("org_id", orgId);
    await svc.from("user_roles").delete().eq("org_id", orgId);
  }
  if (userId) await svc.auth.admin.deleteUser(userId);
  if (orgId) await svc.from("organizations").delete().eq("id", orgId);
  console.log("cleaned up");
}
