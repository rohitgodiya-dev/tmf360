// End-to-end TMF Navigator + viewer test (Part 6): real browser, DEV Supabase only.
// Usage: start `next dev -p 3100` with .env.dev loaded (SUPABASE_SERVICE_ROLE_KEY=$DEV_SUPABASE_SERVICE_ROLE_KEY), then: node tests/e2e/navigator.mjs
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
process.loadEnvFile(".env.dev");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL, anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url.includes("ikjusswwskrkjwxovgza")) throw new Error("not dev");
const svc = createClient(url, process.env.DEV_SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const run = randomUUID().slice(0, 8);
const email = `e2e-${run}@example.test`, password = `Pw-${randomUUID()}`;
const shot = (n) => `test-screenshots/e2e-navigator-${n}.png`;
let orgId, userId, partyId, studyUuid, studyCode = `E2N-${run}`, page, browser;
const failures = [];
const check = (ok, what) => { console.log(`${ok ? "PASS" : "FAIL"} ${what}`); if (!ok) failures.push(what); };

// A small valid two-page PDF, built with a correct cross-reference table.
function twoPagePdf(label) {
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 5 0 R /Resources << /Font << /F1 7 0 R >> >> >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 6 0 R /Resources << /Font << /F1 7 0 R >> >> >>",
  ];
  const stream = (t) => { const s = `BT /F1 28 Tf 72 700 Td (${t}) Tj ET`; return `<< /Length ${s.length} >>\nstream\n${s}\nendstream`; };
  objs.push(stream(`${label} page 1`), stream(`${label} page 2`), "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  let out = "%PDF-1.4\n";
  const offsets = objs.map((o, i) => { const at = out.length; out += `${i + 1} 0 obj\n${o}\nendobj\n`; return at; });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

try {
  const must = (r, what) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r; };
  orgId = (await svc.from("organizations").insert([{ name: `e2e-${run}`, type: "Sponsor" }]).select("id").single()).data.id;
  userId = (await svc.auth.admin.createUser({ email, password, email_confirm: true })).data.user.id;
  must(await svc.from("user_roles").insert([{ user_id: userId, org_id: orgId, role: "TMF Lead", email, full_name: "E2E Lead", is_active: true }]), "user_roles");
  studyUuid = must(await svc.from("studies").insert([{ org_id: orgId, user_id: userId, study_id: studyCode, status: "Startup", protocol: "E2E", phase: "Phase II", sponsor: "E2E" }]).select("id").single(), "studies").data.id;
  const userDb = createClient(url, anon, { auth: { persistSession: false } });
  await userDb.auth.signInWithPassword({ email, password });
  must(await userDb.rpc("seed_study_tmf_config", { p_study_code: studyCode }), "seed");
  partyId = must(await svc.from("parties").insert([{ org_id: orgId, party_type: "site", name: `Site ${run}` }]).select("id").single(), "party").data.id;
  const countryId = must(await svc.from("study_countries").insert([{ org_id: orgId, study_id: studyUuid, country_code: "US" }]).select("id").single(), "country").data.id;
  must(await svc.from("study_sites").insert([{ org_id: orgId, study_id: studyUuid, study_country_id: countryId, site_number: "101", site_party_id: partyId, display_name: "Atlanta Clinic" }]), "site");

  browser = await chromium.launch({ channel: "chrome" });
  const context = await browser.newContext({ viewport: { width: 1500, height: 950 }, acceptDownloads: true });
  page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => { errors.push(`unexpected dialog: ${d.message()}`); d.dismiss(); });
  await page.goto("http://localhost:3100/platform", { waitUntil: "networkidle", timeout: 120000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.getByRole("button", { name: "Log in" }).click();

  // File one PDF at site level through Document Intake.
  await page.getByText("Document Intake").first().waitFor({ timeout: 60000 });
  await page.getByText("Document Intake").first().click();
  await page.setInputFiles('input[type="file"][multiple]', { name: "Monitoring Plan.pdf", mimeType: "application/pdf", buffer: twoPagePdf(`Navigator ${run}`) });
  await page.getByText("Integrity verified").waitFor({ timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.locator("select").filter({ hasText: "Choose an artifact" }).selectOption({ index: 1 });
  await page.getByLabel("TMF level").selectOption({ label: "Site — 101 — Atlanta Clinic (US)" });
  check(await page.getByText("TMF level: Site — 101 — Atlanta Clinic (US)").isVisible(), "intake: what-happens-next names the site");
  await page.getByRole("button", { name: "File to TMF" }).click();
  await page.getByText("was filed to the TMF as a Draft").waitFor({ timeout: 30000 });
  const { data: filed } = await svc.from("documents").select("id, study_site_id, study_country_id").eq("org_id", orgId).single();
  check(!!filed.study_site_id && filed.study_country_id === countryId, "intake: filed document carries site and its country");

  // Navigator: tiles, grid.
  await page.getByRole("button", { name: "TMF Navigator" }).click();
  await page.getByText("TMF Navigator —").waitFor({ timeout: 30000 });
  await page.getByText("Monitoring Plan").first().waitFor({ timeout: 30000 });
  const tile = async (name) => Number(await page.locator("button", { hasText: name }).filter({ has: page.locator("div") }).first().locator("div").first().textContent());
  const { count: enabled } = await svc.from("tmf_config").select("id", { count: "exact", head: true }).eq("study_id", studyCode).eq("type", "artifact").eq("is_enabled", true);
  check(await tile("Under Revision") === 1, "tiles: Under Revision = 1");
  check(await tile("Missing") === enabled - 1, `tiles: Missing = enabled artifacts - 1 (${enabled - 1})`);
  await page.screenshot({ path: shot("1-grid") });

  // My Trial tree → site chip narrows to the one document.
  await page.getByRole("button", { name: "My Trial" }).click();
  await page.getByRole("button", { name: "Expand" }).first().click();
  await page.getByRole("button", { name: "101 — Atlanta Clinic" }).click();
  await page.getByRole("button", { name: "Remove 101 — Atlanta Clinic" }).waitFor();
  await page.waitForTimeout(1500);
  check(await page.locator("tbody tr").count() === 1, "tree: site chip shows only the site's document");
  await page.screenshot({ path: shot("2-site-chip") });

  // Metadata panel + viewer.
  await page.locator("tbody tr").first().click();
  await page.getByText("File history").waitFor({ timeout: 30000 });
  check(await page.getByText("Site · US · 101 Atlanta Clinic").isVisible(), "metadata: TMF level shows site and country");
  await page.getByRole("button", { name: "View" }).click();
  await page.getByRole("dialog").waitFor();
  await page.locator('canvas[aria-label="Page 1"]').first().waitFor({ timeout: 30000 });
  await page.waitForTimeout(1500);
  check((await page.getByRole("dialog").textContent()).includes("/ 2"), "viewer: shows 2 pages");
  check(await page.locator('canvas[aria-label="Page 2"]').count() >= 1, "viewer: thumbnails rendered");
  const drawn = await page.evaluate(() => {
    const cs = [...document.querySelectorAll('[role="dialog"] canvas')].sort((a, b) => b.width - a.width)[0];
    const d = cs.getContext("2d").getImageData(0, 0, cs.width, cs.height).data;
    for (let i = 0; i < d.length; i += 4) if (d[i] < 128) return true;
    return false;
  });
  check(drawn, "viewer: page text is drawn on the canvas");
  await page.getByRole("button", { name: "Next page" }).click();
  await page.getByRole("button", { name: "Zoom in" }).click();
  await page.getByRole("button", { name: "Rotate" }).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: shot("3-viewer") });
  const dl = page.waitForEvent("download");
  await page.getByRole("dialog").getByRole("button", { name: "Download" }).click();
  check((await (await dl).suggestedFilename()).endsWith(".pdf"), "viewer: download gives the PDF");
  await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({ state: "detached" });
  await page.waitForTimeout(1000);
  const { data: audits } = await svc.from("audit_trail").select("action").eq("org_id", orgId).eq("document_id", filed.id);
  check(audits.some((a) => a.action === "Document downloaded"), "audit: download recorded");

  // Missing tile and placeholder rows.
  await page.getByRole("button", { name: "Clear all" }).click();
  await page.locator("button", { hasText: "Missing" }).first().click();
  await page.waitForTimeout(1500);
  await page.locator("tbody tr").first().click();
  check(await page.getByRole("button", { name: "Go to Document Intake" }).isVisible(), "missing row offers Document Intake");
  await page.screenshot({ path: shot("4-missing") });

  // Filter builder.
  await page.getByRole("button", { name: "Clear all" }).click();
  await page.getByRole("button", { name: /Filters/ }).click();
  await page.getByLabel("Value").fill(`no-such-title-${run}`);
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await page.getByText("Nothing matches these filters.").waitFor({ timeout: 15000 });
  check(true, "filter builder: title rule filters the grid");
  await page.getByRole("button", { name: "Clear all" }).click();

  // Export.
  await page.getByText("Monitoring Plan").first().waitFor({ timeout: 15000 });
  const ex = page.waitForEvent("download");
  await page.getByRole("button", { name: /Export all/ }).click();
  const csv = await readFile(await (await ex).path(), "utf8");
  check(csv.includes("Status,Current Activity") && csv.includes("Monitoring Plan"), "export: CSV has headers and the document");

  // Delete with a reason → Recycle Bin.
  await page.locator("tbody tr", { hasText: "Monitoring Plan.pdf" }).click();
  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByLabel("Reason for deleting (required)").fill("E2E cleanup");
  await page.getByRole("button", { name: "Confirm delete" }).click();
  await page.getByText("File history").waitFor({ state: "detached", timeout: 30000 });
  await page.waitForTimeout(1500);
  const { data: gone } = await svc.from("documents").select("status, deleted_at, deletion_reason").eq("id", filed.id).single();
  check(gone.status === "Deleted" && !!gone.deleted_at && gone.deletion_reason === "E2E cleanup", "delete: soft-deleted with reason");
  check(await tile("Under Revision") === 0, "tiles: Under Revision back to 0");

  check(errors.length === 0, `no page errors ${JSON.stringify(errors)}`);
  await browser.close();
} catch (e) {
  failures.push(e.message.split("\n")[0]);
  console.log(`FAIL ${e.message}`);
  if (page) await page.screenshot({ path: shot("error") }).catch(() => {});
} finally {
  if (browser) await browser.close().catch(() => {});
  if (orgId) {
    const { data: docs } = await svc.from("documents").select("id, file_path").eq("org_id", orgId);
    const ids = (docs ?? []).map((d) => d.id);
    await svc.from("intake_items").delete().eq("org_id", orgId);
    if (ids.length) { await svc.from("document_file_versions").delete().in("document_id", ids); await svc.from("documents").delete().in("id", ids); }
    const paths = (docs ?? []).map((d) => d.file_path).filter(Boolean);
    if (paths.length) await svc.storage.from("Documents").remove(paths);
    await svc.from("study_sites").delete().eq("org_id", orgId);
    await svc.from("study_countries").delete().eq("org_id", orgId);
    if (partyId) await svc.from("parties").delete().eq("id", partyId);
    await svc.from("tmf_config").delete().eq("org_id", orgId);
    await svc.from("studies").delete().eq("org_id", orgId);
    await svc.from("user_roles").delete().eq("org_id", orgId);
  }
  if (userId) await svc.auth.admin.deleteUser(userId);
  if (orgId) await svc.from("organizations").delete().eq("id", orgId);
  console.log("cleaned up");
  if (failures.length) { console.log(`\n${failures.length} FAILED`); process.exitCode = 1; } else console.log("\nALL PASSED");
}
