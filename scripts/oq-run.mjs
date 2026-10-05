// Operational qualification (OQ) run: executes the automated unit and integration suites (DEV only)
// and writes a dated OQ report: every test with its result, grouped by file, with the requirement IDs
// each file verifies (from the traceability matrix). End-to-end scripts are listed for manual/CI runs.
// Usage: node scripts/oq-run.mjs   → docs/validation/oq-report-YYYY-MM-DD.md
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { tmpdir } from "node:os";

const root = new URL("..", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const today = new Date().toISOString().slice(0, 10);
const out = join(tmpdir(), `oq-${Date.now()}.json`);
const started = new Date();
const r = spawnSync(process.execPath, [join(root, "node_modules/vitest/vitest.mjs"), "run", "--reporter=json", `--outputFile=${out}`], { cwd: root, stdio: "inherit", env: process.env });
if (!existsSync(out)) { console.error("No test results were produced"); process.exit(1); }
const res = JSON.parse(readFileSync(out, "utf8"));

const matrix = existsSync(join(root, "docs/validation/traceability-matrix.csv"))
  ? readFileSync(join(root, "docs/validation/traceability-matrix.csv"), "utf8").trim().split(/\r?\n/).slice(1).map((l) => l.match(/"((?:[^"]|"")*)"/g).map((c) => c.slice(1, -1)))
  : [];
const idsFor = (file) => matrix.filter((cols) => (cols[6] ?? "").split(" ").includes(file)).map((cols) => cols[0]);

const files = res.testResults.map((f) => ({
  file: relative(root, f.name).replace(/\\/g, "/"),
  status: f.status,
  tests: f.assertionResults.map((a) => ({ title: [...a.ancestorTitles, a.title].join(" › "), status: a.status, ms: Math.round(a.duration ?? 0) })),
}));
const e2e = readdirSync(join(root, "tests/e2e")).filter((f) => f.endsWith(".mjs") && !f.startsWith("_"));
const verdict = res.numFailedTests === 0 && res.success ? "PASS" : "FAIL";

const md = [
  `# OQ report — ${today}`,
  ``,
  `| Item | Value |`, `|---|---|`,
  `| Result | **${verdict}** |`,
  `| Started (UTC) | ${started.toISOString()} |`,
  `| Test files | ${res.numTotalTestSuites} suites in ${files.length} files |`,
  `| Tests | ${res.numTotalTests} total · ${res.numPassedTests} passed · ${res.numFailedTests} failed · ${res.numPendingTests} skipped |`,
  `| Environment | Unit tests (local) and integration tests against the DEV Supabase project (ikjusswwskrkjwxovgza) |`,
  `| Code version | ${spawnSync("git", ["rev-parse", "--short", "HEAD"], { cwd: root }).stdout?.toString().trim()} |`,
  ``,
  `Executed by: ____________________  Reviewed by (QA): ____________________  Date: __________`,
  ``,
  `## Results by file`,
  ...files.flatMap((f) => [
    ``, `### ${f.file} — ${f.status === "passed" ? "PASS" : "FAIL"}`,
    idsFor(f.file).length ? `Requirements: ${idsFor(f.file).join(", ")}` : `Requirements: (none cited)`,
    ``, `| Test | Result | ms |`, `|---|---|---|`,
    ...f.tests.map((t) => `| ${t.title.replace(/\|/g, "/")} | ${t.status} | ${t.ms} |`),
  ]),
  ``,
  `## End-to-end scripts (run against \`next dev -p 3100\` with .env.dev; record results separately)`,
  ...e2e.map((f) => `- [ ] tests/e2e/${f}`),
  ``,
].join("\n");
const file = join(root, `docs/validation/oq-report-${today}.md`);
writeFileSync(file, md);
console.log(`OQ ${verdict}: ${res.numPassedTests}/${res.numTotalTests} tests passed → ${relative(root, file)}`);
process.exit(verdict === "PASS" ? 0 : 1);
