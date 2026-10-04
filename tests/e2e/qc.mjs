// End-to-end QC workflow test (Part 7): real browser, DEV Supabase only.
// A CRA submits a document for QC from the Navigator; a QA reviewer rejects it with a coded
// reason (wrong password first), the CRA resubmits, and the reviewer accepts it.
// Usage: start `next dev -p 3100` with .env.dev loaded (SUPABASE_SERVICE_ROLE_KEY=$DEV_SUPABASE_SERVICE_ROLE_KEY), then: node tests/e2e/qc.mjs
import { createHash, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
process.loadEnvFile(".env.dev");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL, anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url.includes("ikjusswwskrkjwxovgza")) throw new Error("not dev");
const svc = createClient(url, process.env.DEV_SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const run = randomUUID().slice(0, 8);
const shot = (n) => `test-screenshots/e2e-qc-${n}.png`;
const failures = [];
const check = (ok, what) => { console.log(`${ok ? "PASS" : "FAIL"} ${what}`); if (!ok) failures.push(what); };
let orgId, studyCode = `E2Q-${run}`, browser, docId, filePath;
const users = {};

function onePagePdf(label) {
  const objs = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>"];
  const st = `BT /F1 28 Tf 72 700 Td (${label}) Tj ET`;
  objs.push(`<< /Length ${st.length} >>\nstream\n${st}\nendstream`, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  let out = "%PDF-1.4\n";
  const offsets = objs.map((o, i) => { const at = out.length; out += `${i + 1} 0 obj\n${o}\nendobj\n`; return at; });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

async function login(label) {
  const u = users[label];
  const context = await browser.newContext({ viewport: { width: 1500, height: 950 } });
  const page = await context.newPage();
  page.errors = [];
  page.on("pageerror", (e) => page.errors.push(e.message));
  page.on("dialog", (d) => { page.errors.push(`unexpected dialog: ${d.message()}`); d.dismiss(); });
  await page.goto("http://localhost:3100/platform", { waitUntil: "networkidle", timeout: 120000 });
  await page.fill('input[type="email"]', u.email);
  await page.fill('input[type="password"]', u.password);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.getByRole("button", { name: "Study Tasks" }).waitFor({ timeout: 60000 });
  return page;
}
const docRow = async () => (await svc.from("documents").select("status, rejection_reason, approved_by").eq("id", docId).single()).data;

try {
  const must = (r, what) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r; };
  orgId = must(await svc.from("organizations").insert([{ name: `e2e-${run}`, type: "Sponsor" }]).select("id").single(), "org").data.id;
  for (const [label, role] of [["cra", "CRA"], ["qa", "Quality Assurance"]]) {
    const email = `e2e-${run}-${label}@example.test`, password = `Pw-${randomUUID()}`;
    const id = must(await svc.auth.admin.createUser({ email, password, email_confirm: true }), "user").data.user.id;
    must(await svc.from("user_roles").insert([{ user_id: id, org_id: orgId, role, email, full_name: label === "qa" ? "Quinn QA" : "Casey CRA", is_active: true }]), "role");
    users[label] = { id, email, password };
  }
  must(await svc.from("studies").insert([{ org_id: orgId, user_id: users.cra.id, study_id: studyCode, status: "Startup", protocol: "E2E", phase: "Phase II", sponsor: "E2E" }]), "study");
  for (const u of Object.values(users)) must(await svc.from("study_members").insert([{ org_id: orgId, study_id: studyCode, user_id: u.id, email: u.email, role: "Member", is_active: true }]), "member");
  const userDb = createClient(url, anon, { auth: { persistSession: false } });
  await userDb.auth.signInWithPassword({ email: users.cra.email, password: users.cra.password });
  must(await userDb.rpc("seed_study_tmf_config", { p_study_code: studyCode }), "seed");

  const pdf = onePagePdf(`QC ${run}`);
  const hash = createHash("sha256").update(pdf).digest("hex");
  filePath = `${orgId}/${studyCode}/${hash}.pdf`;
  must(await svc.storage.from("Documents").upload(filePath, pdf, { contentType: "application/pdf" }), "upload");
  docId = must(await svc.from("documents").insert([{
    org_id: orgId, user_id: users.cra.id, study_id: studyCode, artifact_num: "01.01.01", artifact_name: "Trial Master File Plan",
    custom_file_name: "QC Protocol", status: "Draft", file_path: filePath, file_name: "qc.pdf", file_type: "application/pdf", file_hash: hash, file_size_bytes: pdf.length,
  }]).select("id").single(), "doc").data.id;

  browser = await chromium.launch({ channel: "chrome" });

  // CRA submits from the Navigator.
  const cra = await login("cra");
  await cra.getByRole("button", { name: "TMF Navigator" }).click();
  await cra.locator("tbody tr", { hasText: "QC Protocol" }).click();
  await cra.getByText("QC history").waitFor({ timeout: 30000 });
  check(await cra.getByText("Not submitted for QC yet.").isVisible(), "navigator: no QC history before submitting");
  await cra.getByRole("button", { name: "Submit for QC" }).click();
  await cra.getByRole("button", { name: "Submit for QC" }).click();
  await cra.getByText("Inbound QC").first().waitFor({ timeout: 30000 });
  check((await docRow()).status === "Under Review", "submit: document is Under Review");
  check(!(await cra.getByRole("button", { name: "Submit for QC" }).isVisible()), "submit: button gone once in QC");

  // QA reviews from Study Tasks: three panes, reject with a reason.
  const qa = await login("qa");
  await qa.getByRole("button", { name: "Study Tasks" }).click();
  await qa.locator("tbody tr", { hasText: "QC Protocol" }).getByRole("button", { name: "Review" }).click();
  await qa.locator('canvas[aria-label="Page 1"]').first().waitFor({ timeout: 30000 });
  check(await qa.getByText("Metadata", { exact: true }).isVisible(), "task screen: metadata pane");
  check(await qa.getByRole("region", { name: /Viewer/ }).isVisible(), "task screen: inline viewer");
  await qa.getByRole("button", { name: "Reject" }).click();
  check(!(await qa.getByRole("button", { name: "Confirm & Close" }).isEnabled()), "reject: Confirm disabled without reasons, comment and password");
  await qa.getByLabel("Unsigned").check();
  await qa.getByPlaceholder("What must the owner fix?").fill("Page 1 is not signed");
  check(await qa.getByText(/What happens next:.*back to its owner as Draft/).isVisible(), "reject: what-happens-next shown");
  await qa.getByLabel("Password").fill("wrong-password");
  await qa.getByRole("button", { name: "Confirm & Close" }).click();
  await qa.getByRole("alert").getByText("That password is not correct").waitFor({ timeout: 30000 });
  check((await docRow()).status === "Under Review", "wrong password: nothing recorded");
  await qa.screenshot({ path: shot("1-task-screen") });
  await qa.getByLabel("Password").fill(users.qa.password);
  await qa.getByRole("button", { name: "Confirm & Close" }).click();
  await qa.getByText(/was rejected and returned/).waitFor({ timeout: 30000 });
  const rejected = await docRow();
  check(rejected.status === "Draft" && rejected.rejection_reason === "Unsigned — Page 1 is not signed", "reject: Draft with coded reason and comment");

  // CRA sees why, resubmits; QA accepts.
  await cra.reload({ waitUntil: "networkidle" });
  await cra.getByRole("button", { name: "TMF Navigator" }).click();
  await cra.locator("tbody tr", { hasText: "QC Protocol" }).click();
  await cra.getByText("Reasons: Unsigned").waitFor({ timeout: 30000 });
  check(await cra.getByText(/Quinn QA · Reviewed and rejected/).isVisible(), "history: rejection signed by the reviewer");
  await cra.getByRole("button", { name: "Submit for QC" }).click();
  await cra.getByLabel(/Note for the reviewer/).fill("Signed copy attached");
  await cra.getByRole("button", { name: "Submit for QC" }).click();
  await cra.getByText("round 2").first().waitFor({ timeout: 30000 });

  await qa.getByRole("button", { name: "Study Tasks" }).click();
  await qa.locator("tbody tr", { hasText: "QC Protocol" }).getByRole("button", { name: "Review" }).click();
  await qa.getByText("Signed copy attached").waitFor({ timeout: 30000 });
  await qa.getByRole("button", { name: "Accept" }).click();
  await qa.getByLabel("Password").fill(users.qa.password);
  await qa.getByRole("button", { name: "Confirm & Close" }).click();
  await qa.getByText(/passed QC and is now Approved/).waitFor({ timeout: 30000 });
  check((await docRow()).status === "Approved", "accept: document Approved");
  const { data: sigs } = await svc.from("signature_events").select("kind, meaning, signer_name").eq("document_id", docId).order("signed_at");
  check(JSON.stringify(sigs) === JSON.stringify([
    { kind: "attestation", meaning: "Reviewed and rejected", signer_name: "Quinn QA" },
    { kind: "attestation", meaning: "Reviewed and accepted", signer_name: "Quinn QA" },
  ]), "signatures: one attestation per decision, named reviewer");
  check(await qa.getByText("No QC tasks waiting for you.", { exact: false }).waitFor({ timeout: 15000 }).then(() => true, () => false), "my tasks empty after deciding");

  // QC settings are visible to QA in TMF Configuration.
  await qa.getByRole("button", { name: "TMF Configuration" }).click();
  await qa.getByText("Rejection reasons").waitFor({ timeout: 30000 });
  check(await qa.getByText("Attestation (default)").isVisible(), "settings: control shown");
  await qa.getByText("Rejection reasons").scrollIntoViewIfNeeded();
  await qa.screenshot({ path: shot("2-settings") });

  const errs = [...cra.errors, ...qa.errors];
  check(errs.length === 0, `no page errors ${JSON.stringify(errs)}`);
} catch (e) {
  failures.push(e.message.split("\n")[0]);
  console.log(`FAIL ${e.message}`);
} finally {
  if (browser) await browser.close().catch(() => {});
  // Best effort: signed QC records are append-only, so the document and organisation stay behind on DEV.
  if (orgId) {
    await svc.from("document_tasks").delete().eq("org_id", orgId);
    if (docId) await svc.from("documents").delete().eq("id", docId);
    if (filePath) await svc.storage.from("Documents").remove([filePath]);
    for (const t of ["study_members", "tmf_config", "qc_reasons", "studies", "user_roles"]) await svc.from(t).delete().eq("org_id", orgId);
  }
  for (const u of Object.values(users)) await svc.auth.admin.deleteUser(u.id).catch(() => {});
  if (orgId) await svc.from("organizations").delete().eq("id", orgId);
  console.log("cleaned up");
  if (failures.length) { console.log(`\n${failures.length} FAILED`); process.exitCode = 1; } else console.log("\nALL PASSED");
}
