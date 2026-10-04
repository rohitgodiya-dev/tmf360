// End-to-end post-filing operations (Part 8b): real browser, DEV Supabase only.
// Usage: start `next dev -p 3100` with .env.dev loaded (SUPABASE_SERVICE_ROLE_KEY=$DEV_SUPABASE_SERVICE_ROLE_KEY), then: node tests/e2e/post-filing.mjs
import { createHash, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
process.loadEnvFile(".env.dev");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL, anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url.includes("ikjusswwskrkjwxovgza")) throw new Error("not dev");
const svc = createClient(url, process.env.DEV_SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const run = randomUUID().slice(0, 8);
const studyCode = `E2F-${run}`;
const shot = (n) => `test-screenshots/e2e-postfiling-${n}.png`;
const failures = [];
const check = (ok, what) => { console.log(`${ok ? "PASS" : "FAIL"} ${what}`); if (!ok) failures.push(what); };
let orgId, browser, lastPage;
const users = {}, paths = [], docs = {};

function pdf(label) {
  const objs = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>"];
  const st = `BT /F1 24 Tf 72 700 Td (${label}) Tj ET`;
  objs.push(`<< /Length ${st.length} >>\nstream\n${st}\nendstream`, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  let out = "%PDF-1.4\n";
  const offsets = objs.map((o, i) => { const at = out.length; out += `${i + 1} 0 obj\n${o}\nendobj\n`; return at; });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

async function login(label) {
  const page = await (await browser.newContext({ viewport: { width: 1500, height: 950 } })).newPage();
  page.errors = [];
  lastPage = page;
  page.on("pageerror", (e) => page.errors.push(e.message));
  page.on("dialog", (d) => { page.errors.push(`unexpected dialog: ${d.message()}`); d.dismiss(); });
  await page.goto("http://localhost:3100/platform", { waitUntil: "networkidle", timeout: 120000 });
  await page.fill('input[type="email"]', users[label].email);
  await page.fill('input[type="password"]', users[label].password);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.getByRole("button", { name: "TMF Navigator" }).waitFor({ timeout: 60000 });
  return page;
}
const doc = async (id) => (await svc.from("documents").select("status, deleted_at, version, expiry_date, artifact_num").eq("id", id).single()).data;

try {
  const must = (r, what) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r; };
  orgId = must(await svc.from("organizations").insert([{ name: `e2e-${run}`, type: "Sponsor" }]).select("id").single(), "org").data.id;
  for (const [label, role, name] of [["lead", "TMF Lead", "Lee Lead"], ["admin", "Sponsor Admin", "Ada Admin"]]) {
    const email = `e2e-${run}-${label}@example.test`, password = `Pw-${randomUUID()}`;
    const id = must(await svc.auth.admin.createUser({ email, password, email_confirm: true }), "user").data.user.id;
    must(await svc.from("user_roles").insert([{ user_id: id, org_id: orgId, role, email, full_name: name, is_active: true }]), "role");
    users[label] = { id, email, password };
  }
  must(await svc.from("studies").insert([{ org_id: orgId, user_id: users.lead.id, study_id: studyCode, status: "Startup", protocol: "E2E", phase: "Phase II", sponsor: "E2E" }]), "study");
  const userDb = createClient(url, anon, { auth: { persistSession: false } });
  await userDb.auth.signInWithPassword({ email: users.lead.email, password: users.lead.password });
  must(await userDb.rpc("seed_study_tmf_config", { p_study_code: studyCode }), "seed");
  for (const [key, status, artifact, artifactName] of [["draft", "Draft", "01.01.03", "Quality Plan"], ["final", "Approved", "01.01.01", "Trial Master File Plan"], ["collab", "Approved", "01.01.04", "List of SOPs Current During Trial"]]) {
    const bytes = pdf(`${key} ${run}`);
    const hash = createHash("sha256").update(bytes).digest("hex");
    const path = `${orgId}/${studyCode}/${hash}.pdf`;
    must(await svc.storage.from("Documents").upload(path, bytes, { contentType: "application/pdf" }), "upload");
    paths.push(path);
    docs[key] = must(await svc.from("documents").insert([{
      org_id: orgId, user_id: users.lead.id, study_id: studyCode, artifact_num: artifact, artifact_name: artifactName, custom_file_name: `${key.toUpperCase()} doc`,
      status, version: "1.0", file_path: path, file_name: `${key}.pdf`, file_type: "application/pdf", file_hash: hash,
      ...(status === "Approved" ? { approved_at: new Date().toISOString(), approved_by: "seed@example.test" } : {}),
    }]).select("id").single(), "doc").data.id;
  }

  browser = await chromium.launch({ channel: "chrome" });
  const lead = await login("lead");
  const openRow = async (title) => {
    await lead.getByRole("button", { name: "TMF Navigator" }).click();
    await lead.locator("tbody tr", { hasText: title }).first().click();
    await lead.getByText("File history").waitFor({ timeout: 30000 });
  };

  // 1. Delete a Draft with a coded reason; restore it from the Recycle Bin.
  await openRow("DRAFT doc");
  await lead.getByRole("button", { name: /Delete$/ }).click();
  await lead.getByLabel("Reason (required)").selectOption("incorrectly_indexed");
  await lead.getByLabel("Comment (required)").fill("Filed under the wrong artifact");
  await lead.getByRole("button", { name: "Move to Recycle Bin" }).click();
  await lead.getByText("Moved to the Recycle Bin.").waitFor({ timeout: 30000 });
  check(!!(await doc(docs.draft)).deleted_at, "delete: Draft moved to the Recycle Bin");
  await lead.getByRole("button", { name: "Recycle Bin" }).click();
  await lead.locator("tr", { hasText: "DRAFT doc" }).getByRole("button", { name: "Restore" }).click();
  await lead.getByLabel("Reason for restoring").fill("Deleted by mistake");
  await lead.locator("tr", { hasText: "DRAFT doc" }).getByRole("button", { name: "Restore" }).click();
  await lead.getByText("Recycle bin is empty.").waitFor({ timeout: 30000 });
  check((await doc(docs.draft)).deleted_at === null, "restore: back from the Recycle Bin");

  // 2. Revision request on a Final document, filed as Final with a password.
  await openRow("FINAL doc");
  await lead.getByRole("button", { name: "Revision request" }).click();
  await lead.getByLabel("Description (required)").fill("Expiry date was missing");
  await lead.getByLabel("Proposed revision number").fill("1.1");
  await lead.getByLabel("Expiry", { exact: true }).fill("2031-12-31");
  await lead.getByLabel("Your password").fill(users.lead.password);
  await lead.getByRole("button", { name: "File as Final" }).click();
  await lead.getByText("Revision filed as Final.").waitFor({ timeout: 30000 });
  const rev = await doc(docs.final);
  check(rev.status === "Approved" && rev.version === "1.1" && rev.expiry_date === "2031-12-31", "revision: applied, still Final");
  await lead.getByText(/Revision · Metadata update → 1\.1/).waitFor({ timeout: 15000 });
  check(true, "history: revision listed");

  // 3. Reclassify the Final document (password needed).
  await lead.getByRole("button", { name: "Reclassify" }).click();
  await lead.getByLabel("Artifact").selectOption("01.01.02");
  await lead.getByLabel("Reason (required)").fill("It is the management plan");
  await lead.getByLabel("Your password").fill(users.lead.password);
  await lead.getByRole("button", { name: "Reclassify" }).last().click();
  await lead.getByText(/^Reclassified/).waitFor({ timeout: 30000 });
  check((await doc(docs.final)).artifact_num === "01.01.02", "reclassify: artifact changed");
  await lead.screenshot({ path: shot("1-panel") });

  // 4. Request deletion of the Final document; the other administrator signs the approval.
  await lead.getByRole("button", { name: "Request deletion" }).click();
  await lead.getByLabel("Reason (required)").selectOption("not_tmf_relevant");
  await lead.getByLabel("Comment (required)").fill("Draft plan uploaded by mistake");
  await lead.getByRole("button", { name: "Request deletion" }).last().click();
  await lead.getByText(/Deletion requested/).waitFor({ timeout: 30000 });
  check(!(await doc(docs.final)).deleted_at, "request: Final document stays until approved");
  await lead.getByRole("button", { name: "Recycle Bin" }).click();
  await lead.getByRole("button", { name: "Withdraw" }).waitFor({ timeout: 30000 });
  check(!(await lead.getByRole("button", { name: "Approve deletion" }).isVisible()), "request: requester sees Withdraw, not Approve");


  const admin = await login("admin");
  await admin.getByRole("button", { name: "Recycle Bin" }).click();
  await admin.getByRole("button", { name: "Approve deletion" }).click();
  await admin.getByLabel("Your password").fill("wrong-password");
  await admin.getByRole("button", { name: "Sign & approve deletion" }).click();
  await admin.getByRole("alert").getByText("That password is not correct").waitFor({ timeout: 30000 });
  check(!(await doc(docs.final)).deleted_at, "approval: wrong password changes nothing");
  await admin.getByLabel("Your password").fill(users.admin.password);
  await admin.getByRole("button", { name: "Sign & approve deletion" }).click();
  await admin.getByText("No requests waiting.").waitFor({ timeout: 30000 });
  check(!!(await doc(docs.final)).deleted_at, "approval: Final document deleted");
  const { data: sig } = await svc.from("signature_events").select("kind, meaning, signer_name").eq("document_id", docs.final).eq("action", "deletion_approval").single();
  check(sig?.kind === "signature" && sig.meaning === "Deletion approved" && sig.signer_name === "Ada Admin", "approval: electronic signature recorded");
  await admin.screenshot({ path: shot("2-recycle") });

  // 5. Start collaboration on another Final document, then upload a new file.
  await openRow("COLLAB doc");
  await lead.getByRole("button", { name: "Revision request" }).click();
  await lead.getByLabel("Rationale").selectOption("content_and_metadata_update");
  await lead.getByLabel("Description (required)").fill("SOP list updated");
  await lead.getByLabel("Proposed revision number").fill("2.0");
  await lead.getByRole("button", { name: "Start collaboration" }).click();
  await lead.getByText(/Revision started/).waitFor({ timeout: 30000 });
  check((await doc(docs.collab)).status === "Draft", "collaboration: back to Draft");
  await lead.getByRole("button", { name: "New file" }).click();
  await lead.setInputFiles('input[aria-label="New file"]', { name: "sops-v2.pdf", mimeType: "application/pdf", buffer: pdf(`v2 ${run}`) });
  await lead.getByRole("button", { name: "Upload" }).click();
  await lead.getByText(/New file added as version 2/).waitFor({ timeout: 30000 });
  await lead.getByText("v1").first().waitFor({ timeout: 15000 });
  check(await lead.getByRole("button", { name: "Open" }).first().isVisible(), "history: earlier version can be opened");

  const errs = [...lead.errors, ...admin.errors];
  check(errs.length === 0, `no page errors ${JSON.stringify(errs)}`);
} catch (e) {
  failures.push(e.message.split("\n")[0]);
  console.log(`FAIL ${e.message}`);
  if (lastPage) await lastPage.screenshot({ path: shot("error") }).catch(() => {});
} finally {
  if (browser) await browser.close().catch(() => {});
  // Best effort: signed records are append-only, so some rows stay behind on DEV.
  if (orgId) {
    const { data: ds } = await svc.from("documents").select("file_path").eq("org_id", orgId);
    const all = [...new Set([...paths, ...(ds ?? []).map((d) => d.file_path).filter(Boolean)])];
    if (all.length) await svc.storage.from("Documents").remove(all);
    for (const t of ["placeholders", "document_tasks", "tmf_config", "qc_reasons", "study_members", "user_roles"]) await svc.from(t).delete().eq("org_id", orgId);
  }
  for (const u of Object.values(users)) await svc.auth.admin.deleteUser(u.id).catch(() => {});
  console.log("cleaned up");
  if (failures.length) { console.log(`\n${failures.length} FAILED`); process.exitCode = 1; } else console.log("\nALL PASSED");
}
