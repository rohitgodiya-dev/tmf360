// Generates the taxonomy seed section of the Part 3 migration from lib/taxonomy/*.json.
// Usage: node scripts/generate-taxonomy-migration.mjs > supabase/migrations/<file>.sql (appended by hand-written DDL)
import fs from "node:fs";
import path from "node:path";
const model = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, "../lib/taxonomy/tmf-rm-3.3.1.json"), "utf8"));

const q = (v) => (v === null || v === undefined ? "null" : `'${String(v).replace(/'/g, "''")}'`);
const b = (v) => (v ? "true" : "false");
const out = [];
const V = `(select id from taxonomy_versions where model = ${q(model.model)} and version = ${q(model.version)})`;

out.push(`insert into taxonomy_versions (model, version, released_on, status, notes) values (${q(model.model)}, ${q(model.version)}, ${q(model.released_on)}, 'active', ${q(model.source)}) on conflict (model, version) do nothing;`);
out.push(`insert into tmf_milestone_events (code, name, phase) values\n  ${model.milestone_events.map(([c, n, p]) => `(${q(c)}, ${q(n)}, ${q(p)})`).join(",\n  ")}\non conflict (code) do nothing;`);
out.push(`insert into taxonomy_zones (version_id, zone_num, name) select ${V}, z, n from (values\n  ${model.zones.map(([z, n]) => `(${q(z)}, ${q(n)})`).join(",\n  ")}\n) as t(z, n) on conflict do nothing;`);
out.push(`insert into taxonomy_sections (version_id, section_num, zone_num, name) select ${V}, s, left(s, 2), n from (values\n  ${model.sections.map(([s, n]) => `(${q(s)}, ${q(n)})`).join(",\n  ")}\n) as t(s, n) on conflict do nothing;`);
out.push(`insert into taxonomy_artifacts (version_id, unique_id, artifact_num, zone_num, section_num, name, classification, definition,
  sponsor_doc, investigator_doc, device_sponsor_doc, device_investigator_doc, iis_requirement, process_number, dating_convention, site_milestone, iso_ref, sort_order)
select ${V}, t.* from (values\n  ${model.artifacts.map((a, i) => `(${[q(a.u), q(a.n), q(a.n.slice(0, 2)), q(a.n.slice(0, 5)), q(a.name), q(a.cl), q(a.d),
  b(a.sponsor), b(a.investigator), b(a.device_sponsor), b(a.device_investigator), q(a.iis), q(a.process), q(a.dating), q(a.site_milestone), q(a.iso), i + 1].join(", ")})`).join(",\n  ")}
) as t(unique_id, artifact_num, zone_num, section_num, name, classification, definition, sponsor_doc, investigator_doc, device_sponsor_doc, device_investigator_doc, iis_requirement, process_number, dating_convention, site_milestone, iso_ref, sort_order)
on conflict do nothing;`);
const subs = model.artifacts.flatMap((a) => a.s.map((name, i) => `(${q(a.u)}, ${q(name)}, ${i + 1})`));
out.push(`insert into taxonomy_subartifacts (artifact_id, name, sort_order)
select a.id, t.name, t.sort_order from (values\n  ${subs.join(",\n  ")}
) as t(unique_id, name, sort_order)
join taxonomy_artifacts a on a.unique_id = t.unique_id and a.version_id = ${V}
on conflict do nothing;`);
process.stdout.write(out.join("\n\n") + "\n");
