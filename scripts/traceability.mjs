// Traceability matrix (Baseline section 17): every requirement ID of the v0.2 Baseline →
// design (docs/part*-plan.md), implementation (migrations, lib, API routes, pages) and verification
// (unit, integration and end-to-end tests). IDs are traced where the code and tests cite them.
// Usage: node scripts/traceability.mjs   → docs/validation/traceability-matrix.md and .csv
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const root = new URL("..", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const ids = readFileSync(join(root, "docs/validation/requirements.csv"), "utf8").trim().split(/\r?\n/).slice(1).map((l) => l.split(",")[0]);
const known = new Set(ids);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (["node_modules", ".next", ".git", "test-screenshots"].includes(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out); else if (/\.(ts|tsx|mjs|sql|md)$/.test(name)) out.push(p);
  }
  return out;
}

const kindOf = (rel) =>
  rel.startsWith("tests/") ? "test" :
  rel.startsWith("docs/part") || rel.startsWith("docs/api") ? "design" :
  rel.startsWith("supabase/migrations/") || rel.startsWith("lib/") || rel.startsWith("app/") ? "code" : null;

const trace = new Map(ids.map((id) => [id, { design: new Set(), code: new Set(), test: new Set() }]));
for (const file of [...walk(join(root, "app")), ...walk(join(root, "lib")), ...walk(join(root, "supabase/migrations")), ...walk(join(root, "tests")), ...walk(join(root, "docs"))]) {
  const rel = relative(root, file).replace(/\\/g, "/");
  const kind = kindOf(rel);
  if (!kind) continue;
  const text = readFileSync(file, "utf8");
  const found = new Set();
  for (const m of text.matchAll(/\b([A-Z]{2,4})-(\d{2})(?:\s*(?:\.\.|–|-)\s*(\d{2}))?\b/g)) {
    const from = Number(m[2]), to = m[3] ? Number(m[3]) : from;
    for (let i = from; i <= Math.min(to, from + 20); i++) found.add(`${m[1]}-${String(i).padStart(2, "0")}`);
  }
  for (const id of found) if (known.has(id)) trace.get(id)[kind].add(rel);
}

// Reviewed notes for IDs that the code does not cite (coverage, note, evidence files).
const notes = new Map(readFileSync(join(root, "docs/validation/coverage-notes.csv"), "utf8").trim().split(/\r?\n/).slice(1).map((l) => {
  const [id, coverage, note, evidence] = l.split(",");
  return [id, { coverage, note, evidence: (evidence ?? "").split(/\s+/).filter(Boolean) }];
}));
for (const [id, n] of notes) for (const e of n.evidence) if (trace.has(id)) (e.startsWith("tests/") ? trace.get(id).test : trace.get(id).design).add(e);
const status = (t) => t.test.size ? "Verified by test" : t.code.size ? "Implemented (no test cites it)" : t.design.size ? "Designed only" : "Not traced";
const rows = ids.map((id) => ({ id, ...trace.get(id), status: status(trace.get(id)), coverage: notes.get(id)?.coverage ?? "", note: notes.get(id)?.note ?? "" }));
const by = (s) => rows.filter((r) => r.status === s).length;
const today = new Date().toISOString().slice(0, 10);

const short = (set, n = 4) => [...set].sort().slice(0, n).map((f) => f.replace(/^app\/api\/v1\//, "api/").replace(/^supabase\/migrations\//, "mig/")).join("<br>") + (set.size > n ? `<br>+${set.size - n} more` : "");
const md = [
  `# Traceability matrix`,
  ``,
  `Generated ${today} by \`node scripts/traceability.mjs\` from the requirement IDs of the eTMF Development Plan v0.2 Baseline`,
  `(\`docs/validation/requirements.csv\`, ${ids.length} IDs). A requirement is traced where design documents, code and tests cite its ID.`,
  ``,
  `| Status | Count |`, `|---|---|`,
  ...["Verified by test", "Implemented (no test cites it)", "Designed only", "Not traced"].map((s) => `| ${s} | ${by(s)} |`),
  ``,
  `"Not traced" means no file cites the ID. Either the requirement is out of the built scope (see the part plans) or the`,
  `code that covers it does not name it yet. Each one needs a decision in the validation summary.`,
  ``,
  `| ID | Status | Reviewed coverage | Design | Implementation | Tests |`, `|---|---|---|---|---|---|`,
  ...rows.map((r) => `| ${r.id} | ${r.status} | ${r.coverage ? `**${r.coverage}**: ${r.note}` : ""} | ${short(r.design, 2)} | ${short(r.code)} | ${short(r.test)} |`),
  ``,
  `Coverage summary of reviewed notes: ${[...new Set(rows.map((r) => r.coverage).filter(Boolean))].map((c) => `${c} ${rows.filter((r) => r.coverage === c).length}`).join(" · ")}.`,
  ``,
].join("\n");
writeFileSync(join(root, "docs/validation/traceability-matrix.md"), md);
const csv = ["id,status,coverage,note,design,implementation,tests", ...rows.map((r) => [r.id, r.status, r.coverage, r.note, [...r.design].join(" "), [...r.code].join(" "), [...r.test].join(" ")].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");
writeFileSync(join(root, "docs/validation/traceability-matrix.csv"), csv + "\n");
console.log(`${ids.length} requirements: ${by("Verified by test")} verified by test, ${by("Implemented (no test cites it)")} implemented without a citing test, ${by("Designed only")} designed only, ${by("Not traced")} not traced`);
